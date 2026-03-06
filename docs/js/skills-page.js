/**
 * skills-page.js — Skill detail modal and link display
 */

(function () {
    "use strict";

    var SKILL_LINKS_KEY = "claude_learn_skill_links";

    // Lightweight markdown to HTML (handles headings, lists, code blocks, bold, horizontal rules)
    function renderMarkdown(md) {
        var lines = md.split("\n");
        var html = "";
        var inCode = false;
        var inList = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            // Code blocks
            if (line.trim().startsWith("```")) {
                if (inCode) {
                    html += "</code></pre>";
                    inCode = false;
                } else {
                    if (inList) { html += "</ul>"; inList = false; }
                    html += "<pre><code>";
                    inCode = true;
                }
                continue;
            }
            if (inCode) {
                html += line.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "\n";
                continue;
            }

            // Blank lines
            if (line.trim() === "") {
                if (inList) { html += "</ul>"; inList = false; }
                continue;
            }

            // Horizontal rules
            if (/^---+$/.test(line.trim())) {
                if (inList) { html += "</ul>"; inList = false; }
                html += "<hr>";
                continue;
            }

            // Headings
            var headingMatch = line.match(/^(#{1,4})\s+(.+)/);
            if (headingMatch) {
                if (inList) { html += "</ul>"; inList = false; }
                var level = headingMatch[1].length;
                html += "<h" + level + ">" + inlineFormat(headingMatch[2]) + "</h" + level + ">";
                continue;
            }

            // List items
            if (/^\s*[-*]\s+/.test(line)) {
                if (!inList) { html += "<ul>"; inList = true; }
                html += "<li>" + inlineFormat(line.replace(/^\s*[-*]\s+/, "")) + "</li>";
                continue;
            }

            // Numbered list
            if (/^\s*\d+\.\s+/.test(line)) {
                if (!inList) { html += "<ol>"; inList = true; }
                html += "<li>" + inlineFormat(line.replace(/^\s*\d+\.\s+/, "")) + "</li>";
                continue;
            }

            // Paragraph
            if (inList) { html += "</ul>"; inList = false; }
            html += "<p>" + inlineFormat(line) + "</p>";
        }

        if (inList) html += "</ul>";
        if (inCode) html += "</code></pre>";
        return html;
    }

    function inlineFormat(text) {
        // Escape HTML
        text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        // Bold
        text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        // Inline code
        text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
        // Links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        return text;
    }

    function setupSkillModal() {
        var modal = document.getElementById("skill-detail-modal");
        if (!modal) return;

        var titleEl = document.getElementById("skill-detail-title");
        var contentEl = document.getElementById("skill-detail-content");
        var skillsData = null;

        // Load skills JSON for content
        fetch("data/skills.json")
            .then(function (r) { return r.json(); })
            .then(function (data) { skillsData = data; })
            .catch(function () { skillsData = []; });

        // Click handlers on skill rows
        document.querySelectorAll(".skill-row").forEach(function (row) {
            row.addEventListener("click", function () {
                var name = row.getAttribute("data-skill-name");
                if (!skillsData) return;

                var skill = null;
                for (var i = 0; i < skillsData.length; i++) {
                    if (skillsData[i].name === name) { skill = skillsData[i]; break; }
                }

                if (!skill) return;

                titleEl.textContent = "/" + skill.name;
                if (skill.content) {
                    contentEl.innerHTML = renderMarkdown(skill.content);
                } else {
                    contentEl.innerHTML = "<p>" + (skill.description || "No content available.") + "</p>";
                }
                modal.classList.remove("hidden");
            });

            row.addEventListener("keydown", function (e) {
                if (e.key === "Enter") row.click();
            });
        });

        // Close handlers
        modal.querySelectorAll("[data-dismiss='modal']").forEach(function (btn) {
            btn.addEventListener("click", function () { modal.classList.add("hidden"); });
        });
        modal.addEventListener("click", function (e) {
            if (e.target === modal) modal.classList.add("hidden");
        });
    }

    function displaySkillLinks() {
        var container = document.getElementById("skill-links-display");
        if (!container) return;

        var links = JSON.parse(localStorage.getItem(SKILL_LINKS_KEY) || "{}");
        var entries = Object.keys(links);
        if (entries.length === 0) return;

        // Group by skill
        var bySkill = {};
        entries.forEach(function (itemId) {
            var skillName = links[itemId];
            if (!bySkill[skillName]) bySkill[skillName] = [];
            bySkill[skillName].push(itemId);
        });

        // Fetch item names
        fetch("data/learning.json")
            .then(function (r) { return r.json(); })
            .then(function (items) {
                var itemMap = {};
                items.forEach(function (item) { itemMap[item.id] = item.topic; });

                var html = "";
                Object.keys(bySkill).sort().forEach(function (skillName) {
                    html += '<div class="skill-link-group">';
                    html += '<strong>/' + skillName + '</strong>';
                    html += '<ul class="skill-link-items">';
                    bySkill[skillName].forEach(function (id) {
                        var topic = itemMap[id] || "#" + id;
                        html += '<li><a href="item/' + id + '.html">#' + id + ' ' + topic + '</a></li>';
                    });
                    html += '</ul></div>';
                });
                container.innerHTML = html;
            })
            .catch(function () {});
    }

    // Expose renderMarkdown globally for reuse by other scripts
    window.renderMarkdown = renderMarkdown;

    document.addEventListener("DOMContentLoaded", function () {
        setupSkillModal();
        displaySkillLinks();
    });
})();
