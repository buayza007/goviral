"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface ChartDataItem {
  name: string;
  label: string;
  likes: number;
  comments: number;
  shares: number;
  total: number;
}

interface EngagementChartProps {
  data?: ChartDataItem[];
  isLoading?: boolean;
}

const COLORS = {
  likes: "#f472b6",
  comments: "#60a5fa",
  shares: "#4ade80",
};

export function EngagementChart({ data, isLoading }: EngagementChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Demo data
      return [
        { name: "#1", likes: 12500, comments: 850, shares: 2300, total: 15650 },
        { name: "#2", likes: 9800, comments: 620, shares: 1800, total: 12220 },
        { name: "#3", likes: 7500, comments: 480, shares: 1200, total: 9180 },
        { name: "#4", likes: 5200, comments: 320, shares: 800, total: 6320 },
        { name: "#5", likes: 3800, comments: 210, shares: 450, total: 4460 },
      ];
    }
    return data;
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="rounded-xl border border-border bg-popover p-4 shadow-xl">
        <p className="mb-2 font-semibold">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize text-muted-foreground">
                {entry.name}:
              </span>
              <span className="font-semibold">
                {formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-500/20">
            <BarChart3 className="h-5 w-5 text-ocean-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">เปรียบเทียบ Engagement</h3>
            <p className="text-sm font-normal text-muted-foreground">
              Top 5 โพสต์ที่มี Engagement สูงสุด
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-viral-500 border-t-transparent" />
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => (
                    <span className="text-sm capitalize text-foreground">
                      {value}
                    </span>
                  )}
                />
                <Bar
                  dataKey="likes"
                  name="Likes"
                  fill={COLORS.likes}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="comments"
                  name="Comments"
                  fill={COLORS.comments}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="shares"
                  name="Shares"
                  fill={COLORS.shares}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend Summary */}
        <div className="mt-4 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-pink-400" />
            <span className="text-sm text-muted-foreground">Likes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-400" />
            <span className="text-sm text-muted-foreground">Comments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="text-sm text-muted-foreground">Shares</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
