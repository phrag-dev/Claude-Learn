# Windows Task Scheduler

> Learning ID: 005 | Status: OPEN
> Created: 2026-03-06

---

## What It Is

Windows Task Scheduler (`taskschd.msc`) is a built-in Windows service that runs programs, scripts, or commands automatically based on triggers (time, event, logon, boot, idle, etc).

---

## Key Concepts

### Triggers
When the task fires. Can stack multiple triggers on one task.

| Trigger | Use Case |
|---------|----------|
| At log on | Start user-facing services after login |
| On a schedule | Daily/weekly/monthly recurring tasks |
| At startup | System-level services before any user logs in |
| On an event | React to Event Viewer entries (e.g. error logged) |
| On idle | Run maintenance when user is away |
| On workstation lock/unlock | Security or sync tasks |

**Delay:** Most triggers support a delay (e.g. `PT5M` = 5 minutes after trigger fires). Useful for letting the system settle after boot.

### Actions
What the task does. Usually one of:
- **Start a program** — runs an .exe, .ps1, .bat, .py, etc.
- **Send an email** — deprecated but still in the UI
- **Display a message** — deprecated

### Principals
Who the task runs as:
- **Interactive user** — runs as whoever is logged in
- **Specific user** — runs as a named account (even if not logged in — requires "Run whether user is logged on or not")
- **SYSTEM** — runs as the local system account (highest privilege)

**Run level:** `LeastPrivilege` (standard user) or `HighestAvailable` (admin if available).

### Settings (important ones)

| Setting | What It Does |
|---------|-------------|
| `MultipleInstancesPolicy` | What happens if the task triggers while already running: `IgnoreNew`, `Parallel`, `Queue`, `StopExisting` |
| `ExecutionTimeLimit` | Kill the task after this duration. `PT0S` = no limit (run forever). |
| `StartWhenAvailable` | If the trigger was missed (laptop was off), run it when next available |
| `DisallowStartIfOnBatteries` | Prevents running on battery. Set `false` for laptop-friendly tasks. |
| `StopIfGoingOnBatteries` | Kills running task when unplugged. Set `false` to keep running. |
| `Hidden` | Hides from basic Task Scheduler view (still visible in "Show Hidden Tasks") |
| `AllowStartOnDemand` | Allows manual "Run" from the GUI |

---

## XML Format

Tasks can be exported/imported as XML. Key elements:

```xml
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>    <!-- name, description, author -->
  <Triggers>            <!-- when it fires -->
  <Principals>          <!-- who it runs as -->
  <Settings>            <!-- behaviour config -->
  <Actions>             <!-- what it does -->
</Task>
```

**Duration format:** ISO 8601 durations — `PT5M` (5 min), `PT1H` (1 hour), `PT0S` (zero/unlimited), `P1D` (1 day).

---

## CLI Tools

### schtasks (cmd) — quick but limited
```cmd
schtasks /create /tn "Name" /xml "path.xml" /f
schtasks /run /tn "Name"
schtasks /query /tn "Name" /fo list /v
schtasks /delete /tn "Name" /f
```

### PowerShell — full control
```powershell
# Create
$action = New-ScheduledTaskAction -Execute 'program.exe' -Argument '-flag value'
$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = 'PT5M'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "Name" -Action $action -Trigger $trigger -Settings $settings -Force

# Import from XML
Register-ScheduledTask -TaskName "Name" -Xml (Get-Content "task.xml" | Out-String) -Force

# Query
Get-ScheduledTask -TaskName "Name" | Get-ScheduledTaskInfo

# Run now
Start-ScheduledTask -TaskName "Name"

# Remove
Unregister-ScheduledTask -TaskName "Name" -Confirm:$false
```

**Note:** Both `schtasks /create` and `Register-ScheduledTask` require **elevated PowerShell** (Run as Administrator) for logon/startup triggers.

---

## Common Patterns

### Long-running background process
- Trigger: At logon with delay
- Action: PowerShell `-WindowStyle Hidden`
- Settings: No time limit, ignore new instances, run on battery
- Example: Dashboard server, file watcher, sync daemon

### Recurring maintenance
- Trigger: Daily at 2 AM
- Action: Cleanup script
- Settings: 1-hour time limit, start when available
- Example: Log rotation, temp file cleanup

### Event-driven reaction
- Trigger: On Event (Event Viewer log + ID)
- Action: Notification or remediation script
- Settings: Queue if multiple
- Example: Alert on service crash, auto-restart

---

## Gotchas

- **"Run whether user is logged on or not"** requires storing the user's password in the task. If the password changes, the task breaks silently.
- **"Run with highest privileges"** doesn't mean SYSTEM — it means the user's admin token (UAC elevated).
- **Working directory** is NOT set by default. Always use absolute paths in scripts, or set `-WorkingDirectory` in the action.
- **PowerShell execution policy** may block scripts. Use `-ExecutionPolicy Bypass` in the action arguments.
- **Hidden tasks** are still visible under View → Show Hidden Tasks. Not a security measure.
- **schtasks CLI in Git Bash** mangles paths (prefixes `/c/Program Files/Git/`). Use PowerShell or cmd instead.

---

## Project Reference

The Claude_Learn dashboard server task is at:
- XML: `scripts/Claude_Learn_Dashboard_Server.xml`
- Script: `scripts/start-dashboard-server.ps1`
- Deploy guide: `scripts/DEPLOY_TASK.md`
