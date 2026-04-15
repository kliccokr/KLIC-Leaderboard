"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PERIODS = [
  { label: "1일", value: "1d" },
  { label: "3일", value: "3d" },
  { label: "5일", value: "5d" },
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "전체", value: "all" },
] as const;

export function DashboardPeriodFilter({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            current === p.value
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
