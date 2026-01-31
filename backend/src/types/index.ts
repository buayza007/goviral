import { Request } from 'express';

// Extend Express Request
export interface AuthenticatedRequest extends Request {
  userId?: string;
  clerkUserId?: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
    name?: string;
  };
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Search Types
export interface SearchParams {
  keyword: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
  maxPosts?: number;
}

export interface ContentData {
  id: string;
  externalId: string;
  url: string;
  caption: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  pageName: string | null;
  pageUrl: string | null;
  postType: string | null;
  postedAt: Date | null;
  platform: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  engagementScore: number;
  reactionsJson: Record<string, number> | null;
}

export interface SearchResult {
  queryId: string;
  status: string;
  resultCount: number;
  contents: ContentData[];
}

// Dashboard Stats Types
export interface DashboardStats {
  totalSearches: number;
  totalPosts: number;
  totalEngagement: number;
  platformBreakdown: { platform: string; count: number }[];
  recentQueries: Array<{
    id: string;
    keyword: string;
    platform: string;
    status: string;
    resultCount: number;
    createdAt: Date;
  }>;
  topContents: ContentData[];
}

// Chart Data Types
export interface ChartDataItem {
  name: string;
  label: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  total: number;
  reactions: Record<string, number> | null;
}

export interface ChartData {
  chartData: ChartDataItem[];
  totals: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    engagement: number;
  };
  postsCount: number;
}

// User Types
export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionPlan: string;
  searchQuota: number;
  searchesUsed: number;
  quotaResetDate: Date;
  createdAt: Date;
}
