export const runtime = 'edge';

import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { label, id } = req.query;

    if (!label || !id) {
      return res.status(400).json({ 
        error: 'Missing required query params: label, id' 
      });
    }

    const cypher = `
      MATCH (n:${label} {id: $id})
      RETURN n
    `;

    const results = await runQuery(cypher, { id });

    if (results.length === 0) {
      return res.status(404).json({ 
        error: `Node not found with label '${label}' and id '${id}'` 
      });
    }

    res.status(200).json({
      success: true,
      node: results[0].n
    });

  } catch (error: any) {
    console.error('Get node error:', error);
    res.status(500).json({ 
      error: 'Failed to get node',
      details: error.message 
    });
  }
}
