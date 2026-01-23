import { runQuery } from '../../lib/neo4j.js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

/**
 * POST /api/users/register
 * Register a new user
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

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Username must be 3-20 characters, alphanumeric and underscores only' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Password must be at least 8 characters' 
          } 
        },
        { status: 400 }
      );
    }

    // Check if username already exists
    const checkCypher = 'MATCH (u:User {username: $username}) RETURN u';
    const existing = await runQuery(checkCypher, { username });

    if (existing.length > 0) {
      return NextResponse.json(
        { 
          error: { 
            code: 'USER_EXISTS', 
            message: 'Username already exists' 
          } 
        },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with Entity label for consistency
    const createCypher = `
      CREATE (u:User:Entity {
        username: $username, 
        passwordHash: $passwordHash, 
        role: $role,
        createdAt: datetime()
      })
      RETURN u
    `;

    await runQuery(createCypher, { 
      username, 
      passwordHash, 
      role: 'user' 
    });

    return NextResponse.json(
      { message: 'User created successfully' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register user',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}