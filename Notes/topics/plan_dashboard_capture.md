# Plan: Dashboard Capture System (Living Notes)

> Related to: Learning Dashboard (003)
> Status: PLANNING
> Created: 2026-03-06

---

## Problem

The dashboard is read-only — a display board. It needs to be a living tool that captures:
- Thoughts and observations
- Links and resources found
- Questions that need answering (not by Claude — for the user to research)
- Answers discovered through learning
- Status updates on learning items

All in 3 clicks or less. This is a **recorder**, not an interactive session.

---

## Constraint: GitHub Pages is Static

No server, no database. Every input mechanism must work within these bounds:
- Client-side JavaScript only
- No server-side processing
- Data must eventually reach the repo (source of truth)

---

## Architecture: Capture Bar + localStorage + GitHub API Sync

### Three layers working together:

```
Layer 1: Instant Capture (localStorage)
  ↓
Layer 2: Dashboard Display (reads localStorage + JSON)
  ↓
Layer 3: Persist to Repo (GitHub API or build script export)
```

### Why three layers?

| Layer | Purpose | Speed | Persistence |
|-------|---------|-------|-------------|
| localStorage | Capture instantly, works offline | Instant | Browser only |
| Dashboard display | Show captured notes alongside built data | Instant | Session |
| GitHub API sync | Commit notes to repo as markdown files | Seconds | Permanent |

---

## User Experience: The Capture Bar

A persistent, minimal input bar at the bottom of every dashboard page.

### Flow (3 clicks or less):

```
[Item dropdown ▾] [Type dropdown ▾] [Type your note here...          ] [Save]
```

**Click 1:** Select learning item from dropdown (or auto-selected if on a learning item's detail view)
**Click 2:** Type the note (keyboard, not a click)
**Click 3:** Hit Enter or click Save

That's **2 clicks + typing** in the ideal case.

### Note Types:

| Type | Icon | Purpose | Example |
|------|------|---------|---------|
| Thought | 💭 | Observation, idea, connection | "ArcGIS coordinate systems work like CSS transforms" |
| Link | 🔗 | URL with optional comment | "https://learn.arcgis.com — good beginner tutorial" |
| Question | ❓ | Something to research later | "How does ArcGIS handle offline maps?" |
| Answer | ✅ | Resolution to a previous question | "Offline maps use tile packages (.tpk)" |
| Update | 📝 | Status or progress note | "Completed GIS Basics module 1" |

### Behaviour:

- Save → note stored in localStorage immediately
- Note appears in the learning item's notes section instantly
- If GitHub sync is configured: auto-pushes to repo in background
- If not configured: notes accumulate locally, exportable via build script

---

## Data Model

Each captured note:

```json
{
    "id": "note_1709689200_abc",
    "item_id": "002",
    "type": "thought",
    "content": "ArcGIS coordinate systems work like CSS transforms",
    "timestamp": "2026-03-06T10:00:00Z",
    "synced": false
}
```

Stored in localStorage as an array under key `claude_learn_notes`.

---

## Sync Options (Layer 3)

### Option A: GitHub API Direct (Recommended for personal use)

**Setup (one-time):**
1. User creates a fine-grained PAT with `contents: read/write` scope for the Claude_Learn repo only
2. Pastes it into a Settings modal on the dashboard
3. Token saved to localStorage (never leaves the browser, never committed)

**On save:**
1. Note saved to localStorage (instant)
2. JS calls GitHub Contents API to append the note to `Notes/topics/<item_id>_notes.md`
3. If API call fails (offline, rate limit), note stays in localStorage and retries on next save

**Security assessment:**
- Token in localStorage is a risk on a public site
- Mitigated: fine-grained PAT scoped to ONE repo with contents-only permission
- Mitigated: GitHub Pages URL is obscure (not indexed, not linked)
- Mitigated: token cannot access other repos, cannot change settings, cannot delete
- Acceptable risk for a personal tool. If compromised, worst case = someone edits your learning notes.

### Option B: GitHub Issue URL (Zero token required)

**On save:**
1. Note saved to localStorage (instant)
2. "Sync" button opens `https://github.com/<user>/<repo>/issues/new?title=...&body=...&labels=...` in a new tab
3. User clicks "Submit new issue" on GitHub (already authenticated)

**Pros:** Zero token, zero risk, works anywhere
**Cons:** Leaves the dashboard, extra click, notes live in Issues not in files

### Option C: Build Script Export (Offline-first)

**On save:**
1. Note saved to localStorage only

**To persist:**
1. Dashboard has an "Export" button → downloads a markdown file with all unsynced notes
2. Or: `build.py --import-notes` reads a notes JSON file and appends to topic markdown files
3. Or: capture notes locally in Claude Code session → notes go directly into files

**Pros:** Zero token, zero risk, works offline
**Cons:** Manual step required to persist, notes could be lost if browser clears localStorage

---

## Recommendation: Option A with fallback to C

- Default: GitHub API sync (seamless, 2-click capture, auto-persists)
- Fallback: if user doesn't want to set up a token, localStorage + export works
- Both use the same capture bar UI — only the sync layer differs

---

## How Notes Display on the Dashboard

### Learning page — per-item notes panel

Each kanban card gets a note count badge. Clicking a card expands to show:

```
┌─────────────────────────────────────────┐
│ #002 ArcGIS                        OPEN │
│                                         │
│ 📝 3 notes                              │
│                                         │
│ ❓ How does ArcGIS handle offline maps? │
│    2026-03-06 10:00                      │
│                                         │
│ 🔗 https://learn.arcgis.com             │
│    Good beginner tutorial                │
│    2026-03-06 09:30                      │
│                                         │
│ 💭 Coordinate systems = CSS transforms  │
│    2026-03-06 09:15                      │
│                                         │
│ [+ Add note]                            │
└─────────────────────────────────────────┘
```

### Home page — recent notes feed

A "Recent Captures" section showing the last 10 notes across all items, newest first.

---

## File Structure Changes

```
Notes/topics/
├── 002_arcgis.md             ← existing topic doc (research, learning package)
├── 002_arcgis_notes.md       ← NEW: captured notes for item 002
├── 003_dashboard_notes.md    ← NEW: captured notes for item 003
└── ...

docs/js/
├── dashboard.js              ← existing: filtering
├── capture.js                ← NEW: capture bar, localStorage, display
└── sync.js                   ← NEW: GitHub API sync (optional)
```

Notes files are append-only markdown:

```markdown
# Notes: ArcGIS (002)

---

**❓ Question** — 2026-03-06 10:00
How does ArcGIS handle offline maps?

---

**🔗 Link** — 2026-03-06 09:30
https://learn.arcgis.com
Good beginner tutorial

---

**💭 Thought** — 2026-03-06 09:15
Coordinate systems work like CSS transforms
```

---

## Build Integration

`build.py` changes:
1. New parser: `parsers/notes.py` — reads `*_notes.md` files + localStorage export
2. Outputs `data/notes.json` — all notes keyed by item ID
3. Templates updated to render notes inline on learning cards
4. Home template gets "Recent Captures" section

---

## Implementation Plan

### Phase 1: Capture Bar UI
- Add capture bar HTML to base template (appears on every page)
- CSS for the bar (fixed bottom, minimal, dark theme)
- JS: save to localStorage on submit
- JS: display localStorage notes inline on learning cards

### Phase 2: Notes Display
- Update learning.html template for expandable cards with notes
- Add note count badges to kanban cards
- Add "Recent Captures" to home.html
- Merge localStorage notes with built JSON notes for display

### Phase 3: GitHub API Sync
- Settings modal for PAT entry (stored in localStorage)
- `sync.js` — GitHub Contents API: read file, append note, commit
- Auto-sync on save (with retry queue for failures)
- Sync status indicator on capture bar

### Phase 4: Build Pipeline Integration
- `parsers/notes.py` — parse `*_notes.md` files
- `build.py` includes notes in template context
- Export button for offline fallback (download unsynced as markdown)

---

## Decision Needed

**Which sync option to implement first?**

| Option | Clicks | Token Required | Works Offline | Risk |
|--------|--------|---------------|---------------|------|
| A: GitHub API | 2 | Yes (one-time) | Capture yes, sync no | Low (scoped PAT) |
| B: Issue URL | 4 | No | No | None |
| C: Export only | 2 + manual | No | Yes | Notes in localStorage only |

Recommendation: **A** — the 2-click capture with auto-sync is the whole point. The token setup is a one-time cost. If the PAT concerns you, start with C and add A later.
