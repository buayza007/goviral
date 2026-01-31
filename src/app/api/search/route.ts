import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApifyClient } from "apify-client";
import { Platform } from "@prisma/client";

// ============================================
// INTERFACES
// ============================================

interface ViralPost {
  facebookUrl: string;
  caption: string;
  imageUrl?: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
  };
  score: number;
}

interface ApifyFacebookPost {
  url?: string;
  postUrl?: string;
  link?: string;
  text?: string;
  message?: string;
  caption?: string;
  content?: string;
  imageUrl?: string;
  image?: string;
  media?: { image?: string }[];
  likes?: number;
  likesCount?: number;
  reactions?: number;
  reactionsCount?: number;
  comments?: number;
  commentsCount?: number;
  shares?: number;
  sharesCount?: number;
  timestamp?: number;
  time?: string;
  date?: string;
  pageName?: string;
  authorName?: string;
  [key: string]: unknown;
}

// ============================================
// VIRAL SCORING ALGORITHM
// ============================================

function calculateViralScore(likes: number, comments: number, shares: number): number {
  // Formula: (likes * 1) + (comments * 3) + (shares * 5)
  // Shares weighted highest (true virality), then comments (engagement), then likes
  return (likes * 1) + (comments * 3) + (shares * 5);
}

function processApifyResults(items: ApifyFacebookPost[]): ViralPost[] {
  // Step 1: Filter - Remove items with no content or missing URL
  const filtered = items.filter(item => {
    const url = item.url || item.postUrl || item.link;
    const text = item.text || item.message || item.caption || item.content;
    return url && (text || item.imageUrl || item.image);
  });

  // Step 2: Map - Transform raw data to clean object
  const mapped: ViralPost[] = filtered.map(item => {
    const likes = item.likes || item.likesCount || item.reactions || item.reactionsCount || 0;
    const comments = item.comments || item.commentsCount || 0;
    const shares = item.shares || item.sharesCount || 0;
    
    // Get image URL
    let imageUrl = item.imageUrl || item.image;
    if (!imageUrl && item.media && Array.isArray(item.media) && item.media[0]?.image) {
      imageUrl = item.media[0].image;
    }

    return {
      facebookUrl: item.url || item.postUrl || item.link || "",
      caption: item.text || item.message || item.caption || item.content || "",
      imageUrl,
      metrics: {
        likes,
        comments,
        shares,
      },
      // Step 3: Calculate Score
      score: calculateViralScore(likes, comments, shares),
    };
  });

  // Step 4: Sort by engagementScore descending (highest first)
  mapped.sort((a, b) => b.score - a.score);

  // Step 5: Return only Top 5
  return mapped.slice(0, 5);
}

// ============================================
// MOCK DATA FOR DEMO MODE
// ============================================

function generateMockData(keyword: string): ViralPost[] {
  const mockPosts: ViralPost[] = [
    {
      facebookUrl: "https://facebook.com/post/viral1",
      caption: `🔥 ${keyword} - เคล็ดลับที่คุณต้องรู้! วิธีที่ได้ผลจริงๆ ลองแล้วเห็นผลภายใน 2 สัปดาห์ แชร์ให้เพื่อนๆ ด้วยนะครับ! #${keyword.replace(/\s/g, "")} #viral #trending`,
      imageUrl: "https://picsum.photos/seed/viral1/800/600",
      metrics: { likes: 45000, comments: 8500, shares: 12000 },
      score: calculateViralScore(45000, 8500, 12000),
    },
    {
      facebookUrl: "https://facebook.com/post/viral2",
      caption: `💪 ${keyword} แบบธรรมชาติ! ไม่ต้องพึ่งยา ไม่ต้องอดอาหาร แค่ทำตามนี้ทุกวัน รับรองเห็นผล! ใครลองแล้วมาบอกกันในคอมเมนต์ด้วยนะ`,
      imageUrl: "https://picsum.photos/seed/viral2/800/600",
      metrics: { likes: 38000, comments: 6200, shares: 9500 },
      score: calculateViralScore(38000, 6200, 9500),
    },
    {
      facebookUrl: "https://facebook.com/post/viral3",
      caption: `✨ รีวิวจริงจากคนใช้จริง! ${keyword} ได้ผลจริงไหม? มาดูประสบการณ์ตรงกันเลย! กดแชร์ไว้ไปอ่านทีหลังได้นะคะ 💕`,
      imageUrl: "https://picsum.photos/seed/viral3/800/600",
      metrics: { likes: 32000, comments: 5800, shares: 7200 },
      score: calculateViralScore(32000, 5800, 7200),
    },
    {
      facebookUrl: "https://facebook.com/post/viral4",
      caption: `📢 ข่าวดี! วิธี${keyword}ที่หมอแนะนำ ปลอดภัย ได้ผลจริง ไม่โยโย่ คนดูแล้วกว่า 2 ล้านคน! อ่านรายละเอียดเต็มๆ ในคอมเม้นท์แรกเลย 👇`,
      imageUrl: "https://picsum.photos/seed/viral4/800/600",
      metrics: { likes: 28000, comments: 4500, shares: 5800 },
      score: calculateViralScore(28000, 4500, 5800),
    },
    {
      facebookUrl: "https://facebook.com/post/viral5",
      caption: `🎯 ${keyword} สำหรับมือใหม่ เริ่มต้นยังไงดี? มาดูคำแนะนำจากผู้เชี่ยวชาญกันเลย! กดติดตามเพจเพื่อไม่พลาดเคล็ดลับดีๆ แบบนี้`,
      imageUrl: "https://picsum.photos/seed/viral5/800/600",
      metrics: { likes: 22000, comments: 3800, shares: 4500 },
      score: calculateViralScore(22000, 3800, 4500),
    },
  ];

  return mockPosts.sort((a, b) => b.score - a.score);
}

// ============================================
// APIFY FACEBOOK SEARCH FUNCTION
// ============================================

async function searchFacebookViralContent(
  keyword: string,
  apifyToken: string
): Promise<ViralPost[]> {
  const client = new ApifyClient({ token: apifyToken });

  // Use Facebook Search Scraper actor
  const actorId = process.env.APIFY_ACTOR_ID || "apify/facebook-posts-scraper";
  
  // Build the search URL
  const searchUrl = `https://www.facebook.com/search/posts/?q=${encodeURIComponent(keyword)}`;

  const input = {
    startUrls: [{ url: searchUrl }],
    resultsLimit: 30,
    maxPosts: 30,
  };

  console.log(`Starting Apify search for keyword: "${keyword}"`);
  console.log(`Using actor: ${actorId}`);

  try {
    const run = await client.actor(actorId).call(input, {
      waitSecs: 120,
    });

    console.log(`Apify run completed with status: ${run.status}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`Retrieved ${items.length} items from Apify`);

    if (items.length === 0) {
      return [];
    }

    return processApifyResults(items as ApifyFacebookPost[]);
  } catch (error) {
    console.error("Apify search error:", error);
    throw error;
  }
}

// ============================================
// HELPER: Convert string to Platform enum
// ============================================

function toPlatformEnum(platform: string): Platform {
  const upperPlatform = platform.toUpperCase();
  if (upperPlatform === "FACEBOOK") return Platform.FACEBOOK;
  if (upperPlatform === "INSTAGRAM") return Platform.INSTAGRAM;
  if (upperPlatform === "TIKTOK") return Platform.TIKTOK;
  return Platform.FACEBOOK; // Default
}

// ============================================
// DATABASE OPERATIONS (Optional - with error handling)
// ============================================

async function tryDatabaseOperations(
  clerkId: string,
  keyword: string,
  platformStr: string,
  viralPosts: ViralPost[],
  isDemo: boolean
) {
  try {
    // Dynamic import to handle cases where database is not available
    const { default: prisma } = await import("@/lib/prisma");
    
    // Convert string to Platform enum
    const platform = toPlatformEnum(platformStr);

    // Get or create user
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, email: `${clerkId}@placeholder.com` },
      });
    }

    // Create search query
    const searchQuery = await prisma.searchQuery.create({
      data: {
        userId: user.id,
        keyword,
        platform: platform,
        status: "COMPLETED",
        apifyRunId: isDemo ? "demo_mode" : `apify_${Date.now()}`,
        resultCount: viralPosts.length,
      },
    });

    // Save contents
    for (let i = 0; i < viralPosts.length; i++) {
      const post = viralPosts[i];
      await prisma.content.create({
        data: {
          searchQueryId: searchQuery.id,
          externalId: `${searchQuery.id}_${i}_${Date.now()}`,
          platform: platform,
          url: post.facebookUrl,
          caption: post.caption,
          imageUrl: post.imageUrl || null,
          likesCount: post.metrics.likes,
          commentsCount: post.metrics.comments,
          sharesCount: post.metrics.shares,
          engagementScore: post.score,
          metricsJson: post.metrics as object,
        },
      });
    }

    // Update search count
    await prisma.user.update({
      where: { id: user.id },
      data: { searchesUsed: { increment: 1 } },
    });

    return { success: true, queryId: searchQuery.id };
  } catch (dbError) {
    console.error("Database operation failed (non-critical):", dbError);
    return { success: false, queryId: `temp_${Date.now()}` };
  }
}

// ============================================
// API ROUTE HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { keyword, platform = "FACEBOOK", demoMode = true } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    console.log(`Search request: keyword="${keyword}", demoMode=${demoMode}`);

    let viralPosts: ViralPost[] = [];
    let isDemo = demoMode;

    // Determine if we should use real API or demo mode
    const apifyToken = process.env.APIFY_API_TOKEN;
    const useRealApi = !demoMode && apifyToken;

    if (useRealApi) {
      try {
        console.log("Using real Apify API...");
        viralPosts = await searchFacebookViralContent(keyword, apifyToken);
        isDemo = false;

        // If no results, fallback to demo
        if (viralPosts.length === 0) {
          console.log("No results from Apify, falling back to demo mode");
          viralPosts = generateMockData(keyword);
          isDemo = true;
        }
      } catch (apifyError) {
        console.error("Apify error, falling back to demo mode:", apifyError);
        viralPosts = generateMockData(keyword);
        isDemo = true;
      }
    } else {
      console.log("Using demo mode...");
      viralPosts = generateMockData(keyword);
    }

    // Try to save to database (non-blocking)
    const dbResult = await tryDatabaseOperations(
      clerkId,
      keyword,
      platform,
      viralPosts,
      isDemo
    );

    // Transform to response format
    const contents = viralPosts.map((post, index) => ({
      id: `${dbResult.queryId}_${index}`,
      externalId: `post_${index}_${Date.now()}`,
      url: post.facebookUrl,
      caption: post.caption,
      imageUrl: post.imageUrl,
      pageName: null,
      pageUrl: null,
      postType: "post",
      postedAt: null,
      likesCount: post.metrics.likes,
      commentsCount: post.metrics.comments,
      sharesCount: post.metrics.shares,
      viewsCount: 0,
      engagementScore: post.score,
      platform,
      rank: index + 1,
      viralScore: post.score,
      reactionsJson: null,
      videoUrl: null,
    }));

    return NextResponse.json({
      message: "Search completed",
      queryId: dbResult.queryId,
      status: "COMPLETED",
      resultCount: contents.length,
      contents,
      isDemo,
      scoringFormula: "(likes × 1) + (comments × 3) + (shares × 5)",
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process search", 
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
