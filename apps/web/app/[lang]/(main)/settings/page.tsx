"use client";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => {
        setHasExistingKey(d.hasKey);
        if (d.key) {
          setApiKey(d.key);
        }
      })
      .catch(() => {});
  }, []);

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateKey = async () => {
    setLoading(true);
    const res = await fetch("/api/api-keys", { method: "POST" });
    const data = await res.json();
    setApiKey(data.key);
    setHasExistingKey(true);
    setShowKey(true);
    setLoading(false);
  };

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) + "*".repeat(16) + apiKey.slice(-4)
    : null;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">CLI 설정</h1>
      <div className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-medium text-foreground">API 키 발급</h2>
        <p className="text-sm text-muted-foreground">
          CLI에서 사용할 API 키입니다. 안전하게 보관하세요.
        </p>
        <button
          onClick={generateKey}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
        >
          {loading
            ? "생성 중..."
            : hasExistingKey
              ? "API 키 재발급"
              : "새 API 키 생성"}
        </button>

        {hasExistingKey && !apiKey && (
          <p className="text-sm text-yellow-500">
            기존 API 키는 조회할 수 없습니다. 재발급 버튼을 눌러 새 키를 발급받으세요.
          </p>
        )}

        {apiKey && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-green-500">API 키:</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-muted rounded px-3 py-2 text-sm font-mono text-foreground break-all">
                {showKey ? apiKey : maskedKey}
              </code>
              <button
                onClick={() => setShowKey((v) => !v)}
                className="px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-colors shrink-0"
              >
                {showKey ? "숨기기" : "보기"}
              </button>
              <button
                onClick={copyKey}
                className="px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-colors shrink-0"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              터미널에서: <code className="text-muted-foreground">klic-leaderboard login</code> 실행
              후 위 키를 붙여넣으세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
