"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    TrendingUp,
    ExternalLink,
    Loader2,
    Flame,
    Trophy,
    Clock,
    Building2,
    Sparkles,
    RefreshCw,
    ChevronDown,
    Play,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { truncateText } from "@/lib/utils";

interface TrendingAd {
    id: string;
    adArchiveId: string;
    pageId: string;
    pageName: string;
    pageAvatar: string | null;
    bodyText: string;
    imageUrl: string | null;
    videoUrl: string | null;
    videoThumbnail: string | null;
    postedAt: string | null;
    timeAgo: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    totalEngagement: number;
    trendScore: number;
    isActive: boolean;
    rank: number;
}

interface TrendResult {
    success: boolean;
    businessType: string;
    searchKeyword: string;
    totalFetched: number;
    ads: TrendingAd[];
    scoringFormula: string;
}

// Trending Card Component
function TrendingAdCard({ ad }: { ad: TrendingAd }) {
    const [showFullCaption, setShowFullCaption] = useState(false);
    const hasVideo = !!ad.videoUrl || !!ad.videoThumbnail;
    const displayImage = ad.videoThumbnail || ad.imageUrl;
    const captionLimit = 100;
    const needsSeeMore = ad.bodyText && ad.bodyText.length > captionLimit;

    // Rank badge styling
    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-yellow-900 shadow-lg shadow-yellow-500/30";
            case 2:
                return "bg-gradient-to-r from-gray-300 via-gray-200 to-gray-400 text-gray-800 shadow-lg shadow-gray-400/30";
            case 3:
                return "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-amber-100 shadow-lg shadow-orange-500/30";
            default:
                return "bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/20";
        }
    };

    // Trend score color
    const getTrendScoreColor = (score: number) => {
        if (score >= 1000) return "text-yellow-400";
        if (score >= 500) return "text-orange-400";
        if (score >= 100) return "text-viral-400";
        return "text-green-400";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: ad.rank * 0.08 }}
            className="group"
        >
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700/50 hover:border-viral-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-viral-500/10 h-full flex flex-col">
                {/* Ranking Badge - Top Left Corner */}
                <div className="absolute left-0 top-0 z-20">
                    <div
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-black rounded-br-2xl ${getRankStyle(
                            ad.rank
                        )}`}
                    >
                        {ad.rank === 1 ? (
                            <Trophy className="h-5 w-5" />
                        ) : ad.rank === 2 ? (
                            <span className="text-lg">🥈</span>
                        ) : ad.rank === 3 ? (
                            <span className="text-lg">🥉</span>
                        ) : (
                            <span className="text-lg font-bold">#{ad.rank}</span>
                        )}
                        {ad.rank <= 3 && <span>อันดับ {ad.rank}</span>}
                    </div>
                </div>

                {/* Trend Score Badge - Top Right */}
                <div className="absolute right-3 top-3 z-20">
                    <div
                        className={`flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-sm px-3 py-1.5 ${getTrendScoreColor(
                            ad.trendScore
                        )}`}
                    >
                        <Flame className="h-4 w-4 animate-pulse" />
                        <span className="text-sm font-bold">{ad.trendScore.toFixed(1)}</span>
                    </div>
                </div>

                {/* Header: Profile + Page Name + Time */}
                <div className="flex items-center gap-3 p-4 pt-14 border-b border-slate-700/50">
                    {ad.pageAvatar ? (
                        <Image
                            src={ad.pageAvatar}
                            alt={ad.pageName}
                            width={44}
                            height={44}
                            className="rounded-full object-cover ring-2 ring-slate-600/50"
                            unoptimized
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-viral-500 to-ocean-500 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                            {ad.pageName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{ad.timeAgo}</span>
                        </div>
                    </div>
                </div>

                {/* Media: Image/Video Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                    {displayImage ? (
                        <div className="relative w-full h-full">
                            <Image
                                src={displayImage}
                                alt="Ad Creative"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                unoptimized
                            />
                            {hasVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <TrendingUp className="w-16 h-16 text-slate-600" />
                        </div>
                    )}

                    {/* Hover overlay with View button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <Button
                            size="sm"
                            className="gap-2 bg-white/90 text-black hover:bg-white"
                            onClick={() =>
                                window.open(
                                    `https://www.facebook.com/ads/library/?id=${ad.adArchiveId}`,
                                    "_blank"
                                )
                            }
                        >
                            <ExternalLink className="h-4 w-4" />
                            ดูใน Ad Library
                        </Button>
                    </div>
                </div>

                {/* Content: Caption with "See more" */}
                <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex-1 mb-4">
                        <p className="text-sm text-slate-300 leading-relaxed">
                            {ad.bodyText ? (
                                showFullCaption ? (
                                    <>
                                        {ad.bodyText}
                                        {needsSeeMore && (
                                            <button
                                                onClick={() => setShowFullCaption(false)}
                                                className="text-viral-400 hover:text-viral-300 font-medium ml-1"
                                            >
                                                ย่อ
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {truncateText(ad.bodyText, captionLimit)}
                                        {needsSeeMore && (
                                            <button
                                                onClick={() => setShowFullCaption(true)}
                                                className="text-viral-400 hover:text-viral-300 font-medium ml-1"
                                            >
                                                See more
                                            </button>
                                        )}
                                    </>
                                )
                            ) : (
                                <span className="text-slate-500 italic">ไม่มีข้อความ</span>
                            )}
                        </p>
                    </div>

                    {/* Footer: Status + Recency */}
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-700/50">
                        <div className={`flex flex-col items-center rounded-xl py-3 px-2 transition-transform hover:scale-105 ${ad.isActive ? "bg-green-500/10" : "bg-slate-700/30"
                            }`}>
                            <CheckCircle2 className={`h-4 w-4 mb-1 ${ad.isActive ? "text-green-400" : "text-slate-500"
                                }`} />
                            <span className={`text-sm font-bold ${ad.isActive ? "text-green-400" : "text-slate-400"
                                }`}>
                                {ad.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="text-[10px] text-slate-400">สถานะ</span>
                        </div>
                        <div className="flex flex-col items-center rounded-xl bg-blue-500/10 py-3 px-2 transition-transform hover:scale-105">
                            <Clock className="h-4 w-4 text-blue-400 mb-1" />
                            <span className="text-xs font-semibold text-white text-center leading-tight">
                                {ad.timeAgo}
                            </span>
                            <span className="text-[10px] text-slate-400">เวลาที่โพสต์</span>
                        </div>
                    </div>

                    {/* Trend Score Bar */}
                    <div className="mt-3 pt-3 border-t border-slate-700/30">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                Trend Score
                            </span>
                            <span
                                className={`text-xs font-bold ${getTrendScoreColor(
                                    ad.trendScore
                                )}`}
                            >
                                {ad.trendScore.toFixed(2)} pts
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min((ad.trendScore / 2000) * 100, 100)}%`,
                                }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className="h-full rounded-full bg-gradient-to-r from-viral-500 via-orange-500 to-yellow-500"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Business Type Selector Component
function BusinessTypeSelector({
    availableTypes,
    onSelect,
    loading,
}: {
    availableTypes: string[];
    onSelect: (type: string) => void;
    loading: boolean;
}) {
    const [selected, setSelected] = useState<string | null>(null);

    const businessIcons: Record<string, string> = {
        "ความงาม/สกินแคร์": "💄",
        "สุขภาพ/อาหารเสริม": "💊",
        "แฟชั่น/เสื้อผ้า": "👗",
        "อาหาร/เครื่องดื่ม": "🍔",
        "เทคโนโลยี/มือถือ": "📱",
        "การศึกษา/คอร์สเรียน": "📚",
        "อสังหาริมทรัพย์": "🏠",
        "ท่องเที่ยว/โรงแรม": "✈️",
        "รถยนต์/ยานพาหนะ": "🚗",
        "การเงิน/ประกัน": "💰",
        "อื่นๆ": "📦",
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto"
        >
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700/50 overflow-hidden">
                <CardHeader className="text-center border-b border-slate-700/50 pb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-viral-500 to-orange-500 shadow-lg shadow-viral-500/30">
                            <Building2 className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-viral-400 to-orange-400 bg-clip-text text-transparent">
                        ยินดีต้อนรับสู่ Ads Trend 🔥
                    </CardTitle>
                    <p className="text-slate-400 mt-2">
                        กรุณาเลือกประเภทธุรกิจของคุณเพื่อดูโฆษณาที่กำลัง Trending
                    </p>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableTypes.map((type) => (
                            <motion.button
                                key={type}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelected(type)}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${selected === type
                                    ? "border-viral-500 bg-viral-500/10 shadow-lg shadow-viral-500/20"
                                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                                    }`}
                            >
                                <span className="text-2xl mb-2 block">
                                    {businessIcons[type] || "📦"}
                                </span>
                                <span
                                    className={`text-sm font-medium ${selected === type ? "text-viral-400" : "text-slate-300"
                                        }`}
                                >
                                    {type}
                                </span>
                            </motion.button>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: selected ? 1 : 0.5, y: 0 }}
                        className="mt-6"
                    >
                        <Button
                            onClick={() => selected && onSelect(selected)}
                            disabled={!selected || loading}
                            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-viral-500 to-orange-500 hover:from-viral-600 hover:to-orange-600 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <ArrowRight className="h-5 w-5 mr-2" />
                            )}
                            {loading ? "กำลังโหลด..." : "ดู Ads Trend ของธุรกิจนี้"}
                        </Button>
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function AdsTrendPage() {
    const [businessType, setBusinessType] = useState<string | null>(null);
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTrends, setFetchingTrends] = useState(false);
    const [result, setResult] = useState<TrendResult | null>(null);
    const [showSelector, setShowSelector] = useState(false);

    // Fetch user's business type on load
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const res = await fetch("/api/ads-trend");
            const data = await res.json();

            setAvailableTypes(data.availableTypes || []);

            if (data.businessType) {
                setBusinessType(data.businessType);
                // Auto fetch trends if business type is set
                fetchTrends();
            } else {
                setShowSelector(true);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลได้",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBusinessType = async (type: string) => {
        setLoading(true);
        try {
            // Save business type
            const res = await fetch("/api/ads-trend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "saveBusinessType", businessType: type }),
            });

            if (!res.ok) throw new Error("Failed to save business type");

            setBusinessType(type);
            setShowSelector(false);

            // Fetch trends
            await fetchTrends();
        } catch (error) {
            console.error("Error saving business type:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกข้อมูลได้",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchTrends = async () => {
        setFetchingTrends(true);
        try {
            const res = await fetch("/api/ads-trend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "fetchTrends" }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch trends");
            }

            setResult(data);
            toast({
                title: "🔥 โหลด Ads Trend สำเร็จ!",
                description: `พบ ${data.ads.length} โฆษณาที่กำลัง Trending`,
            });
        } catch (error) {
            console.error("Error fetching trends:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description:
                    error instanceof Error ? error.message : "ไม่สามารถโหลด Trends ได้",
                variant: "destructive",
            });
        } finally {
            setFetchingTrends(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-viral-500 mx-auto mb-4" />
                    <p className="text-slate-400">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    // Business type selector
    if (showSelector || !businessType) {
        return (
            <div className="py-8">
                <BusinessTypeSelector
                    availableTypes={availableTypes}
                    onSelect={handleSelectBusinessType}
                    loading={loading}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-viral-500 to-orange-500 shadow-lg shadow-viral-500/30">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">
                            <span className="bg-gradient-to-r from-viral-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                                🔥 Ads Trend
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm">
                            โฆษณาที่กำลัง Trending ในหมวด{" "}
                            <span className="text-viral-400 font-medium">{businessType}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowSelector(true)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                        <Building2 className="h-4 w-4 mr-2" />
                        เปลี่ยนหมวดธุรกิจ
                        <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                        onClick={fetchTrends}
                        disabled={fetchingTrends}
                        className="bg-gradient-to-r from-viral-500 to-orange-500 hover:from-viral-600 hover:to-orange-600"
                    >
                        {fetchingTrends ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {fetchingTrends ? "กำลังโหลด..." : "รีเฟรช"}
                    </Button>
                </div>
            </motion.div>

            {/* Formula Explanation */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-slate-700/50">
                    <CardContent className="py-4 px-6">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 rounded-lg bg-viral-500/20">
                                <Sparkles className="h-4 w-4 text-viral-400" />
                            </div>
                            <div>
                                <span className="text-slate-400">สูตรคำนวณ Trend Score: </span>
                                <code className="px-2 py-1 rounded bg-slate-800 text-viral-400 text-xs font-mono">
                                    ActivityScore ÷ (Hours)^0.5
                                </code>
                                <span className="text-slate-500 text-xs ml-2">
                                    Active ads + ยิ่งใหม่ = คะแนนยิ่งสูง
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Loading Trends */}
            {fetchingTrends && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="relative">
                            <Loader2 className="h-16 w-16 animate-spin text-viral-500 mx-auto mb-4" />
                            <Flame className="h-6 w-6 text-orange-500 absolute top-0 right-1/2 translate-x-5 animate-bounce" />
                        </div>
                        <p className="text-slate-400 text-lg">
                            กำลังค้นหาโฆษณาที่กำลัง Trending...
                        </p>
                        <p className="text-slate-500 text-sm mt-1">
                            หมวด: {businessType}
                        </p>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !fetchingTrends && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                >
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>
                            🔍 คำค้นหา:{" "}
                            <span className="text-viral-400 font-medium">
                                "{result.searchKeyword}"
                            </span>
                        </span>
                        <span>
                            📊 พบ{" "}
                            <span className="text-white font-semibold">{result.ads.length}</span>{" "}
                            โฆษณา Trending
                        </span>
                    </div>

                    {/* Ads Grid */}
                    {result.ads.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {result.ads.map((ad) => (
                                <TrendingAdCard key={ad.id} ad={ad} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <TrendingUp className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                ไม่พบโฆษณาที่กำลัง Trending
                            </h3>
                            <p className="text-slate-400">
                                ลองเปลี่ยนหมวดธุรกิจหรือรีเฟรชอีกครั้ง
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
