"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Megaphone,
  TrendingUp,
  ExternalLink,
  Play,
  Image as ImageIcon,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  Bug,
  ChevronDown,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

interface ProcessedAd {
  id: string;
  adArchiveId: string;
  pageId: string;
  pageName: string;
  pageAvatar?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
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
  spendMin?: number;
  spendMax?: number;
  impressionsMin?: number;
  impressionsMax?: number;
  reachMin?: number;
  reachMax?: number;
  currency?: string;
  platforms?: string[];
  categories?: string[];
  demographics?: Array<{ age?: string; gender?: string; percentage?: number }>;
  regions?: Array<{ region?: string; percentage?: number }>;
}

interface SearchResult {
  success: boolean;
  searchType: string;
  query: string;
  country: string;
  totalAds: number;
  activeAds: number;
  inactiveAds: number;
  ads: ProcessedAd[];
}

interface ApifyCredits {
  configured: boolean;
  valid: boolean;
  account?: {
    usedUsd: number;
    limitUsd: number;
    remainingUsd: number;
    usagePercent: number;
    isLow: boolean;
    isExhausted: boolean;
    currentPeriodEnd?: string;
  };
  error?: string;
}

// Format date in Thai
function formatThaiDate(date: string | null): string {
  if (!date) return "ไม่ทราบ";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}


// Ad Card Component
function AdCard({ ad }: { ad: ProcessedAd }) {
  const hasVideo = !!ad.videoUrl || !!ad.videoThumbnail;
  const displayImage = ad.videoThumbnail || ad.imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all hover:shadow-xl h-full flex flex-col">
        {/* Media */}
        <div className="relative aspect-video bg-slate-900">
          {displayImage ? (
            <div className="relative w-full h-full">
              <img
                src={displayImage}
                alt="Ad Creative"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231e293b" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%234b5563" font-size="24">📢</text></svg>';
                }}
              />
              {hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <Megaphone className="w-12 h-12 text-slate-600" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                ad.isActive
                  ? "bg-green-500/90 text-white"
                  : "bg-gray-500/90 text-gray-200"
              }`}
            >
              {ad.isActive ? (
                <>
                  <CheckCircle className="w-3 h-3" /> Active
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" /> Inactive
                </>
              )}
            </div>
          </div>

          {/* Type Badge */}
          {hasVideo && (
            <div className="absolute top-2 right-2">
              <div className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold flex items-center gap-1">
                <Play className="w-3 h-3" /> VIDEO
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Page Info */}
          <div className="flex items-center gap-2 mb-3">
            {ad.pageAvatar ? (
              <img
                src={ad.pageAvatar}
                alt={ad.pageName}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-blue-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {ad.pageName}
              </p>
              <p className="text-xs text-gray-500">ID: {ad.pageId}</p>
            </div>
          </div>

          {/* Ad Text */}
          <p className="text-sm text-gray-300 line-clamp-3 flex-1 min-h-[60px] mb-3">
            {ad.bodyText || ad.caption || ad.linkDescription || "ไม่มีข้อความ"}
          </p>

          {/* CTA */}
          {ad.ctaText && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">
                <Target className="w-3 h-3" />
                {ad.ctaText}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <Calendar className="w-3 h-3" />
            <span>
              {formatThaiDate(ad.startDate)}
              {ad.endDate && ` - ${formatThaiDate(ad.endDate)}`}
            </span>
          </div>

          {/* Platforms */}
          {ad.platforms && ad.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-3 border-t border-slate-700 mb-3">
              {ad.platforms.map((platform, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    platform === "FACEBOOK" ? "bg-blue-500/20 text-blue-400" :
                    platform === "INSTAGRAM" ? "bg-pink-500/20 text-pink-400" :
                    platform === "MESSENGER" ? "bg-purple-500/20 text-purple-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {platform === "AUDIENCE_NETWORK" ? "Audience" : platform}
                </span>
              ))}
            </div>
          )}

          {/* Categories */}
          {ad.categories && ad.categories.length > 0 && ad.categories[0] !== "UNKNOWN" && (
            <div className="flex flex-wrap gap-1 mb-3">
              {ad.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-700 text-[10px] text-gray-300"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* View Ad */}
          <a
            href={`https://www.facebook.com/ads/library/?id=${ad.adArchiveId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            ดูใน Ad Library
          </a>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AdsPage() {
  const [searchType, setSearchType] = useState<"keyword" | "page">("keyword");
  const [query, setQuery] = useState("");
  const [pageUrls, setPageUrls] = useState("");
  const [country, setCountry] = useState("TH");
  const [activeStatus, setActiveStatus] = useState("all");
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null);
  const [credits, setCredits] = useState<ApifyCredits | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // Fetch Apify credits on page load
  const fetchCredits = async () => {
    setLoadingCredits(true);
    try {
      const res = await fetch("/api/ads/status");
      const data = await res.json();
      setCredits(data);
    } catch (error) {
      console.error("Failed to fetch credits:", error);
      setCredits({ configured: false, valid: false, error: "Failed to fetch" });
    } finally {
      setLoadingCredits(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleSearch = async (debug = false) => {
    if (searchType === "keyword" && !query.trim()) {
      toast({
        title: "กรุณาใส่คำค้นหา",
        variant: "destructive",
      });
      return;
    }
    if (searchType === "page" && !pageUrls.trim()) {
      toast({
        title: "กรุณาใส่ URL เพจ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setDebugData(null);

    try {
      const response = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchType,
          query: searchType === "keyword" ? query.trim() : undefined,
          pageUrls: searchType === "page" ? pageUrls.split(/[\n,]/).map((url) => url.trim()).filter(Boolean) : undefined,
          country,
          activeStatus,
          limit,
          debug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to fetch ads");
      }

      if (debug) {
        setDebugData(data);
        toast({
          title: "Debug Data Ready",
          description: `ได้ ${data.rawCount} รายการ`,
        });
      } else {
        setResult(data);
        toast({
          title: "ค้นหาสำเร็จ",
          description: `พบ ${data.totalAds} แอด (Active: ${data.activeAds})`,
        });
      }
      // Refresh credits after search
      fetchCredits();
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    { code: "TH", name: "🇹🇭 Thailand" },
    { code: "US", name: "🇺🇸 United States" },
    { code: "GB", name: "🇬🇧 United Kingdom" },
    { code: "AU", name: "🇦🇺 Australia" },
    { code: "SG", name: "🇸🇬 Singapore" },
    { code: "MY", name: "🇲🇾 Malaysia" },
    { code: "ID", name: "🇮🇩 Indonesia" },
    { code: "PH", name: "🇵🇭 Philippines" },
    { code: "VN", name: "🇻🇳 Vietnam" },
    { code: "JP", name: "🇯🇵 Japan" },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Megaphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ดูแอดคู่แข่ง
            </h1>
          </div>
          <p className="text-gray-400">
            ค้นหาและวิเคราะห์โฆษณาจาก Facebook Ad Library
          </p>
        </motion.div>

        {/* Apify Credits Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className={`border ${
            credits?.account?.isExhausted 
              ? "bg-red-900/30 border-red-500/50" 
              : credits?.account?.isLow 
                ? "bg-yellow-900/30 border-yellow-500/50" 
                : "bg-slate-800/50 border-slate-700"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    credits?.account?.isExhausted 
                      ? "bg-red-500/20" 
                      : credits?.account?.isLow 
                        ? "bg-yellow-500/20" 
                        : "bg-green-500/20"
                  }`}>
                    <Wallet className={`w-5 h-5 ${
                      credits?.account?.isExhausted 
                        ? "text-red-400" 
                        : credits?.account?.isLow 
                          ? "text-yellow-400" 
                          : "text-green-400"
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Apify Credits</p>
                    {loadingCredits ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span className="text-gray-400">กำลังโหลด...</span>
                      </div>
                    ) : credits?.account ? (
                      <div className="flex items-center gap-4">
                        <span className={`text-lg font-bold ${
                          credits.account.isExhausted 
                            ? "text-red-400" 
                            : credits.account.isLow 
                              ? "text-yellow-400" 
                              : "text-green-400"
                        }`}>
                          ${credits.account.remainingUsd.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">
                          / ${credits.account.limitUsd.toFixed(2)} (ใช้ไป {credits.account.usagePercent.toFixed(0)}%)
                        </span>
                      </div>
                    ) : credits?.error ? (
                      <span className="text-red-400 text-sm">❌ {credits.error}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">ไม่ได้ตั้งค่า API Token</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {credits?.account?.isExhausted && (
                    <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium">
                      หมดโควต้า!
                    </span>
                  )}
                  {credits?.account?.isLow && !credits?.account?.isExhausted && (
                    <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                      เหลือน้อย
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchCredits}
                    disabled={loadingCredits}
                    className="text-gray-400 hover:text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingCredits ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
              {/* Progress bar */}
              {credits?.account && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        credits.account.isExhausted 
                          ? "bg-red-500" 
                          : credits.account.isLow 
                            ? "bg-yellow-500" 
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, credits.account.usagePercent)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 ราคา: $0.75 ต่อ 1,000 ads | การค้นหา 10 ads ≈ $0.0075
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              {/* Search Type Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={searchType === "keyword" ? "default" : "outline"}
                  onClick={() => setSearchType("keyword")}
                  className="flex-1"
                >
                  <Search className="w-4 h-4 mr-2" />
                  ค้นหาด้วย Keyword
                </Button>
                <Button
                  variant={searchType === "page" ? "default" : "outline"}
                  onClick={() => setSearchType("page")}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  ค้นหาด้วย URL เพจ
                </Button>
              </div>

              {/* Search Input */}
              <div className="flex gap-2 mb-4">
                {searchType === "keyword" ? (
                  <Input
                    placeholder="ค้นหาแอด เช่น ลดน้ำหนัก, skincare, fitness..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1 bg-slate-900/50 border-slate-600"
                  />
                ) : (
                  <Input
                    placeholder="วาง URL เพจ เช่น https://facebook.com/pagename"
                    value={pageUrls}
                    onChange={(e) => setPageUrls(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1 bg-slate-900/50 border-slate-600"
                  />
                )}
                <Button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">ค้นหา</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-slate-600"
                >
                  <Filter className="w-4 h-4" />
                  <ChevronDown
                    className={`w-4 h-4 ml-1 transition-transform ${
                      showFilters ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>

              {/* Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700"
                  >
                    {/* Country */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        ประเทศ
                      </label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-sm text-white"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        สถานะแอด
                      </label>
                      <select
                        value={activeStatus}
                        onChange={(e) => setActiveStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-sm text-white"
                      >
                        <option value="all">ทั้งหมด</option>
                        <option value="active">Active เท่านั้น</option>
                        <option value="inactive">Inactive เท่านั้น</option>
                      </select>
                    </div>

                    {/* Limit */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        จำนวนผลลัพธ์
                      </label>
                      <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-sm text-white"
                      >
                        <option value={10}>10 แอด</option>
                        <option value={20}>20 แอด</option>
                        <option value={50}>50 แอด</option>
                        <option value={100}>100 แอด</option>
                      </select>
                    </div>

                    {/* Debug */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Debug
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => handleSearch(true)}
                        disabled={loading}
                        className="w-full border-slate-600"
                      >
                        <Bug className="w-4 h-4 mr-2" />
                        Debug Raw Data
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Debug Data */}
        {debugData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-400">
                  <Bug className="w-5 h-5" />
                  Debug Raw Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-gray-300 overflow-auto max-h-96 p-4 bg-slate-900 rounded-lg">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    📢 พบ {result.totalAds} แอด
                  </h2>
                  <p className="text-sm text-gray-400">
                    คำค้นหา:{" "}
                    <span className="text-blue-400">"{result.query}"</span> |
                    ประเทศ: {result.country}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1.5 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="font-semibold text-green-400">
                    {result.activeAds}
                  </span>
                  <span className="text-gray-400">Active</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-gray-500/20 px-3 py-1.5 text-sm">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-gray-400">
                    {result.inactiveAds}
                  </span>
                  <span className="text-gray-500">Inactive</span>
                </div>
              </div>
            </div>

            {/* Ads Grid */}
            {result.ads.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  ไม่พบแอด
                </h3>
                <p className="text-gray-400">
                  ลองเปลี่ยน keyword หรือ Page ID
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!result && !loading && !debugData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Megaphone className="w-12 h-12 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              ค้นหาแอดของคู่แข่ง
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              ใส่ keyword หรือ Page ID เพื่อดูแอดที่กำลังรันอยู่ใน Facebook Ad
              Library
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["ลดน้ำหนัก", "skincare", "fitness", "อาหารเสริม", "ครีมหน้าใส"].map(
                (kw) => (
                  <button
                    key={kw}
                    onClick={() => {
                      setSearchType("keyword");
                      setQuery(kw);
                    }}
                    className="px-3 py-1.5 rounded-full bg-slate-800 text-sm text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {kw}
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
