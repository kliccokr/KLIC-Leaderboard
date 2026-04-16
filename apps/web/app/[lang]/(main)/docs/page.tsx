import Link from "next/link";
import { LEVELS } from "@klic/shared";
import { CopyButton } from "@/components/common/CopyButton";

const sections = [
  { id: "getting-started", title: "시작하기" },
  { id: "cli-install", title: "CLI 설치" },
  { id: "token-basics", title: "토큰이란" },
  { id: "token-saving", title: "토큰 절약 팁" },
  { id: "level-system", title: "레벨 시스템" },
  { id: "tracking-tech", title: "추적 방식" },
  { id: "tos", title: "TOS 위반 주의" },
  { id: "rate-limit-setup", title: "Rate Limit 추적" },
  { id: "faq", title: "FAQ" },
];

function fmtTokens(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function DocsPage() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        {/* Sidebar */}
        <nav className="hidden md:block sticky top-24 h-fit">
          <ul className="space-y-1 border-l border-border pl-4">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 border-b border-border mb-4">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 px-3 py-1 text-xs rounded-full bg-muted text-muted-foreground hover:text-foreground"
            >
              {s.title}
            </a>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-16 max-w-none">
          {/* Getting Started */}
          <section id="getting-started" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">시작하기</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">KLIC Leaderboard</strong>는 Claude Code 사용량을 추적하고
              팀 내 순위를 확인할 수 있는 내부 대시보드입니다. 토큰 사용량, 비용, 활동 시간, 커밋/PR 수 등을
              종합적으로 분석하여 개인 및 팀 단위의 생산성 지표를 제공합니다.
            </p>
            <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
              <h3 className="font-semibold text-foreground">주요 기능</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>실시간 토큰 사용량 및 비용 추적</li>
                <li>일별 / 주별 / 월별 사용량 차트</li>
                <li>모델별 (Opus, Sonnet, Haiku) 사용 비중 분석</li>
                <li>프로젝트별 세션 및 토큰 집계</li>
                <li>Rate Limit (5h / 7d) 모니터링</li>
                <li>다중 컴퓨터 환경 지원</li>
                <li>10단계 레벨 시스템과 뱃지</li>
              </ul>
            </div>
          </section>

          {/* CLI Install */}
          <section id="cli-install" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">CLI 설치</h2>
            <p className="text-muted-foreground leading-relaxed">
              한 줄 명령어로 설치하면 시스템 서비스로 등록되어 부팅 시 자동 시작됩니다.
              30분마다 Claude Code 사용량을 수집하여 서버에 제출합니다.
            </p>

            {/* One-line install */}
            <div className="rounded-lg border-2 border-primary/50 p-4 space-y-3 bg-primary/5">
              <h3 className="font-bold text-foreground">한 줄 설치</h3>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1 mb-3">
                <p className="text-sm text-amber-600 font-medium">⚠ 설치 전 필수 확인</p>
                <p className="text-xs text-muted-foreground">
                  KLIC Leaderboard는 <strong>Claude Code</strong> 사용 데이터를 수집합니다.
                  Claude Code를 먼저 설치한 후 CLI를 설치하세요.
                  Claude Code가 설치되어 있지 않으면 설치 스크립트가 중단됩니다.
                </p>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">macOS / Linux</span>
                  <CopyButton text="curl -fsSL https://use.klic.co.kr/install.sh | sh" />
                </div>
                <div className="bg-muted rounded-b-lg p-3 font-mono text-sm text-foreground overflow-x-auto">
                  curl -fsSL https://use.klic.co.kr/install.sh | sh
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Windows (PowerShell 관리자)</span>
                  <CopyButton text="irm https://use.klic.co.kr/install.ps1 | iex" />
                </div>
                <div className="bg-muted rounded-b-lg p-3 font-mono text-sm text-foreground overflow-x-auto">
                  irm https://use.klic.co.kr/install.ps1 | iex
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Node.js 18+ 필요 (미설치 시 자동 안내).
              </p>
            </div>

            {/* What it does */}
            <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
              <h3 className="font-semibold text-foreground text-sm">설치 시 자동으로 수행되는 작업</h3>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>CLI를 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/usr/local/bin/klic-leaderboard</code>에 설치</li>
                <li>시스템 서비스 등록 (macOS: launchd / Linux: systemd)</li>
                <li>부팅 시 자동 시작 + 30분마다 데이터 제출</li>
              </ol>
            </div>

            {/* Login */}
            <h3 className="text-lg font-semibold text-foreground">API 키 등록</h3>
            <p className="text-sm text-muted-foreground">
              설치 완료 후 아래 명령어로 로그인합니다.
              <a href="/ko/settings" className="text-primary hover:underline ml-1">설정 페이지</a>에서
              API 키(<code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">klic_</code> 시작)를 발급받으세요.
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm text-foreground overflow-x-auto">
              $ klic-leaderboard login<br />
              ? API 키를 입력하세요: klic_xxxxx<br />
              ✓ Logged in!
            </div>

            {/* Commands */}
            <h3 className="text-lg font-semibold text-foreground">명령어</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <code className="text-sm font-medium text-foreground">klic-leaderboard</code>
                <p className="text-xs text-muted-foreground">즉시 사용량 제출</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <code className="text-sm font-medium text-foreground">klic-leaderboard daemon</code>
                <p className="text-xs text-muted-foreground">1시간마다 자동 제출 (포그라운드)</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <code className="text-sm font-medium text-foreground">klic-leaderboard stop</code>
                <p className="text-xs text-muted-foreground">데몬 중지</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <code className="text-sm font-medium text-foreground">klic-leaderboard status</code>
                <p className="text-xs text-muted-foreground">API 키 상태 확인</p>
              </div>
            </div>

            {/* Service management */}
            <h3 className="text-lg font-semibold text-foreground">서비스 관리</h3>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">klic-leaderboard stop</code> 명령어로 모든 플랫폼에서 중지할 수 있습니다.
              플랫폼별로 직접 제어하려면 아래 명령어를 사용하세요.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <h4 className="font-semibold text-foreground text-sm">macOS</h4>
                </div>
                <div className="p-4 space-y-1">
                  <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground overflow-x-auto">
                    $ klic-leaderboard stop                              # 중지<br />
                    $ launchctl bootout gui/$(id -u)/co.klic.leaderboard   # 직접 중지<br />
                    $ launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/co.klic.leaderboard.plist  # 시작
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <h4 className="font-semibold text-foreground text-sm">Linux</h4>
                </div>
                <div className="p-4 space-y-1">
                  <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground overflow-x-auto">
                    $ klic-leaderboard stop                           # 중지<br />
                    $ systemctl --user stop klic-leaderboard          # 직접 중지<br />
                    $ systemctl --user start klic-leaderboard         # 시작<br />
                    $ systemctl --user status klic-leaderboard        # 상태
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <h4 className="font-semibold text-foreground text-sm">Windows (PowerShell)</h4>
                </div>
                <div className="p-4 space-y-1">
                  <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground overflow-x-auto">
                    PS&gt; klic-leaderboard stop                            # 중지<br />
                    PS&gt; Unregister-ScheduledTask -TaskName KLICLeaderboard  # 직접 중지<br />
                    PS&gt; Start-ScheduledTask -TaskName KLICLeaderboard       # 시작
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <h4 className="font-semibold text-foreground text-sm">WSL</h4>
                </div>
                <div className="p-4 space-y-1">
                  <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground overflow-x-auto">
                    $ klic-leaderboard stop                           # 중지<br />
                    $ crontab -e                                      # cron 항목 삭제로 중지
                  </div>
                </div>
              </div>
            </div>

            {/* Logs */}
            <h3 className="text-lg font-semibold text-foreground">로그 확인</h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm text-foreground overflow-x-auto">
              $ tail -f ~/.klic/leaderboard/daemon.log
            </div>
          </section>

          {/* Token Basics */}
          <section id="token-basics" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">토큰이란</h2>
            <p className="text-muted-foreground leading-relaxed">
              LLM(대형 언어 모델)에서 <strong className="text-foreground">토큰(Token)</strong>은 텍스트를
              처리하는 기본 단위입니다. 영어의 경우 대략 1토큰 ≈ 4글자, 한국어는 1토큰 ≈ 1-2글자 정도입니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Input Tokens</h3>
                <p className="text-xs text-muted-foreground">
                  모델에 입력되는 토큰입니다. 프롬프트, 코드, 이전 대화 내용 등이 포함됩니다.
                  긴 컨텍스트를 유지할수록 input 토큰이 증가합니다.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Output Tokens</h3>
                <p className="text-xs text-muted-foreground">
                  모델이 생성하는 응답의 토큰입니다. output 토큰이 input보다 비용이 약 3-5배 높습니다.
                  코드 생성, 리팩토링 등 긴 응답일수록 많이 소모됩니다.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Cache Creation Tokens</h3>
                <p className="text-xs text-muted-foreground">
                  프롬프트 캐시를 처음 생성할 때의 토큰입니다. 동일한 컨텍스트를 재사용하면
                  이후 요청에서 캐시 히트가 발생하여 비용을 절감할 수 있습니다.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Cache Read Tokens</h3>
                <p className="text-xs text-muted-foreground">
                  캐시된 프롬프트를 재사용할 때의 토큰입니다. 일반 input 토큰보다 약 90% 저렴합니다.
                  캐시 히트율이 높을수록 전체 비용이 크게 절감됩니다.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
              <h3 className="font-semibold text-foreground text-sm">비용 절감 팁</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>긴 프롬프트를 반복해서 보내지 말고 캐시를 활용하세요</li>
                <li>Opus보다 Sonnet/Haiku를 간단한 작업에 사용하세요</li>
                <li>불필요한 컨텍스트(큰 파일 전체 등)를 피하세요</li>
                <li>대화가 길어지면 새 세션을 시작하는 것이 효율적일 수 있습니다</li>
              </ul>
            </div>
          </section>

          {/* Token Saving Tips */}
          <section id="token-saving" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">토큰 절약 팁</h2>
            <p className="text-muted-foreground leading-relaxed">
              Claude Code 사용 시 토큰을 최대 60~90% 절약할 수 있는 방법입니다.
              초급부터 고급까지 단계별 가이드를 확인하세요.
            </p>
            <Link
              href={`/${"ko"}/docs/token-saving`}
              className="block rounded-lg border-2 border-primary/30 p-6 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">토큰 절약 완전 가이드 보기</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    초급편 / 중급편 / 고급편 — 30개 이상의 실전 팁
                  </p>
                </div>
                <span className="text-2xl text-muted-foreground">&rarr;</span>
              </div>
            </Link>
          </section>

          {/* Level System */}
          <section id="level-system" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">레벨 시스템</h2>
            <p className="text-muted-foreground leading-relaxed">
              최근 30일 토큰 사용량에 따라 10단계 레벨이 부여됩니다. 팀 레벨은 개인 기준의 10배 토큰을 기준으로 계산합니다.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Lv</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">칭호</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">필요 토큰</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {LEVELS.map((l) => (
                    <tr key={l.level} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-bold text-foreground">{l.level}</td>
                      <td className="px-4 py-2 font-medium text-foreground">{l.nameKo}</td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">
                        {fmtTokens(l.min)}{l.max ? ` ~ ${fmtTokens(l.max)}` : "+"}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{l.messageKo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tracking Tech */}
          <section id="tracking-tech" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">추적 방식</h2>

            <h3 className="text-lg font-semibold text-foreground">데이터 집계 방식</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-foreground font-medium shrink-0">일별 집계:</span>
                <span>이벤트 타임스탬프 기준으로 날짜별 토큰/비용을 집계합니다</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground font-medium shrink-0">세션 분석:</span>
                <span>세션 단위로 토큰, 비용, 턴 수, 사용 모델, 소요 시간을 기록합니다</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground font-medium shrink-0">모델별 분류:</span>
                <span>Opus, Sonnet, Haiku 등 모델별 사용량을 분리하여 집계합니다</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground font-medium shrink-0">활동 메트릭:</span>
                <span>git commit, PR 생성, 파일 작성/수정 이벤트를 감지하여 커밋/PR/코드 라인 수를 추적합니다</span>
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground">Rate Limit 모니터링</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claude Code의 Rate Limit 정보는 statusline을 통해 수집됩니다:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><strong className="text-foreground">5h 윈도우:</strong> 5시간 동안 사용할 수 있는 토큰 예산. 초과하면 초기화 대기 상태가 됩니다</li>
              <li><strong className="text-foreground">7d 윈도우:</strong> 7일간의 사용량 비율. 프로그레스바로 시각화됩니다</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground">다중 컴퓨터 지원</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              여러 컴퓨터에서 Claude Code를 사용하는 경우, 각 컴퓨터에 고유 UUID가 부여됩니다.
              동일 UUID의 제출 데이터는 교체되고, 다른 컴퓨터의 데이터는 보존됩니다.
              세션 테이블에서 호스트명으로 각 컴퓨터를 식별할 수 있습니다.
            </p>
          </section>

          {/* TOS Violation Warning */}
          <section id="tos" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">TOS 위반 주의</h2>
            <div className="rounded-lg border-2 border-red-500/50 p-5 space-y-4 bg-red-500/5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">⛔</span>
                <div className="space-y-3">
                  <p className="text-foreground font-semibold">
                    Claude Code 이용 약관 위반 시 계정이 정지될 수 있습니다.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Claude Code는 OAuth 인증(Free/Pro/Max/Team/Enterprise)과 API 키 인증(API Console, AWS Bedrock, Google Vertex)으로
                    나뉘며, <strong className="text-foreground">OAuth 계정으로 제3자 서비스나 제품을 구축하는 것은 명시적으로 금지</strong>되어 있습니다.
                    Anthropic은 이를 사전 통보 없이 제재할 수 있습니다.
                  </p>
                  <a
                    href="https://code.claude.com/docs/en/legal-and-compliance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Anthropic 공식 문서 확인 →
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-sm">2026년 4월 기준 절대 금지</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-red-500/30 p-3 space-y-1 bg-red-500/5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔒</span>
                      <span className="font-semibold text-foreground text-sm">Google (Gemini)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Google OAuth 토큰, API 키를 사용하여 Claude Code에 접속하는 것은 불가합니다.
                      Claude Code는 Google Cloud 계정으로 직접 로그인하는 기능을 제공하지 않습니다.
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-500/30 p-3 space-y-1 bg-red-500/5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔒</span>
                      <span className="font-semibold text-foreground text-sm">Claude Code (OAuth)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Free/Pro/Max/Team/Enterprise 계정의 OAuth 토큰으로 제3자 서비스나
                      제품을 개발하는 것은 명시적으로 금지됩니다.
                      Claude Code는 개인 사용만 허용됩니다.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-red-500 p-4 space-y-2 bg-red-500/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚨</span>
                    <span className="font-bold text-red-500">Claude Code 제3자 연동 제재</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    Claude Code를 <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">OpenClaw</a>, <a href="https://github.com/nousresearch/hermes-agent" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Hermes Agent</a> 등 제3자 도구/서비스에 연결하여 사용하는 것은
                    Anthropic 이용 약관을 위반합니다. Anthropic은 OAuth 인증이 <strong>개인 사용에만 허용</strong>되며,
                    <strong className="text-red-500"> 제3자가 Claude.ai 로그인이나 Free/Pro/Max 계정 크레덴셜을 통해
                    요청을 라우팅하는 것을 명시적으로 금지</strong>하고 있습니다.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    위반 시 Anthropic은 <strong className="text-red-500">사전 통보 없이 계정 정지, 서비스 이용 제한 등
                    제재 조치를 취할 수 있습니다.</strong>
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold shrink-0">X</span>
                      <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">OpenClaw</a>
                      <span>등 Claude Code 프록시/래퍼 서비스 사용</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold shrink-0">X</span>
                      <a href="https://github.com/nousresearch/hermes-agent" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Hermes Agent</a>
                      <span>등 Claude Code 연동 미들웨어 사용</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold shrink-0">X</span>
                      <span>Free/Pro/Max OAuth 토큰을 이용한 제3자 서비스/제품 구축</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold shrink-0">X</span>
                      <span>타인의 Claude.ai 계정을 대신 로그인시켜 API처럼 사용</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-sm">안전한 사용 방법</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <span className="font-semibold text-foreground text-sm">API Console</span>
                    <p className="text-xs text-muted-foreground">
                      Anthropic 콘솔에서 API 키를 발급받아 사용하세요.
                      상업적 용도로 허용됩니다.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <span className="font-semibold text-foreground text-sm">AWS Bedrock</span>
                    <p className="text-xs text-muted-foreground">
                      AWS를 통한 Claude API 접근도 허용됩니다.
                      기존 AWS 계약이 적용됩니다.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <span className="font-semibold text-foreground text-sm">Google Vertex</span>
                    <p className="text-xs text-muted-foreground">
                      Google Cloud Vertex AI를 통한 Claude API 접근도 허용됩니다.
                      기존 GCP 계약이 적용됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Rate Limit Setup */}
          <section id="rate-limit-setup" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Rate Limit 추적 설정</h2>
            <p className="text-muted-foreground leading-relaxed">
              리더보드의 <strong className="text-foreground">초기화</strong> 및 <strong className="text-foreground">사용량</strong> 열에
              Rate Limit 데이터를 표시하려면, Claude Code의 statusline 기능을 활용하여 Rate Limit 데이터를 수집해야 합니다.
              설정하지 않으면 N/A로 표시됩니다.
            </p>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <p className="text-sm text-amber-600 font-medium">필수 조건</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Claude Code Pro/Max/Team/Enterprise 구독 (OAuth 인증)</li>
                <li>Claude 모델(Anthropic) 사용 — glm 등 다른 모델에서는 Rate Limit 데이터가 제공되지 않습니다</li>
              </ul>
            </div>

            <h3 className="text-lg font-semibold text-foreground">설치 방법</h3>
            <p className="text-sm text-muted-foreground">
              아래 3단계를 따라 설정하세요. 설정 후 Claude Code를 사용할 때마다 Rate Limit 데이터가 자동으로 수집됩니다.
            </p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                  <span className="font-semibold text-foreground text-sm">statusline 스크립트 다운로드</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    스크립트를 <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">~/.claude/</code> 디렉토리에 다운로드합니다.
                  </p>
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm text-foreground overflow-x-auto">
                    <div className="flex items-center justify-between">
                      <span>curl -fsSL https://use.klic.co.kr/cli/klic-statusline.sh -o ~/.claude/klic-statusline.sh</span>
                      <CopyButton text="curl -fsSL https://use.klic.co.kr/cli/klic-statusline.sh -o ~/.claude/klic-statusline.sh" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm text-foreground overflow-x-auto">
                    <div className="flex items-center justify-between">
                      <span>chmod +x ~/.claude/klic-statusline.sh</span>
                      <CopyButton text="chmod +x ~/.claude/klic-statusline.sh" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                  <span className="font-semibold text-foreground text-sm">settings.json에 statusLine 설정 추가</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">~/.claude/settings.json</code> 파일에
                    아래 설정을 추가합니다. 파일이 없으면 새로 만드세요.
                  </p>
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm text-foreground overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">~/.claude/settings.json</span>
                      <CopyButton text={'{\n  "statusLine": {\n    "type": "command",\n    "command": "~/.claude/klic-statusline.sh"\n  }\n}'} />
                    </div>
                    <pre className="text-foreground">{`{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/klic-statusline.sh"
  }
}`}</pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    이미 다른 설정이 있는 경우 <code className="bg-muted px-1 py-0.5 rounded text-foreground">statusLine</code> 항목만 추가하세요.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                  <span className="font-semibold text-foreground text-sm">확인</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Claude Code를 실행하여 메시지를 보낸 후, 아래 파일이 생성되었는지 확인합니다.
                  </p>
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm text-foreground overflow-x-auto">
                    <div className="flex items-center justify-between">
                      <span>cat ~/.claude/rate-limits.json</span>
                      <CopyButton text="cat ~/.claude/rate-limits.json" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    파일이 생성되면 다음 CLI 실행 시 자동으로 Rate Limit 데이터가 서버에 전송됩니다.
                    리더보드의 초기화/사용량 열에 데이터가 표시됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Existing statusline users */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h3 className="font-semibold text-foreground text-sm">이미 statusline 스크립트를 사용 중인 경우</h3>
              <p className="text-sm text-muted-foreground">
                기존 스크립트에 아래 한 줄을 추가하면 됩니다. stdin JSON에서
                <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">rate_limits</code>를 추출하여
                <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">~/.claude/rate-limits.json</code>에 저장합니다.
              </p>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
{`# 기존 스크립트의 input=$(cat) 아래에 추가:
echo "$input" | jq -c '{rate_limits: (.rate_limits // {}), timestamp: (now | todate)}' \\
  > "$HOME/.claude/rate-limits.json" 2>/dev/null || true`}
              </div>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">jq</code>가 설치되어 있어야 합니다.
                없으면 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">brew install jq</code> 또는{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">apt install jq</code>로 설치하세요.
              </p>
            </div>

            {/* Troubleshooting */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
              <h3 className="font-semibold text-foreground text-sm">스크립트가 정상 동작하지 않는 경우</h3>
              <p className="text-sm text-muted-foreground">
                사용자의 환경(OS, 셸, jq/Node.js 버전 등)에 따라 스크립트가 오류를 일으킬 수 있습니다.
                이 경우 Claude Code에 아래와 같이 요청하면 자동으로 설정해 줍니다.
              </p>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs text-foreground overflow-x-auto">
                <div className="flex items-center justify-between">
                  <span>"statusline 스크립트를 설정해줘. https://use.klic.co.kr/cli/klic-statusline.sh 를 참고해."</span>
                  <CopyButton text='statusline 스크립트를 설정해줘. https://use.klic.co.kr/cli/klic-statusline.sh 를 참고해.' />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Claude Code가 현재 환경에 맞게 스크립트를 다운로드하고 settings.json을 수정합니다.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">FAQ</h2>

            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">데이터는 얼마나 자주 업데이트되나요?</h3>
                <p className="text-sm text-muted-foreground">
                  CLI를 실행할 때마다 업데이트됩니다. cron으로 자동화하면 주기적 업데이트가 가능합니다.
                  동일 컴퓨터의 이전 제출은 새 데이터로 교체됩니다.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">다른 사람이 내 데이터를 볼 수 있나요?</h3>
                <p className="text-sm text-muted-foreground">
                  리더보드에 순위, 이름, 레벨, 토큰, 비용은 공개됩니다.
                  세션 상세 정보는 본인만 볼 수 있습니다 (내 대시보드).
                  프로필 페이지에서 일별 차트와 세션 목록이 공개됩니다.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">여러 컴퓨터에서 사용하면 어떻게 되나요?</h3>
                <p className="text-sm text-muted-foreground">
                  각 컴퓨터에서 독립적으로 데이터를 제출합니다. 모든 데이터가 합산되어 리더보드에 반영됩니다.
                  세션 테이블에서 호스트명으로 각 컴퓨터를 구분할 수 있습니다.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Rate Limit이 N/A로 표시되요</h3>
                <p className="text-sm text-muted-foreground">
                  Rate Limit 추적을 위한 statusline 스크립트가 설정되지 않았습니다.
                  <a href="#rate-limit-setup" className="text-primary hover:underline ml-1">Rate Limit 추적 설정</a> 가이드를
                  따라 설정하면 초기화/사용량 데이터가 표시됩니다.
                  glm 등 다른 모델을 사용 중이면 Rate Limit 데이터가 제공되지 않아 N/A로 표시됩니다.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">제출이 &quot;Rate limit exceeded&quot;로 실패해요</h3>
                <p className="text-sm text-muted-foreground">
                  동일 계정으로 1시간 이내에 재제출하면 차단됩니다. 1시간 후 다시 시도하세요.
                  cron으로 자동화하는 것이 가장 편리합니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
