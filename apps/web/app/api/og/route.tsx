import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const BARS = [
  { rank: "1", color: "#3b82f6", pct: 780, tokens: "12.5M" },
  { rank: "2", color: "#8b5cf6", pct: 608, tokens: "9.8M" },
  { rank: "3", color: "#ec4899", pct: 484, tokens: "7.8M" },
  { rank: "4", color: "#f59e0b", pct: 351, tokens: "5.6M" },
  { rank: "5", color: "#10b981", pct: 242, tokens: "3.9M" },
] as const;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 40%, #2d1b69 70%, #1a1a3e 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top rainbow bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 6,
          }}
        >
          <div style={{ display: "flex", width: 240, height: 6, background: "#3b82f6" }} />
          <div style={{ display: "flex", width: 240, height: 6, background: "#8b5cf6" }} />
          <div style={{ display: "flex", width: 240, height: 6, background: "#ec4899" }} />
          <div style={{ display: "flex", width: 240, height: 6, background: "#f59e0b" }} />
          <div style={{ display: "flex", width: 240, height: 6, background: "#10b981" }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#ffffff", letterSpacing: "-1px" }}>KLIC</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#8b5cf6" }}>Claude Code Leaderboard</div>
          <div style={{ display: "flex", fontSize: 18, color: "#94a3b8", marginTop: 8 }}>
            AI 코딩 퍼즐 활용량 순위 — 팀 &amp; 개인 리더보드
          </div>
        </div>

        {/* Bar rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 50 }}>
          {BARS.map((row) => (
            <div key={row.rank} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: row.color,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {row.rank}
              </div>
              <div
                style={{
                  display: "flex",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `${row.color}22`,
                  border: `2px solid ${row.color}66`,
                }}
              />
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  background: `${row.color}11`,
                  borderLeft: `3px solid ${row.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    height: 30,
                    width: row.pct,
                    background: `${row.color}33`,
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  width: 70,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  justifyContent: "flex-end",
                }}
              >
                {row.tokens}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", fontSize: 15, color: "#64748b" }}>use.klic.co.kr</div>
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }} />
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6" }} />
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: "50%", background: "#ec4899" }} />
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
