---
name: continue
description: Continue another AI agent's work (codex, claude-code, opencode, deepseek-harness, muse) from the shared .agent/ handoff checkpoint in this project. Invoke manually with $continue <previous-agent>; do not auto-invoke.
---

> Invocation note (skill-based harnesses): the argument is the text the user typed after invoking this skill — treat it exactly as `$ARGUMENTS` below.

# /continue — Lanjutkan Pekerjaan Agent Lain

Kamu dipanggil dengan argumen: `$ARGUMENTS`

Format argumen: `<agent-sebelumnya> [repo-atau-path] [target-sesi]`

- `<agent-sebelumnya>` adalah agent yang checkpoint terakhirnya akan kamu
  lanjutkan. Nilai yang dikenal: `codex`, `claude-code`, `opencode`,
  `deepseek-harness`, `muse`. Alias: `claude` -> claude-code,
  `open-code` -> opencode, `dsh`/`deepseek` -> deepseek-harness.
- Kalau argumen kosong: lanjutkan dari checkpoint terakhir, siapa pun
  agent-nya.
- `[repo-atau-path]` hanya relevan bila kamu berjalan di mesin lain dari
  pekerjaan itu (mis. Muse dari HP): itu nama/URL repo GitHub tempat
  checkpoint terakhir di-push.

## Langkah 0 — Kenali dirimu

Catat nama harness-mu sendiri (codex / claude-code / opencode /
deepseek-harness / muse). Nama ini yang akan kamu tulis sebagai pengambil
alih di SESSION_LOG dan sebagai "Terakhir dikerjakan oleh" di HANDOFF
di akhir sesi.

## Langkah 1 — Temukan project & checkpoint terakhir

1. Tentukan root project: direktori kerja saat ini, atau repo/path dari
   argumen. Bila kamu di mesin lain dan repo belum ada lokal: clone repo
   itu, lalu `git pull` branch aktifnya.
2. Kalau folder `.agent/` TIDAK ADA di root project: bootstrap dulu.
   Buat `.agent/HANDOFF.md`, `PLAN.md`, `DECISIONS.md`, `CONTEXT.md`,
   `SESSION_LOG.md` serta `AGENTS.md` dan `CLAUDE.md` mengikuti template
   plugin nextshift (di folder plugin: `core/`). Isi `CONTEXT.md`
   dari codebase yang ada dan `HANDOFF.md` dari status git saat ini,
   commit + push, lalu lanjut ke langkah 2.

## Langkah 2 — Baca, lalu verifikasi (jangan percaya buta)

Baca berurutan:

1. `.agent/HANDOFF.md`
2. `.agent/PLAN.md`
3. `.agent/DECISIONS.md`
4. `.agent/CONTEXT.md`
5. Entri terakhir `.agent/SESSION_LOG.md`

Lalu verifikasi dengan kenyataan:

- `git status`, `git log --oneline -5`, `git diff` (perubahan belum commit)
- Cek kolom "Terakhir dikerjakan oleh" di HANDOFF. Kalau isinya BUKAN
  `<agent-sebelumnya>` dari argumen, sampaikan perbedaan itu ke user dalam
  satu kalimat, lalu lanjutkan dari checkpoint yang benar-benar ada —
  jangan berhenti hanya karena argumennya tidak cocok.
- Jalankan test yang tercatat di HANDOFF ("Hasil test terakhir") bila ada.

Kalau isi HANDOFF bertentangan dengan kondisi kode, kode yang menang,
dan perbaiki HANDOFF-nya sebagai langkah pertamamu.

## Langkah 3 — Catat pengambilalihan

Tambahkan entri di `.agent/SESSION_LOG.md` (append, jangan edit entri lama):

```
## <YYYY-MM-DD HH:MM> — <namamu> (mengambil alih dari <agent-sebelumnya>)
- Ringkasan: Mengambil alih dari checkpoint <hash commit terakhir>.
  Target sesi ini: <target>.
- Status akhir: mulai bekerja
```

## Langkah 4 — Bekerja dari "Langkah berikutnya"

- Kerjakan persis dari bagian "Langkah berikutnya" di HANDOFF, berurutan.
- Hormati `DECISIONS.md`: jangan membatalkan keputusan tercatat tanpa
  alasan baru yang kamu catat di file yang sama.
- Jangan mengulangi apapun yang tercatat di "Sudah dicoba dan GAGAL".
- Checkpoint berkala, bukan di akhir: update `.agent/HANDOFF.md` setelah
  tiap langkah berarti / file penting diubah / test dijalankan, lalu
  commit WIP + push (script `checkpoint` bila tersedia di project:
  `bash scripts/checkpoint.sh "<ringkasan>"`). Checkpoint yang belum
  ter-push tidak ada bagi agent di mesin lain.
- Jangan commit rahasia (API key, token, password, `.env` asli).

## Langkah 5 — Tutup sesi dengan handoff yang bersih

Sebelum berhenti (atau saat target sesi tercapai):

1. Update `.agent/HANDOFF.md` lengkap: sudah selesai (spesifik),
   berhenti persis di mana, gagal-apa saja + alasannya, langkah
   berikutnya yang konkret, file yang diubah, hasil test terakhir,
   dan "Terakhir dikerjakan oleh" = namamu.
2. Tambah entri penutup di `.agent/SESSION_LOG.md` dengan hash commit.
3. Perbarui `.agent/PLAN.md` bila ada tugas yang selesai/dimulai.
4. Commit + push. Di pesan penutup ke user, laporkan dalam 3-5 baris:
   mengambil alih dari checkpoint apa, mengerjakan apa, berhenti di
   mana, dan commit terakhirnya apa.
