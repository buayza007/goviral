"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Facebook,
  Instagram,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime, getPlatformBgColor, getPlatformColor } from "@/lib/utils";
import type { SearchQuery } from "@/lib/api";

interface RecentSearchesProps {
  searches?: SearchQuery[];
  isLoading?: boolean;
}

const platformIcons: Record<string, React.ReactNode> = {
  FACEBOOK: <Facebook className="h-4 w-4" />,
  INSTAGRAM: <Instagram className="h-4 w-4" />,
  TIKTOK: <span className="text-sm">🎵</span>,
};

const statusIcons: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  PROCESSING: <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />,
  PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function RecentSearches({ searches, isLoading }: RecentSearchesProps) {
  const demoSearches: SearchQuery[] = [
    {
      id: "1",
      keyword: "Marketing Tips",
      platform: "FACEBOOK",
      status: "COMPLETED",
      resultCount: 15,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      keyword: "Content Creator",
      platform: "INSTAGRAM",
      status: "COMPLETED",
      resultCount: 8,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "3",
      keyword: "Digital Marketing",
      platform: "FACEBOOK",
      status: "PROCESSING",
      resultCount: 0,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const displaySearches = searches && searches.length > 0 ? searches : demoSearches;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
            <Clock className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">การค้นหาล่าสุด</h3>
            <p className="text-sm font-normal text-muted-foreground">
              ประวัติการค้นหาของคุณ
            </p>
          </div>
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/history" className="gap-1">
            ดูทั้งหมด
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displaySearches.map((search, index) => (
              <motion.div
                key={search.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link href={`/dashboard/results/${search.id}`}>
                  <div className="group flex items-center gap-4 rounded-xl border border-border/50 bg-muted/30 p-4 transition-all duration-200 hover:border-viral-500/50 hover:bg-muted/50">
                    {/* Platform Icon */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${getPlatformBgColor(
                        search.platform
                      )} ${getPlatformColor(search.platform)}`}
                    >
                      {platformIcons[search.platform]}
                    </div>

                    {/* Search Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{search.keyword}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDateTime(search.createdAt)}</span>
                        <span>•</span>
                        <span>{search.resultCount} โพสต์</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {statusIcons[search.status]}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && displaySearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">ยังไม่มีประวัติการค้นหา</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/dashboard/search">เริ่มค้นหาตอนนี้</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
