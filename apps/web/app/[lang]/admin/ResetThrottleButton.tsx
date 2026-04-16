"use client";

import { useState } from "react";

interface Props {
  label: string;
}

export function ResetThrottleButton({ label }: Props) {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    if (pending) return;
    if (!confirm("모든 유저의 제출 throttle을 해제합니다. 계속할까요?")) return;
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/reset-throttle", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setMsg(`${data.count}명 해제됨`);
    } catch (e) {
      setMsg(`실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "처리중..." : label}
      </button>
      {msg && <span className="text-xs text-neutral-400">{msg}</span>}
    </div>
  );
}
