# AGENTS.md — Protokol Handoff Antar Agent

File ini dibaca oleh Codex, OpenCode, Claude Code, dan agent lain yang bekerja
di project ini. Tujuannya satu: agent mana pun yang membuka project ini bisa
melanjutkan pekerjaan agent sebelumnya tanpa mengulang, tanpa menebak, dan
tanpa membatalkan keputusan yang sudah diambil.

## WAJIB di awal setiap sesi

Kalau folder `.agent/` belum ada dan kamu dipanggil lewat `/continue`:
bootstrap folder itu dari template nextshift sebelum hal lain. Pemanggilan
`/continue` adalah izin pemilik project untuk menanamnya — jangan di-skip
dan jangan menunggu izin terpisah. Folder ini akan ter-commit, jadi jangan
pernah mengisinya dengan rahasia (API key, token, password, isi `.env`).

Sebelum menulis kode apa pun, baca berurutan:

1. `.agent/HANDOFF.md`   — pekerjaan berhenti persis di mana, langkah berikutnya apa
2. `.agent/PLAN.md`      — checklist besar: selesai / sedang jalan / belum
3. `.agent/DECISIONS.md` — keputusan yang sudah diambil + alasannya (JANGAN dibatalkan diam-diam)
4. `.agent/CONTEXT.md`   — cara menjalankan project, perintah test/build, konvensi, jebakan

Lalu verifikasi silang dengan kenyataan, jangan percaya file secara buta:

- `git status` dan `git log --oneline -5`
- `git diff` untuk perubahan yang belum di-commit
- Jalankan test yang relevan dengan status terakhir di HANDOFF

Kalau isi HANDOFF bertentangan dengan kondisi kode, kode yang menang —
dan perbaiki HANDOFF-nya.

## WAJIB selama bekerja — checkpoint, bukan di akhir

Limit / kuota agent bisa habis mendadak di tengah sesi. Karena itu
`.agent/HANDOFF.md` HARUS diperbarui:

- setelah menyelesaikan satu langkah berarti,
- setelah mengubah file penting,
- setelah menjalankan test (catat hasil persisnya: lolos / gagal + pesan error),
- sebelum menjalankan proses panjang,
- dan tentu saja sebelum mengakhiri sesi.

Setiap update HANDOFF wajib mengisi minimal:

- Siapa yang mengerjakan (nama agent) + tanggal-jam
- Tujuan sesi ini
- Yang SUDAH selesai (spesifik: file + fungsi, bukan "progress auth")
- Yang SEDANG dikerjakan dan berhenti persis di mana
- Yang SUDAH DICOBA DAN GAGAL — beserta alasannya, supaya tidak diulang
- Langkah berikutnya, ditulis sebagai perintah konkret berurutan
- Daftar file yang diubah sesi ini
- Hasil test terakhir

## Keputusan

Setiap keputusan non-trivial (pilihan library, arsitektur, pendekatan yang
ditolak) dicatat di `.agent/DECISIONS.md` dengan format:
tanggal — keputusan — alasan — alternatif yang ditolak dan kenapa.

Agent berikutnya tidak boleh membatalkan keputusan tercatat tanpa alasan
baru yang juga dicatat di file yang sama.

## Sesi

Setiap sesi ditutup dengan satu entri di `.agent/SESSION_LOG.md`:
tanggal-jam, nama agent, ringkasan 2-4 baris, hash commit terakhir.
File ini append-only — jangan edit entri lama.

## Git & GitHub

- Sering-sering commit WIP, lalu `push`. Checkpoint yang belum ter-push
  TIDAK ADA bagi agent di mesin lain (mis. Muse yang diakses dari HP).
- Pesan commit checkpoint: `wip: handoff checkpoint <ringkasan singkat>`
- Mode `latest` bersifat LOKAL: resolusinya dari index
  `~/.nextshift/index.jsonl`, lalu pemindaian folder project lokal.
  Agent yang berjalan di mesin ini TIDAK BOLEH fallback memindai GitHub
  untuk mode latest (GitHub hanya untuk agent remote / lintas-mesin).
- Setiap checkpoint juga dicatat ke index global `~/.nextshift/index.jsonl`
  (script checkpoint melakukannya otomatis). Index ini yang dipakai perintah
  `/continue <agent> latest` untuk menemukan project terakhir dari agent itu.
  Kalau checkpoint manual (tanpa script), tambahkan sendiri satu baris JSON:
  `{"ts":..., "project":..., "repo":..., "branch":..., "commit":..., "agent":..., "summary":...}`.
- Jangan force-push ke branch yang dipakai bersama tanpa izin pemilik project.
- Jangan commit rahasia: API key, token, password, file `.env` asli.
- Identitas commit memakai `neartana <neartana@users.noreply.github.com>`.
  Jangan pernah menulis nama asli atau email pribadi pemilik project di
  file, README, metadata, atau commit yang akan di-push ke GitHub.

## Aturan kerja umum

- Jangan mengarang status: kalau test belum dijalankan, tulis "belum dijalankan".
- Kalau ragu / terblokir, tuliskan di HANDOFF bagian "Blocker" — jangan diam.
- Perubahan kecil dan terverifikasi lebih baik daripada perubahan besar yang belum dites.
