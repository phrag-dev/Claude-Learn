# Learning System — Rules

This document defines how the Notes learning tracker operates.
Referenced by: PPPPP.md, LEARNING_TRACKER.md

## Rules

- **Do not action any item unless explicitly asked.**
- When asked to present the list, display all non-CLOSED items from `LEARNING_TRACKER.md`.
- CLOSED items are hidden from default list view unless specifically requested.
- When an item is actioned, confirm status change and update `LEARNING_TRACKER.md`.

## Status Definitions

| Status | Meaning |
|--------|---------|
| OPEN | Not yet investigated |
| LEARNING | Activity in progress |
| CLOSED | Completed — no longer displayed by default |

## Closing an Item

An item may only be set to CLOSED if:
1. A summary document exists under `Notes/topics/` named to match the topic.
2. The summary is non-verbose but sufficient for human retention of key learnings.
3. The `Notes Doc` column in `LEARNING_TRACKER.md` is updated with the file path.

## File Locations

| File | Purpose |
|------|---------|
| `Notes/LEARNING_TRACKER.md` | Status index — data only |
| `Notes/LEARNING_SYSTEM.md` | This file — rules only |
| `Notes/topics/*.md` | One file per CLOSED topic |

## PPPPP.md Reference Block

Add the following to your PPPPP.md under a `## Notes & Learning` section:

```
## Notes & Learning
- Rules:   Notes/LEARNING_SYSTEM.md
- Tracker: Notes/LEARNING_TRACKER.md
- Topics:  Notes/topics/
```
