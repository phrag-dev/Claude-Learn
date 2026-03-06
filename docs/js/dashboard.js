// Dashboard interactivity — filtering, expand/collapse
// Populated in Milestone 3

document.addEventListener("DOMContentLoaded", function () {
    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
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
});
