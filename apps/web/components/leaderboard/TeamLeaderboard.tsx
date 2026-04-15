import { calculateTeamLevel } from "@klic/shared";

interface TeamEntry {
  rank: number;
  orgUnit: string;
  totalTokens: number;
  totalCost: number;
  members: number;
}

function TeamCard({ entry, locale }: { entry: TeamEntry; locale: string }) {
  const level = calculateTeamLevel(entry.totalTokens);
  const href = `/${locale}/team/${encodeURIComponent(entry.orgUnit)}`;
  return (
    <a href={href} className="block rounded-lg border border-border p-4 space-y-2 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}</span>
          <span className="font-semibold text-foreground">{entry.orgUnit}</span>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{entry.members}명</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs">{level.info.nameKo}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">토큰</span>
          <p className="font-mono text-foreground">{(entry.totalTokens / 1_000_000).toFixed(2)}M</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">비용</span>
          <p className="font-mono text-foreground">${entry.totalCost.toFixed(2)}</p>
        </div>
      </div>
    </a>
  );
}

export function TeamLeaderboard({ entries, locale = "ko" }: { entries: TeamEntry[]; locale?: string }) {
  return (
    <>
      {/* Mobile: card layout */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => (
          <TeamCard key={`${entry.orgUnit}-${entry.rank}`} entry={entry} locale={locale} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">순위</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">팀</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">레벨</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">인원</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">토큰</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">비용</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => {
              const level = calculateTeamLevel(entry.totalTokens);
              const href = `/${locale}/team/${encodeURIComponent(entry.orgUnit)}`;
              return (
                <tr key={`${entry.orgUnit}-${entry.rank}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-muted-foreground">
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </td>
                  <td className="px-4 py-3">
                    <a href={href} className="text-foreground hover:underline">{entry.orgUnit}</a>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{level.info.nameKo}</td>
                  <td className="px-4 py-3 text-right text-foreground">{entry.members}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {(entry.totalTokens / 1_000_000).toFixed(2)}M
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    ${entry.totalCost.toFixed(2)}
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
