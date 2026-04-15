"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DailyBreakdown } from "@klic/shared";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
  fontSize: 12,
};

const BARS = [
  { key: "입력", color: "#3b82f6" },
  { key: "출력", color: "#8b5cf6" },
  { key: "캐시 생성", color: "#f59e0b" },
  { key: "캐시 읽기", color: "#10b981" },
] as const;

export function DailyBarChart({ data, title }: { data: DailyBreakdown[]; title: string }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    "입력": true,
    "출력": true,
    "캐시 생성": false,
    "캐시 읽기": false,
  });

  const toggle = (key: string) => setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const visibleKeys = BARS.filter((b) => visible[b.key]).map((b) => b.key);

  const chartData = data.map((d) => {
    const item: Record<string, string | number> = { date: d.date.slice(5) };
    if (visible["입력"]) item["입력"] = +(d.inputTokens / 1_000_000).toFixed(2);
    if (visible["출력"]) item["출력"] = +(d.outputTokens / 1_000_000).toFixed(2);
    if (visible["캐시 생성"]) item["캐시 생성"] = +(d.cacheCreationTokens / 1_000_000).toFixed(2);
    if (visible["캐시 읽기"]) item["캐시 읽기"] = +(d.cacheReadTokens / 1_000_000).toFixed(2);
    return item;
  });

  const axisColor = "var(--color-muted-foreground)";

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor }} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} unit="M" />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: unknown) => [`${value}M 토큰`]} />
          {visibleKeys.map((key, i) => {
            const isLast = i === visibleKeys.length - 1;
            const bar = BARS.find((b) => b.key === key)!;
            return (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={bar.color}
                radius={isLast ? [2, 2, 0, 0] : [0, 0, 0, 0]}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-1">
        {BARS.map((bar) => (
          <button
            key={bar.key}
            type="button"
            onClick={() => toggle(bar.key)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              visible[bar.key]
                ? "text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            style={visible[bar.key] ? { backgroundColor: bar.color } : undefined}
          >
            {bar.key}
          </button>
        ))}
      </div>
    </div>
  );
}
