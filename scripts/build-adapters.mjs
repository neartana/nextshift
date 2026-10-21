// build-adapters.mjs — generate every harness adapter from ONE canonical body:
// core/continue-body.md. Edit the body there, run `node scripts/build-adapters.mjs`,
// and all adapters below stay identical in protocol, differing only in frontmatter.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const body = readFileSync(join(root, "core/continue-body.md"), "utf8").trim() + "\n";

const DESC =
  "Continue another AI agent's work (codex, claude-code, opencode, deepseek-harness, muse) from the shared .agent/ handoff checkpoint in this project.";

function emit(rel, content) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log("wrote", rel);
}

// --- Claude Code plugin: .claude-plugin/plugin.json + commands/continue.md ---
emit(
  "adapters/claude-code/.claude-plugin/plugin.json",
  JSON.stringify(
    {
      name: "nextshift",
      version: "1.0.1",
      description: DESC,
      author: { name: "neartana" },
    },
    null,
    2
  ) + "\n"
);
emit(
  "adapters/claude-code/commands/continue.md",
  `---\ndescription: ${DESC}\nargument-hint: "[codex|claude-code|opencode|deepseek-harness|muse] [repo]"\n---\n\n${body}`
);

// --- Codex: skill (current route) + legacy custom prompt (deprecated by OpenAI) ---
const skillFront = `---\nname: continue\ndescription: ${DESC} Invoke manually with $continue <previous-agent>; do not auto-invoke.\n---\n\n`;
const skillNote =
  "> Invocation note (skill-based harnesses): the argument is the text the user typed after invoking this skill — treat it exactly as `$ARGUMENTS` below.\n\n";
emit("adapters/codex/skills/continue/SKILL.md", skillFront + skillNote + body);
emit(
  "adapters/codex/skills/continue/agents/openai.yaml",
  "policy:\n  allow_implicit_invocation: false\n"
);
emit("adapters/codex/prompts/continue.md", body); // legacy: ~/.codex/prompts/ -> /prompts:continue

// --- OpenCode: ~/.config/opencode/commands/continue.md or .opencode/commands/continue.md ---
emit(
  "adapters/opencode/commands/continue.md",
  `---\ndescription: ${DESC}\n---\n\n${body}`
);

// --- DeepSeek Harness (dsh): discovers SKILL.md on disk + reads AGENTS.md ---
emit("adapters/deepseek/skills/continue/SKILL.md", skillFront + skillNote + body);

// --- Generic skill (Pi and any SKILL.md-based harness) ---
emit("adapters/generic/skills/continue/SKILL.md", skillFront + skillNote + body);

// --- Muse (personal agent): custom skill, see adapters/muse/SKILL.md written by hand ---
console.log("done");
