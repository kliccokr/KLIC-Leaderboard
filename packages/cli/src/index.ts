import { loginCommand } from "./commands/login";
import { submitCommand } from "./commands/submit";
import { statusCommand } from "./commands/status";
import { daemonCommand, stopCommand } from "./commands/daemon";

const command = process.argv[2];

async function main() {
  switch (command) {
    case "login":
      await loginCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case "daemon":
      await daemonCommand();
      break;
    case "stop":
      stopCommand();
      break;
    default:
      await submitCommand();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
