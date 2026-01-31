import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

// Helper to run migration if needed
async function ensureTablesExist() {
  try {
    await execAsync("npx prisma db push --skip-generate --accept-data-loss", {
      env: { ...process.env },
      timeout: 30000,
    });
    console.log("[Monitor] Database migration completed");
    return true;
  } catch (error) {
    console.error("[Monitor] Migration failed:", error);
    return false;
  }
}

// ============================================
// GET - List all monitored pages for user
// ============================================
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { default: prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ pages: [], totalPosts: 0, newPosts: 0, count: 0 });
    }

    // Try to fetch pages
    let pages;
    try {
      pages = await prisma.monitoredPage.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: { posts: true }
          },
          posts: {
            where: { isNew: true },
            select: { id: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      
      // If table doesn't exist, try to migrate
      if (errorMessage.includes("P2021") || errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
        console.log("[Monitor] Table not found, attempting migration...");
        const migrated = await ensureTablesExist();
        
        if (migrated) {
          // Retry after migration
          try {
            pages = await prisma.monitoredPage.findMany({
              where: { userId: user.id },
              include: {
                _count: { select: { posts: true } },
                posts: { where: { isNew: true }, select: { id: true } }
              },
              orderBy: { createdAt: "desc" }
            });
          } catch {
            // Still failed, return empty
            return NextResponse.json({ pages: [], totalPosts: 0, newPosts: 0, count: 0 });
          }
        } else {
          return NextResponse.json({ 
            pages: [], 
            totalPosts: 0, 
            newPosts: 0, 
            count: 0,
            warning: "Migration failed. Please check database connection."
          });
        }
      } else {
        throw dbError;
      }
    }

    const formattedPages = (pages || []).map(page => ({
      id: page.id,
      pageUrl: page.pageUrl,
      pageName: page.pageName,
      pageAvatar: page.pageAvatar,
      isActive: page.isActive,
      checkInterval: page.checkInterval,
      lastCheckedAt: page.lastCheckedAt,
      totalPosts: page._count.posts,
      newPosts: page.posts.length,
      createdAt: page.createdAt,
    }));

    const totalPosts = formattedPages.reduce((sum, p) => sum + p.totalPosts, 0);
    const newPosts = formattedPages.reduce((sum, p) => sum + p.newPosts, 0);

    return NextResponse.json({ 
      pages: formattedPages,
      totalPosts,
      newPosts,
      count: formattedPages.length
    });

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
    const { pageUrl, pageName, checkInterval = 60 } = body;

    if (!pageUrl?.trim()) {
      return NextResponse.json({ error: "กรุณาใส่ URL เพจ" }, { status: 400 });
    }

    // Validate URL format
    if (!pageUrl.includes("facebook.com")) {
      return NextResponse.json({ error: "URL ต้องเป็น Facebook page" }, { status: 400 });
    }

    const { default: prisma } = await import("@/lib/prisma");

    // Get or create user
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, email: `${clerkId}@placeholder.com` }
      });
    }

    // Try to check if already monitoring, auto-migrate if table missing
    let existing = null;
    let pageCount = 0;
    
    try {
      existing = await prisma.monitoredPage.findFirst({
        where: { userId: user.id, pageUrl }
      });
      pageCount = await prisma.monitoredPage.count({
        where: { userId: user.id }
      });
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes("P2021") || errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
        console.log("[Monitor POST] Table not found, attempting migration...");
        await ensureTablesExist();
        // Tables created, pageCount = 0, existing = null
      } else {
        throw dbError;
      }
    }

    if (existing) {
      return NextResponse.json({ error: "คุณติดตามเพจนี้อยู่แล้ว" }, { status: 400 });
    }

    // Check limit (Free plan: 3 pages, Pro: unlimited)
    const limit = user.subscriptionPlan === "FREE" ? 3 : 
                  user.subscriptionPlan === "STARTER" ? 10 : 100;

    if (pageCount >= limit) {
      return NextResponse.json({ 
        error: `คุณติดตามเพจได้สูงสุด ${limit} เพจ (${user.subscriptionPlan} plan)` 
      }, { status: 400 });
    }

    // Create monitored page
    const page = await prisma.monitoredPage.create({
      data: {
        userId: user.id,
        pageUrl: pageUrl.trim(),
        pageName: pageName?.trim() || null,
        checkInterval,
        isActive: true,
      }
    });

    return NextResponse.json({
      message: "เพิ่มเพจสำเร็จ",
      page: {
        id: page.id,
        pageUrl: page.pageUrl,
        pageName: page.pageName,
        isActive: page.isActive,
        checkInterval: page.checkInterval,
        createdAt: page.createdAt,
      }
    });

  } catch (error) {
    console.error("Error adding monitored page:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({ 
      error: "เพิ่มเพจไม่สำเร็จ",
      message: errorMessage,
      debug: { stack: error instanceof Error ? error.stack : null }
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

    const { default: prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check ownership
    const page = await prisma.monitoredPage.findFirst({
      where: { id: pageId, userId: user.id }
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Delete page and all its posts (cascade)
    await prisma.monitoredPage.delete({ where: { id: pageId } });

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
// PATCH - Update page settings
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

    const { default: prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check ownership
    const page = await prisma.monitoredPage.findFirst({
      where: { id: pageId, userId: user.id }
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Update
    const updated = await prisma.monitoredPage.update({
      where: { id: pageId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(checkInterval !== undefined && { checkInterval }),
        ...(pageName !== undefined && { pageName }),
      }
    });

    return NextResponse.json({ 
      message: "อัพเดทสำเร็จ",
      page: updated 
    });

  } catch (error) {
    console.error("Error updating monitored page:", error);
    return NextResponse.json({ 
      error: "Failed to update page",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
