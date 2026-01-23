import { runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// Query a list of all the labels that exist in the DB
export async function GET(request: NextRequest) {
  try {
    const cypher = 'CALL db.labels()';
    const results = await runQuery(cypher, {});

    console.log(results);
    
    const labels = results
      .map(record => record.label)
      .filter(label => label !== null);
    
    console.log(labels);

    if (labels.length === 0) {
      return NextResponse.json(
        { 
          message: 'No labels found.',
          labels: []
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