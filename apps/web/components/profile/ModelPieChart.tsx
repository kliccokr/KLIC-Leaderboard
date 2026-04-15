"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#14b8a6"];

interface ModelEntry {
  name: string;
  value: number;
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
  fontSize: 12,
};

export function ModelPieChart({ data, title }: { data: ModelEntry[]; title: string }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 pt-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
