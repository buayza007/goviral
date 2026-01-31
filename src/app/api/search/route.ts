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
  videoUrl?: string;
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
  // Different possible field names from Apify
  post_id?: string;
  postId?: string;
  
  post_url?: string;
  postUrl?: string;
  url?: string;
  link?: string;
  
  text?: string;
  content?: string;
  message?: string;
  post_text?: string;
  
  // Author
  author_name?: string;
  authorName?: string;
  author?: string;
  user_name?: string;
  userName?: string;
  page_name?: string;
  pageName?: string;
  
  author_id?: string;
  authorId?: string;
  user_id?: string;
  userId?: string;
  
  // Media - various possible field names
  image_url?: string;
  imageUrl?: string;
  image?: string;
  photo?: string;
  picture?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  thumbnailUrl?: string;
  media_url?: string;
  mediaUrl?: string;
  
  images?: string[];
  photos?: string[];
  media?: string[] | { url?: string; image?: string }[];
  
  video_url?: string;
  videoUrl?: string;
  video?: string;
  
  // Engagement - various possible field names
  likes?: number;
  like_count?: number;
  likeCount?: number;
  likes_count?: number;
  likesCount?: number;
  reactions?: number;
  reaction_count?: number;
  reactionCount?: number;
  reactions_count?: number;
  reactionsCount?: number;
  
  comments?: number;
  comment_count?: number;
  commentCount?: number;
  comments_count?: number;
  commentsCount?: number;
  
  shares?: number;
  share_count?: number;
  shareCount?: number;
  shares_count?: number;
  sharesCount?: number;
  
  views?: number;
  view_count?: number;
  viewCount?: number;
  views_count?: number;
  viewsCount?: number;
  video_views?: number;
  videoViews?: number;
  
  // Time
  post_time?: string;
  postTime?: string;
  timestamp?: string;
  created_time?: string;
  createdTime?: string;
  date?: string;
  time?: string;
  
  [key: string]: unknown;
}

// ============================================
// VIRAL SCORING ALGORITHM
// ============================================

function calculateViralScore(likes: number, comments: number, shares: number): number {
  return (likes * 1) + (comments * 3) + (shares * 5);
}

function getNumber(item: FacebookSearchResult, ...keys: string[]): number {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
}

function getString(item: FacebookSearchResult, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (value && typeof value === "string") {
      return value;
    }
  }
  return "";
}

function getImageUrl(item: FacebookSearchResult): string | undefined {
  // Try direct image fields
  const directImage = getString(item, 
    "image_url", "imageUrl", "image", "photo", "picture", 
    "thumbnail", "thumbnail_url", "thumbnailUrl", 
    "media_url", "mediaUrl"
  );
  if (directImage) return directImage;
  
  // Try images array
  if (item.images && Array.isArray(item.images) && item.images[0]) {
    if (typeof item.images[0] === "string") return item.images[0];
  }
  
  // Try photos array
  if (item.photos && Array.isArray(item.photos) && item.photos[0]) {
    if (typeof item.photos[0] === "string") return item.photos[0];
  }
  
  // Try media array
  if (item.media && Array.isArray(item.media) && item.media[0]) {
    const firstMedia = item.media[0];
    if (typeof firstMedia === "string") return firstMedia;
    if (typeof firstMedia === "object" && firstMedia) {
      return (firstMedia as any).url || (firstMedia as any).image;
    }
  }
  
  return undefined;
}

function processSearchResults(items: FacebookSearchResult[]): ViralPost[] {
  console.log(`Processing ${items.length} search results`);
  
  // Log first item structure for debugging
  if (items.length > 0) {
    console.log("Sample item structure:", JSON.stringify(items[0], null, 2));
  }
  
  const mapped: ViralPost[] = items.map((item, index) => {
    // Extract engagement numbers with multiple fallback field names
    const likes = getNumber(item, 
      "likes", "like_count", "likeCount", "likes_count", "likesCount",
      "reactions", "reaction_count", "reactionCount", "reactions_count", "reactionsCount"
    );
    
    const comments = getNumber(item,
      "comments", "comment_count", "commentCount", "comments_count", "commentsCount"
    );
    
    const shares = getNumber(item,
      "shares", "share_count", "shareCount", "shares_count", "sharesCount"
    );
    
    const views = getNumber(item,
      "views", "view_count", "viewCount", "views_count", "viewsCount",
      "video_views", "videoViews"
    );
    
    // Get URLs
    const postUrl = getString(item, 
      "post_url", "postUrl", "url", "link"
    );
    
    // Get caption/text
    const caption = getString(item,
      "text", "content", "message", "post_text"
    );
    
    // Get author name
    const pageName = getString(item,
      "author_name", "authorName", "author", "user_name", "userName",
      "page_name", "pageName"
    );
    
    // Get image
    const imageUrl = getImageUrl(item);
    
    // Get video
    const videoUrl = getString(item, "video_url", "videoUrl", "video");
    
    // Get posted time
    const postedAt = getString(item,
      "post_time", "postTime", "timestamp", "created_time", "createdTime", "date", "time"
    );

    const post: ViralPost = {
      facebookUrl: postUrl,
      caption,
      imageUrl,
      videoUrl,
      pageName,
      metrics: { likes, comments, shares, views },
      score: calculateViralScore(likes, comments, shares),
      postedAt,
    };
    
    // Log each post's data for debugging
    console.log(`Post ${index + 1}:`, {
      likes,
      comments, 
      shares,
      views,
      hasImage: !!imageUrl,
      hasVideo: !!videoUrl,
      score: post.score,
    });
    
    return post;
  });

  // Sort by score descending
  mapped.sort((a, b) => b.score - a.score);

  // Return Top 5
  return mapped.slice(0, 5);
}

// ============================================
// FACEBOOK SEARCH SCRAPER
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
    console.error("Failed to parse cookies:", e);
    throw new Error("รูปแบบ Cookie ไม่ถูกต้อง");
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

  console.log(`=== FACEBOOK SEARCH ===`);
  console.log(`Keyword: ${keyword}`);
  console.log(`Cookies count: ${cookiesArray.length}`);

  const run = await client.actor(actorId).call(input, {
    waitSecs: 180,
  });

  console.log(`Run status: ${run.status}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`Retrieved ${items.length} items`);

  if (items.length === 0) {
    throw new Error("ไม่พบโพสต์จากคำค้นหานี้");
  }

  return processSearchResults(items as FacebookSearchResult[]);
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
// API HANDLER
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

    if (!keyword?.trim()) {
      return NextResponse.json(
        { error: "กรุณาใส่ keyword" },
        { status: 400 }
      );
    }

    if (!cookies?.trim()) {
      return NextResponse.json(
        { error: "กรุณาใส่ Facebook Cookie" },
        { status: 400 }
      );
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { error: "APIFY_API_TOKEN not configured" },
        { status: 500 }
      );
    }

    // Search
    const viralPosts = await searchFacebookByKeyword(
      keyword,
      cookies,
      apifyToken,
      { searchType, resultsLimit, filterByRecent: true, since }
    );

    // Save
    const dbResult = await saveToDatabase(clerkId, keyword, platform, viralPosts);

    // Response
    const contents = viralPosts.map((post, index) => ({
      id: `${dbResult.queryId}_${index}`,
      externalId: `post_${index}`,
      url: post.facebookUrl,
      caption: post.caption,
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null,
      pageName: post.pageName || null,
      pageUrl: null,
      postType: post.videoUrl ? "video" : "post",
      postedAt: post.postedAt || null,
      likesCount: post.metrics.likes,
      commentsCount: post.metrics.comments,
      sharesCount: post.metrics.shares,
      viewsCount: post.metrics.views,
      engagementScore: post.score,
      platform,
      rank: index + 1,
      viralScore: post.score,
    }));

    console.log("Returning contents:", JSON.stringify(contents, null, 2));

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
    return NextResponse.json(
      { 
        error: "การค้นหาล้มเหลว", 
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
