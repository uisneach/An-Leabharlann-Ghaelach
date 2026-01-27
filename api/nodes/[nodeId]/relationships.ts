import { runQuery } from '../../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

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

    const cypher = `
      MATCH (from)-[r]->(to)
      WHERE from.nodeId = $nodeId OR to.nodeId = $nodeId
      RETURN r, from, to, type(r) AS type
    `;
    
    const results = await runQuery(cypher, { nodeId });

    console.log(results);
    
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        outgoing: [],
        incoming: []
      });
    }

    // Organize relationships into outgoing and incoming
    const outgoing: any[] = [];
    const incoming: any[] = [];

    results.forEach(result => {
      const fromNodeId = result.from.properties?.nodeId || result.from.identity;
      const toNodeId = result.to.properties?.nodeId || result.to.identity;
      
      // If current node is the source, it's an outgoing relationship
      if (fromNodeId === nodeId) {
        outgoing.push({
          type: result.type,
          node: {
            id: toNodeId,
            nodeId: toNodeId,
            labels: result.to.labels || [],
            properties: result.to.properties || {}
          }
        });
      } 
      // If current node is the target, it's an incoming relationship
      else if (toNodeId === nodeId) {
        incoming.push({
          type: result.type,
          node: {
            id: fromNodeId,
            nodeId: fromNodeId,
            labels: result.from.labels || [],
            properties: result.from.properties || {}
          }
        });
      }
    });

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