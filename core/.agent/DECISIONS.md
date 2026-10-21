# DECISIONS — Keputusan & Alasannya

> Append-only. Keputusan di sini TIDAK boleh dibatalkan diam-diam oleh
> agent berikutnya. Kalau memang harus berubah, tulis entri baru yang
> menyebutkan entri lama yang digantikan.

Format setiap entri:

## <YYYY-MM-DD> — <judul keputusan>
- Keputusan: <apa yang dipilih>
- Alasan: <kenapa>
- Alternatif yang ditolak: <apa + kenapa ditolak>
- Oleh: <nama agent / pemilik project>

---

## Contoh — 2026-10-21 — Pakai JWT untuk auth, bukan session cookie
- Keputusan: Auth memakai JWT access token + refresh token.
- Alasan: API juga dipakai aplikasi mobile, session cookie menyulitkan.
- Alternatif yang ditolak: Session cookie — ditolak karena alasan di atas.
- Oleh: Codex (disetujui pemilik project)
