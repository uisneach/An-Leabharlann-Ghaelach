/* 
 * Advanced Search API
 * 
 * This endpoint provides intelligent full-text search across the Neo4j database
 * with preference ranking, filtering, and blacklisting capabilities.
 * 
 * Features:
 * - Smart ranking: exact matches > prefix matches > substring matches
 * - Property priority: display_name/name/title get higher scores
 * - Label filtering: include/exclude specific labels
 * - Property filtering: filter by property key-value pairs
 * - Blacklisting: exclude nodes with certain labels (e.g., User)
 * 
 * Endpoint: GET /api/search?q=<query>&label=<label>&property=<key:value>
 */

import { runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// Labels that should never appear in search results
const BLACKLISTED_LABELS = ['User'];

// Properties that get higher ranking in search results
const PRIORITY_PROPERTIES = ['display_name', 'name', 'title'];

// Properties to exclude from search results
const EXCLUDED_PROPERTIES = ['password', 'passwordHash', 'salt', 'token', 'refreshToken'];

interface SearchResult {
  nodeId: string;
  labels: string[];
  properties: Record<string, any>;
  score: number;
  matchedProperty?: string;
  matchType?: 'exact' | 'prefix' | 'substring';
}

interface SearchFilters {
  labels?: string[];
  excludeLabels?: string[];
  properties?: Record<string, any>;
}

/**
 * Calculate relevance score for a search match
 */
function calculateScore(
  propertyKey: string,
  propertyValue: string,
  searchQuery: string,
  matchType: 'exact' | 'prefix' | 'substring'
): number {
  let score = 0;
  
  // Base score by match type
  switch (matchType) {
    case 'exact':
      score = 100;
      break;
    case 'prefix':
      score = 50;
      break;
    case 'substring':
      score = 25;
      break;
  }
  
  // Boost score for priority properties
  if (PRIORITY_PROPERTIES.includes(propertyKey)) {
    score *= 3;
  }
  
  // Boost for shorter matches (more specific)
  const lengthRatio = searchQuery.length / propertyValue.length;
  score *= (1 + lengthRatio);
  
  return score;
}

/**
 * Determine match type for a property value
 */
function getMatchType(value: string, query: string): 'exact' | 'prefix' | 'substring' | null {
  const valueLower = value.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (valueLower === queryLower) {
    return 'exact';
  } else if (valueLower.startsWith(queryLower)) {
    return 'prefix';
  } else if (valueLower.includes(queryLower)) {
    return 'substring';
  }
  
  return null;
}

/**
 * Score a node against the search query
 */
function scoreNode(
  node: any,
  searchQuery: string
): { score: number; matchedProperty?: string; matchType?: 'exact' | 'prefix' | 'substring' } {
  let bestScore = 0;
  let bestProperty: string | undefined;
  let bestMatchType: 'exact' | 'prefix' | 'substring' | undefined;
  
  // Check all string properties
  for (const [key, value] of Object.entries(node.properties || {})) {
    if (EXCLUDED_PROPERTIES.includes(key)) continue;
    
    // Handle string values
    if (typeof value === 'string') {
      const matchType = getMatchType(value, searchQuery);
      if (matchType) {
        const score = calculateScore(key, value, searchQuery, matchType);
        if (score > bestScore) {
          bestScore = score;
          bestProperty = key;
          bestMatchType = matchType;
        }
      }
    }
    
    // Handle array values
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const matchType = getMatchType(item, searchQuery);
          if (matchType) {
            const score = calculateScore(key, item, searchQuery, matchType);
            if (score > bestScore) {
              bestScore = score;
              bestProperty = key;
              bestMatchType = matchType;
            }
          }
        }
      }
    }
  }
  
  return {
    score: bestScore,
    matchedProperty: bestProperty,
    matchType: bestMatchType
  };
}

/**
 * Parse search filters from query parameters
 */
function parseFilters(searchParams: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};
  
  // Parse label filters
  const labelParam = searchParams.get('label');
  if (labelParam) {
    filters.labels = labelParam.split(',').map(l => l.trim()).filter(Boolean);
  }
  
  // Parse exclude label filters
  const excludeLabelParam = searchParams.get('excludeLabel');
  if (excludeLabelParam) {
    filters.excludeLabels = excludeLabelParam.split(',').map(l => l.trim()).filter(Boolean);
  }
  
  // Parse property filters (format: property=key:value or property=key1:value1,key2:value2)
  const propertyParam = searchParams.get('property');
  if (propertyParam) {
    filters.properties = {};
    const propertyPairs = propertyParam.split(',');
    for (const pair of propertyPairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        filters.properties[key] = value;
      }
    }
  }
  
  return filters;
}

/**
 * Build Cypher query with filters
 */
function buildSearchQuery(filters: SearchFilters): { cypher: string; params: Record<string, any> } {
  let cypher = 'MATCH (n)';
  const params: Record<string, any> = {
    blacklistedLabels: BLACKLISTED_LABELS
  };
  
  // Add label filter
  if (filters.labels && filters.labels.length > 0) {
    const labelConditions = filters.labels.map((_, idx) => `$label${idx} IN labels(n)`).join(' OR ');
    cypher += `\nWHERE (${labelConditions})`;
    filters.labels.forEach((label, idx) => {
      params[`label${idx}`] = label;
    });
  } else {
    cypher += '\nWHERE true';
  }
  
  // Exclude blacklisted labels
  cypher += '\nAND NOT ANY(label IN labels(n) WHERE label IN $blacklistedLabels)';
  
  // Add exclude label filter
  if (filters.excludeLabels && filters.excludeLabels.length > 0) {
    filters.excludeLabels.forEach((label, idx) => {
      cypher += `\nAND NOT $excludeLabel${idx} IN labels(n)`;
      params[`excludeLabel${idx}`] = label;
    });
  }
  
  // Add property filters
  if (filters.properties) {
    Object.entries(filters.properties).forEach(([key, value], idx) => {
      cypher += `\nAND (n.\`${key}\` = $propValue${idx} OR $propValue${idx} IN n.\`${key}\`)`;
      params[`propValue${idx}`] = value;
    });
  }
  
  cypher += '\nRETURN n, labels(n) as labels';
  
  return { cypher, params };
}

/**
 * Main GET handler for search
 */
export async function GET(request: NextRequest) {
  console.log('Search API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    
    // Validate query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          error: 'Search query must be at least 2 characters',
          example: 'GET /api/search?q=homer'
        },
        { status: 400 }
      );
    }
    
    console.log(`Searching for: "${query}"`);
    
    // Parse filters
    const filters = parseFilters(searchParams);
    console.log('Filters:', filters);
    
    // Build and execute query
    const { cypher, params } = buildSearchQuery(filters);
    console.log('Cypher query:', cypher);
    console.log('Params:', params);
    
    const results = await runQuery<{ n: any; labels: string[] }>(cypher, params);
    console.log(`Found ${results.length} total nodes`);
    
    // Score and filter results
    const scoredResults: SearchResult[] = [];
    
    for (const result of results) {
      // The runQuery function in neo4j.ts converts nodes to plain objects
      // So result.n should already be the properties object
      const rawNode = result.n;
      const labels = result.labels;
      
      // Debug: log the structure we're getting
      if (scoredResults.length === 0) {
        console.log('Sample node structure:', {
          hasProperties: 'properties' in rawNode,
          keys: Object.keys(rawNode).slice(0, 5),
          rawNodeType: typeof rawNode
        });
      }
      
      // Handle both possible structures from Neo4j driver
      // Sometimes it's { properties: {...} }, sometimes it's just {...}
      const nodeProperties = rawNode.properties || rawNode;
      
      // Create a consistently structured object for scoring
      const nodeForScoring = {
        properties: nodeProperties
      };
      
      // Score the node
      const { score, matchedProperty, matchType } = scoreNode(nodeForScoring, query);
      
      // Only include nodes with a score > 0 (i.e., they match the search)
      if (score > 0) {
        // Filter out excluded properties
        const filteredProperties: Record<string, any> = {};
        for (const [key, value] of Object.entries(nodeProperties)) {
          if (!EXCLUDED_PROPERTIES.includes(key)) {
            filteredProperties[key] = value;
          }
        }
        
        scoredResults.push({
          nodeId: nodeProperties.nodeId || rawNode.nodeId || 'unknown',
          labels,
          properties: filteredProperties,
          score,
          matchedProperty,
          matchType
        });
      }
    }
    
    console.log(`Scored ${scoredResults.length} results out of ${results.length} nodes`);
    
    // Debug: if we found nodes but scored 0, log why
    if (results.length > 0 && scoredResults.length === 0) {
      console.log('WARNING: Found nodes but none scored > 0');
      const sampleNode = results[0].n;
      const sampleProps = sampleNode.properties || sampleNode;
      console.log('Sample node properties:', Object.keys(sampleProps));
      console.log('Sample property values (first 3):', 
        Object.entries(sampleProps)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${typeof v} = ${String(v).substring(0, 50)}`)
      );
    }
    
    // Sort by score (descending)
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Apply limit
    const limitedResults = scoredResults.slice(0, limit);
    
    console.log(`Returning ${limitedResults.length} scored results`);
    
    return NextResponse.json({
      success: true,
      query,
      filters,
      results: limitedResults,
      totalMatches: scoredResults.length,
      limit,
      returned: limitedResults.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}