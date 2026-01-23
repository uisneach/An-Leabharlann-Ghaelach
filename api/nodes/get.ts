import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    // Validate that label is provided
    if (!label) {
      return NextResponse.json(
        { 
          error: 'Missing required query param: label' 
        },
        { status: 400 }
      );
    }

    // Validate label format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
      return NextResponse.json(
        { 
          error: 'Invalid label format. Use alphanumeric and underscores only.' 
        },
        { status: 400 }
      );
    }

    // Validate limit if provided
    if (limit !== null && (isNaN(limit) || limit < 0)) {
      return NextResponse.json(
        { 
          error: 'Invalid limit. Must be a non-negative integer (0 = no limit).' 
        },
        { status: 400 }
      );
    }

    // Build query based on whether limit is provided
    let cypher: string;
    let params: Record<string, any> = {};

    if (limit === null || limit === 0) {
      // No limit - return all nodes with the label
      cypher = `
        MATCH (n:${label})
        RETURN n
      `;
    } else {
      // With limit
      cypher = `
        MATCH (n:${label})
        RETURN n
        LIMIT $limit
      `;
      params.limit = limit;
    }

    const results = await runQuery(cypher, params);

    if (results.length === 0) {
      return NextResponse.json(
        { 
          message: `No nodes found with label '${label}'`,
          nodes: [],
          count: 0
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      label,
      nodes: results.map(record => record.n),
      count: results.length,
      limit: limit === null || limit === 0 ? 'none' : limit
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