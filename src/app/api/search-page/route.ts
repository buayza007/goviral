import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApifyClient } from "apify-client";
import { Platform } from "@prisma/client";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

// ============================================
// INTERFACES - Based on apify/facebook-posts-scraper
// ============================================

interface ApifyPagePost {
  postId?: string;
  postUrl?: string;
  url?: string;
  
  // Text content
  text?: string;
  postText?: string;
  message?: string;
  
  // Engagement metrics
  likes?: number;
  likesCount?: number;
  reactions?: number;
  reactionsCount?: number;
  comments?: number;
  commentsCount?: number;
  shares?: number;
  sharesCount?: number;
  views?: number;
  videoViews?: number;
  
  // Media
  imageUrl?: string;
  imageUrls?: string[];
  media?: { thumbnail?: string; url?: string }[];
  videoUrl?: string;
  
  // Author / Page info
  pageName?: string;
  pageUrl?: string;
  authorName?: string;
  
  // Timestamp
  time?: string;
  timestamp?: string;
  publishedAt?: string;
  date?: string;
}

interface ViralPost {
  facebookUrl: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  authorName?: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  score: number;
  postedAt?: string;
}

// ============================================
// VIRAL SCORING
// ============================================

function calculateViralScore(likes: number, comments: number, shares: number): number {
  return (likes * 1) + (comments * 3) + (shares * 5);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractNumber(item: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = item[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const parsed = parseInt(val.replace(/,/g, ""), 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function extractImageUrl(item: Record<string, unknown>): string | undefined {
  // Direct image URL
  if (typeof item.imageUrl === "string" && item.imageUrl) return item.imageUrl;
  
  // Image URLs array
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls[0];
  }
  
  // Media array with thumbnail
  if (Array.isArray(item.media) && item.media.length > 0) {
    const first = item.media[0] as { thumbnail?: string; url?: string };
    if (first?.thumbnail) return first.thumbnail;
    if (first?.url) return first.url;
  }
  
  return undefined;
}

// ============================================
// PROCESS APIFY RESULTS
// ============================================

function processPageResults(items: Record<string, unknown>[]): ViralPost[] {
  console.log(`Processing ${items.length} page posts from Apify`);
  
  const mapped: ViralPost[] = items.map((item, index) => {
    // Extract engagement
    const likes = extractNumber(item, "likes", "likesCount", "reactions", "reactionsCount");
    const comments = extractNumber(item, "comments", "commentsCount");
    const shares = extractNumber(item, "shares", "sharesCount");
    const views = extractNumber(item, "views", "videoViews");
    
    // Extract image
    const imageUrl = extractImageUrl(item);
    
    // Extract video
    const videoUrl = typeof item.videoUrl === "string" ? item.videoUrl : undefined;
    
    // Extract text
    const caption = (item.text || item.postText || item.message || "") as string;
    
    // Extract URL
    const facebookUrl = (item.postUrl || item.url || "") as string;
    
    // Extract author/page name
    const authorName = (item.pageName || item.authorName || "") as string;
    
    // Extract timestamp
    let postedAt: string | undefined;
    const timeVal = item.time || item.timestamp || item.publishedAt || item.date;
    if (timeVal) {
      try {
        postedAt = new Date(timeVal as string).toISOString();
      } catch {
        postedAt = timeVal as string;
      }
    }

    const post: ViralPost = {
      facebookUrl,
      caption,
      imageUrl,
      videoUrl,
      authorName,
      metrics: { likes, comments, shares, views },
      score: calculateViralScore(likes, comments, shares),
      postedAt,
    };

    console.log(`Post ${index + 1}: likes=${likes}, comments=${comments}, shares=${shares}, score=${post.score}`);

    return post;
  });

  // Sort by viral score (highest first)
  mapped.sort((a, b) => b.score - a.score);

  // Return top 5
  return mapped.slice(0, 5);
}

// ============================================
// FACEBOOK PAGE SCRAPER
// ============================================

async function scrapePagePosts(
  pageUrls: string[],
  apifyToken: string,
  options: { resultsLimit?: number } = {}
): Promise<{ posts: ViralPost[]; rawItems: Record<string, unknown>[] }> {
  const client = new ApifyClient({ token: apifyToken });
  const actorId = "apify/facebook-posts-scraper";

  const input = {
    startUrls: pageUrls.map(url => ({ url })),
    resultsLimit: options.resultsLimit || 50,
  };

  console.log(`Scraping pages: ${pageUrls.join(", ")}`);

  const run = await client.actor(actorId).call(input, { waitSecs: 180 });
  console.log(`Apify run status: ${run.status}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`Got ${items.length} items from page scraper`);

  if (items.length === 0) {
    throw new Error("ไม่พบโพสต์จากเพจนี้");
  }

  const rawItems = items as Record<string, unknown>[];
  const posts = processPageResults(rawItems);
  
  return { posts, rawItems };
}

// ============================================
// DATABASE
// ============================================

function toPlatformEnum(platform: string): Platform {
  const upper = platform.toUpperCase();
  if (upper === "INSTAGRAM") return Platform.INSTAGRAM;
  if (upper === "TIKTOK") return Platform.TIKTOK;
  return Platform.FACEBOOK;
}

async function saveToDatabase(
  clerkId: string,
  keyword: string,
  platformStr: string,
  viralPosts: ViralPost[]
) {
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const platform = toPlatformEnum(platformStr);

    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, email: `${clerkId}@placeholder.com` },
      });
    }

    const searchQuery = await prisma.searchQuery.create({
      data: {
        userId: user.id,
        keyword: `[PAGE] ${keyword}`,
        platform,
        status: "COMPLETED",
        apifyRunId: `page_${Date.now()}`,
        resultCount: viralPosts.length,
      },
    });

    for (let i = 0; i < viralPosts.length; i++) {
      const post = viralPosts[i];
      await prisma.content.create({
        data: {
          searchQueryId: searchQuery.id,
          externalId: `${searchQuery.id}_${i}_${Date.now()}`,
          platform,
          url: post.facebookUrl,
          caption: post.caption,
          imageUrl: post.imageUrl || null,
          videoUrl: post.videoUrl || null,
          pageName: post.authorName || null,
          likesCount: post.metrics.likes,
          commentsCount: post.metrics.comments,
          sharesCount: post.metrics.shares,
          viewsCount: post.metrics.views,
          engagementScore: post.score,
          postedAt: post.postedAt ? new Date(post.postedAt) : null,
          metricsJson: post.metrics as object,
        },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { searchesUsed: { increment: 1 } },
    });

    return { success: true, queryId: searchQuery.id };
  } catch (dbError) {
    console.error("Database error:", dbError);
    return { success: false, queryId: `temp_${Date.now()}` };
  }
}

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageUrls, platform = "FACEBOOK", resultsLimit = 50, debug = false } = body;

    // Parse page URLs - support both array and newline/comma separated string
    let urls: string[] = [];
    if (Array.isArray(pageUrls)) {
      urls = pageUrls.filter((u: string) => u.trim());
    } else if (typeof pageUrls === "string") {
      urls = pageUrls
        .split(/[\n,]/)
        .map((u: string) => u.trim())
        .filter((u: string) => u && u.includes("facebook.com"));
    }

    if (urls.length === 0) {
      return NextResponse.json({ error: "กรุณาใส่ URL เพจ Facebook อย่างน้อย 1 เพจ" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const { posts: viralPosts, rawItems } = await scrapePagePosts(urls, apifyToken, { resultsLimit });
    
    // If debug mode, return raw data
    if (debug) {
      return NextResponse.json({
        message: "Debug data",
        itemCount: rawItems.length,
        firstItemKeys: rawItems[0] ? Object.keys(rawItems[0]) : [],
        sampleItems: rawItems.slice(0, 3),
        processedPosts: viralPosts,
      });
    }
    
    const dbResult = await saveToDatabase(clerkId, urls.join(", "), platform, viralPosts);

    // Build response
    const contents = viralPosts.map((post, index) => ({
      id: `${dbResult.queryId}_${index}`,
      externalId: `page_post_${index}`,
      url: post.facebookUrl,
      caption: post.caption,
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null,
      pageName: post.authorName || null,
      postedAt: post.postedAt || null,
      likesCount: post.metrics.likes,
      commentsCount: post.metrics.comments,
      sharesCount: post.metrics.shares,
      viewsCount: post.metrics.views,
      engagementScore: post.score,
      viralScore: post.score,
      platform,
      rank: index + 1,
    }));

    console.log("=== PAGE SCRAPER RESPONSE ===");
    contents.forEach((c, i) => {
      console.log(`#${i+1}: Likes=${c.likesCount}, Comments=${c.commentsCount}, Shares=${c.sharesCount}`);
    });

    return NextResponse.json({
      message: "Page scraping completed",
      queryId: dbResult.queryId,
      status: "COMPLETED",
      resultCount: contents.length,
      contents,
      pageUrls: urls,
      scoringFormula: "(likes × 1) + (comments × 3) + (shares × 5)",
    });

  } catch (error) {
    console.error("Page scraper error:", error);
    return NextResponse.json({ 
      error: "การดึงข้อมูลเพจล้มเหลว", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
