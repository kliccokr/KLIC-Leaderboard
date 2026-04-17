"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LeaderboardEntry } from "@klic/shared";
import { calculateLevel } from "@klic/shared";

interface Props {
  entries: LeaderboardEntry[];
  locale: string;
  totalCount?: number;
}

function formatHM(totalMins: number): string {
  const totalSecs = Math.max(0, Math.floor(totalMins * 60));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function formatDH(totalMins: number): string {
  const totalSecs = Math.max(0, Math.floor(totalMins * 60));
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (d > 0) return `${d}d${h}h${m}m`;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function computeWindow(
  pct: number | null,
  resetsAt: string | null,
  now: number,
  totalMins: number,
  totalLabel: string,
  formatter: (mins: number) => string,
): { pct: number; detail: string } | null {
  if (pct === null) return null;
  const clamped = Math.max(0, Math.min(100, pct));
  let detail: string;
  if (resetsAt) {
    const remMins = Math.max(0, (new Date(resetsAt).getTime() - now) / 60000);
    const elapsedMins = Math.max(0, Math.min(totalMins, totalMins - remMins));
    detail = `(${formatter(elapsedMins)}/${totalLabel} →${formatter(remMins)})`;
  } else {
    detail = `(${formatter((clamped / 100) * totalMins)}/${totalLabel})`;
  }
  return { pct: clamped, detail };
}

function computeFiveHour(pct: number | null, resetsAt: string | null, now: number) {
  return computeWindow(pct, resetsAt, now, 300, "5h", formatHM);
}

function computeSevenDay(pct: number | null, resetsAt: string | null, now: number) {
  return computeWindow(pct, resetsAt, now, 7 * 24 * 60, "7d", formatDH);
}

function osLabel(os: string): string {
  if (os === "darwin") return "🍎";
  if (os === "windows") return "🪟";
  if (os === "linux") return "🐧";
  return os;
}

function terminalLabel(t: string): string {
  if (t.startsWith("wsl-")) return "WSL";
  if (t === "vscode") return "VSCode";
  if (t === "cursor") return "Cursor";
  if (t === "ssh-session") return "SSH";
  if (t === "iTerm.app") return "iTerm";
  if (t === "tmux") return "tmux";
  return t;
}

function EnvBadges({ osTypes, terminalType }: { osTypes: string[]; terminalType: string | null }) {
  if (osTypes.length === 0 && !terminalType) return null;
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {osTypes.map((os) => (
        <span key={os} title={os} className="text-sm leading-none">{osLabel(os)}</span>
      ))}
      {terminalType && (
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded leading-none">
          {terminalLabel(terminalType)}
        </span>
      )}
    </span>
  );
}

function LiveBadge() {
  return (
    <span
      title="최근 5분 이내 활동 중"
      className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-500"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
      LIVE
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 90 ? "bg-red-500" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{Math.round(clamped)}%</span>
    </div>
  );
}

function MobileCard({ entry, locale, now }: { entry: LeaderboardEntry; locale: string; now: number }) {
  const calculatedLevel = calculateLevel(entry.totalTokens);
  const levelName = locale === "ko" ? calculatedLevel.info.nameKo : calculatedLevel.info.nameEn;
  const rankLabel = entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`;
  const fiveHour = computeFiveHour(entry.fiveHourUsedPct, entry.fiveHourResetsAt, now);
  const sevenDay = computeSevenDay(entry.sevenDayUsedPct, entry.sevenDayResetsAt, now);

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{rankLabel}</span>
          <Link href={`/${locale}/profile/${entry.email.split("@")[0]}`} className="font-semibold text-foreground hover:underline">
            {entry.name}
          </Link>
          {entry.isLive && <LiveBadge />}
          <EnvBadges osTypes={entry.osTypes} terminalType={entry.terminalType} />
        </div>
        {levelName && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{levelName}</span>
        )}
      </div>
      {entry.orgUnit && (
        <Link href={`/${locale}/team/${encodeURIComponent(entry.orgUnit)}`} className="text-xs text-muted-foreground hover:underline">
          {entry.orgUnit}
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">토큰</span>
          <p className="font-mono text-foreground">{(entry.totalTokens / 1_000_000).toFixed(2)}M</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">비용</span>
          <p className="font-mono text-foreground">${Number(entry.totalCost).toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>5H: <span className="font-mono">{fiveHour ? `${Math.round(fiveHour.pct)}% ${fiveHour.detail}` : "N/A"}</span></span>
        <span>7D: <span className="font-mono">{sevenDay ? `${Math.round(sevenDay.pct)}% ${sevenDay.detail}` : "N/A"}</span></span>
      </div>
      {entry.sevenDayUsedPct !== null && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              entry.sevenDayUsedPct >= 90 ? "bg-red-500" : entry.sevenDayUsedPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, entry.sevenDayUsedPct))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function LeaderboardTable({ entries, locale, totalCount }: Props) {
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DEFAULT_COUNT = 20;
  const hasSearch = query.trim().length > 0;
  const visibleEntries = hasSearch || expanded ? entries : entries.slice(0, DEFAULT_COUNT);
  const hasMore = !hasSearch && entries.length > DEFAULT_COUNT;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync from URL only on mount or browser back/forward
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
          params.set("q", value.trim());
        } else {
          params.delete("q");
        }
        router.push(`?${params.toString()}`);
      });
    }, 300);
  }

  return (
    <>
      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름 또는 팀 검색"
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {query.trim() && (
        <p className="text-sm text-muted-foreground">{totalCount ?? entries.length}명 검색됨</p>
      )}

      {/* Mobile: card layout */}
      <div className={`md:hidden space-y-3 ${isPending ? "opacity-60" : ""}`}>
        {visibleEntries.map((entry) => (
          <MobileCard key={entry.userId} entry={entry} locale={locale} now={now} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className={`hidden md:block overflow-x-auto rounded-lg border border-border ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">순위</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">이름</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">레벨</th>
              <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground whitespace-nowrap">토큰</th>
              <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground whitespace-nowrap">비용</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">사용량(5H)</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">사용량(7D)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleEntries.map((entry) => {
              const calculatedLevel = calculateLevel(entry.totalTokens);
              const levelName = locale === "ko" ? calculatedLevel.info.nameKo : calculatedLevel.info.nameEn;
              const fiveHour = computeFiveHour(entry.fiveHourUsedPct, entry.fiveHourResetsAt, now);
              const sevenDay = computeSevenDay(entry.sevenDayUsedPct, entry.sevenDayResetsAt, now);
              return (
                <tr key={entry.userId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3 font-bold text-muted-foreground whitespace-nowrap">
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link href={`/${locale}/profile/${entry.email.split("@")[0]}`} className="font-medium text-foreground hover:underline">
                        {entry.name}
                      </Link>
                      {entry.isLive && <LiveBadge />}
                      <EnvBadges osTypes={entry.osTypes} terminalType={entry.terminalType} />
                    </div>
                    {entry.orgUnit && (
                      <Link href={`/${locale}/team/${encodeURIComponent(entry.orgUnit)}`} className="block text-xs text-muted-foreground hover:underline">
                        {entry.orgUnit}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{levelName ?? `Lv.${entry.level}`}</td>
                  <td className="px-3 py-3 text-right font-mono text-foreground whitespace-nowrap">
                    {(entry.totalTokens / 1_000_000).toFixed(2)}M
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-foreground whitespace-nowrap">
                    ${Number(entry.totalCost).toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    {fiveHour ? (
                      <div className="flex flex-col gap-0.5">
                        <ProgressBar pct={fiveHour.pct} />
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{fiveHour.detail}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {sevenDay ? (
                      <div className="flex flex-col gap-0.5">
                        <ProgressBar pct={sevenDay.pct} />
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{sevenDay.detail}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expand / Collapse */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-5 py-2 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {expanded
              ? "접기"
              : `전체 보기 (${entries.length}명)`}
          </button>
        </div>
      )}
    </>
  );
}
