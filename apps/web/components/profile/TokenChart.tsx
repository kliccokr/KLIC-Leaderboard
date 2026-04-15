"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { DailyBreakdown } from "@klic/shared";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
};

export function TokenChart({ data, title }: { data: DailyBreakdown[]; title: string }) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    tokens: Math.round(d.totalTokens / 1000),
  }));

  const axisColor = "var(--color-muted-foreground)";

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor }} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} unit="K" />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area
            type="monotone"
            dataKey="tokens"
            fill="var(--color-primary)"
            fillOpacity={0.15}
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
