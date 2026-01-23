import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error('Missing Neo4j environment variables');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000,
    });
  }
  return driver;
}

export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const driver = getDriver();
  const session: Session = driver.session();
  
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      const obj: any = {};
      record.keys.forEach(key => {
        const value = record.get(key);
        // Convert Neo4j types to plain objects
        if (value?.properties) {
          obj[key] = value.properties;
        } else {
          obj[key] = value;
        }
      });
      return obj as T;
    });
  } catch (error) {
    console.error('Neo4j Query Error:', error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
