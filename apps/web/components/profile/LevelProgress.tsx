import { calculateLevel, calculateTeamLevel } from "@klic/shared";

export function LevelProgress({ totalTokens, locale, isTeam }: { totalTokens: number; locale: string; isTeam?: boolean }) {
  const { level, info, progressPercent } = isTeam ? calculateTeamLevel(totalTokens) : calculateLevel(totalTokens);
  const name = locale === "ko" ? info.nameKo : info.nameEn;
  const message = locale === "ko" ? info.messageKo : info.messageEn;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-foreground">{name}</span>
        <span className="text-sm text-muted-foreground">Lv.{level}</span>
      </div>
      <p className="text-sm text-muted-foreground italic">{message}</p>
      {level < 10 && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{progressPercent}%</p>
        </div>
      )}
    </div>
  );
}
