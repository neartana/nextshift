#!/usr/bin/env node
// nextshift installer — no dependencies.
//   npx nextshift [--target all|claude-code,codex,opencode,deepseek,generic,muse]
//   npx nextshift --init [project-dir]
// Global installs copy the /continue command (or its skill equivalent) into
// each harness's own config dir. --init seeds a project with the .agent/
// handoff template + project-level commands and NEVER overwrites files.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : null;
}
const home = argValue("--home") || process.env.NEXTSHIFT_HOME || process.env.AGENT_CONTINUE_HOME || homedir();
const targetArg = (argValue("--target") || "all").toLowerCase();
const targets =
  targetArg === "all"
    ? ["claude-code", "codex", "opencode", "deepseek", "generic", "muse"]
    : targetArg.split(",").map((s) => s.trim());
const doInit = args.includes("--init");
const initDir = resolve(argValue("--init") || ".");

let installed = 0;
function put(src, dst, { overwrite = true } = {}) {
  if (!existsSync(src)) return console.log(`  skip (missing): ${src}`);
  if (!overwrite && existsSync(dst))
    return console.log(`  keep (exists):  ${dst}`);
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true, force: overwrite });
  installed++;
  console.log(`  -> ${dst}`);
}
const A = (p) => join(pkg, "adapters", p);
const C = (p) => join(pkg, "core", p);

if (!doInit) {
  for (const t of targets) {
    console.log(`\n[${t}]`);
    if (t === "claude-code") {
      put(A("claude-code/commands/continue.md"), join(home, ".claude/commands/continue.md"));
      put(A("claude-code"), join(home, ".claude/plugins/nextshift"));
      put(C("."), join(home, ".claude/plugins/nextshift/core"));
    } else if (t === "codex") {
      put(A("codex/skills/continue"), join(home, ".agents/skills/continue"));
      put(A("codex/prompts/continue.md"), join(home, ".codex/prompts/continue.md"));
    } else if (t === "opencode") {
      put(A("opencode/commands/continue.md"), join(home, ".config/opencode/commands/continue.md"));
    } else if (t === "deepseek") {
      put(A("deepseek/skills/continue"), join(home, ".dsh/skills/continue"));
    } else if (t === "generic") {
      put(A("generic/skills/continue"), join(home, ".agents/skills/continue"));
    } else if (t === "muse") {
      const skillsDir = join(home, "workspace/custom-skills");
      if (existsSync(skillsDir)) {
        put(A("muse/SKILL.md"), join(skillsDir, "nextshift/SKILL.md"));
      } else {
        console.log("  Muse berjalan di VM-nya sendiri: minta Muse memasang");
        console.log("  adapters/muse/SKILL.md dari repo ini, atau jalankan installer");
        console.log("  ini di dalam VM Muse.");
      }
    } else {
      console.log(`  target tidak dikenal: ${t}`);
    }
  }
}

if (doInit) {
  console.log(`\n[init project] ${initDir}`);
  const noOver = { overwrite: false };
  put(C("AGENTS.md"), join(initDir, "AGENTS.md"), noOver);
  put(C("CLAUDE.md"), join(initDir, "CLAUDE.md"), noOver);
  put(C(".agent"), join(initDir, ".agent"), noOver);
  put(C("checkpoint-scripts/checkpoint.sh"), join(initDir, "scripts/checkpoint.sh"), noOver);
  put(C("checkpoint-scripts/checkpoint.ps1"), join(initDir, "scripts/checkpoint.ps1"), noOver);
  put(A("claude-code/commands/continue.md"), join(initDir, ".claude/commands/continue.md"), noOver);
  put(A("opencode/commands/continue.md"), join(initDir, ".opencode/commands/continue.md"), noOver);
  put(A("codex/skills/continue"), join(initDir, ".agents/skills/continue"), noOver);
}

console.log(`\nSelesai (${installed} item). Cara memanggil:`);
console.log("  Claude Code : /continue codex");
console.log("  OpenCode    : /continue codex");
console.log("  Codex       : $continue codex   (skill; prompt lama: /prompts:continue codex)");
console.log("  DeepSeek    : skill 'continue' (atau baca AGENTS.md) — /continue codex");
console.log("  Muse (chat) : /continue codex <nama-repo>");
