Write-Host "=== TESTE DE TERMINAL ==="
Write-Host "Data/Hora: $(Get-Date)"
Write-Host "Diretório atual: $(Get-Location)"
Write-Host "Node.js version:"
node --version
Write-Host "NPM version:"
npm --version
Write-Host "Portas em uso (3000-4000):"
netstat -ano | findstr ":300" | Select-Object -First 10
Write-Host "Processos Node.js:"
Get-Process -Name "node" -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime
Write-Host "=== FIM DO TESTE ==="
