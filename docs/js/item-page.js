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
                    var escaped = q.content.replace(/"/g, '&quot;');
                    qhtml += '<div class="question-actions">';
                    qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="claude">Ask Claude</button>';
                    qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="chatgpt">Ask ChatGPT</button>';
                    qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="copilot">Ask Copilot</button>';
                    qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="web">Search Web</button>';
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

    function buildSynthesisPrompt(itemId) {
        var topic = getTopicForItem(itemId);
        var notes = (typeof Capture !== "undefined") ? Capture.getNotesForItem(itemId) : [];

        var questions = [];
        var thoughts = [];
        var links = [];
        var answers = [];
        var updates = [];

        notes.forEach(function (n) {
            switch (n.type) {
                case "question": questions.push(n.content); break;
                case "thought": thoughts.push(n.content); break;
                case "link": links.push(n.content); break;
                case "answer": answers.push(n.content); break;
                case "update": updates.push(n.content); break;
            }
        });

        if (notes.length === 0) {
            return "I'm learning about " + topic + ". I haven't captured any notes yet. Please help me get started — what are the key concepts I should understand first? Respond in clean markdown without emoji, using headings, bullet points, and code blocks. Structure it so I can copy directly into a .md file.";
        }

        var prompt = "I am learning about: " + topic + "\n\n";
        prompt += "Below is everything I have captured so far — questions, thoughts, links, and notes. ";
        prompt += "They may cover different aspects of the topic and may not be directly related to each other.\n\n";
        prompt += "Please:\n";
        prompt += "1. Read all items below\n";
        prompt += "2. Identify synergies, connections, and common threads across them\n";
        prompt += "3. Present a brief synopsis of the key themes you've identified\n";
        prompt += "4. Wait for my confirmation before providing detailed answers\n\n";
        prompt += "OUTPUT FORMAT RULES:\n";
        prompt += "- Respond in clean markdown only\n";
        prompt += "- Use headings (##, ###), bullet points, numbered lists, and code blocks where appropriate\n";
        prompt += "- Do NOT use emoji anywhere in your response\n";
        prompt += "- Keep it structured so I can copy the response directly into a .md knowledge file\n";
        prompt += "- Use --- horizontal rules to separate major sections\n\n";

        if (questions.length > 0) {
            prompt += "--- QUESTIONS ---\n";
            questions.forEach(function (q, i) { prompt += (i + 1) + ". " + q + "\n"; });
            prompt += "\n";
        }
        if (thoughts.length > 0) {
            prompt += "--- THOUGHTS ---\n";
            thoughts.forEach(function (t, i) { prompt += (i + 1) + ". " + t + "\n"; });
            prompt += "\n";
        }
        if (answers.length > 0) {
            prompt += "--- ANSWERS / FINDINGS ---\n";
            answers.forEach(function (a, i) { prompt += (i + 1) + ". " + a + "\n"; });
            prompt += "\n";
        }
        if (links.length > 0) {
            prompt += "--- REFERENCE LINKS ---\n";
            links.forEach(function (l, i) { prompt += (i + 1) + ". " + l + "\n"; });
            prompt += "\n";
        }
        if (updates.length > 0) {
            prompt += "--- PROGRESS UPDATES ---\n";
            updates.forEach(function (u, i) { prompt += (i + 1) + ". " + u + "\n"; });
            prompt += "\n";
        }

        return prompt;
    }

    function setupAIButtons(itemId) {
        var providers = {
            claude: function (q) { return "https://claude.ai/new?q=" + encodeURIComponent(q); },
            chatgpt: function (q) { return "https://chatgpt.com/?q=" + encodeURIComponent(q); },
            copilot: function (q) { return "https://copilot.microsoft.com/?q=" + encodeURIComponent(q); },
            web: function (q) { return "https://www.google.com/search?q=" + encodeURIComponent(q); }
        };

        // Sidebar synthesis buttons
        var synthProviders = { "synth-claude-btn": "claude", "synth-chatgpt-btn": "chatgpt", "synth-copilot-btn": "copilot" };
        Object.keys(synthProviders).forEach(function (btnId) {
            var btn = document.getElementById(btnId);
            if (btn) btn.addEventListener("click", function () {
                var prompt = buildSynthesisPrompt(itemId);
                window.open(providers[synthProviders[btnId]](prompt), "_blank");
            });
        });

        // Per-question "Ask AI" buttons — send the actual question
        document.addEventListener("click", function (e) {
            var btn = e.target.closest(".ask-ai-btn");
            if (!btn) return;
            var question = btn.getAttribute("data-question");
            var provider = btn.getAttribute("data-provider");
            if (question && providers[provider]) {
                window.open(providers[provider](question), "_blank");
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
