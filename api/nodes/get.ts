import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label');
    const nodeId = searchParams.get('nodeId');
    
    if (!label || !nodeId) {
      return NextResponse.json(
        { 
          error: 'Missing required query params: label, nodeId' 
        },
        { status: 400 }
      );
    }
    
    const cypher = `
      MATCH (n:${label} {nodeId: $nodeId})
      RETURN n
    `;
    
    const results = await runQuery(cypher, { nodeId });
    
    if (results.length === 0) {
      return NextResponse.json(
        { 
          error: `Node not found with label '${label}' and nodeId '${nodeId}'` 
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