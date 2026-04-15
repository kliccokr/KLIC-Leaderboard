"use client";
import { useState, useMemo } from "react";

interface SessionRow {
  sessionId: string;
  projectName: string;
  totalTokens: number;
  totalCost: number;
  turnsCount: number;
  modelsUsed: string[];
  sessionStart: Date | null;
  sessionEnd: Date | null;
  source: string;
  hostname: string | null;
}

const SOURCE_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
];

function SourceBadge({ source, hostname }: { source: string; hostname: string | null }) {
  const safeSource = source || "default";
  // Assign color based on source string hash
  const colorIdx = safeSource.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % SOURCE_COLORS.length;
  const displayLabel = hostname || (safeSource === "default" ? "PC" : safeSource.slice(0, 2).toUpperCase());

  return (
    <span
      className={`inline-block text-[10px] font-bold rounded px-1 py-0.5 leading-none ${SOURCE_COLORS[colorIdx]}`}
      title={`기기: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
}

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start || !end) return "-";
  const secs = Math.round((end.getTime() - start.getTime()) / 1000);
  if (secs < 60) return `${secs}초`;
  if (secs < 3600) return `${Math.floor(secs / 60)}분`;
  return `${Math.floor(secs / 3600)}시간 ${Math.floor((secs % 3600) / 60)}분`;
}

function shortModel(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model.split("-").slice(-1)[0];
}

type SortKey = "sessionStart" | "totalTokens" | "totalCost" | "turnsCount";

export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("sessionStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Build source → hostname map for display
  const sourceHostnames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      if (!map.has(s.source) && s.hostname) {
        map.set(s.source, s.hostname);
      }
    }
    return map;
  }, [sessions]);

  const sourceLabels = useMemo(() => {
    const sources = [...new Set(sessions.map((s) => s.source))];
    return new Map(sources.map((src, i) => [src, sourceHostnames.get(src) || `기기 ${i + 1}`]));
  }, [sessions, sourceHostnames]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setDir("desc"); }
    setPage(0);
  }
  function setDir(d: "asc" | "desc") { setSortDir(d); }

  const sorted = [...sessions].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === "sessionStart") {
      av = a.sessionStart?.getTime() ?? 0;
      bv = b.sessionStart?.getTime() ?? 0;
    } else {
      av = a[sortKey];
      bv = b[sortKey];
    }
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const visible = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">프로젝트</th>
              <th
                className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("sessionStart")}
              >
                시작 시간<SortIcon k="sessionStart" />
              </th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">소요</th>
              <th
                className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("turnsCount")}
              >
                턴<SortIcon k="turnsCount" />
              </th>
              <th
                className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("totalTokens")}
              >
                토큰<SortIcon k="totalTokens" />
              </th>
              <th
                className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("totalCost")}
              >
                비용<SortIcon k="totalCost" />
              </th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">모델</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">기기</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.sessionId} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-medium text-foreground max-w-[160px] truncate" title={s.projectName}>
                  {s.projectName || "알 수 없음"}
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {s.sessionStart
                    ? s.sessionStart.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "-"}
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {formatDuration(s.sessionStart, s.sessionEnd)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">{s.turnsCount}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {s.totalTokens >= 1_000_000
                    ? `${(s.totalTokens / 1_000_000).toFixed(1)}M`
                    : `${Math.round(s.totalTokens / 1000)}K`}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  ${s.totalCost.toFixed(3)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {s.modelsUsed.map((m) => (
                      <span key={m} className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                        {shortModel(m)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <SourceBadge source={s.source ?? "default"} hostname={s.hostname} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  세션 데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {sorted.length}개 세션 중 {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)}
            </span>
            {/* Source legend */}
            <div className="flex gap-2">
              {[...sourceLabels.entries()].map(([src, label]) => (
                <span key={src} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <SourceBadge source={src} hostname={sourceHostnames.get(src) ?? null} /> {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
