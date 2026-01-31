import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getPlatformColor(platform: string): string {
  switch (platform.toUpperCase()) {
    case "FACEBOOK":
      return "text-blue-400";
    case "INSTAGRAM":
      return "text-pink-400";
    case "TIKTOK":
      return "text-white";
    default:
      return "text-gray-400";
  }
}

export function getPlatformBgColor(platform: string): string {
  switch (platform.toUpperCase()) {
    case "FACEBOOK":
      return "bg-blue-500/20 border-blue-500/30";
    case "INSTAGRAM":
      return "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-pink-500/30";
    case "TIKTOK":
      return "bg-black/20 border-white/30";
    default:
      return "bg-gray-500/20 border-gray-500/30";
  }
}

export function getEngagementLevel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 100000) {
    return { label: "🔥 Mega Viral", color: "text-viral-500" };
  }
  if (score >= 50000) {
    return { label: "🚀 Super Viral", color: "text-orange-400" };
  }
  if (score >= 10000) {
    return { label: "✨ Viral", color: "text-yellow-400" };
  }
  if (score >= 1000) {
    return { label: "📈 Trending", color: "text-green-400" };
  }
  return { label: "🌱 Growing", color: "text-blue-400" };
}
