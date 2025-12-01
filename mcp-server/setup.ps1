# UDS-POS MCP Server Setup Script for Windows
# Run this in PowerShell

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "UDS-POS MCP Server Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Set-Location $ScriptDir
npm install

# Build the TypeScript
Write-Host ""
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""

# Config path for Windows
$ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Claude Desktop Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To configure Claude Desktop, add the following to your config file:" -ForegroundColor White
Write-Host "Config location: $ConfigPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Add this to your claude_desktop_config.json:" -ForegroundColor White
Write-Host ""

# Escape backslashes for JSON
$EscapedPath = $ScriptDir -replace '\\', '\\\\'

$ConfigTemplate = @"
{
  "mcpServers": {
    "uds-pos": {
      "command": "node",
      "args": ["$EscapedPath\\\\dist\\\\index.js"],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_URL",
        "SUPABASE_SERVICE_KEY": "YOUR_SUPABASE_SERVICE_KEY"
      }
    }
  }
}
"@

Write-Host $ConfigTemplate -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Environment Variables Required" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUPABASE_URL: Your Supabase project URL" -ForegroundColor White
Write-Host "  Example: https://xxxxx.supabase.co" -ForegroundColor Gray
Write-Host ""
Write-Host "SUPABASE_SERVICE_KEY: Your Supabase service role key" -ForegroundColor White
Write-Host "  (Found in Supabase Dashboard > Settings > API > service_role key)" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After updating your Claude Desktop config:" -ForegroundColor White
Write-Host "1. Restart Claude Desktop completely (quit and reopen)" -ForegroundColor White
Write-Host "2. Look for the hammer icon in the chat input area" -ForegroundColor White
Write-Host "3. You can now use UDS-POS tools in your conversations!" -ForegroundColor White
Write-Host ""
