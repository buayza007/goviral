"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Flame, TrendingUp, Eye, MessageCircle, Share2, Heart } from "lucide-react";
import { SearchForm } from "@/components/dashboard/search-form";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import Image from "next/image";

interface SearchResult {
  queryId: string;
  status: string;
  resultCount: number;
  keyword: string;
  contents: {
    id: string;
    url: string;
    caption: string;
    imageUrl: string | null;
    pageName: string | null;
    postedAt: string | null;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    viralScore: number;
    rank: number;
  }[];
  scoringFormula?: string;
}

function getRankStyle(rank: number) {
  if (rank === 1) return { bg: "from-yellow-500 to-amber-600", icon: "🥇", label: "อันดับ 1" };
  if (rank === 2) return { bg: "from-gray-300 to-gray-400", icon: "🥈", label: "อันดับ 2" };
  if (rank === 3) return { bg: "from-amber-600 to-orange-700", icon: "🥉", label: "อันดับ 3" };
  return { bg: "from-slate-600 to-slate-700", icon: `#${rank}`, label: `อันดับ ${rank}` };
}

function getScoreLevel(score: number) {
  if (score >= 100000) return { label: "🔥 MEGA VIRAL", color: "text-yellow-400" };
  if (score >= 50000) return { label: "🚀 SUPER VIRAL", color: "text-orange-400" };
  if (score >= 20000) return { label: "⚡ VIRAL", color: "text-pink-400" };
  return { label: "📈 TRENDING", color: "text-green-400" };
}

export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const handleSearchComplete = (result: SearchResult) => {
    setSearchResult(result);
  };

  const totalStats = searchResult?.contents.reduce(
    (acc, c) => ({
      likes: acc.likes + c.likesCount,
      comments: acc.comments + c.commentsCount,
      shares: acc.shares + c.sharesCount,
      views: acc.views + c.viewsCount,
      score: acc.score + c.viralScore,
    }),
    { likes: 0, comments: 0, shares: 0, views: 0, score: 0 }
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-4"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Facebook Viral Search
          </h1>
          <p className="text-gray-400 mt-2">
            ค้นหาโพสต์ที่มี Engagement สูงสุดจาก Facebook ด้วย keyword
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <SearchForm onSearchComplete={handleSearchComplete} />
        </motion.div>

        {/* Results */}
        {searchResult && searchResult.contents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    🏆 Top {searchResult.resultCount} โพสต์ไวรัล
                  </h2>
                  <p className="text-sm text-gray-400">
                    คำค้นหา: <span className="text-blue-400 font-medium">"{searchResult.keyword}"</span>
                  </p>
                </div>
              </div>

              {/* Total Stats */}
              {totalStats && (
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1.5 text-sm">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="font-semibold text-pink-400">{formatNumber(totalStats.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1.5 text-sm">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-blue-400">{formatNumber(totalStats.comments)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1.5 text-sm">
                    <Share2 className="h-4 w-4 text-green-400" />
                    <span className="font-semibold text-green-400">{formatNumber(totalStats.shares)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-orange-500/20 px-3 py-1.5 text-sm">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="font-semibold text-orange-400">{formatNumber(totalStats.score)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Formula Badge */}
            {searchResult.scoringFormula && (
              <div className="px-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-gray-400">Formula:</span>
                  <code className="font-mono text-purple-400">{searchResult.scoringFormula}</code>
                </span>
              </div>
            )}

            {/* Content Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 px-4">
              {searchResult.contents.map((content, index) => {
                const rankStyle = getRankStyle(content.rank);
                const scoreLevel = getScoreLevel(content.viralScore);
                
                return (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all group hover:shadow-xl hover:shadow-purple-500/10">
                      {/* Image */}
                      <div className="relative aspect-video bg-slate-900">
                        {content.imageUrl ? (
                          <Image
                            src={content.imageUrl}
                            alt={content.caption || "Post"}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <span className="text-4xl">📱</span>
                          </div>
                        )}
                        
                        {/* Rank Badge */}
                        <div className="absolute top-2 left-2">
                          <div className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${rankStyle.bg} text-white text-xs font-bold shadow-lg`}>
                            {rankStyle.icon} {content.rank <= 3 ? "" : rankStyle.label}
                          </div>
                        </div>

                        {/* Score Badge */}
                        <div className="absolute top-2 right-2">
                          <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-xs font-bold flex items-center gap-1">
                            <Flame className={`h-3 w-3 ${scoreLevel.color}`} />
                            <span className={scoreLevel.color}>{formatNumber(content.viralScore)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        {/* Author */}
                        {content.pageName && (
                          <p className="text-xs text-gray-400 truncate">
                            👤 {content.pageName}
                          </p>
                        )}

                        {/* Caption */}
                        <p className="text-sm text-gray-300 line-clamp-3 min-h-[60px]">
                          {content.caption || "ไม่มีข้อความ"}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700">
                          <div className="text-center">
                            <p className="text-lg font-bold text-pink-400">{formatNumber(content.likesCount)}</p>
                            <p className="text-[10px] text-gray-500">Likes</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-400">{formatNumber(content.commentsCount)}</p>
                            <p className="text-[10px] text-gray-500">Comments</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-400">{formatNumber(content.sharesCount)}</p>
                            <p className="text-[10px] text-gray-500">Shares</p>
                          </div>
                        </div>

                        {/* View Post Button */}
                        {content.url && (
                          <a
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
                          >
                            ดูโพสต์ต้นฉบับ →
                          </a>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {searchResult && searchResult.contents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">ไม่พบโพสต์</h3>
            <p className="text-gray-400">ลองเปลี่ยน keyword หรือช่วงเวลาใหม่</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
