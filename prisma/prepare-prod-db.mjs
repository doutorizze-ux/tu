import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

if (databaseUrl.startsWith("file:")) {
  const rawPath = databaseUrl.slice("file:".length);
  const dbPath = isAbsolute(rawPath) ? rawPath : resolve(rawPath);
  mkdirSync(dirname(dbPath), { recursive: true });
}

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npxCommand, ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Seeding database...");
const seedResult = spawnSync(process.execPath, ["prisma/seed.mjs"], {
  stdio: "inherit",
  shell: true,
});

if (seedResult.status !== 0) {
  console.error("Database seeding failed.");
  process.exit(seedResult.status ?? 1);
}

console.log("Database successfully prepared and seeded!");
