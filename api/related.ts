import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '../lib/neo4j';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Source ID required' });
  }

  try {
    // Find related sources through graph traversal
    const cypher = `
      MATCH (s:Source {id: $id})
      MATCH (s)-[*1..2]-(related:Source)
      WHERE related.id <> $id
      WITH related, 
           count(*) as connections,
           collect(type(r)) as relationshipTypes
      RETURN related {
        .*,
        connections: connections,
        relationshipTypes: relationshipTypes
      } as source
      ORDER BY connections DESC
      LIMIT 10
    `;

    const results = await runQuery<{ source: any }>(cypher, { id });

    res.status(200).json({ 
      related: results.map(r => r.source) 
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch related sources' });
  }
}