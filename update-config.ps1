[CmdletBinding()]
param(
  [string]$DefaultM3u8 = $null,
  [int]$PollMs = $null
)
$cfgPath = Join-Path $PSScriptRoot "config.js"
if (!(Test-Path $cfgPath)) { throw "config.js introuvable." }
$content = Get-Content $cfgPath -Raw
if ($DefaultM3u8) {
  $content = $content -replace '(DEFAULT_M3U8:\s*)".*?"', ('$1"'+$DefaultM3u8+'"')
}
if ($PollMs) {
  $content = $content -replace '(POLL_MS:\s*)\d+', ('$1'+$PollMs)
}
Set-Content -Path $cfgPath -Value $content -Encoding UTF8
Write-Host "config.js mis à jour."
