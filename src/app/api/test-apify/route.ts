import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check 1: Environment Variables
  const apifyToken = process.env.APIFY_API_TOKEN;
  const actorId = process.env.APIFY_ACTOR_ID || "apify/facebook-posts-scraper";

  results.checks = {
    APIFY_API_TOKEN: apifyToken ? `✅ Set (${apifyToken.substring(0, 15)}...)` : "❌ NOT SET",
    APIFY_ACTOR_ID: actorId,
  };

  if (!apifyToken) {
    return NextResponse.json({
      success: false,
      message: "APIFY_API_TOKEN is not set in environment variables",
      results,
    });
  }

  // Check 2: Test Apify Connection
  try {
    const client = new ApifyClient({ token: apifyToken });
    
    // Get user info to verify token is valid
    const user = await client.user().get();
    
    results.apifyUser = {
      username: user?.username,
      email: user?.email,
      plan: user?.plan,
    };

    // Check 3: Try to get actor info
    try {
      const actor = await client.actor(actorId).get();
      results.actor = {
        name: actor?.name,
        title: actor?.title,
        isPublic: actor?.isPublic,
      };
    } catch (actorError) {
      results.actor = {
        error: "Could not fetch actor info",
        details: actorError instanceof Error ? actorError.message : String(actorError),
      };
    }

    // Check 4: Run a simple test search (with very low limit)
    try {
      console.log("Starting test Apify run...");
      
      const testInput = {
        startUrls: [{ url: "https://www.facebook.com/search/posts/?q=test" }],
        resultsLimit: 3,
        maxPosts: 3,
      };

      const run = await client.actor(actorId).call(testInput, {
        waitSecs: 60,
      });

      results.testRun = {
        id: run.id,
        status: run.status,
        datasetId: run.defaultDatasetId,
      };

      // Get results
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      
      results.testResults = {
        itemCount: items.length,
        sampleItem: items[0] ? {
          hasUrl: !!(items[0] as any).url || !!(items[0] as any).postUrl,
          hasText: !!(items[0] as any).text || !!(items[0] as any).message,
          keys: Object.keys(items[0]).slice(0, 10),
        } : null,
      };

    } catch (runError) {
      results.testRun = {
        error: "Failed to run test search",
        details: runError instanceof Error ? runError.message : String(runError),
      };
    }

    return NextResponse.json({
      success: true,
      message: "Apify connection successful!",
      results,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to connect to Apify",
      error: error instanceof Error ? error.message : String(error),
      results,
    });
  }
}
