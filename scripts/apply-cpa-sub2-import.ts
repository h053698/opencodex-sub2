#!/usr/bin/env bun
/** Apply the CPA/sub2api account-import patch to a checked-out OpenCodex source tree. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Usage: bun scripts/apply-cpa-sub2-import.ts [opencodex-source-dir] [--target=source|global] [--no-restart] [--print-source]");
  process.exit(0);
}

const restart = !args.includes("--no-restart");
const patchPath = resolve(import.meta.dir, "../patches/cpa-sub2-token-import.patch");
const requestedTarget = args.find(arg => arg.startsWith("--target="))?.slice("--target=".length) ?? "auto";

function isOpenCodexSource(path: string): boolean {
  const packagePath = join(path, "package.json");
  if (!existsSync(join(path, ".git")) || !existsSync(packagePath)) return false;
  try {
    return JSON.parse(readFileSync(packagePath, "utf8")).name === "@bitkyc08/opencodex";
  } catch { return false; }
}

function ancestors(path: string): string[] {
  const result: string[] = [];
  for (let current = resolve(path); ; current = dirname(current)) {
    result.push(current);
    if (dirname(current) === current) return result;
  }
}

function detectedSourceDir(): string {
  const explicit = args.find(arg => !arg.startsWith("-"));
  if (explicit) {
    const path = resolve(explicit);
    if (!isOpenCodexSource(path)) throw new Error(`Not an OpenCodex source tree: ${path}`);
    return path;
  }
  const candidates = new Set<string>();
  const configured = process.env.OPENCODEX_SOURCE_DIR;
  if (configured) candidates.add(resolve(configured));
  for (const path of ancestors(process.cwd())) candidates.add(path);

  // Bounded, conventional development locations only — never scan the whole disk.
  const home = process.env.HOME;
  if (home) {
    for (const name of ["opencodex", "OpenCodex"]) candidates.add(join(home, name));
    for (const parent of ["dev", "Developer", "Projects", "src"]) {
      const path = join(home, parent, "opencodex");
      candidates.add(path);
    }
    for (const parent of ["dev", "Developer", "Projects", "src"]) {
      const base = join(home, parent);
      try {
        for (const entry of readdirSync(base, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const child = join(base, entry.name);
          if (/opencodex/i.test(entry.name)) candidates.add(child);
          // Supports the common ~/dev/<organization>/opencodex layout while
          // keeping discovery bounded to two directory levels.
          try {
            for (const nested of readdirSync(child, { withFileTypes: true })) {
              if (nested.isDirectory() && /opencodex/i.test(nested.name)) {
                candidates.add(join(child, nested.name));
              }
            }
          } catch { /* An unreadable organization directory is simply skipped. */ }
        }
      } catch { /* Optional conventional directory is absent or unreadable. */ }
    }
  }
  const matches = [...candidates].filter(isOpenCodexSource);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) throw new Error(`Multiple OpenCodex source trees found:\n${matches.join("\n")}\nPass the desired path explicitly.`);
  throw new Error("OpenCodex source tree was not found. Set OPENCODEX_SOURCE_DIR or pass its path explicitly.");
}

function globalInstallDirs(): string[] {
  const candidates = new Set<string>();
  const home = process.env.HOME;
  if (home) candidates.add(join(home, ".bun/install/global/node_modules/@bitkyc08/opencodex"));
  for (const command of [["bun", "pm", "bin", "-g"], ["npm", "root", "-g"]]) {
    try {
      const result = Bun.spawnSync(command);
      if (result.exitCode !== 0) continue;
      const root = new TextDecoder().decode(result.stdout).trim();
      if (root) candidates.add(join(root, "@bitkyc08/opencodex"));
    } catch { /* The optional package manager is unavailable. */ }
  }
  return [...candidates].filter(path => {
    try { return JSON.parse(readFileSync(join(path, "package.json"), "utf8")).name === "@bitkyc08/opencodex"; }
    catch { return false; }
  });
}

type Target = { kind: "source"; sourceDir: string } | { kind: "global"; installDir: string };

function resolveTarget(): Target {
  if (!new Set(["auto", "source", "global"]).has(requestedTarget)) {
    throw new Error("--target must be source or global");
  }
  if (requestedTarget !== "global") {
    try { return { kind: "source", sourceDir: detectedSourceDir() }; }
    catch (error) { if (requestedTarget === "source") throw error; }
  }
  const installs = globalInstallDirs();
  if (installs.length === 1) return { kind: "global", installDir: installs[0]! };
  if (installs.length > 1) throw new Error(`Multiple global OpenCodex installations found:\n${installs.join("\n")}\nUse --target=source with a checkout.`);
  throw new Error("No OpenCodex source checkout or global installation was found.");
}

let target: Target;
try { target = resolveTarget(); } catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function run(command: string[], cwd: string): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

function applyAndBuild(sourceDir: string): void {
  const check = Bun.spawnSync(["git", "apply", "--check", patchPath], { cwd: sourceDir });
  if (check.exitCode !== 0) {
    const reverse = Bun.spawnSync(["git", "apply", "--reverse", "--check", patchPath], { cwd: sourceDir });
    if (reverse.exitCode === 0) console.error("CPA/sub2api import patch is already applied.");
    else console.error("Patch does not match this OpenCodex checkout.");
    process.exit(1);
  }
  run(["git", "apply", "--index", patchPath], sourceDir);
  // `build:gui` installs only gui/ dependencies. The proxy restart imports the
  // root runtime modules, so install its locked dependencies before either step.
  run(["bun", "install", "--frozen-lockfile"], sourceDir);
  run(["bun", "run", "build:gui"], sourceDir);
}

if (args.includes("--print-source")) {
  console.log(target.kind === "source" ? target.sourceDir : target.installDir);
  process.exit(0);
}

if (target.kind === "source") {
  applyAndBuild(target.sourceDir);
  if (restart) run(["bun", "run", "src/cli/index.ts", "restart"], target.sourceDir);
} else {
  // Published packages omit GUI source, so build a patched source tree outside this
  // patch repository and point Bun's global `ocx` link at that durable worktree.
  const home = process.env.HOME;
  if (!home) throw new Error("HOME is required to patch a global installation");
  const parent = join(home, ".opencodex", "patched-source");
  mkdirSync(parent, { recursive: true });
  const worktree = mkdtempSync(join(parent, "cpa-sub2-"));
  run(["git", "clone", "--depth", "1", "https://github.com/lidge-jun/opencodex.git", worktree], tmpdir());
  applyAndBuild(worktree);
  // Bun 1.3's `link --global` reads a nonexistent global package.json. The
  // global binaries already point to this package directory, so atomically
  // replace that directory with a symlink and retain the old package as backup.
  const backup = `${target.installDir}.pre-cpa-sub2-${Date.now()}`;
  try {
    renameSync(target.installDir, backup);
    symlinkSync(worktree, target.installDir, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (!existsSync(target.installDir) && existsSync(backup)) renameSync(backup, target.installDir);
    throw error;
  }
  console.log(`Patched global package linked; previous package kept at ${backup}`);
  if (restart) run(["bun", "run", "src/cli/index.ts", "restart"], worktree);
}
console.log("CPA/sub2api token-file import is ready.");
