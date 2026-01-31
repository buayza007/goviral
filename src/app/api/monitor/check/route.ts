import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApifyClient } from "apify-client";

// ============================================
// Viral Score Calculation
// ============================================
function calculateViralScore(likes: number, comments: number, shares: number): number {
  return (likes * 1) + (comments * 3) + (shares * 5);
}

// ============================================
// Extract data from Apify response
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
  if (typeof item.imageUrl === "string" && item.imageUrl) return item.imageUrl;
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) return item.imageUrls[0];
  if (Array.isArray(item.media) && item.media.length > 0) {
    const first = item.media[0] as { thumbnail?: string; url?: string };
    if (first?.thumbnail) return first.thumbnail;
    if (first?.url) return first.url;
  }
  return undefined;
}

// ============================================
// POST - Check a specific page for new posts (manual trigger)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, debug = false } = body;

    if (!pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const { default: prisma } = await import("@/lib/prisma");

    // Verify ownership
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const page = await prisma.monitoredPage.findFirst({
      where: { id: pageId, userId: user.id }
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Scrape page using Apify
    const client = new ApifyClient({ token: apifyToken });
    const actorId = "apify/facebook-posts-scraper";

    console.log(`[Monitor] Checking page: ${page.pageUrl}`);

    const input = {
      startUrls: [{ url: page.pageUrl }],
      resultsLimit: 20, // Get latest 20 posts
    };

    const run = await client.actor(actorId).call(input, { waitSecs: 120 });
    console.log(`[Monitor] Apify run status: ${run.status}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`[Monitor] Got ${items.length} posts`);

    // Debug mode - return raw data
    if (debug) {
      return NextResponse.json({
        message: "Debug data",
        pageUrl: page.pageUrl,
        itemCount: items.length,
        firstItemKeys: items[0] ? Object.keys(items[0]) : [],
        sampleItems: items.slice(0, 3),
      });
    }

    // Get existing post IDs to avoid duplicates
    const existingPosts = await prisma.monitoredPost.findMany({
      where: { pageId: page.id },
      select: { postId: true }
    });
    const existingIds = new Set(existingPosts.map(p => p.postId));

    // Process and save new posts
    let newPostsCount = 0;
    const newPosts: Array<{
      postId: string;
      postUrl: string;
      caption: string;
      likes: number;
      comments: number;
      shares: number;
      viralScore: number;
    }> = [];

    for (const item of items as Record<string, unknown>[]) {
      const postId = (item.postId || item.id || `post_${Date.now()}_${Math.random()}`) as string;
      
      // Skip if already exists
      if (existingIds.has(postId)) continue;

      const postUrl = (item.postUrl || item.url || "") as string;
      const caption = (item.text || item.postText || item.message || "") as string;
      const imageUrl = extractImageUrl(item);
      const videoUrl = typeof item.videoUrl === "string" ? item.videoUrl : undefined;
      
      const likes = extractNumber(item, "likes", "likesCount", "reactions", "reactionsCount");
      const comments = extractNumber(item, "comments", "commentsCount");
      const shares = extractNumber(item, "shares", "sharesCount");
      const views = extractNumber(item, "views", "videoViews");
      const viralScore = calculateViralScore(likes, comments, shares);

      // Get posted time
      let postedAt: Date | undefined;
      const timeVal = item.time || item.timestamp || item.publishedAt || item.date;
      if (timeVal) {
        try {
          postedAt = new Date(timeVal as string);
        } catch {
          // ignore
        }
      }

      // Get page info if available
      const pageName = (item.pageName || item.authorName || page.pageName) as string | undefined;

      try {
        await prisma.monitoredPost.create({
          data: {
            pageId: page.id,
            postId,
            postUrl,
            caption,
            imageUrl,
            videoUrl,
            authorName: pageName,
            likesCount: likes,
            commentsCount: comments,
            sharesCount: shares,
            viewsCount: views,
            viralScore,
            postedAt,
            isNew: true,
          }
        });
        newPostsCount++;
        newPosts.push({ postId, postUrl, caption: caption.slice(0, 100), likes, comments, shares, viralScore });
      } catch (err) {
        console.error(`[Monitor] Error saving post ${postId}:`, err);
      }
    }

    // Update page info
    const updateData: Record<string, unknown> = {
      lastCheckedAt: new Date(),
      totalPosts: { increment: newPostsCount },
    };

    // Update page name/avatar if found
    if (items.length > 0) {
      const firstItem = items[0] as Record<string, unknown>;
      if (firstItem.pageName && !page.pageName) {
        updateData.pageName = firstItem.pageName as string;
      }
    }

    await prisma.monitoredPage.update({
      where: { id: page.id },
      data: updateData as Parameters<typeof prisma.monitoredPage.update>[0]["data"],
    });

    console.log(`[Monitor] Found ${newPostsCount} new posts for ${page.pageUrl}`);

    return NextResponse.json({
      message: `เช็คเสร็จแล้ว พบโพสต์ใหม่ ${newPostsCount} โพสต์`,
      pageId: page.id,
      pageUrl: page.pageUrl,
      totalScraped: items.length,
      newPostsCount,
      newPosts: newPosts.slice(0, 5), // Show top 5
    });

  } catch (error) {
    console.error("[Monitor] Check error:", error);
    return NextResponse.json({ 
      error: "Failed to check page",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ============================================
// GET - Cron job to check all active pages
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: "Invalid cron secret" }, { status: 401 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const { default: prisma } = await import("@/lib/prisma");

    // Get all active pages that need checking
    const now = new Date();
    const pages = await prisma.monitoredPage.findMany({
      where: {
        isActive: true,
        OR: [
          { lastCheckedAt: null },
          // Check if enough time has passed based on checkInterval
        ]
      },
      take: 10, // Process max 10 pages per cron run to avoid timeout
      orderBy: { lastCheckedAt: "asc" } // Oldest checked first
    });

    // Filter pages that need checking based on interval
    const pagesToCheck = pages.filter(page => {
      if (!page.lastCheckedAt) return true;
      const minutesSinceCheck = (now.getTime() - page.lastCheckedAt.getTime()) / 60000;
      return minutesSinceCheck >= page.checkInterval;
    });

    console.log(`[Cron] Found ${pagesToCheck.length} pages to check`);

    const results: Array<{ pageId: string; pageUrl: string; newPosts: number; error?: string }> = [];

    for (const page of pagesToCheck) {
      try {
        const client = new ApifyClient({ token: apifyToken });
        
        const run = await client.actor("apify/facebook-posts-scraper").call({
          startUrls: [{ url: page.pageUrl }],
          resultsLimit: 10,
        }, { waitSecs: 60 });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Get existing post IDs
        const existingPosts = await prisma.monitoredPost.findMany({
          where: { pageId: page.id },
          select: { postId: true }
        });
        const existingIds = new Set(existingPosts.map(p => p.postId));

        let newPostsCount = 0;

        for (const item of items as Record<string, unknown>[]) {
          const postId = (item.postId || item.id || `post_${Date.now()}`) as string;
          if (existingIds.has(postId)) continue;

          const likes = extractNumber(item, "likes", "likesCount", "reactions");
          const comments = extractNumber(item, "comments", "commentsCount");
          const shares = extractNumber(item, "shares", "sharesCount");

          try {
            await prisma.monitoredPost.create({
              data: {
                pageId: page.id,
                postId,
                postUrl: (item.postUrl || item.url || "") as string,
                caption: (item.text || item.postText || "") as string,
                imageUrl: extractImageUrl(item),
                likesCount: likes,
                commentsCount: comments,
                sharesCount: shares,
                viralScore: calculateViralScore(likes, comments, shares),
                isNew: true,
              }
            });
            newPostsCount++;
          } catch {
            // Duplicate, skip
          }
        }

        await prisma.monitoredPage.update({
          where: { id: page.id },
          data: { 
            lastCheckedAt: new Date(),
            totalPosts: { increment: newPostsCount }
          }
        });

        results.push({ pageId: page.id, pageUrl: page.pageUrl, newPosts: newPostsCount });
      } catch (err) {
        results.push({ 
          pageId: page.id, 
          pageUrl: page.pageUrl, 
          newPosts: 0, 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    const totalNew = results.reduce((sum, r) => sum + r.newPosts, 0);

    return NextResponse.json({
      message: `Cron completed. Checked ${results.length} pages, found ${totalNew} new posts.`,
      pagesChecked: results.length,
      totalNewPosts: totalNew,
      results,
    });

  } catch (error) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({ 
      error: "Cron job failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
