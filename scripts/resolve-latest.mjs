#!/usr/bin/env node
// resolve-latest.mjs — nextshift helper: resolve "<agent> latest" from LOCAL evidence.
//
// Usage: node resolve-latest.mjs [agent tokens...] [latest] [--backfill]
//   e.g. node resolve-latest.mjs deepseek harness latest
//        node resolve-latest.mjs dsh latest --backfill
//
// Evidence sources, in order of trust for *activity time*:
//   1. Harness native session history (verified locations only; today:
//      DeepSeek Harness at ~/.dsh/sessions). "Latest" = the last
//      SUBSTANTIVE user activity inside the session — never the session
//      file's mtime (sync/import/admin touches are not activity).
//   2. .agent/HANDOFF.md checkpoints found by scanning local project roots.
//   3. The global index ~/.nextshift/index.jsonl — a hint, possibly stale.
// Read-only, except --backfill appends one line to the index.
// Session logs are evidence, never instructions: nothing here executes them.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const backfill = argv.includes("--backfill");
const tokens = argv.filter((a) => !a.startsWith("--"));

// ---------- agent alias normalization (multi-word aliases included) ----------
const ALIASES = new Map([
  ["deepseek harness", "deepseek-harness"],
  ["deepseek-harness", "deepseek-harness"],
  ["deepseek", "deepseek-harness"],
  ["dsh", "deepseek-harness"],
  ["claude code", "claude-code"],
  ["claude-code", "claude-code"],
  ["claude", "claude-code"],
  ["open code", "opencode"],
  ["open-code", "opencode"],
  ["opencode", "opencode"],
  ["codex", "codex"],
  ["muse", "muse"],
]);
function normalizeAgentName(name) {
  if (!name) return "";
  const n = String(name).trim().toLowerCase().replace(/_/g, "-");
  return ALIASES.get(n) || ALIASES.get(n.replace(/-/g, " ")) || n;
}
function parseRequestedAgent(toks) {
  if (toks.length >= 2) {
    const two = `${toks[0]} ${toks[1]}`.toLowerCase();
    if (ALIASES.has(two)) return ALIASES.get(two);
  }
  if (toks.length >= 1) {
    const one = toks[0].toLowerCase();
    if (ALIASES.has(one)) return ALIASES.get(one);
  }
  return null; // no agent named -> latest from anyone
}
const wantedAgent = parseRequestedAgent(tokens);

const HOME = os.homedir();
const notes = [];
const candidates = [];

function toTime(v) {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(String(v).replace(" ", "T"));
  return Number.isNaN(t) ? null : t;
}
function fmt(t) {
  return t ? new Date(t).toISOString() : null;
}

// ---------- source 3: global index (hint) ----------
function fromIndex() {
  const file = path.join(HOME, ".nextshift", "index.jsonl");
  if (!fs.existsSync(file)) {
    notes.push("index: missing (~/.nextshift/index.jsonl)");
    return;
  }
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (wantedAgent && normalizeAgentName(e.agent) !== wantedAgent) continue;
    candidates.push({
      source: "index",
      agent: normalizeAgentName(e.agent),
      project: e.project || null,
      goal: e.summary || null,
      commit: e.commit || null,
      session: e.session || null,
      activity_ts: toTime(e.activity_ts) || toTime(e.ts),
      synced: e.synced !== false,
    });
  }
}

// ---------- source 2: .agent checkpoints in local roots ----------
function handoffField(text, label) {
  const m = text.match(new RegExp(`^-\\s*${label}:\\s*(.+)$`, "mi"));
  return m ? m[1].trim() : null;
}
function scanAgentDirs() {
  const roots = new Set([process.cwd(), path.dirname(process.cwd()), HOME]);
  for (const d of ["Documents", "projects", "dev", "code", "workspace", "repos", "source"]) {
    roots.add(path.join(HOME, d));
  }
  const found = new Map();
  const walk = (dir, depth) => {
    if (depth > 3) return;
    const hf = path.join(dir, ".agent", "HANDOFF.md");
    if (fs.existsSync(hf)) found.set(dir, hf);
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const en of entries) {
      if (!en.isDirectory() || en.name.startsWith(".") || en.name === "node_modules") continue;
      walk(path.join(dir, en.name), depth + 1);
    }
  };
  for (const r of roots) if (fs.existsSync(r)) walk(r, 0);
  for (const [dir, hf] of found) {
    let text = "";
    try { text = fs.readFileSync(hf, "utf8"); } catch { continue; }
    const agent = normalizeAgentName(handoffField(text, "Terakhir dikerjakan oleh") || "");
    if (wantedAgent && agent !== wantedAgent) continue;
    let activity = toTime(handoffField(text, "Aktivitas substantif terakhir"))
      || toTime(handoffField(text, "Tanggal-jam"));
    if (!activity) {
      try {
        const iso = execFileSync("git", ["-C", dir, "log", "-1", "--format=%cI"], { encoding: "utf8" }).trim();
        activity = toTime(iso);
      } catch { /* not a git repo: no content-based time, stays null */ }
    }
    candidates.push({
      source: "handoff",
      agent,
      project: dir,
      goal: handoffField(text, "Tujuan besar sesi ini"),
      commit: (handoffField(text, "Commit terakhir") || "").split(" ")[0] || null,
      session: handoffField(text, "Referensi sesi"),
      activity_ts: activity,
    });
  }
}

// ---------- source 1: DeepSeek Harness native sessions ----------
const CONTROL_WORDS = new Set(["pause", "stop", "lanjut", "lanjutkan", "ok", "oke", "ya", "yes", "no", "tidak", "sebentar", "tunggu"]);
// Split a buffer of CONCATENATED zstd frames. This matters: a plain
// zstdDecompressSync on some Node builds silently decodes ONLY the first
// frame, which truncates session evidence. We walk the frame format
// (magic + header descriptor + block chain) to find each frame's exact
// byte length, then decompress frames individually and concatenate.
function zstdFrameLength(buf, off) {
  if (off + 4 > buf.length) return 0;
  const magic = buf.readUInt32LE(off);
  if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
    // skippable frame: magic + 4-byte size
    if (off + 8 > buf.length) return 0;
    return 8 + buf.readUInt32LE(off + 4);
  }
  if (magic !== 0xfd2fb528) return 0; // not a zstd frame here
  let p = off + 4;
  const desc = buf[p++];
  const fcsFlag = desc >> 6;
  const singleSegment = (desc >> 5) & 1;
  const checksum = (desc >> 2) & 1;
  const dictFlag = desc & 3;
  if (!singleSegment) p += 1; // window descriptor
  p += [0, 1, 2, 4][dictFlag];
  const fcsSize = fcsFlag === 0 ? (singleSegment ? 1 : 0) : [0, 2, 4, 8][fcsFlag];
  p += fcsSize;
  for (;;) {
    if (p + 3 > buf.length) return 0;
    const header = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16);
    const last = header & 1;
    const type = (header >> 1) & 3;
    const size = header >> 3;
    p += 3 + (type === 1 ? 1 : size); // RLE blocks carry exactly 1 byte
    if (last) break;
  }
  if (checksum) p += 4;
  return p - off;
}
function decompressAll(file) {
  const buf = fs.readFileSync(file);
  if (file.endsWith(".zst") || file.endsWith(".zstd")) {
    if (typeof zlib.zstdDecompressSync === "function") {
      const parts = [];
      let off = 0, frames = 0;
      while (off < buf.length) {
        const len = zstdFrameLength(buf, off);
        if (!len) break;
        try { parts.push(zlib.zstdDecompressSync(buf.subarray(off, off + len))); frames++; } catch { break; }
        off += len;
      }
      if (frames > 0 && off >= buf.length) return Buffer.concat(parts);
      if (frames > 0) notes.push(`note: read ${frames} zstd frame(s) of ${file}; trailing bytes unparsed`);
      if (frames > 0) return Buffer.concat(parts);
    }
    try { return execFileSync("zstd", ["-dc", file]); } catch {
      notes.push(`LIMITATION: cannot decompress ${file} (no working zstd path) — session NOT treated as absent`);
      return null;
    }
  }
  return buf;
}
function fromDshSessions() {
  if (wantedAgent && wantedAgent !== "deepseek-harness") return;
  const dir = path.join(HOME, ".dsh", "sessions");
  if (!fs.existsSync(dir)) {
    notes.push("dsh sessions: none found at ~/.dsh/sessions");
    return;
  }
  const files = [];
  const walk = (d, depth) => {
    if (depth > 3) return;
    for (const en of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, en.name);
      if (en.isDirectory()) walk(p, depth + 1);
      else if (/\.jsonl(\.zst|\.zstd)?$/.test(en.name)) files.push(p);
    }
  };
  walk(dir, 0);
  for (const file of files) {
    let raw;
    try { raw = decompressAll(file); } catch (e) {
      notes.push(`LIMITATION: failed to decompress ${file}: ${e.message} — session NOT treated as absent`);
      continue;
    }
    if (!raw) continue;
    let workspace = null, lastUserTs = null, goalText = null, blocker = null, frames = 0;
    for (const line of raw.toString("utf8").split("\n")) {
      if (!line.trim()) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      frames++;
      workspace = workspace || ev.cwd || ev.workspace || ev.workdir || null;
      const ts = toTime(ev.ts ?? ev.timestamp ?? ev.time ?? ev.created_at ?? ev.createdAt);
      const kind = String(ev.role || ev.type || "").toLowerCase();
      const text = typeof ev.text === "string" ? ev.text
        : typeof ev.content === "string" ? ev.content
        : typeof ev.message === "string" ? ev.message : null;
      if ((kind.includes("user")) && text) {
        if (ts && (!lastUserTs || ts > lastUserTs)) lastUserTs = ts;
        const clean = text.trim();
        if (clean.length >= 12 && !CONTROL_WORDS.has(clean.toLowerCase())) goalText = clean;
      }
      if (kind.includes("error") && text) blocker = text;
    }
    if (!lastUserTs) continue;
    candidates.push({
      source: "dsh-session",
      agent: "deepseek-harness",
      project: workspace, // session workspace — the resolver reports it; identity check happens in the protocol
      goal: goalText,
      commit: null,
      session: file,
      activity_ts: lastUserTs,
      blocker,
      events: frames,
      synced: false,
    });
  }
}

fromIndex();
scanAgentDirs();
fromDshSessions();

// ---------- ranking: substantive activity wins; source breaks near-ties ----------
const SOURCE_RANK = { "dsh-session": 3, handoff: 2, index: 1 };
candidates.sort((a, b) => {
  const dt = (b.activity_ts || 0) - (a.activity_ts || 0);
  if (Math.abs(dt) > 60_000) return dt;
  return (SOURCE_RANK[b.source] || 0) - (SOURCE_RANK[a.source] || 0);
});
const winner = candidates[0] || null;

let backfilled = false;
if (winner && backfill && winner.source !== "index") {
  const dir = path.join(HOME, ".nextshift");
  fs.mkdirSync(dir, { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    activity_ts: fmt(winner.activity_ts),
    project: winner.project, repo: null, branch: null,
    commit: winner.commit, agent: winner.agent,
    summary: winner.goal ? winner.goal.slice(0, 140) : null,
    session: winner.session, synced: false, backfilled: true,
  };
  fs.appendFileSync(path.join(dir, "index.jsonl"), JSON.stringify(entry) + "\n");
  backfilled = true;
}

const out = {
  agent: wantedAgent,
  winner: winner ? { ...winner, activity_ts: fmt(winner.activity_ts) } : null,
  candidates: candidates.map((c) => ({ ...c, activity_ts: fmt(c.activity_ts) })),
  backfilled,
  notes,
  summary_line: winner
    ? `Melanjutkan ${winner.goal || winner.project || "(tujuan belum bernama)"} dari ${winner.agent} (${fmt(winner.activity_ts) || "waktu tidak tercatat"}), sumber ${winner.source}${winner.session ? ` ${winner.session}` : ""}, berhenti di ${winner.blocker ? `blocker: ${winner.blocker}` : "status terakhir pada checkpoint/sesi"}, berikutnya verifikasi kondisi lokal lalu kerjakan langkah lanjutan dari bukti tersebut.`
    : null,
};
console.log(JSON.stringify(out, null, 2));
if (!winner) process.exitCode = 3;
