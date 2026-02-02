import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export const runtime = 'edge';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/users/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Refresh token is required' 
          } 
        },
        { status: 400 }
      );
    }

    // Find user with this refresh token
    const findCypher = 'MATCH (u:User {refreshToken: $refreshToken}) RETURN u';
    const result = await runQuery(findCypher, { refreshToken });

    if (result.length === 0) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_TOKEN', 
            message: 'Invalid refresh token' 
          } 
        },
        { status: 401 }
      );
    }

    const user = result[0].u.properties;

    // Generate new access token
    const token = jwt.sign(
      { username: user.username, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh token',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}