import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);
    const { queryId } = await params;

    // Verify ownership
    const searchQuery = await prisma.searchQuery.findFirst({
      where: {
        id: queryId,
        userId: user.id,
      },
    });

    if (!searchQuery) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: "ไม่พบข้อมูลการค้นหา หรือคุณไม่มีสิทธิ์เข้าถึง",
        },
        { status: 404 }
      );
    }

    // Get top 5 posts for chart
    const topContents = await prisma.content.findMany({
      where: { searchQueryId: queryId },
      orderBy: { engagementScore: "desc" },
      take: 5,
      select: {
        id: true,
        caption: true,
        pageName: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        viewsCount: true,
        engagementScore: true,
        reactionsJson: true,
      },
    });

    // Format for charts
    const chartData = topContents.map((content, index) => ({
      name: `#${index + 1}`,
      label:
        (content.caption?.substring(0, 30) || "") +
          (content.caption && content.caption.length > 30 ? "..." : "") ||
        content.pageName ||
        `Post ${index + 1}`,
      likes: content.likesCount,
      comments: content.commentsCount,
      shares: content.sharesCount,
      views: content.viewsCount,
      total: content.engagementScore,
      reactions: content.reactionsJson,
    }));

    // Calculate totals
    const totals = topContents.reduce(
      (acc, c) => ({
        likes: acc.likes + c.likesCount,
        comments: acc.comments + c.commentsCount,
        shares: acc.shares + c.sharesCount,
        views: acc.views + c.viewsCount,
        engagement: acc.engagement + c.engagementScore,
      }),
      { likes: 0, comments: 0, shares: 0, views: 0, engagement: 0 }
    );

    return NextResponse.json({
      chartData,
      totals,
      postsCount: topContents.length,
    });
  } catch (error) {
    console.error("Get chart data error:", error);
    return NextResponse.json(
      { error: "Failed to get chart data" },
      { status: 500 }
    );
  }
}
