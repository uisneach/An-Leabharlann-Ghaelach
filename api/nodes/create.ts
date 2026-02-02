import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, properties } = body;
    
    if (!label || !properties) {
      return NextResponse.json(
        {
          error: 'Missing required fields: label, properties'
        },
        { status: 400 }
      );
    }
    
    // Validate label (Neo4j labels can't contain spaces or special chars)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
      return NextResponse.json(
        { 
          error: 'Invalid label format. Use alphanumeric and underscores only.' 
        },
        { status: 400 }
      );
    }
    
    // Generate ID if not provided
    if (!properties.nodeId) {
      properties.nodeId = uuidv4();
    }
    
    // Create node with dynamic label
    const cypher = `
      CREATE (n:${label} $properties)
      RETURN n
    `;
    
    const results = await runQuery(cypher, { properties });
    
    return NextResponse.json({
      success: true,
      node: results[0].n,
      message: `Node created with label '${label}'`
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create node error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create node',
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