import { spawn } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, openSync, mkdirSync } from "fs";
import { join } from "path";
import os from "os";
import { submitCommand } from "./submit";

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DATA_DIR = join(os.homedir(), ".klic", "leaderboard");
const PID_FILE = join(DATA_DIR, "daemon.pid");
const LOG_FILE = join(DATA_DIR, "daemon.log");

let isShuttingDown = false;

export async function daemonCommand(): Promise<void> {
  // --foreground: run in foreground (used by systemd/launchd)
  if (process.argv.includes("--foreground")) {
    runDaemonLoop();
    return;
  }

  // Check if already running
  if (existsSync(PID_FILE)) {
    const pid = Number.parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
    try {
      process.kill(pid, 0);
      console.log(`[KLIC] Daemon already running (PID: ${pid})`);
      console.log(`  Logs: ${LOG_FILE}`);
      console.log(`  Stop: klic-leaderboard stop`);
      return;
    } catch {
      try { unlinkSync(PID_FILE); } catch {}
    }
  }

  // Ensure log dir exists
  mkdirSync(DATA_DIR, { recursive: true });

  // Spawn detached background child
  const logFd = openSync(LOG_FILE, "a");
  const child = spawn(process.execPath, process.argv.slice(1).concat("--foreground"), {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });

  // Write PID file from parent (available immediately)
  writeFileSync(PID_FILE, String(child.pid), "utf-8");

  console.log(`[KLIC] Daemon started in background (PID: ${child.pid})`);
  console.log(`  Logs: ${LOG_FILE}`);
  console.log(`  Stop: klic-leaderboard stop`);

  child.unref();
  process.exit(0);
}

export function stopCommand(): void {
  if (!existsSync(PID_FILE)) {
    console.log("[KLIC] Daemon is not running.");
    return;
  }

  const pid = Number.parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
  try {
    process.kill(pid, "SIGTERM");
    try { unlinkSync(PID_FILE); } catch {}
    console.log(`[KLIC] Daemon stopped (PID: ${pid})`);
  } catch {
    try { unlinkSync(PID_FILE); } catch {}
    console.log("[KLIC] Daemon was not running (stale PID file removed).");
  }
}

function runDaemonLoop(): void {
  const ts = () => new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  console.log(`[${ts()}] Daemon started. Submitting every 1 hour.`);

  // Run first submit immediately
  runSubmit();

  // Schedule recurring submits
  const timer = setInterval(() => {
    if (!isShuttingDown) runSubmit();
  }, INTERVAL_MS);

  // Graceful shutdown
  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[${ts()}] Daemon stopped.`);
    clearInterval(timer);
    try { unlinkSync(PID_FILE); } catch {}
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

function runSubmit(): void {
  if (isShuttingDown) return;

  const ts = () => new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  console.log(`[${ts()}] Submitting...`);

  // Temporarily intercept process.exit to prevent submit from killing daemon
  const originalExit = process.exit;
  process.exit = (() => { throw new Error("process.exit intercepted") }) as never;

  submitCommand()
    .then(() => console.log(`[${ts()}] Done.`))
    .catch((err) => console.error(`[${ts()}] Failed:`, err instanceof Error ? err.message : err))
    .finally(() => { process.exit = originalExit; });
}
