"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Share2,
  TrendingUp,
  Facebook,
  Instagram,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentCard } from "@/components/dashboard/content-card";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { searchApi } from "@/lib/api";
import { formatNumber, formatDateTime, getPlatformColor } from "@/lib/utils";

const platformIcons: Record<string, React.ReactNode> = {
  FACEBOOK: <Facebook className="h-5 w-5" />,
  INSTAGRAM: <Instagram className="h-5 w-5" />,
  TIKTOK: <span className="text-lg">🎵</span>,
};

export default function ResultsPage() {
  const params = useParams();
  const queryId = params.queryId as string;

  const { data: result, isLoading } = useQuery({
    queryKey: ["searchResult", queryId],
    queryFn: () => searchApi.getResults(queryId),
  });

  const { data: chartData } = useQuery({
    queryKey: ["chartData", queryId],
    queryFn: () => searchApi.getChartData(queryId),
    enabled: !!result,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-12 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-6xl">🔍</div>
        <h2 className="mb-2 text-xl font-semibold">ไม่พบข้อมูล</h2>
        <p className="mb-4 text-muted-foreground">
          ไม่พบผลการค้นหาที่ต้องการ หรือคุณไม่มีสิทธิ์เข้าถึง
        </p>
        <Button variant="viral" asChild>
          <Link href="/dashboard/search">ค้นหาใหม่</Link>
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalLikes = result.contents.reduce((sum, c) => sum + c.likesCount, 0);
  const totalComments = result.contents.reduce(
    (sum, c) => sum + c.commentsCount,
    0
  );
  const totalShares = result.contents.reduce(
    (sum, c) => sum + c.sharesCount,
    0
  );
  const totalEngagement = result.contents.reduce(
    (sum, c) => sum + c.engagementScore,
    0
  );

  const stats = [
    { label: "โพสต์ทั้งหมด", value: result.resultCount, icon: "📝" },
    { label: "รวม Likes", value: totalLikes, icon: "❤️" },
    { label: "รวม Comments", value: totalComments, icon: "💬" },
    { label: "รวม Shares", value: totalShares, icon: "🔄" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/history">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 ${getPlatformColor(
                result.contents[0]?.platform || "FACEBOOK"
              )}`}
            >
              {platformIcons[result.contents[0]?.platform || "FACEBOOK"]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">ผลการค้นหา</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  {result.status}
                </span>
              </div>
              <p className="text-muted-foreground">
                พบ {result.resultCount} โพสต์ที่มี Engagement
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            แชร์
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 p-6">
                <span className="text-3xl">{stat.icon}</span>
                <div>
                  <p className="text-2xl font-bold">
                    {formatNumber(stat.value)}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Total Engagement Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-viral-500/30 bg-gradient-to-r from-viral-500/10 to-ocean-500/10">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-viral-500/20">
                <TrendingUp className="h-7 w-7 text-viral-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  รวม Engagement ทั้งหมด
                </p>
                <p className="text-3xl font-bold gradient-text">
                  {formatNumber(totalEngagement)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                เฉลี่ยต่อโพสต์
              </p>
              <p className="text-xl font-semibold">
                {formatNumber(
                  Math.round(totalEngagement / result.resultCount) || 0
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="grid" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">📊 กริด</TabsTrigger>
            <TabsTrigger value="chart">📈 กราฟ</TabsTrigger>
            <TabsTrigger value="list">📝 รายการ</TabsTrigger>
          </TabsList>
        </div>

        {/* Grid View */}
        <TabsContent value="grid">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.contents.map((content, index) => (
              <ContentCard key={content.id} content={content} rank={index} />
            ))}
          </div>
        </TabsContent>

        {/* Chart View */}
        <TabsContent value="chart">
          <EngagementChart data={chartData?.chartData} />
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {result.contents.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted">
                      {content.imageUrl && (
                        <img
                          src={content.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {content.caption || "ไม่มีข้อความ"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {content.pageName} •{" "}
                        {content.postedAt && formatDateTime(content.postedAt)}
                      </p>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">
                          {formatNumber(content.likesCount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">
                          {formatNumber(content.commentsCount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Comments
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">
                          {formatNumber(content.sharesCount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Shares</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-viral-500">
                          {formatNumber(content.engagementScore)}
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ดูโพสต์
                      </a>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
