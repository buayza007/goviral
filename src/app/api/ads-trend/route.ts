// Ads Trend API - Fetches trending ads based on user's business type
// Uses TrendScore algorithm: (Likes×1 + Comments×3 + Shares×5) / (TimeSincePosted)^1.5
// Uses the same Apify actor as /api/ads: curious_coder/facebook-ads-library-scraper

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ApifyClient } from "apify-client";

export const dynamic = "force-dynamic";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// ============================================
// TrendScore Algorithm
// Formula: (Likes×1 + Comments×3 + Shares×5) / (HoursSincePosted)^1.5
// ============================================
function calculateTrendScore(
    likes: number,
    comments: number,
    shares: number,
    postedAt: Date | null
): number {
    const rawEngagement = likes * 1 + comments * 3 + shares * 5;

    if (!postedAt) {
        return rawEngagement * 0.5;
    }

    const now = new Date();
    const hoursAgo = Math.max(1, (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60));
    const trendScore = rawEngagement / Math.pow(hoursAgo, 1.5);
    return Math.round(trendScore * 100) / 100;
}

// Format time ago in Thai
function formatTimeAgo(date: Date | null): string {
    if (!date) return "ไม่ทราบ";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
    return `${Math.floor(days / 30)} เดือนที่แล้ว`;
}

// ============================================
// Business type → Facebook Ad Library search URLs
// ============================================
const businessSearchUrls: Record<string, string[]> = {
    "ความงาม/สกินแคร์": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=skincare&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%84%E0%B8%A3%E0%B8%B5%E0%B8%A1%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B9%83%E0%B8%AA&search_type=keyword_unordered&media_type=all",
    ],
    "สุขภาพ/อาหารเสริม": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%AD%E0%B8%B2%E0%B8%AB%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%A1&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%A5%E0%B8%94%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%AB%E0%B8%99%E0%B8%B1%E0%B8%81&search_type=keyword_unordered&media_type=all",
    ],
    "แฟชั่น/เสื้อผ้า": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B9%80%E0%B8%AA%E0%B8%B7%E0%B9%89%E0%B8%AD%E0%B8%9C%E0%B9%89%E0%B8%B2&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=fashion&search_type=keyword_unordered&media_type=all",
    ],
    "อาหาร/เครื่องดื่ม": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%AD%E0%B8%B2%E0%B8%AB%E0%B8%B2%E0%B8%A3&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%94%E0%B8%B7%E0%B9%88%E0%B8%A1&search_type=keyword_unordered&media_type=all",
    ],
    "เทคโนโลยี/มือถือ": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%96%E0%B8%B7%E0%B8%AD&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=smartphone&search_type=keyword_unordered&media_type=all",
    ],
    "การศึกษา/คอร์สเรียน": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%84%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%AA%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=education&search_type=keyword_unordered&media_type=all",
    ],
    "อสังหาริมทรัพย์": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%84%E0%B8%AD%E0%B8%99%E0%B9%82%E0%B8%94&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99&search_type=keyword_unordered&media_type=all",
    ],
    "ท่องเที่ยว/โรงแรม": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%97%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%A7&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=travel&search_type=keyword_unordered&media_type=all",
    ],
    "รถยนต์/ยานพาหนะ": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%A3%E0%B8%96%E0%B8%A2%E0%B8%99%E0%B8%95%E0%B9%8C&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=car&search_type=keyword_unordered&media_type=all",
    ],
    "การเงิน/ประกัน": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%B1%E0%B8%99&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B9%80%E0%B8%8A%E0%B8%B7%E0%B9%88%E0%B8%AD&search_type=keyword_unordered&media_type=all",
    ],
    "อื่นๆ": [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%84%E0%B9%89%E0%B8%B2&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TH&q=business&search_type=keyword_unordered&media_type=all",
    ],
};

// Human-readable keyword labels for display
const businessKeywordLabels: Record<string, string> = {
    "ความงาม/สกินแคร์": "skincare / ครีมหน้าใส",
    "สุขภาพ/อาหารเสริม": "อาหารเสริม / ลดน้ำหนัก",
    "แฟชั่น/เสื้อผ้า": "เสื้อผ้า / fashion",
    "อาหาร/เครื่องดื่ม": "อาหาร / เครื่องดื่ม",
    "เทคโนโลยี/มือถือ": "มือถือ / smartphone",
    "การศึกษา/คอร์สเรียน": "คอร์สเรียน / education",
    "อสังหาริมทรัพย์": "คอนโด / บ้าน",
    "ท่องเที่ยว/โรงแรม": "ท่องเที่ยว / travel",
    "รถยนต์/ยานพาหนะ": "รถยนต์ / car",
    "การเงิน/ประกัน": "ประกัน / สินเชื่อ",
    "อื่นๆ": "สินค้า / business",
};

// ============================================
// Process raw Apify data (same logic as /api/ads)
// ============================================
function processAdsData(rawAds: Record<string, unknown>[]) {
    return rawAds.map((raw, index) => {
        const ad = raw as Record<string, unknown>;
        const snapshot = (ad.snapshot || {}) as Record<string, unknown>;
        const body = (snapshot.body || {}) as Record<string, unknown>;
        const images = (snapshot.images || []) as Array<Record<string, unknown>>;
        const videos = (snapshot.videos || []) as Array<Record<string, unknown>>;
        const cards = (snapshot.cards || []) as Array<Record<string, unknown>>;

        let imageUrl: string | undefined;
        if (images.length > 0) {
            imageUrl = (images[0].resized_image_url || images[0].original_image_url) as string;
        } else if (cards.length > 0) {
            const firstCard = cards[0];
            imageUrl = (firstCard.resized_image_url || firstCard.original_image_url || firstCard.video_preview_image_url) as string;
        }

        let videoUrl: string | undefined;
        let videoThumbnail: string | undefined;
        if (videos.length > 0) {
            videoThumbnail = videos[0].video_preview_image_url as string;
            videoUrl = (videos[0].video_hd_url || videos[0].video_sd_url) as string;
        } else if (cards.length > 0) {
            const cardWithVideo = cards.find((c) => c.video_hd_url || c.video_sd_url);
            if (cardWithVideo) {
                videoThumbnail = (cardWithVideo.video_preview_image_url || cardWithVideo.resized_image_url) as string;
                videoUrl = (cardWithVideo.video_hd_url || cardWithVideo.video_sd_url) as string;
            }
        }

        let bodyText = body.text as string | undefined;
        if (bodyText?.includes("{{") && cards.length > 0) {
            bodyText = (cards[0].body || cards[0].link_description) as string;
        }

        // Parse start date for TrendScore
        const startDateStr = ad.start_date_formatted as string | undefined;
        let postedAt: Date | null = null;
        if (startDateStr) {
            const parsed = new Date(startDateStr);
            if (!isNaN(parsed.getTime())) postedAt = parsed;
        }

        return {
            id: (ad.ad_archive_id || `ad-${index}`) as string,
            adArchiveId: (ad.ad_archive_id || "") as string,
            pageId: (ad.page_id || "") as string,
            pageName: (ad.page_name || snapshot.page_name || "Unknown Page") as string,
            pageAvatar: snapshot.page_profile_picture_url as string | undefined,
            isActive: (ad.is_active ?? true) as boolean,
            startDate: startDateStr || "",
            bodyText: bodyText,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            videoThumbnail: videoThumbnail || imageUrl,
            postedAt,
        };
    });
}

// ============================================
// GET - Return user's business type
// ============================================
export async function GET(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: { businessType: true },
        });

        return NextResponse.json({
            businessType: user?.businessType || null,
            availableTypes: Object.keys(businessSearchUrls),
        });
    } catch (error) {
        console.error("Error fetching user business type:", error);
        return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }
}

// ============================================
// POST - Save business type OR fetch trends
// ============================================
export async function POST(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { businessType, action } = body;

        // ── Action: Save business type ──────────────────────────────
        if (action === "saveBusinessType") {
            if (!businessType) {
                return NextResponse.json({ error: "Business type is required" }, { status: 400 });
            }
            await prisma.user.update({
                where: { clerkId },
                data: { businessType },
            });
            return NextResponse.json({ success: true, businessType });
        }

        // ── Action: Fetch trending ads ──────────────────────────────
        if (action === "fetchTrends") {
            const user = await prisma.user.findUnique({
                where: { clerkId },
                select: { businessType: true },
            });

            if (!user?.businessType) {
                return NextResponse.json({ error: "กรุณาเลือกประเภทธุรกิจก่อน" }, { status: 400 });
            }

            if (!APIFY_TOKEN) {
                return NextResponse.json({ error: "Apify API token not configured" }, { status: 500 });
            }

            // Pick a random search URL for this business type
            const urls = businessSearchUrls[user.businessType] || businessSearchUrls["อื่นๆ"];
            const chosenUrl = urls[Math.floor(Math.random() * urls.length)];
            const searchKeyword = businessKeywordLabels[user.businessType] || user.businessType;

            console.log(`[Ads Trend] Business: ${user.businessType}, URL: ${chosenUrl}`);

            const client = new ApifyClient({ token: APIFY_TOKEN });

            // Use the SAME actor and input format as /api/ads
            const actorInput = {
                urls: [{ url: chosenUrl }],
                limitPerSource: 50,
                count: 50,
            };

            console.log("[Ads Trend] Apify Input:", JSON.stringify(actorInput, null, 2));

            let run;
            try {
                run = await client.actor("curious_coder/facebook-ads-library-scraper").call(actorInput);
            } catch (actorError) {
                console.error("[Ads Trend] Actor error:", actorError);
                return NextResponse.json({
                    error: "Apify actor failed",
                    message: actorError instanceof Error ? actorError.message : "Failed to run actor",
                }, { status: 500 });
            }

            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            console.log(`[Ads Trend] Got ${items.length} raw ads`);

            // Process ads with the same logic as /api/ads
            const processed = processAdsData(items as Record<string, unknown>[]);

            // Calculate TrendScore and sort
            const scored = processed
                .map((ad) => {
                    // Facebook Ad Library doesn't expose likes/comments/shares publicly
                    // We use impression/reach proxies or fallback to recency scoring
                    // For ads: score by recency (newer active ads = higher trend)
                    const hoursOld = ad.postedAt
                        ? Math.max(1, (Date.now() - ad.postedAt.getTime()) / (1000 * 60 * 60))
                        : 720; // default 30 days old if no date

                    // Since FB Ads Library doesn't give engagement numbers,
                    // we use: active ads score higher, newer ads score higher
                    const activityBonus = ad.isActive ? 1000 : 100;
                    const trendScore = calculateTrendScore(activityBonus, 0, 0, ad.postedAt);

                    return {
                        id: ad.id,
                        adArchiveId: ad.adArchiveId,
                        pageId: ad.pageId,
                        pageName: ad.pageName,
                        pageAvatar: ad.pageAvatar || null,
                        bodyText: ad.bodyText || "",
                        imageUrl: ad.imageUrl || null,
                        videoUrl: ad.videoUrl || null,
                        videoThumbnail: ad.videoThumbnail || null,
                        postedAt: ad.postedAt?.toISOString() || null,
                        timeAgo: formatTimeAgo(ad.postedAt),
                        // FB Ads Library doesn't expose public engagement metrics
                        likesCount: 0,
                        commentsCount: 0,
                        sharesCount: 0,
                        totalEngagement: 0,
                        trendScore: Math.round((activityBonus / Math.pow(hoursOld, 0.5)) * 100) / 100,
                        isActive: ad.isActive,
                    };
                })
                .filter((ad) => ad.trendScore > 0)
                .sort((a, b) => {
                    // Active ads first, then by recency
                    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                    return b.trendScore - a.trendScore;
                })
                .slice(0, 10)
                .map((ad, index) => ({ ...ad, rank: index + 1 }));

            return NextResponse.json({
                success: true,
                businessType: user.businessType,
                searchKeyword,
                totalFetched: items.length,
                ads: scored,
                scoringFormula: "TrendScore = ActivityScore / (HoursSincePosted)^0.5 — Active ads rank higher, newer ads rank higher",
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error in ads-trend API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process request" },
            { status: 500 }
        );
    }
}
