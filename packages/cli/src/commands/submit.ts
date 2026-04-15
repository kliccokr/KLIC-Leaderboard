import { readConfig } from "../config";
import { initPricing } from "../lib/pricing";
import { getSessionPathDebugInfo, scanAllProjects } from "../lib/scanner";

export async function submitCommand(): Promise<void> {
  const config = readConfig();
  if (!config) {
    console.error("Not logged in. Run: klic-leaderboard login");
    process.exit(1);
  }

  // Security: reject non-HTTPS URLs to prevent API key exposure
  if (!config.serverUrl.startsWith("https://")) {
    console.error(`Error: server URL must use HTTPS (got: ${config.serverUrl})`);
    process.exit(1);
  }

  // 1. Initialize pricing data (fetches/caches LiteLLM pricing)
  console.log("Initializing pricing data...");
  await initPricing();

  // 2. Scan all Claude Code projects for token usage
  console.log("Scanning Claude Code usage data...");
  const scanResult = scanAllProjects();

  if (!scanResult) {
    console.error("No Claude Code usage data found.");
    console.error("Make sure you have used Claude Code in at least one project.");
    const debug = getSessionPathDebugInfo();
    console.error("Searched paths:");
    for (const p of debug.searchedPaths) {
      console.error(`  ${p.path} (${p.exists ? "exists" : "not found"})`);
    }
    process.exit(1);
  }

  // 3. Submit to server (scanResult is SubmissionPayload-shaped)
  console.log(
    `Found ${scanResult.totalTokens.toLocaleString()} tokens across ${scanResult.dailyBreakdown.length} days.`,
  );

  console.log("Submitting to KLIC Leaderboard...");
  const body = JSON.stringify(scanResult);

  const res = await fetch(`${config.serverUrl}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    console.error(`Submission failed: ${err.error ?? res.statusText}`);
    process.exit(1);
  }

  const result = (await res.json()) as { level?: number };
  console.log(`Submitted! Your level: ${result.level ?? "unknown"}`);
  console.log(`View rankings: ${config.serverUrl}`);
}
