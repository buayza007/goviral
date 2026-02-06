"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  FileText,
  Eye,
  History,
  TrendingUp,
  Settings,
  Sparkles,
  Zap,
  Megaphone,
} from "lucide-react";

const navigation = [
  { name: "🔥 Ads Trend", href: "/dashboard/ads-trend", icon: TrendingUp },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "ค้นหา Viral (Keyword)", href: "/dashboard/search", icon: Search },
  { name: "ค้นหา Viral (เพจ)", href: "/dashboard/search-page", icon: FileText },
  { name: "ติดตามเพจคู่แข่ง", href: "/dashboard/monitor", icon: Eye },
  { name: "ดูแอดคู่แข่ง", href: "/dashboard/ads", icon: Megaphone },
  { name: "ประวัติการค้นหา", href: "/dashboard/history", icon: History },
  { name: "เทรนด์", href: "/dashboard/trends", icon: TrendingUp },
];

const bottomNav = [
  { name: "ตั้งค่า", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-viral-500 to-viral-600 shadow-lg shadow-viral-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-viral-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              <span className="gradient-text">Go</span>
              <span className="text-foreground">Viral</span>
            </h1>
            <p className="text-xs text-muted-foreground">Content Discovery</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            เมนูหลัก
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-viral-500/10 text-viral-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive
                      ? "text-viral-500"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.name}
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-viral-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card */}
        <div className="mx-3 mb-4 rounded-2xl bg-gradient-to-br from-viral-500/20 to-ocean-500/20 p-4 backdrop-blur">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-viral-400" />
            <span className="text-sm font-semibold">อัพเกรดเป็น Pro</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            ปลดล็อคการค้นหาไม่จำกัด และฟีเจอร์ขั้นสูง
          </p>
          <Link
            href="/dashboard/upgrade"
            className="inline-flex items-center gap-1 rounded-lg bg-viral-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-viral-600"
          >
            <Zap className="h-3 w-3" />
            อัพเกรดเลย
          </Link>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-border px-3 py-4">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
