// Dashboard interactivity -- filtering, commander init

document.addEventListener("DOMContentLoaded", function () {
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
            // Fallback: try relative path for item subpages
            fetch("../data/learning.json")
                .then(function (r) { return r.json(); })
                .then(function (items) {
                    Commander.init(items);
                })
                .catch(function () {
                    Commander.init([]);
                });
        });

    // Learning page search filter
    var searchInput = document.getElementById("learning-search");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            var query = searchInput.value.toLowerCase();
            document.querySelectorAll(".kanban-card, .kanban-card-link").forEach(function (card) {
                var text = card.textContent.toLowerCase();
                card.style.display = (query === "" || text.indexOf(query) !== -1) ? "" : "none";
            });
        });
    }

    // Sidebar commander trigger button
    var triggerBtn = document.getElementById("open-commander");
    if (triggerBtn) {
        triggerBtn.addEventListener("click", function () {
            Commander.open();
        });
    }
});
