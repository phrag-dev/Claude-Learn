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

        // Settings modal — 3 panels: setup, locked, unlocked
        var panelSetup = document.getElementById("settings-setup");
        var panelLocked = document.getElementById("settings-locked");
        var panelUnlocked = document.getElementById("settings-unlocked");

        function showSettingsPanel(name) {
            if (panelSetup) panelSetup.classList.add("hidden");
            if (panelLocked) panelLocked.classList.add("hidden");
            if (panelUnlocked) panelUnlocked.classList.add("hidden");

            if (name === "setup" && panelSetup) panelSetup.classList.remove("hidden");
            if (name === "locked" && panelLocked) panelLocked.classList.remove("hidden");
            if (name === "unlocked" && panelUnlocked) {
                panelUnlocked.classList.remove("hidden");
                var repoDisplay = document.getElementById("settings-repo-display");
                if (repoDisplay) {
                    repoDisplay.textContent = localStorage.getItem("claude_learn_repo") || "—";
                }
            }
        }

        function openSettingsModal() {
            if (!modal) return;
            modal.classList.remove("hidden");
            // Pick the right panel
            if (!DashCrypto.hasStoredToken()) {
                showSettingsPanel("setup");
            } else if (DashCrypto.isUnlocked()) {
                showSettingsPanel("unlocked");
            } else {
                showSettingsPanel("locked");
            }
        }

        if (settingsBtn) {
            settingsBtn.addEventListener("click", openSettingsModal);
        }

        var sidebarSettingsBtn = document.getElementById("open-settings");
        if (sidebarSettingsBtn) {
            sidebarSettingsBtn.addEventListener("click", openSettingsModal);
        }

        var logsBtn = document.getElementById("open-logs");
        if (logsBtn) {
            logsBtn.addEventListener("click", function () { AppLog.toggle(); });
        }

        if (modal) {
            modal.querySelector("[data-dismiss='modal']").addEventListener("click", function () {
                modal.classList.add("hidden");
            });

            modal.addEventListener("click", function (e) {
                if (e.target === modal) modal.classList.add("hidden");
            });
        }

        // Panel 1: Save settings (encrypt + store token)
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

                AppLog.info("Settings", "Saving token", { repo: repo, patPrefix: pat.substring(0, 10) + "..." });
                DashCrypto.saveToken(pat, passphrase).then(function () {
                    sessionStorage.setItem("claude_learn_repo", repo);
                    localStorage.setItem("claude_learn_repo", repo);
                    AppLog.info("Settings", "Token encrypted, repo stored", { repo: repo });
                    return DashCrypto.unlockToken(passphrase);
                }).then(function () {
                    AppLog.info("Settings", "Token unlocked for session");
                    document.getElementById("pat-input").value = "";
                    document.getElementById("passphrase-input").value = "";
                    status.textContent = "";
                    updateSyncIndicator();
                    showSettingsPanel("unlocked");
                }).catch(function (err) {
                    AppLog.error("Settings", "Save failed: " + err.message);
                    status.textContent = "Error: " + err.message;
                    status.className = "form-status error";
                });
            });
        }

        // Panel 2: Unlock token for session
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
                    AppLog.info("Settings", "Session unlocked", { repo: repo });
                    document.getElementById("unlock-input").value = "";
                    status.textContent = "";
                    updateSyncIndicator();
                    showSettingsPanel("unlocked");
                }).catch(function () {
                    AppLog.warn("Settings", "Unlock failed — wrong passphrase");
                    status.textContent = "Wrong passphrase.";
                    status.className = "form-status error";
                });
            });
        }

        // Panel 3: Reconfigure — go back to setup panel
        var reconfigureBtn = document.getElementById("reconfigure-btn");
        if (reconfigureBtn) {
            reconfigureBtn.addEventListener("click", function () {
                DashCrypto.clearAll();
                localStorage.removeItem("claude_learn_repo");
                AppLog.info("Settings", "Token cleared for reconfiguration");
                updateSyncIndicator();
                showSettingsPanel("setup");
            });
        }

        // Remove token — from locked panel
        function removeToken() {
            DashCrypto.clearAll();
            localStorage.removeItem("claude_learn_repo");
            AppLog.info("Settings", "Token removed");
            updateSyncIndicator();
            showSettingsPanel("setup");
        }

        var clearBtn = document.getElementById("clear-settings-btn");
        if (clearBtn) clearBtn.addEventListener("click", removeToken);

        var clearBtn2 = document.getElementById("clear-settings-btn-2");
        if (clearBtn2) clearBtn2.addEventListener("click", removeToken);

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

    function resolveNotes(noteIds, answerNoteId) {
        var notes = getNotes();
        notes.forEach(function (n) {
            if (noteIds.indexOf(n.id) !== -1) {
                n.resolved = true;
                n.resolved_by = answerNoteId;
                n.resolved_at = new Date().toISOString();
            }
        });
        saveNotes(notes);
    }

    return {
        getNotes: getNotes,
        getNotesForItem: getNotesForItem,
        getUnsyncedNotes: getUnsyncedNotes,
        addNote: addNote,
        resolveNotes: resolveNotes,
        markSynced: markSynced,
        renderNoteHTML: renderNoteHTML,
        updateSyncIndicator: updateSyncIndicator
    };
})();
