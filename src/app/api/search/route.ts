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
// DATA EXTRACTION HELPERS
// ============================================

function extractNumber(obj: any, ...paths: string[]): number {
  for (const path of paths) {
    // Handle nested paths like "engagement.likes"
    const parts = path.split(".");
    let value: any = obj;
    
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }
    
    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

function extractString(obj: any, ...paths: string[]): string {
  for (const path of paths) {
    const parts = path.split(".");
    let value: any = obj;
    
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }
    
    if (value && typeof value === "string") {
      return value;
    }
  }
  return "";
}

function extractImage(obj: any): string | undefined {
  // Direct fields
  const directFields = [
    "image_url", "imageUrl", "image", "photo", "picture",
    "thumbnail", "thumbnail_url", "thumbnailUrl", "media_url", 
    "mediaUrl", "img", "src", "photo_url", "photoUrl",
    "post_image", "postImage", "attached_image", "attachedImage"
  ];
  
  for (const field of directFields) {
    if (obj[field] && typeof obj[field] === "string" && obj[field].startsWith("http")) {
      return obj[field];
    }
  }
  
  // Arrays
  const arrayFields = ["images", "photos", "media", "attachments", "attached_media"];
  for (const field of arrayFields) {
    const arr = obj[field];
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === "string" && first.startsWith("http")) return first;
      if (typeof first === "object" && first) {
        const url = first.url || first.image || first.src || first.photo;
        if (url && typeof url === "string") return url;
      }
    }
  }
  
  // Nested media object
  if (obj.media && typeof obj.media === "object" && !Array.isArray(obj.media)) {
    const url = obj.media.url || obj.media.image || obj.media.src;
    if (url && typeof url === "string") return url;
  }
  
  return undefined;
}

function processSearchResults(items: any[]): ViralPost[] {
  console.log(`\n=== PROCESSING ${items.length} ITEMS ===`);
  
  // Log first item completely for debugging
  if (items.length > 0) {
    console.log("\n📋 FIRST ITEM FULL STRUCTURE:");
    console.log(JSON.stringify(items[0], null, 2));
    console.log("\n📋 FIRST ITEM KEYS:", Object.keys(items[0]));
  }
  
  const mapped: ViralPost[] = items.map((item, index) => {
    // LIKES - try many possible field names
    const likes = extractNumber(item,
      // Direct
      "likes", "like", "likeCount", "likes_count", "likesCount", "like_count",
      // Reactions (Facebook uses reactions instead of likes)
      "reactions", "reaction", "reactionCount", "reactions_count", "reactionsCount", "reaction_count",
      "total_reactions", "totalReactions",
      // Nested
      "engagement.likes", "engagement.reactions", "stats.likes", "stats.reactions",
      "metrics.likes", "metrics.reactions",
      // Other variations
      "num_likes", "numLikes", "likes_total", "likesTotal"
    );
    
    // COMMENTS
    const comments = extractNumber(item,
      "comments", "comment", "commentCount", "comments_count", "commentsCount", "comment_count",
      "total_comments", "totalComments", "num_comments", "numComments",
      "engagement.comments", "stats.comments", "metrics.comments",
      "replies", "reply_count", "replyCount"
    );
    
    // SHARES  
    const shares = extractNumber(item,
      "shares", "share", "shareCount", "shares_count", "sharesCount", "share_count",
      "total_shares", "totalShares", "num_shares", "numShares",
      "engagement.shares", "stats.shares", "metrics.shares",
      "reposts", "repost_count", "repostCount"
    );
    
    // VIEWS
    const views = extractNumber(item,
      "views", "view", "viewCount", "views_count", "viewsCount", "view_count",
      "total_views", "totalViews", "num_views", "numViews",
      "video_views", "videoViews", "video_view_count",
      "engagement.views", "stats.views", "metrics.views",
      "play_count", "playCount", "plays"
    );
    
    // URL
    const postUrl = extractString(item,
      "post_url", "postUrl", "url", "link", "href",
      "facebook_url", "facebookUrl", "permalink"
    );
    
    // TEXT
    const caption = extractString(item,
      "text", "content", "message", "post_text", "postText",
      "body", "description", "caption", "full_text", "fullText"
    );
    
    // AUTHOR
    const pageName = extractString(item,
      "author_name", "authorName", "author", "user_name", "userName",
      "page_name", "pageName", "name", "from_name", "fromName",
      "poster_name", "posterName", "owner_name", "ownerName"
    );
    
    // IMAGE
    const imageUrl = extractImage(item);
    
    // VIDEO
    const videoUrl = extractString(item,
      "video_url", "videoUrl", "video", "video_src", "videoSrc"
    );
    
    // TIME
    const postedAt = extractString(item,
      "post_time", "postTime", "timestamp", "created_time", "createdTime",
      "date", "time", "published_at", "publishedAt", "created_at", "createdAt"
    );

    // Log each item's extracted data
    if (index < 3) {
      console.log(`\n📊 Item ${index + 1} extracted data:`);
      console.log(`   Likes: ${likes} | Comments: ${comments} | Shares: ${shares} | Views: ${views}`);
      console.log(`   Has Image: ${!!imageUrl} | Has Video: ${!!videoUrl}`);
      console.log(`   Caption: ${caption.substring(0, 50)}...`);
    }

    return {
      facebookUrl: postUrl,
      caption,
      imageUrl,
      videoUrl,
      pageName,
      metrics: { likes, comments, shares, views },
      score: calculateViralScore(likes, comments, shares),
      postedAt,
    };
  });

  // Sort by score
  mapped.sort((a, b) => b.score - a.score);

  return mapped.slice(0, 5);
}

// ============================================
// FACEBOOK SEARCH
// ============================================

async function searchFacebookByKeyword(
  keyword: string,
  cookies: string,
  apifyToken: string,
  options: {
    searchType?: "posts" | "pages" | "people";
    resultsLimit?: number;
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
    throw new Error("รูปแบบ Cookie ไม่ถูกต้อง");
  }

  if (cookiesArray.length === 0) {
    throw new Error("ไม่พบ Cookie ที่ถูกต้อง");
  }

  const input = {
    search_type: options.searchType || "posts",
    keyword: keyword,
    filter_by_recent_posts: true,
    results_limit: options.resultsLimit || 30,
    min_wait_time_in_sec: 1,
    max_wait_time_in_sec: 5,
    cookies: cookiesArray,
    fetch_reaction_map: true,
    since: options.since || "7d",
  };

  console.log(`\n=== FACEBOOK SEARCH REQUEST ===`);
  console.log(`Keyword: ${keyword}`);
  console.log(`Cookies: ${cookiesArray.length} cookies`);

  const run = await client.actor(actorId).call(input, { waitSecs: 180 });
  console.log(`Run status: ${run.status}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`Retrieved ${items.length} items from Apify`);

  if (items.length === 0) {
    throw new Error("ไม่พบโพสต์จากคำค้นหานี้");
  }

  return processSearchResults(items as any[]);
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
    const { keyword, cookies, platform = "FACEBOOK", searchType = "posts", since = "7d", resultsLimit = 30 } = body;

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

    const viralPosts = await searchFacebookByKeyword(keyword, cookies, apifyToken, { 
      searchType, resultsLimit, since 
    });

    const dbResult = await saveToDatabase(clerkId, keyword, platform, viralPosts);

    const contents = viralPosts.map((post, index) => ({
      id: `${dbResult.queryId}_${index}`,
      externalId: `post_${index}`,
      url: post.facebookUrl,
      caption: post.caption,
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null,
      pageName: post.pageName || null,
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

    // Log final output
    console.log("\n=== FINAL OUTPUT ===");
    contents.forEach((c, i) => {
      console.log(`Post ${i+1}: Likes=${c.likesCount}, Comments=${c.commentsCount}, Shares=${c.sharesCount}, Score=${c.viralScore}`);
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
