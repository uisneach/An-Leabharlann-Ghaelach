import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';
import { UpdateRelationshipRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      fromLabel, 
      fromId, 
      toLabel, 
      toId, 
      relationshipType,
      properties
    }: UpdateRelationshipRequest = req.body;

    if (!fromLabel || !fromId || !toLabel || !toId || !relationshipType || !properties) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    const cypher = `
      MATCH (from:${fromLabel} {id: $fromId})-[r:${relationshipType}]->(to:${toLabel} {id: $toId})
      SET r += $properties
      RETURN from, r, to
    `;

    const results = await runQuery(cypher, { 
      fromId, 
      toId, 
      properties 
    });

    if (results.length === 0) {
      return res.status(404).json({ 
        error: 'Relationship not found' 
      });
    }

    res.status(200).json({
      success: true,
      relationship: {
        from: results[0].from,
        type: relationshipType,
        properties: results[0].r,
        to: results[0].to
      },
      message: 'Relationship updated successfully'
    });

  } catch (error: any) {
    console.error('Update relationship error:', error);
    res.status(500).json({ 
      error: 'Failed to update relationship',
      details: error.message 
    });
  }
}