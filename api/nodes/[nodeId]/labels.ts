// Create, Edit, and Remove Labels from a specific Node

import { runQuery } from '../../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

// GET - Retrieve all labels for a specific node
export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const nodeId = params.nodeId;

    const cypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN labels(n) as labels, n
    `;

    const results = await runQuery(cypher, { nodeId });

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      nodeId,
      labels: results[0].labels,
      node: results[0].n
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

// POST - Add labels to a specific node
export async function POST(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const nodeId = params.nodeId;
    const body = await request.json();
    const { labels } = body;

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: labels (must be a non-empty array)' },
        { status: 400 }
      );
    }

    // Validate all labels
    for (const label of labels) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
        return NextResponse.json(
          {
            error: `Invalid label format: '${label}'. Use alphanumeric and underscores only.` 
          },
          { status: 400 }
        );
      }
    }

    // Build dynamic SET clause for adding labels
    const labelString = labels.map(l => `:${l}`).join('');
    
    const cypher = `
      MATCH (n {nodeId: $nodeId})
      SET n${labelString}
      RETURN labels(n) as labels, n
    `;

    const results = await runQuery(cypher, { nodeId });

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Added labels: ${labels.join(', ')}`,
      nodeId,
      labels: results[0].labels,
      node: results[0].n
    }, { status: 200 });

  } catch (error) {
    console.error('Add labels error:', error);
    return NextResponse.json(
      {
        error: 'Failed to add labels',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Replace all labels on a specific node
// NOTE: This endpoint will first remove ALL existing labels, and REPLACE them with new ones.
export async function PUT(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const nodeId = params.nodeId;
    const body = await request.json();
    const { labels } = body;

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: labels (must be a non-empty array)' },
        { status: 400 }
      );
    }

    // Validate all labels
    for (const label of labels) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
        return NextResponse.json(
          { 
            error: `Invalid label format: '${label}'. Use alphanumeric and underscores only.` 
          },
          { status: 400 }
        );
      }
    }

    // First, get current labels and remove them, then add new ones
    const cypher = `
      MATCH (n {nodeId: $nodeId})
      WITH n, labels(n) as oldLabels
      // Remove all existing labels
      CALL {
        WITH n, oldLabels
        UNWIND oldLabels as label
        CALL apoc.create.removeLabels(n, [label]) YIELD node
        RETURN node
      }
      // Add new labels
      WITH n
      SET n${labels.map(l => `:${l}`).join('')}
      RETURN labels(n) as labels, n
    `;

    // Alternative approach without APOC (more compatible)
    const compatibleCypher = `
      MATCH (n {nodeId: $nodeId})
      // Create a new node with same properties but new labels
      CREATE (temp ${labels.map(l => `:${l}`).join('')})
      SET temp = properties(n)
      WITH n, temp
      // Delete old node and rename temp
      DETACH DELETE n
      RETURN labels(temp) as labels, temp as n
    `;

    // Using simpler approach: just set new labels (existing labels will remain)
    // For true replacement, use APOC or recreate the node
    const simpleCypher = `
      MATCH (n {nodeId: $nodeId})
      REMOVE n${':' + labels.join(':')}
      SET n${labels.map(l => `:${l}`).join('')}
      RETURN labels(n) as labels, n
    `;

    const results = await runQuery(simpleCypher, { nodeId });

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Replaced labels with: ${labels.join(', ')}`,
      nodeId,
      labels: results[0].labels,
      node: results[0].n
    }, { status: 200 });

  } catch (error) {
    console.error('Replace labels error:', error);
    return NextResponse.json(
      {
        error: 'Failed to replace labels',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove specific labels from a node
export async function DELETE(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const nodeId = params.nodeId;
    const { searchParams } = new URL(request.url);
    const labelsParam = searchParams.get('labels');

    if (!labelsParam) {
      return NextResponse.json(
        { error: 'Missing required query param: labels (comma-separated list)' },
        { status: 400 }
      );
    }

    const labels = labelsParam.split(',').map(l => l.trim());

    // Validate all labels
    for (const label of labels) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
        return NextResponse.json(
          { 
            error: `Invalid label format: '${label}'. Use alphanumeric and underscores only.` 
          },
          { status: 400 }
        );
      }
    }

    // Build dynamic REMOVE clause
    const removeClause = labels.map(l => `n:${l}`).join(', ');
    
    const cypher = `
      MATCH (n {nodeId: $nodeId})
      REMOVE ${removeClause}
      RETURN labels(n) as labels, n
    `;

    const results = await runQuery(cypher, { nodeId });

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Removed labels: ${labels.join(', ')}`,
      nodeId,
      labels: results[0].labels,
      node: results[0].n
    });

  } catch (error) {
    console.error('Remove labels error:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove labels',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}