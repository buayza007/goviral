import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApifyClient } from "apify-client";
import { Platform } from "@prisma/client";

// ============================================
// INTERFACES - Based on actual Apify response
// ============================================

interface ApifyFacebookPost {
  post_id: string;
  post_url: string;
  text: string;
  create_time: number;
  
  // Engagement - exact field names from Apify
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  play_count: number;
  
  // Media
  image_list: string[];
  video_list: string[];
  video_cover_image: string[];
  
  // Author
  author_username: string;
  author_user_id: string;
  author_profile_url: string;
  author_avatar: string;
  
  // Reactions
  reaction_map: { name: string; count: number }[];
  
  type: string;
}

interface ViralPost {
  facebookUrl: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  authorName?: string;
  authorAvatar?: string;
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
// PROCESS APIFY RESULTS
// ============================================

function processSearchResults(items: ApifyFacebookPost[]): ViralPost[] {
  console.log(`Processing ${items.length} items from Apify`);
  
  const mapped: ViralPost[] = items.map((item, index) => {
    // Extract engagement using exact field names
    const likes = Number(item.like_count) || 0;
    const comments = Number(item.comment_count) || 0;
    const shares = Number(item.share_count) || 0;
    const views = Number(item.view_count) || Number(item.play_count) || 0;
    
    // Get first image from image_list array
    let imageUrl: string | undefined;
    if (item.image_list && Array.isArray(item.image_list) && item.image_list.length > 0) {
      imageUrl = item.image_list[0];
    }
    
    // Get video if available
    let videoUrl: string | undefined;
    if (item.video_list && Array.isArray(item.video_list) && item.video_list.length > 0) {
      videoUrl = item.video_list[0];
    }
    // Use video cover as image if no image
    if (!imageUrl && item.video_cover_image && Array.isArray(item.video_cover_image) && item.video_cover_image.length > 0) {
      imageUrl = item.video_cover_image[0];
    }
    
    // Format posted time
    let postedAt: string | undefined;
    if (item.create_time) {
      postedAt = new Date(item.create_time).toISOString();
    }

    const post: ViralPost = {
      facebookUrl: item.post_url || "",
      caption: item.text || "",
      imageUrl,
      videoUrl,
      authorName: item.author_username || undefined,
      authorAvatar: item.author_avatar || undefined,
      metrics: { likes, comments, shares, views },
      score: calculateViralScore(likes, comments, shares),
      postedAt,
    };

    // Debug log
    console.log(`Post ${index + 1}: likes=${likes}, comments=${comments}, shares=${shares}, score=${post.score}, hasImage=${!!imageUrl}`);

    return post;
  });

  // Sort by viral score (highest first)
  mapped.sort((a, b) => b.score - a.score);

  // Return top 5
  return mapped.slice(0, 5);
}

// ============================================
// FACEBOOK SEARCH
// ============================================

async function searchFacebookByKeyword(
  keyword: string,
  cookies: string,
  apifyToken: string,
  options: { since?: "1d" | "7d" | "30d"; resultsLimit?: number } = {}
): Promise<ViralPost[]> {
  const client = new ApifyClient({ token: apifyToken });
  const actorId = "alien_force/facebook-search-scraper";

  // Parse cookies
  let cookiesArray: { name: string; value: string; domain: string }[] = [];
  
  try {
    if (cookies.trim().startsWith("[")) {
      cookiesArray = JSON.parse(cookies);
    } else {
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
    throw new Error("รูปแบบ Cookie ไม่ถูกต้อง");
  }

  if (cookiesArray.length === 0) {
    throw new Error("ไม่พบ Cookie ที่ถูกต้อง");
  }

  const input = {
    search_type: "posts",
    keyword: keyword,
    filter_by_recent_posts: true,
    results_limit: options.resultsLimit || 30,
    min_wait_time_in_sec: 1,
    max_wait_time_in_sec: 5,
    cookies: cookiesArray,
    fetch_reaction_map: true,
    since: options.since || "7d",
  };

  console.log(`Searching Facebook for: "${keyword}"`);

  const run = await client.actor(actorId).call(input, { waitSecs: 180 });
  console.log(`Apify run status: ${run.status}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`Got ${items.length} items from Apify`);

  if (items.length === 0) {
    throw new Error("ไม่พบโพสต์จากคำค้นหานี้");
  }

  return processSearchResults(items as unknown as ApifyFacebookPost[]);
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
    const { keyword, cookies, platform = "FACEBOOK", since = "7d", resultsLimit = 30 } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: "กรุณาใส่ keyword" }, { status: 400 });
    }
    if (!cookies?.trim()) {
      return NextResponse.json({ error: "กรุณาใส่ Facebook Cookie" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const viralPosts = await searchFacebookByKeyword(keyword, cookies, apifyToken, { since, resultsLimit });
    const dbResult = await saveToDatabase(clerkId, keyword, platform, viralPosts);

    // Build response
    const contents = viralPosts.map((post, index) => ({
      id: `${dbResult.queryId}_${index}`,
      externalId: `post_${index}`,
      url: post.facebookUrl,
      caption: post.caption,
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null,
      pageName: post.authorName || null,
      authorAvatar: post.authorAvatar || null,
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

    console.log("=== FINAL RESPONSE ===");
    contents.forEach((c, i) => {
      console.log(`#${i+1}: Likes=${c.likesCount}, Comments=${c.commentsCount}, Shares=${c.sharesCount}, Image=${!!c.imageUrl}`);
    });

    return NextResponse.json({
      message: "Search completed",
      queryId: dbResult.queryId,
      status: "COMPLETED",
      resultCount: contents.length,
      contents,
      keyword,
      scoringFormula: "(likes × 1) + (comments × 3) + (shares × 5)",
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ 
      error: "การค้นหาล้มเหลว", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
