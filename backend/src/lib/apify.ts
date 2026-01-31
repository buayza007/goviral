import { ApifyClient } from 'apify-client';

// Initialize Apify Client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Facebook Pages Scraper Actor
const FACEBOOK_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'apify~facebook-pages-scraper';

export interface FacebookScraperInput {
  startUrls: { url: string }[];
  resultsLimit?: number;
  maxPosts?: number;
  maxPostComments?: number;
  maxReviewComments?: number;
  scrapeAbout?: boolean;
  scrapePosts?: boolean;
  scrapeServices?: boolean;
  scrapeReviews?: boolean;
}

export interface FacebookPost {
  postId: string;
  url: string;
  text?: string;
  time?: string;
  timestamp?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  videoViews?: number;
  imageUrl?: string;
  videoUrl?: string;
  postType?: string;
  pageName?: string;
  pageUrl?: string;
  reactions?: {
    like?: number;
    love?: number;
    haha?: number;
    wow?: number;
    sad?: number;
    angry?: number;
  };
}

export interface ApifyRunResult {
  runId: string;
  status: string;
  data: FacebookPost[];
}

/**
 * Start a Facebook Pages Scraper run
 */
export async function startFacebookScraper(
  pageUrls: string[],
  maxPosts: number = 20
): Promise<{ runId: string }> {
  const input: FacebookScraperInput = {
    startUrls: pageUrls.map(url => ({ url })),
    maxPosts,
    maxPostComments: 0,
    maxReviewComments: 0,
    scrapeAbout: false,
    scrapePosts: true,
    scrapeServices: false,
    scrapeReviews: false,
  };

  const run = await apifyClient.actor(FACEBOOK_ACTOR_ID).call(input, {
    waitSecs: 0, // Don't wait, we'll poll for results
  });

  return { runId: run.id };
}

/**
 * Wait for an Apify run to complete and get results
 */
export async function waitForRunAndGetResults(runId: string): Promise<ApifyRunResult> {
  const runClient = apifyClient.run(runId);
  
  // Wait for the run to complete (with timeout)
  await runClient.waitForFinish({
    waitSecs: 300, // 5 minutes timeout
  });

  // Get run info
  const runInfo = await runClient.get();
  
  if (!runInfo) {
    throw new Error('Run not found');
  }

  // Get the dataset items
  const { items } = await apifyClient.dataset(runInfo.defaultDatasetId).listItems();

  return {
    runId,
    status: runInfo.status,
    data: items as FacebookPost[],
  };
}

/**
 * Get run status
 */
export async function getRunStatus(runId: string): Promise<string> {
  const runInfo = await apifyClient.run(runId).get();
  return runInfo?.status || 'UNKNOWN';
}

/**
 * Synchronous search - starts run and waits for completion
 */
export async function searchFacebookPages(
  pageUrls: string[],
  maxPosts: number = 20
): Promise<ApifyRunResult> {
  const input: FacebookScraperInput = {
    startUrls: pageUrls.map(url => ({ url })),
    maxPosts,
    maxPostComments: 0,
    maxReviewComments: 0,
    scrapeAbout: false,
    scrapePosts: true,
    scrapeServices: false,
    scrapeReviews: false,
  };

  // Call actor and wait for results
  const run = await apifyClient.actor(FACEBOOK_ACTOR_ID).call(input, {
    waitSecs: 300, // Wait up to 5 minutes
  });

  // Get dataset items
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

  return {
    runId: run.id,
    status: run.status,
    data: items as FacebookPost[],
  };
}

export { apifyClient };
