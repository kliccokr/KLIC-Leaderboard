import Link from "next/link";

const sections = [
  { id: "beginner", title: "초급편" },
  { id: "intermediate", title: "중급편" },
  { id: "advanced", title: "고급편" },
  { id: "tools", title: "추천 도구" },
  { id: "cost-comparison", title: "비용 비교" },
];

export default function TokenSavingPage() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        {/* Sidebar */}
        <nav className="hidden md:block sticky top-24 h-fit">
          <ul className="space-y-1 border-l border-border pl-4">
            <li className="mb-3">
              <Link
                href={`/${"ko"}/docs`}
                className="block py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                &larr; 안내로
              </Link>
            </li>
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
          <Link
            href={`/${"ko"}/docs`}
            className="shrink-0 px-3 py-1 text-xs rounded-full bg-muted text-muted-foreground hover:text-foreground"
          >
            &larr; 안내
          </Link>
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
        <div className="space-y-16 max-w-none min-w-0 overflow-hidden">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">토큰 절약 팁</h1>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Claude Code 사용 시 토큰을 최대 60~90% 절약할 수 있는 방법입니다.
              비용을 줄이면서 동일한 결과를 얻을 수 있습니다.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              핵심 개념: Claude는 매번 전체 대화를 재로딩하므로 대화가 길어질수록 막대한 토큰이 소모됩니다.
              작업이 끝나면 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/clear</code>로 초기화하는 것이 중요합니다.
            </p>
          </div>

          {/* ===== 초급편 ===== */}
          <section id="beginner" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">초급편 — 토큰 소모 걱정, 이제 끝냅시다</h2>

            <TipCard number={1} title="새 작업 전에 /clear 입력하기">
              기능 구현 등 새 작업 시작 전엔 반드시 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/clear</code>를 입력하세요.
              대화가 길어질수록 매 턴마다 전체 대화 기록이 input으로 전송되어 비용이 기하급수적으로 증가합니다.
            </TipCard>

            <TipCard number={2} title="프롬프트 범위 명시적으로 제한하기">
              프롬프트를 보낼 때 파일명, 함수명 등 범위를 명시적으로 제한해서 보내세요.
              Claude가 불필요한 파일 검색을 하지 않아 토큰이 절감됩니다.
              <BadGood
                bad="이 파일을 읽고, 모든 함수를 분석하고, 각 함수가 무엇을 하는지 설명하고, 버그가 있으면 말해줘"
                good="src/auth.ts의 로그인 로직에서 버그 찾아줘"
              />
            </TipCard>

            <TipCard number={3} title="질문 묶어서 보내기">
              여러 번 나누어 질문하면 과금도 배가 됩니다. 간단한 명령은 묶어서 한 번에 보내고,
              수정이 필요하면 원본 메시지 편집 버튼을 활용하세요.
            </TipCard>

            <TipCard number={4} title="파일 전체가 아닌 필요한 부분만 전달하기">
              파일 전체를 던져주지 말고 함수, 단락 등 꼭 필요한 것만 붙여넣으세요.
              Input 토큰은 컨텍스트 길이에 비례합니다.
              큰 파일 전체를 읽지 말고 필요한 부분만 읽기 위해 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">offset</code>/<code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">limit</code>를 활용하세요.
            </TipCard>

            <TipCard number={5} title="자동 수락 모드 주의">
              자동 수락 모드 중 잘못된 루프에 빠질 수 있으므로 작업할 때 자리를 뜨지 마세요.
            </TipCard>

            <TipCard number={6} title="기본 모델을 Sonnet으로 고정하기">
              처음 켰을 때 Opus로 잡혀 있다면, 더 저렴한 Sonnet으로 기본 모델을 고정하세요.
            </TipCard>

            <TipCard number={7} title="작업에 맞는 모델 선택하기">
              단순 작업은 Haiku, 일반 구현은 Sonnet, 복잡한 설계는 Opus 등 작업에 맞는 모델을 선택하세요.
              가장 비싼 모델이 항상 최선이 아닙니다.
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="font-medium text-foreground text-sm">Haiku</p>
                  <p className="text-xs text-muted-foreground">단순 수정, 타입 체크, 문서 생성</p>
                  <p className="text-xs text-emerald-500 font-medium">비용 최저</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="font-medium text-foreground text-sm">Sonnet</p>
                  <p className="text-xs text-muted-foreground">일반 개발, 버그 수정, 리팩토링</p>
                  <p className="text-xs text-amber-500 font-medium">비용 중간</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="font-medium text-foreground text-sm">Opus</p>
                  <p className="text-xs text-muted-foreground">복잡한 아키텍처, 대규모 리팩토링</p>
                  <p className="text-xs text-red-500 font-medium">비용 최고</p>
                </div>
              </div>
              <CodeBlock>{`/model haiku    # 저렴한 모델로 전환
/model sonnet   # 균형잡힌 모델
/model opus     # 최고 성능
/fast           # 동일 모델 빠른 출력`}</CodeBlock>
            </TipCard>

            <TipCard number={8} title="Extended Thinking 끄기">
              확장된 사고(Extended Thinking) 등 안 쓰는 기능은 꺼두세요.
              단순 파일 수정에도 많은 토큰을 소모할 수 있습니다.
            </TipCard>

            <TipCard number={9} title="Memory와 Settings 활용하기">
              반복되는 역할이나 스타일 설정은 Memory와 사용자 설정(Settings)에 저장해두세요.
              매번 프롬프트에 포함할 필요가 없습니다.
            </TipCard>

            <TipCard number={10} title="비피크 시간대 활용하기">
              미국 비피크 시간대(한국 업무 시간 9시~6시)를 활용하여 피크 타임을 피해서 작업하세요.
            </TipCard>

            <TipCard number={11} title="할당량 리셋 타이밍 전략적으로 활용하기">
              할당량 리셋 타이밍을 전략적으로 확인하고 활용하세요.
              최근 5시간 롤링 윈도우 방식을 고려하여 하루를 2~3 세션으로 나눠서 사용하세요.
            </TipCard>

            <TipCard number={12} title="1세션당 1논리 작업 원칙">
              컨텍스트 오염을 막기 위해 1세션당 1논리 작업 원칙을 지키세요.
            </TipCard>

            <TipCard number={13} title="세션 시작 전 작업 목록 정리하기">
              세션 시작 전에 우선순위가 포함된 작업 목록을 미리 정리하세요.
              불필요한 방향 전환을 막고 토큰을 절약할 수 있습니다.
            </TipCard>

            <TipCard number={14} title="Extra Usage 안전장치 켜기">
              과금을 방지하기 위해 Extra Usage 안전장치(Overage 기능)를 켜두세요.
            </TipCard>

            <TipCard number={15} title="/rename과 /resume 활용하기">
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/clear</code> 전에 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/rename</code>으로 이름을 지정하고
              나중에 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/resume</code>으로 쉽게 돌아갈 수 있게 활용하세요.
            </TipCard>

            <TipCard number={16} title="토큰과 비용 수시로 확인하기">
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/context</code>,
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/cost</code>,
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/usage</code> 명령어로 수시로 토큰과 비용을 확인하세요.
              사용량 대시보드를 옆 탭에 열어두고 20~40분마다 확인하는 것도 좋습니다.
            </TipCard>

            <TipCard number={17} title="구독 플랜에 맞는 전략 가져가기">
              Pro 및 Max 플랜 등 본인의 구독 플랜에 따라 소넷 고정, 모니터링 등의 전략을 다르게 가져가세요.
            </TipCard>
          </section>

          {/* ===== 중급편 ===== */}
          <section id="intermediate" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">중급편 — CLAUDE.md 최적화 및 설정</h2>

            <TipCard number={1} title=".claudeignore로 불필요한 파일 제외">
              프로젝트 루트에 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">.claudeignore</code> 파일을 만들어
              node_modules나 빌드 폴더 등 Claude가 읽지 않을 파일을 지정하세요.
              <CodeBlock>{`# .claudeignore 예시
node_modules/
dist/
*.log
*.min.js
.next/
__pycache__/
*.wasm
coverage/`}</CodeBlock>
            </TipCard>

            <TipCard number={2} title="CLAUDE.md 200줄 이하로 다이어트">
              CLAUDE.md는 매 메시지마다 읽히므로 서술형 문장을 제거하고 200줄 이하로 간결하게 유지하세요.
            </TipCard>

            <TipCard number={3} title="핵심 규칙만 CLAUDE.md에 두기">
              핵심 규칙만 CLAUDE.md에 두고, 상세 지식은 스킬 파일(필요할 때만 로드하는 마크다운)로 분리하세요.
            </TipCard>

            <TipCard number={4} title="CLAUDE.md에 절약 규칙 명시">
              CLAUDE.md에 이미 읽은 파일 재확인 금지, 불필요한 도구 호출 금지 등 절약 규칙을 명시하세요.
            </TipCard>

            <TipCard number={5} title="이미 결정된 내용을 CLAUDE.md에 적어두기">
              아키텍처나 코딩 규칙 등 이미 결정된 내용을 적어두어 반복 설명을 피하세요.
            </TipCard>

            <TipCard number={6} title="@ 기호 참조 지양하기">
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">@</code> 기호로 긴 파일 전체를 참조하는 것을 지양하고
              필요한 구간이나 함수 단위로 참조하세요.
            </TipCard>

            <TipCard number={7} title="/compact로 수동 압축하기">
              컨텍스트 사용률이 60%에 도달하면 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/compact</code> 명령어로
              수동으로 압축하세요.
            </TipCard>

            <TipCard number={8} title="자리 비우기 전 압축/클리어">
              5분 이상 자리 비우기 전에는 캐시 만료에 대비해 압축하거나 클리어하세요.
            </TipCard>

            <TipCard number={9} title="훅으로 긴 출력 제한하기">
              전체 테스트 결과나 셸 명령어의 긴 출력이 컨텍스트를 덮지 않도록 훅으로 출력을 제한하세요.
              <CodeBlock>{`// .claude/settings.json — 긴 출력 자르기
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Bash",
      "command": "trunc-output.sh"
    }]
  }
}`}</CodeBlock>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside mt-2">
                <li><strong className="text-foreground">PreToolUse:</strong> 도구 실행 전 검증/필터링</li>
                <li><strong className="text-foreground">PostToolUse:</strong> 도구 실행 후 후처리</li>
                <li><strong className="text-foreground">Notification:</strong> 작업 완료 알림</li>
                <li>커밋 전 자동 린트, 테스트 자동 실행 등에 활용</li>
              </ul>
            </TipCard>

            <TipCard number={10} title="Extended Thinking 목적에 맞게 관리">
              단순 파일 수정에도 많은 토큰을 쓸 수 있는 Extended Thinking 기능을 목적에 맞게 켜고 끄며 관리하세요.
            </TipCard>

            <TipCard number={11} title="안 쓰는 MCP 서버 끊기">
              MCP 서버를 연결하면 도구 정의가 로드되므로, 안 쓰는 서버는 끊어 최소화하세요.
            </TipCard>

            <TipCard number={12} title="MCP tool search 옵션 설정">
              여러 MCP 서버 연결 시 tool search 옵션을 true로 설정하세요.
            </TipCard>

            <TipCard number={13} title="불필요한 MCP 서버 줄이기">
              전체 목록화 및 비용 추정을 통해 상위 오버헤드를 차지하는 불필요한 MCP 서버를 줄이세요.
            </TipCard>

            <TipCard number={14} title="글로벌/프로젝트 MCP 분리">
              모든 프로젝트에서 로드되지 않도록 글로벌 MCP와 프로젝트 레벨 MCP를 분리하세요.
            </TipCard>

            <TipCard number={15} title="CLAUDE.md를 분산 메모리 인덱스로 활용">
              CLAUDE.md를 데이터 위치를 알려주는 분산 메모리 인덱스로 활용하세요.
            </TipCard>

            <TipCard number={16} title="progress.md로 이어받기">
              대규모 작업 후 바로 리셋하지 말고, 진행 상황을 progress.md 등에 저장한 후 이어받기를 하세요.
            </TipCard>

            <TipCard number={17} title="Projects 기능으로 캐시 참조">
              여러 번 보는 문서는 채팅방 반복 업로드 대신 Projects 기능에 올려 캐시를 참조하세요.
            </TipCard>

            <TipCard number={18} title="플랜 모드 먼저 활용">
              잘못된 코드 작성을 막기 위해 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">Shift+Tab</code> 2번으로
              아웃라인을 확인하는 플랜 모드를 먼저 활용하세요.
              불필요한 시도와 수정을 줄여 전체 토큰 소모를 줄입니다.
            </TipCard>

            <TipCard number={19} title="상태 표시줄(Status Line) 설정">
              터미널 하단에 실시간 현황을 띄우는 상태 표시줄을 설정하세요.
              토큰 사용량과 할당량을 실시간으로 모니터링할 수 있습니다.
            </TipCard>

            <TipCard number={20} title="ccusage CLI로 정밀 추적">
              수동 확인이 번거롭다면 ccusage CLI 툴을 설치해 사용량을 정밀 추적하세요.
            </TipCard>

            <TipCard number={21} title="토큰 사용량 3가지 방법으로 확인">
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/context</code> 명령어, 로그 파일, 웹 토큰 계산기의 3가지 방법으로 토큰 사용량을 정확히 확인하세요.
            </TipCard>

            <TipCard number={22} title="서브에이전트/커스텀 커맨드 최소 연동">
              서브에이전트나 커스텀 커맨드 등 툴은 전역 레벨이 아닌 필요한 곳에만 연동하세요.
            </TipCard>

            <TipCard number={23} title="서브에이전트 비용 인식">
              서브에이전트는 각자의 컨텍스트를 로드하므로 단발성 작업에만 할당하고 비용을 잘 인식하세요.
            </TipCard>
          </section>

          {/* ===== 고급편 ===== */}
          <section id="advanced" className="scroll-mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">고급편 — 사전 인덱싱 및 멀티 터미널 운영</h2>

            <TipCard number={1} title="코드베이스 사전 인덱싱 (qmd)">
              qmd를 설치하여 코드베이스를 사전 인덱싱하면 탐색 과정의 반복 낭비를 막고 토큰을 평균 92% 절감할 수 있습니다.
              BM25 전체 텍스트 검색, 벡터 시맨틱 검색, LLM 리랭킹을 로컬에서 실행합니다.
            </TipCard>

            <TipCard number={2} title="파일 재읽기 방지 훅(READ-ONCE)">
              세션 내에서 같은 파일을 반복해서 읽는 낭비를 막기 위해 파일 재읽기 방지 훅(READ-ONCE)이나 diff 모드를 활용하세요.
            </TipCard>

            <TipCard number={3} title="훅으로 로그 전처리">
              테스트나 빌드 실행 시 컨텍스트 윈도우가 가득 차는 것을 막기 위해 에러 메시지만 남기도록 훅으로 로그를 전처리하세요.
            </TipCard>

            <TipCard number={4} title="환경 변수로 비용 제어">
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">DISABLE_NON_ESSENTIAL_MODEL_CALLS</code> 등의
              환경 변수로 백그라운드 호출이나 비용 경고를 직접 제어하세요.
              단, 프롬프트 캐싱은 켜두는 게 유리합니다.
            </TipCard>

            <TipCard number={5} title="MCP 툴 설명 다이어트">
              MCP 툴의 설명이 길면 메시지마다 토큰이 누적되므로 AI가 이해할 수 있는 최소한으로 다이어트하세요.
            </TipCard>

            <TipCard number={6} title="MCP 도구 필터링">
              대형 서버에서 안 쓰는 도구까지 전부 로드되지 않도록 실제로 쓰는 도구만 노출되게 MCP 도구를 필터링하세요.
            </TipCard>

            <TipCard number={7} title="역할별 에이전트 도구 세트 분리">
              단일 세션에 모든 도구를 몰아넣지 말고 코드 리뷰용, 고객 데이터용 등 역할별로 에이전트 도구 세트를 최소화하여 분리하세요.
            </TipCard>

            <TipCard number={8} title="멀티 터미널 전략">
              하나의 터미널에서 모든 작업을 하면 컨텍스트가 오염되므로 개발, 리팩토링, 디버깅 등 터미널을 분리하여 멀티 터미널 전략을 운영하세요.
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">/worktree</code>를 사용하면
              메인 브랜치에 영향을 주지 않고 독립적인 작업 공간에서 실험할 수 있습니다.
            </TipCard>

            <TipCard number={9} title="RTK (Rust Token Killer) 활용">
              RTK는 Claude Code의 CLI 명령어를 자동으로 최적화하여 토큰 사용량을 60~90% 절감해주는 도구입니다.
              Hook 기반으로 동작하여 <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">git status</code>,
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">grep</code>,
              <code className="bg-muted px-1 py-0.5 rounded text-foreground text-xs">find</code> 등의 명령어를
              자동으로 토큰 효율적인 형태로 변환합니다.
              <CodeBlock>{`rtk gain              # 토큰 절감 통계 확인
rtk gain --history    # 명령어 사용 기록
rtk discover          # 최적화 기회 분석`}</CodeBlock>
            </TipCard>
          </section>

          {/* ===== 추천 도구 ===== */}
          <section id="tools" className="scroll-mt-20 space-y-6">
            <h2 className="text-2xl font-bold text-foreground">추천 도구</h2>
            <p className="text-muted-foreground leading-relaxed">
              토큰 절약을 위한 레이어별 도구 목록입니다. 기초 도구부터 코드 인텔리전스까지 단계적으로 도입해 보세요.
            </p>

            {/* Flow explanation */}
            <div className="rounded-lg border-2 border-primary/20 p-5 space-y-4 bg-primary/5">
              <h3 className="font-semibold text-foreground">왜 3단계로 나누나요?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Claude Code는 매 턴마다 <strong className="text-foreground">전체 대화 기록 + 도구 정의 + 파일 내용</strong>을 input으로 전송합니다.
                비용의 구조를 이해하면 각 단계가 왜 필요한지 명확해집니다.
              </p>

              {/* Cost breakdown */}
              <div className="rounded-md bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">1회 메시지의 토큰 구성 (예: 50턴 세션)</p>
                <div className="space-y-1.5">
                  <CostBar label="대화 기록 (이전 49턴)" pct={55} color="bg-red-400" detail="누적되면 기하급수적 증가" />
                  <CostBar label="읽은 파일 내용" pct={25} color="bg-amber-400" detail="불필요한 파일 읽기가 주원인" />
                  <CostBar label="도구/MCP 정의" pct={12} color="bg-blue-400" detail="연결된 MCP 서버가 많을수록 증가" />
                  <CostBar label="실제 질문/응답" pct={8} color="bg-emerald-400" detail="우리가 의도한 실제 비용" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  50턴째에는 실제 작업 토큰은 8%에 불과하고, 나머지 92%는 "과거 기록 읽기"에 낭비됩니다.
                </p>
              </div>

              {/* 3 steps */}
              <div className="space-y-3 pt-1">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-400/10 text-red-400 text-xs font-bold">1</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">토큰 감소 — 낭비되는 output 줄이기</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      CLI 명령어 출력(git status, 테스트 결과 등)이 컨텍스트를 채우는 것이 가장 큰 낭비 원인입니다.
                      <strong className="text-foreground">RTK</strong>가 이를 자동 압축하고, <strong className="text-foreground">Caveman</strong>은 응답 자체를 간결하게 만들어 output 토큰을 60~90% 줄입니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">2</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">LSP 통합 — 파일 전체 읽기 대체</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Claude가 "이 함수 어디에 정의되어 있어?"라고 할 때마다 전체 파일을 읽습니다.
                      <strong className="text-foreground">cclsp</strong>은 IDE처럼 정확한 위치만 반환하여 불필요한 파일 탐색을 90~95% 줄입니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-400/10 text-blue-400 text-xs font-bold">3</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">코드 인텔리전스 — 구조적 이해로 전환</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      프로젝트가 커지면 "이 모듈이 뭐 하는 거야?"를 파악하려 파일을 수십 개 읽어야 합니다.
                      <strong className="text-foreground">Scope, Serena, jCodeMunch</strong> 등은 AST/의미 분석으로 전체 구조를 200토큰 수준의 개요로 압축합니다.
                      <strong className="text-foreground">qmd</strong>는 문서 기반 검색에 특화되어 장문 문서/문서화된 코드베이스에 적합합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">도입 순서:</strong> 1단계(토큰 감소)는 설치만으로 즉시 효과를 볼 수 있습니다.
                  프로젝트 규모가 작으면 1단계만으로 충분하고, 코드베이스가 크거나 복잡할수록 2~3단계의 효과가 커집니다.
                </p>
              </div>
            </div>

            {/* Layer 1 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                토큰 감소 (Token Reduction)
              </h3>

              <ToolCard
                name="RTK"
                description="CLI 명령어 출력을 자동 필터링/압축하여 토큰 60~90% 절감. 100개 이상의 명령어(git, cargo, npm, docker, pytest 등)를 10ms 이하 오버헤드로 최적화."
                install={`curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh\n# 또는: brew install rtk`}
                usage={`rtk init -g          # Hook 자동 설치 (Claude Code 재시작 필요)\nrtk gain              # 토큰 절감 통계\nrtk git diff          # 압축된 diff 출력\nrtk test cargo test   # 실패만 표시 (-90% 토큰)`}
                url="https://github.com/rtk-ai/rtk"
              />

              <ToolCard
                name="qmd"
                description="로컬 하이브리드 검색 엔진. BM25 + 벡터 시맨틱 + LLM 리랭킹으로 마크다운/문서를 검색. 전체 파일을 프롬프트에 넣는 대신 관련 컨텍스트만 검색하여 95%+ 토큰 절감."
                install={`npm install -g @tobilu/qmd\n# Claude Code 플러그인:\nclaude plugin marketplace add tobi/qmd\nclaude plugin install qmd@qmd`}
                usage={`qmd collection add . --name myproject   # 디렉토리 인덱싱\nqmd embed                                # 벡터 임베딩 생성\nqmd query "Q1 로드맵은?"               # 하이브리드 검색 (최고 품질)`}
                url="https://github.com/tobi/qmd"
              >
                <div className="mt-2 rounded-md bg-amber-500/5 border border-amber-500/20 p-2">
                  <p className="text-xs font-medium text-amber-400">한국어 사용 시 필수 설정</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    기본 임베딩 모델(embeddinggemma)은 한국어 지원이 제한적입니다.
                    CJK 지원 모델로 교체하세요:
                  </p>
                  <CodeBlock>{`# 임베딩 모델을 CJK 지원 모델로 변경
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
qmd embed -f   # 재인덱싱

# 형태소 분석기 (BM25 정확도 향상용)
# Kiwi (추천 - 순수 Rust, 한국어 특화)
npm install -g kiwi-tokenizer
# Mecab-Ko (Rust 구현, 세종 코퍼스 97% 정확도)
cargo install mecab-ko-cli
# nori (Elasticsearch 한국어 분석기)
# okt (Python 한국어 NLP)`}</CodeBlock>
                </div>
              </ToolCard>

              <ToolCard
                name="just-bash"
                description="가상 bash 환경. 실제 파일시스템을 건드리지 않고 인메모리에서 unix 명령어를 실행. AI 에이전트용으로 설계됨."
                install="npm install -g just-bash"
                usage={`just-bash -c 'ls -la && cat package.json'\njust-bash -c 'grep -r "TODO" src/' --root /path`}
                url="https://github.com/vercel-labs/just-bash"
              />

              <ToolCard
                name="Caveman"
                description="Claude Code 스킬/플러그인. 에이전트를 원시인 말투로 응답하게 하여 output 토큰 ~75% 절감. 기술적 정확도는 그대로 유지. Lite/Full/Ultra/문언文 4단계 강도 조절. caveman-commit(간결한 커밋), caveman-review(한 줄 코드 리뷰), caveman-compress(CLAUDE.md 압축으로 input 토큰 ~46% 절감) 스킬 포함."
                install={`claude plugin marketplace add JuliusBrussee/caveman\nclaude plugin install caveman@caveman\n# 다른 에이전트:\n# npx skills add JuliusBrussee/caveman -a cursor`}
                usage={`/caveman           # 기본 켜기 (Full)\n/caveman lite      # Lite 모드 (문법 유지, 불필요한 말만 제거)\n/caveman ultra     # Ultra 모드 (최대 압축)\n/caveman-commit    # 간결한 커밋 메시지\n/caveman-review    # 한 줄 PR 코멘트\n/caveman:compress CLAUDE.md  # CLAUDE.md 압축 (input 토큰 절감)`}
                url="https://github.com/JuliusBrussee/caveman"
              />
            </div>

            {/* Layer 2 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                LSP 통합 (Language Server Protocol)
              </h3>

              <ToolCard
                name="cclsp"
                description="LSP 서버를 Claude Code에 연결하여 IDE 수준의 코드 인텔리전스 제공. 에이전트가 파일 전체를 뒤지는 대신 LSP에게 코드베이스 구조를 조회하여 grep보다 90~95% 적은 토큰으로 결과를 얻음."
                install={`npx cclsp@latest setup    # 자동 설정 (언어 서버 감지)\n# 또는 수동:\nnpm install -g cclsp\nclaude mcp add cclsp -- npx cclsp@latest`}
                usage="# 설정 후 Claude Code가 자동 사용 (goToDefinition, findReferences, hover 등)\n# TypeScript: npm install -g typescript typescript-language-server\n# Python: pip install python-lsp-server\n# Go: go install golang.org/x/tools/gopls@latest"
                url="https://github.com/nicolo-ribaudo/cclsp"
              />
            </div>

            {/* Layer 3 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                코드 인텔리전스 / 구조적 인덱싱
              </h3>

              <ToolCard
                name="Serena"
                description="LSP 기반 MCP 서버. 에이전트에게 IDE 수준 도구 제공: find_symbol, find_referencing_symbols, insert_after_symbol. Python, TypeScript, Go, Java, Rust 등 40개 이상 언어 지원. 심볼 단위 검색/편집으로 전체 파일 읽기 방지."
                install={`uv tool install -p 3.13 serena-agent@latest --prerelease=allow\nserena init\nclaude mcp add serena -- serena`}
                usage="# Claude Code가 자동 사용:\n# find_symbol, symbol_overview, find_referencing_symbols\n# rename, move, inline, replace_symbol_body 등"
                url="https://github.com/oraios/serena"
              />

              <ToolCard
                name="jCodeMunch"
                description="tree-sitter 기반 MCP 서버. 파일 우선이 아닌 심볼 우선 검색. 한 번 인덱싱하면 바이트 오프셋으로 정확한 함수/클래스를 가져옴. BM25 검색, 퍼지 매칭, 데드 코드 감지, blast-radius 분석, PageRank 기반 중요도 랭킹 지원. 코드 읽기 토큰 95%+ 절감."
                install={`pip install jcodemunch-mcp\njcodemunch-mcp init    # 자동 설정\n# 또는 수동:\nclaude mcp add jcodemunch -- uvx jcodemunch-mcp`}
                usage="# Claude Code가 자동 사용:\n# search_symbols, get_symbol_source, get_file_outline\n# get_blast_radius, find_dead_code, get_changed_symbols"
                url="https://github.com/jgravelle/jcodemunch-mcp"
              />

              <ToolCard
                name="Scope"
                description="Rust 기반 구조적 코드 인텔리전스. tree-sitter AST를 SQLite 의미존성 그래프로 저장. 6000토큰 소스 파일 → ~200토큰 구조 개요. 벤치마크 기준 32% 저렴한 에이전트 세션."
                install={`# 바이너리 다운로드: https://github.com/rynhardt-potgieter/scope/releases\n# 또는: cargo install scope-mcp`}
                usage={`scope setup --preload    # init + index + CLAUDE.md + 스킬 설치\nscope sketch PaymentService             # 구조 개요 (~200 토큰)\nscope callers processPayment --depth 2  # 호출자 추적\nscope find "payment retry logic"        # 전체 텍스트 검색`}
                url="https://github.com/rynhardt-potgieter/scope"
              />

              <ToolCard
                name="RepoMapper"
                description="Aider의 repo map 개념 기반 독립형 MCP 서버. tree-sitter + PageRank로 심볼 중요도 순위를 매기고 토큰 예산 내에서 가장 관련 있는 내용을 제공. 정확한 검색보다는 방향 잡기에 적합."
                install={`git clone https://github.com/pdavis68/RepoMapper.git\ncd RepoMapper && pip install -r requirements.txt`}
                usage={`python repomap.py .                        # 현재 디렉토리 맵핑\npython repomap.py src/ --map-tokens 2048   # 토큰 제한 설정`}
                url="https://github.com/pdavis68/RepoMapper"
              />
            </div>
          </section>

          {/* ===== 비용 비교 ===== */}
          <section id="cost-comparison" className="scroll-mt-20 space-y-6">
            <h2 className="text-2xl font-bold text-foreground">토큰 비용 비교</h2>

            <div className="rounded-lg border-2 border-primary/30 p-4 space-y-3 bg-primary/5">
              <p className="text-xs text-muted-foreground">Claude 모델별 토큰 단가 (USD, 1M 토큰 기준) — 2026년 4월 최신</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">모델</th>
                      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Input</th>
                      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Output</th>
                      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Cache Read</th>
                      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">컨텍스트</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-muted/20">
                      <td className="px-3 py-1.5 text-foreground font-medium">Opus 4.6</td>
                      <td className="px-3 py-1.5 text-right font-mono">$5</td>
                      <td className="px-3 py-1.5 text-right font-mono">$25</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-500">$0.50</td>
                      <td className="px-3 py-1.5 text-right font-mono">1M</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-3 py-1.5 text-foreground font-medium">Sonnet 4.6</td>
                      <td className="px-3 py-1.5 text-right font-mono">$3</td>
                      <td className="px-3 py-1.5 text-right font-mono">$15</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-500">$0.30</td>
                      <td className="px-3 py-1.5 text-right font-mono">1M</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-3 py-1.5 text-foreground font-medium">Haiku 4.5</td>
                      <td className="px-3 py-1.5 text-right font-mono">$1</td>
                      <td className="px-3 py-1.5 text-right font-mono">$5</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-500">$0.10</td>
                      <td className="px-3 py-1.5 text-right font-mono">200K</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 text-muted-foreground">Opus 4 / 4.1</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">$15</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">$75</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">$1.50</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">200K</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 text-muted-foreground">Haiku 3.5</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">$0.80</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">$4</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">$0.08</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">200K</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Cache Read = 일반 input 대비 <strong className="text-emerald-500">90% 저렴</strong> (0.1x)</p>
                <p>Output 토큰이 Input보다 3~5배 비쌉니다.</p>
                <p>Opus 4.6은 이전 Opus 4 대비 <strong className="text-emerald-500">67% 가격 인하</strong> ($15/$75 → $5/$25)</p>
                <p>Batch API 사용 시 input/output 각각 <strong className="text-emerald-500">50% 할인</strong></p>
              </div>
            </div>
          </section>

          {/* Quick Start Tip */}
          <div className="rounded-lg border-2 border-amber-500/30 p-4 space-y-2 bg-amber-500/5">
            <h4 className="font-semibold text-foreground">처음 시작한다면?</h4>
            <p className="text-sm text-muted-foreground">
              부담스러우면 이 3가지부터 시작해 보세요:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li><strong className="text-foreground">.claudeignore 만들기</strong> — node_modules, dist 등 제외</li>
              <li><strong className="text-foreground">CLAUDE.md 다이어트</strong> — 200줄 이하로 간결하게</li>
              <li><strong className="text-foreground">MCP 서버 정리</strong> — 안 쓰는 서버 끊기</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== Reusable Components ========== */

function CostBar({ label, pct, color, detail }: { label: string; pct: number; color: string; detail: string }) {
  return (
    <div>
      <div className="flex justify-between items-center text-xs mb-0.5">
        <span className="text-muted-foreground">{label} <span className="text-foreground font-medium">{pct}%</span></span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TipCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <h4 className="font-semibold text-foreground">{number}. {title}</h4>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function ToolCard({ name, description, install, usage, url, children }: {
  name: string;
  description: string;
  install: string;
  usage: string;
  url: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground text-base">{name}</h4>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0 ml-2">
          GitHub &rarr;
        </a>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">설치</p>
        <CodeBlock>{install}</CodeBlock>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">사용법</p>
        <CodeBlock>{usage}</CodeBlock>
      </div>
      {children}
    </div>
  );
}

function BadGood({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 space-y-1">
        <p className="text-xs font-medium text-red-400">비효율적</p>
        <p className="text-xs text-muted-foreground">&quot;{bad}&quot;</p>
      </div>
      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-1">
        <p className="text-xs font-medium text-emerald-400">효율적</p>
        <p className="text-xs text-muted-foreground">&quot;{good}&quot;</p>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all mt-1">
      {children}
    </div>
  );
}
