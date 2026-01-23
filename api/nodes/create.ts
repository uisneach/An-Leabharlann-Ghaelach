import { runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server.js';

export const runtime = 'edge';

export async function POST(request) {
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
    if (!properties.id) {
      properties.id = `${label.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        details: error.message 
      },
      { status: 500 }
    );
  }
}