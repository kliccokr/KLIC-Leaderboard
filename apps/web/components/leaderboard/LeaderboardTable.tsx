"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LeaderboardEntry } from "@klic/shared";
import { calculateLevel } from "@klic/shared";

interface Props {
  entries: LeaderboardEntry[];
  locale: string;
  totalCount?: number;
}

function computeFiveHour(fiveHourPct: number | null, updatedAt: string | null, now: number): string {
  if (fiveHourPct === null) return "N/A";
  const usedMinsAtCheck = (fiveHourPct / 100) * 300;
  let totalUsedMins = usedMinsAtCheck;
  if (updatedAt) {
    const elapsedMs = now - new Date(updatedAt).getTime();
    totalUsedMins = usedMinsAtCheck + elapsedMs / 60000;
  }
  totalUsedMins = Math.min(totalUsedMins, 300);
  const remaining = 300 - totalUsedMins;
  if (remaining <= 0) return "초기화 대기";
  const rh = Math.floor(remaining / 60);
  const rm = Math.ceil(remaining % 60);
  return `${rh}h${rm < 10 ? "0" : ""}${rm}m`;
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
  const resetTimer = computeFiveHour(entry.fiveHourUsedPct, entry.rateLimitUpdatedAt, now);

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{rankLabel}</span>
          <Link href={`/${locale}/profile/${entry.email.split("@")[0]}`} className="font-semibold text-foreground hover:underline">
            {entry.name}
          </Link>
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
        <span>초기화: <span className="font-mono">{resetTimer}</span></span>
        {entry.sevenDayUsedPct !== null && (
          <span>7일: <span className="font-mono">{Math.round(entry.sevenDayUsedPct)}%</span></span>
        )}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleSearch(value: string) {
    setQuery(value);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      router.push(`?${params.toString()}`);
    });
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
        {entries.map((entry) => (
          <MobileCard key={entry.userId} entry={entry} locale={locale} now={now} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className={`hidden md:block overflow-x-auto rounded-lg border border-border ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">순위</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">이름</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">레벨</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">토큰</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">비용</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">초기화</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">사용량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => {
              const calculatedLevel = calculateLevel(entry.totalTokens);
              const levelName = locale === "ko" ? calculatedLevel.info.nameKo : calculatedLevel.info.nameEn;
              return (
                <tr key={entry.userId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-muted-foreground">
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/profile/${entry.email.split("@")[0]}`} className="font-medium text-foreground hover:underline">
                      {entry.name}
                    </Link>
                    {entry.orgUnit && (
                      <Link href={`/${locale}/team/${encodeURIComponent(entry.orgUnit)}`} className="ml-2 text-xs text-muted-foreground hover:underline">
                        {entry.orgUnit}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{levelName ?? `Lv.${entry.level}`}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {(entry.totalTokens / 1_000_000).toFixed(2)}M
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    ${Number(entry.totalCost).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {computeFiveHour(entry.fiveHourUsedPct, entry.rateLimitUpdatedAt, now)}
                  </td>
                  <td className="px-4 py-3">
                    {entry.sevenDayUsedPct !== null ? (
                      <ProgressBar pct={entry.sevenDayUsedPct} />
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
    </>
  );
}
