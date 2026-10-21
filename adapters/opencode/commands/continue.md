---
description: Continue another AI agent's work (codex, claude-code, opencode, deepseek-harness, muse) from the shared .agent/ handoff checkpoint in this project.
---

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
- **Mode `latest`:** bila token kedua adalah `latest` (mis.
  `/continue codex latest`), atau argumen hanya `latest`, project-nya
  BUKAN direktori saat ini — project adalah pekerjaan TERAKHIR dari
  `<agent-sebelumnya>` (atau dari agent mana pun bila agent tidak disebut),
  yang ditemukan lewat Langkah 1b. Mode ini yang dipakai saat pengguna
  ingin agent langsung paham "produk terakhir yang dikerjakan" tanpa
  menyebut nama project/repo.

**Prinsip dasar — local by default:** semua pekerjaan `/continue`
berlangsung di mesin tempat kamu berjalan dan terhadap file lokal.
GitHub hanya jembatan antar-mesin: gunakan hanya bila repo disebut
eksplisit sebagai argumen, atau kamu agent remote tanpa akses ke
filesystem mesin pemilik. Jangan pernah menjadikan GitHub jalur
pencarian/fallback diam-diam untuk perintah yang bisa diselesaikan
secara lokal.

## Langkah 0 — Kenali dirimu

Catat nama harness-mu sendiri (codex / claude-code / opencode /
deepseek-harness / muse). Nama ini yang akan kamu tulis sebagai pengambil
alih di SESSION_LOG dan sebagai "Terakhir dikerjakan oleh" di HANDOFF
di akhir sesi.

## Langkah 1 — Temukan project & checkpoint terakhir

1. Tentukan root project: direktori kerja saat ini, atau repo/path dari
   argumen. Bila kamu di mesin lain dan repo belum ada lokal: clone repo
   itu, lalu `git pull` branch aktifnya.
2. Kalau folder `.agent/` TIDAK ADA di root project: bootstrap dulu —
   dan JANGAN di-skip. **Pemanggilan perintah ini sendiri adalah izin
   pemilik project untuk menanam folder `.agent/`.** Kamu tidak perlu
   meminta izin lagi, dan jangan berhenti hanya karena foldernya belum
   ada. (Satu-satunya pengecualian: pengguna secara eksplisit meminta
   mode read-only / laporan saja.)
   Buat `.agent/HANDOFF.md`, `PLAN.md`, `DECISIONS.md`, `CONTEXT.md`,
   `SESSION_LOG.md` serta `AGENTS.md` dan `CLAUDE.md` mengikuti template
   plugin nextshift (di folder plugin: `core/`). Isi `CONTEXT.md`
   dari codebase yang ada dan `HANDOFF.md` dari status git saat ini,
   commit + push, lalu lanjut ke langkah 2. Ingat: folder `.agent/`
   akan ter-commit — jangan pernah mengisinya dengan rahasia (API key,
   token, password, isi `.env`).

## Langkah 1b — Mode latest: temukan pekerjaan terakhir

Hanya berlaku bila mode `latest` aktif:

1. **PRINSIP: mode latest bersifat LOKAL.** Perintah ini berjalan di
   mesin pemilik dan pekerjaan yang dicari juga ada di mesin itu.
   JANGAN memindai GitHub, jangan memanggil API GitHub, dan jangan
   meng-clone apa pun untuk menyelesaikan mode latest — kecuali kamu
   agent remote yang memang TIDAK punya akses filesystem mesin pemilik
   (mis. Muse), ATAU pengguna secara eksplisit meminta pencarian
   lintas-mesin. Agent lokal yang lari ke GitHub itu SALAH.

2. **Baca index global:** `~/.nextshift/index.jsonl` (satu baris JSON
   per checkpoint, ditulis otomatis oleh script checkpoint dan boleh
   ditambah manual oleh agent). Ambil baris TERAKHIR yang kolom
   `agent`-nya cocok dengan `<agent-sebelumnya>` (abaikan huruf
   besar/kecil dan alias). Baris itu berisi `project` (path lokal),
   `repo` (URL git), `branch`, `commit`, dan `ts` (waktu checkpoint).

3. **Bila index tidak ada / tidak ada baris yang cocok — pindai folder
   LOKAL:** cari `.agent/HANDOFF.md` di root pencarian berikut, sedalam
   maks. 3 level: direktori saat ini dan induknya, direktori home
   pengguna, dan folder umum project (`~/Documents`, `~/projects`,
   `~/dev`, `~/code`, `~/workspace`, `~/repos`, `~/source` — yang ada
   saja). Untuk setiap HANDOFF yang ditemukan, cocokkan kolom
   "Terakhir dikerjakan oleh" dengan `<agent-sebelumnya>`; ambil yang
   file HANDOFF-nya paling baru diubah. Setiap project yang ditemukan
   dengan cara ini WAJIB dicatat (backfill) ke
   `~/.nextshift/index.jsonl` (path, remote git bila ada, branch,
   commit terakhir dari `git log -1`, agent dari HANDOFF) supaya
   resolusi berikutnya instan.

4. Masuk ke project hasil resolusi itu (`cd` ke path lokalnya), lalu
   umumkan ke pengguna dalam SATU baris project + commit checkpoint
   yang kamu ambil, sebelum mulai bekerja — supaya resolusi
   "latest"-nya transparan dan bisa dikoreksi.

5. Bila tetap tidak ditemukan secara lokal: BERHENTI, katakan apa
   adanya bahwa belum ada checkpoint lokal dari agent itu, dan tanyakan
   path project-nya. Jangan mengarang, dan jangan lari ke GitHub.

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
