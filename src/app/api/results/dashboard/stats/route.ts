import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);

    const [totalSearches, totalPosts, recentQueries, topContents, platformStats] =
      await Promise.all([
        // Total searches
        prisma.searchQuery.count({ where: { userId: user.id } }),

        // Total posts found
        prisma.content.count({
          where: {
            searchQuery: { userId: user.id },
          },
        }),

        // Recent queries
        prisma.searchQuery.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            keyword: true,
            platform: true,
            status: true,
            resultCount: true,
            createdAt: true,
          },
        }),

        // Top viral contents
        prisma.content.findMany({
          where: {
            searchQuery: { userId: user.id },
          },
          orderBy: { engagementScore: "desc" },
          take: 10,
          select: {
            id: true,
            url: true,
            caption: true,
            imageUrl: true,
            pageName: true,
            platform: true,
            likesCount: true,
            commentsCount: true,
            sharesCount: true,
            engagementScore: true,
            postedAt: true,
          },
        }),

        // Platform breakdown
        prisma.searchQuery.groupBy({
          by: ["platform"],
          where: { userId: user.id },
          _count: { platform: true },
        }),
      ]);

    // Calculate total engagement
    const totalEngagement = topContents.reduce(
      (sum, c) => sum + c.engagementScore,
      0
    );

    return NextResponse.json({
      totalSearches,
      totalPosts,
      totalEngagement,
      platformBreakdown: platformStats.map((p) => ({
        platform: p.platform,
        count: p._count.platform,
      })),
      recentQueries,
      topContents,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard stats" },
      { status: 500 }
    );
  }
}
