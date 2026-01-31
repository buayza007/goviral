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
  // Facebook Pages Scraper specific fields
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
    else if (item.url || item.postUrl || item.text || item.message) {
      allPosts.push(item);
    }
  }
  
  return allPosts;
}

function processApifyResults(items: ApifyFacebookPost[], pageName?: string): ViralPost[] {
  // Extract posts from page data
  const posts = extractPostsFromPageData(items);
  
  // Filter - Remove items with no engagement data
  const filtered = posts.filter(item => {
    const hasEngagement = (item.likes || item.likesCount || item.reactions || 0) > 0 ||
                         (item.comments || item.commentsCount || 0) > 0 ||
                         (item.shares || item.sharesCount || 0) > 0;
    return hasEngagement;
  });

  // Map - Transform raw data to clean object
  const mapped: ViralPost[] = filtered.map(item => {
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
      pageName: item.pageName || item.authorName || item.name || pageName,
      metrics: { likes, comments, shares },
      score: calculateViralScore(likes, comments, shares),
    };
  });

  // Sort by score descending
  mapped.sort((a, b) => b.score - a.score);

  // Return Top 5
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
      pageName: "Health & Wellness TH",
      metrics: { likes: 45000, comments: 8500, shares: 12000 },
      score: calculateViralScore(45000, 8500, 12000),
    },
    {
      facebookUrl: "https://facebook.com/post/viral2",
      caption: `💪 ${keyword} แบบธรรมชาติ! ไม่ต้องพึ่งยา ไม่ต้องอดอาหาร แค่ทำตามนี้ทุกวัน รับรองเห็นผล! ใครลองแล้วมาบอกกันในคอมเมนต์ด้วยนะ`,
      imageUrl: "https://picsum.photos/seed/viral2/800/600",
      pageName: "Fitness Expert",
      metrics: { likes: 38000, comments: 6200, shares: 9500 },
      score: calculateViralScore(38000, 6200, 9500),
    },
    {
      facebookUrl: "https://facebook.com/post/viral3",
      caption: `✨ รีวิวจริงจากคนใช้จริง! ${keyword} ได้ผลจริงไหม? มาดูประสบการณ์ตรงกันเลย! กดแชร์ไว้ไปอ่านทีหลังได้นะคะ 💕`,
      imageUrl: "https://picsum.photos/seed/viral3/800/600",
      pageName: "Review Thailand",
      metrics: { likes: 32000, comments: 5800, shares: 7200 },
      score: calculateViralScore(32000, 5800, 7200),
    },
    {
      facebookUrl: "https://facebook.com/post/viral4",
      caption: `📢 ข่าวดี! วิธี${keyword}ที่หมอแนะนำ ปลอดภัย ได้ผลจริง ไม่โยโย่ คนดูแล้วกว่า 2 ล้านคน! อ่านรายละเอียดเต็มๆ ในคอมเม้นท์แรกเลย 👇`,
      imageUrl: "https://picsum.photos/seed/viral4/800/600",
      pageName: "Doctor Health Tips",
      metrics: { likes: 28000, comments: 4500, shares: 5800 },
      score: calculateViralScore(28000, 4500, 5800),
    },
    {
      facebookUrl: "https://facebook.com/post/viral5",
      caption: `🎯 ${keyword} สำหรับมือใหม่ เริ่มต้นยังไงดี? มาดูคำแนะนำจากผู้เชี่ยวชาญกันเลย! กดติดตามเพจเพื่อไม่พลาดเคล็ดลับดีๆ แบบนี้`,
      imageUrl: "https://picsum.photos/seed/viral5/800/600",
      pageName: "Lifestyle Guide",
      metrics: { likes: 22000, comments: 3800, shares: 4500 },
      score: calculateViralScore(22000, 3800, 4500),
    },
  ];

  return mockPosts.sort((a, b) => b.score - a.score);
}

// ============================================
// APIFY FACEBOOK PAGE SCRAPER
// ============================================

async function scrapeFacebookPage(
  pageUrl: string,
  apifyToken: string
): Promise<ViralPost[]> {
  const client = new ApifyClient({ token: apifyToken });
  const actorId = process.env.APIFY_ACTOR_ID || "apify/facebook-pages-scraper";

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

  console.log(`Scraping Facebook page: ${pageUrl}`);
  console.log(`Using actor: ${actorId}`);

  try {
    const run = await client.actor(actorId).call(input, {
      waitSecs: 120,
    });

    console.log(`Apify run status: ${run.status}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`Retrieved ${items.length} items from Apify`);

    if (items.length === 0) {
      return [];
    }

    return processApifyResults(items as ApifyFacebookPost[], pageName);
  } catch (error) {
    console.error("Apify scrape error:", error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isValidFacebookUrl(input: string): boolean {
  return input.includes("facebook.com/") || input.includes("fb.com/");
}

function formatFacebookUrl(input: string): string {
  // If already a full URL
  if (input.startsWith("http")) {
    return input;
  }
  // If just a page name/username
  return `https://www.facebook.com/${input.trim()}`;
}

function toPlatformEnum(platform: string): Platform {
  const upperPlatform = platform.toUpperCase();
  if (upperPlatform === "FACEBOOK") return Platform.FACEBOOK;
  if (upperPlatform === "INSTAGRAM") return Platform.INSTAGRAM;
  if (upperPlatform === "TIKTOK") return Platform.TIKTOK;
  return Platform.FACEBOOK;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function tryDatabaseOperations(
  clerkId: string,
  keyword: string,
  platformStr: string,
  viralPosts: ViralPost[],
  isDemo: boolean
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
        apifyRunId: isDemo ? "demo_mode" : `apify_${Date.now()}`,
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
    console.error("Database error (non-critical):", dbError);
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
    let searchType = "demo";

    const apifyToken = process.env.APIFY_API_TOKEN;
    const useRealApi = !demoMode && apifyToken;

    if (useRealApi) {
      // Check if input is a Facebook URL or page name
      const isFacebookInput = isValidFacebookUrl(keyword) || !keyword.includes(" ");
      
      if (isFacebookInput) {
        try {
          const pageUrl = formatFacebookUrl(keyword);
          console.log(`Scraping Facebook page: ${pageUrl}`);
          
          viralPosts = await scrapeFacebookPage(pageUrl, apifyToken);
          searchType = "facebook_page";
          isDemo = false;

          if (viralPosts.length === 0) {
            console.log("No posts found, using demo data");
            viralPosts = generateMockData(keyword);
            isDemo = true;
            searchType = "demo_fallback";
          }
        } catch (apifyError) {
          console.error("Apify error:", apifyError);
          viralPosts = generateMockData(keyword);
          isDemo = true;
          searchType = "demo_error";
        }
      } else {
        // Keyword search not supported - use demo
        console.log("Keyword search not supported, using demo data");
        viralPosts = generateMockData(keyword);
        isDemo = true;
        searchType = "demo_keyword_not_supported";
      }
    } else {
      viralPosts = generateMockData(keyword);
    }

    // Save to database
    const dbResult = await tryDatabaseOperations(
      clerkId,
      keyword,
      platform,
      viralPosts,
      isDemo
    );

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
      isDemo,
      searchType,
      scoringFormula: "(likes × 1) + (comments × 3) + (shares × 5)",
      hint: isDemo 
        ? "💡 ใส่ URL หรือชื่อ Facebook Page เพื่อดึงข้อมูลจริง เช่น 'https://facebook.com/PageName' หรือ 'PageName'"
        : undefined,
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
