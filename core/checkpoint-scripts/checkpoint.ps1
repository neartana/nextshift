# checkpoint.ps1 — simpan progres handoff secara LOKAL dulu, sinkron git kemudian (Windows PowerShell).
# Pakai dari root project:  .\scripts\checkpoint.ps1 "ringkasan singkat"
#
# Prinsip: checkpoint lokal (index ~/.nextshift/index.jsonl) SELALU ditulis,
# bahkan tanpa git, tanpa remote, atau saat push gagal. Status sinkronisasi
# dicatat apa adanya (synced: true/false).
param(
    [string]$Msg = "checkpoint"
)

$ErrorActionPreference = "Continue"
$ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$agent = $env:NEXTSHIFT_AGENT
if (-not $agent -and (Test-Path ".agent/HANDOFF.md")) {
    $line = Select-String -Path ".agent/HANDOFF.md" -Pattern "Terakhir dikerjakan oleh" | Select-Object -First 1
    if ($line) { $agent = ($line.Line -replace ".*:\s*", "").Trim() }
}

$branch = ""; $commit = ""; $repo = ""; $synced = $false

git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    $branch = (git symbolic-ref --short HEAD 2>$null)
    if (-not $branch) { $branch = (git rev-parse --abbrev-ref HEAD 2>$null) }
    $branch = "$branch".Trim()
    $repo = (git remote get-url origin 2>$null)
    # Stage HANYA .agent/ — jangan menyapu perubahan tak terkait.
    if (Test-Path ".agent") { git add -- .agent 2>$null | Out-Null }
    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tidak ada perubahan .agent/ untuk di-commit (checkpoint lokal tetap dicatat)."
    } else {
        git commit -q -m "wip: handoff checkpoint - $Msg"
        if ($LASTEXITCODE -eq 0) { Write-Host "Commit checkpoint lokal dibuat." }
        else { Write-Warning "Commit gagal - checkpoint hanya tersimpan di index lokal." }
    }
    $commit = (git rev-parse --short HEAD 2>$null)
    $commit = "$commit".Trim()
    if ($repo) {
        git push -q origin $branch 2>$null
        if ($LASTEXITCODE -eq 0) { $synced = $true; Write-Host "Ter-push ke origin/${branch}." }
        else { Write-Warning "Push gagal - checkpoint BELUM tersinkron (synced: false)." }
    } else {
        Write-Host "Tidak ada remote origin - checkpoint hanya lokal (synced: false)."
    }
} else {
    Write-Host "Bukan repo git - checkpoint hanya lokal (synced: false)."
}

# Index lokal: ditulis PALING AKHIR dan SELALU.
$entry = [ordered]@{
    ts          = $ts
    activity_ts = $ts
    project     = (Get-Location).Path
    repo        = $repo
    branch      = $branch
    commit      = $commit
    agent       = $agent
    summary     = $Msg
    session     = $env:NEXTSHIFT_SESSION
    synced      = $synced
} | ConvertTo-Json -Compress
$dir = Join-Path $HOME ".nextshift"
New-Item -ItemType Directory -Force $dir | Out-Null
Add-Content -Path (Join-Path $dir "index.jsonl") -Value $entry
Write-Host "Tercatat di ~/.nextshift/index.jsonl (agent: ${agent}, synced: ${synced})"
