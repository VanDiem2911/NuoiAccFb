# start-all.ps1
$bridgeDir = if (Test-Path (Join-Path $PSScriptRoot "dashboard")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent }
$dashDir = "$bridgeDir\dashboard"

Start-Process -FilePath "node" -ArgumentList "$dashDir\node_modules\next\dist\bin\next start -p 3100 -H 127.0.0.1" -WorkingDirectory $dashDir -WindowStyle Hidden
Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $bridgeDir -WindowStyle Hidden
Start-Process -FilePath "node" -ArgumentList "bot-server.mjs" -WorkingDirectory $bridgeDir -WindowStyle Hidden

Start-Sleep -Seconds 5
Get-NetTCPConnection -LocalPort 3100,3101,3104 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess, State
