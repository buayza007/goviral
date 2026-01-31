import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

// ============================================
// GET - Get all monitored posts for user
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");
    const onlyNew = searchParams.get("new") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { default: prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ posts: [], totalCount: 0 });
    }

    // Get user's monitored pages
    const userPages = await prisma.monitoredPage.findMany({
      where: { userId: user.id },
      select: { id: true }
    });
    const pageIds = userPages.map(p => p.id);

    if (pageIds.length === 0) {
      return NextResponse.json({ posts: [], totalCount: 0 });
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      pageId: pageId ? pageId : { in: pageIds }
    };
    if (onlyNew) {
      whereClause.isNew = true;
    }

    // Get posts
    const [posts, totalCount] = await Promise.all([
      prisma.monitoredPost.findMany({
        where: whereClause,
        include: {
          page: {
            select: {
              pageUrl: true,
              pageName: true,
              pageAvatar: true,
            }
          }
        },
        orderBy: [
          { isNew: "desc" },
          { discoveredAt: "desc" }
        ],
        take: limit,
        skip: offset,
      }),
      prisma.monitoredPost.count({ where: whereClause })
    ]);

    const formattedPosts = posts.map(post => ({
      id: post.id,
      postId: post.postId,
      postUrl: post.postUrl,
      caption: post.caption,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      authorName: post.authorName,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      viewsCount: post.viewsCount,
      viralScore: post.viralScore,
      postedAt: post.postedAt,
      discoveredAt: post.discoveredAt,
      isNew: post.isNew,
      page: {
        id: post.pageId,
        url: post.page.pageUrl,
        name: post.page.pageName,
        avatar: post.page.pageAvatar,
      }
    }));

    // Count new posts
    const newCount = posts.filter(p => p.isNew).length;

    return NextResponse.json({
      posts: formattedPosts,
      totalCount,
      newCount,
      hasMore: offset + posts.length < totalCount
    });

  } catch (error) {
    console.error("Error fetching monitored posts:", error);
    return NextResponse.json({ 
      error: "Failed to fetch posts",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ============================================
// PATCH - Mark posts as read
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postIds, markAllAsRead = false, pageId } = body;

    const { default: prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's page IDs for verification
    const userPages = await prisma.monitoredPage.findMany({
      where: { userId: user.id },
      select: { id: true }
    });
    const userPageIds = userPages.map(p => p.id);

    if (markAllAsRead) {
      // Mark all posts as read for this user (or specific page)
      const whereClause: Record<string, unknown> = {
        pageId: pageId ? pageId : { in: userPageIds },
        isNew: true,
      };

      const result = await prisma.monitoredPost.updateMany({
        where: whereClause,
        data: { isNew: false }
      });

      return NextResponse.json({ 
        message: `อ่านแล้ว ${result.count} โพสต์`,
        updatedCount: result.count 
      });
    }

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: "Missing postIds" }, { status: 400 });
    }

    // Mark specific posts as read (verify ownership)
    const result = await prisma.monitoredPost.updateMany({
      where: {
        id: { in: postIds },
        pageId: { in: userPageIds },
        isNew: true,
      },
      data: { isNew: false }
    });

    return NextResponse.json({ 
      message: `อ่านแล้ว ${result.count} โพสต์`,
      updatedCount: result.count 
    });

  } catch (error) {
    console.error("Error marking posts as read:", error);
    return NextResponse.json({ 
      error: "Failed to update posts",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
