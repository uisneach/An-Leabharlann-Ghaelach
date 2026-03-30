import { runQuery } from '../lib/neo4j.js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export const runtime = 'edge';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/users
 * Dispatches on the 'action' field in the request body.
 *
 * Actions:
 *   register        – { action, username, password }
 *   login           – { action, username, password }
 *   refresh         – { action, refreshToken }
 *   change-password – { action, username, password, newPassword }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'register':
        return handleRegister(body);
      case 'login':
        return handleLogin(body);
      case 'refresh':
        return handleRefresh(body);
      case 'change-password':
        return handleChangePassword(body);
      default:
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_ACTION',
              message: 'action must be one of: login, refresh, change-password',
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('User endpoint error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Register new user
// ---------------------------------------------------------------------------
async function handleRegister(body: Record<string, string>) {
  const { username, password } = body;

  // Validate input
  if (!username || !password) {
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

  // Check if user already exists
  const existing = await runQuery<{ u: User }>(
    'MATCH (u:User {username: $username}) RETURN u',
    { username }
  );

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: 'Username already exists',
        username: username
      },
      { status: 409 }
    );
  }

  // Hash the password with bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate json web token
  const token = jwt.sign(
    { username, role: 'user' },
    JWT_SECRET,
    { expiresIn: '90m' }
  );

  const refreshToken = randomUUID();

  // Store refresh token in user node
  await runQuery(
    `MATCH (u:User {username: $username})
     SET u.refreshToken = $refreshToken,
         u.lastLogin    = datetime()
     RETURN u`,
    { username, refreshToken }
  );

  // Create new user node
  await runQuery(
    `CREATE (u:User:Entity {
      username: $username, 
      passwordHash: $passwordHash, 
      role: $role,
      refreshToken = $refreshToken,
      createdAt: datetime()
    })`,
    { 
      username, 
      passwordHash, 
      role: 'user',
      refreshToken
    }
  );

  return NextResponse.json(
    {
      success: true,
      message: 'User created successfully',
      username: username
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
async function handleLogin(body: Record<string, string>) {
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Username and password are required',
        },
      },
      { status: 400 }
    );
  }

  // Find user in database
  const result = await runQuery(
    'MATCH (u:User {username: $username}) RETURN u',
    { username }
  );

  if (result.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      },
      { status: 401 }
    );
  }

  const user = result[0].u.properties;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
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
  await runQuery(
    `MATCH (u:User {username: $username})
     SET u.refreshToken = $refreshToken,
         u.lastLogin    = datetime()
     RETURN u`,
    { username, refreshToken }
  );

  return NextResponse.json({
    token,
    refreshToken,
    user: {
      username: user.username,
      role: user.role,
    },
  });
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------
async function handleRefresh(body: Record<string, string>) {
  const { refreshToken } = body;

  if (!refreshToken) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Refresh token is required',
        },
      },
      { status: 400 }
    );
  }

  // Find user with this refresh token
  const result = await runQuery(
    'MATCH (u:User {refreshToken: $refreshToken}) RETURN u',
    { refreshToken }
  );

  if (result.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
        },
      },
      { status: 401 }
    );
  }

  const user = result[0].u.properties;

  // Generate new access token
  const token = jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '90m' }
  );

  // Set this new token in the database
  await runQuery(
    `MATCH (u:User {username: $username})
    SET u.refreshToken = $token
    RETURN u`,
    { username: user.username, token }
  );

  return NextResponse.json({ token });
}

// ---------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------
async function handleChangePassword(body: Record<string, string>) {
  const { username, password, newPassword } = body;

  if (!username || !password || !newPassword) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'username, password, and newPassword are all required',
        },
      },
      { status: 400 }
    );
  }

  const result = await runQuery(
    'MATCH (u:User {username: $username}) RETURN u',
    { username }
  );

  if (result.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      },
      { status: 401 }
    );
  }

  const user = result[0].u.properties;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      },
      { status: 401 }
    );
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await runQuery(
    `MATCH (u:User {username: $username})
     SET u.passwordHash = $newPasswordHash
     RETURN u`,
    { username, newPasswordHash }
  );

  return NextResponse.json({ message: 'Password updated successfully' });
}

// ---------------------------------------------------------------------------
// Get User
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { username } = body;

    const result = await runQuery(
      'MATCH (u:User {username: $username}) RETURN u',
      { username }
    );
 
    if (result.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `No user found with username '${username}'`,
          },
        },
        { status: 404 }
      );
    }
 
    const user = result[0].u.properties;
 
    return NextResponse.json({
      user: {
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/*
FUTURE ENHANCEMENTS:
- Email verification
- Account lockout after failed attempts
- Password complexity requirements
*/

// ---------------------------------------------------------------------------
// CORS preflight
// ---------------------------------------------------------------------------

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}