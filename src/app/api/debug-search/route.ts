import { NextRequest, NextResponse } from "next/server";
import { ApifyClient } from "apify-client";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

// Debug endpoint to see raw Apify data structure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, cookies } = body;

    if (!keyword || !cookies) {
      return NextResponse.json({ error: "keyword and cookies required" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not set" }, { status: 500 });
    }

    // Parse cookies
    let cookiesArray: any[] = [];
    if (cookies.trim().startsWith("[")) {
      cookiesArray = JSON.parse(cookies);
    } else {
      cookiesArray = cookies.split(";").map((c: string) => {
        const [name, ...val] = c.trim().split("=");
        return { name: name.trim(), value: val.join("=").trim(), domain: ".facebook.com" };
      }).filter((c: any) => c.name && c.value);
    }

    const client = new ApifyClient({ token: apifyToken });
    
    const run = await client.actor("alien_force/facebook-search-scraper").call({
      search_type: "posts",
      keyword,
      filter_by_recent_posts: true,
      results_limit: 5,
      min_wait_time_in_sec: 1,
      max_wait_time_in_sec: 3,
      cookies: cookiesArray,
      fetch_reaction_map: true,
      since: "7d",
    }, { waitSecs: 120 });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Return raw data for debugging
    return NextResponse.json({
      message: "Debug data",
      itemCount: items.length,
      firstItemKeys: items.length > 0 ? Object.keys(items[0]) : [],
      firstItem: items[0] || null,
      allItems: items,
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Debug failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
