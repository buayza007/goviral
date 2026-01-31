import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { ApifyClient } from "apify-client";

const prisma = new PrismaClient();
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

interface FacebookPost {
  postId: string;
  url: string;
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
    const { keyword, platform, maxPosts = 20 } = await request.json();

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

    // Prepare URLs for scraping
    let urls: string[] = [];
    if (keyword.includes("facebook.com")) {
      urls = [keyword];
    } else {
      urls = [`https://www.facebook.com/${keyword}`];
    }

    try {
      // Call Apify
      const input = {
        startUrls: urls.map((url) => ({ url })),
        maxPosts,
        maxPostComments: 0,
        maxReviewComments: 0,
        scrapeAbout: false,
        scrapePosts: true,
        scrapeServices: false,
        scrapeReviews: false,
      };

      const run = await apifyClient
        .actor(process.env.APIFY_ACTOR_ID || "apify~facebook-pages-scraper")
        .call(input, { waitSecs: 300 });

      const { items } = await apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();

      const posts = items as unknown as FacebookPost[];

      // Process and save results
      const contents = [];
      for (const post of posts) {
        if (!post.postId && !post.url) continue;

        const externalId = post.postId || post.url;
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
          apifyRunId: run.id,
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
        contents,
      });
    } catch (apifyError) {
      console.error("Apify error:", apifyError);

      await prisma.searchQuery.update({
        where: { id: searchQuery.id },
        data: {
          status: "FAILED",
          errorMessage:
            apifyError instanceof Error
              ? apifyError.message
              : "Search failed",
        },
      });

      return NextResponse.json(
        {
          error: "Search Failed",
          message:
            "ไม่สามารถค้นหาข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
          queryId: searchQuery.id,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to process search" },
      { status: 500 }
    );
  }
}
