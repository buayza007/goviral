"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, Facebook, Sparkles, Zap, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchApi, type SearchResult } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

interface SearchFormProps {
  onSearchComplete?: (result: SearchResult) => void;
}

// Example Facebook pages to try
const examplePages = [
  { name: "Drama-addict", url: "Drama-addict" },
  { name: "กินอะไรดี", url: "kinginnaidee" },
  { name: "Ookbee", url: "ookbee" },
  { name: "Shopee", url: "ShopeeTH" },
  { name: "Lazada", url: "LazadaThailand" },
];

export function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [keyword, setKeyword] = useState("");
  const [demoMode, setDemoMode] = useState(false); // Default to Live mode now

  const searchMutation = useMutation({
    mutationFn: async () => {
      return searchApi.syncSearch({ 
        keyword, 
        platform: "FACEBOOK", 
        maxPosts: 5, 
        demoMode 
      });
    },
    onSuccess: (result) => {
      const modeText = result.isDemo ? " (Demo)" : " (Real Data)";
      toast({
        title: "🔥 ค้นหาสำเร็จ!",
        description: `พบ ${result.resultCount} โพสต์ไวรัล${modeText}`,
        variant: "default",
      });
      onSearchComplete?.(result);
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถค้นหาได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "ใส่ URL หรือชื่อ Facebook Page",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate();
  };

  return (
    <Card className="border-viral-500/20 bg-gradient-to-br from-card to-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-viral-500/20">
            <Search className="h-5 w-5 text-viral-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Facebook Page Analyzer</h2>
            <p className="text-sm font-normal text-muted-foreground">
              วิเคราะห์โพสต์ไวรัลจาก Facebook Page
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Viral Score Formula Info */}
          <div className="rounded-xl bg-gradient-to-r from-viral-500/10 to-ocean-500/10 p-4 border border-viral-500/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-viral-500 mt-0.5" />
              <div>
                <p className="font-semibold text-viral-500">Viral Score Algorithm</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                    (Likes × 1) + (Comments × 3) + (Shares × 5)
                  </code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Shares มีค่ามากที่สุด → Comments → Likes
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border border-border">
            <div className="flex items-center gap-3">
              <Zap className={`h-5 w-5 ${demoMode ? "text-amber-500" : "text-green-500"}`} />
              <div>
                <p className={`font-medium ${demoMode ? "text-amber-600" : "text-green-600"}`}>
                  {demoMode ? "Demo Mode" : "🔴 Live Mode (Apify)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {demoMode 
                    ? "ใช้ข้อมูลตัวอย่าง" 
                    : "ดึงข้อมูลจริงจาก Facebook"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDemoMode(!demoMode)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                demoMode ? "bg-amber-500" : "bg-green-500"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                  demoMode ? "translate-x-1" : "translate-x-8"
                }`}
              />
            </button>
          </div>

          {/* Input Field */}
          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-sm font-medium">
              Facebook Page URL หรือชื่อ Page
            </Label>
            <div className="relative">
              <Input
                id="keyword"
                placeholder="เช่น Drama-addict หรือ https://facebook.com/Drama-addict"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-14 pl-4 pr-12 text-lg"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Facebook className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 ใส่ชื่อ Page หรือ URL เต็ม เช่น <code className="bg-muted px-1 rounded">Drama-addict</code>
            </p>
          </div>

          {/* Example Pages */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ตัวอย่าง Facebook Pages</Label>
            <div className="flex flex-wrap gap-2">
              {examplePages.map((page) => (
                <button
                  key={page.url}
                  type="button"
                  onClick={() => setKeyword(page.url)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    keyword === page.url
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-muted hover:bg-muted/80 hover:scale-105"
                  }`}
                >
                  <Facebook className="h-3.5 w-3.5" />
                  {page.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              variant="viral"
              size="xl"
              className="w-full h-14 text-lg"
              disabled={searchMutation.isPending || !keyword.trim()}
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  กำลังวิเคราะห์ Facebook Page...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  🔥 วิเคราะห์ Top 5 โพสต์ไวรัล
                </>
              )}
            </Button>
          </motion.div>

          {/* Loading Tips */}
          {searchMutation.isPending && !demoMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-blue-500/10 p-4 text-center border border-blue-500/20"
            >
              <p className="text-sm text-blue-400">
                ⏳ กำลังดึงข้อมูลจาก Facebook ผ่าน Apify... อาจใช้เวลา 30-90 วินาที
              </p>
            </motion.div>
          )}

          {/* How it works */}
          <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-viral-500" />
              วิธีการทำงาน
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>ระบบดึงโพสต์ล่าสุด 50 รายการจาก Facebook Page</li>
              <li>คำนวณ Viral Score จาก Likes, Comments, Shares</li>
              <li>จัดอันดับและแสดง Top 5 โพสต์ที่มี Engagement สูงสุด</li>
            </ol>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
