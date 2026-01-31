"use client";

import { motion } from "framer-motion";
import {
  Search,
  FileText,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface StatsCardsProps {
  stats?: {
    totalSearches: number;
    totalPosts: number;
    totalEngagement: number;
    platformBreakdown: { platform: string; count: number }[];
  };
  isLoading?: boolean;
}

const statItems = [
  {
    key: "totalSearches",
    label: "การค้นหาทั้งหมด",
    icon: Search,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
  },
  {
    key: "totalPosts",
    label: "โพสต์ที่พบ",
    icon: FileText,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-500/20",
    textColor: "text-green-400",
  },
  {
    key: "totalEngagement",
    label: "รวม Engagement",
    icon: TrendingUp,
    color: "from-viral-500 to-viral-600",
    bgColor: "bg-viral-500/20",
    textColor: "text-viral-400",
  },
  {
    key: "platforms",
    label: "แพลตฟอร์ม",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-400",
  },
];

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const getValue = (key: string) => {
    if (!stats) return 0;
    switch (key) {
      case "totalSearches":
        return stats.totalSearches;
      case "totalPosts":
        return stats.totalPosts;
      case "totalEngagement":
        return stats.totalEngagement;
      case "platforms":
        return stats.platformBreakdown?.length || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className="stat-card relative overflow-hidden border-border/50 p-6">
            {/* Background Gradient */}
            <div
              className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${item.color} opacity-10 blur-2xl`}
            />

            <div className="relative">
              {/* Icon */}
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.bgColor}`}
              >
                <item.icon className={`h-6 w-6 ${item.textColor}`} />
              </div>

              {/* Value */}
              <div className="mb-1">
                {isLoading ? (
                  <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <span className="text-3xl font-bold">
                    {formatNumber(getValue(item.key))}
                  </span>
                )}
              </div>

              {/* Label */}
              <p className="text-sm text-muted-foreground">{item.label}</p>

              {/* Trend Indicator (mock data) */}
              <div className="mt-3 flex items-center gap-1 text-xs">
                {index % 2 === 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+12%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-yellow-500" />
                    <span className="text-yellow-500">-3%</span>
                  </>
                )}
                <span className="text-muted-foreground">vs เดือนที่แล้ว</span>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
