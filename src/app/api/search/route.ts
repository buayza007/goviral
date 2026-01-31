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
  pageName?: string;
  authorId?: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  score: number;
  postedAt?: string;
}

interface FacebookSearchResult {
  // Post data
  post_id?: string;
  post_url?: string;
  url?: string;
  text?: string;
  content?: string;
  message?: string;
  
  // Author data
  author_name?: string;
  author_id?: string;
  author_url?: string;
  author_profile_picture?: string;
  
  // Media
  image_url?: string;
  images?: string[];
  video_url?: string;
  thumbnail_url?: string;
  
  // Engagement
  likes?: number;
  reactions?: number;
  reaction_count?: number;
  comments?: number;
  comment_count?: number;
  shares?: number;
  share_count?: number;
  views?: number;
  view_count?: number;
  
  // Time
  post_time?: string;
  timestamp?: string;
  created_time?: string;
  
  // Reaction breakdown
  reaction_map?: {
    like?: number;
    love?: number;
    haha?: number;
    wow?: number;
    sad?: number;
    angry?: number;
  };
  
  [key: string]: unknown;
}

// ============================================
// VIRAL SCORING ALGORITHM
// ============================================

function calculateViralScore(likes: number, comments: number, shares: number): number {
  // Formula: (likes * 1) + (comments * 3) + (shares * 5)
  return (likes * 1) + (comments * 3) + (shares * 5);
}

function processSearchResults(items: FacebookSearchResult[]): ViralPost[] {
  console.log(`Processing ${items.length} search results`);
  
  const mapped: ViralPost[] = items.map(item => {
    const likes = Number(item.likes || item.reactions || item.reaction_count || 0);
    const comments = Number(item.comments || item.comment_count || 0);
    const shares = Number(item.shares || item.share_count || 0);
    const views = Number(item.views || item.view_count || 0);
    
    // Get image
    let imageUrl = item.image_url || item.thumbnail_url;
    if (!imageUrl && item.images && Array.isArray(item.images) && item.images[0]) {
      imageUrl = item.images[0];
    }

    const postUrl = item.post_url || item.url || "";
    const caption = item.text || item.content || item.message || "";
    const postedAt = item.post_time || item.timestamp || item.created_time;

    return {
      facebookUrl: postUrl,
      caption,
      imageUrl,
      pageName: item.author_name,
      authorId: item.author_id,
      metrics: { likes, comments, shares, views },
      score: calculateViralScore(likes, comments, shares),
      postedAt,
    };
  });

  // Filter posts with some content
  const filtered = mapped.filter(post => post.caption || post.imageUrl);

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  // Return Top 5
  return filtered.slice(0, 5);
}

// ============================================
// FACEBOOK SEARCH SCRAPER (alien_force/facebook-search-scraper)
// ============================================

async function searchFacebookByKeyword(
  keyword: string,
  cookies: string,
  apifyToken: string,
  options: {
    searchType?: "posts" | "pages" | "people";
    resultsLimit?: number;
    filterByRecent?: boolean;
    since?: "1d" | "7d" | "30d";
  } = {}
): Promise<ViralPost[]> {
  const client = new ApifyClient({ token: apifyToken });
  const actorId = "alien_force/facebook-search-scraper";

  // Parse cookies string to array format
  let cookiesArray: { name: string; value: string; domain: string }[] = [];
  
  try {
    // Try parsing as JSON array first
    if (cookies.trim().startsWith("[")) {
      cookiesArray = JSON.parse(cookies);
    } else {
      // Parse cookie string format: name1=value1; name2=value2
      cookiesArray = cookies.split(";").map(cookie => {
        const [name, ...valueParts] = cookie.trim().split("=");
        return {
          name: name.trim(),
          value: valueParts.join("=").trim(),
          domain: ".facebook.com"
        };
      }).filter(c => c.name && c.value);
    }
  } catch (e) {
    console.error("Failed to parse cookies:", e);
    throw new Error("รูปแบบ Cookie ไม่ถูกต้อง - ใช้รูปแบบ: name1=value1; name2=value2");
  }

  if (cookiesArray.length === 0) {
    throw new Error("ไม่พบ Cookie ที่ถูกต้อง");
  }

  const input = {
    search_type: options.searchType || "posts",
    keyword: keyword,
    filter_by_recent_posts: options.filterByRecent ?? true,
    results_limit: options.resultsLimit || 30,
    min_wait_time_in_sec: 1,
    max_wait_time_in_sec: 5,
    cookies: cookiesArray,
    fetch_reaction_map: true,
    since: options.since || "7d",
  };

  console.log(`=== FACEBOOK SEARCH REQUEST ===`);
  console.log(`Keyword: ${keyword}`);
  console.log(`Actor: ${actorId}`);
  console.log(`Search Type: ${input.search_type}`);
  console.log(`Results Limit: ${input.results_limit}`);
  console.log(`Cookies count: ${cookiesArray.length}`);

  const run = await client.actor(actorId).call(input, {
    waitSecs: 180, // Wait up to 3 minutes
  });

  console.log(`=== FACEBOOK SEARCH RESPONSE ===`);
  console.log(`Run ID: ${run.id}`);
  console.log(`Status: ${run.status}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`Retrieved ${items.length} items`);
  
  if (items.length > 0) {
    console.log(`Sample item keys:`, Object.keys(items[0]));
  }

  if (items.length === 0) {
    throw new Error("ไม่พบโพสต์จากคำค้นหานี้ - ลองเปลี่ยน keyword หรือตรวจสอบ Cookie");
  }

  return processSearchResults(items as FacebookSearchResult[]);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function toPlatformEnum(platform: string): Platform {
  const upperPlatform = platform.toUpperCase();
  if (upperPlatform === "INSTAGRAM") return Platform.INSTAGRAM;
  if (upperPlatform === "TIKTOK") return Platform.TIKTOK;
  return Platform.FACEBOOK;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

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
        keyword,
        platform,
        status: "COMPLETED",
        apifyRunId: `apify_${Date.now()}`,
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
          pageName: post.pageName || null,
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
// API ROUTE HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      keyword, 
      cookies,
      platform = "FACEBOOK",
      searchType = "posts",
      since = "7d",
      resultsLimit = 30,
    } = body;

    // Validation
    if (!keyword?.trim()) {
      return NextResponse.json(
        { error: "กรุณาใส่ keyword ที่ต้องการค้นหา" },
        { status: 400 }
      );
    }

    if (!cookies?.trim()) {
      return NextResponse.json(
        { error: "กรุณาใส่ Facebook Cookie เพื่อค้นหา" },
        { status: 400 }
      );
    }

    // Check Apify token
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { error: "APIFY_API_TOKEN not configured on server" },
        { status: 500 }
      );
    }

    console.log(`=== NEW SEARCH REQUEST ===`);
    console.log(`Keyword: ${keyword}`);
    console.log(`Search Type: ${searchType}`);
    console.log(`Since: ${since}`);

    // Search Facebook
    const viralPosts = await searchFacebookByKeyword(
      keyword,
      cookies,
      apifyToken,
      {
        searchType,
        resultsLimit,
        filterByRecent: true,
        since,
      }
    );

    console.log(`Found ${viralPosts.length} viral posts`);

    // Save to database
    const dbResult = await saveToDatabase(clerkId, keyword, platform, viralPosts);

    // Transform response
    const contents = viralPosts.map((post, index) => ({
      id: `${dbResult.queryId}_${index}`,
      externalId: `post_${index}_${Date.now()}`,
      url: post.facebookUrl,
      caption: post.caption,
      imageUrl: post.imageUrl,
      pageName: post.pageName,
      pageUrl: null,
      postType: "post",
      postedAt: post.postedAt,
      likesCount: post.metrics.likes,
      commentsCount: post.metrics.comments,
      sharesCount: post.metrics.shares,
      viewsCount: post.metrics.views,
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
      keyword,
      searchType,
      scoringFormula: "(likes × 1) + (comments × 3) + (shares × 5)",
    });

  } catch (error) {
    console.error("Search error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "การค้นหาล้มเหลว", 
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
