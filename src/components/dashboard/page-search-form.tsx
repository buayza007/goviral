"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Link2, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  HelpCircle,
  Bug,
  Copy,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

interface PageSearchFormProps {
  onSearchComplete?: (result: unknown) => void;
}

const examplePages = [
  { name: "Shopee Thailand", url: "https://www.facebook.com/ShopeeTH" },
  { name: "Lazada Thailand", url: "https://www.facebook.com/LazadaTH" },
  { name: "7-Eleven Thailand", url: "https://www.facebook.com/7ElevenThailand" },
];

export function PageSearchForm({ onSearchComplete }: PageSearchFormProps) {
  const [pageUrls, setPageUrls] = useState("");
  const [resultsLimit, setResultsLimit] = useState(50);
  const [showHelp, setShowHelp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<unknown>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Debug function
  const runDebug = async () => {
    if (!pageUrls.trim()) {
      toast({ title: "กรุณาใส่ URL เพจ", variant: "destructive" });
      return;
    }
    
    setDebugLoading(true);
    setDebugData(null);
    
    try {
      const res = await fetch("/api/debug-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageUrls }),
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
      const response = await fetch("/api/search-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageUrls, resultsLimit }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Scraping failed");
      return data;
    },
    onSuccess: (result) => {
      toast({ title: "🔥 ดึงข้อมูลสำเร็จ!", description: `พบ ${result.resultCount} โพสต์ไวรัล` });
      onSearchComplete?.(result);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageUrls.trim()) { 
      setErrorMessage("กรุณาใส่ URL เพจ Facebook"); 
      return; 
    }
    searchMutation.mutate();
  };

  const addExampleUrl = (url: string) => {
    setPageUrls(prev => {
      if (prev.includes(url)) return prev;
      return prev ? `${prev}\n${url}` : url;
    });
  };

  return (
    <>
      <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-950 to-teal-900">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  ค้นหาโพสต์ Viral จากเพจ
                </h2>
                <p className="text-sm font-normal text-gray-400">ดึงโพสต์จากเพจ Facebook โดยตรง</p>
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
            {/* Page URLs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-emerald-400" />
                  URL เพจ Facebook
                </Label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  วิธีใช้งาน
                </button>
              </div>
              
              <textarea
                placeholder={`ใส่ URL เพจ (1 เพจต่อบรรทัด)\n\nตัวอย่าง:\nhttps://www.facebook.com/ShopeeTH\nhttps://www.facebook.com/LazadaTH`}
                value={pageUrls}
                onChange={(e) => setPageUrls(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder:text-gray-500 p-3 text-sm font-mono resize-none focus:outline-none focus:border-emerald-500"
              />

              {/* Example pages */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-gray-500">ตัวอย่าง:</span>
                {examplePages.map((page) => (
                  <button
                    key={page.url}
                    type="button"
                    onClick={() => addExampleUrl(page.url)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {page.name}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl bg-slate-800 p-3 text-xs text-gray-400 space-y-1"
                  >
                    <p className="font-semibold text-white">📋 วิธีใช้งาน:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>เข้าไปที่เพจ Facebook ที่ต้องการ</li>
                      <li>Copy URL จาก browser (เช่น https://www.facebook.com/ShopeeTH)</li>
                      <li>วาง URL ในช่องด้านบน (ใส่ได้หลายเพจ)</li>
                      <li>กดปุ่ม &quot;ดึงโพสต์ Viral&quot;</li>
                    </ol>
                    <p className="text-emerald-400 mt-2">✨ ไม่ต้องใช้ Cookie! ดึงจากเพจสาธารณะได้เลย</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Results limit */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                จำนวนโพสต์ที่ดึง
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[20, 50, 100, 200].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setResultsLimit(num)}
                    className={`p-2 rounded-xl text-sm font-medium transition-all ${
                      resultsLimit === num
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700/50 text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {num} โพสต์
                  </button>
                ))}
              </div>
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
              disabled={searchMutation.isPending || !pageUrls.trim()}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {searchMutation.isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />กำลังดึงข้อมูล...</>
              ) : (
                <><FileText className="mr-2 h-5 w-5" />🔥 ดึงโพสต์ Viral</>
              )}
            </Button>

            {searchMutation.isPending && (
              <div className="text-center text-sm text-emerald-400">
                ⏳ กำลังดึงข้อมูลจากเพจ... อาจใช้เวลา 30-120 วินาที
              </div>
            )}

            {/* Features */}
            <div className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-teal-400">
                <div>✅ ไม่ต้องใช้ Cookie</div>
                <div>✅ ดึงจากเพจสาธารณะ</div>
                <div>✅ รองรับหลายเพจ</div>
                <div>✅ ดึงได้สูงสุด 500 โพสต์</div>
              </div>
            </div>

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
                  Debug: Raw Page Scraper Data
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
