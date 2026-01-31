import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Force dynamic
export const dynamic = "force-dynamic";

// ============================================
// GET - Check database status
// ============================================
export async function GET() {
  const status: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    database: {},
    tables: {},
    env: {},
  };

  try {
    // Check env
    status.env = {
      DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Not set",
      APIFY_API_TOKEN: process.env.APIFY_API_TOKEN ? "✅ Set" : "❌ Not set",
    };

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        message: "DATABASE_URL not configured",
        status,
      });
    }

    // Try to connect to database
    const { default: prisma } = await import("@/lib/prisma");

    // Check if basic tables exist
    try {
      const userCount = await prisma.user.count();
      status.tables = {
        ...status.tables as object,
        User: `✅ Exists (${userCount} records)`,
      };
    } catch (e) {
      status.tables = {
        ...status.tables as object,
        User: `❌ Error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // Check MonitoredPage table
    try {
      const pageCount = await prisma.monitoredPage.count();
      status.tables = {
        ...status.tables as object,
        MonitoredPage: `✅ Exists (${pageCount} records)`,
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      status.tables = {
        ...status.tables as object,
        MonitoredPage: `❌ Not found - needs migration`,
      };
      status.needsMigration = true;
    }

    // Check MonitoredPost table
    try {
      const postCount = await prisma.monitoredPost.count();
      status.tables = {
        ...status.tables as object,
        MonitoredPost: `✅ Exists (${postCount} records)`,
      };
    } catch (e) {
      status.tables = {
        ...status.tables as object,
        MonitoredPost: `❌ Not found - needs migration`,
      };
      status.needsMigration = true;
    }

    status.database = { connected: true };

    return NextResponse.json({
      success: true,
      message: status.needsMigration 
        ? "Database connected but needs migration. Call POST /api/debug/db to migrate."
        : "Database OK",
      status,
    });

  } catch (error) {
    status.database = { 
      connected: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
    return NextResponse.json({
      success: false,
      message: "Database connection failed",
      status,
    }, { status: 500 });
  }
}

// ============================================
// POST - Run database migration
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    // Optional: require auth for migration (comment out for easier debugging)
    // if (!clerkId) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: "DATABASE_URL not configured",
      }, { status: 500 });
    }

    console.log("[Migration] Starting prisma db push...");

    // Run prisma db push
    try {
      const { stdout, stderr } = await execAsync("npx prisma db push --skip-generate --accept-data-loss", {
        env: { ...process.env },
        timeout: 60000, // 60 second timeout
      });

      console.log("[Migration] stdout:", stdout);
      if (stderr) console.log("[Migration] stderr:", stderr);

      return NextResponse.json({
        success: true,
        message: "Migration completed successfully!",
        output: stdout,
        stderr: stderr || null,
      });
    } catch (execError: unknown) {
      const error = execError as { stdout?: string; stderr?: string; message?: string };
      console.error("[Migration] exec error:", error);
      
      return NextResponse.json({
        success: false,
        error: "Migration failed",
        message: error.message || String(execError),
        stdout: error.stdout || null,
        stderr: error.stderr || null,
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[Migration] Error:", error);
    return NextResponse.json({
      success: false,
      error: "Migration failed",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
