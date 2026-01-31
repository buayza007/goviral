"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, Facebook, Instagram, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  "แฟชั่น2024",
  "ฟิตเนส",
  "ท่องเที่ยว",
  "เงินออม",
  "สุขภาพ",
];

export function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState<"FACEBOOK" | "INSTAGRAM" | "TIKTOK">(
    "FACEBOOK"
  );
  const [maxPosts, setMaxPosts] = useState(5);
  const [demoMode, setDemoMode] = useState(true);

  const searchMutation = useMutation({
    mutationFn: async () => {
      return searchApi.syncSearch({ keyword, platform, maxPosts, demoMode });
    },
    onSuccess: (result) => {
      toast({
        title: "🎉 ค้นหาสำเร็จ!",
        description: `พบ ${result.resultCount} โพสต์ที่น่าสนใจ${result.isDemo ? " (Demo Mode)" : ""}`,
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
        description: "ใส่คำค้นหาหรือชื่อ Page ที่ต้องการ",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setKeyword(suggestion);
  };

  return (
    <Card className="border-viral-500/20 bg-gradient-to-br from-card to-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-viral-500/20">
            <Search className="h-5 w-5 text-viral-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">ค้นหา Viral Content</h2>
            <p className="text-sm font-normal text-muted-foreground">
              พิมพ์คำค้นหาเพื่อดูโพสต์ที่มี Engagement สูงสุด
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-500">Demo Mode</p>
                <p className="text-xs text-muted-foreground">
                  ใช้ข้อมูลตัวอย่างเพื่อทดสอบระบบ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDemoMode(!demoMode)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                demoMode ? "bg-amber-500" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  demoMode ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Keyword Input */}
            <div className="space-y-2">
              <Label htmlFor="keyword" className="text-sm font-medium">
                คำค้นหา
              </Label>
              <div className="relative">
                <Input
                  id="keyword"
                  placeholder="พิมพ์คำค้นหา เช่น ลดน้ำหนัก, การตลาด..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-12 pl-4 pr-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Platform Select */}
            <div className="space-y-2">
              <Label htmlFor="platform" className="text-sm font-medium">
                แพลตฟอร์ม
              </Label>
              <Select
                value={platform}
                onValueChange={(v) =>
                  setPlatform(v as "FACEBOOK" | "INSTAGRAM" | "TIKTOK")
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACEBOOK">
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-500" />
                      Facebook
                    </div>
                  </SelectItem>
                  <SelectItem value="INSTAGRAM">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      Instagram
                    </div>
                  </SelectItem>
                  <SelectItem value="TIKTOK" disabled>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">🎵</span>
                      TikTok (เร็วๆ นี้)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    keyword === suggestion
                      ? "bg-viral-500 text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Max Posts Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                จำนวนโพสต์ที่ต้องการ
              </Label>
              <span className="text-sm text-viral-500 font-semibold">
                {maxPosts} โพสต์
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="5"
              value={maxPosts}
              onChange={(e) => setMaxPosts(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-viral-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {/* Submit Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              variant="viral"
              size="xl"
              className="w-full"
              disabled={searchMutation.isPending}
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  กำลังค้นหา Viral Content...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  🔥 ค้นหาโพสต์ไวรัล
                </>
              )}
            </Button>
          </motion.div>

          {/* Tips */}
          {searchMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-viral-500/10 p-4 text-center"
            >
              <p className="text-sm text-viral-400">
                💡 กำลังวิเคราะห์ข้อมูล... อาจใช้เวลาสักครู่
              </p>
            </motion.div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
