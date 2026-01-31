import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApifyClient } from "apify-client";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

// Debug endpoint to see raw Apify data from facebook-posts-scraper

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageUrls } = body;

    // Parse page URLs
    let urls: string[] = [];
    if (Array.isArray(pageUrls)) {
      urls = pageUrls.filter((u: string) => u.trim());
    } else if (typeof pageUrls === "string") {
      urls = pageUrls
        .split(/[\n,]/)
        .map((u: string) => u.trim())
        .filter((u: string) => u && u.includes("facebook.com"));
    }

    if (urls.length === 0) {
      return NextResponse.json({ error: "กรุณาใส่ URL เพจ Facebook" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const client = new ApifyClient({ token: apifyToken });
    const actorId = "apify/facebook-posts-scraper";

    const input = {
      startUrls: urls.map(url => ({ url })),
      resultsLimit: 10, // Limit for debug
    };

    console.log(`[DEBUG] Scraping pages: ${urls.join(", ")}`);

    const run = await client.actor(actorId).call(input, { waitSecs: 120 });
    console.log(`[DEBUG] Apify run status: ${run.status}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`[DEBUG] Got ${items.length} items`);

    // Return raw data for debugging
    return NextResponse.json({
      message: "Debug data from facebook-posts-scraper",
      itemCount: items.length,
      firstItemKeys: items[0] ? Object.keys(items[0]) : [],
      items: items.slice(0, 5), // First 5 items
    });

  } catch (error) {
    console.error("Debug page error:", error);
    return NextResponse.json({ 
      error: "Debug failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
