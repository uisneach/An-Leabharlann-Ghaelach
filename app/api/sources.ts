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
    const { century, language, category, limit = 50 } = req.query;

    let cypher = `
      MATCH (s:Source)
    `;

    const params: Record<string, any> = { limit: parseInt(limit as string) };

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    
    if (century) {
      cypher += `-[:WRITTEN_IN]->(c:Century)`;
      conditions.push('c.period = $century');
      params.century = century;
    }
    
    if (language) {
      cypher += `-[:IN_LANGUAGE]->(l:Language)`;
      conditions.push('l.name = $language');
      params.language = language;
    }
    
    if (category) {
      cypher += `-[:BELONGS_TO]->(cat:Category)`;
      conditions.push('cat.type = $category');
      params.category = category;
    }

    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')}`;
    }

    cypher += `
      RETURN s {
        .*,
        century: [(s)-[:WRITTEN_IN]->(c:Century) | c.period][0],
        language: [(s)-[:IN_LANGUAGE]->(l:Language) | l.name][0],
        category: [(s)-[:BELONGS_TO]->(cat:Category) | cat.type][0]
      } as source
      ORDER BY s.yearWritten DESC
      LIMIT $limit
    `;

    const results = await runQuery<{ source: Source }>(cypher, params);
    const sources = results.map(r => r.source);

    res.status(200).json({ sources, count: sources.length });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
}