import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// ============================================
// GET - Check Apify Account Status & Credits
// ============================================
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json({ 
        error: "APIFY_API_TOKEN not configured",
        configured: false 
      }, { status: 500 });
    }

    // Fetch account limits and usage from Apify
    const [limitsRes, usageRes] = await Promise.all([
      fetch("https://api.apify.com/v2/users/me/limits", {
        headers: { Authorization: `Bearer ${apifyToken}` }
      }),
      fetch("https://api.apify.com/v2/users/me/usage/monthly", {
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

    // Extract relevant info
    const data = limits.data || limits;
    const usageData = usage.data || usage;

    // Calculate usage
    const currentUsage = data.current || {};
    const monthlyLimits = data.monthlyUsage || {};

    // Get billing info
    const usedUsd = usageData.usedUsd || currentUsage.monthlyUsageUsd || 0;
    const limitUsd = monthlyLimits.limitUsd || data.monthlyUsageCreditsUsd || 0;
    const remainingUsd = Math.max(0, limitUsd - usedUsd);
    const usagePercent = limitUsd > 0 ? Math.min(100, (usedUsd / limitUsd) * 100) : 0;

    // Get actor runs info
    const actorRuns = currentUsage.actorComputeUnits || 0;
    const actorRunsLimit = monthlyLimits.actorComputeUnitsLimit || 0;

    // Get data transfer info
    const dataTransferGb = (currentUsage.dataTransferExternalGb || 0);

    return NextResponse.json({
      configured: true,
      valid: true,
      account: {
        // Credits/USD info
        usedUsd: Number(usedUsd.toFixed(2)),
        limitUsd: Number(limitUsd.toFixed(2)),
        remainingUsd: Number(remainingUsd.toFixed(2)),
        usagePercent: Number(usagePercent.toFixed(1)),
        
        // Usage details
        actorRuns,
        actorRunsLimit,
        dataTransferGb: Number(dataTransferGb.toFixed(3)),
        
        // Current billing period
        currentPeriodStart: data.currentUsageCycle?.startAt,
        currentPeriodEnd: data.currentUsageCycle?.endAt,
        
        // Warnings
        isLow: usagePercent > 80,
        isExhausted: usagePercent >= 100 || remainingUsd <= 0,
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
