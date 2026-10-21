<p align="center">
  <img src="assets/logo.webp" alt="nextshift logo" width="170">
</p>

<h1 align="center">nextshift</h1>

<p align="center">
  <em>One command to hand work between AI coding agents.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license">
  <img src="https://img.shields.io/badge/version-1.2.1-blue" alt="version 1.2.1">
  <img src="https://img.shields.io/badge/command-%2Fcontinue-7C3AED" alt="command /continue">
  <img src="https://img.shields.io/badge/agents-codex%20%C2%B7%20claude--code%20%C2%B7%20opencode%20%C2%B7%20deepseek%20%C2%B7%20muse-lightgrey" alt="supported agents">
</p>

Your coding agent just hit its usage limit in the middle of a task. You open
a different agent — and it knows nothing: not what was done, not what failed,
not what the next step was. So it starts over, repeats the same dead ends,
and sometimes undoes decisions the first agent already made for good reasons.

**nextshift fixes that with one command:**

```
/continue codex
```

The next agent reads a small shared handoff folder in the project root —
`.agent/` — and resumes exactly where the previous one stopped.

---

## How it works

```
Agent A works ──► updates .agent/HANDOFF.md after every meaningful step
                  commits WIP checkpoints and pushes
                              │
              ┌───────────────┴────────────────┐
              │ same machine: the folder is     │ different machine:
              │ already there                   │ git pull brings it over
              └───────────────┬────────────────┘
                              ▼
Agent B:  /continue <agent-a>
          1. reads HANDOFF · PLAN · DECISIONS · CONTEXT
          2. verifies against reality — git status, git diff, last test run
          3. logs the takeover in SESSION_LOG
          4. works from "Next steps", checkpoints as it goes
          5. closes the session with a fresh handoff — ready for the next shift
```

There is no server, no account pairing, and no live sync. The shared state is
plain Markdown files in your repo, carried by git. That is the whole trick —
and why it works with any agent that can read files.

> **Bootstrapping is pre-authorized.** Invoking `/continue` in a project
> that has no `.agent/` folder yet *is* the owner's consent to seed it —
> agents must not skip seeding or wait for separate permission (unless the
> user explicitly asked for read-only/report-only mode).

## Quick start

**1. Install the command into your agents (once per machine):**

```bash
npx github:neartana/nextshift
# or only some harnesses:
npx github:neartana/nextshift --target claude-code,opencode
```

**2. Seed a project (once per project):**

```bash
cd your-project
npx github:neartana/nextshift --init .
git add -A && git commit -m "chore: add nextshift handoff protocol" && git push
```

`--init` never overwrites existing files; it is safe to re-run.

**3. Hand work over:**

- Agent A works as usual — the installed `AGENTS.md` protocol makes it
  checkpoint into `.agent/HANDOFF.md` continuously and push WIP commits.
- When it stops (limit, crash, or you simply want a different model), open
  any other supported agent in the same project and run `/continue codex`
  (naming whichever agent worked last).
- To hand the work to an agent on **another machine** — for example Muse
  from your phone — make sure the last checkpoint is pushed, then tell that
  agent: `/continue codex <repo-name>`.

## Calling it in each harness

One protocol, wrapped per harness in its own official format:

| Harness | Invocation | Form |
|---|---|---|
| Claude Code | `/continue codex` | Plugin (`.claude-plugin/` + `commands/`) plus a personal command in `~/.claude/commands/` for the plain form. Via a marketplace it is namespaced: `/nextshift:continue`. |
| OpenCode | `/continue codex` | Custom command in `~/.config/opencode/commands/` or `.opencode/commands/`, arguments via `$ARGUMENTS`. |
| Codex | `$continue codex` | Skill in `.agents/skills/continue/` — OpenAI's current route (custom prompts are deprecated). Set to manual-only invocation. A legacy prompt is also installed, so `/prompts:continue codex` works too. |
| DeepSeek Harness | `/continue codex` | A discoverable `SKILL.md`, plus the `AGENTS.md` protocol this harness reads natively. |
| Pi & other SKILL.md harnesses | per harness | Generic skill in `~/.agents/skills/continue/`. |
| Muse (personal agent) | `/continue codex <repo>` | Muse custom skill. Muse runs on its own machine, so it clones/pulls the repo, resumes the work, and pushes the next checkpoint back. |

The argument is always the agent whose checkpoint you are resuming:
`codex` · `claude-code` · `opencode` · `deepseek-harness` · `muse`
(aliases: `claude`, `open-code`, `dsh`, `deepseek`). With no argument,
`/continue` resumes from the latest checkpoint, whoever wrote it.

### Latest mode

```
/continue codex latest
```

Don't remember which project you left that agent in? Add `latest` and the
agent resolves it for you: on the same machine it reads the global index
at `~/.nextshift/index.jsonl` — one line per checkpoint, appended
automatically by the checkpoint scripts — and picks that agent's most
recent entry. If the index has no match, it scans local project folders
for `.agent/HANDOFF.md` files and backfills the index from what it finds.
The index is only a hint, though: agents also consult the harness's own
session history where its location is verified (today: DeepSeek Harness
at `~/.dsh/sessions`, whose `session.v4.jsonl.zstd` files hold multiple
concatenated Zstandard frames — all frames are read). "Latest" is decided
by substantive user activity inside that evidence, never by file mtimes
or sync times, and the deterministic helper
`node ~/.nextshift/resolve-latest.mjs <agent> latest` (installed into
`~/.nextshift/`) performs the whole resolution. Multi-word aliases work:
`deepseek harness`, `claude code`, and `open code` resolve exactly like
their hyphenated forms.
**Latest mode is local by design: a local agent never falls back to
scanning GitHub.** The GitHub scan (repos by latest push, matched on the
`HANDOFF.md` author) exists only for remote agents that cannot see your
machine's filesystem at all — e.g. Muse from a phone. Either way, the
agent announces the project and checkpoint commit it resolved before it
starts working, so a wrong guess is easy to catch.

## The `.agent/` folder

| File | Purpose |
|---|---|
| `HANDOFF.md` | The single most important file: done, in-progress and stopped exactly where, tried-and-failed (do not repeat), concrete next steps, files changed, last test result. |
| `PLAN.md` | The project's big checklist: done / in progress / not started. |
| `DECISIONS.md` | Decisions with their reasons, append-only. The next agent must not silently overturn them. |
| `CONTEXT.md` | How to run, build and test the project; conventions; known traps. |
| `SESSION_LOG.md` | One entry per agent session, including every takeover. Append-only. |

Two disciplines make the whole system work:

1. **Checkpoint locally first, continuously.** Limits run out without
   warning, so `HANDOFF.md` and the local index are updated after every
   meaningful step — the bundled checkpoint scripts (installed into
   projects as `scripts/checkpoint.sh` / `scripts/checkpoint.ps1`)
   always write the local checkpoint first, even with no git repo, no
   remote, and no network, and record the sync status honestly
   (`synced: true/false`). They stage only `.agent/` — never `git add -A`.
2. **An unpushed checkpoint does not exist** for an agent on another
   machine. Push early, push often — but never claim a sync that did
   not actually happen.

## Repository layout

```
core/       the one canonical /continue protocol + the .agent/ template
adapters/   generated per-harness wrappers — do not edit by hand;
            run `node scripts/build-adapters.mjs` after changing core
bin/        the zero-dependency npx installer
scripts/    build-adapters.mjs + resolve-latest.mjs (the evidence
            resolver for latest mode, installed to ~/.nextshift/)
assets/     logo
```

Every adapter is generated from a single source (`core/continue-body.md`),
so the protocol can never drift apart between harnesses.

## Rules

- Never put API keys, tokens or passwords in `.agent/` — the folder is pushed.
- The handoff is verified, not trusted: the resuming agent always cross-checks
  `HANDOFF.md` against `git status`, `git diff` and the last test result,
  and the code wins any disagreement.

## License

MIT © neartana
