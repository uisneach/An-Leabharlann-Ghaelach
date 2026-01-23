export const runtime = 'edge';

import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '@/lib/neo4j';
import { CreateRelationshipRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      fromLabel, 
      fromId, 
      toLabel, 
      toId, 
      relationshipType,
      properties = {}
    }: CreateRelationshipRequest = req.body;

    if (!fromLabel || !fromId || !toLabel || !toId || !relationshipType) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromLabel, fromId, toLabel, toId, relationshipType' 
      });
    }

    // Validate relationship type
    if (!/^[A-Z_][A-Z0-9_]*$/.test(relationshipType)) {
      return res.status(400).json({ 
        error: 'Invalid relationship type. Use uppercase letters and underscores only.' 
      });
    }

    // Create relationship
    const cypher = `
      MATCH (from:${fromLabel} {id: $fromId})
      MATCH (to:${toLabel} {id: $toId})
      CREATE (from)-[r:${relationshipType} $properties]->(to)
      RETURN from, r, to
    `;

    const results = await runQuery(cypher, { 
      fromId, 
      toId, 
      properties 
    });

    if (results.length === 0) {
      return res.status(404).json({ 
        error: 'One or both nodes not found' 
      });
    }

    res.status(201).json({
      success: true,
      relationship: {
        from: results[0].from,
        type: relationshipType,
        properties: results[0].r,
        to: results[0].to
      },
      message: 'Relationship created successfully'
    });

  } catch (error: any) {
    console.error('Create relationship error:', error);
    res.status(500).json({ 
      error: 'Failed to create relationship',
      details: error.message 
    });
  }
}