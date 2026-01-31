import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { clerkId, email, name, avatarUrl } = await request.json();

    if (!clerkId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        name: name || undefined,
        avatarUrl: avatarUrl || undefined,
      },
      create: {
        clerkId,
        email,
        name: name || null,
        avatarUrl: avatarUrl || null,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
