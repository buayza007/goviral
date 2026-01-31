import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  clerkUserId?: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
    name?: string;
  };
}

/**
 * Middleware to verify Clerk JWT token and attach user to request
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(
      req.headers['x-clerk-session-id'] as string || '',
      token
    );

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid session',
      });
    }

    const clerkUserId = session.userId;

    // Get or create user in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      // Fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          avatarUrl: clerkUser.imageUrl || null,
        },
      });
    }

    req.userId = user.id;
    req.clerkUserId = clerkUserId;
    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name || undefined,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional auth - attaches user if token present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Try to authenticate, but don't fail if it doesn't work
    await requireAuth(req, res, () => {});
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
}

export { clerkClient };
