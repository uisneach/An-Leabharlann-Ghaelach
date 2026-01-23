export const runtime = 'edge';

import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';
import { CreateNodeRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { label, properties }: CreateNodeRequest = req.body;

    if (!label || !properties) {
      return res.status(400).json({
        error: 'Missing required fields: label, properties' 
      });
    }

    // Validate label (Neo4j labels can't contain spaces or special chars)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
      return res.status(400).json({ 
        error: 'Invalid label format. Use alphanumeric and underscores only.' 
      });
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

    res.status(201).json({
      success: true,
      node: results[0].n,
      message: `Node created with label '${label}'`
    });

  } catch (error: any) {
    console.error('Create node error:', error);
    res.status(500).json({ 
      error: 'Failed to create node',
      details: error.message 
    });
  }
}