"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
  fontSize: 12,
};

interface ModelCost {
  model: string;
  cost: number;
  calls: number;
}

interface HourBucket {
  hour: string;  // "HH" format, local time
  requests: number;
  errors: number;
}

interface Props {
  apiCalls24h: number;
  apiErrors24h: number;
  prompts24h: number;
  cost24h: number;
  activeSessions: number;
  toolAcceptRate: number | null;  // 0..1
  hourlyBuckets: HourBucket[];
  modelCosts: ModelCost[];
  hasData: boolean;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function RealtimeSection(props: Props) {
  if (!props.hasData) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 space-y-2">
        <h2 className="text-base font-semibold text-foreground">실시간 (OTel) · 최근 24h</h2>
        <p className="text-sm text-muted-foreground">
          아직 OpenTelemetry 데이터가 없습니다. 설치 스크립트 재실행 또는
          <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">~/.claude/klic-otel.env</code>
          확인 후 Claude Code를 재시작하세요.
        </p>
      </div>
    );
  }

  const errorRate = props.apiCalls24h > 0 ? (props.apiErrors24h / props.apiCalls24h) * 100 : 0;
  const axisColor = "var(--color-muted-foreground)";

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">실시간 (OTel) · 최근 24h</h2>
        <span className="text-xs text-muted-foreground">Claude Code에서 직접 수신</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card label="API 호출" value={props.apiCalls24h.toLocaleString()} />
        <Card
          label="에러율"
          value={`${errorRate.toFixed(1)}%`}
          sub={`${props.apiErrors24h}건 실패`}
        />
        <Card label="실시간 비용" value={`$${props.cost24h.toFixed(2)}`} />
        <Card label="프롬프트 수" value={props.prompts24h.toLocaleString()} />
        <Card
          label="도구 수락률"
          value={props.toolAcceptRate != null ? `${Math.round(props.toolAcceptRate * 100)}%` : "-"}
        />
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground">시간별 API 호출</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={props.hourlyBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: axisColor }} />
            <YAxis tick={{ fontSize: 11, fill: axisColor }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [`${v}건`, String(name)]}
              labelFormatter={(label) => `${String(label)}시`}
            />
            <Bar dataKey="requests" name="요청" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="errors" name="에러" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {props.modelCosts.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">모델별 비용 (24h)</h3>
          <div className="divide-y divide-border">
            {props.modelCosts.map((m) => (
              <div key={m.model} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{m.model}</span>
                <span className="font-mono text-muted-foreground">
                  ${m.cost.toFixed(2)} · {m.calls.toLocaleString()}회
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
