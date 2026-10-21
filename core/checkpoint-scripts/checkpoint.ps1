# checkpoint.ps1 — commit WIP + push dalam satu perintah (Windows PowerShell).
# Pakai dari root project:  .\scripts\checkpoint.ps1 "ringkasan singkat"
param(
    [string]$Msg = "checkpoint"
)

$ErrorActionPreference = "Stop"

$branch = (git symbolic-ref --short HEAD 2>$null)
if (-not $branch) { $branch = (git rev-parse --abbrev-ref HEAD).Trim() }
$branch = $branch.Trim()

git add -A

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "Tidak ada perubahan untuk di-checkpoint."
    exit 0
}

git commit -m "wip: handoff checkpoint - $Msg"
git push origin $branch
Write-Host "Checkpoint ter-push ke origin/${branch}: $Msg"
