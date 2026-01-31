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
  postText?: string;
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
  name?: string;
  title?: string;
  posts?: ApifyFacebookPost[];
  [key: string]: unknown;
}

// ============================================
// VIRAL SCORING ALGORITHM
// ============================================

function calculateViralScore(likes: number, comments: number, shares: number): number {
  return (likes * 1) + (comments * 3) + (shares * 5);
}

function extractPostsFromPageData(pageData: ApifyFacebookPost[]): ApifyFacebookPost[] {
  const allPosts: ApifyFacebookPost[] = [];
  
  for (const item of pageData) {
    // If item has posts array (from page scraper)
    if (item.posts && Array.isArray(item.posts)) {
      allPosts.push(...item.posts);
    }
    // If item itself is a post
    else if (item.url || item.postUrl || item.text || item.message || item.likes || item.reactions) {
      allPosts.push(item);
    }
  }
  
  return allPosts;
}

function processApifyResults(items: ApifyFacebookPost[], pageName?: string): ViralPost[] {
  console.log("Processing Apify results:", JSON.stringify(items, null, 2).substring(0, 2000));
  
  // Extract posts from page data
  const posts = extractPostsFromPageData(items);
  console.log(`Extracted ${posts.length} posts from page data`);

  // Map - Transform raw data to clean object
  const mapped: ViralPost[] = posts.map(item => {
    const likes = Number(item.likes || item.likesCount || item.reactions || item.reactionsCount || 0);
    const comments = Number(item.comments || item.commentsCount || 0);
    const shares = Number(item.shares || item.sharesCount || 0);
    
    // Get image URL
    let imageUrl = item.imageUrl || item.image;
    if (!imageUrl && item.media && Array.isArray(item.media) && item.media[0]?.image) {
      imageUrl = item.media[0].image;
    }

    const postUrl = item.url || item.postUrl || item.link || "";
    const caption = item.text || item.message || item.caption || item.content || item.postText || "";

    return {
      facebookUrl: postUrl,
      caption,
      imageUrl,
      pageName: item.pageName || item.authorName || item.name || item.title || pageName,
      metrics: { likes, comments, shares },
      score: calculateViralScore(likes, comments, shares),
    };
  });

  // Filter out posts with no engagement
  const filtered = mapped.filter(post => post.score > 0 || post.caption);

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  // Return Top 5
  return filtered.slice(0, 5);
}

// ============================================
// APIFY FACEBOOK PAGE SCRAPER
// ============================================

async function scrapeFacebookPage(
  pageUrl: string,
  apifyToken: string
): Promise<ViralPost[]> {
  const client = new ApifyClient({ token: apifyToken });
  const actorId = "apify/facebook-pages-scraper";

  // Extract page name from URL for display
  const pageNameMatch = pageUrl.match(/facebook\.com\/([^/?]+)/);
  const pageName = pageNameMatch ? pageNameMatch[1] : "Facebook Page";

  const input = {
    startUrls: [{ url: pageUrl }],
    maxPosts: 50,
    maxPostComments: 0,
    maxReviewComments: 0,
    scrapeAbout: false,
    scrapePosts: true,
    scrapeServices: false,
    scrapeReviews: false,
  };

  console.log(`=== APIFY REQUEST ===`);
  console.log(`Page URL: ${pageUrl}`);
  console.log(`Actor: ${actorId}`);
  console.log(`Input:`, JSON.stringify(input, null, 2));

  const run = await client.actor(actorId).call(input, {
    waitSecs: 120,
  });

  console.log(`=== APIFY RESPONSE ===`);
  console.log(`Run ID: ${run.id}`);
  console.log(`Status: ${run.status}`);
  console.log(`Dataset ID: ${run.defaultDatasetId}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`Retrieved ${items.length} items from dataset`);
  console.log(`Raw items:`, JSON.stringify(items, null, 2).substring(0, 3000));

  if (items.length === 0) {
    throw new Error("ไม่พบข้อมูลจาก Facebook Page นี้ - อาจเป็น Page ที่ไม่เปิดสาธารณะ");
  }

  const viralPosts = processApifyResults(items as ApifyFacebookPost[], pageName);
  
  if (viralPosts.length === 0) {
    throw new Error("ไม่พบโพสต์ที่มี engagement - ลองใช้ Page อื่น");
  }

  return viralPosts;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatFacebookUrl(input: string): string {
  const trimmed = input.trim();
  
  // If already a full URL
  if (trimmed.startsWith("http")) {
    return trimmed;
  }
  
  // If just a page name/username
  return `https://www.facebook.com/${trimmed}`;
}

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
          engagementScore: post.score,
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
    const { keyword, platform = "FACEBOOK" } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "กรุณาใส่ชื่อ Facebook Page หรือ URL" },
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
    console.log(`User: ${clerkId}`);

    // Format URL
    const pageUrl = formatFacebookUrl(keyword);
    console.log(`Formatted URL: ${pageUrl}`);

    // Scrape Facebook Page
    const viralPosts = await scrapeFacebookPage(pageUrl, apifyToken);
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
      isDemo: false,
      scoringFormula: "(likes × 1) + (comments × 3) + (shares × 5)",
    });

  } catch (error) {
    console.error("Search error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "การค้นหาล้มเหลว", 
        message: errorMessage,
        hint: "ตรวจสอบว่า Facebook Page เปิดสาธารณะและชื่อถูกต้อง"
      },
      { status: 500 }
    );
  }
}
