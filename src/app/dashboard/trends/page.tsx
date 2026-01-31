"use client";

import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, Flame, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";

// Mock trending data
const trendingTopics = [
  { name: "#marketing", posts: 15420, change: 23 },
  { name: "#socialmedia", posts: 12300, change: 18 },
  { name: "#viral", posts: 9800, change: 45 },
  { name: "#content", posts: 8500, change: 12 },
  { name: "#thailand", posts: 7200, change: -5 },
  { name: "#business", posts: 6100, change: 8 },
];

const topPages = [
  {
    name: "Marketing Tips Thailand",
    platform: "FACEBOOK",
    followers: 250000,
    engagement: 4.5,
    trend: "up",
  },
  {
    name: "Content Creator Hub",
    platform: "INSTAGRAM",
    followers: 180000,
    engagement: 5.2,
    trend: "up",
  },
  {
    name: "Digital Marketing Pro",
    platform: "FACEBOOK",
    followers: 120000,
    engagement: 3.8,
    trend: "stable",
  },
  {
    name: "Social Media Expert",
    platform: "INSTAGRAM",
    followers: 95000,
    engagement: 6.1,
    trend: "up",
  },
  {
    name: "Business Growth TH",
    platform: "FACEBOOK",
    followers: 85000,
    engagement: 3.2,
    trend: "down",
  },
];

export default function TrendsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20">
            <TrendingUp className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">เทรนด์</h1>
            <p className="text-muted-foreground">
              ติดตามเทรนด์และหัวข้อที่กำลังได้รับความนิยม
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          กรอง
        </Button>
      </motion.div>

      {/* Coming Soon Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-viral-500/30 bg-gradient-to-r from-viral-500/10 to-orange-500/10">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-viral-500/20">
              <Flame className="h-7 w-7 text-viral-500" />
            </div>
            <div>
              <h3 className="font-semibold">ฟีเจอร์นี้กำลังพัฒนา</h3>
              <p className="text-sm text-muted-foreground">
                เราจะเพิ่มข้อมูลเทรนด์แบบ Real-time จากหลายแพลตฟอร์มเร็วๆ นี้
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="topics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="topics">🔥 หัวข้อยอดนิยม</TabsTrigger>
          <TabsTrigger value="pages">📱 เพจยอดนิยม</TabsTrigger>
          <TabsTrigger value="content">📝 คอนเทนต์ยอดนิยม</TabsTrigger>
        </TabsList>

        {/* Trending Topics */}
        <TabsContent value="topics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trendingTopics.map((topic, index) => (
              <motion.div
                key={topic.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-border/50 transition-all hover:border-viral-500/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-viral-500">
                        {topic.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(topic.posts)} โพสต์
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        topic.change > 0
                          ? "text-green-500"
                          : topic.change < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      <ArrowUpRight
                        className={`h-4 w-4 ${
                          topic.change < 0 ? "rotate-180" : ""
                        }`}
                      />
                      {Math.abs(topic.change)}%
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Top Pages */}
        <TabsContent value="pages">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">เพจที่มี Engagement สูง</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {topPages.map((page, index) => (
                  <motion.div
                    key={page.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-viral-500/20 to-ocean-500/20">
                      <span className="text-2xl">📱</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{page.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {page.platform} • {formatNumber(page.followers)}{" "}
                        followers
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-viral-500">
                        {page.engagement}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Engagement Rate
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Content */}
        <TabsContent value="content">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">เร็วๆ นี้</h3>
            <p className="text-muted-foreground">
              ฟีเจอร์แสดงคอนเทนต์ยอดนิยมกำลังพัฒนา
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
