#!/usr/bin/env bash
# checkpoint.sh — commit WIP + push dalam satu perintah.
# Pakai dari root project:  bash scripts/checkpoint.sh "ringkasan singkat"
set -euo pipefail

MSG="${1:-checkpoint}"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD)"

git add -A

if git diff --cached --quiet; then
  echo "Tidak ada perubahan untuk di-checkpoint."
  exit 0
fi

git commit -m "wip: handoff checkpoint - ${MSG}"
git push origin "${BRANCH}"
echo "Checkpoint ter-push ke origin/${BRANCH}: ${MSG}"

# Catat ke index global nextshift (~/.nextshift/index.jsonl) supaya
# perintah "/continue <agent> latest" bisa menemukan project ini.
AGENT="${NEXTSHIFT_AGENT:-}"
if [ -z "${AGENT}" ] && [ -f .agent/HANDOFF.md ]; then
  AGENT="$(grep -i -m1 'Terakhir dikerjakan oleh' .agent/HANDOFF.md | sed 's/.*: *//' | tr -d '\r')"
fi
COMMIT="$(git rev-parse --short HEAD)"
REPO="$(git remote get-url origin 2>/dev/null || true)"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
mkdir -p "${HOME}/.nextshift"
printf '{"ts":"%s","project":"%s","repo":"%s","branch":"%s","commit":"%s","agent":"%s","summary":"%s"}\n' \
  "${TS}" "$(esc "$PWD")" "$(esc "${REPO}")" "$(esc "${BRANCH}")" "${COMMIT}" "$(esc "${AGENT}")" "$(esc "${MSG}")" \
  >> "${HOME}/.nextshift/index.jsonl"
echo "Tercatat di ~/.nextshift/index.jsonl (agent: ${AGENT:-unknown})"
