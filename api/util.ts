/* 
 * Consolidated Utility API
 * 
 * This file handles multiple utility endpoints using action-based routing
 * to comply with Vercel's serverless function limits.
 * 
 * Endpoints:
 * - GET /api/util?action=labels          - Get all labels in DB
 * - GET /api/util?action=nodes&label=X   - Get nodes by label
 * - GET /api/util?action=health          - DB health check
 * 
 * Future additions can be added here to save function count.
 */

import { getDriver, runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// ============================================
// MAIN HANDLER - Routes to action functions
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  console.log('Utility API called with action:', action);

  // Route to appropriate handler based on action
  switch (action) {
    case 'labels':
      return handleLabels(request);
    
    case 'nodes':
      return handleNodes(request);
    
    case 'health':
      return handleHealth(request);
    
    case null:
    case undefined:
      return NextResponse.json(
        {
          error: 'Missing required query parameter: action',
          availableActions: ['labels', 'nodes', 'health'],
          examples: [
            'GET /api/util?action=labels',
            'GET /api/util?action=nodes&label=Source',
            'GET /api/util?action=nodes&label=Author&limit=10',
            'GET /api/util?action=health'
          ]
        },
        { status: 400 }
      );
    
    default:
      return NextResponse.json(
        {
          error: `Unknown action: '${action}'`,
          availableActions: ['labels', 'nodes', 'health'],
        },
        { status: 400 }
      );
  }
}

// ============================================
// ACTION: Get all labels in DB
// ============================================

async function handleLabels(request: NextRequest) {
  console.log('Fetching all labels from database');
  
  try {
    const cypher = 'CALL db.labels()';
    const results = await runQuery<{ label: string }>(cypher, {});
    
    const labels = results
      .map(record => record.label)
      .filter(label => label !== null && !['User', 'Entity'].includes(label)); // Exclude User and Entity labels
    
    console.log(`Found ${labels.length} labels`);
    
    if (labels.length === 0) {
      return NextResponse.json(
        { 
          success: true,
          message: 'No labels found in database',
          labels: [],
          count: 0
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      success: true,
      labels: labels,
      count: labels.length
    });
    
  } catch (error) {
    console.error('Get labels error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get labels',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// ACTION: Get nodes by label
// ============================================

async function handleNodes(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    
    console.log('Fetching nodes with label:', label, 'limit:', limit || 'none');
    
    // Validate that label is provided
    if (!label) {
      return NextResponse.json(
        { 
          error: 'Missing required query parameter: label',
          example: 'GET /api/util?action=nodes&label=Source'
        },
        { status: 400 }
      );
    }
    
    // Validate label format (prevent injection)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
      return NextResponse.json(
        { 
          error: 'Invalid label format. Use alphanumeric characters and underscores only.',
          provided: label
        },
        { status: 400 }
      );
    }
    
    // Validate limit if provided
    if (limit !== null && (isNaN(limit) || limit < 0)) {
      return NextResponse.json(
        { 
          error: 'Invalid limit. Must be a non-negative integer (0 or omit for no limit).',
          provided: limitParam
        },
        { status: 400 }
      );
    }
    
    // Build query - include labels(n) to get all labels
    let cypher: string;
    let params: Record<string, any> = {};
    
    if (limit === null || limit === 0) {
      // No limit - return all nodes with the label
      cypher = `
        MATCH (n:${label})
        RETURN n, labels(n) AS labels
        ORDER BY n.nodeId
      `;
    } else {
      // With limit
      cypher = `
        MATCH (n:${label})
        RETURN n, labels(n) AS labels
        ORDER BY n.nodeId
        LIMIT $limit
      `;
      params.limit = limit;
    }
    
    const results = await runQuery<{ n: any; labels: string[] }>(cypher, params);
    
    console.log(`Found ${results.length} nodes with label '${label}'`);
    
    if (results.length === 0) {
      return NextResponse.json(
        { 
          success: true,
          message: `No nodes found with label '${label}'`,
          label: label,
          nodes: [],
          count: 0
        },
        { status: 200 }
      );
    }
    
    // Extract node data and format to standardized Node interface
    const nodes = results.map(record => {
      const nodeProperties = record.n;
      const nodeLabels = record.labels || [label];
      const nodeId = nodeProperties.nodeId;
      
      // Remove nodeId from properties since it's a separate field
      const { nodeId: _, ...properties } = nodeProperties;
      
      return {
        nodeId: nodeId,
        labels: nodeLabels,
        properties: properties
      };
    });
    
    return NextResponse.json({
      success: true,
      label: label,
      nodes: nodes,
      count: nodes.length,
      limit: limit === null || limit === 0 ? null : limit
    });
    
  } catch (error) {
    console.error('Get nodes error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get nodes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// ACTION: Database health check
// ============================================

async function handleHealth(request: NextRequest) {
  console.log('Checking database health');
  
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    
    console.log('Database connection healthy');
    
    return NextResponse.json({
      status: 'healthy',
      service: 'Neo4j',
      message: 'Successfully connected to database',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'Neo4j',
        message: 'Failed to connect to database',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}