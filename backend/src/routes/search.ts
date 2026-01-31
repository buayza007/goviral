import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../lib/clerk';
import { 
  createSearchQuery, 
  executeSearch,
  checkUserQuota 
} from '../services/searchService';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

// Validation schema
const searchSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(500),
  platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK']),
  maxPosts: z.number().min(1).max(100).optional().default(20),
});

/**
 * POST /api/search
 * Start a new search
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  
  // Validate input
  const validation = searchSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError(validation.error.errors[0].message);
  }

  const { keyword, platform, maxPosts } = validation.data;

  // Check quota before starting
  const hasQuota = await checkUserQuota(userId);
  if (!hasQuota) {
    return res.status(429).json({
      error: 'Quota Exceeded',
      message: 'คุณใช้โควต้าการค้นหาหมดแล้วในเดือนนี้ กรุณาอัพเกรดแพ็คเกจเพื่อค้นหาเพิ่มเติม',
    });
  }

  // Create search query
  const queryId = await createSearchQuery({
    userId,
    keyword,
    platform,
  });

  // Return immediately with query ID
  res.status(202).json({
    message: 'Search started',
    queryId,
    status: 'PENDING',
  });

  // Execute search in background (fire and forget)
  executeSearch(queryId, maxPosts).catch(error => {
    console.error('Search execution error:', error);
  });
});

/**
 * POST /api/search/sync
 * Synchronous search - waits for results
 */
router.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  
  // Validate input
  const validation = searchSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError(validation.error.errors[0].message);
  }

  const { keyword, platform, maxPosts } = validation.data;

  // Check quota
  const hasQuota = await checkUserQuota(userId);
  if (!hasQuota) {
    return res.status(429).json({
      error: 'Quota Exceeded',
      message: 'คุณใช้โควต้าการค้นหาหมดแล้วในเดือนนี้ กรุณาอัพเกรดแพ็คเกจเพื่อค้นหาเพิ่มเติม',
    });
  }

  // Create and execute search
  const queryId = await createSearchQuery({
    userId,
    keyword,
    platform,
  });

  try {
    const result = await executeSearch(queryId, maxPosts);
    
    res.json({
      message: 'Search completed',
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    res.status(500).json({
      error: 'Search Failed',
      message: 'ไม่สามารถค้นหาข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      details: errorMessage,
      queryId,
    });
  }
});

/**
 * GET /api/search/quota
 * Get user's remaining search quota
 */
router.get('/quota', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  
  const user = await req.app.locals.prisma?.user.findUnique({
    where: { id: userId },
    select: {
      searchQuota: true,
      searchesUsed: true,
      quotaResetDate: true,
      subscriptionPlan: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    quota: user.searchQuota,
    used: user.searchesUsed,
    remaining: Math.max(0, user.searchQuota - user.searchesUsed),
    resetDate: user.quotaResetDate,
    plan: user.subscriptionPlan,
  });
});

export { router as searchRouter };
