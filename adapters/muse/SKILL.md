---
name: nextshift
description: "Continue another AI coding agent's work from a shared .agent/ handoff checkpoint, invoked as /continue <codex|claude-code|opencode|deepseek-harness|muse> [repo]. Use when the user types /continue, or asks Muse to take over / resume a project that Codex, Claude Code, OpenCode, or DeepSeek Harness was working on (e.g. that agent hit its limit mid-task)."
---

# nextshift — Muse melanjutkan pekerjaan agent lain

Pengguna menjalankan Muse dari HP; Muse berjalan di VM-nya sendiri, BUKAN
di komputer pengguna. Pekerjaan agent lain ada di komputer pengguna dan
hanya terlihat oleh Muse lewat GitHub. Skill ini adalah jembatan itu.

## Sintaks

`/continue <agent-sebelumnya> [repo] [target]`

- `<agent-sebelumnya>`: codex | claude-code | opencode | deepseek-harness | muse
  (alias: claude -> claude-code, open-code -> opencode, dsh/deepseek -> deepseek-harness;
  alias dua kata setara bentuk stripnya: `deepseek harness` = deepseek-harness,
  `claude code` = claude-code, `open code` = opencode)
- Kejujuran cakupan: Muse TIDAK bisa membaca index lokal, folder project,
  ataupun riwayat sesi harness (mis. `~/.dsh/sessions`) di komputer
  pengguna — semua itu lokal di mesinnya, dan resolusi `latest` berbasis
  sesi adalah kemampuan agent lokal. Jalur Muse hanyalah checkpoint yang
  sudah ter-push ke GitHub; jangan mengklaim lebih dari itu.
- `[repo]`: nama repo di bawah akun GitHub pengguna (neartana) atau URL clone.
  Kalau tidak disebut, tanyakan SATU kali repo mana — jangan menebak.
- **Mode `latest`** (`/continue codex latest`, atau `/continue latest`):
  repo tidak disebut karena memang harus dicari. Mode ini pada dasarnya
  LOKAL (index `~/.nextshift/index.jsonl` + scan folder project di
  komputer pengguna) — tapi itu wilayah agent lokal di komputernya.
  Muse adalah pengecualian remote yang sah: Muse tidak punya akses
  filesystem komputer pengguna, jadi jalur Muse adalah GitHub: ambil daftar repo pengguna urut dari
  push terbaru (`gh repo list neartana --json name,pushedAt`), lalu untuk
  kandidat teratas periksa `.agent/HANDOFF.md`-nya (raw / gh api contents)
  dan cocokkan kolom "Terakhir dikerjakan oleh" dengan agent yang diminta.
  Repo pertama yang cocok = project latest. Umumkan project + commit-nya
  dalam satu baris sebelum bekerja. Kalau tidak ada repo yang punya
  `.agent/HANDOFF.md` dari agent itu, katakan apa adanya dan tanyakan
  nama repo-nya — tetap jangan menebak.
- Tanpa repo, tanpa mode latest, dan tanpa konteks repo di percakapan ini:
  jangan lanjut.

## Prosedur

1. **Ambil checkpoint terakhir.** Clone repo ke `~/workspace/<repo>` bila
   belum ada; bila sudah ada, `git pull` branch aktifnya. Identitas git:
   `neartana <neartana@users.noreply.github.com>`.
2. **Kalau `.agent/` tidak ada di repo:** pekerjaan itu belum pernah
   di-checkpoint oleh agent sebelumnya. Sampaikan itu apa adanya ke
   pengguna — yang bisa dilanjutkan hanyalah kondisi kode + riwayat commit
   terakhir. Perintah `/continue` dari pengguna adalah izin untuk
   bootstrap: tanam `.agent/` dari template
   plugin nextshift (`core/` di paket plugin), isi CONTEXT.md dari
   codebase, HANDOFF.md dari status git, commit + push.
3. **Baca berurutan:** `.agent/HANDOFF.md`, `PLAN.md`, `DECISIONS.md`,
   `CONTEXT.md`, entri terakhir `SESSION_LOG.md`.
   Verifikasi: `git status`, `git log --oneline -5`, `git diff`, dan test
   yang tercatat di HANDOFF bila memungkinkan dijalankan di VM ini.
   Bila kolom "Terakhir dikerjakan oleh" tidak cocok dengan
   `<agent-sebelumnya>` dari perintah, sebutkan bedanya satu kalimat,
   lalu lanjut dari checkpoint yang benar-benar ada.
4. **Catat pengambilalihan** di `.agent/SESSION_LOG.md`:
   `## <tanggal-jam> — muse (mengambil alih dari <agent-sebelumnya>)`.
5. **Bekerja** dari bagian "Langkah berikutnya" di HANDOFF. Hormati
   DECISIONS.md, jangan ulangi yang tercatat gagal. Update HANDOFF
   setelah tiap langkah berarti; commit WIP + push berkala — checkpoint
   yang belum ter-push tidak terlihat oleh agent di komputer pengguna.
6. **Tutup sesi:** HANDOFF lengkap dengan "Terakhir dikerjakan oleh: muse",
   entri penutup SESSION_LOG + hash commit, PLAN diperbarui bila perlu,
   commit + push. Laporkan ke pengguna 3-5 baris: mengambil alih dari
   checkpoint apa, mengerjakan apa, berhenti di mana, commit terakhir.

## Aturan

- Jangan pernah menulis nama asli atau email pribadi pengguna di file,
  README, metadata, atau commit yang di-push (aturan privasi tetap:
  hanya "neartana").
- Jangan commit rahasia (API key, token, password, `.env` asli).
- Jangan mengarang status test: yang belum dijalankan tulis apa adanya.
