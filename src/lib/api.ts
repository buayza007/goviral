// API Client for GoViral
// Uses relative paths for same-origin API calls

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const response = await fetch(endpoint, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "An error occurred",
    }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Types
export interface SearchParams {
  keyword: string;
  platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  maxPosts?: number;
  demoMode?: boolean;
}

export interface SearchResponse {
  message: string;
  queryId: string;
  status: string;
}

export interface Content {
  id: string;
  externalId: string;
  url: string;
  caption: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  pageName: string | null;
  pageUrl: string | null;
  postType: string | null;
  postedAt: string | null;
  platform: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  engagementScore: number;
  reactionsJson: Record<string, number> | null;
  rank?: number;
  viralScore?: number;
}

export interface SearchResult {
  queryId: string;
  status: string;
  resultCount: number;
  contents: Content[];
  isDemo?: boolean;
  scoringFormula?: string;
}

export interface SearchQuery {
  id: string;
  keyword: string;
  platform: string;
  status: string;
  resultCount: number;
  createdAt: string;
}

export interface SearchHistory {
  queries: SearchQuery[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardStats {
  totalSearches: number;
  totalPosts: number;
  totalEngagement: number;
  platformBreakdown: { platform: string; count: number }[];
  recentQueries: SearchQuery[];
  topContents: Content[];
}

export interface ChartData {
  chartData: {
    name: string;
    label: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    total: number;
    reactions: Record<string, number> | null;
  }[];
  totals: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    engagement: number;
  };
  postsCount: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionPlan: string;
  searchQuota: number;
  searchesUsed: number;
  quotaResetDate: string;
  totalSearches: number;
  quotaRemaining: number;
}

// API Functions - Using relative paths for Vercel deployment
export const searchApi = {
  // Synchronous search (waits for results)
  syncSearch: (params: SearchParams) =>
    apiClient<SearchResult>("/api/search", {
      method: "POST",
      body: params,
    }),

  // Get search results
  getResults: (queryId: string) =>
    apiClient<SearchResult>(`/api/results/${queryId}`),

  // Get search history
  getHistory: (limit = 20, offset = 0) =>
    apiClient<SearchHistory>(`/api/results?limit=${limit}&offset=${offset}`),

  // Get dashboard stats
  getDashboardStats: () =>
    apiClient<DashboardStats>("/api/results/dashboard/stats"),

  // Get chart data for a query
  getChartData: (queryId: string) =>
    apiClient<ChartData>(`/api/results/${queryId}/chart-data`),
};

export const userApi = {
  // Get user profile
  getProfile: () => apiClient<UserProfile>("/api/user/profile"),

  // Update profile
  updateProfile: (data: { name?: string }) =>
    apiClient<UserProfile>("/api/user/profile", {
      method: "PUT",
      body: data,
    }),
};
