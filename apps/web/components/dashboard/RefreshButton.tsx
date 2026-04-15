"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="데이터 새로고침"
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  );
}
