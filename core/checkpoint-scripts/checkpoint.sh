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
