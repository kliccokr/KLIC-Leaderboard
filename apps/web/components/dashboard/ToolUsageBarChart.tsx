"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
  fontSize: 12,
};

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

export function ToolUsageBarChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  if (data.length === 0) return null;

  const axisColor = "var(--color-muted-foreground)";

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: axisColor }} width={70} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: unknown) => [`${value}회`]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
