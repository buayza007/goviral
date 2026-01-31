"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ExternalLink,
  TrendingUp,
  Flame,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatNumber,
  truncateText,
  getEngagementLevel,
  formatDate,
} from "@/lib/utils";
import type { Content } from "@/lib/api";

interface ContentCardProps {
  content: Content;
  rank?: number;
}

export function ContentCard({ content, rank }: ContentCardProps) {
  const engagementLevel = getEngagementLevel(content.engagementScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank ? rank * 0.05 : 0 }}
    >
      <Card className="content-card group overflow-hidden">
        {/* Image Header */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {content.imageUrl ? (
            <Image
              src={content.imageUrl}
              alt={content.caption || "Post image"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-viral-500/20 to-ocean-500/20">
              <span className="text-4xl">📷</span>
            </div>
          )}

          {/* Rank Badge */}
          {rank !== undefined && rank < 3 && (
            <div className="absolute left-3 top-3">
              <div
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold backdrop-blur-sm ${
                  rank === 0
                    ? "bg-yellow-500/90 text-yellow-900"
                    : rank === 1
                    ? "bg-gray-300/90 text-gray-800"
                    : "bg-amber-600/90 text-amber-100"
                }`}
              >
                {rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"} #{rank + 1}
              </div>
            </div>
          )}

          {/* Viral Badge */}
          <div className="absolute right-3 top-3">
            <div
              className={`flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-sm font-medium backdrop-blur-sm ${engagementLevel.color}`}
            >
              {content.engagementScore >= 10000 && (
                <Flame className="h-4 w-4" />
              )}
              {engagementLevel.label}
            </div>
          </div>

          {/* Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* View Button */}
          <div className="absolute bottom-3 right-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
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
          {/* Page Name */}
          {content.pageName && (
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20">
                <span className="text-xs">📱</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {content.pageName}
              </span>
              {content.postedAt && (
                <span className="text-xs text-muted-foreground">
                  • {formatDate(content.postedAt)}
                </span>
              )}
            </div>
          )}

          {/* Caption */}
          <p className="mb-4 text-sm leading-relaxed text-foreground/90">
            {content.caption
              ? truncateText(content.caption, 150)
              : "ไม่มีข้อความ"}
          </p>

          {/* Engagement Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatBadge
              icon={<Heart className="h-4 w-4" />}
              value={content.likesCount}
              label="Likes"
              color="text-pink-500"
            />
            <StatBadge
              icon={<MessageCircle className="h-4 w-4" />}
              value={content.commentsCount}
              label="Comments"
              color="text-blue-500"
            />
            <StatBadge
              icon={<Share2 className="h-4 w-4" />}
              value={content.sharesCount}
              label="Shares"
              color="text-green-500"
            />
            <StatBadge
              icon={<TrendingUp className="h-4 w-4" />}
              value={content.engagementScore}
              label="Score"
              color="text-viral-500"
              highlight
            />
          </div>

          {/* View Count (if available) */}
          {content.viewsCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{formatNumber(content.viewsCount)} views</span>
            </div>
          )}
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
  highlight?: boolean;
}

function StatBadge({ icon, value, label, color, highlight }: StatBadgeProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl p-2 transition-colors ${
        highlight ? "bg-viral-500/10" : "bg-muted/50 hover:bg-muted"
      }`}
    >
      <div className={`mb-1 ${color}`}>{icon}</div>
      <span
        className={`text-sm font-bold ${highlight ? "text-viral-500" : ""}`}
      >
        {formatNumber(value)}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
