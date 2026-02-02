import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export const runtime = 'edge';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/users/login
 * Log in a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Username and password are required' 
          } 
        },
        { status: 400 }
      );
    }

    // Find user
    const findCypher = 'MATCH (u:User {username: $username}) RETURN u';
    const result = await runQuery(findCypher, { username });

    if (result.length === 0) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_CREDENTIALS', 
            message: 'Invalid username or password' 
          } 
        },
        { status: 401 }
      );
    }

    const user = result[0].u.properties;

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_CREDENTIALS', 
            message: 'Invalid username or password' 
          } 
        },
        { status: 401 }
      );
    }

    // Generate tokens
    const token = jwt.sign(
      { username, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '90m' }
    );
    
    const refreshToken = randomUUID();

    // Store refresh token in user node
    const updateCypher = `
      MATCH (u:User {username: $username}) 
      SET u.refreshToken = $refreshToken,
          u.lastLogin = datetime()
      RETURN u
    `;
    
    await runQuery(updateCypher, { username, refreshToken });

    return NextResponse.json({
      token,
      refreshToken,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to log in',
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