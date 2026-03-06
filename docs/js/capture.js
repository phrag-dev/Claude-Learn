/**
 * capture.js — Capture bar logic and localStorage note management
 *
 * Notes are stored in localStorage immediately on save.
 * Sync to GitHub is handled separately by sync.js.
 */

var Capture = (function () {
    "use strict";

    var NOTES_KEY = "claude_learn_notes";
    var TYPE_ICONS = {
        thought: "\uD83D\uDCAD",
        link: "\uD83D\uDD17",
        question: "\u2753",
        answer: "\u2705",
        update: "\uD83D\uDCDD"
    };

    function generateId() {
        return "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    }

    function getNotes() {
        var stored = localStorage.getItem(NOTES_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    function saveNotes(notes) {
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    }

    function addNote(itemId, type, content) {
        if (!itemId || !content.trim()) return null;

        var note = {
            id: generateId(),
            item_id: itemId,
            type: type,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            synced: false
        };

        var notes = getNotes();
        notes.unshift(note);
        saveNotes(notes);
        return note;
    }

    function getNotesForItem(itemId) {
        return getNotes().filter(function (n) { return n.item_id === itemId; });
    }

    function getUnsyncedNotes() {
        return getNotes().filter(function (n) { return !n.synced; });
    }

    function markSynced(noteIds) {
        var notes = getNotes();
        notes.forEach(function (n) {
            if (noteIds.indexOf(n.id) !== -1) {
                n.synced = true;
            }
        });
        saveNotes(notes);
    }

    function getRecentNotes(limit) {
        return getNotes().slice(0, limit || 10);
    }

    function renderNoteHTML(note) {
        var icon = TYPE_ICONS[note.type] || "";
        var date = new Date(note.timestamp);
        var dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
        var syncClass = note.synced ? "synced" : "unsynced";

        var html = '<div class="note-entry ' + syncClass + '">';
        html += '<span class="note-icon">' + icon + '</span>';
        html += '<span class="note-content">';

        if (note.type === "link" && note.content.match(/^https?:\/\//)) {
            var parts = note.content.split(/\s+/);
            var url = parts[0];
            var comment = parts.slice(1).join(" ");
            html += '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
            if (comment) html += '<br><span class="note-comment">' + comment + '</span>';
        } else {
            html += note.content;
        }

        html += '</span>';
        html += '<span class="note-meta">';
        html += '<span class="note-date">' + dateStr + '</span>';
        html += '<span class="note-sync-dot" title="' + (note.synced ? "Synced" : "Pending sync") + '"></span>';
        html += '</span>';
        html += '</div>';
        return html;
    }

    function injectNotesIntoCards() {
        // Find kanban cards and inject note counts + notes
        document.querySelectorAll(".kanban-card").forEach(function (card) {
            var idEl = card.querySelector(".card-id");
            if (!idEl) return;
            var itemId = idEl.textContent.replace("#", "").trim();
            var notes = getNotesForItem(itemId);

            if (notes.length === 0) return;

            // Add note count badge
            var badge = document.createElement("span");
            badge.className = "note-count-badge";
            badge.textContent = notes.length + " note" + (notes.length > 1 ? "s" : "");
            card.appendChild(badge);

            // Add expandable notes container
            var container = document.createElement("div");
            container.className = "card-notes hidden";
            notes.forEach(function (note) {
                container.innerHTML += renderNoteHTML(note);
            });
            card.appendChild(container);

            // Toggle on click
            card.style.cursor = "pointer";
            card.addEventListener("click", function (e) {
                if (e.target.tagName === "A") return; // don't toggle when clicking links
                container.classList.toggle("hidden");
            });
        });
    }

    function injectRecentNotes() {
        var container = document.getElementById("recent-notes");
        if (!container) return;

        var notes = getRecentNotes(10);
        if (notes.length === 0) {
            container.innerHTML = '<p class="text-muted">No captured notes yet. Use the bar below to start.</p>';
            return;
        }

        var html = "";
        notes.forEach(function (note) {
            html += '<div class="recent-note-row">';
            html += '<span class="note-item-tag">#' + note.item_id + '</span>';
            html += renderNoteHTML(note);
            html += '</div>';
        });
        container.innerHTML = html;
    }

    // Initialise capture bar
    function init() {
        var saveBtn = document.getElementById("capture-save");
        var input = document.getElementById("capture-input");
        var itemSelect = document.getElementById("capture-item");
        var typeSelect = document.getElementById("capture-type");
        var settingsBtn = document.getElementById("capture-settings");
        var modal = document.getElementById("settings-modal");

        if (!saveBtn || !input) return;

        function doSave() {
            var note = addNote(itemSelect.value, typeSelect.value, input.value);
            if (note) {
                input.value = "";
                injectNotesIntoCards();
                injectRecentNotes();
                updateSyncIndicator();
                if (window.ItemPage) window.ItemPage.refresh();

                // Trigger sync if unlocked
                if (typeof Sync !== "undefined" && DashCrypto.isUnlocked()) {
                    Sync.syncNote(note);
                }
            }
        }

        saveBtn.addEventListener("click", doSave);
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") doSave();
        });

        // Settings modal
        if (settingsBtn && modal) {
            settingsBtn.addEventListener("click", function () {
                modal.classList.remove("hidden");
                // Show correct panel
                if (DashCrypto.hasStoredToken()) {
                    document.getElementById("settings-setup").classList.add("hidden");
                    document.getElementById("settings-active").classList.remove("hidden");
                } else {
                    document.getElementById("settings-setup").classList.remove("hidden");
                    document.getElementById("settings-active").classList.add("hidden");
                }
            });

            modal.querySelector("[data-dismiss='modal']").addEventListener("click", function () {
                modal.classList.add("hidden");
            });

            modal.addEventListener("click", function (e) {
                if (e.target === modal) modal.classList.add("hidden");
            });
        }

        // Save settings (encrypt + store token)
        var saveSettingsBtn = document.getElementById("save-settings-btn");
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener("click", function () {
                var pat = document.getElementById("pat-input").value.trim();
                var repo = document.getElementById("repo-input").value.trim();
                var passphrase = document.getElementById("passphrase-input").value;
                var status = document.getElementById("settings-status");

                if (!pat || !repo || !passphrase) {
                    status.textContent = "All fields required.";
                    status.className = "form-status error";
                    return;
                }

                if (passphrase.length < 8) {
                    status.textContent = "Passphrase must be at least 8 characters.";
                    status.className = "form-status error";
                    return;
                }

                status.textContent = "Encrypting...";
                status.className = "form-status";

                DashCrypto.saveToken(pat, passphrase).then(function () {
                    sessionStorage.setItem("claude_learn_repo", repo);
                    localStorage.setItem("claude_learn_repo", repo);
                    // Also unlock for this session
                    return DashCrypto.unlockToken(passphrase);
                }).then(function () {
                    status.textContent = "Token encrypted and saved. Sync active.";
                    status.className = "form-status success";
                    document.getElementById("pat-input").value = "";
                    document.getElementById("passphrase-input").value = "";
                    updateSyncIndicator();
                }).catch(function (err) {
                    status.textContent = "Error: " + err.message;
                    status.className = "form-status error";
                });
            });
        }

        // Unlock token for session
        var unlockBtn = document.getElementById("unlock-btn");
        if (unlockBtn) {
            unlockBtn.addEventListener("click", function () {
                var passphrase = document.getElementById("unlock-input").value;
                var status = document.getElementById("unlock-status");

                if (!passphrase) {
                    status.textContent = "Enter your passphrase.";
                    status.className = "form-status error";
                    return;
                }

                status.textContent = "Decrypting...";
                DashCrypto.unlockToken(passphrase).then(function () {
                    var repo = localStorage.getItem("claude_learn_repo");
                    if (repo) sessionStorage.setItem("claude_learn_repo", repo);
                    status.textContent = "Unlocked. Sync active for this session.";
                    status.className = "form-status success";
                    document.getElementById("unlock-input").value = "";
                    updateSyncIndicator();
                    modal.classList.add("hidden");
                }).catch(function () {
                    status.textContent = "Wrong passphrase.";
                    status.className = "form-status error";
                });
            });
        }

        // Clear/remove token
        var clearBtn = document.getElementById("clear-settings-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                DashCrypto.clearAll();
                localStorage.removeItem("claude_learn_repo");
                document.getElementById("unlock-status").textContent = "Token removed.";
                document.getElementById("unlock-status").className = "form-status";
                updateSyncIndicator();
            });
        }

        // Inject notes into page
        injectNotesIntoCards();
        injectRecentNotes();
        updateSyncIndicator();
    }

    function updateSyncIndicator() {
        var indicator = document.getElementById("sync-indicator");
        if (!indicator) return;

        var unsynced = getUnsyncedNotes().length;

        if (DashCrypto.isUnlocked()) {
            indicator.className = "sync-indicator active";
            indicator.title = "Sync active" + (unsynced > 0 ? " — " + unsynced + " pending" : "");
        } else if (DashCrypto.hasStoredToken()) {
            indicator.className = "sync-indicator locked";
            indicator.title = "Sync locked — click settings to unlock";
        } else {
            indicator.className = "sync-indicator off";
            indicator.title = "Sync not configured";
        }
    }

    // Run on DOM ready
    document.addEventListener("DOMContentLoaded", init);

    return {
        getNotes: getNotes,
        getNotesForItem: getNotesForItem,
        getUnsyncedNotes: getUnsyncedNotes,
        markSynced: markSynced,
        renderNoteHTML: renderNoteHTML,
        updateSyncIndicator: updateSyncIndicator
    };
})();
