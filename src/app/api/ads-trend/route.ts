// Ads Trend API - Fetches trending ads based on user's business type
// Uses TrendScore algorithm: (Likes×1 + Comments×3 + Shares×5) / (TimeSincePosted)^1.5

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ApifyClient } from "apify-client";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Calculate Trend Score
// Formula: (Likes×1 + Comments×3 + Shares×5) / (HoursSincePosted)^1.5
function calculateTrendScore(
    likes: number,
    comments: number,
    shares: number,
    postedAt: Date | null
): number {
    const rawEngagement = likes * 1 + comments * 3 + shares * 5;

    if (!postedAt) {
        // If no posted date, use raw engagement with a penalty
        return rawEngagement * 0.5;
    }

    const now = new Date();
    const hoursAgo = Math.max(1, (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60));

    // TrendScore = Engagement / (Hours)^1.5
    // This gives higher scores to newer posts with high engagement
    const trendScore = rawEngagement / Math.pow(hoursAgo, 1.5);

    return Math.round(trendScore * 100) / 100;
}

// Format time ago
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

// Business type keywords mapping
const businessKeywords: Record<string, string[]> = {
    "ความงาม/สกินแคร์": ["skincare", "ครีมหน้าใส", "เครื่องสำอาง", "beauty", "serum", "โลชั่น"],
    "สุขภาพ/อาหารเสริม": ["อาหารเสริม", "ลดน้ำหนัก", "วิตามิน", "detox", "สุขภาพ", "ลดความอ้วน"],
    "แฟชั่น/เสื้อผ้า": ["เสื้อผ้า", "แฟชั่น", "fashion", "เดรส", "กระเป๋า", "รองเท้า"],
    "อาหาร/เครื่องดื่ม": ["อาหาร", "ร้านอาหาร", "เครื่องดื่ม", "ขนม", "กาแฟ", "bakery"],
    "เทคโนโลยี/มือถือ": ["มือถือ", "สมาร์ทโฟน", "แก็ดเจ็ต", "tech", "คอมพิวเตอร์", "อุปกรณ์"],
    "การศึกษา/คอร์สเรียน": ["คอร์สเรียน", "สอนภาษา", "ติวเตอร์", "education", "สอนออนไลน์"],
    "อสังหาริมทรัพย์": ["บ้าน", "คอนโด", "ที่ดิน", "อสังหา", "ทาวน์โฮม", "โครงการ"],
    "ท่องเที่ยว/โรงแรม": ["ท่องเที่ยว", "โรงแรม", "travel", "ทัวร์", "รีสอร์ท", "ตั๋วเครื่องบิน"],
    "รถยนต์/ยานพาหนะ": ["รถยนต์", "มอเตอร์ไซค์", "รถมือสอง", "ยานพาหนะ", "car"],
    "การเงิน/ประกัน": ["ประกัน", "สินเชื่อ", "ลงทุน", "การเงิน", "บัตรเครดิต", "กู้เงิน"],
    "อื่นๆ": ["ธุรกิจ", "โฆษณา", "marketing", "ขายของ"],
};

export async function GET(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user with business type
        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: { businessType: true },
        });

        return NextResponse.json({
            businessType: user?.businessType || null,
            availableTypes: Object.keys(businessKeywords),
        });
    } catch (error) {
        console.error("Error fetching user business type:", error);
        return NextResponse.json(
            { error: "Failed to fetch user data" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { businessType, action } = body;

        // Action: Save business type
        if (action === "saveBusinessType") {
            if (!businessType) {
                return NextResponse.json(
                    { error: "Business type is required" },
                    { status: 400 }
                );
            }

            await prisma.user.update({
                where: { clerkId },
                data: { businessType },
            });

            return NextResponse.json({ success: true, businessType });
        }

        // Action: Fetch trending ads
        if (action === "fetchTrends") {
            // Get user's business type
            const user = await prisma.user.findUnique({
                where: { clerkId },
                select: { businessType: true },
            });

            if (!user?.businessType) {
                return NextResponse.json(
                    { error: "กรุณาเลือกประเภทธุรกิจก่อน" },
                    { status: 400 }
                );
            }

            // Get keywords for this business type
            const keywords = businessKeywords[user.businessType] || businessKeywords["อื่นๆ"];
            const searchKeyword = keywords[Math.floor(Math.random() * keywords.length)];

            if (!APIFY_TOKEN) {
                return NextResponse.json(
                    { error: "Apify API token not configured" },
                    { status: 500 }
                );
            }

            const client = new ApifyClient({ token: APIFY_TOKEN });

            // Run the Facebook Ads scraper
            const run = await client.actor("apify/facebook-ads-scraper").call({
                searchQuery: searchKeyword,
                country: "TH",
                maxResults: 50, // Fetch more to get good trending posts
                onlyActiveAds: true,
            });

            // Get the results
            const { items } = await client.dataset(run.defaultDatasetId).listItems();

            // Process and calculate trend scores
            interface AdItem {
                id?: string;
                adArchiveId?: string;
                pageId?: string;
                pageName?: string;
                pageAvatar?: string;
                pageLogo?: string;
                pageProfilePicture?: string;
                bodyText?: string;
                caption?: string;
                linkDescription?: string;
                imageUrl?: string;
                image?: string;
                thumbnail?: string;
                videoUrl?: string;
                video?: string;
                videoThumbnail?: string;
                startDate?: string;
                createdAt?: string;
                likesCount?: number;
                likes?: number;
                reactions?: number;
                commentsCount?: number;
                comments?: number;
                sharesCount?: number;
                shares?: number;
                isActive?: boolean;
                active?: boolean;
                status?: string;
            }

            const processedAds = (items as AdItem[])
                .map((ad) => {
                    const likes = ad.likesCount || ad.likes || ad.reactions || 0;
                    const comments = ad.commentsCount || ad.comments || 0;
                    const shares = ad.sharesCount || ad.shares || 0;
                    const postedAt = ad.startDate ? new Date(ad.startDate) : (ad.createdAt ? new Date(ad.createdAt) : null);

                    const trendScore = calculateTrendScore(likes, comments, shares, postedAt);

                    return {
                        id: ad.id || ad.adArchiveId || String(Math.random()),
                        adArchiveId: ad.adArchiveId || ad.id || "",
                        pageId: ad.pageId || "",
                        pageName: ad.pageName || "Unknown Page",
                        pageAvatar: ad.pageAvatar || ad.pageLogo || ad.pageProfilePicture || null,
                        bodyText: ad.bodyText || ad.caption || ad.linkDescription || "",
                        imageUrl: ad.imageUrl || ad.image || ad.thumbnail || null,
                        videoUrl: ad.videoUrl || ad.video || null,
                        videoThumbnail: ad.videoThumbnail || ad.imageUrl || null,
                        postedAt: postedAt?.toISOString() || null,
                        timeAgo: formatTimeAgo(postedAt),
                        likesCount: likes,
                        commentsCount: comments,
                        sharesCount: shares,
                        totalEngagement: likes + comments + shares,
                        trendScore,
                        isActive: ad.isActive ?? ad.active ?? (ad.status === "ACTIVE"),
                    };
                })
                .filter((ad) => ad.trendScore > 0)
                .sort((a, b) => b.trendScore - a.trendScore)
                .slice(0, 10) // Top 10 trending
                .map((ad, index) => ({
                    ...ad,
                    rank: index + 1,
                }));

            return NextResponse.json({
                success: true,
                businessType: user.businessType,
                searchKeyword,
                totalFetched: items.length,
                ads: processedAds,
                scoringFormula: "TrendScore = (Likes×1 + Comments×3 + Shares×5) / (Hours)^1.5",
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
