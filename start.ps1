$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required. Install Node.js and run this script again.'
}
Push-Location -LiteralPath $PSScriptRoot
try {
    & node (Join-Path $PSScriptRoot 'server.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Preview server exited with code $LASTEXITCODE" }
} finally {
    Pop-Location
}
