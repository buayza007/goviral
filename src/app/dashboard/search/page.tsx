"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Lightbulb } from "lucide-react";
import { SearchForm } from "@/components/dashboard/search-form";
import { ContentCard } from "@/components/dashboard/content-card";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SearchResult } from "@/lib/api";

const searchTips = [
  {
    icon: "💡",
    title: "ใช้ URL โดยตรง",
    description: "วาง URL ของ Facebook Page เพื่อผลลัพธ์ที่แม่นยำกว่า",
  },
  {
    icon: "🎯",
    title: "ชื่อ Page ที่ชัดเจน",
    description: "ใส่ชื่อ Page ที่ต้องการติดตามให้ถูกต้อง",
  },
  {
    icon: "📊",
    title: "เลือกจำนวนโพสต์",
    description: "ยิ่งดึงมาก ยิ่งได้ข้อมูลเยอะ แต่อาจใช้เวลานานขึ้น",
  },
];

export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const handleSearchComplete = (result: SearchResult) => {
    setSearchResult(result);
  };

  // Prepare chart data
  const chartData =
    searchResult?.contents.slice(0, 5).map((content, index) => ({
      name: `#${index + 1}`,
      label:
        content.caption?.substring(0, 30) + "..." ||
        content.pageName ||
        `Post ${index + 1}`,
      likes: content.likesCount,
      comments: content.commentsCount,
      shares: content.sharesCount,
      views: content.viewsCount,
      total: content.engagementScore,
      reactions: content.reactionsJson,
    })) || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-viral-500/20">
            <TrendingUp className="h-6 w-6 text-viral-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ค้นหา Viral Content</h1>
            <p className="text-muted-foreground">
              ค้นหาโพสต์ที่มี Engagement สูงจาก Facebook Page
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search Form */}
        <div className="lg:col-span-2">
          <SearchForm onSearchComplete={handleSearchComplete} />
        </div>

        {/* Tips Card */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              เคล็ดลับการค้นหา
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {searchTips.map((tip, index) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3 rounded-xl bg-muted/50 p-3"
              >
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <p className="font-medium">{tip.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Search Results */}
      {searchResult && searchResult.contents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Results Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                พบ {searchResult.resultCount} โพสต์
              </h2>
              <p className="text-sm text-muted-foreground">
                เรียงตาม Engagement Score สูงสุด
              </p>
            </div>
          </div>

          {/* Chart */}
          <EngagementChart data={chartData} />

          {/* Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {searchResult.contents.map((content, index) => (
              <ContentCard key={content.id} content={content} rank={index} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {searchResult && searchResult.contents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <span className="text-3xl">🔍</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold">ไม่พบโพสต์</h3>
          <p className="text-muted-foreground">
            ลองเปลี่ยนคำค้นหาหรือใช้ URL ของ Page โดยตรง
          </p>
        </motion.div>
      )}
    </div>
  );
}
