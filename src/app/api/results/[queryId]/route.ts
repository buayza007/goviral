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

    const searchQuery = await prisma.searchQuery.findFirst({
      where: {
        id: queryId,
        userId: user.id,
      },
      include: {
        contents: {
          orderBy: { engagementScore: "desc" },
        },
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

    return NextResponse.json({
      queryId: searchQuery.id,
      status: searchQuery.status,
      resultCount: searchQuery.resultCount,
      contents: searchQuery.contents.map((content) => ({
        id: content.id,
        externalId: content.externalId,
        url: content.url,
        caption: content.caption,
        imageUrl: content.imageUrl,
        videoUrl: content.videoUrl,
        pageName: content.pageName,
        pageUrl: content.pageUrl,
        postType: content.postType,
        postedAt: content.postedAt,
        platform: content.platform,
        likesCount: content.likesCount,
        commentsCount: content.commentsCount,
        sharesCount: content.sharesCount,
        viewsCount: content.viewsCount,
        engagementScore: content.engagementScore,
        reactionsJson: content.reactionsJson,
      })),
    });
  } catch (error) {
    console.error("Get result error:", error);
    return NextResponse.json(
      { error: "Failed to get result" },
      { status: 500 }
    );
  }
}
