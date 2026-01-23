export const runtime = 'edge';

import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';
import { UpdateNodeRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { label, id, properties }: UpdateNodeRequest = req.body;

    if (!label || !id || !properties) {
      return res.status(400).json({ 
        error: 'Missing required fields: label, id, properties' 
      });
    }

    // Don't allow updating the id itself
    const { id: _, ...propsToUpdate } = properties;

    const cypher = `
      MATCH (n:${label} {id: $id})
      SET n += $properties
      RETURN n
    `;

    const results = await runQuery(cypher, { 
      id, 
      properties: propsToUpdate 
    });

    if (results.length === 0) {
      return res.status(404).json({ 
        error: `Node not found with label '${label}' and id '${id}'` 
      });
    }

    res.status(200).json({
      success: true,
      node: results[0].n,
      message: 'Node updated successfully'
    });

  } catch (error: any) {
    console.error('Update node error:', error);
    res.status(500).json({ 
      error: 'Failed to update node',
      details: error.message 
    });
  }
}