"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 px-2 py-1 rounded text-xs transition-colors hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
