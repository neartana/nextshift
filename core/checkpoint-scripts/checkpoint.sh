#!/usr/bin/env bash
# checkpoint.sh — simpan progres handoff secara LOKAL dulu, sinkron git kemudian.
# Pakai dari root project:  bash scripts/checkpoint.sh "ringkasan singkat"
#
# Prinsip: checkpoint lokal (index ~/.nextshift/index.jsonl) SELALU ditulis,
# bahkan tanpa git, tanpa remote, atau saat push gagal. Status sinkronisasi
# dicatat apa adanya (synced: true/false) — tidak pernah diklaim berhasil
# kalau push tidak benar-benar sukses.
set -uo pipefail

MSG="${1:-checkpoint}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
AGENT="${NEXTSHIFT_AGENT:-}"
SESSION_REF="${NEXTSHIFT_SESSION:-}"
if [ -z "${AGENT}" ] && [ -f .agent/HANDOFF.md ]; then
  AGENT="$(grep -i -m1 'Terakhir dikerjakan oleh' .agent/HANDOFF.md | sed 's/.*: *//' | tr -d '\r')"
fi

BRANCH=""
COMMIT=""
REPO=""
SYNCED="false"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  REPO="$(git remote get-url origin 2>/dev/null || true)"
  # Stage HANYA .agent/ — jangan pernah menyapu perubahan tak terkait pakai -A.
  if [ -d .agent ]; then git add -- .agent 2>/dev/null || true; fi
  if git diff --cached --quiet 2>/dev/null; then
    echo "Tidak ada perubahan .agent/ untuk di-commit (checkpoint lokal tetap dicatat)."
  else
    if git commit -q -m "wip: handoff checkpoint - ${MSG}"; then
      echo "Commit checkpoint lokal dibuat."
    else
      echo "PERINGATAN: commit gagal — checkpoint hanya tersimpan di index lokal." >&2
    fi
  fi
  COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '')"
  if [ -n "${REPO}" ]; then
    if git push -q origin "${BRANCH}" 2>/dev/null; then
      SYNCED="true"
      echo "Ter-push ke origin/${BRANCH}."
    else
      echo "PERINGATAN: push gagal — checkpoint BELUM tersinkron (synced: false)." >&2
    fi
  else
    echo "Tidak ada remote origin — checkpoint hanya lokal (synced: false)."
  fi
else
  echo "Bukan repo git — checkpoint hanya lokal (synced: false)."
fi

# Index lokal: ditulis PALING AKHIR dan SELALU, tahan interupsi/gagal git.
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
mkdir -p "${HOME}/.nextshift"
printf '{"ts":"%s","activity_ts":"%s","project":"%s","repo":"%s","branch":"%s","commit":"%s","agent":"%s","summary":"%s","session":"%s","synced":%s}\n' \
  "${TS}" "${TS}" "$(esc "$PWD")" "$(esc "${REPO}")" "$(esc "${BRANCH}")" "${COMMIT}" "$(esc "${AGENT}")" "$(esc "${MSG}")" "$(esc "${SESSION_REF}")" "${SYNCED}" \
  >> "${HOME}/.nextshift/index.jsonl"
echo "Tercatat di ~/.nextshift/index.jsonl (agent: ${AGENT:-unknown}, synced: ${SYNCED})"
