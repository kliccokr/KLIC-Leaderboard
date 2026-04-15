"use client";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";

export function LangToggle() {
  const pathname = usePathname();
  const current = pathname.startsWith("/en") ? "en" : "ko";
  const target = current === "ko" ? pathname.replace("/ko", "/en") : pathname.replace("/en", "/ko");

  return (
    <a
      href={target}
      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title={current === "ko" ? "Switch to English" : "한국어로 전환"}
    >
      <Languages className="w-4 h-4" />
    </a>
  );
}
