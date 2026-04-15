import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import os from "os";

export interface CliConfig {
  apiKey: string;
  serverUrl: string;
}

export const CONFIG_PATH = join(os.homedir(), ".klic", "leaderboard", "config.json");

export function readConfig(): CliConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as CliConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: CliConfig): void {
  const dir = dirname(CONFIG_PATH);
  mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}
