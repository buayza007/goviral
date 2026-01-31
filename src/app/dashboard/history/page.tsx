"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowRight,
  Facebook,
  Instagram,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchApi, type SearchQuery } from "@/lib/api";
import { formatDateTime, getPlatformBgColor, getPlatformColor } from "@/lib/utils";

const platformIcons: Record<string, React.ReactNode> = {
  FACEBOOK: <Facebook className="h-5 w-5" />,
  INSTAGRAM: <Instagram className="h-5 w-5" />,
  TIKTOK: <span className="text-lg">🎵</span>,
};

const statusConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  COMPLETED: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "สำเร็จ",
    color: "text-green-500 bg-green-500/10",
  },
  FAILED: {
    icon: <XCircle className="h-4 w-4" />,
    label: "ล้มเหลว",
    color: "text-red-500 bg-red-500/10",
  },
  PROCESSING: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "กำลังประมวลผล",
    color: "text-yellow-500 bg-yellow-500/10",
  },
  PENDING: {
    icon: <Clock className="h-4 w-4" />,
    label: "รอดำเนินการ",
    color: "text-muted-foreground bg-muted",
  },
};

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["searchHistory"],
    queryFn: () => searchApi.getHistory(50, 0),
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">
            <History className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ประวัติการค้นหา</h1>
            <p className="text-muted-foreground">
              ดูและจัดการประวัติการค้นหาทั้งหมดของคุณ
            </p>
          </div>
        </div>
        <Button variant="viral" asChild>
          <Link href="/dashboard/search" className="gap-2">
            <Search className="h-5 w-5" />
            ค้นหาใหม่
          </Link>
        </Button>
      </motion.div>

      {/* History List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>การค้นหาทั้งหมด</span>
            {history && (
              <span className="text-sm font-normal text-muted-foreground">
                {history.total} รายการ
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : history?.queries && history.queries.length > 0 ? (
            <div className="space-y-3">
              {history.queries.map((query, index) => (
                <SearchHistoryItem key={query.id} query={query} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">ยังไม่มีประวัติ</h3>
              <p className="mb-4 text-muted-foreground">
                เริ่มค้นหา Viral Content เพื่อดูประวัติการค้นหา
              </p>
              <Button variant="viral" asChild>
                <Link href="/dashboard/search">เริ่มค้นหาตอนนี้</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SearchHistoryItem({
  query,
  index,
}: {
  query: SearchQuery;
  index: number;
}) {
  const status = statusConfig[query.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dashboard/results/${query.id}`}>
        <div className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-viral-500/50 hover:bg-muted/50">
          {/* Platform Icon */}
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border ${getPlatformBgColor(
              query.platform
            )} ${getPlatformColor(query.platform)}`}
          >
            {platformIcons[query.platform]}
          </div>

          {/* Query Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{query.keyword}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.color}`}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{query.platform}</span>
              <span>•</span>
              <span>{formatDateTime(query.createdAt)}</span>
              <span>•</span>
              <span>{query.resultCount} โพสต์</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                // Handle delete
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
            </Button>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
