export const runtime = 'edge';

import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';
import { DeleteRelationshipRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      fromLabel, 
      fromId, 
      toLabel, 
      toId, 
      relationshipType
    }: DeleteRelationshipRequest = req.body;

    if (!fromLabel || !fromId || !toLabel || !toId || !relationshipType) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Check if relationship exists
    const checkCypher = `
      MATCH (from:${fromLabel} {id: $fromId})-[r:${relationshipType}]->(to:${toLabel} {id: $toId})
      RETURN r
    `;

    const checkResults = await runQuery(checkCypher, { fromId, toId });

    if (checkResults.length === 0) {
      return res.status(404).json({ 
        error: 'Relationship not found' 
      });
    }

    // Delete relationship
    const deleteCypher = `
      MATCH (from:${fromLabel} {id: $fromId})-[r:${relationshipType}]->(to:${toLabel} {id: $toId})
      DELETE r
    `;

    await runQuery(deleteCypher, { fromId, toId });

    res.status(200).json({
      success: true,
      message: 'Relationship deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete relationship error:', error);
    res.status(500).json({ 
      error: 'Failed to delete relationship',
      details: error.message 
    });
  }
}