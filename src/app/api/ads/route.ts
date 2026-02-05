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
// Helper: Process Ads Data (Updated for actual Apify response)
// ============================================
function processAdsData(rawAds: Record<string, unknown>[]): ProcessedAd[] {
  return rawAds.map((raw, index) => {
    // Type the raw data based on actual Apify response
    const ad = raw as Record<string, unknown>;
    const snapshot = (ad.snapshot || {}) as Record<string, unknown>;
    const body = (snapshot.body || {}) as Record<string, unknown>;
    const images = (snapshot.images || []) as Array<Record<string, unknown>>;
    const videos = (snapshot.videos || []) as Array<Record<string, unknown>>;
    const cards = (snapshot.cards || []) as Array<Record<string, unknown>>;
    
    // Get first image from images array or cards
    let imageUrl: string | undefined;
    if (images.length > 0) {
      imageUrl = (images[0].resized_image_url || images[0].original_image_url) as string;
    } else if (cards.length > 0 && cards[0].video_preview_image_url) {
      imageUrl = cards[0].video_preview_image_url as string;
    }
    
    // Get video info from videos array or cards
    let videoUrl: string | undefined;
    let videoThumbnail: string | undefined;
    if (videos.length > 0) {
      videoThumbnail = videos[0].video_preview_image_url as string;
      videoUrl = (videos[0].video_hd_url || videos[0].video_sd_url) as string;
    } else if (cards.length > 0) {
      // Check cards for video
      const cardWithVideo = cards.find(c => c.video_hd_url || c.video_sd_url);
      if (cardWithVideo) {
        videoThumbnail = cardWithVideo.video_preview_image_url as string;
        videoUrl = (cardWithVideo.video_hd_url || cardWithVideo.video_sd_url) as string;
      }
    }

    // Get body text
    let bodyText = body.text as string | undefined;
    // If body text is a template placeholder, try to get from cards
    if (bodyText?.includes('{{') && cards.length > 0) {
      bodyText = (cards[0].body || cards[0].link_description) as string;
    }

    return {
      id: (ad.ad_archive_id || `ad-${index}`) as string,
      adArchiveId: (ad.ad_archive_id || "") as string,
      pageId: (ad.page_id || "") as string,
      pageName: (ad.page_name || snapshot.page_name || "Unknown Page") as string,
      pageAvatar: snapshot.page_profile_picture_url as string | undefined,
      isActive: (ad.is_active ?? true) as boolean,
      startDate: (ad.start_date_formatted || "") as string,
      endDate: ad.end_date_formatted as string | undefined,
      // Creative
      bodyText: bodyText,
      caption: snapshot.caption as string | undefined,
      ctaText: (snapshot.cta_text || (cards[0]?.cta_text)) as string | undefined,
      ctaType: (snapshot.cta_type || (cards[0]?.cta_type)) as string | undefined,
      imageUrl: imageUrl,
      videoUrl: videoUrl,
      videoThumbnail: videoThumbnail || imageUrl,
      linkUrl: snapshot.link_url as string | undefined,
      linkTitle: snapshot.title as string | undefined,
      linkDescription: snapshot.link_description as string | undefined,
      // Metrics - these may be null for non-political ads
      spendMin: undefined,
      spendMax: undefined,
      impressionsMin: undefined,
      impressionsMax: undefined,
      reachMin: undefined,
      reachMax: undefined,
      currency: (ad.currency || "") as string,
      // Distribution
      platforms: (ad.publisher_platform || []) as string[],
      categories: (snapshot.page_categories || ad.categories || []) as string[],
      demographics: [],
      regions: [],
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

    // Process page URLs - extract page identifiers
    let pageIdentifiers: string[] = pageIds || [];
    
    if (pageUrls && pageUrls.length > 0) {
      pageUrls.forEach((url: string) => {
        const trimmed = url.trim();
        // Extract page identifier from URL
        const pageIdentifier = extractPageIdentifier(trimmed);
        if (pageIdentifier) {
          pageIdentifiers.push(pageIdentifier);
        }
      });
    }

    // Check Apify credentials
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ 
        error: "APIFY_API_TOKEN not configured",
        message: "กรุณาตั้งค่า APIFY_API_TOKEN ใน Environment Variables"
      }, { status: 500 });
    }

    console.log(`[Ads Search] Type: ${searchType}, Page IDs: ${pageIdentifiers.join(",")}, Country: ${country}`);

    // Initialize Apify client
    const client = new ApifyClient({ token: apifyToken });

    // Build input for Apify actor based on documentation
    const actorInput: Record<string, unknown> = {};

    // Search by keyword - construct Ad Library search URL
    if (searchType === "keyword" && query) {
      // Create Ad Library search URL
      const adLibrarySearchUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(query.trim())}&search_type=keyword_unordered&media_type=all`;
      // Try as object format { url: "..." }
      actorInput.urls = [{ url: adLibrarySearchUrl }];
      actorInput.maxAds = Math.min(limit, 100);
    }

    // Search by page - use "Scrape ads of facebook pages" action
    if (searchType === "page" && pageIdentifiers.length > 0) {
      // Set action to scrape ads of facebook pages
      actorInput.action = "Scrape ads of facebook pages";
      // Provide page URLs via 'urls' field (convert identifiers to full URLs if needed)
      const pageUrlList = pageIdentifiers.map(id => {
        const pageUrl = id.includes("facebook.com") ? id : `https://www.facebook.com/${id}`;
        // Return as object format
        return { url: pageUrl };
      });
      // Use 'urls' field as required by the actor
      actorInput.urls = pageUrlList;
      actorInput.maxAdsPerPage = Math.min(limit, 100);
    }

    // Ad type filter (only for keyword search with Ad Library URL)
    if (searchType === "keyword") {
      if (adType !== "all") {
        actorInput.adType = adType;
      }
      if (activeStatus !== "all") {
        actorInput.adActiveStatus = activeStatus === "active" ? "ACTIVE" : "INACTIVE";
      }
    }

    console.log("[Ads Search] Apify Input:", JSON.stringify(actorInput, null, 2));

    // Debug mode - return input without running
    if (debug) {
      try {
        // Run Apify actor
        const run = await client.actor("curious_coder/facebook-ads-library-scraper").call(actorInput);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        return NextResponse.json({
          debug: true,
          rawCount: items.length,
          input: actorInput,
          rawData: items.slice(0, 5),
        });
      } catch (debugError) {
        return NextResponse.json({
          debug: true,
          error: debugError instanceof Error ? debugError.message : "Unknown error",
          input: actorInput,
        });
      }
    }

    // Run Apify actor
    let run;
    try {
      run = await client.actor("curious_coder/facebook-ads-library-scraper").call(actorInput);
    } catch (actorError) {
      console.error("[Ads Search] Actor error:", actorError);
      return NextResponse.json({
        error: "Apify actor failed",
        message: actorError instanceof Error ? actorError.message : "Failed to run actor",
        input: actorInput,
      }, { status: 500 });
    }

    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`[Ads Search] Got ${items.length} raw ads`);

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
      query: searchType === "keyword" ? query : (pageUrls?.join(", ") || ""),
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
