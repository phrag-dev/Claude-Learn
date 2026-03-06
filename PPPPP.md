# PPPPP.md — Master Controller
# Claude_Learn Repository

> **This is the master controller for this repository.**
> Claude must always reference this file first before any action.
> Last Updated: 2026-03-06

---

## Purpose

`Claude_Learn` is a personal knowledge, skills investigation, and learning repository.
It tracks things to investigate, documents learnings, and scaffolds skills for use with Claude Code and Claude.ai.

---

## Principles

- Do not action learning items unless explicitly asked.
- All code must be PowerShell 5.1 compliant unless explicitly stated otherwise.
- Documentation produced via professional OOXML methods when a file output is required.
- Log all significant actions in `/log`.
- Record all bugs found in `/bug` for regular reference and learning.
- Build is driven from process and skills documents.
- When in doubt — ask if a new or updated skill should be created.

---

## Project Structure

```
Claude_Learn/
├── PPPPP.md                  ← This file. Master controller. Always read first.
├── CLAUDE.md                 ← Claude Code entry point and secrets management
├── README.md                 ← Human-facing project overview
│
├── Notes/
│   ├── README.md             ← Notes directory guide
│   ├── LEARNING_SYSTEM.md    ← Rules governing the learning tracker
│   ├── LEARNING_TRACKER.md   ← Live status index (OPEN | LEARNING | CLOSED)
│   └── topics/               ← One .md per CLOSED learning item
│
├── skills/                   ← Custom SKILL.md files for Claude Code / Claude.ai
│
├── docs/                     ← Reference documents, research, architecture notes
│
├── log/                      ← Session and action logs
│   └── LOG_TEMPLATE.md
│
├── bug/                      ← Bug register for learning and reference
│   └── BUG_REGISTER.md
│
└── .secrets/                 ← API keys and secrets (gitignored)
```

---

## Notes & Learning

- Rules:   `Notes/LEARNING_SYSTEM.md`
- Tracker: `Notes/LEARNING_TRACKER.md`
- Topics:  `Notes/topics/`

---

## Active Learning Items

> Managed in `Notes/LEARNING_TRACKER.md`. Summary here for quick reference.

| ID | Topic | Status |
|----|-------|--------|
| 001 | Skills v2 / Claude Code implementation | LEARNING |

---

## Log Convention

File naming: `log/YYYY-MM-DD_description.md`
All sessions with significant output or decisions must be logged.

---

## Bug Convention

All bugs recorded in `bug/BUG_REGISTER.md`.
Bugs are never deleted — status updated only.

| Field | Values |
|-------|--------|
| Status | OPEN / RESOLVED / WONTFIX |
| Source | File or system where found |

---

## Secrets Management

Managed via `.secrets/secrets.sh`. See `CLAUDE.md` for full usage.
Never output secret values in chat. Always verify `.secrets/` is in `.gitignore`.

---

## Key Files Quick Reference

| File | Role |
|------|------|
| `PPPPP.md` | Master controller — always read first |
| `CLAUDE.md` | Claude Code entry point |
| `Notes/LEARNING_TRACKER.md` | What to learn and current status |
| `Notes/LEARNING_SYSTEM.md` | Rules for the learning tracker |
| `bug/BUG_REGISTER.md` | Bug register |
| `log/` | Session logs |
