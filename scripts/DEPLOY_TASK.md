# Deploy: Claude_Learn Dashboard Server (Task Scheduler)

> Starts the dashboard HTTP server on `http://localhost:8090` automatically 5 minutes after logon.

---

## Files

| File | Purpose |
|------|---------|
| `Claude_Learn_Dashboard_Server.xml` | Task Scheduler export — importable on any Windows device |
| `start-dashboard-server.ps1` | PowerShell script the task runs |

---

## Install — Method 1: PowerShell (Elevated)

Open PowerShell as Administrator and run:

```powershell
Register-ScheduledTask -TaskName "Claude_Learn Dashboard Server" -Xml (Get-Content "G:\Dev\Claude_Learn\scripts\Claude_Learn_Dashboard_Server.xml" | Out-String) -Force
```

## Install — Method 2: GUI Import

1. Open **Task Scheduler** (`taskschd.msc` or search "Task Scheduler")
2. In the right panel, click **Import Task...**
3. Navigate to `G:\Dev\Claude_Learn\scripts\Claude_Learn_Dashboard_Server.xml`
4. Review the settings (see below), click **OK**
5. If prompted for a user account, select your current user

## Install — Method 3: schtasks CLI (Elevated)

```cmd
schtasks /create /tn "Claude_Learn Dashboard Server" /xml "G:\Dev\Claude_Learn\scripts\Claude_Learn_Dashboard_Server.xml" /f
```

---

## Verify

After import, confirm:

1. **Task Scheduler** → Task Scheduler Library → find "Claude_Learn Dashboard Server"
2. Right-click → **Run** to test immediately
3. Open `http://localhost:8090` in a browser — dashboard should load
4. Check **History** tab to confirm it runs on logon

---

## What the Task Does

| Setting | Value | Why |
|---------|-------|-----|
| Trigger | At logon + 5 minute delay | Waits for system to settle after boot |
| Action | `powershell.exe -WindowStyle Hidden ...` | Runs the server script invisibly |
| Multiple instances | Ignore new | Prevents duplicate servers |
| Battery | Runs on battery | Laptop-friendly |
| Time limit | None | Server runs indefinitely |
| Run level | Least privilege | No admin needed |
| Start when available | Yes | Catches up if logon was missed |

---

## Deploying to Another Device

### Prerequisites
- Python 3.10+ installed and on PATH
- Claude_Learn repo cloned to same path, OR edit paths below

### Path Customisation

If the repo is at a different location, edit two files:

**1. `start-dashboard-server.ps1`** — change line 5:
```powershell
$DocsPath = "G:\Dev\Claude_Learn\docs"    # ← change this
```

**2. `Claude_Learn_Dashboard_Server.xml`** — change the Arguments element:
```xml
<Arguments>-WindowStyle Hidden -ExecutionPolicy Bypass -File "G:\Dev\Claude_Learn\scripts\start-dashboard-server.ps1"</Arguments>
```
Replace `G:\Dev\Claude_Learn` with the actual path on the target device.

### Then import using any of the three methods above.

---

## Uninstall

PowerShell (elevated):
```powershell
Unregister-ScheduledTask -TaskName "Claude_Learn Dashboard Server" -Confirm:$false
```

Or GUI: Task Scheduler → right-click the task → Delete.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Server doesn't start | Check `python` is on PATH: `python --version` |
| Port 8090 in use | Edit `$Port` in `start-dashboard-server.ps1` |
| Task shows "running" but no page | Check firewall isn't blocking localhost:8090 |
| Task never triggers | Verify trigger is "At log on" in Task Scheduler GUI |
| Access denied on import | Must run as Administrator for import |
