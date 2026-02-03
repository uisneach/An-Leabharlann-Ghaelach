import { runQuery } from '../../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// Forbidden labels - relationships to nodes with these labels will be filtered out
const FORBIDDEN_LABELS = ['User'];

// Forbidden properties - these properties will be filtered out from node data
const FORBIDDEN_PROPERTIES = ['password', 'passwordHash', 'salt', 'token', 'refreshToken'];

// GET ONLY - Retrieve all relationships connected to a given node
// organized into outgoing and incoming relationships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    
    if (!nodeId) {
      return NextResponse.json(
        { 
          error: 'Missing required query param: nodeId' 
        },
        { status: 400 }
      );
    }

    // Enhanced Cypher query that processes relationships on the database side
    const cypher = `
      MATCH (n {nodeId: $nodeId})
      
      // Outgoing relationships
      OPTIONAL MATCH (n)-[outRel]->(target)
      WHERE NOT ANY(label IN labels(target) WHERE label IN $forbiddenLabels)
      WITH n, collect(CASE 
        WHEN outRel IS NOT NULL THEN {
          type: type(outRel),
          fromNode: {
            nodeId: n.nodeId,
            labels: labels(n),
            properties: properties(n)
          },
          toNode: {
            nodeId: target.nodeId,
            labels: labels(target),
            properties: properties(target)
          }
        }
        ELSE null
      END) AS outgoingRaw
      
      // Incoming relationships (separate OPTIONAL MATCH to avoid cartesian product)
      OPTIONAL MATCH (source)-[inRel]->(n)
      WHERE NOT ANY(label IN labels(source) WHERE label IN $forbiddenLabels)
      WITH outgoingRaw, collect(CASE 
        WHEN inRel IS NOT NULL THEN {
          type: type(inRel),
          fromNode: {
            nodeId: source.nodeId,
            labels: labels(source),
            properties: properties(source)
          },
          toNode: {
            nodeId: n.nodeId,
            labels: labels(n),
            properties: properties(n)
          }
        }
        ELSE null
      END) AS incomingRaw
      
      RETURN 
        [r IN outgoingRaw WHERE r IS NOT NULL] AS outgoing,
        [r IN incomingRaw WHERE r IS NOT NULL] AS incoming
    `;
    
    const results = await runQuery(cypher, { 
      nodeId,
      forbiddenLabels: FORBIDDEN_LABELS
    });
    
    // Handle case where node doesn't exist
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        outgoing: [],
        incoming: []
      });
    }

    const result = results[0];
    let outgoing = result.outgoing || [];
    let incoming = result.incoming || [];

    // Filter forbidden properties from node data
    const filterProperties = (nodeData: any) => {
      if (!nodeData || !nodeData.properties) return nodeData;
      
      const filteredProps: Record<string, any> = {};
      Object.entries(nodeData.properties).forEach(([key, value]) => {
        if (!FORBIDDEN_PROPERTIES.includes(key)) {
          filteredProps[key] = value;
        }
      });
      
      return {
        ...nodeData,
        properties: filteredProps
      };
    };

    // Apply property filtering to all relationships
    outgoing = outgoing.map((rel: any) => ({
      type: rel.type,
      fromNode: filterProperties(rel.fromNode),
      toNode: filterProperties(rel.toNode)
    }));

    incoming = incoming.map((rel: any) => ({
      type: rel.type,
      fromNode: filterProperties(rel.fromNode),
      toNode: filterProperties(rel.toNode)
    }));

    return NextResponse.json({
      success: true,
      outgoing,
      incoming
    });
  } catch (error) {
    console.error('Get relationships error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get relationships',
        details: error instanceof Error ? error.message : 'Unknown error'
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