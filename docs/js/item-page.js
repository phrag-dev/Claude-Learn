/**
 * item-page.js -- Item detail page logic
 *
 * Reads notes from localStorage for the current item,
 * renders them into sections, handles note filtering,
 * context-aware capture, and AI lookup buttons.
 */

(function () {
    "use strict";

    var TYPE_ICONS = {
        thought: "\uD83D\uDCAD",
        link: "\uD83D\uDD17",
        question: "\u2753",
        answer: "\u2705",
        update: "\uD83D\uDCDD"
    };

    function getItemId() {
        // Extract from URL: item/002.html -> 002
        var match = window.location.pathname.match(/item\/(\d+)\.html/);
        return match ? match[1] : null;
    }

    function renderNoteHTML(note) {
        var icon = TYPE_ICONS[note.type] || "";
        var date = new Date(note.timestamp);
        var dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        var syncClass = note.synced ? "synced" : "unsynced";

        var html = '<div class="note-entry ' + syncClass + '" data-note-type="' + note.type + '">';
        html += '<span class="note-icon">' + icon + '</span>';
        html += '<span class="note-content">';

        // Auto-link URLs in any note type
        var urlPattern = /(https?:\/\/[^\s<]+)/g;
        var content = note.content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        content = content.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        html += content;

        html += '</span>';
        html += '<span class="note-meta">';
        html += '<span class="note-date">' + dateStr + '</span>';
        html += '<span class="note-sync-dot" title="' + (note.synced ? "Synced" : "Pending sync") + '"></span>';
        html += '</span>';
        html += '</div>';
        return html;
    }

    function renderNotes(itemId) {
        if (typeof Capture === "undefined") return;

        var notes = Capture.getNotesForItem(itemId);
        var notesContainer = document.getElementById("item-notes");
        var questionsContainer = document.getElementById("item-questions");
        var noteCount = document.getElementById("meta-note-count");
        var questionCount = document.getElementById("meta-question-count");

        if (noteCount) noteCount.textContent = notes.length;

        // Separate questions and answers
        var questions = notes.filter(function (n) { return n.type === "question"; });
        var answers = notes.filter(function (n) { return n.type === "answer"; });
        if (questionCount) questionCount.textContent = questions.length;

        // Render open questions (questions without a following answer)
        if (questionsContainer) {
            var unanswered = questions; // simplified: show all questions in the questions section
            if (unanswered.length === 0) {
                questionsContainer.innerHTML = '<p class="text-muted">No questions captured yet.</p>';
            } else {
                var qhtml = "";
                unanswered.forEach(function (q) {
                    qhtml += '<div class="question-card">';
                    qhtml += renderNoteHTML(q);
                    qhtml += '<div class="question-actions">';
                    qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' +
                        q.content.replace(/"/g, '&quot;') + '" data-provider="claude">Ask Claude</button>';
                    qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' +
                        q.content.replace(/"/g, '&quot;') + '" data-provider="chatgpt">Ask ChatGPT</button>';
                    qhtml += '</div></div>';
                });
                questionsContainer.innerHTML = qhtml;
            }
        }

        // Render all notes
        if (notesContainer) {
            if (notes.length === 0) {
                notesContainer.innerHTML = '<p class="text-muted">No notes captured yet. Use the bar below to start.</p>';
            } else {
                var html = "";
                notes.forEach(function (n) { html += renderNoteHTML(n); });
                notesContainer.innerHTML = html;
            }
        }
    }

    function setupNoteFilters() {
        document.querySelectorAll("[data-note-filter]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                // Update active state
                btn.parentElement.querySelectorAll(".filter-btn").forEach(function (b) {
                    b.classList.remove("active");
                });
                btn.classList.add("active");

                var filter = btn.getAttribute("data-note-filter");
                var notes = document.querySelectorAll("#item-notes .note-entry");
                notes.forEach(function (note) {
                    if (filter === "all" || note.getAttribute("data-note-type") === filter) {
                        note.style.display = "";
                    } else {
                        note.style.display = "none";
                    }
                });
            });
        });
    }

    function setupContextCapture(itemId) {
        // Auto-select this item in the capture bar
        var select = document.getElementById("capture-item");
        if (select) {
            select.value = itemId;
        }
    }

    function getTopicForItem(itemId) {
        // Read from the page title
        var h2 = document.querySelector(".page-header h2");
        return h2 ? h2.textContent.replace("#" + itemId, "").trim() : "this topic";
    }

    function setupAIButtons(itemId) {
        var topic = getTopicForItem(itemId);

        var providers = {
            claude: function (q) { return "https://claude.ai/new?q=" + encodeURIComponent(q); },
            chatgpt: function (q) { return "https://chatgpt.com/?q=" + encodeURIComponent(q); },
            copilot: function (q) { return "https://copilot.microsoft.com/?q=" + encodeURIComponent(q); },
            web: function (q) { return "https://www.google.com/search?q=" + encodeURIComponent(q); }
        };

        // Sidebar quick action buttons
        var claudeBtn = document.getElementById("ask-claude-btn");
        var chatgptBtn = document.getElementById("ask-chatgpt-btn");
        var copilotBtn = document.getElementById("ask-copilot-btn");
        var searchBtn = document.getElementById("search-web-btn");

        if (claudeBtn) claudeBtn.addEventListener("click", function () {
            window.open(providers.claude("Help me learn about " + topic), "_blank");
        });
        if (chatgptBtn) chatgptBtn.addEventListener("click", function () {
            window.open(providers.chatgpt("Help me learn about " + topic), "_blank");
        });
        if (copilotBtn) copilotBtn.addEventListener("click", function () {
            window.open(providers.copilot("Help me learn about " + topic), "_blank");
        });
        if (searchBtn) searchBtn.addEventListener("click", function () {
            window.open(providers.web(topic + " tutorial guide"), "_blank");
        });

        // Per-question "Ask AI" buttons
        document.addEventListener("click", function (e) {
            if (!e.target.classList.contains("ask-ai-btn")) return;
            var question = e.target.getAttribute("data-question");
            var provider = e.target.getAttribute("data-provider");
            if (question && providers[provider]) {
                window.open(providers[provider](question + " (in the context of " + topic + ")"), "_blank");
            }
        });
    }

    function refresh() {
        var itemId = getItemId();
        if (itemId) renderNotes(itemId);
    }

    document.addEventListener("DOMContentLoaded", function () {
        var itemId = getItemId();
        if (!itemId) return;

        renderNotes(itemId);
        setupNoteFilters();
        setupContextCapture(itemId);
        setupAIButtons(itemId);
    });

    // Expose refresh for capture.js to call after saving
    window.ItemPage = { refresh: refresh };
})();
