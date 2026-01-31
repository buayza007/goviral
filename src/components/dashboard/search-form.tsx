"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Loader2, 
  Cookie, 
  AlertCircle, 
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Bug,
  Copy,
  X,
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
  { value: "1d", label: "24 ชม.", icon: "⚡" },
  { value: "7d", label: "7 วัน", icon: "📅" },
  { value: "30d", label: "30 วัน", icon: "📆" },
];

const suggestedKeywords = [
  "ลดน้ำหนัก",
  "หุ้น",
  "คริปโต",
  "รีวิว",
  "อาหาร",
  "ท่องเที่ยว",
];

export function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [keyword, setKeyword] = useState("");
  const [cookies, setCookies] = useState("");
  const [since, setSince] = useState<"1d" | "7d" | "30d">("7d");
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cookieSaved, setCookieSaved] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    const savedCookie = localStorage.getItem("fb_cookie");
    if (savedCookie) {
      setCookies(savedCookie);
      setCookieSaved(true);
    }
  }, []);

  const saveCookie = () => {
    if (cookies.trim()) {
      localStorage.setItem("fb_cookie", cookies);
      setCookieSaved(true);
      toast({ title: "✅ บันทึก Cookie แล้ว" });
    }
  };

  // Debug function to see raw Apify data
  const runDebug = async () => {
    if (!keyword.trim() || !cookies.trim()) {
      toast({ title: "กรุณาใส่ keyword และ cookie", variant: "destructive" });
      return;
    }
    
    setDebugLoading(true);
    setDebugData(null);
    
    try {
      const res = await fetch("/api/debug-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, cookies }),
      });
      const data = await res.json();
      setDebugData(data);
      setShowDebug(true);
    } catch (err) {
      setDebugData({ error: String(err) });
      setShowDebug(true);
    } finally {
      setDebugLoading(false);
    }
  };

  const copyDebugData = () => {
    if (debugData) {
      navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      toast({ title: "📋 Copied!" });
    }
  };

  const searchMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, cookies, searchType: "posts", since, resultsLimit: 30 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Search failed");
      return data;
    },
    onSuccess: (result) => {
      toast({ title: "🔥 ค้นหาสำเร็จ!", description: `พบ ${result.resultCount} โพสต์` });
      onSearchComplete?.(result);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) { setErrorMessage("กรุณาใส่ keyword"); return; }
    if (!cookies.trim()) { setErrorMessage("กรุณาใส่ Cookie"); return; }
    searchMutation.mutate();
  };

  return (
    <>
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Facebook Viral Search
                </h2>
                <p className="text-sm font-normal text-gray-400">ค้นหาโพสต์ไวรัลด้วย keyword</p>
              </div>
            </div>
            {/* Debug Button */}
            <button
              type="button"
              onClick={runDebug}
              disabled={debugLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              {debugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
              Debug
            </button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Keyword */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                Keyword
              </Label>
              <Input
                placeholder="เช่น ลดน้ำหนัก, รีวิวสินค้า..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-12 text-lg bg-slate-800/50 border-slate-600 text-white placeholder:text-gray-500"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setKeyword(kw)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      keyword === kw
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700/50 text-gray-300 hover:bg-slate-700"
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
                {timeFilters.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setSince(f.value as any)}
                    className={`p-2 rounded-xl text-sm font-medium transition-all ${
                      since === f.value
                        ? "bg-green-500 text-white"
                        : "bg-slate-700/50 text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cookie */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Cookie className="h-4 w-4 text-orange-400" />
                  Facebook Cookie
                  {cookieSaved && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCookieHelp(!showCookieHelp)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  วิธีดึง Cookie
                </button>
              </div>
              
              <div className="relative">
                <textarea
                  placeholder="วาง Cookie ที่นี่... (c_user=xxx; xs=xxx)"
                  value={cookies}
                  onChange={(e) => { setCookies(e.target.value); setCookieSaved(false); }}
                  rows={2}
                  className="w-full rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder:text-gray-500 p-3 text-sm font-mono resize-none focus:outline-none focus:border-orange-500"
                />
                {cookies && !cookieSaved && (
                  <button type="button" onClick={saveCookie} className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-orange-500 text-white rounded">
                    บันทึก
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showCookieHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl bg-slate-800 p-3 text-xs text-gray-400 space-y-1"
                  >
                    <p className="font-semibold text-white">📋 วิธีดึง Cookie:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Login Facebook</li>
                      <li>กด F12 → Application → Cookies</li>
                      <li>Copy <code className="bg-slate-700 px-1 rounded">c_user</code> และ <code className="bg-slate-700 px-1 rounded">xs</code></li>
                      <li>วางในรูปแบบ: c_user=xxx; xs=xxx</li>
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={searchMutation.isPending || !keyword.trim() || !cookies.trim()}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {searchMutation.isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />กำลังค้นหา...</>
              ) : (
                <><Search className="mr-2 h-5 w-5" />🔥 ค้นหาโพสต์ไวรัล</>
              )}
            </Button>

            {searchMutation.isPending && (
              <div className="text-center text-sm text-blue-400">
                ⏳ กำลังดึงข้อมูล... อาจใช้เวลา 30-120 วินาที
              </div>
            )}

            {/* Formula */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center">
              <span className="text-xs text-purple-400 font-mono">
                Viral Score = (Likes × 1) + (Comments × 3) + (Shares × 5)
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Debug Modal */}
      <AnimatePresence>
        {showDebug && debugData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowDebug(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bug className="w-5 h-5 text-amber-400" />
                  Debug: Raw Apify Data
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyDebugData}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => setShowDebug(false)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(80vh-60px)]">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
