"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Flame, MessageCircle, Share2, Heart, Eye, ExternalLink, Play } from "lucide-react";
import { SearchForm } from "@/components/dashboard/search-form";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface ContentItem {
  id: string;
  url: string;
  caption: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  pageName: string | null;
  authorAvatar: string | null;
  postedAt: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  viralScore: number;
  rank: number;
}

interface SearchResult {
  queryId: string;
  status: string;
  resultCount: number;
  keyword: string;
  contents: ContentItem[];
  scoringFormula?: string;
}

function getRankBadge(rank: number) {
  if (rank === 1) return { bg: "from-yellow-400 to-amber-500", icon: "🥇" };
  if (rank === 2) return { bg: "from-gray-300 to-gray-400", icon: "🥈" };
  if (rank === 3) return { bg: "from-amber-500 to-orange-600", icon: "🥉" };
  return { bg: "from-slate-500 to-slate-600", icon: `#${rank}` };
}

function getScoreLevel(score: number) {
  if (score >= 100) return { emoji: "🔥", color: "text-orange-400" };
  if (score >= 50) return { emoji: "⚡", color: "text-yellow-400" };
  if (score >= 20) return { emoji: "📈", color: "text-green-400" };
  return { emoji: "✨", color: "text-blue-400" };
}

// Format date in Thai timezone (GMT+7)
function formatThaiDate(date: string | null): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function PostCard({ content }: { content: ContentItem }) {
  const rank = getRankBadge(content.rank);
  const scoreLevel = getScoreLevel(content.viralScore);
  const hasImage = !!content.imageUrl;
  const hasVideo = !!content.videoUrl;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (content.rank - 1) * 0.1 }}
    >
      <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all group hover:shadow-xl h-full flex flex-col">
        {/* Media */}
        <div className="relative aspect-video bg-slate-900">
          {hasVideo && content.imageUrl ? (
            <div className="relative w-full h-full">
              <img
                src={content.imageUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : hasImage ? (
            <img
              src={content.imageUrl!}
              alt="Post"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { 
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231e293b" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%234b5563" font-size="30">📱</text></svg>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="text-5xl">📝</span>
            </div>
          )}
          
          {/* Rank Badge */}
          <div className="absolute top-2 left-2">
            <div className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${rank.bg} text-white text-xs font-bold shadow-lg`}>
              {rank.icon}
            </div>
          </div>

          {/* Score Badge */}
          <div className="absolute top-2 right-2">
            <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-xs font-bold flex items-center gap-1">
              <span>{scoreLevel.emoji}</span>
              <span className={scoreLevel.color}>{formatNumber(content.viralScore)}</span>
            </div>
          </div>

          {hasVideo && (
            <div className="absolute bottom-2 left-2">
              <div className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold flex items-center gap-1">
                <Play className="w-3 h-3" /> VIDEO
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Author & Date */}
          <div className="flex items-center justify-between mb-2">
            {content.pageName && (
              <div className="flex items-center gap-2">
                {content.authorAvatar && (
                  <img 
                    src={content.authorAvatar} 
                    alt={content.pageName}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span className="text-xs text-blue-400 font-medium truncate">{content.pageName}</span>
              </div>
            )}
            {content.postedAt && (
              <span className="text-[10px] text-gray-500" title={formatThaiDate(content.postedAt)}>
                📅 {formatThaiDate(content.postedAt)}
              </span>
            )}
          </div>

          {/* Caption */}
          <p className="text-sm text-gray-300 line-clamp-3 flex-1 min-h-[60px]">
            {content.caption || "ไม่มีข้อความ"}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-slate-700">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 text-pink-400" />
                <span className="text-sm font-bold text-pink-400">{formatNumber(content.likesCount)}</span>
              </div>
              <p className="text-[9px] text-gray-500">Likes</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MessageCircle className="w-3 h-3 text-blue-400" />
                <span className="text-sm font-bold text-blue-400">{formatNumber(content.commentsCount)}</span>
              </div>
              <p className="text-[9px] text-gray-500">Comments</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Share2 className="w-3 h-3 text-green-400" />
                <span className="text-sm font-bold text-green-400">{formatNumber(content.sharesCount)}</span>
              </div>
              <p className="text-[9px] text-gray-500">Shares</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Eye className="w-3 h-3 text-purple-400" />
                <span className="text-sm font-bold text-purple-400">{formatNumber(content.viewsCount)}</span>
              </div>
              <p className="text-[9px] text-gray-500">Views</p>
            </div>
          </div>

          {/* View Post */}
          {content.url && (
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              ดูโพสต์ต้นฉบับ
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const totalStats = searchResult?.contents.reduce(
    (acc, c) => ({
      likes: acc.likes + (c.likesCount || 0),
      comments: acc.comments + (c.commentsCount || 0),
      shares: acc.shares + (c.sharesCount || 0),
      views: acc.views + (c.viewsCount || 0),
      score: acc.score + (c.viralScore || 0),
    }),
    { likes: 0, comments: 0, shares: 0, views: 0, score: 0 }
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8 px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Facebook Viral Search
          </h1>
          <p className="text-gray-400 mt-2">ค้นหาโพสต์ที่มี Engagement สูงสุดจาก Facebook</p>
        </motion.div>

        {/* Search Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-2xl mx-auto">
          <SearchForm onSearchComplete={setSearchResult} />
        </motion.div>

        {/* Results */}
        {searchResult && searchResult.contents && searchResult.contents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">🏆 Top {searchResult.resultCount} โพสต์ไวรัล</h2>
                  <p className="text-sm text-gray-400">
                    คำค้นหา: <span className="text-blue-400">"{searchResult.keyword}"</span>
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

            {/* Formula */}
            {searchResult.scoringFormula && (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-gray-400">Formula:</span>
                <code className="font-mono text-purple-400">{searchResult.scoringFormula}</code>
              </div>
            )}

            {/* Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {searchResult.contents.map((content) => (
                <PostCard key={content.id} content={content} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty */}
        {searchResult && (!searchResult.contents || searchResult.contents.length === 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">ไม่พบโพสต์</h3>
            <p className="text-gray-400">ลองเปลี่ยน keyword หรือช่วงเวลา</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
