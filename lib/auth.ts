import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JwtPayload {
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthResult {
  success: boolean;
  user?: JwtPayload;
  error?: {
    code: string;
    message: string;
  };
  status?: number;
}

/**
 * Verify authentication from request headers
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const auth = request.headers.get('authorization');
  
  if (!auth?.startsWith('Bearer ')) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header'
      },
      status: 401
    };
  }

  const token = auth.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    if (!['user', 'admin'].includes(decoded.role)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid user role'
        },
        status: 403
      };
    }

    return {
      success: true,
      user: decoded
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      },
      status: 401
    };
  }
}

/**
 * Require admin role
 */
export function requireAdmin(user?: JwtPayload): AuthResult {
  if (!user || user.role !== 'admin') {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      },
      status: 403
    };
  }

  return {
    success: true,
    user
  };
}

/**
 * Helper to get authenticated user from request
 * Returns user or throws response error
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<JwtPayload> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success || !authResult.user) {
    throw new Error(JSON.stringify({
      error: authResult.error,
      status: authResult.status
    }));
  }

  return authResult.user;
}

/**
 * Helper to get authenticated admin user from request
 * Returns user or throws response error
 */
export async function getAuthenticatedAdmin(request: NextRequest): Promise<JwtPayload> {
  const user = await getAuthenticatedUser(request);
  
  const adminResult = requireAdmin(user);
  if (!adminResult.success) {
    throw new Error(JSON.stringify({
      error: adminResult.error,
      status: adminResult.status
    }));
  }

  return user;
}