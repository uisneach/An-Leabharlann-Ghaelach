import type { NextApiRequest, NextApiResponse } from 'next';
import { runQuery } from '../../lib/neo4j';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Get source with all relationships
    const cypher = `
      MATCH (s:Source {id: $id})
      OPTIONAL MATCH (s)-[:WRITTEN_BY]->(a:Author)
      OPTIONAL MATCH (s)-[:WRITTEN_IN]->(c:Century)
      OPTIONAL MATCH (s)-[:IN_LANGUAGE]->(l:Language)
      OPTIONAL MATCH (s)-[:BELONGS_TO]->(cat:Category)
      OPTIONAL MATCH (s)-[:REFERENCES]->(ref:Source)
      OPTIONAL MATCH (s)<-[:REFERENCES]-(refBy:Source)
      OPTIONAL MATCH (s)-[:MENTIONS]->(loc:Location)
      
      RETURN s {
        .*,
        author: a.name,
        century: c.period,
        language: l.name,
        category: cat.type,
        references: collect(DISTINCT ref.title),
        referencedBy: collect(DISTINCT refBy.title),
        locations: collect(DISTINCT loc.name)
      } as source
    `;

    const results = await runQuery<{ source: any }>(cypher, { id });

    if (results.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.status(200).json(results[0].source);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch source' });
  }
}