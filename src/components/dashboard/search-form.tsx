"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Loader2, 
  Cookie, 
  AlertCircle, 
  ChevronDown,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

interface SearchFormProps {
  onSearchComplete?: (result: any) => void;
}

const timeFilters = [
  { value: "1d", label: "24 ชั่วโมงล่าสุด", icon: "⚡" },
  { value: "7d", label: "7 วันล่าสุด", icon: "📅" },
  { value: "30d", label: "30 วันล่าสุด", icon: "📆" },
];

const suggestedKeywords = [
  "ลดน้ำหนัก",
  "หุ้น",
  "คริปโต",
  "อาหารคลีน",
  "ออกกำลังกาย",
  "รีวิว",
];

export function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [keyword, setKeyword] = useState("");
  const [cookies, setCookies] = useState("");
  const [since, setSince] = useState<"1d" | "7d" | "30d">("7d");
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cookieSaved, setCookieSaved] = useState(false);

  // Load saved cookie from localStorage
  useEffect(() => {
    const savedCookie = localStorage.getItem("fb_cookie");
    if (savedCookie) {
      setCookies(savedCookie);
      setCookieSaved(true);
    }
  }, []);

  // Save cookie to localStorage
  const saveCookie = () => {
    if (cookies.trim()) {
      localStorage.setItem("fb_cookie", cookies);
      setCookieSaved(true);
      toast({
        title: "✅ บันทึก Cookie แล้ว",
        description: "Cookie จะถูกเก็บไว้ใช้งานครั้งถัดไป",
      });
    }
  };

  const searchMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          cookies,
          searchType: "posts",
          since,
          resultsLimit: 30,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || "Search failed");
      }
      
      return data;
    },
    onSuccess: (result) => {
      toast({
        title: "🔥 ค้นหาสำเร็จ!",
        description: `พบ ${result.resultCount} โพสต์ไวรัลสำหรับ "${keyword}"`,
      });
      onSearchComplete?.(result);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim()) {
      setErrorMessage("กรุณาใส่ keyword ที่ต้องการค้นหา");
      return;
    }
    
    if (!cookies.trim()) {
      setErrorMessage("กรุณาใส่ Facebook Cookie");
      return;
    }
    
    searchMutation.mutate();
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Search className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Facebook Viral Search
            </h2>
            <p className="text-sm font-normal text-gray-400">
              ค้นหาโพสต์ไวรัลด้วย keyword จาก Facebook
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Keyword Input */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              Keyword ที่ต้องการค้นหา
            </Label>
            <Input
              placeholder="เช่น ลดน้ำหนัก, รีวิวสินค้า, หุ้น..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-14 text-lg bg-slate-800/50 border-slate-600 focus:border-blue-500 text-white placeholder:text-gray-500"
            />
            
            {/* Suggested Keywords */}
            <div className="flex flex-wrap gap-2 pt-2">
              {suggestedKeywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setKeyword(kw)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    keyword === kw
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Time Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-400" />
              ช่วงเวลา
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {timeFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSince(filter.value as any)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    since === filter.value
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                      : "bg-slate-700/50 text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  <span className="text-lg mr-1">{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cookie Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Cookie className="h-4 w-4 text-orange-400" />
                Facebook Cookie
                {cookieSaved && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    บันทึกแล้ว
                  </span>
                )}
              </Label>
              <button
                type="button"
                onClick={() => setShowCookieHelp(!showCookieHelp)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                วิธีดึง Cookie
              </button>
            </div>
            
            <div className="relative">
              <textarea
                placeholder="วาง Cookie ที่นี่..."
                value={cookies}
                onChange={(e) => {
                  setCookies(e.target.value);
                  setCookieSaved(false);
                }}
                rows={3}
                className="w-full rounded-xl bg-slate-800/50 border border-slate-600 focus:border-orange-500 text-white placeholder:text-gray-500 p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              {cookies && !cookieSaved && (
                <button
                  type="button"
                  onClick={saveCookie}
                  className="absolute bottom-3 right-3 px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  บันทึก Cookie
                </button>
              )}
            </div>

            {/* Cookie Help */}
            <AnimatePresence>
              {showCookieHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-slate-800 p-4 text-sm text-gray-300 space-y-2"
                >
                  <p className="font-semibold text-white">📋 วิธีดึง Facebook Cookie:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400">
                    <li>เปิด Facebook และ Login ให้เรียบร้อย</li>
                    <li>กด <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">F12</kbd> เพื่อเปิด Developer Tools</li>
                    <li>ไปที่แท็บ <strong className="text-white">Application</strong> → <strong className="text-white">Cookies</strong></li>
                    <li>หา <code className="px-1 bg-slate-700 rounded">c_user</code> และ <code className="px-1 bg-slate-700 rounded">xs</code></li>
                    <li>Copy ค่าในรูปแบบ: <code className="px-1 bg-slate-700 rounded text-xs">c_user=xxx; xs=xxx</code></li>
                  </ol>
                  <p className="text-xs text-gray-500 pt-2">
                    ⚠️ Cookie จะถูกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น ไม่ถูกส่งไปเซิร์ฟเวอร์เก็บ
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl bg-red-500/10 border border-red-500/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-400">เกิดข้อผิดพลาด</p>
                    <p className="text-sm text-red-300/80 mt-1">{errorMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={searchMutation.isPending || !keyword.trim() || !cookies.trim()}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-xl shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังค้นหาโพสต์ไวรัล...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                🔥 ค้นหา Top 5 โพสต์ไวรัล
              </>
            )}
          </Button>

          {/* Loading Status */}
          <AnimatePresence>
            {searchMutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-blue-400">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm">กำลังดึงข้อมูลจาก Facebook...</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">อาจใช้เวลา 30-120 วินาที</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scoring Info */}
          <div className="rounded-xl bg-gradient-to-r from-viral-500/10 to-orange-500/10 border border-viral-500/20 p-4">
            <p className="text-sm font-semibold text-viral-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Viral Score Formula
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              (Likes × 1) + (Comments × 3) + (Shares × 5)
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
