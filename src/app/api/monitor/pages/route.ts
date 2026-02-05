import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

// Force dynamic
export const dynamic = "force-dynamic";

// Check DATABASE_URL helper
function checkDatabaseUrl(): { ok: boolean; error?: NextResponse } {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      error: NextResponse.json({
        error: "DATABASE_URL not configured",
        message: "กรุณาตั้งค่า DATABASE_URL ใน Railway Dashboard → goviral service → Variables → เพิ่ม DATABASE_URL = ${{Postgres.DATABASE_PRIVATE_URL}}",
        help: {
          step1: "ไป Railway Dashboard",
          step2: "คลิก Postgres service → Variables → Copy DATABASE_PRIVATE_URL",
          step3: "คลิก goviral service → Variables → Add New → Name: DATABASE_URL, Value: [paste]",
          step4: "Redeploy",
          shortcut: "หรือใช้ reference: DATABASE_URL = ${{Postgres.DATABASE_PRIVATE_URL}}"
        }
      }, { status: 500 })
    };
  }
  return { ok: true };
}

// Create Prisma client (only if DATABASE_URL exists)
let prisma: PrismaClient;
try {
  prisma = new PrismaClient();
} catch (e) {
  console.error("Failed to create Prisma client:", e);
  prisma = null as unknown as PrismaClient;
}

// ============================================
// Helper: Create ALL tables if they don't exist
// ============================================
async function ensureTablesExist() {
  try {
    console.log("[DB] Starting table creation...");

    // 1. Create ENUM types first
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log("[DB] SubscriptionPlan enum exists"));

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log("[DB] Platform enum exists"));

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SearchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log("[DB] SearchStatus enum exists"));

    // 2. Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "clerkId" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "avatarUrl" TEXT,
        "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
        "searchQuota" INTEGER NOT NULL DEFAULT 10,
        "searchesUsed" INTEGER NOT NULL DEFAULT 0,
        "quotaResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log("[DB] User table created");

    // 3. Create SearchQuery table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SearchQuery" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "keyword" TEXT NOT NULL,
        "platform" "Platform" NOT NULL,
        "status" "SearchStatus" NOT NULL DEFAULT 'PENDING',
        "apifyRunId" TEXT,
        "resultCount" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log("[DB] SearchQuery table created");

    // 4. Create Content table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Content" (
        "id" TEXT NOT NULL,
        "searchQueryId" TEXT NOT NULL,
        "externalId" TEXT NOT NULL,
        "platform" "Platform" NOT NULL,
        "url" TEXT NOT NULL,
        "pageUrl" TEXT,
        "pageName" TEXT,
        "caption" TEXT,
        "imageUrl" TEXT,
        "videoUrl" TEXT,
        "postType" TEXT,
        "postedAt" TIMESTAMP(3),
        "likesCount" INTEGER NOT NULL DEFAULT 0,
        "commentsCount" INTEGER NOT NULL DEFAULT 0,
        "sharesCount" INTEGER NOT NULL DEFAULT 0,
        "viewsCount" INTEGER NOT NULL DEFAULT 0,
        "engagementScore" INTEGER NOT NULL DEFAULT 0,
        "reactionsJson" JSONB,
        "metricsJson" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log("[DB] Content table created");

    // 5. Create MonitoredPage table
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
    console.log("[DB] MonitoredPage table created");

    // 6. Create MonitoredPost table
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
    console.log("[DB] MonitoredPost table created");

    // 7. Create unique constraints
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId")
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Content_searchQueryId_externalId_key" ON "Content"("searchQueryId", "externalId")
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MonitoredPage_userId_pageUrl_key" ON "MonitoredPage"("userId", "pageUrl")
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MonitoredPost_pageId_postId_key" ON "MonitoredPost"("pageId", "postId")
    `).catch(() => {});

    // 8. Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_clerkId_idx" ON "User"("clerkId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchQuery_userId_idx" ON "SearchQuery"("userId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchQuery_status_idx" ON "SearchQuery"("status")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Content_searchQueryId_idx" ON "Content"("searchQueryId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MonitoredPage_userId_idx" ON "MonitoredPage"("userId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MonitoredPage_isActive_idx" ON "MonitoredPage"("isActive")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MonitoredPost_pageId_idx" ON "MonitoredPost"("pageId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MonitoredPost_isNew_idx" ON "MonitoredPost"("isNew")`).catch(() => {});

    console.log("[DB] All tables and indexes created successfully!");
    return { success: true, message: "All tables created successfully" };
  } catch (error) {
    console.error("[DB] Error creating tables:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
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
    // Check DATABASE_URL first
    const dbCheck = checkDatabaseUrl();
    if (!dbCheck.ok) return dbCheck.error!;

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
        await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "MonitoredPage"`);
        debugInfo.tables = { ...debugInfo.tables as object, MonitoredPage: `✅ Exists` };
      } catch (e) {
        debugInfo.tables = { ...debugInfo.tables as object, MonitoredPage: `❌ Not found` };
        debugInfo.needsMigration = true;
      }

      return NextResponse.json({ debug: debugInfo });
    }

    // IMPORTANT: Ensure ALL tables exist FIRST
    await ensureTablesExist();

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
        totalPosts: formattedPages.reduce((sum: number, p: { totalPosts: number }) => sum + p.totalPosts, 0),
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
    // Check DATABASE_URL first
    const dbCheck = checkDatabaseUrl();
    if (!dbCheck.ok) return dbCheck.error!;

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageUrl, pageName, checkInterval = 60, migrate = false } = body;

    // Handle migrate request
    if (migrate) {
      const result = await ensureTablesExist();
      return NextResponse.json(result);
    }

    if (!pageUrl?.trim()) {
      return NextResponse.json({ error: "กรุณาใส่ URL เพจ" }, { status: 400 });
    }

    if (!pageUrl.includes("facebook.com")) {
      return NextResponse.json({ error: "URL ต้องเป็น Facebook page" }, { status: 400 });
    }

    // IMPORTANT: Ensure ALL tables exist FIRST before any Prisma operations
    await ensureTablesExist();

    // Get or create user
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, email: `${clerkId}@placeholder.com` }
      });
    }

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
    // Check DATABASE_URL first
    const dbCheck = checkDatabaseUrl();
    if (!dbCheck.ok) return dbCheck.error!;

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("id");

    if (!pageId) {
      return NextResponse.json({ error: "Missing page ID" }, { status: 400 });
    }

    // Ensure tables exist first
    await ensureTablesExist();

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
    // Check DATABASE_URL first
    const dbCheck = checkDatabaseUrl();
    if (!dbCheck.ok) return dbCheck.error!;

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, isActive, checkInterval, pageName } = body;

    if (!pageId) {
      return NextResponse.json({ error: "Missing page ID" }, { status: 400 });
    }

    // Ensure tables exist first
    await ensureTablesExist();

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
