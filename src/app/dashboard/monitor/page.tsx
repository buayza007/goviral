"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Bell, 
  BellOff,
  Heart,
  MessageCircle,
  Share2,
  Flame,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  Bug,
  Copy,
  X,
  Clock,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { formatNumber } from "@/lib/utils";

interface MonitoredPage {
  id: string;
  pageUrl: string;
  pageName: string | null;
  isActive: boolean;
  checkInterval: number;
  lastCheckedAt: string | null;
  totalPosts: number;
  newPosts: number;
  createdAt: string;
}

interface MonitoredPost {
  id: string;
  postId: string;
  postUrl: string;
  caption: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  authorName: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  viralScore: number;
  postedAt: string | null;
  discoveredAt: string;
  isNew: boolean;
  page: {
    id: string;
    url: string;
    name: string | null;
  };
}

function formatTimeAgo(date: string | null): string {
  if (!date) return "ยังไม่เคยเช็ค";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

export default function MonitorPage() {
  const [pages, setPages] = useState<MonitoredPage[]>([]);
  const [posts, setPosts] = useState<MonitoredPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState("");
  const [newPageName, setNewPageName] = useState("");
  const [addingPage, setAddingPage] = useState(false);
  const [checkingPage, setCheckingPage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [totalNewPosts, setTotalNewPosts] = useState(0);

  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Fetch pages
  const fetchPages = async () => {
    try {
      const res = await fetch("/api/monitor/pages");
      const data = await res.json();
      if (data.error) {
        console.error("API Error:", data);
        toast({ title: "Error", description: data.message || data.error, variant: "destructive" });
      } else if (data.pages) {
        setPages(data.pages);
        setTotalNewPosts(data.newPosts || 0);
      }
    } catch (err) {
      console.error("Error fetching pages:", err);
      toast({ title: "Error fetching pages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Debug & Migration
  const runDebug = async () => {
    setDebugLoading(true);
    try {
      const res = await fetch("/api/monitor/pages?debug=true");
      const data = await res.json();
      setDebugData(data.debug || data);
      setShowDebug(true);
    } catch (err) {
      setDebugData({ error: String(err) });
      setShowDebug(true);
    } finally {
      setDebugLoading(false);
    }
  };

  const runMigration = async () => {
    setDebugLoading(true);
    try {
      const res = await fetch("/api/monitor/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ migrate: true }),
      });
      const data = await res.json();
      toast({ 
        title: data.success ? "✅ Migration สำเร็จ" : "❌ Migration ล้มเหลว",
        description: data.message 
      });
      if (data.success) {
        fetchPages();
      }
      setDebugData(data);
      setShowDebug(true);
    } catch (err) {
      toast({ title: "Migration failed", variant: "destructive" });
    } finally {
      setDebugLoading(false);
    }
  };

  // Fetch posts
  const fetchPosts = async (pageId?: string | null, newOnly = false) => {
    setPostsLoading(true);
    try {
      const params = new URLSearchParams();
      if (pageId) params.set("pageId", pageId);
      if (newOnly) params.set("new", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/monitor/posts?${params}`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (pages.length > 0) {
      fetchPosts(selectedPageId, showNewOnly);
    }
  }, [selectedPageId, showNewOnly, pages.length]);

  // Add new page
  const handleAddPage = async () => {
    if (!newPageUrl.trim()) {
      toast({ title: "กรุณาใส่ URL เพจ", variant: "destructive" });
      return;
    }

    setAddingPage(true);
    try {
      const res = await fetch("/api/monitor/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pageUrl: newPageUrl, 
          pageName: newPageName || undefined 
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to add page");
      }

      toast({ title: "✅ เพิ่มเพจสำเร็จ" });
      setNewPageUrl("");
      setNewPageName("");
      setShowAddForm(false);
      fetchPages();
    } catch (err) {
      toast({ 
        title: "เกิดข้อผิดพลาด", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setAddingPage(false);
    }
  };

  // Delete page
  const handleDeletePage = async (pageId: string) => {
    if (!confirm("ต้องการลบเพจนี้?")) return;

    try {
      const res = await fetch(`/api/monitor/pages?id=${pageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      
      toast({ title: "ลบเพจแล้ว" });
      fetchPages();
      if (selectedPageId === pageId) {
        setSelectedPageId(null);
      }
    } catch (err) {
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    }
  };

  // Check page for new posts
  const handleCheckPage = async (pageId: string, debug = false) => {
    setCheckingPage(pageId);
    if (debug) setDebugLoading(true);

    try {
      const res = await fetch("/api/monitor/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, debug }),
      });
      const data = await res.json();

      if (debug) {
        setDebugData(data);
        setShowDebug(true);
      } else {
        if (!res.ok) throw new Error(data.error || data.message);
        toast({ 
          title: `🔍 ${data.message}`,
          description: data.newPostsCount > 0 ? `พบโพสต์ใหม่ ${data.newPostsCount} โพสต์` : undefined
        });
        fetchPages();
        fetchPosts(selectedPageId, showNewOnly);
      }
    } catch (err) {
      toast({ 
        title: "เช็คไม่สำเร็จ", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setCheckingPage(null);
      setDebugLoading(false);
    }
  };

  // Mark posts as read
  const handleMarkAsRead = async (postIds?: string[]) => {
    try {
      const res = await fetch("/api/monitor/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          postIds,
          markAllAsRead: !postIds,
          pageId: selectedPageId 
        }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: `✓ ${data.message}` });
      fetchPages();
      fetchPosts(selectedPageId, showNewOnly);
    } catch (err) {
      toast({ title: "อัพเดทไม่สำเร็จ", variant: "destructive" });
    }
  };

  const copyDebugData = () => {
    if (debugData) {
      navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      toast({ title: "📋 Copied!" });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
              <Eye className="w-8 h-8 text-orange-400" />
              ติดตามเพจคู่แข่ง
            </h1>
            <p className="text-gray-400 mt-1">ติดตามโพสต์ใหม่จากเพจที่คุณสนใจ</p>
          </div>

          <div className="flex items-center gap-2">
            {totalNewPosts > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                <Bell className="w-4 h-4" />
                {totalNewPosts} โพสต์ใหม่
              </div>
            )}
            <button
              onClick={runDebug}
              disabled={debugLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
              title="Debug Database"
            >
              {debugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
              Debug
            </button>
            <button
              onClick={runMigration}
              disabled={debugLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              title="Run Migration"
            >
              {debugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Migrate DB
            </button>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มเพจ
            </Button>
          </div>
        </motion.div>

        {/* Add Page Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="URL เพจ Facebook (เช่น https://facebook.com/ShopeeTH)"
                        value={newPageUrl}
                        onChange={(e) => setNewPageUrl(e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <Input
                        placeholder="ชื่อเพจ (optional)"
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                    </div>
                    <Button 
                      onClick={handleAddPage} 
                      disabled={addingPage}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {addingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span className="ml-2">เพิ่ม</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowAddForm(false)}
                      className="text-gray-400"
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && pages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Eye className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">ยังไม่ได้ติดตามเพจใดๆ</h3>
            <p className="text-gray-400 mb-4">เพิ่มเพจที่ต้องการติดตามเพื่อดูโพสต์ใหม่</p>
            <Button onClick={() => setShowAddForm(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มเพจแรก
            </Button>
          </motion.div>
        )}

        {/* Pages List */}
        {!loading && pages.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Pages Sidebar */}
            <div className="lg:col-span-1 space-y-3">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>เพจที่ติดตาม ({pages.length})</span>
                    <button
                      onClick={() => { setSelectedPageId(null); setShowNewOnly(false); }}
                      className={`text-xs px-2 py-1 rounded ${!selectedPageId ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-400'}`}
                    >
                      ทั้งหมด
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {pages.map((page) => (
                    <motion.div
                      key={page.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedPageId === page.id 
                          ? 'bg-orange-500/20 border border-orange-500/50' 
                          : 'bg-slate-900/50 hover:bg-slate-900'
                      }`}
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">
                            {page.pageName || page.pageUrl.replace(/https?:\/\/(www\.)?facebook\.com\/?/, '')}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">{page.pageUrl}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{page.totalPosts} โพสต์</span>
                            {page.newPosts > 0 && (
                              <span className="text-red-400 font-medium">
                                🔴 {page.newPosts} ใหม่
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTimeAgo(page.lastCheckedAt)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCheckPage(page.id); }}
                            disabled={checkingPage === page.id}
                            className="p-1.5 hover:bg-slate-700 rounded text-blue-400"
                            title="เช็คโพสต์ใหม่"
                          >
                            {checkingPage === page.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCheckPage(page.id, true); }}
                            disabled={debugLoading}
                            className="p-1.5 hover:bg-slate-700 rounded text-amber-400"
                            title="Debug"
                          >
                            <Bug className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                            className="p-1.5 hover:bg-slate-700 rounded text-red-400"
                            title="ลบเพจ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Posts */}
            <div className="lg:col-span-2 space-y-4">
              {/* Posts Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  โพสต์ {selectedPageId ? `จาก ${pages.find(p => p.id === selectedPageId)?.pageName || 'เพจที่เลือก'}` : 'ทั้งหมด'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewOnly(!showNewOnly)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                      showNewOnly ? 'bg-red-500 text-white' : 'bg-slate-700 text-gray-300'
                    }`}
                  >
                    {showNewOnly ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    {showNewOnly ? 'เฉพาะใหม่' : 'ทั้งหมด'}
                  </button>
                  {posts.some(p => p.isNew) && (
                    <button
                      onClick={() => handleMarkAsRead()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                    >
                      <CheckCheck className="w-4 h-4" />
                      อ่านทั้งหมด
                    </button>
                  )}
                </div>
              </div>

              {/* Posts Loading */}
              {postsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                </div>
              )}

              {/* Posts Empty */}
              {!postsLoading && posts.length === 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-400">ยังไม่มีโพสต์</p>
                    <p className="text-sm text-gray-500 mt-1">กดปุ่ม refresh เพื่อเช็คโพสต์ใหม่</p>
                  </CardContent>
                </Card>
              )}

              {/* Posts Grid */}
              {!postsLoading && posts.length > 0 && (
                <div className="space-y-3">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`bg-slate-800/50 border-slate-700 overflow-hidden ${post.isNew ? 'ring-2 ring-red-500/50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Image */}
                            {post.imageUrl && (
                              <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900">
                                <img 
                                  src={post.imageUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Page info */}
                              <div className="flex items-center gap-2 mb-1">
                                {post.isNew && (
                                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">NEW</span>
                                )}
                                <span className="text-xs text-orange-400 font-medium">
                                  {post.page.name || post.page.url.replace(/https?:\/\/(www\.)?facebook\.com\/?/, '')}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTimeAgo(post.discoveredAt)}
                                </span>
                              </div>

                              {/* Caption */}
                              <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                                {post.caption || "ไม่มีข้อความ"}
                              </p>

                              {/* Stats */}
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1 text-pink-400">
                                  <Heart className="w-3 h-3" />
                                  {formatNumber(post.likesCount)}
                                </div>
                                <div className="flex items-center gap-1 text-blue-400">
                                  <MessageCircle className="w-3 h-3" />
                                  {formatNumber(post.commentsCount)}
                                </div>
                                <div className="flex items-center gap-1 text-green-400">
                                  <Share2 className="w-3 h-3" />
                                  {formatNumber(post.sharesCount)}
                                </div>
                                <div className="flex items-center gap-1 text-orange-400">
                                  <Flame className="w-3 h-3" />
                                  {formatNumber(post.viralScore)}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1">
                              {post.isNew && (
                                <button
                                  onClick={() => handleMarkAsRead([post.id])}
                                  className="p-1.5 hover:bg-slate-700 rounded text-green-400"
                                  title="อ่านแล้ว"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <a
                                href={post.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-slate-700 rounded text-blue-400"
                                title="ดูโพสต์"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
                    Debug: Raw Monitor Data
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
      </div>
    </div>
  );
}
