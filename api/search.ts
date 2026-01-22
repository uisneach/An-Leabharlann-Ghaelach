import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '../lib/neo4j';
import { Source } from '../lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Full-text search across title and description
    const cypher = `
      CALL db.index.fulltext.queryNodes('sourceSearch', $query) 
      YIELD node, score
      MATCH (node:Source)
      OPTIONAL MATCH (node)-[:WRITTEN_IN]->(c:Century)
      OPTIONAL MATCH (node)-[:IN_LANGUAGE]->(l:Language)
      OPTIONAL MATCH (node)-[:BELONGS_TO]->(cat:Category)
      RETURN node {
        .*,
        century: c.period,
        language: l.name,
        category: cat.type,
        relevance: score
      } as source
      ORDER BY score DESC
      LIMIT $limit
    `;

    const results = await runQuery<{ source: Source }>(
      cypher,
      { query: q, limit: parseInt(limit as string) }
    );

    res.status(200).json({ 
      results: results.map(r => r.source),
      query: q 
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}