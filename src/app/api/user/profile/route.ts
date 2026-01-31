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
    // Create a placeholder user - will be updated on first proper sync
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

    const userWithStats = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        subscriptionPlan: true,
        searchQuota: true,
        searchesUsed: true,
        quotaResetDate: true,
        createdAt: true,
        _count: {
          select: {
            searchQueries: true,
          },
        },
      },
    });

    if (!userWithStats) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...userWithStats,
      totalSearches: userWithStats._count.searchQueries,
      quotaRemaining: Math.max(
        0,
        userWithStats.searchQuota - userWithStats.searchesUsed
      ),
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    const existingUser = await getOrCreateUser(clerkId);

    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: name || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        subscriptionPlan: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
