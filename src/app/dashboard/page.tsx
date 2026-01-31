"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { RecentSearches } from "@/components/dashboard/recent-searches";
import { ContentCard } from "@/components/dashboard/content-card";
import { searchApi } from "@/lib/api";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => searchApi.getDashboardStats(),
  });

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">
            ยินดีต้อนรับสู่ <span className="gradient-text">GoViral</span> 🚀
          </h1>
          <p className="text-muted-foreground">
            ค้นหา Viral Content และวิเคราะห์ Engagement จาก Social Media
          </p>
        </div>
        <Button variant="viral" size="lg" className="gap-2" asChild>
          <Link href="/dashboard/search">
            <Search className="h-5 w-5" />
            เริ่มค้นหา
          </Link>
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards stats={stats || undefined} isLoading={statsLoading} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <EngagementChart isLoading={statsLoading} />

        {/* Recent Searches */}
        <RecentSearches
          searches={stats?.recentQueries}
          isLoading={statsLoading}
        />
      </div>

      {/* Top Viral Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-viral-500/20">
              <Sparkles className="h-5 w-5 text-viral-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Top Viral Content</h2>
              <p className="text-sm text-muted-foreground">
                โพสต์ที่มี Engagement สูงสุดจากการค้นหาของคุณ
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/history">
              ดูทั้งหมด
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {statsLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : stats?.topContents && stats.topContents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.topContents.slice(0, 6).map((content, index) => (
              <ContentCard key={content.id} content={content} rank={index} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">ยังไม่มีข้อมูล</h3>
            <p className="mb-4 text-muted-foreground">
              เริ่มค้นหา Viral Content จาก Facebook หรือ Instagram เลย!
            </p>
            <Button variant="viral" asChild>
              <Link href="/dashboard/search">เริ่มค้นหาตอนนี้</Link>
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
