"use client";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Period = "1d" | "3d" | "5d" | "7d" | "30d" | "all";

const PERIODS: Period[] = ["1d", "3d", "5d", "7d", "30d", "all"];

export function PeriodFilter() {
  const t = useTranslations("leaderboard.filter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("period") as Period) ?? "30d";

  const set = (p: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => set(p)}
          className={`px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
            current === p
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t(p)}
        </button>
      ))}
    </div>
  );
}
