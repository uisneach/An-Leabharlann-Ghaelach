import { runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// GET - Retrieve relationship(s) between two nodes by type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromNodeId = searchParams.get('fromNodeId');
    const toNodeId = searchParams.get('toNodeId');
    const relationshipType = searchParams.get('type');

    if (!fromNodeId || !toNodeId || !relationshipType) {
      return NextResponse.json(
        { 
          error: 'Missing required query params: fromNodeId, toNodeId, type' 
        },
        { status: 400 }
      );
    }

    // Validate relationship type format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(relationshipType)) {
      return NextResponse.json(
        { 
          error: 'Invalid relationship type format. Use alphanumeric and underscores only.' 
        },
        { status: 400 }
      );
    }

    const cypher = `
      MATCH (from {nodeId: $fromNodeId})-[r:${relationshipType}]->(to {nodeId: $toNodeId})
      RETURN r, from, to
    `;

    const results = await runQuery(cypher, { fromNodeId, toNodeId });

    if (results.length === 0) {
      return NextResponse.json(
        { 
          error: `No ${relationshipType} relationship found between nodes '${fromNodeId}' and '${toNodeId}'` 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      relationship: results[0].r,
      fromNode: results[0].from,
      toNode: results[0].to,
      type: relationshipType
    });

  } catch (error) {
    console.error('Get relationship error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create a relationship between two nodes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromNodeId, toNodeId, type } = body;

    if (!fromNodeId || !toNodeId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: fromNodeId, toNodeId, type' },
        { status: 400 }
      );
    }

    // Validate relationship type format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(type)) {
      return NextResponse.json(
        { 
          error: 'Invalid relationship type format. Use alphanumeric and underscores only.' 
        },
        { status: 400 }
      );
    }

    // Check if both nodes exist
    const checkCypher = `
      MATCH (from {nodeId: $fromNodeId})
      MATCH (to {nodeId: $toNodeId})
      RETURN from, to
    `;

    const checkResults = await runQuery(checkCypher, { fromNodeId, toNodeId });

    if (checkResults.length === 0) {
      return NextResponse.json(
        { error: 'One or both nodes not found' },
        { status: 404 }
      );
    }

    // Create the relationship
    const createCypher = `
        MATCH (from {nodeId: $fromNodeId})
        MATCH (to {nodeId: $toNodeId})
        CREATE (from)-[r:${type}]->(to)
        RETURN r, from, to
      `;

    const params = { fromNodeId, toNodeId };

    const results = await runQuery(createCypher, params);

    return NextResponse.json({
      success: true,
      message: `Created ${type} relationship`,
      relationship: results[0].r,
      fromNode: results[0].from,
      toNode: results[0].to
    }, { status: 201 });

  } catch (error) {
    console.error('Create relationship error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update relationship properties
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromNodeId, toNodeId, type, properties } = body;

    if (!fromNodeId || !toNodeId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: fromNodeId, toNodeId, type' },
        { status: 400 }
      );
    }

    if (!properties || typeof properties !== 'object') {
      return NextResponse.json(
        { error: 'properties object is required for update' },
        { status: 400 }
      );
    }

    // Validate relationship type format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(type)) {
      return NextResponse.json(
        { 
          error: 'Invalid relationship type format. Use alphanumeric and underscores only.' 
        },
        { status: 400 }
      );
    }

    // Check if relationship exists
    const checkCypher = `
      MATCH (from {nodeId: $fromNodeId})-[r:${type}]->(to {nodeId: $toNodeId})
      RETURN r
    `;

    const checkResults = await runQuery(checkCypher, { fromNodeId, toNodeId });

    if (checkResults.length === 0) {
      return NextResponse.json(
        { 
          error: `No ${type} relationship found between nodes '${fromNodeId}' and '${toNodeId}'` 
        },
        { status: 404 }
      );
    }

    // Update relationship properties (replace all properties)
    const updateCypher = `
      MATCH (from {nodeId: $fromNodeId})-[r:${type}]->(to {nodeId: $toNodeId})
      SET r = $properties
      RETURN r, from, to
    `;

    const results = await runQuery(updateCypher, { fromNodeId, toNodeId, properties });

    return NextResponse.json({
      success: true,
      message: 'Relationship updated successfully',
      relationship: results[0].r,
      fromNode: results[0].from,
      toNode: results[0].to
    });

  } catch (error) {
    console.error('Update relationship error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete relationship between two nodes by type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromNodeId = searchParams.get('fromNodeId');
    const toNodeId = searchParams.get('toNodeId');
    const relationshipType = searchParams.get('type');

    if (!fromNodeId || !toNodeId || !relationshipType) {
      return NextResponse.json(
        { 
          error: 'Missing required query params: fromNodeId, toNodeId, type' 
        },
        { status: 400 }
      );
    }

    // Validate relationship type format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(relationshipType)) {
      return NextResponse.json(
        { 
          error: 'Invalid relationship type format. Use alphanumeric and underscores only.' 
        },
        { status: 400 }
      );
    }

    // Check if relationship exists
    const checkCypher = `
      MATCH (from {nodeId: $fromNodeId})-[r:${relationshipType}]->(to {nodeId: $toNodeId})
      RETURN r
    `;

    const checkResults = await runQuery(checkCypher, { fromNodeId, toNodeId });

    if (checkResults.length === 0) {
      return NextResponse.json(
        { 
          error: `No ${relationshipType} relationship found between nodes '${fromNodeId}' and '${toNodeId}'` 
        },
        { status: 404 }
      );
    }

    // Delete the relationship
    const deleteCypher = `
      MATCH (from {nodeId: $fromNodeId})-[r:${relationshipType}]->(to {nodeId: $toNodeId})
      DELETE r
    `;

    await runQuery(deleteCypher, { fromNodeId, toNodeId });

    return NextResponse.json({
      success: true,
      message: `${relationshipType} relationship deleted successfully`
    });

  } catch (error) {
    console.error('Delete relationship error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}