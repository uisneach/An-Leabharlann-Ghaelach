import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
  ) {
  try {
    const nodeId = params.nodeId;
    
    if (!nodeId) {
      return NextResponse.json(
        { 
          error: 'Missing required query params: nodeId' 
        },
        { status: 400 }
      );
    }
    
    const cypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN n
    `;
    
    const results = await runQuery(cypher, { nodeId });
    
    if (results.length === 0) {
      return NextResponse.json(
        { 
          error: `Node not found with nodeId '${nodeId}'` 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      node: results[0].n
    });
    
  } catch (error) {
    console.error('Get node error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get node',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
  ) {
  try {
    const nodeId = params.nodeId;
    
    if (!nodeId) {
      return NextResponse.json(
        { 
          error: 'Missing required query params: nodeId' 
        },
        { status: 400 }
      );
    }
    
    const checkCypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN n
    `;
    
    const checkResults = await runQuery(checkCypher, { nodeId });

    if (checkResults.length === 0) {
      return NextResponse.json(
        { 
          error: `Node not found with nodeId '${nodeId}'` 
        },
        { status: 404 }
      );
    }

    // Delete node and all its relationships
    const deleteCypher = `
      MATCH (n {nodeId: $nodeId})
      DETACH DELETE n
    `;

    const deleteResults = await runQuery(deleteCypher, { nodeId });
    
    return NextResponse.json({
      success: true,
      node: deleteResults[0].n
    });
    
  } catch (error) {
    console.error('Delete node error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete node',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}