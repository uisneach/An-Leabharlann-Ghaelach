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

    // If updating labels, we need to remove old labels and set new ones
    if (labels) {
      // Get current labels, remove them, then add new ones
      cypher += `WITH n, labels(n) as oldLabels\n`;
      cypher += `CALL {\n`;
      cypher += `  WITH n, oldLabels\n`;
      cypher += `  UNWIND oldLabels as oldLabel\n`;
      cypher += `  CALL {\n`;
      cypher += `    WITH n, oldLabel\n`;
      cypher += `    REMOVE n:\`\${oldLabel}\`\n`;
      cypher += `    RETURN n as temp\n`;
      cypher += `  }\n`;
      cypher += `  RETURN collect(temp) as temps\n`;
      cypher += `}\n`;
      cypher += `WITH n\n`;
      cypher += `SET n${labels.map((l: string) => `:${l}`).join('')}\n`;
    }

    // If updating properties, replace all properties except nodeId
    if (properties) {
      // Remove all properties then set new ones (preserving nodeId)
      const propsWithId = { ...properties, nodeId };
      queryParams.properties = propsWithId;
      
      cypher += `SET n = $properties\n`;
    }

    cypher += `RETURN n, labels(n) as labels`;

    const results = await runQuery(cypher, queryParams);

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Node updated successfully',
      node: results[0].n,
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