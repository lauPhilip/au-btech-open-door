# Creates labels, milestones and issues on GitHub from backlog/issues.json.
# Needs the GitHub CLI: winget install GitHub.cli, then: gh auth login
# Run from anywhere inside the repository:  ./scripts/create-issues.ps1
# Safe to run twice: existing milestones and issues (same title) are skipped.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "The GitHub CLI 'gh' was not found. Install it with: winget install GitHub.cli" -ForegroundColor Red
    exit 1
}
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please sign in first: gh auth login" -ForegroundColor Red
    exit 1
}

$root = Split-Path -Parent $PSScriptRoot
$data = Get-Content (Join-Path $root 'backlog/issues.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$repo = gh repo view --json nameWithOwner -q .nameWithOwner
Write-Host "Repository: $repo" -ForegroundColor Cyan

# Labels (updated if they already exist)
foreach ($l in $data.labels) {
    gh label create $l.name --color $l.color --description $l.description --force | Out-Null
    Write-Host "label      $($l.name)"
}

# Milestones
$existingMilestones = @((gh api "repos/$repo/milestones?state=all&per_page=100" | Out-String | ConvertFrom-Json) | ForEach-Object { $_.title })
foreach ($m in $data.milestones) {
    if ($existingMilestones -contains $m.title) { Write-Host "skip       $($m.title)"; continue }
    gh api "repos/$repo/milestones" -f "title=$($m.title)" -f "description=$($m.description)" | Out-Null
    Write-Host "milestone  $($m.title)"
}

# Issues
$existingIssues = @((gh issue list --state all --limit 500 --json title | Out-String | ConvertFrom-Json) | ForEach-Object { $_.title })
$bodyFile = New-TemporaryFile
$utf8 = New-Object Text.UTF8Encoding $false
$created = 0
foreach ($i in $data.issues) {
    if ($existingIssues -contains $i.title) { Write-Host "skip       $($i.title)"; continue }
    [IO.File]::WriteAllText($bodyFile.FullName, $i.body, $utf8)
    $ghArgs = @('issue', 'create', '--title', $i.title, '--body-file', $bodyFile.FullName, '--milestone', $i.milestone)
    foreach ($label in $i.labels) { $ghArgs += @('--label', $label) }
    gh @ghArgs | Out-Null
    $created++
    Write-Host "issue      $($i.title)"
}
Remove-Item $bodyFile.FullName

Write-Host "Done. $created new issues created." -ForegroundColor Green
