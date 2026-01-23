export const runtime = 'edge';

import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';
import { DeleteNodeRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { label, id }: DeleteNodeRequest = req.body;

    if (!label || !id) {
      return res.status(400).json({ 
        error: 'Missing required fields: label, id' 
      });
    }

    // Check if node exists first
    const checkCypher = `
      MATCH (n:${label} {nodeId: $id})
      RETURN n
    `;

    const checkResults = await runQuery(checkCypher, { id });

    if (checkResults.length === 0) {
      return res.status(404).json({ 
        error: `Node not found with label '${label}' and id '${id}'` 
      });
    }

    // Delete node and all its relationships
    const deleteCypher = `
      MATCH (n:${label} {id: $id})
      DETACH DELETE n
    `;

    await runQuery(deleteCypher, { id });

    res.status(200).json({
      success: true,
      message: `Node deleted with label '${label}' and id '${id}'`
    });

  } catch (error: any) {
    console.error('Delete node error:', error);
    res.status(500).json({ 
      error: 'Failed to delete node',
      details: error.message 
    });
  }
}