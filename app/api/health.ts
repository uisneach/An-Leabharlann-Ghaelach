import type { NextApiRequest, NextApiResponse } from 'next';
import { getDriver } from '@/lib/neo4j';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    
    res.status(200).json({
      status: 'ok',
      message: 'Connected to Neo4j',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Neo4j',
      error: error.message
    });
  }
}