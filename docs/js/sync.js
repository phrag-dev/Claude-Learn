/**
 * sync.js — GitHub API sync layer
 *
 * Commits captured notes to the repo as markdown files.
 * Uses the GitHub Contents API with a fine-grained PAT.
 *
 * Token is read from sessionStorage (decrypted by crypto.js).
 * Connection restricted by CSP to https://api.github.com only.
 */

var Sync = (function () {
    "use strict";

    var API_BASE = "https://api.github.com";
    var TYPE_ICONS = {
        thought: "\uD83D\uDCAD",
        link: "\uD83D\uDD17",
        question: "\u2753",
        answer: "\u2705",
        update: "\uD83D\uDCDD"
    };
    var TYPE_LABELS = {
        thought: "Thought",
        link: "Link",
        question: "Question",
        answer: "Answer",
        update: "Update"
    };

    function getAuth() {
        var token = DashCrypto.getToken();
        var repo = sessionStorage.getItem("claude_learn_repo");
        if (!token || !repo) return null;
        return { token: token, repo: repo };
    }

    function apiCall(method, path, body) {
        var auth = getAuth();
        if (!auth) return Promise.reject(new Error("Not authenticated"));

        var url = API_BASE + "/repos/" + auth.repo + path;
        AppLog.debug("Sync", method + " " + url);
        var opts = {
            method: method,
            headers: {
                "Authorization": "Bearer " + auth.token,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        };

        if (body) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(body);
        }

        return fetch(url, opts).then(function (resp) {
            if (!resp.ok) {
                return resp.json().then(function (err) {
                    throw new Error(err.message || "API error " + resp.status);
                });
            }
            return resp.status === 204 ? null : resp.json();
        });
    }

    function formatNoteMarkdown(note) {
        var icon = TYPE_ICONS[note.type] || "";
        var label = TYPE_LABELS[note.type] || note.type;
        var date = new Date(note.timestamp);
        var dateStr = date.toISOString().slice(0, 16).replace("T", " ");

        var md = "\n---\n\n";
        md += "**" + icon + " " + label + "** — " + dateStr + "\n\n";
        md += note.content + "\n";
        return md;
    }

    function getNotesFilePath(itemId) {
        return "/contents/Notes/topics/" + itemId.padStart(3, "0") + "_notes.md";
    }

    /**
     * Sync a single note to the repo.
     * Reads the existing notes file, appends the new note, commits.
     * Creates the file if it doesn't exist.
     */
    function syncNote(note) {
        if (!getAuth()) return Promise.resolve();

        var path = getNotesFilePath(note.item_id);
        var newContent = formatNoteMarkdown(note);
        AppLog.info("Sync", "Syncing note " + note.id + " to " + path, { type: note.type, item: note.item_id });

        // Try to get existing file
        return apiCall("GET", path).then(function (existing) {
            // File exists — append
            var currentContent = atob(existing.content.replace(/\n/g, ""));
            var updated = currentContent + newContent;

            return apiCall("PUT", path, {
                message: "note: " + note.type + " on #" + note.item_id,
                content: btoa(unescape(encodeURIComponent(updated))),
                sha: existing.sha
            });
        }).catch(function (err) {
            if (err.message && err.message.indexOf("Not Found") !== -1) {
                // File doesn't exist — create with header
                var itemSelect = document.getElementById("capture-item");
                var itemName = "";
                if (itemSelect) {
                    for (var i = 0; i < itemSelect.options.length; i++) {
                        if (itemSelect.options[i].value === note.item_id) {
                            itemName = itemSelect.options[i].textContent.split(" — ")[1] || "";
                            break;
                        }
                    }
                }

                var header = "# Notes: " + itemName + " (" + note.item_id + ")\n";
                var content = header + newContent;

                return apiCall("PUT", path, {
                    message: "note: create notes file for #" + note.item_id,
                    content: btoa(unescape(encodeURIComponent(content)))
                });
            }
            throw err;
        }).then(function () {
            Capture.markSynced([note.id]);
            Capture.updateSyncIndicator();
        }).catch(function (err) {
            AppLog.error("Sync", "Note sync failed: " + note.id + " — " + err.message);
            // Note stays unsynced in localStorage, will retry next time
        });
    }

    /**
     * Sync all unsynced notes.
     */
    function syncAll() {
        if (!getAuth()) return Promise.resolve();

        var unsynced = Capture.getUnsyncedNotes();
        if (unsynced.length === 0) return Promise.resolve();

        // Group by item_id to batch per file
        var byItem = {};
        unsynced.forEach(function (note) {
            if (!byItem[note.item_id]) byItem[note.item_id] = [];
            byItem[note.item_id].push(note);
        });

        // Sync sequentially per item to avoid SHA conflicts
        var chain = Promise.resolve();
        Object.keys(byItem).forEach(function (itemId) {
            byItem[itemId].forEach(function (note) {
                chain = chain.then(function () {
                    return syncNote(note);
                });
            });
        });

        return chain;
    }

    return {
        syncNote: syncNote,
        syncAll: syncAll
    };
})();
