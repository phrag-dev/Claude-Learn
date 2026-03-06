/**
 * logger.js — Lightweight app logger with in-memory ring buffer
 *
 * Logs to console and stores entries in memory for display in a log panel.
 * Levels: DEBUG, INFO, WARN, ERROR
 * Toggle visibility via Settings or Ctrl+Shift+L.
 */

var AppLog = (function () {
    "use strict";

    var MAX_ENTRIES = 200;
    var entries = [];
    var listeners = [];
    var minLevel = 1; // 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR

    var LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    var LEVEL_LABELS = ["DEBUG", "INFO", "WARN", "ERROR"];
    var LEVEL_COLORS = ["#888", "#58a6ff", "#d29922", "#f85149"];

    function timestamp() {
        var d = new Date();
        return d.toLocaleTimeString("en-GB", { hour12: false }) + "." +
            String(d.getMilliseconds()).padStart(3, "0");
    }

    function log(level, source, message, data) {
        if (level < minLevel) return;

        var entry = {
            time: timestamp(),
            level: level,
            label: LEVEL_LABELS[level],
            source: source,
            message: message,
            data: data || null
        };

        entries.push(entry);
        if (entries.length > MAX_ENTRIES) entries.shift();

        // Console output
        var prefix = "[" + entry.label + "] " + entry.source + ": ";
        var consoleFn = level >= 3 ? console.error : level >= 2 ? console.warn : console.log;
        if (data) {
            consoleFn(prefix + message, data);
        } else {
            consoleFn(prefix + message);
        }

        // Notify UI listeners
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](entry); } catch (e) { /* swallow */ }
        }
    }

    function createPanel() {
        if (document.getElementById("app-log-panel")) return;

        var panel = document.createElement("div");
        panel.id = "app-log-panel";
        panel.className = "app-log-panel hidden";
        panel.innerHTML =
            '<div class="app-log-header">' +
                '<span class="app-log-title">App Log</span>' +
                '<div class="app-log-controls">' +
                    '<select id="app-log-level" class="app-log-select">' +
                        '<option value="0">Debug</option>' +
                        '<option value="1" selected>Info</option>' +
                        '<option value="2">Warn</option>' +
                        '<option value="3">Error</option>' +
                    '</select>' +
                    '<button id="app-log-clear" class="app-log-btn">Clear</button>' +
                    '<button id="app-log-close" class="app-log-btn">✕</button>' +
                '</div>' +
            '</div>' +
            '<div id="app-log-entries" class="app-log-entries"></div>';

        document.body.appendChild(panel);

        var entriesEl = document.getElementById("app-log-entries");
        var levelSelect = document.getElementById("app-log-level");

        // Render existing entries
        function renderAll() {
            var filterLevel = parseInt(levelSelect.value, 10);
            entriesEl.innerHTML = "";
            entries.forEach(function (e) {
                if (e.level >= filterLevel) appendEntry(entriesEl, e);
            });
            entriesEl.scrollTop = entriesEl.scrollHeight;
        }

        // Append single entry
        function appendEntry(container, entry) {
            var div = document.createElement("div");
            div.className = "app-log-entry app-log-level-" + entry.label.toLowerCase();
            var text = '<span class="app-log-time">' + entry.time + '</span> ' +
                '<span class="app-log-level" style="color:' + LEVEL_COLORS[entry.level] + '">' + entry.label + '</span> ' +
                '<span class="app-log-source">' + entry.source + '</span> ' +
                '<span class="app-log-msg">' + escapeHtml(entry.message) + '</span>';
            if (entry.data) {
                text += ' <span class="app-log-data">' + escapeHtml(JSON.stringify(entry.data)) + '</span>';
            }
            div.innerHTML = text;
            container.appendChild(div);
        }

        function escapeHtml(s) {
            return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        // Live updates
        listeners.push(function (entry) {
            var filterLevel = parseInt(levelSelect.value, 10);
            if (entry.level >= filterLevel) {
                appendEntry(entriesEl, entry);
                entriesEl.scrollTop = entriesEl.scrollHeight;
            }
        });

        levelSelect.addEventListener("change", renderAll);
        document.getElementById("app-log-clear").addEventListener("click", function () {
            entries.length = 0;
            entriesEl.innerHTML = "";
        });
        document.getElementById("app-log-close").addEventListener("click", function () {
            panel.classList.add("hidden");
        });

        renderAll();
    }

    function toggle() {
        createPanel();
        var panel = document.getElementById("app-log-panel");
        panel.classList.toggle("hidden");
        if (!panel.classList.contains("hidden")) {
            var entriesEl = document.getElementById("app-log-entries");
            if (entriesEl) entriesEl.scrollTop = entriesEl.scrollHeight;
        }
    }

    // Keyboard shortcut: Ctrl+Shift+L
    document.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.shiftKey && e.key === "L") {
            e.preventDefault();
            toggle();
        }
    });

    return {
        debug: function (source, msg, data) { log(LEVELS.DEBUG, source, msg, data); },
        info:  function (source, msg, data) { log(LEVELS.INFO, source, msg, data); },
        warn:  function (source, msg, data) { log(LEVELS.WARN, source, msg, data); },
        error: function (source, msg, data) { log(LEVELS.ERROR, source, msg, data); },
        toggle: toggle,
        setLevel: function (lvl) { minLevel = lvl; },
        getEntries: function () { return entries.slice(); }
    };
})();
