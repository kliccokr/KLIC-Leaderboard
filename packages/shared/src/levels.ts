export interface LevelInfo {
  level: number;
  nameKo: string;
  nameEn: string;
  messageKo: string;
  messageEn: string;
  min: number;
  max: number | null;
}

// 30일 토큰 기준 (개인)
export const LEVELS: LevelInfo[] = [
  { level: 1, nameKo: "🐣 응애 나 애기토큰", nameEn: "🐣 Baby Token", messageKo: "로그인만 해도 기특함. 이제 막 걸음마 뗌.", messageEn: "Just logged in. First steps taken.", min: 0, max: 1_000_000 },
  { level: 2, nameKo: "🐜 출근하는 개미", nameEn: "🐜 Worker Ant", messageKo: "열심히는 하는데 아직은 귀여운 수준.", messageEn: "Working hard, but still in cute territory.", min: 1_000_000, max: 5_000_000 },
  { level: 3, nameKo: "🧐 AI 좀 치나?", nameEn: "🧐 Prompt Curious", messageKo: "슬슬 프롬프트에 '영혼'을 담기 시작함.", messageEn: "Starting to put 'soul' into prompts.", min: 5_000_000, max: 20_000_000 },
  { level: 4, nameKo: "🔥 본격 맑눈광", nameEn: "🔥 Full Send", messageKo: "광기 어린 눈으로 데이터 파먹는 중. (무서움)", messageEn: "Devouring data with wild eyes. Kinda scary.", min: 20_000_000, max: 50_000_000 },
  { level: 5, nameKo: "🤫 님 혹시 AI임?", nameEn: "🤫 Are You a Bot?", messageKo: "질문 수준이 사람인지 봇인지 헷갈리기 시작함.", messageEn: "Hard to tell if human or AI at this point.", min: 50_000_000, max: 100_000_000 },
  { level: 6, nameKo: "🦾 인간 GPT", nameEn: "🦾 Human GPT", messageKo: "뇌세포가 0과 1로 치환됨. 이미 일심동체.", messageEn: "Brain cells replaced by 0s and 1s. One with AI.", min: 100_000_000, max: 500_000_000 },
  { level: 7, nameKo: "👑 토큰의 왕, 폼 미쳤다", nameEn: "👑 Token King", messageKo: "그저 'GOAT'. 존재 자체가 데이터 그 자체.", messageEn: "Pure GOAT. Existence is data itself.", min: 500_000_000, max: 1_000_000_000 },
  { level: 8, nameKo: "🌌 도파민 대원수", nameEn: "🌌 Dopamine Marshal", messageKo: "토큰 태우는 속도가 거의 화벽 등극 수준.", messageEn: "Burning tokens at legendary speed.", min: 1_000_000_000, max: 5_000_000_000 },
  { level: 9, nameKo: "⚡ 지구 파괴 커스텀", nameEn: "⚡ Earth Destroyer", messageKo: "서버실 에어컨 사장님이 제일 좋아하는 VIP.", messageEn: "The server room AC loves you most.", min: 5_000_000_000, max: 10_000_000_000 },
  { level: 10, nameKo: "💀 AI 노예", nameEn: "💀 AI Zealot", messageKo: "운영진도 얘 뭐하는지 모름. 신의 영역.", messageEn: "Even the admins don't know what you're doing. God tier.", min: 10_000_000_000, max: null },
];

// 팀 레벨: 개인 기준 x10
export const TEAM_LEVEL_MULTIPLIER = 10;

export interface CalculatedLevel {
  level: number;
  info: LevelInfo;
  progressPercent: number;
}

export function calculateLevel(totalTokens: number): CalculatedLevel {
  const info = LEVELS.findLast((l: LevelInfo) => totalTokens >= l.min) ?? LEVELS[0];
  const range = info.max !== null ? info.max - info.min : 1;
  const progress = info.max !== null
    ? Math.min(100, Math.floor(((totalTokens - info.min) / range) * 100))
    : 100;
  return { level: info.level, info, progressPercent: progress };
}

export function calculateTeamLevel(totalTokens: number): CalculatedLevel {
  return calculateLevel(totalTokens / TEAM_LEVEL_MULTIPLIER);
}
