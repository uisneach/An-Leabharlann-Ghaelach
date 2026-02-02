import { runQuery } from '../../../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

function getNodeId(request: NextRequest): string | null {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // URL Path will be /api/nodes/[nodeId]/properties
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

const prohibitedKeys = ['nodeId', 'createdBy'];

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
      RETURN properties(n) AS properties
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
      properties: results[0].properties
    });
    
  } catch (error) {
    console.error('Get node properties error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get node properties',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const nodeId = getNodeId(request);
    
    if (!nodeId) {
      return NextResponse.json(
        { error: 'Node ID is required in path' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const properties = body.properties;

    if (typeof properties !== 'object' || properties === null || Array.isArray(properties) || Object.keys(properties).length === 0) {
      return NextResponse.json(
        { error: 'Must provide non-empty properties object in body' },
        { status: 400 }
      );
    }

    const keys = Object.keys(properties);
    for (const key of keys) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return NextResponse.json(
          { 
            error: `Invalid property key format: '${key}'. Use alphanumeric and underscores only, starting with a letter.` 
          },
          { status: 400 }
        );
      }
    }

    const ignored = keys.filter(k => prohibitedKeys.includes(k));
    const allowedProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!prohibitedKeys.includes(key)) {
        allowedProps[key] = value;
      }
    }

    const checkCypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN properties(n) AS properties
    `;
    const checkResults = await runQuery(checkCypher, { nodeId });

    if (checkResults.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    const currentProps = checkResults[0].properties;

    if (Object.keys(allowedProps).length === 0) {
      let message = 'No properties to add';
      if (ignored.length > 0) {
        message = `All properties were prohibited and ignored: ${ignored.join(', ')}`;
      }
      return NextResponse.json({
        success: true,
        message,
        properties: currentProps
      });
    }

    const conflicting = Object.keys(allowedProps).filter(k => k in currentProps);
    if (conflicting.length > 0) {
      let errorMsg = `Properties already exist: ${conflicting.join(', ')}`;
      if (ignored.length > 0) {
        errorMsg += `. Prohibited properties ignored: ${ignored.join(', ')}`;
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: 409 }
      );
    }

    const cypher = `
      MATCH (n {nodeId: $nodeId})
      SET n += $allowedProps
      RETURN properties(n) AS properties
    `;

    const results = await runQuery(cypher, { nodeId, allowedProps });

    let message = 'Properties added successfully';
    if (ignored.length > 0) {
      message += `. Prohibited properties ignored: ${ignored.join(', ')}`;
    }

    return NextResponse.json({
      success: true,
      message,
      properties: results[0].properties
    });

  } catch (error) {
    console.error('Add node properties error:', error);
    return NextResponse.json(
      {
        error: 'Failed to add node properties',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    const properties = body.properties;

    if (typeof properties !== 'object' || properties === null || Array.isArray(properties) || Object.keys(properties).length === 0) {
      return NextResponse.json(
        { error: 'Must provide non-empty properties object in body' },
        { status: 400 }
      );
    }

    const keys = Object.keys(properties);
    for (const key of keys) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return NextResponse.json(
          { 
            error: `Invalid property key format: '${key}'. Use alphanumeric and underscores only, starting with a letter.` 
          },
          { status: 400 }
        );
      }
    }

    const ignored = keys.filter(k => prohibitedKeys.includes(k));
    const allowedProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!prohibitedKeys.includes(key)) {
        allowedProps[key] = value;
      }
    }

    const checkCypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN properties(n) AS properties
    `;
    const checkResults = await runQuery(checkCypher, { nodeId });

    if (checkResults.length === 0) {
      return NextResponse.json(
        { error: `Node not found with nodeId '${nodeId}'` },
        { status: 404 }
      );
    }

    const currentProps = checkResults[0].properties;

    if (Object.keys(allowedProps).length === 0) {
      let message = 'No properties to update';
      if (ignored.length > 0) {
        message = `All properties were prohibited and ignored: ${ignored.join(', ')}`;
      }
      return NextResponse.json({
        success: true,
        message,
        properties: currentProps
      });
    }

    const cypher = `
      MATCH (n {nodeId: $nodeId})
      SET n += $allowedProps
      RETURN properties(n) AS properties
    `;

    const results = await runQuery(cypher, { nodeId, allowedProps });

    let message = 'Properties updated successfully';
    if (ignored.length > 0) {
      message += `. Prohibited properties ignored: ${ignored.join(', ')}`;
    }

    return NextResponse.json({
      success: true,
      message,
      properties: results[0].properties
    });

  } catch (error) {
    console.error('Update node properties error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update node properties',
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

    const body = await request.json();
    let keys = body.keys;

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: 'Must provide non-empty keys array in body' },
        { status: 400 }
      );
    }

    for (const key of keys) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return NextResponse.json(
          { 
            error: `Invalid property key format: '${key}'. Use alphanumeric and underscores only, starting with a letter.` 
          },
          { status: 400 }
        );
      }
    }

    const ignored = keys.filter(k => prohibitedKeys.includes(k));
    const allowedKeys = keys.filter(k => !prohibitedKeys.includes(k));

    const checkCypher = `
      MATCH (n {nodeId: $nodeId})
      RETURN properties(n) AS properties
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

    const currentProps = checkResults[0].properties;

    if (allowedKeys.length === 0) {
      let message = 'No properties to delete';
      if (ignored.length > 0) {
        message = `All properties were prohibited and ignored: ${ignored.join(', ')}`;
      }
      return NextResponse.json({
        success: true,
        message,
        properties: currentProps
      });
    }

    const cypher = `
      MATCH (n {nodeId: $nodeId})
      UNWIND $allowedKeys AS key
      REMOVE n[key]
      RETURN properties(n) AS properties
    `;

    const results = await runQuery(cypher, { nodeId, allowedKeys });
    
    let message = 'Properties deleted successfully';
    if (ignored.length > 0) {
      message += `. Prohibited properties ignored: ${ignored.join(', ')}`;
    }

    return NextResponse.json({
      success: true,
      message,
      properties: results[0].properties
    });
    
  } catch (error) {
    console.error('Delete node properties error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete node properties',
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