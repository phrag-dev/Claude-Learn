/**
 * item-page.js -- Item detail page logic
 *
 * Reads notes from localStorage for the current item,
 * renders them into sections, handles note filtering,
 * context-aware capture, AI lookup buttons, and
 * Capture Response modal with resolution tracking.
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
        var match = window.location.pathname.match(/item\/(\d+)\.html/);
        return match ? match[1] : null;
    }

    function renderNoteHTML(note, options) {
        options = options || {};
        var icon = TYPE_ICONS[note.type] || "";
        var date = new Date(note.timestamp);
        var dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        var syncClass = note.synced ? "synced" : "unsynced";
        var resolvedClass = note.resolved ? " resolved" : "";

        var html = '<div class="note-entry ' + syncClass + resolvedClass + '" data-note-type="' + note.type + '" data-note-id="' + (note.id || "") + '">';
        html += '<span class="note-icon">' + icon + '</span>';
        html += '<span class="note-content">';

        if (note.type === "answer" && typeof window.renderMarkdown === "function") {
            html += '<div class="md-rendered">' + window.renderMarkdown(note.content) + '</div>';
        } else {
            var urlPattern = /(https?:\/\/[^\s<]+)/g;
            var content = note.content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
            content = content.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener">$1</a>');
            html += content;
        }

        html += '</span>';
        html += '<span class="note-meta">';
        html += '<span class="note-date">' + dateStr + '</span>';
        if (note.resolved) {
            html += '<span class="note-resolved-badge" title="Resolved">Resolved</span>';
        }
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
        var resolvedContainer = document.getElementById("item-resolved");
        var noteCount = document.getElementById("meta-note-count");
        var questionCount = document.getElementById("meta-question-count");

        if (noteCount) noteCount.textContent = notes.length;

        // Separate by type and resolution status
        var openQuestions = notes.filter(function (n) { return n.type === "question" && !n.resolved; });
        var openThoughts = notes.filter(function (n) { return n.type === "thought" && !n.resolved; });
        var resolvedNotes = notes.filter(function (n) { return n.resolved; });
        var allQuestions = notes.filter(function (n) { return n.type === "question"; });
        if (questionCount) questionCount.textContent = allQuestions.length;

        // Open questions with AI action buttons
        if (questionsContainer) {
            var openItems = notes.filter(function (n) {
                return (n.type === "question" || n.type === "thought") && !n.resolved;
            });
            if (openItems.length === 0) {
                questionsContainer.innerHTML = '<p class="text-muted">No open questions or thoughts.</p>';
            } else {
                var qhtml = "";
                openItems.forEach(function (q) {
                    qhtml += '<div class="question-card">';
                    qhtml += renderNoteHTML(q);
                    if (q.type === "question") {
                        var escaped = q.content.replace(/"/g, '&quot;');
                        qhtml += '<div class="question-actions">';
                        qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="claude">Ask Claude</button>';
                        qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="chatgpt">Ask ChatGPT</button>';
                        qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="copilot">Ask Copilot</button>';
                        qhtml += '<button class="btn btn-sm btn-action ask-ai-btn" data-question="' + escaped + '" data-provider="web">Search Web</button>';
                        qhtml += '</div>';
                    }
                    qhtml += '</div>';
                });
                questionsContainer.innerHTML = qhtml;
            }
        }

        // Resolved section — hidden when empty, collapsed by default when populated
        if (resolvedContainer) {
            if (resolvedNotes.length === 0) {
                resolvedContainer.innerHTML = '<p class="text-muted">No resolved items yet.</p>';
                resolvedContainer.parentElement.classList.add("hidden");
            } else {
                resolvedContainer.parentElement.classList.remove("hidden");
                resolvedContainer.parentElement.classList.add("collapsed");
                var resolvedToggle = document.getElementById("resolved-toggle");
                if (resolvedToggle) resolvedToggle.textContent = "Show";
                var rhtml = "";
                resolvedNotes.forEach(function (n) { rhtml += renderNoteHTML(n); });
                resolvedContainer.innerHTML = rhtml;
            }
        }

        // All notes (full timeline)
        if (notesContainer) {
            if (notes.length === 0) {
                notesContainer.innerHTML = '<p class="text-muted">No notes captured yet. Use the bar below to start.</p>';
            } else {
                var html = "";
                notes.forEach(function (n) { html += renderNoteHTML(n); });
                notesContainer.innerHTML = html;
            }
        }

        // Update capture response button state
        var captureBtn = document.getElementById("capture-response-btn");
        if (captureBtn) {
            var hasOpen = notes.some(function (n) {
                return (n.type === "question" || n.type === "thought") && !n.resolved;
            });
            captureBtn.disabled = !hasOpen;
        }
    }

    function setupCaptureResponseModal(itemId) {
        var modal = document.getElementById("capture-response-modal");
        var openBtn = document.getElementById("capture-response-btn");
        var closeBtns = modal ? modal.querySelectorAll("[data-dismiss='modal']") : [];
        var saveBtn = document.getElementById("capture-response-save");
        var textarea = document.getElementById("capture-response-text");
        var checklistEl = document.getElementById("capture-response-checklist");

        if (!modal || !openBtn) return;

        function openModal() {
            if (typeof Capture === "undefined") return;
            var notes = Capture.getNotesForItem(itemId);
            var openItems = notes.filter(function (n) {
                return (n.type === "question" || n.type === "thought") && !n.resolved;
            });

            if (openItems.length === 0) return;

            // Build checklist
            var clhtml = "";
            openItems.forEach(function (n) {
                var icon = TYPE_ICONS[n.type] || "";
                var escaped = n.content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                clhtml += '<label class="checklist-item">';
                clhtml += '<input type="checkbox" value="' + n.id + '" checked>';
                clhtml += '<span class="checklist-icon">' + icon + '</span>';
                clhtml += '<span class="checklist-text">' + escaped + '</span>';
                clhtml += '</label>';
            });
            checklistEl.innerHTML = clhtml;
            textarea.value = "";
            modal.classList.remove("hidden");
            textarea.focus();
        }

        function closeModal() {
            modal.classList.add("hidden");
        }

        openBtn.addEventListener("click", openModal);
        closeBtns.forEach(function (btn) { btn.addEventListener("click", closeModal); });
        modal.addEventListener("click", function (e) {
            if (e.target === modal) closeModal();
        });

        saveBtn.addEventListener("click", function () {
            var responseText = textarea.value.trim();
            if (!responseText) return;

            // Get checked note IDs to resolve
            var checkedIds = [];
            checklistEl.querySelectorAll("input[type=checkbox]:checked").forEach(function (cb) {
                checkedIds.push(cb.value);
            });

            // Save the response as an answer note
            var answerNote = Capture.addNote(itemId, "answer", responseText);

            // Resolve the checked items
            if (answerNote && checkedIds.length > 0) {
                Capture.resolveNotes(checkedIds, answerNote.id);
            }

            closeModal();
            renderNotes(itemId);
            Capture.updateSyncIndicator();
        });
    }

    function setupNoteFilters() {
        document.querySelectorAll("[data-note-filter]").forEach(function (btn) {
            btn.addEventListener("click", function () {
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
        var select = document.getElementById("capture-item");
        if (select) {
            select.value = itemId;
        }
    }

    function getTopicForItem(itemId) {
        var h2 = document.querySelector(".page-header h2");
        return h2 ? h2.textContent.replace("#" + itemId, "").trim() : "this topic";
    }

    function buildSynthesisPrompt(itemId) {
        var topic = getTopicForItem(itemId);
        var notes = (typeof Capture !== "undefined") ? Capture.getNotesForItem(itemId) : [];

        // Only include unresolved items in synthesis
        var questions = [];
        var thoughts = [];
        var links = [];
        var answers = [];
        var updates = [];

        notes.forEach(function (n) {
            if (n.resolved) return;
            switch (n.type) {
                case "question": questions.push(n.content); break;
                case "thought": thoughts.push(n.content); break;
                case "link": links.push(n.content); break;
                case "answer": answers.push(n.content); break;
                case "update": updates.push(n.content); break;
            }
        });

        var unresolvedCount = questions.length + thoughts.length + links.length + answers.length + updates.length;
        if (unresolvedCount === 0) {
            return "I'm learning about " + topic + ". All my current questions have been resolved. Please help me go deeper — what are the next concepts I should explore? Respond in clean markdown without emoji, using headings, bullet points, and code blocks. Structure it so I can copy directly into a .md file.";
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

        var synthProviders = { "synth-claude-btn": "claude", "synth-chatgpt-btn": "chatgpt", "synth-copilot-btn": "copilot" };
        Object.keys(synthProviders).forEach(function (btnId) {
            var btn = document.getElementById(btnId);
            if (btn) btn.addEventListener("click", function () {
                var prompt = buildSynthesisPrompt(itemId);
                window.open(providers[synthProviders[btnId]](prompt), "_blank");
            });
        });

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

    function setupResolvedToggle() {
        var toggle = document.getElementById("resolved-toggle");
        if (toggle) {
            toggle.addEventListener("click", function () {
                var section = document.getElementById("resolved-section");
                if (section) {
                    section.classList.toggle("collapsed");
                    toggle.textContent = section.classList.contains("collapsed") ? "Show" : "Hide";
                }
            });
        }
    }

    function setupNotesToggle() {
        var toggle = document.getElementById("notes-toggle");
        var content = document.getElementById("notes-collapsible");
        if (toggle && content) {
            toggle.addEventListener("click", function () {
                var isHidden = content.classList.toggle("hidden");
                toggle.textContent = isHidden ? "Show" : "Hide";
            });
        }
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
        setupCaptureResponseModal(itemId);
        setupResolvedToggle();
        setupNotesToggle();
    });

    window.ItemPage = { refresh: refresh };
})();
