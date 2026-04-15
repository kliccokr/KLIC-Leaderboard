import { readConfig } from "../config";

export async function statusCommand(): Promise<void> {
  const config = readConfig();
  if (!config) {
    console.log("❌ Not logged in. Run: klic-leaderboard login");
    return;
  }

  const res = await fetch(`${config.serverUrl}/api/api-keys`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  }).catch(() => null);

  if (!res?.ok) {
    console.log("❌ Cannot reach KLIC server or invalid API key.");
    return;
  }

  const data = (await res.json()) as { hasKey?: boolean; lastUsedAt?: string | null };
  console.log(`\n📊 KLIC Leaderboard Status`);
  console.log(`API Key: ${data.hasKey ? "Active" : "Not found"}`);
  console.log(`Last Used: ${data.lastUsedAt ?? "Never"}`);
  console.log(`\n🏆 View rankings: ${config.serverUrl}`);
}
