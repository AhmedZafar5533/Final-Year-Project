import { spawn } from "node:child_process";

// Tauri runs this in the `desktop/` directory.
const child = spawn("pnpm", ["--dir", "../frontend", "dev", "--port", "3000"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
