@echo off
if /i "%~1"=="spawn" (
  powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0crew.ps1" --crew-batch-guard
  if errorlevel 1 exit /b 2
)
node "%~dp0..\crew.mjs" %*
