// Dashboard interactivity -- filtering, commander init, topic management

document.addEventListener("DOMContentLoaded", function () {
    var LOCAL_ITEMS_KEY = "claude_learn_local_items";
    var SKILL_LINKS_KEY = "claude_learn_skill_links";
    var STATUS_OVERRIDES_KEY = "claude_learn_status_overrides";

    // Filter buttons
    document.querySelectorAll(".filter-btn[data-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var group = btn.closest(".filter-bar");
            group.querySelectorAll(".filter-btn").forEach(function (b) {
                b.classList.remove("active");
            });
            btn.classList.add("active");

            var filter = btn.getAttribute("data-filter");
            var target = btn.closest(".filter-bar").getAttribute("data-target");
            var items = document.querySelectorAll(target);

            items.forEach(function (item) {
                if (filter === "all" || item.classList.contains("status-" + filter)) {
                    item.style.display = "";
                } else {
                    item.style.display = "none";
                }
            });
        });
    });

    // Initialise command palette with learning items from embedded JSON
    fetch("data/learning.json")
        .then(function (r) { return r.json(); })
        .then(function (items) {
            Commander.init(items);
        })
        .catch(function () {
            fetch("../data/learning.json")
                .then(function (r) { return r.json(); })
                .then(function (items) {
                    Commander.init(items);
                })
                .catch(function () {
                    Commander.init([]);
                });
        });

    var searchInput = document.getElementById("learning-search");

    // Sidebar commander trigger button
    var triggerBtn = document.getElementById("open-commander");
    if (triggerBtn) {
        triggerBtn.addEventListener("click", function () {
            Commander.open();
        });
    }

    // === Topic Files toggle ===
    var topicsToggle = document.getElementById("topics-toggle");
    var topicsList = document.getElementById("topics-list");
    if (topicsToggle && topicsList) {
        topicsToggle.addEventListener("click", function () {
            var isHidden = topicsList.classList.toggle("hidden");
            topicsToggle.textContent = isHidden ? "Show All" : "Hide";
        });
    }

    // === Learning page search (updated for new list layout) ===
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            var query = searchInput.value.toLowerCase();
            document.querySelectorAll(".learning-list-row").forEach(function (row) {
                var text = row.textContent.toLowerCase();
                row.style.display = (query === "" || text.indexOf(query) !== -1) ? "" : "none";
            });
        });
    }

    // === Learning page Add Topic button (reuse home modal if present, else open home) ===
    var addBtnLearn = document.getElementById("add-topic-btn-learn");
    if (addBtnLearn) {
        var addModal = document.getElementById("add-topic-modal");
        if (addModal) {
            addBtnLearn.addEventListener("click", function () {
                addModal.classList.remove("hidden");
                var nameInput = document.getElementById("new-topic-name");
                if (nameInput) { nameInput.value = ""; nameInput.focus(); }
            });
        } else {
            addBtnLearn.addEventListener("click", function () {
                window.location.href = "index.html";
            });
        }
    }

    // === Recent Captures toggle ===
    var capturesToggle = document.getElementById("recent-captures-toggle");
    var capturesContent = document.getElementById("recent-notes");
    if (capturesToggle && capturesContent) {
        capturesToggle.addEventListener("click", function () {
            var isHidden = capturesContent.classList.toggle("hidden");
            capturesToggle.textContent = isHidden ? "Show" : "Hide";
        });
    }

    // === Status overrides (client-side until next build) ===
    function getStatusOverrides() {
        var stored = localStorage.getItem(STATUS_OVERRIDES_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    function applyStatusOverrides() {
        var overrides = getStatusOverrides();
        document.querySelectorAll(".item-status-select").forEach(function (sel) {
            var id = sel.getAttribute("data-item-id");
            if (overrides[id]) {
                sel.value = overrides[id];
                // Update visual state on row
                var row = sel.closest(".item-row-managed");
                if (row) row.setAttribute("data-item-status", overrides[id].toLowerCase());
            }
        });
    }

    document.querySelectorAll(".item-status-select").forEach(function (sel) {
        sel.addEventListener("change", function () {
            var id = sel.getAttribute("data-item-id");
            var overrides = getStatusOverrides();
            overrides[id] = sel.value;
            localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
            var row = sel.closest(".item-row-managed");
            if (row) row.setAttribute("data-item-status", sel.value.toLowerCase());
        });
    });

    applyStatusOverrides();

    // === Skill linking ===
    function getSkillLinks() {
        var stored = localStorage.getItem(SKILL_LINKS_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    function applySkillLinks() {
        var links = getSkillLinks();
        document.querySelectorAll(".item-skill-select").forEach(function (sel) {
            var id = sel.getAttribute("data-item-id");
            if (links[id]) sel.value = links[id];
        });
    }

    document.querySelectorAll(".item-skill-select").forEach(function (sel) {
        sel.addEventListener("change", function () {
            var id = sel.getAttribute("data-item-id");
            var links = getSkillLinks();
            if (sel.value) {
                links[id] = sel.value;
            } else {
                delete links[id];
            }
            localStorage.setItem(SKILL_LINKS_KEY, JSON.stringify(links));
        });
    });

    applySkillLinks();

    // === Add Topic modal ===
    var addBtn = document.getElementById("add-topic-btn");
    var addModal = document.getElementById("add-topic-modal");
    var saveTopicBtn = document.getElementById("save-topic-btn");

    if (addBtn && addModal) {
        addBtn.addEventListener("click", function () {
            addModal.classList.remove("hidden");
            var nameInput = document.getElementById("new-topic-name");
            if (nameInput) { nameInput.value = ""; nameInput.focus(); }
        });

        addModal.querySelectorAll("[data-dismiss='modal']").forEach(function (btn) {
            btn.addEventListener("click", function () {
                addModal.classList.add("hidden");
            });
        });

        addModal.addEventListener("click", function (e) {
            if (e.target === addModal) addModal.classList.add("hidden");
        });

        if (saveTopicBtn) {
            saveTopicBtn.addEventListener("click", function () {
                var nameInput = document.getElementById("new-topic-name");
                var statusInput = document.getElementById("new-topic-status");
                var name = nameInput.value.trim();
                if (!name) return;

                // Generate next ID
                var existingIds = [];
                document.querySelectorAll("[data-item-id]").forEach(function (el) {
                    existingIds.push(parseInt(el.getAttribute("data-item-id"), 10));
                });
                // Also check local items
                var localItems = JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || "[]");
                localItems.forEach(function (li) {
                    existingIds.push(parseInt(li.id, 10));
                });
                var maxId = existingIds.length > 0 ? Math.max.apply(null, existingIds) : 0;
                var newId = String(maxId + 1).padStart(3, "0");

                var newItem = {
                    id: newId,
                    topic: name,
                    status: statusInput.value,
                    notes_doc: null,
                    local: true,
                    created: new Date().toISOString()
                };

                localItems.push(newItem);
                localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(localItems));

                // Add row to the list (sorted insert)
                var list = document.getElementById("learning-items");
                if (list) {
                    var row = document.createElement("div");
                    row.className = "item-row-managed";
                    row.setAttribute("data-item-id", newId);
                    row.setAttribute("data-item-status", newItem.status.toLowerCase());
                    row.innerHTML = '<a href="item/' + newId + '.html" class="item-row-link">' +
                        '<span class="item-id">#' + newId + '</span>' +
                        '<span class="item-topic">' + name.replace(/</g, '&lt;') + '</span>' +
                        '</a>' +
                        '<div class="item-row-controls">' +
                        '<span class="badge badge-' + newItem.status.toLowerCase() + '">' + newItem.status + '</span>' +
                        '<span class="local-badge">Local</span>' +
                        '</div>';

                    // Insert in alphabetical order
                    var inserted = false;
                    var rows = list.querySelectorAll(".item-row-managed");
                    for (var i = 0; i < rows.length; i++) {
                        var existing = rows[i].querySelector(".item-topic").textContent.toLowerCase();
                        if (name.toLowerCase() < existing) {
                            list.insertBefore(row, rows[i]);
                            inserted = true;
                            break;
                        }
                    }
                    if (!inserted) list.appendChild(row);
                }

                addModal.classList.add("hidden");
            });
        }
    }

    // Load local items on page load
    function loadLocalItems() {
        var localItems = JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || "[]");
        var list = document.getElementById("learning-items");
        if (!list || localItems.length === 0) return;

        localItems.forEach(function (item) {
            // Skip if already rendered by the build
            if (list.querySelector('[data-item-id="' + item.id + '"]')) return;

            var row = document.createElement("div");
            row.className = "item-row-managed";
            row.setAttribute("data-item-id", item.id);
            row.setAttribute("data-item-status", item.status.toLowerCase());
            row.innerHTML = '<a href="item/' + item.id + '.html" class="item-row-link">' +
                '<span class="item-id">#' + item.id + '</span>' +
                '<span class="item-topic">' + item.topic.replace(/</g, '&lt;') + '</span>' +
                '</a>' +
                '<div class="item-row-controls">' +
                '<span class="badge badge-' + item.status.toLowerCase() + '">' + item.status + '</span>' +
                '<span class="local-badge">Local</span>' +
                '</div>';

            // Insert in alphabetical order
            var inserted = false;
            var rows = list.querySelectorAll(".item-row-managed");
            for (var i = 0; i < rows.length; i++) {
                var existing = rows[i].querySelector(".item-topic").textContent.toLowerCase();
                if (item.topic.toLowerCase() < existing) {
                    list.insertBefore(row, rows[i]);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) list.appendChild(row);
        });
    }

    loadLocalItems();
});
