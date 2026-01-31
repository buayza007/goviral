"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Flame,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, truncateText } from "@/lib/utils";
import type { Content } from "@/lib/api";

interface ContentCardProps {
  content: Content & { rank?: number; viralScore?: number };
  rank?: number;
}

function getScoreColor(score: number): string {
  if (score >= 100000) return "text-yellow-400";
  if (score >= 50000) return "text-orange-400";
  if (score >= 20000) return "text-viral-400";
  return "text-green-400";
}

function getScoreLabel(score: number): string {
  if (score >= 100000) return "🔥 MEGA VIRAL";
  if (score >= 50000) return "🚀 SUPER VIRAL";
  if (score >= 20000) return "⚡ VIRAL";
  return "📈 TRENDING";
}

export function ContentCard({ content, rank }: ContentCardProps) {
  const displayRank = rank !== undefined ? rank : (content.rank ? content.rank - 1 : undefined);
  const viralScore = content.viralScore || content.engagementScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: displayRank !== undefined ? displayRank * 0.1 : 0 }}
    >
      <Card className="content-card group overflow-hidden hover:shadow-xl hover:shadow-viral-500/10 transition-all duration-300">
        {/* Image Header */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {content.imageUrl ? (
            <Image
              src={content.imageUrl}
              alt={content.caption || "Post image"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-viral-500/20 to-ocean-500/20">
              <span className="text-5xl">📱</span>
            </div>
          )}

          {/* Rank Badge */}
          {displayRank !== undefined && displayRank < 5 && (
            <div className="absolute left-3 top-3">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold backdrop-blur-md shadow-lg ${
                  displayRank === 0
                    ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900"
                    : displayRank === 1
                    ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800"
                    : displayRank === 2
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-amber-100"
                    : "bg-black/60 text-white"
                }`}
              >
                {displayRank === 0 ? (
                  <Trophy className="h-4 w-4" />
                ) : (
                  <span>{displayRank === 1 ? "🥈" : displayRank === 2 ? "🥉" : `#${displayRank + 1}`}</span>
                )}
                {displayRank === 0 && "อันดับ 1"}
              </div>
            </div>
          )}

          {/* Viral Score Badge */}
          <div className="absolute right-3 top-3">
            <div className={`flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-sm font-bold backdrop-blur-md ${getScoreColor(viralScore)}`}>
              <Flame className="h-4 w-4" />
              {formatNumber(viralScore)}
            </div>
          </div>

          {/* Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* View Button */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 transition-all duration-300 group-hover:opacity-100">
            <span className={`text-sm font-bold ${getScoreColor(viralScore)}`}>
              {getScoreLabel(viralScore)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2 bg-white/90 text-black hover:bg-white"
              onClick={() => window.open(content.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              ดูโพสต์
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {/* Caption */}
          <p className="mb-4 text-sm leading-relaxed text-foreground/90 min-h-[60px]">
            {content.caption
              ? truncateText(content.caption, 120)
              : "ไม่มีข้อความ"}
          </p>

          {/* Engagement Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatBadge
              icon={<Heart className="h-4 w-4" />}
              value={content.likesCount}
              label="Likes"
              color="text-pink-500"
              bgColor="bg-pink-500/10"
              multiplier="×1"
            />
            <StatBadge
              icon={<MessageCircle className="h-4 w-4" />}
              value={content.commentsCount}
              label="Comments"
              color="text-blue-500"
              bgColor="bg-blue-500/10"
              multiplier="×3"
            />
            <StatBadge
              icon={<Share2 className="h-4 w-4" />}
              value={content.sharesCount}
              label="Shares"
              color="text-green-500"
              bgColor="bg-green-500/10"
              multiplier="×5"
            />
          </div>

          {/* Viral Score Bar */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Viral Score</span>
              <span className={`text-sm font-bold ${getScoreColor(viralScore)}`}>
                {formatNumber(viralScore)} pts
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((viralScore / 200000) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full rounded-full bg-gradient-to-r from-viral-500 to-orange-500"
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

interface StatBadgeProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  bgColor: string;
  multiplier: string;
}

function StatBadge({ icon, value, label, color, bgColor, multiplier }: StatBadgeProps) {
  return (
    <div className={`flex flex-col items-center rounded-xl p-3 ${bgColor} transition-transform hover:scale-105`}>
      <div className={`mb-1 ${color}`}>{icon}</div>
      <span className="text-sm font-bold">{formatNumber(value)}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[9px] font-medium ${color}`}>{multiplier}</span>
    </div>
  );
}
