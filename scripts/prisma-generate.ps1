# Run this script with Cursor/VS Code CLOSED to avoid EPERM on the Prisma DLL.
# From PowerShell: .\scripts\prisma-generate.ps1

Write-Host "Stopping Node processes that may lock the Prisma engine..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Running prisma generate..."
Set-Location $PSScriptRoot\..
npx prisma generate
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done. You can run npm run dev now."
} else {
  Write-Host "Still failed? Close Cursor/VS Code completely, then run this script again from a new PowerShell (Start menu)."
}
