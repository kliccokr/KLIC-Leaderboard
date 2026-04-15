import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import type { ReactNode } from "react";
import type { Metadata } from "next";

const SITE_URL = "https://use.klic.co.kr";

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const title = lang === "ko" ? "KLIC — Claude Code 리더보드" : "KLIC — Claude Code Leaderboard";
  const description =
    lang === "ko"
      ? "Claude Code 팀 및 개인 활용량 리더보드. 토큰 사용량, 비용, 세션 통계를 확인하세요."
      : "Claude Code team & individual usage leaderboard. View token usage, costs, and session stats.";

  return {
    title: {
      default: title,
      template: "%s | KLIC",
    },
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}`,
      siteName: "KLIC",
      locale: lang === "ko" ? "ko_KR" : "en_US",
      type: "website",
      images: [
        {
          url: `${SITE_URL}/api/og`,
          width: 1200,
          height: 630,
          alt: "KLIC Leaderboard",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/api/og`],
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();

  setRequestLocale(lang);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={lang} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
