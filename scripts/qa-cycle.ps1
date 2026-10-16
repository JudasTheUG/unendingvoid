# Unending Void QA Cycle Script
$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Users\PC\AppData\Roaming\npm;" + $env:Path

Write-Host "[1/2] Building Web Application (Vite -> dist)..." -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Running Automated Tests and GitHub Reporter..." -ForegroundColor Cyan
& node.exe scripts/test-and-report.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tests failed or reported to GitHub with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "Full QA Cycle Completed Successfully!" -ForegroundColor Green
