import { writeConfig } from "../config";
import * as readline from "readline/promises";

const DEFAULT_SERVER = process.env.KLIC_SERVER_URL ?? "https://use.klic.co.kr";

export async function loginCommand(): Promise<void> {
  console.log(`\n🔑 KLIC Leaderboard Login`);
  console.log(`\nOpen this URL in your browser to get an API key:`);
  console.log(`\n  ${DEFAULT_SERVER}/ko/settings\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const apiKey = await rl.question("Paste your API key here: ");
  rl.close();

  if (!apiKey.startsWith("klic_")) {
    console.error("❌ Invalid API key format. Should start with 'klic_'");
    process.exit(1);
  }

  writeConfig({ apiKey: apiKey.trim(), serverUrl: DEFAULT_SERVER });
  console.log("✅ Logged in! Run 'klic-leaderboard' to submit your usage.");
}
