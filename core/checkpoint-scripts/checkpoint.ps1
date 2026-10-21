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

# Catat ke index global nextshift (~/.nextshift/index.jsonl) supaya
# perintah "/continue <agent> latest" bisa menemukan project ini.
$agent = $env:NEXTSHIFT_AGENT
if (-not $agent -and (Test-Path ".agent/HANDOFF.md")) {
    $line = Select-String -Path ".agent/HANDOFF.md" -Pattern "Terakhir dikerjakan oleh" | Select-Object -First 1
    if ($line) { $agent = ($line.Line -replace ".*:\s*", "").Trim() }
}
$entry = [ordered]@{
    ts      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    project = (Get-Location).Path
    repo    = (git remote get-url origin 2>$null)
    branch  = $branch
    commit  = (git rev-parse --short HEAD).Trim()
    agent   = $agent
    summary = $Msg
} | ConvertTo-Json -Compress
$dir = Join-Path $HOME ".nextshift"
New-Item -ItemType Directory -Force $dir | Out-Null
Add-Content -Path (Join-Path $dir "index.jsonl") -Value $entry
Write-Host "Tercatat di ~/.nextshift/index.jsonl (agent: ${agent})"
