import { prisma } from '../lib/prisma';
import { searchFacebookPages, FacebookPost } from '../lib/apify';
import { Platform, SearchStatus } from '@prisma/client';
import { QuotaExceededError, ValidationError } from '../middleware/errorHandler';

export interface SearchParams {
  userId: string;
  keyword: string;
  platform: Platform;
  maxPosts?: number;
}

export interface SearchResult {
  queryId: string;
  status: SearchStatus;
  resultCount: number;
  contents: ContentResult[];
}

export interface ContentResult {
  id: string;
  externalId: string;
  url: string;
  caption: string | null;
  imageUrl: string | null;
  pageName: string | null;
  postType: string | null;
  postedAt: Date | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  engagementScore: number;
  reactionsJson: any;
}

/**
 * Check if user has remaining search quota
 */
export async function checkUserQuota(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      searchQuota: true,
      searchesUsed: true,
      quotaResetDate: true,
    },
  });

  if (!user) return false;

  // Reset quota if it's a new month
  const now = new Date();
  const resetDate = new Date(user.quotaResetDate);
  
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        searchesUsed: 0,
        quotaResetDate: now,
      },
    });
    return true;
  }

  return user.searchesUsed < user.searchQuota;
}

/**
 * Increment user's search count
 */
export async function incrementSearchCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      searchesUsed: { increment: 1 },
    },
  });
}

/**
 * Create a new search query
 */
export async function createSearchQuery(params: SearchParams): Promise<string> {
  const { userId, keyword, platform } = params;

  // Check quota
  const hasQuota = await checkUserQuota(userId);
  if (!hasQuota) {
    throw new QuotaExceededError('You have reached your monthly search quota. Please upgrade your plan.');
  }

  // Create search query record
  const searchQuery = await prisma.searchQuery.create({
    data: {
      userId,
      keyword,
      platform,
      status: 'PENDING',
    },
  });

  return searchQuery.id;
}

/**
 * Execute Facebook search and save results
 */
export async function executeSearch(queryId: string, maxPosts: number = 20): Promise<SearchResult> {
  const searchQuery = await prisma.searchQuery.findUnique({
    where: { id: queryId },
    include: { user: true },
  });

  if (!searchQuery) {
    throw new ValidationError('Search query not found');
  }

  try {
    // Update status to processing
    await prisma.searchQuery.update({
      where: { id: queryId },
      data: { status: 'PROCESSING' },
    });

    // Determine URLs to scrape
    let urls: string[] = [];
    const keyword = searchQuery.keyword;

    // Check if keyword is a URL or a page name
    if (keyword.includes('facebook.com')) {
      urls = [keyword];
    } else {
      // For keywords, search for the page
      urls = [`https://www.facebook.com/${keyword}`];
    }

    // Execute Apify search
    const result = await searchFacebookPages(urls, maxPosts);

    // Process and save results
    const contents = await processAndSaveResults(queryId, searchQuery.platform, result.data);

    // Update search query with results
    await prisma.searchQuery.update({
      where: { id: queryId },
      data: {
        status: 'COMPLETED',
        apifyRunId: result.runId,
        resultCount: contents.length,
      },
    });

    // Increment user's search count
    await incrementSearchCount(searchQuery.userId);

    return {
      queryId,
      status: 'COMPLETED',
      resultCount: contents.length,
      contents,
    };
  } catch (error) {
    // Update status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.searchQuery.update({
      where: { id: queryId },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Process Apify results and save to database
 */
async function processAndSaveResults(
  searchQueryId: string,
  platform: Platform,
  posts: FacebookPost[]
): Promise<ContentResult[]> {
  const contents: ContentResult[] = [];

  for (const post of posts) {
    // Skip posts without ID
    if (!post.postId && !post.url) continue;

    const externalId = post.postId || post.url;
    
    // Calculate engagement score
    const likesCount = post.likes || 0;
    const commentsCount = post.comments || 0;
    const sharesCount = post.shares || 0;
    const viewsCount = post.videoViews || 0;
    const engagementScore = likesCount + commentsCount + sharesCount;

    try {
      const content = await prisma.content.upsert({
        where: {
          searchQueryId_externalId: {
            searchQueryId,
            externalId,
          },
        },
        update: {
          likesCount,
          commentsCount,
          sharesCount,
          viewsCount,
          engagementScore,
          metricsJson: post,
          reactionsJson: post.reactions || null,
        },
        create: {
          searchQueryId,
          externalId,
          platform,
          url: post.url || '',
          pageUrl: post.pageUrl || null,
          pageName: post.pageName || null,
          caption: post.text || null,
          imageUrl: post.imageUrl || null,
          videoUrl: post.videoUrl || null,
          postType: post.postType || null,
          postedAt: post.timestamp ? new Date(post.timestamp * 1000) : null,
          likesCount,
          commentsCount,
          sharesCount,
          viewsCount,
          engagementScore,
          metricsJson: post,
          reactionsJson: post.reactions || null,
        },
      });

      contents.push({
        id: content.id,
        externalId: content.externalId,
        url: content.url,
        caption: content.caption,
        imageUrl: content.imageUrl,
        pageName: content.pageName,
        postType: content.postType,
        postedAt: content.postedAt,
        likesCount: content.likesCount,
        commentsCount: content.commentsCount,
        sharesCount: content.sharesCount,
        viewsCount: content.viewsCount,
        engagementScore: content.engagementScore,
        reactionsJson: content.reactionsJson,
      });
    } catch (error) {
      console.error('Error saving content:', error);
      // Continue with other posts
    }
  }

  // Sort by engagement score
  contents.sort((a, b) => b.engagementScore - a.engagementScore);

  return contents;
}

/**
 * Get search results by query ID
 */
export async function getSearchResults(queryId: string, userId: string): Promise<SearchResult | null> {
  const searchQuery = await prisma.searchQuery.findFirst({
    where: {
      id: queryId,
      userId, // Ensure user owns this query (multi-tenancy)
    },
    include: {
      contents: {
        orderBy: { engagementScore: 'desc' },
      },
    },
  });

  if (!searchQuery) return null;

  return {
    queryId: searchQuery.id,
    status: searchQuery.status,
    resultCount: searchQuery.resultCount,
    contents: searchQuery.contents.map(content => ({
      id: content.id,
      externalId: content.externalId,
      url: content.url,
      caption: content.caption,
      imageUrl: content.imageUrl,
      pageName: content.pageName,
      postType: content.postType,
      postedAt: content.postedAt,
      likesCount: content.likesCount,
      commentsCount: content.commentsCount,
      sharesCount: content.sharesCount,
      viewsCount: content.viewsCount,
      engagementScore: content.engagementScore,
      reactionsJson: content.reactionsJson,
    })),
  };
}

/**
 * Get user's search history
 */
export async function getUserSearchHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const [queries, total] = await Promise.all([
    prisma.searchQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { contents: true },
        },
      },
    }),
    prisma.searchQuery.count({ where: { userId } }),
  ]);

  return {
    queries: queries.map(q => ({
      id: q.id,
      keyword: q.keyword,
      platform: q.platform,
      status: q.status,
      resultCount: q.resultCount,
      createdAt: q.createdAt,
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Get dashboard statistics for user
 */
export async function getDashboardStats(userId: string) {
  const [
    totalSearches,
    totalPosts,
    recentQueries,
    topContents,
    platformStats,
  ] = await Promise.all([
    // Total searches
    prisma.searchQuery.count({ where: { userId } }),
    
    // Total posts found
    prisma.content.count({
      where: {
        searchQuery: { userId },
      },
    }),
    
    // Recent queries
    prisma.searchQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        keyword: true,
        platform: true,
        status: true,
        resultCount: true,
        createdAt: true,
      },
    }),
    
    // Top viral contents
    prisma.content.findMany({
      where: {
        searchQuery: { userId },
      },
      orderBy: { engagementScore: 'desc' },
      take: 10,
      select: {
        id: true,
        url: true,
        caption: true,
        imageUrl: true,
        pageName: true,
        platform: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        engagementScore: true,
        postedAt: true,
      },
    }),
    
    // Platform breakdown
    prisma.searchQuery.groupBy({
      by: ['platform'],
      where: { userId },
      _count: { platform: true },
    }),
  ]);

  // Calculate total engagement
  const totalEngagement = topContents.reduce((sum, c) => sum + c.engagementScore, 0);

  return {
    totalSearches,
    totalPosts,
    totalEngagement,
    platformBreakdown: platformStats.map(p => ({
      platform: p.platform,
      count: p._count.platform,
    })),
    recentQueries,
    topContents,
  };
}
