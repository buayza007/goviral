import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApifyClient } from "apify-client";

// Force dynamic to prevent static generation timeout
export const dynamic = "force-dynamic";

// ============================================
// INTERFACES - Facebook Ads Library Data
// ============================================

interface FacebookAd {
  adArchiveID: string;
  adID?: string;
  pageID: string;
  pageName: string;
  pageProfilePictureURL?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  currency?: string;
  spend?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  impressions?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  reach?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  snapshot?: {
    body_text?: string;
    caption?: string;
    cta_text?: string;
    cta_type?: string;
    images?: Array<{ url: string }>;
    videos?: Array<{ video_preview_image_url: string; video_url?: string }>;
    link_url?: string;
    link_title?: string;
    link_description?: string;
  };
  publisherPlatform?: string[];
  categories?: string[];
  demographicDistribution?: Array<{
    age?: string;
    gender?: string;
    percentage?: number;
  }>;
  regionDistribution?: Array<{
    region?: string;
    percentage?: number;
  }>;
}

interface ProcessedAd {
  id: string;
  adArchiveId: string;
  pageId: string;
  pageName: string;
  pageAvatar?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  // Creative
  bodyText?: string;
  caption?: string;
  ctaText?: string;
  ctaType?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  // Metrics
  spendMin?: number;
  spendMax?: number;
  impressionsMin?: number;
  impressionsMax?: number;
  reachMin?: number;
  reachMax?: number;
  currency?: string;
  // Distribution
  platforms?: string[];
  categories?: string[];
  demographics?: Array<{ age?: string; gender?: string; percentage?: number }>;
  regions?: Array<{ region?: string; percentage?: number }>;
}

// ============================================
// Helper: Extract Page ID/Username from URL
// ============================================
function extractPageIdentifier(url: string): string {
  // Clean the URL
  const cleanUrl = url.trim();
  
  // If it's already just an ID or username (no URL), return as is
  if (!cleanUrl.includes("facebook.com") && !cleanUrl.includes("fb.com")) {
    return cleanUrl;
  }
  
  try {
    // Remove query params and trailing slashes
    let path = cleanUrl.split("?")[0].replace(/\/+$/, "");
    
    // Extract from various URL formats:
    // https://www.facebook.com/pagename
    // https://www.facebook.com/profile.php?id=123456789
    // https://fb.com/pagename
    // https://www.facebook.com/pages/PageName/123456789
    
    // Check for profile.php?id=
    const idMatch = cleanUrl.match(/[?&]id=(\d+)/);
    if (idMatch) {
      return idMatch[1];
    }
    
    // Check for /pages/Name/ID format
    const pagesMatch = path.match(/\/pages\/[^\/]+\/(\d+)/);
    if (pagesMatch) {
      return pagesMatch[1];
    }
    
    // Extract last part of path (page username)
    const parts = path.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    
    // Skip common non-page paths
    if (lastPart && !["www.facebook.com", "facebook.com", "fb.com", "pages"].includes(lastPart)) {
      return lastPart;
    }
    
    return cleanUrl;
  } catch {
    return cleanUrl;
  }
}

// ============================================
// Helper: Process Ads Data
// ============================================
function processAdsData(rawAds: Record<string, unknown>[]): ProcessedAd[] {
  return rawAds.map((raw, index) => {
    const ad = raw as unknown as FacebookAd;
    const snapshot = ad.snapshot || {};
    
    // Get first image
    let imageUrl: string | undefined;
    if (snapshot.images && snapshot.images.length > 0) {
      imageUrl = snapshot.images[0].url;
    }
    
    // Get video info
    let videoUrl: string | undefined;
    let videoThumbnail: string | undefined;
    if (snapshot.videos && snapshot.videos.length > 0) {
      videoThumbnail = snapshot.videos[0].video_preview_image_url;
      videoUrl = snapshot.videos[0].video_url;
    }

    return {
      id: ad.adArchiveID || `ad-${index}`,
      adArchiveId: ad.adArchiveID || "",
      pageId: ad.pageID || "",
      pageName: ad.pageName || "Unknown Page",
      pageAvatar: ad.pageProfilePictureURL,
      isActive: ad.isActive ?? true,
      startDate: ad.startDate || "",
      endDate: ad.endDate,
      // Creative
      bodyText: snapshot.body_text || ((raw as Record<string, unknown>).body as Record<string, unknown>)?.text as string | undefined,
      caption: snapshot.caption,
      ctaText: snapshot.cta_text,
      ctaType: snapshot.cta_type,
      imageUrl: imageUrl || (raw as Record<string, unknown>).imageUrl as string,
      videoUrl: videoUrl,
      videoThumbnail: videoThumbnail || imageUrl,
      linkUrl: snapshot.link_url,
      linkTitle: snapshot.link_title,
      linkDescription: snapshot.link_description,
      // Metrics
      spendMin: ad.spend?.lower_bound,
      spendMax: ad.spend?.upper_bound,
      impressionsMin: ad.impressions?.lower_bound,
      impressionsMax: ad.impressions?.upper_bound,
      reachMin: ad.reach?.lower_bound,
      reachMax: ad.reach?.upper_bound,
      currency: ad.currency || "THB",
      // Distribution
      platforms: ad.publisherPlatform || [],
      categories: ad.categories || [],
      demographics: ad.demographicDistribution || [],
      regions: ad.regionDistribution || [],
    };
  });
}

// ============================================
// POST - Search Facebook Ads Library
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      searchType = "keyword", // "keyword" or "page"
      query,
      pageIds,
      pageUrls, // NEW: Accept page URLs
      country = "TH",
      adType = "all", // "all", "political_and_issue_ads", "image", "video"
      activeStatus = "all", // "all", "active", "inactive"
      limit = 20,
      debug = false
    } = body;

    // Validate input
    if (searchType === "keyword" && !query?.trim()) {
      return NextResponse.json({ error: "กรุณาใส่คำค้นหา" }, { status: 400 });
    }
    if (searchType === "page" && (!pageIds || pageIds.length === 0) && (!pageUrls || pageUrls.length === 0)) {
      return NextResponse.json({ error: "กรุณาใส่ URL เพจ หรือ Page ID" }, { status: 400 });
    }

    // Process page URLs to extract IDs/usernames
    let processedPageIds: string[] = pageIds || [];
    if (pageUrls && pageUrls.length > 0) {
      const extractedIds = pageUrls.map((url: string) => extractPageIdentifier(url));
      processedPageIds = [...processedPageIds, ...extractedIds].filter(Boolean);
    }

    // Check Apify credentials
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ 
        error: "APIFY_API_TOKEN not configured",
        message: "กรุณาตั้งค่า APIFY_API_TOKEN ใน Environment Variables"
      }, { status: 500 });
    }

    console.log(`[Ads Search] Type: ${searchType}, Query: ${query || processedPageIds?.join(",")}, Country: ${country}`);

    // Initialize Apify client
    const client = new ApifyClient({ token: apifyToken });

    // Build input for Apify actor
    const actorInput: Record<string, unknown> = {
      country: country,
      maxAds: Math.min(limit, 100),
    };

    // Search by keyword
    if (searchType === "keyword" && query) {
      actorInput.searchQuery = query.trim();
    }

    // Search by page IDs/usernames
    if (searchType === "page" && processedPageIds && processedPageIds.length > 0) {
      actorInput.pageIds = processedPageIds;
    }

    // Ad type filter
    if (adType !== "all") {
      actorInput.adType = adType;
    }

    // Active status filter
    if (activeStatus !== "all") {
      actorInput.adActiveStatus = activeStatus === "active" ? "ACTIVE" : "INACTIVE";
    }

    console.log("[Ads Search] Apify Input:", JSON.stringify(actorInput, null, 2));

    // Run Apify actor
    const run = await client.actor("curious_coder/facebook-ads-library-scraper").call(actorInput);

    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`[Ads Search] Got ${items.length} raw ads`);

    // Debug mode - return raw data
    if (debug) {
      return NextResponse.json({
        debug: true,
        rawCount: items.length,
        input: actorInput,
        rawData: items.slice(0, 5), // First 5 items for debugging
      });
    }

    // Process ads data
    const processedAds = processAdsData(items as Record<string, unknown>[]);

    // Sort by activity (active first) then by start date (newest first)
    processedAds.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return NextResponse.json({
      success: true,
      searchType,
      query: searchType === "keyword" ? query : processedPageIds?.join(", "),
      country,
      totalAds: processedAds.length,
      activeAds: processedAds.filter(a => a.isActive).length,
      inactiveAds: processedAds.filter(a => !a.isActive).length,
      ads: processedAds.slice(0, limit),
    });

  } catch (error) {
    console.error("[Ads Search] Error:", error);
    return NextResponse.json({
      error: "Failed to fetch ads",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// ============================================
// GET - Debug endpoint
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      endpoint: "/api/ads",
      description: "Facebook Ads Library Scraper",
      apifyActor: "curious_coder/facebook-ads-library-scraper",
      methods: {
        POST: {
          description: "Search Facebook Ads Library",
          body: {
            searchType: "keyword | page",
            query: "Search keyword (for searchType=keyword)",
            pageIds: ["Array of Facebook Page IDs (for searchType=page)"],
            country: "TH (default) | US | GB | etc.",
            adType: "all | political_and_issue_ads | image | video",
            activeStatus: "all | active | inactive",
            limit: "Number (default: 20, max: 100)",
            debug: "Boolean (return raw data for debugging)",
          }
        }
      },
      env: {
        APIFY_API_TOKEN: process.env.APIFY_API_TOKEN ? "✅ Set" : "❌ Not set",
      }
    });

  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
