# Unending Void QA Cycle Script
$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Users\PC\AppData\Roaming\npm;" + $env:Path

Write-Host "🔨 Building Web Application (Vite -> dist)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🧪 Running Automated Tests with Vitest & Reporter..." -ForegroundColor Cyan
node scripts/test-and-report.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed — GitHub issue reporter executed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Full QA Cycle Completed Successfully!" -ForegroundColor Green
