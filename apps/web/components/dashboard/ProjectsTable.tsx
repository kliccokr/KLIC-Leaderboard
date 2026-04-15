"use client";
import { useState } from "react";

interface ProjectStat {
  projectName: string;
  totalTokens: number;
  totalCost: number;
  sessionsCount: number;
}

const COLLAPSE_THRESHOLD = 10;

export function ProjectsTable({ projects }: { projects: ProjectStat[] }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = projects.length > COLLAPSE_THRESHOLD;
  const displayed = expanded ? projects : projects.slice(0, COLLAPSE_THRESHOLD);
  const remaining = projects.length - COLLAPSE_THRESHOLD;
  const max = Math.max(...projects.map((p) => p.totalTokens), 1);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground">프로젝트별 사용량</h3>
      <div className="space-y-2">
        {displayed.map((p) => (
          <div key={p.projectName} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground truncate max-w-[200px]" title={p.projectName}>
                {p.projectName || "알 수 없음"}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
                <span>{p.sessionsCount}세션</span>
                <span className="font-mono text-foreground">
                  {p.totalTokens >= 1_000_000
                    ? `${(p.totalTokens / 1_000_000).toFixed(1)}M`
                    : `${Math.round(p.totalTokens / 1000)}K`}
                </span>
                <span className="font-mono">${p.totalCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full"
                style={{ width: `${Math.round((p.totalTokens / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
        )}
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            {expanded ? "접기" : `외 ${remaining}개 더 보기`}
          </button>
        )}
      </div>
    </div>
  );
}
