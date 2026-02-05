import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// ============================================
// GET - Check Apify Account Status & Credits
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for debug mode
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get("debug") === "true";

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ 
        error: "APIFY_API_TOKEN not configured",
        configured: false 
      }, { status: 500 });
    }

    // Fetch account info from Apify - use /users/me endpoint for account info
    const [limitsRes, usageRes, accountRes] = await Promise.all([
      fetch("https://api.apify.com/v2/users/me/limits", {
        headers: { Authorization: `Bearer ${apifyToken}` }
      }),
      fetch("https://api.apify.com/v2/users/me/usage/monthly", {
        headers: { Authorization: `Bearer ${apifyToken}` }
      }),
      fetch("https://api.apify.com/v2/users/me", {
        headers: { Authorization: `Bearer ${apifyToken}` }
      })
    ]);

    if (!limitsRes.ok || !usageRes.ok) {
      // Token might be invalid
      const errorText = await limitsRes.text();
      return NextResponse.json({ 
        error: "Failed to fetch Apify account info",
        message: errorText,
        configured: true,
        valid: false
      }, { status: 400 });
    }

    const limits = await limitsRes.json();
    const usage = await usageRes.json();
    const account = accountRes.ok ? await accountRes.json() : null;

    // Debug mode - return raw data
    if (debug) {
      return NextResponse.json({
        debug: true,
        rawLimits: limits,
        rawUsage: usage,
        rawAccount: account,
      });
    }

    // Extract data from limits response
    const limitsData = limits.data || limits;
    const usageData = usage.data || usage;
    const accountData = account?.data || account;

    // Get current usage cycle info
    const currentUsageCycle = limitsData.currentUsageCycle || {};
    
    // Try multiple paths to find the monthly usage credit limit
    // Free tier: $5/month, Paid tiers have different amounts
    let limitUsd = 
      limitsData.monthlyUsage?.limitUsd ||
      limitsData.limits?.monthlyUsageUsd ||
      accountData?.plan?.monthlyBasePriceUsd ||
      5; // Default to $5 for free tier

    // Get used amount - check multiple paths
    let usedUsd = 
      usageData.totalUsd ||
      usageData.usedUsd ||
      limitsData.current?.monthlyUsageUsd ||
      0;

    // Check for prepaid/subscription credits
    const prepaidCredits = accountData?.subscription?.prepaidCreditsUsd || 0;
    const planCredits = accountData?.plan?.monthlyBasePriceUsd || 5;
    
    // For free tier, the limit is $5 worth of platform credits
    if (limitUsd === 0 || limitUsd === undefined) {
      limitUsd = planCredits > 0 ? planCredits : 5;
    }

    // Add prepaid credits to limit if any
    const totalLimit = limitUsd + prepaidCredits;

    const remainingUsd = Math.max(0, totalLimit - usedUsd);
    const usagePercent = totalLimit > 0 ? Math.min(100, (usedUsd / totalLimit) * 100) : 0;

    // Determine if exhausted - only if we actually have usage data
    // Don't mark as exhausted if usedUsd is 0 (fresh account)
    const isExhausted = usedUsd > 0 && remainingUsd <= 0;
    const isLow = usagePercent > 80 && !isExhausted;

    return NextResponse.json({
      configured: true,
      valid: true,
      account: {
        // Credits/USD info
        usedUsd: Number(usedUsd.toFixed(2)),
        limitUsd: Number(totalLimit.toFixed(2)),
        remainingUsd: Number(remainingUsd.toFixed(2)),
        usagePercent: Number(usagePercent.toFixed(1)),
        
        // Plan info
        planName: accountData?.plan?.name || "Free",
        
        // Current billing period
        currentPeriodStart: currentUsageCycle.startAt,
        currentPeriodEnd: currentUsageCycle.endAt,
        
        // Warnings
        isLow,
        isExhausted,
      }
    });

  } catch (error) {
    console.error("[Apify Status] Error:", error);
    return NextResponse.json({
      error: "Failed to check Apify status",
      message: error instanceof Error ? error.message : "Unknown error",
      configured: true,
      valid: false
    }, { status: 500 });
  }
}
