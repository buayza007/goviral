"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Lightbulb, Trophy, Flame } from "lucide-react";
import { SearchForm } from "@/components/dashboard/search-form";
import { ContentCard } from "@/components/dashboard/content-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SearchResult } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const searchTips = [
  {
    icon: "🔥",
    title: "คำค้นหาเฉพาะเจาะจง",
    description: "ใช้คำที่ชัดเจน เช่น 'ลดน้ำหนัก 7 วัน' แทน 'ลดน้ำหนัก'",
  },
  {
    icon: "📊",
    title: "Viral Score Formula",
    description: "Likes×1 + Comments×3 + Shares×5 = คะแนนไวรัล",
  },
  {
    icon: "🚀",
    title: "Shares มีค่ามากที่สุด",
    description: "เพราะ Share แสดงถึงการแพร่กระจายที่แท้จริง",
  },
];

export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const handleSearchComplete = (result: SearchResult) => {
    setSearchResult(result);
  };

  // Calculate total stats
  const totalStats = searchResult?.contents.reduce(
    (acc, content) => ({
      likes: acc.likes + content.likesCount,
      comments: acc.comments + content.commentsCount,
      shares: acc.shares + content.sharesCount,
      score: acc.score + (content.viralScore || content.engagementScore),
    }),
    { likes: 0, comments: 0, shares: 0, score: 0 }
  );

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
              ค้นหาโพสต์ไวรัลจาก Facebook ด้วย Viral Scoring Algorithm
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
              วิธีใช้งาน
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
          className="space-y-6"
        >
          {/* Results Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  🏆 Top {searchResult.resultCount} โพสต์ไวรัล
                </h2>
                <p className="text-sm text-muted-foreground">
                  เรียงตาม Viral Score สูงสุด
                  {searchResult.isDemo && (
                    <span className="ml-2 text-amber-500">(Demo Mode)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Total Stats */}
            {totalStats && (
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1.5">
                  <span className="text-pink-500">❤️</span>
                  <span className="font-semibold">{formatNumber(totalStats.likes)}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5">
                  <span className="text-blue-500">💬</span>
                  <span className="font-semibold">{formatNumber(totalStats.comments)}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5">
                  <span className="text-green-500">🔄</span>
                  <span className="font-semibold">{formatNumber(totalStats.shares)}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-viral-500/10 px-3 py-1.5">
                  <Flame className="h-4 w-4 text-viral-500" />
                  <span className="font-semibold text-viral-500">{formatNumber(totalStats.score)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Scoring Formula Badge */}
          {searchResult.scoringFormula && (
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-viral-500" />
              <span className="text-muted-foreground">Formula:</span>
              <code className="font-mono text-viral-500">{searchResult.scoringFormula}</code>
            </div>
          )}

          {/* Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            ลองเปลี่ยนคำค้นหาหรือเปิด Demo Mode เพื่อทดสอบ
          </p>
        </motion.div>
      )}
    </div>
  );
}
