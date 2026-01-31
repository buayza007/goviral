import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

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

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [queries, total] = await Promise.all([
      prisma.searchQuery.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { contents: true },
          },
        },
      }),
      prisma.searchQuery.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      queries: queries.map((q) => ({
        id: q.id,
        keyword: q.keyword,
        platform: q.platform,
        status: q.status,
        resultCount: q.resultCount,
        createdAt: q.createdAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get results error:", error);
    return NextResponse.json(
      { error: "Failed to get results" },
      { status: 500 }
    );
  }
}
