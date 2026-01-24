import { runQuery } from '../../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// GET ONLY - Retrieve all relationships connected to a given node
// as well as the connected nodes.
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

    if (results.length === 0) {
      return NextResponse.json(
        { 
          error: `No relationships found for node '${nodeId}'` 
        },
        { status: 404 }
      );
    }

    const relationships = results.map(result => ({
      relationship: result.r,
      fromNode: result.from,
      toNode: result.to,
      type: result.type
    }));

    return NextResponse.json({
      success: true,
      relationships
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