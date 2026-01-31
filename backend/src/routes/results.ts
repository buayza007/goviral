import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../lib/clerk';
import { 
  getSearchResults, 
  getUserSearchHistory,
  getDashboardStats 
} from '../services/searchService';
import { NotFoundError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/results/:queryId
 * Get search results by query ID
 */
router.get('/:queryId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { queryId } = req.params;
  const userId = req.userId!;

  const result = await getSearchResults(queryId, userId);

  if (!result) {
    throw new NotFoundError('ไม่พบข้อมูลการค้นหา หรือคุณไม่มีสิทธิ์เข้าถึง');
  }

  res.json(result);
});

/**
 * GET /api/results
 * Get user's search history
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const history = await getUserSearchHistory(userId, limit, offset);

  res.json(history);
});

/**
 * GET /api/results/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const stats = await getDashboardStats(userId);

  res.json(stats);
});

/**
 * GET /api/results/:queryId/contents
 * Get contents for a specific search query with pagination
 */
router.get('/:queryId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { queryId } = req.params;
  const userId = req.userId!;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const sortBy = req.query.sortBy as string || 'engagementScore';
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  // Verify ownership
  const searchQuery = await prisma.searchQuery.findFirst({
    where: {
      id: queryId,
      userId,
    },
  });

  if (!searchQuery) {
    throw new NotFoundError('ไม่พบข้อมูลการค้นหา หรือคุณไม่มีสิทธิ์เข้าถึง');
  }

  // Get contents with pagination
  const [contents, total] = await Promise.all([
    prisma.content.findMany({
      where: { searchQueryId: queryId },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
      select: {
        id: true,
        externalId: true,
        url: true,
        caption: true,
        imageUrl: true,
        videoUrl: true,
        pageName: true,
        pageUrl: true,
        postType: true,
        postedAt: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        viewsCount: true,
        engagementScore: true,
        reactionsJson: true,
        platform: true,
      },
    }),
    prisma.content.count({ where: { searchQueryId: queryId } }),
  ]);

  res.json({
    queryId,
    keyword: searchQuery.keyword,
    platform: searchQuery.platform,
    status: searchQuery.status,
    contents,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + contents.length < total,
    },
  });
});

/**
 * GET /api/results/:queryId/chart-data
 * Get chart data for top 5 posts comparison
 */
router.get('/:queryId/chart-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { queryId } = req.params;
  const userId = req.userId!;

  // Verify ownership
  const searchQuery = await prisma.searchQuery.findFirst({
    where: {
      id: queryId,
      userId,
    },
  });

  if (!searchQuery) {
    throw new NotFoundError('ไม่พบข้อมูลการค้นหา หรือคุณไม่มีสิทธิ์เข้าถึง');
  }

  // Get top 5 posts for chart
  const topContents = await prisma.content.findMany({
    where: { searchQueryId: queryId },
    orderBy: { engagementScore: 'desc' },
    take: 5,
    select: {
      id: true,
      caption: true,
      pageName: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      viewsCount: true,
      engagementScore: true,
      reactionsJson: true,
    },
  });

  // Format for charts
  const chartData = topContents.map((content, index) => ({
    name: `#${index + 1}`,
    label: content.caption?.substring(0, 30) + '...' || content.pageName || `Post ${index + 1}`,
    likes: content.likesCount,
    comments: content.commentsCount,
    shares: content.sharesCount,
    views: content.viewsCount,
    total: content.engagementScore,
    reactions: content.reactionsJson,
  }));

  // Calculate totals
  const totals = topContents.reduce(
    (acc, c) => ({
      likes: acc.likes + c.likesCount,
      comments: acc.comments + c.commentsCount,
      shares: acc.shares + c.sharesCount,
      views: acc.views + c.viewsCount,
      engagement: acc.engagement + c.engagementScore,
    }),
    { likes: 0, comments: 0, shares: 0, views: 0, engagement: 0 }
  );

  res.json({
    chartData,
    totals,
    postsCount: topContents.length,
  });
});

export { router as resultsRouter };
