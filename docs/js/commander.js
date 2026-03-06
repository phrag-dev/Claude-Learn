/**
 * commander.js -- Command palette (Ctrl+K) for quick navigation and search
 */

var Commander = (function () {
    "use strict";

    var overlay, input, results, allItems;

    var basePath = "";

    function init(learningItems) {
        allItems = learningItems || [];
        // Detect if we're in a subdirectory (item pages)
        if (window.location.pathname.indexOf("/item/") !== -1) {
            basePath = "../";
        }
        buildOverlay();
        bindKeys();
    }

    function buildOverlay() {
        overlay = document.createElement("div");
        overlay.id = "commander-overlay";
        overlay.className = "commander-overlay hidden";

        var dialog = document.createElement("div");
        dialog.className = "commander-dialog";

        input = document.createElement("input");
        input.type = "text";
        input.className = "commander-input";
        input.placeholder = "Jump to item... (type to search)";
        input.autocomplete = "off";

        results = document.createElement("div");
        results.className = "commander-results";

        dialog.appendChild(input);
        dialog.appendChild(results);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) close();
        });

        // Filter on input
        input.addEventListener("input", function () {
            renderResults(input.value.trim().toLowerCase());
        });

        // Keyboard navigation in results
        input.addEventListener("keydown", function (e) {
            var items = results.querySelectorAll(".commander-item");
            var active = results.querySelector(".commander-item.active");
            var idx = Array.prototype.indexOf.call(items, active);

            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (idx < items.length - 1) setActive(items, idx + 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (idx > 0) setActive(items, idx - 1);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (active) active.click();
            } else if (e.key === "Escape") {
                e.preventDefault();
                close();
            }
        });
    }

    function setActive(items, idx) {
        items.forEach(function (el) { el.classList.remove("active"); });
        if (items[idx]) {
            items[idx].classList.add("active");
            items[idx].scrollIntoView({ block: "nearest" });
        }
    }

    function renderResults(query) {
        results.innerHTML = "";

        // Static pages
        var pages = [
            { label: "Home", url: basePath + "index.html", type: "page" },
            { label: "Learning Tracker", url: basePath + "learning.html", type: "page" },
            { label: "Skills Inventory", url: basePath + "skills.html", type: "page" },
            { label: "Repo Audits", url: basePath + "audits.html", type: "page" },
            { label: "Bug Register", url: basePath + "bugs.html", type: "page" }
        ];

        var matches = [];

        // Match learning items
        allItems.forEach(function (item) {
            var searchText = (item.id + " " + item.topic).toLowerCase();
            if (!query || searchText.indexOf(query) !== -1) {
                matches.push({
                    label: "#" + item.id + " " + item.topic,
                    url: basePath + "item/" + item.id + ".html",
                    type: "item",
                    status: item.status
                });
            }
        });

        // Match pages
        pages.forEach(function (p) {
            if (!query || p.label.toLowerCase().indexOf(query) !== -1) {
                matches.push(p);
            }
        });

        if (matches.length === 0) {
            results.innerHTML = '<div class="commander-empty">No results</div>';
            return;
        }

        matches.forEach(function (m, i) {
            var el = document.createElement("a");
            el.href = m.url;
            el.className = "commander-item" + (i === 0 ? " active" : "");

            var label = document.createElement("span");
            label.className = "commander-label";
            label.textContent = m.label;

            var tag = document.createElement("span");
            tag.className = "commander-tag";
            if (m.type === "item") {
                tag.textContent = m.status;
                tag.className += " badge badge-" + m.status.toLowerCase();
            } else {
                tag.textContent = "page";
            }

            el.appendChild(label);
            el.appendChild(tag);
            results.appendChild(el);

            el.addEventListener("click", function () {
                close();
            });
        });
    }

    function open() {
        overlay.classList.remove("hidden");
        input.value = "";
        renderResults("");
        // Slight delay to ensure overlay is visible before focus
        setTimeout(function () { input.focus(); }, 50);
    }

    function close() {
        overlay.classList.add("hidden");
        input.value = "";
    }

    function isOpen() {
        return overlay && !overlay.classList.contains("hidden");
    }

    function bindKeys() {
        document.addEventListener("keydown", function (e) {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                if (isOpen()) {
                    close();
                } else {
                    open();
                }
            }
            if (e.key === "Escape" && isOpen()) {
                close();
            }
        });
    }

    return { init: init, open: open, close: close };
})();
