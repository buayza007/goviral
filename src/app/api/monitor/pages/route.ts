import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

// Force dynamic
export const dynamic = "force-dynamic";

// Create Prisma client
const prisma = new PrismaClient();

// ============================================
// Helper: Create tables if they don't exist
// ============================================
async function ensureTablesExist() {
  try {
    // Try to create MonitoredPage table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MonitoredPage" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "pageUrl" TEXT NOT NULL,
        "pageName" TEXT,
        "pageAvatar" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "checkInterval" INTEGER NOT NULL DEFAULT 60,
        "lastCheckedAt" TIMESTAMP(3),
        "lastPostId" TEXT,
        "totalPosts" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MonitoredPage_pkey" PRIMARY KEY ("id")
      )
    `);

    // Create MonitoredPost table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MonitoredPost" (
        "id" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "postUrl" TEXT NOT NULL,
        "caption" TEXT,
        "imageUrl" TEXT,
        "videoUrl" TEXT,
        "authorName" TEXT,
        "likesCount" INTEGER NOT NULL DEFAULT 0,
        "commentsCount" INTEGER NOT NULL DEFAULT 0,
        "sharesCount" INTEGER NOT NULL DEFAULT 0,
        "viewsCount" INTEGER NOT NULL DEFAULT 0,
        "viralScore" INTEGER NOT NULL DEFAULT 0,
        "postedAt" TIMESTAMP(3),
        "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isNew" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "MonitoredPost_pkey" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MonitoredPage_userId_idx" ON "MonitoredPage"("userId")
    `).catch(() => {});
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MonitoredPost_pageId_idx" ON "MonitoredPost"("pageId")
    `).catch(() => {});

    // Create unique constraint
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MonitoredPage_userId_pageUrl_key" ON "MonitoredPage"("userId", "pageUrl")
    `).catch(() => {});

    console.log("[Monitor] Tables created/verified");
    return true;
  } catch (error) {
    console.error("[Monitor] Error creating tables:", error);
    return false;
  }
}

// ============================================
// Helper: Generate CUID-like ID
// ============================================
function generateId(): string {
  return 'c' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// ============================================
// GET - List all monitored pages for user
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for debug param
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get("debug") === "true";

    if (debug) {
      // Return debug info
      const debugInfo: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        clerkId,
        env: {
          DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Not set",
        },
        tables: {},
      };

      try {
        const userCount = await prisma.user.count();
        debugInfo.tables = { ...debugInfo.tables as object, User: `✅ ${userCount} records` };
      } catch (e) {
        debugInfo.tables = { ...debugInfo.tables as object, User: `❌ ${e instanceof Error ? e.message : 'Error'}` };
      }

      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "MonitoredPage"`);
        debugInfo.tables = { ...debugInfo.tables as object, MonitoredPage: `✅ Exists` };
      } catch (e) {
        debugInfo.tables = { ...debugInfo.tables as object, MonitoredPage: `❌ Not found` };
        debugInfo.needsMigration = true;
      }

      return NextResponse.json({ debug: debugInfo });
    }

    // Get user
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ pages: [], totalPosts: 0, newPosts: 0, count: 0 });
    }

    // Try to fetch pages
    try {
      const pages = await prisma.$queryRawUnsafe<Array<{
        id: string;
        pageUrl: string;
        pageName: string | null;
        pageAvatar: string | null;
        isActive: boolean;
        checkInterval: number;
        lastCheckedAt: Date | null;
        totalPosts: number;
        createdAt: Date;
      }>>(`
        SELECT * FROM "MonitoredPage" WHERE "userId" = $1 ORDER BY "createdAt" DESC
      `, user.id);

      const formattedPages = pages.map(page => ({
        id: page.id,
        pageUrl: page.pageUrl,
        pageName: page.pageName,
        pageAvatar: page.pageAvatar,
        isActive: page.isActive,
        checkInterval: page.checkInterval,
        lastCheckedAt: page.lastCheckedAt,
        totalPosts: page.totalPosts || 0,
        newPosts: 0,
        createdAt: page.createdAt,
      }));

      return NextResponse.json({ 
        pages: formattedPages,
        totalPosts: formattedPages.reduce((sum, p) => sum + p.totalPosts, 0),
        newPosts: 0,
        count: formattedPages.length
      });
    } catch (dbError) {
      // Table doesn't exist, create it
      console.log("[Monitor GET] Table not found, creating...");
      await ensureTablesExist();
      return NextResponse.json({ pages: [], totalPosts: 0, newPosts: 0, count: 0 });
    }

  } catch (error) {
    console.error("Error fetching monitored pages:", error);
    return NextResponse.json({ 
      error: "Failed to fetch pages",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ============================================
// POST - Add a new page to monitor
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageUrl, pageName, checkInterval = 60, migrate = false } = body;

    // Handle migrate request
    if (migrate) {
      const success = await ensureTablesExist();
      return NextResponse.json({ 
        success, 
        message: success ? "Tables created successfully" : "Failed to create tables" 
      });
    }

    if (!pageUrl?.trim()) {
      return NextResponse.json({ error: "กรุณาใส่ URL เพจ" }, { status: 400 });
    }

    if (!pageUrl.includes("facebook.com")) {
      return NextResponse.json({ error: "URL ต้องเป็น Facebook page" }, { status: 400 });
    }

    // Get or create user
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, email: `${clerkId}@placeholder.com` }
      });
    }

    // Ensure tables exist
    await ensureTablesExist();

    // Check if already monitoring
    try {
      const existing = await prisma.$queryRawUnsafe<Array<{id: string}>>(`
        SELECT id FROM "MonitoredPage" WHERE "userId" = $1 AND "pageUrl" = $2 LIMIT 1
      `, user.id, pageUrl.trim());

      if (existing.length > 0) {
        return NextResponse.json({ error: "คุณติดตามเพจนี้อยู่แล้ว" }, { status: 400 });
      }
    } catch {
      // Table might not exist yet, continue
    }

    // Check limit
    let pageCount = 0;
    try {
      const countResult = await prisma.$queryRawUnsafe<Array<{count: bigint}>>(`
        SELECT COUNT(*) as count FROM "MonitoredPage" WHERE "userId" = $1
      `, user.id);
      pageCount = Number(countResult[0]?.count || 0);
    } catch {
      pageCount = 0;
    }

    const limit = user.subscriptionPlan === "FREE" ? 3 : 
                  user.subscriptionPlan === "STARTER" ? 10 : 100;

    if (pageCount >= limit) {
      return NextResponse.json({ 
        error: `คุณติดตามเพจได้สูงสุด ${limit} เพจ (${user.subscriptionPlan} plan)` 
      }, { status: 400 });
    }

    // Create page
    const pageId = generateId();
    const now = new Date();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "MonitoredPage" ("id", "userId", "pageUrl", "pageName", "isActive", "checkInterval", "totalPosts", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, pageId, user.id, pageUrl.trim(), pageName?.trim() || null, true, checkInterval, 0, now, now);

    return NextResponse.json({
      message: "เพิ่มเพจสำเร็จ",
      page: {
        id: pageId,
        pageUrl: pageUrl.trim(),
        pageName: pageName?.trim() || null,
        isActive: true,
        checkInterval,
        createdAt: now,
      }
    });

  } catch (error) {
    console.error("Error adding monitored page:", error);
    return NextResponse.json({ 
      error: "เพิ่มเพจไม่สำเร็จ",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Remove a monitored page
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("id");

    if (!pageId) {
      return NextResponse.json({ error: "Missing page ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete posts first, then page
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "MonitoredPost" WHERE "pageId" = $1`, pageId);
      await prisma.$executeRawUnsafe(`DELETE FROM "MonitoredPage" WHERE "id" = $1 AND "userId" = $2`, pageId, user.id);
    } catch {
      // Tables might not exist
    }

    return NextResponse.json({ message: "ลบเพจสำเร็จ" });

  } catch (error) {
    console.error("Error deleting monitored page:", error);
    return NextResponse.json({ 
      error: "Failed to delete page",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ============================================
// PATCH - Update page settings or run migration
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, isActive, checkInterval, pageName } = body;

    if (!pageId) {
      return NextResponse.json({ error: "Missing page ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      updates.push(`"isActive" = $${paramIndex++}`);
      values.push(isActive);
    }
    if (checkInterval !== undefined) {
      updates.push(`"checkInterval" = $${paramIndex++}`);
      values.push(checkInterval);
    }
    if (pageName !== undefined) {
      updates.push(`"pageName" = $${paramIndex++}`);
      values.push(pageName);
    }
    updates.push(`"updatedAt" = $${paramIndex++}`);
    values.push(new Date());

    values.push(pageId);
    values.push(user.id);

    await prisma.$executeRawUnsafe(`
      UPDATE "MonitoredPage" SET ${updates.join(", ")} WHERE "id" = $${paramIndex++} AND "userId" = $${paramIndex}
    `, ...values);

    return NextResponse.json({ message: "อัพเดทสำเร็จ" });

  } catch (error) {
    console.error("Error updating monitored page:", error);
    return NextResponse.json({ 
      error: "Failed to update page",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
