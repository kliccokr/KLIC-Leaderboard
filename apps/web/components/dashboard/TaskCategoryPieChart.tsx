"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
  fontSize: 12,
};

const COLORS = [
  "#3b82f6", "#ef4444", "#8b5cf6", "#f59e0b", "#10b981",
  "#06b6d4", "#ec4899", "#6366f1", "#84cc16", "#f97316",
  "#a3a3a3", "#14b8a6", "#78716c",
];

const CATEGORY_LABELS: Record<string, string> = {
  coding: "코딩",
  debugging: "디버깅",
  feature: "기능 개발",
  refactoring: "리팩토링",
  testing: "테스팅",
  exploration: "탐색",
  planning: "계획",
  delegation: "위임",
  git: "Git 작업",
  "build/deploy": "빌드/배포",
  conversation: "대화",
  brainstorming: "브레인스토밍",
  general: "일반",
};

export function TaskCategoryPieChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  if (data.length === 0) return null;

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
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: unknown) => [`${value}회`]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 pt-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span>{CATEGORY_LABELS[entry.name] ?? entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
