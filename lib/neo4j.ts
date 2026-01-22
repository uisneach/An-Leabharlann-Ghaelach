import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI!;
    const user = process.env.NEO4J_USER!;
    const password = process.env.NEO4J_PASSWORD!;

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
    });
  }
  return driver;
}

export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const driver = getDriver();
  const session = driver.session();
  
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject() as T);
  } finally {
    await session.close();
  }
}