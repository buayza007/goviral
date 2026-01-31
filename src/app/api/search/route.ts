import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { ApifyClient } from "apify-client";

const prisma = new PrismaClient();

// Mock data for demo purposes
const generateMockData = (keyword: string) => {
  const mockPosts = [
    {
      postId: `mock_${Date.now()}_1`,
      url: "https://facebook.com/post/1",
      text: `🔥 ${keyword} - เคล็ดลับที่คุณต้องรู้! วิธีที่ได้ผลจริงๆ ลองแล้วเห็นผลภายใน 2 สัปดาห์ อ่านต่อในคอมเม้นท์ได้เลยครับ #${keyword.replace(/\s/g, "")}`,
      likes: Math.floor(Math.random() * 50000) + 10000,
      comments: Math.floor(Math.random() * 5000) + 1000,
      shares: Math.floor(Math.random() * 3000) + 500,
      videoViews: Math.floor(Math.random() * 100000),
      imageUrl: "https://picsum.photos/800/600?random=1",
      pageName: "Health & Wellness Thailand",
      pageUrl: "https://facebook.com/healthth",
      postType: "photo",
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      reactions: { like: 15000, love: 8000, haha: 2000, wow: 1500, sad: 100, angry: 50 },
    },
    {
      postId: `mock_${Date.now()}_2`,
      url: "https://facebook.com/post/2",
      text: `💪 ${keyword} แบบธรรมชาติ! ไม่ต้องพึ่งยา ไม่ต้องอดอาหาร แค่ทำตามนี้ทุกวัน รับรองเห็นผล! แชร์ให้เพื่อนที่กำลังหาวิธีด้วยนะครับ`,
      likes: Math.floor(Math.random() * 40000) + 8000,
      comments: Math.floor(Math.random() * 4000) + 800,
      shares: Math.floor(Math.random() * 2500) + 400,
      videoViews: 0,
      imageUrl: "https://picsum.photos/800/600?random=2",
      pageName: "Fitness Expert TH",
      pageUrl: "https://facebook.com/fitnessth",
      postType: "photo",
      timestamp: Math.floor(Date.now() / 1000) - 172800,
      reactions: { like: 12000, love: 6000, haha: 1500, wow: 1000, sad: 50, angry: 30 },
    },
    {
      postId: `mock_${Date.now()}_3`,
      url: "https://facebook.com/post/3",
      text: `✨ รีวิวจริงจากคนใช้จริง! ${keyword} ได้ผลจริงไหม? มาดูประสบการณ์ตรงกันเลย! ใครลองแล้วมาแชร์ในคอมเม้นท์ได้เลยนะคะ 💕`,
      likes: Math.floor(Math.random() * 35000) + 7000,
      comments: Math.floor(Math.random() * 3500) + 700,
      shares: Math.floor(Math.random() * 2000) + 300,
      videoViews: Math.floor(Math.random() * 80000),
      imageUrl: "https://picsum.photos/800/600?random=3",
      pageName: "Beauty Review Thailand",
      pageUrl: "https://facebook.com/beautyreviewth",
      postType: "video",
      timestamp: Math.floor(Date.now() / 1000) - 259200,
      reactions: { like: 10000, love: 5000, haha: 1000, wow: 800, sad: 30, angry: 20 },
    },
    {
      postId: `mock_${Date.now()}_4`,
      url: "https://facebook.com/post/4",
      text: `📢 ข่าวดี! วิธี${keyword}ที่หมอแนะนำ ปลอดภัย ได้ผลจริง ไม่โยโย่ อ่านบทความเต็มๆ ที่ลิงก์ในคอมเม้นท์แรกเลยครับ 👇`,
      likes: Math.floor(Math.random() * 30000) + 6000,
      comments: Math.floor(Math.random() * 3000) + 600,
      shares: Math.floor(Math.random() * 1800) + 250,
      videoViews: 0,
      imageUrl: "https://picsum.photos/800/600?random=4",
      pageName: "Doctor Health Tips",
      pageUrl: "https://facebook.com/doctorhealthtips",
      postType: "link",
      timestamp: Math.floor(Date.now() / 1000) - 345600,
      reactions: { like: 8000, love: 4000, haha: 800, wow: 600, sad: 20, angry: 15 },
    },
    {
      postId: `mock_${Date.now()}_5`,
      url: "https://facebook.com/post/5",
      text: `🎯 ${keyword} สำหรับมือใหม่ เริ่มต้นยังไงดี? มาดูคำแนะนำจากผู้เชี่ยวชาญกันเลย! กดติดตามเพจเพื่อไม่พลาดเคล็ดลับดีๆ แบบนี้นะคะ`,
      likes: Math.floor(Math.random() * 25000) + 5000,
      comments: Math.floor(Math.random() * 2500) + 500,
      shares: Math.floor(Math.random() * 1500) + 200,
      videoViews: Math.floor(Math.random() * 60000),
      imageUrl: "https://picsum.photos/800/600?random=5",
      pageName: "Lifestyle Guide TH",
      pageUrl: "https://facebook.com/lifestyleth",
      postType: "video",
      timestamp: Math.floor(Date.now() / 1000) - 432000,
      reactions: { like: 7000, love: 3500, haha: 700, wow: 500, sad: 15, angry: 10 },
    },
  ];

  // Sort by engagement
  return mockPosts.sort((a, b) => {
    const engA = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
    const engB = (b.likes || 0) + (b.comments || 0) + (b.shares || 0);
    return engB - engA;
  });
};

interface FacebookPost {
  postId?: string;
  url?: string;
  text?: string;
  time?: string;
  timestamp?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  videoViews?: number;
  imageUrl?: string;
  videoUrl?: string;
  postType?: string;
  pageName?: string;
  pageUrl?: string;
  reactions?: {
    like?: number;
    love?: number;
    haha?: number;
    wow?: number;
    sad?: number;
    angry?: number;
  };
}

async function getOrCreateUser(clerkId: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId,
        email: `${clerkId}@placeholder.com`,
      },
    });
  }

  return user;
}

async function checkUserQuota(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      searchQuota: true,
      searchesUsed: true,
      quotaResetDate: true,
    },
  });

  if (!user) return false;

  const now = new Date();
  const resetDate = new Date(user.quotaResetDate);

  if (
    now.getMonth() !== resetDate.getMonth() ||
    now.getFullYear() !== resetDate.getFullYear()
  ) {
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

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);
    const { keyword, platform, maxPosts = 20, demoMode = false } = await request.json();

    if (!keyword || !platform) {
      return NextResponse.json(
        { error: "Keyword and platform are required" },
        { status: 400 }
      );
    }

    // Check quota
    const hasQuota = await checkUserQuota(user.id);
    if (!hasQuota) {
      return NextResponse.json(
        {
          error: "Quota Exceeded",
          message:
            "คุณใช้โควต้าการค้นหาหมดแล้วในเดือนนี้ กรุณาอัพเกรดแพ็คเกจเพื่อค้นหาเพิ่มเติม",
        },
        { status: 429 }
      );
    }

    // Create search query
    const searchQuery = await prisma.searchQuery.create({
      data: {
        userId: user.id,
        keyword,
        platform,
        status: "PROCESSING",
      },
    });

    let posts: FacebookPost[] = [];
    let apifyRunId = "demo_mode";

    // Try Apify first, fallback to demo mode
    const useDemo = demoMode || !process.env.APIFY_API_TOKEN;
    
    if (!useDemo) {
      try {
        const apifyClient = new ApifyClient({
          token: process.env.APIFY_API_TOKEN,
        });

        // Prepare URLs for scraping
        let urls: string[] = [];
        if (keyword.includes("facebook.com")) {
          urls = [keyword];
        } else {
          // Try to search as a page name
          urls = [`https://www.facebook.com/${keyword.replace(/\s+/g, "")}`];
        }

        const input = {
          startUrls: urls.map((url) => ({ url })),
          maxPosts: Math.min(maxPosts, 50),
          maxPostComments: 0,
          maxReviewComments: 0,
          scrapeAbout: false,
          scrapePosts: true,
          scrapeServices: false,
          scrapeReviews: false,
        };

        const run = await apifyClient
          .actor(process.env.APIFY_ACTOR_ID || "apify~facebook-pages-scraper")
          .call(input, { waitSecs: 120 });

        const { items } = await apifyClient
          .dataset(run.defaultDatasetId)
          .listItems();

        posts = items as unknown as FacebookPost[];
        apifyRunId = run.id;
      } catch (apifyError) {
        console.error("Apify error, falling back to demo mode:", apifyError);
        // Fall back to demo mode
        posts = generateMockData(keyword);
        apifyRunId = "demo_fallback";
      }
    } else {
      // Use demo/mock data
      posts = generateMockData(keyword);
    }

    // If no posts found, use mock data
    if (posts.length === 0) {
      posts = generateMockData(keyword);
      apifyRunId = "demo_no_results";
    }

    // Process and save results
    const contents = [];
    for (const post of posts) {
      const externalId = post.postId || post.url || `gen_${Date.now()}_${Math.random()}`;
      const likesCount = post.likes || 0;
      const commentsCount = post.comments || 0;
      const sharesCount = post.shares || 0;
      const viewsCount = post.videoViews || 0;
      const engagementScore = likesCount + commentsCount + sharesCount;

      try {
        const content = await prisma.content.upsert({
          where: {
            searchQueryId_externalId: {
              searchQueryId: searchQuery.id,
              externalId,
            },
          },
          update: {
            likesCount,
            commentsCount,
            sharesCount,
            viewsCount,
            engagementScore,
            metricsJson: post as any,
            reactionsJson: post.reactions ? (post.reactions as any) : undefined,
          },
          create: {
            searchQueryId: searchQuery.id,
            externalId,
            platform,
            url: post.url || "",
            pageUrl: post.pageUrl || null,
            pageName: post.pageName || null,
            caption: post.text || null,
            imageUrl: post.imageUrl || null,
            videoUrl: post.videoUrl || null,
            postType: post.postType || null,
            postedAt: post.timestamp
              ? new Date(post.timestamp * 1000)
              : null,
            likesCount,
            commentsCount,
            sharesCount,
            viewsCount,
            engagementScore,
            metricsJson: post as any,
            reactionsJson: post.reactions ? (post.reactions as any) : undefined,
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
          platform: content.platform,
        });
      } catch (err) {
        console.error("Error saving content:", err);
      }
    }

    // Sort by engagement
    contents.sort((a, b) => b.engagementScore - a.engagementScore);

    // Update search query
    await prisma.searchQuery.update({
      where: { id: searchQuery.id },
      data: {
        status: "COMPLETED",
        apifyRunId,
        resultCount: contents.length,
      },
    });

    // Increment user's search count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        searchesUsed: { increment: 1 },
      },
    });

    return NextResponse.json({
      message: "Search completed",
      queryId: searchQuery.id,
      status: "COMPLETED",
      resultCount: contents.length,
      contents: contents.slice(0, maxPosts),
      isDemo: apifyRunId.includes("demo"),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to process search", details: String(error) },
      { status: 500 }
    );
  }
}
