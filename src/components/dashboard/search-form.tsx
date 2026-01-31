"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, Facebook, Sparkles, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchApi, type SearchResult } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

interface SearchFormProps {
  onSearchComplete?: (result: SearchResult) => void;
}

const suggestedKeywords = [
  "ลดน้ำหนัก",
  "การตลาดออนไลน์",
  "สูตรอาหาร",
  "แฟชั่น",
  "ฟิตเนส",
  "ท่องเที่ยว",
  "หุ้น",
  "คริปโต",
];

export function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [keyword, setKeyword] = useState("");
  const [demoMode, setDemoMode] = useState(false);

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
        title: "กรุณากรอก Keyword",
        description: "พิมพ์คำค้นหาที่ต้องการ",
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
            <h2 className="text-xl font-semibold">Facebook Viral Search</h2>
            <p className="text-sm font-normal text-muted-foreground">
              ค้นหาโพสต์ที่มี Engagement สูงสุดจาก Facebook
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
                  Shares มีค่ามากที่สุด → Comments → Likes (เพราะ Share = Virality แท้จริง)
                </p>
              </div>
            </div>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">
                  {demoMode ? "Demo Mode (ข้อมูลตัวอย่าง)" : "Live Mode (Apify API)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {demoMode 
                    ? "ใช้ข้อมูล Mock เพื่อทดสอบ" 
                    : "ดึงข้อมูลจริงจาก Facebook ผ่าน Apify"}
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
                  demoMode ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Keyword Input */}
          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-sm font-medium">
              คำค้นหา (Keyword)
            </Label>
            <div className="relative">
              <Input
                id="keyword"
                placeholder="พิมพ์คำค้นหา เช่น ลดน้ำหนัก, การตลาด, สูตรอาหาร..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-14 pl-4 pr-12 text-lg"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Suggested Keywords */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">คำค้นหาแนะนำ</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedKeywords.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setKeyword(suggestion)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    keyword === suggestion
                      ? "bg-viral-500 text-white shadow-lg shadow-viral-500/30"
                      : "bg-muted hover:bg-muted/80 hover:scale-105"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Facebook className="h-4 w-4 text-blue-500" />
            <span>ค้นหาจาก Facebook Search Posts</span>
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
                  กำลังค้นหา Viral Content...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  🔥 ค้นหา Top 5 โพสต์ไวรัล
                </>
              )}
            </Button>
          </motion.div>

          {/* Loading Tips */}
          {searchMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-viral-500/10 p-4 text-center"
            >
              <p className="text-sm text-viral-400">
                💡 {demoMode 
                  ? "กำลังสร้างข้อมูลตัวอย่าง..." 
                  : "กำลังดึงข้อมูลจาก Facebook... อาจใช้เวลา 30-60 วินาที"}
              </p>
            </motion.div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
