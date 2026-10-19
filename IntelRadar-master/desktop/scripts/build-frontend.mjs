import { spawn } from "node:child_process";

// Static export for the Tauri bundle (see frontend/next.config.ts).
const child = spawn("pnpm", ["--dir", "../frontend", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, TAURI_BUILD: "1" },
});

child.on("exit", (code) => process.exit(code ?? 0));
