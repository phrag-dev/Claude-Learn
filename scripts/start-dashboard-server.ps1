# Start the Claude_Learn dashboard HTTP server
# Triggered by Task Scheduler 5 minutes after boot
# Serves docs/ on http://localhost:8090

$DocsPath = "G:\Dev\Claude_Learn\docs"
$Port = 8090

# Kill any existing instance on this port
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($existing) {
    $existing | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

# Start server
Set-Location $DocsPath
python -m http.server $Port
