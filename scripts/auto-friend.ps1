# scripts/auto-friend.ps1
# Script khoi chay tu dong ket ban cheo cac tai khoan Facebook
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bridgeDir = if (Test-Path (Join-Path $scriptDir "dashboard")) { $scriptDir } else { Split-Path $scriptDir -Parent }
$farmScript = Join-Path $bridgeDir "scripts\auto-friend-farm.mjs"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   KỊCH BẢN KẾT BẠN CHÉO FACEBOOK (AUTO-FRIEND)  " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "-> Đang kiểm tra và khởi động tiến trình kết bạn..." -ForegroundColor Green

& node "$farmScript" $args

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   HOÀN TẤT TIẾN TRÌNH! BẤM PHÍM BẤT KỲ ĐỂ THOÁT " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
if (-not $env:CI) {
    [Console]::ReadKey() | Out-Null
}
