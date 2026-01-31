import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../lib/clerk';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      subscriptionPlan: true,
      searchQuota: true,
      searchesUsed: true,
      quotaResetDate: true,
      createdAt: true,
      _count: {
        select: {
          searchQueries: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    ...user,
    totalSearches: user._count.searchQueries,
    quotaRemaining: Math.max(0, user.searchQuota - user.searchesUsed),
  });
});

/**
 * PUT /api/user/profile
 * Update user profile
 */
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { name } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      subscriptionPlan: true,
    },
  });

  res.json(user);
});

/**
 * GET /api/user/subscription
 * Get subscription details
 */
router.get('/subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      searchQuota: true,
      searchesUsed: true,
      quotaResetDate: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Define plan features
  const planFeatures = {
    FREE: {
      name: 'Free',
      searchQuota: 10,
      features: ['10 searches/month', 'Basic analytics', 'Facebook only'],
    },
    STARTER: {
      name: 'Starter',
      searchQuota: 50,
      features: ['50 searches/month', 'Advanced analytics', 'Facebook & Instagram'],
    },
    PRO: {
      name: 'Pro',
      searchQuota: 200,
      features: ['200 searches/month', 'Full analytics', 'All platforms', 'Priority support'],
    },
    ENTERPRISE: {
      name: 'Enterprise',
      searchQuota: 1000,
      features: ['1000 searches/month', 'Full analytics', 'All platforms', 'Dedicated support', 'API access'],
    },
  };

  const currentPlan = planFeatures[user.subscriptionPlan];

  res.json({
    plan: user.subscriptionPlan,
    planName: currentPlan.name,
    quota: user.searchQuota,
    used: user.searchesUsed,
    remaining: Math.max(0, user.searchQuota - user.searchesUsed),
    resetDate: user.quotaResetDate,
    features: currentPlan.features,
    allPlans: planFeatures,
  });
});

/**
 * POST /api/user/sync
 * Sync user from Clerk (webhook handler for development)
 */
router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  const { clerkId, email, name, avatarUrl } = req.body;

  if (!clerkId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      name: name || undefined,
      avatarUrl: avatarUrl || undefined,
    },
    create: {
      clerkId,
      email,
      name: name || null,
      avatarUrl: avatarUrl || null,
    },
  });

  res.json(user);
});

export { router as userRouter };
