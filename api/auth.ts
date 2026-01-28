/* 
 * Consolidated Authentication API
 * 
 * This file handles all authentication endpoints using action-based routing
 * to comply with Vercel's serverless function limits.
 * 
 * Endpoints:
 * - POST /api/auth?action=register    - Create new user account
 * - POST /api/auth?action=login       - Login with username/password
 * - POST /api/auth?action=refresh     - Refresh access token
 * 
 * Authentication uses JWT tokens and bcrypt password hashing.
 */

import { runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretJWtoken';

// ============================================
// TYPES
// ============================================

interface JWTPayload {
  username: string;
  role: 'user' | 'admin';
}

interface User {
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  refreshToken?: string;
}

// ============================================
// MAIN HANDLER - Routes to action functions
// ============================================

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  console.log('Auth API called with action:', action);

  // Route to appropriate handler based on action
  switch (action) {
    case 'register':
      return handleRegister(request);
    
    case 'login':
      return handleLogin(request);
    
    case 'refresh':
      return handleRefresh(request);
    
    case null:
    case undefined:
      return NextResponse.json(
        {
          error: 'Missing required query parameter: action',
          availableActions: ['register', 'login', 'refresh'],
          examples: [
            'POST /api/auth?action=register  {"username": "...", "password": "..."}',
            'POST /api/auth?action=login     {"username": "...", "password": "..."}',
            'POST /api/auth?action=refresh   {"refreshToken": "..."}'
          ]
        },
        { status: 400 }
      );
    
    default:
      return NextResponse.json(
        {
          error: `Unknown action: '${action}'`,
          availableActions: ['register', 'login', 'refresh'],
        },
        { status: 400 }
      );
  }
}

// ============================================
// ACTION: Register new user
// ============================================

async function handleRegister(request: NextRequest) {
  console.log('User registration attempt');
  
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      console.log('Missing username or password');
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['username', 'password']
        },
        { status: 400 }
      );
    }

    // Validate username format
    if (typeof username !== 'string' || username.length < 3) {
      return NextResponse.json(
        {
          error: 'Username must be at least 3 characters long'
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        {
          error: 'Password must be at least 6 characters long'
        },
        { status: 400 }
      );
    }

    console.log('Checking if username exists:', username);

    // Check if user already exists
    const existing = await runQuery<{ u: User }>(
      'MATCH (u:User {username: $username}) RETURN u',
      { username }
    );

    if (existing.length > 0) {
      console.log('Username already exists:', username);
      return NextResponse.json(
        {
          error: 'Username already exists',
          username: username
        },
        { status: 409 }
      );
    }

    console.log('Hashing password');

    // Hash the password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('Creating user in database');

    // Create new user node
    await runQuery(
      `CREATE (u:User:Entity {
        username: $username, 
        passwordHash: $passwordHash, 
        role: $role,
        createdAt: datetime()
      })`,
      { 
        username, 
        passwordHash, 
        role: 'user' 
      }
    );

    console.log('User created successfully:', username);

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        username: username
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to register user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// ACTION: Login user
// ============================================

async function handleLogin(request: NextRequest) {
  console.log('User login attempt');
  
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      console.log('Missing username or password');
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['username', 'password']
        },
        { status: 400 }
      );
    }

    console.log('Looking up user:', username);

    // Find user in database
    const results = await runQuery<{ u: User }>(
      'MATCH (u:User {username: $username}) RETURN u',
      { username }
    );

    if (results.length === 0) {
      console.log('User not found:', username);
      return NextResponse.json(
        {
          error: 'Invalid username or password'
        },
        { status: 401 }
      );
    }

    const user = results[0].u;

    console.log('Comparing password hash');

    // Compare provided password with stored hash
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      console.log('Invalid password for user:', username);
      return NextResponse.json(
        {
          error: 'Invalid username or password'
        },
        { status: 401 }
      );
    }

    console.log('Password valid, generating tokens');

    // Generate JWT access token
    const token = jwt.sign(
      { username: user.username, role: user.role } as JWTPayload,
      JWT_SECRET,
      { expiresIn: '90m' }
    );

    // Generate refresh token
    const refreshToken = randomUUID();

    console.log('Storing refresh token in database');

    // Store refresh token in database
    await runQuery(
      'MATCH (u:User {username: $username}) SET u.refreshToken = $refreshToken',
      { username, refreshToken }
    );

    console.log('Login successful for user:', username);

    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token: token,
        refreshToken: refreshToken,
        user: {
          username: user.username,
          role: user.role
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'Failed to login',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// ACTION: Refresh access token
// ============================================

async function handleRefresh(request: NextRequest) {
  console.log('Token refresh attempt');
  
  try {
    const body = await request.json();
    const { refreshToken } = body;

    // Validate input
    if (!refreshToken) {
      console.log('Missing refresh token');
      return NextResponse.json(
        {
          error: 'Missing required field: refreshToken'
        },
        { status: 400 }
      );
    }

    console.log('Looking up refresh token');

    // Find user with this refresh token
    const results = await runQuery<{ u: User }>(
      'MATCH (u:User {refreshToken: $refreshToken}) RETURN u',
      { refreshToken }
    );

    if (results.length === 0) {
      console.log('Invalid refresh token');
      return NextResponse.json(
        {
          error: 'Invalid refresh token'
        },
        { status: 401 }
      );
    }

    const user = results[0].u;

    console.log('Refresh token valid, generating new access token');

    // Generate new JWT access token
    const token = jwt.sign(
      { username: user.username, role: user.role } as JWTPayload,
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    console.log('Token refreshed for user:', user.username);

    return NextResponse.json(
      {
        success: true,
        message: 'Token refreshed successfully',
        token: token
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/*
FUTURE ENHANCEMENTS:
- Email verification
- Password reset flow
- Account lockout after failed attempts
- Password complexity requirements
*/