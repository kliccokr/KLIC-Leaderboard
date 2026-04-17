import type { RecentApiError } from "@/lib/otel-realtime";

function fmtRelative(d: Date, now = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ApiErrorsTable({ errors }: { errors: RecentApiError[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-sm text-muted-foreground">최근 API 에러 (최신 20건)</h3>
        <span className="text-[11px] text-muted-foreground">claude_code.api_error</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-medium">시각</th>
              <th className="py-2 pr-3 font-medium">모델</th>
              <th className="py-2 pr-3 font-medium">상태</th>
              <th className="py-2 pr-3 font-medium">응답시간</th>
              <th className="py-2 pr-3 font-medium">시도</th>
              <th className="py-2 font-medium">에러</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((e, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                  {fmtRelative(e.observedAt)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap text-foreground text-xs">
                  {e.model ?? "-"}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">
                  <span className={e.statusCode && e.statusCode.startsWith("5") ? "text-red-500" : "text-amber-500"}>
                    {e.statusCode ?? "-"}
                  </span>
                </td>
                <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {fmtDuration(e.durationMs)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {e.attempt ?? "-"}
                </td>
                <td className="py-2 text-xs text-foreground">
                  <span className="line-clamp-1" title={e.error ?? ""}>
                    {e.error ?? "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
