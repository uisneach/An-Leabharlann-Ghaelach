import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

function getNodeId(request: NextRequest): string | null {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // URL Path will be /api/nodes/[nodeId]
    // Find the segment after 'nodes'
    const nodesIndex = pathSegments.indexOf('nodes');
    
    if (nodesIndex === -1 || nodesIndex === pathSegments.length - 1) {
      return null;
    }
    
    // The node ID is the segment immediately after 'nodes'
    const nodeId = pathSegments[nodesIndex + 1];
    
    return nodeId || null;
  } catch (error) {
    console.error('Error extracting node ID from URL:', error);
    return null;
  }
}

// Forbidden labels - nodes with these labels cannot be retrieved
const FORBIDDEN_LABELS = ['User'];
// Forbidden properties - these properties will be filtered out from responses
const FORBIDDEN_PROPERTIES = ['password', 'passwordHash', 'salt', 'token', 'refreshToken'];

export async function GET(request: NextRequest) {
  try {
    const nodeId = getNodeId(request);
    
    if (!nodeId) {
      return NextResponse.json(
        { error: 'Node ID is required in path' },
        { status: 400 }
      );
    }
    
    const cypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN n, labels(n) AS labels
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
    
    const node = results[0].n;
    const labels = results[0].labels || [];
    
    // Check if node has any forbidden labels
    const hasForbiddenLabel = labels.some((label: string) => 
      FORBIDDEN_LABELS.includes(label)
    );
    
    if (hasForbiddenLabel) {
      return NextResponse.json(
        { 
          error: 'Access denied: This node cannot be accessed' 
        },
        { status: 403 }
      );
    }
    
    // Filter out forbidden properties
    const properties = node.properties || {};
    const filteredProperties: Record<string, any> = {};
    
    /*Object.entries(properties).forEach(([key, value]) => {
      if (!FORBIDDEN_PROPERTIES.includes(key)) {
        filteredProperties[key] = value;
      }
    });*/
    
    return NextResponse.json({
      success: true,
      nodeId: nodeId,
      labels: labels,
      properties: node
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

// PUT - Update node labels and/or properties
export async function PUT(request: NextRequest) {
  try {
    const nodeId = getNodeId(request);
    
    if (!nodeId) {
      return NextResponse.json(
        { error: 'Node ID is required in path' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { labels, properties } = body;

    // At least one of labels or properties must be provided
    if (!labels && !properties) {
      return NextResponse.json(
        { error: 'Must provide at least one of: labels, properties' },
        { status: 400 }
      );
    }

    // Validate labels if provided
    if (labels) {
      if (!Array.isArray(labels) || labels.length === 0) {
        return NextResponse.json(
          { error: 'labels must be a non-empty array' },
          { status: 400 }
        );
      }

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
    }

    // Validate properties if provided
    if (properties && typeof properties !== 'object') {
      return NextResponse.json(
        { error: 'properties must be an object' },
        { status: 400 }
      );
    }

    // Build the Cypher query dynamically
    let cypher = 'MATCH (n {nodeId: $nodeId})\n';
    const queryParams: Record<string, any> = { nodeId };
    let results = null;

    if (labels && properties) {
      cypher += `CALL apoc.create.setLabels(n, $newLabels) YIELD node AS updatedNode\n`;
      cypher += `WITH updatedNode, updatedNode.nodeId AS preservedId\n`;
      cypher += `SET updatedNode = $newProperties\n`;
      cypher += `SET updatedNode.nodeId = preservedId\n`;
      cypher += `RETURN updatedNode AS node, labels(updatedNode) AS labels`;
      queryParams.newLabels = labels;
      queryParams.newProperties = properties;
      results = await runQuery(cypher, queryParams);
    } else if (labels) {
      cypher += `CALL apoc.create.setLabels(n, $newLabels) YIELD node\n`;
      cypher += `RETURN node, labels(node) AS labels`;
      queryParams.newLabels = labels;
      results = await runQuery(cypher, queryParams);
    } else if (properties) {
      cypher += `WITH n, n.nodeId AS preservedId\n`;
      cypher += `SET n = $newProperties\n`;
      cypher += `SET n.nodeId = preservedId\n`;
      cypher += `RETURN n AS node, labels(n) AS labels`;
      queryParams.newProperties = properties;
      results = await runQuery(cypher, queryParams);
    }

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Node updated successfully',
      node: results[0].node,
      labels: results[0].labels
    });

  } catch (error) {
    console.error('Update node error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update node',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const nodeId = getNodeId(request);
    
    if (!nodeId) {
      return NextResponse.json(
        { error: 'Node ID is required in path' },
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
      MATCH (n)
      WHERE n.nodeId = $nodeId
      DETACH DELETE n
    `;

    const deleteResults = await runQuery(deleteCypher, { nodeId });
    
    return NextResponse.json({
      success: true,
      message: `Node with nodeId '${nodeId}' deleted successfully`
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