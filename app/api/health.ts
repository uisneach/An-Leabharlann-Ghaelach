import { getDriver } from '../lib/neo4j';
import { NextResponse } from 'next/server.js';

export async function GET() {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    
    return NextResponse.json({
      status: 'ok',
      message: 'Connected to Neo4j',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to Neo4j',
        error: error.message,
      },
      { status: 500 }
    );
  }
}