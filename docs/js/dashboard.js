// Dashboard interactivity -- filtering, commander init, topic management

document.addEventListener("DOMContentLoaded", function () {
    AppLog.info("App", "Dashboard loaded", { page: window.location.pathname });
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

    // === Change feedback ===
    function flashRow(row) {
        row.classList.add("row-saved");
        setTimeout(function () { row.classList.remove("row-saved"); }, 1200);
    }

    function updateSummaryCounts() {
        var countsEl = document.querySelector(".summary-card .card-counts");
        if (!countsEl) return;
        var counts = { open: 0, learning: 0, closed: 0 };
        document.querySelectorAll(".item-row-managed").forEach(function (row) {
            var status = row.getAttribute("data-item-status");
            if (counts.hasOwnProperty(status)) counts[status]++;
        });
        var openEl = countsEl.querySelector(".count.open");
        var learningEl = countsEl.querySelector(".count.learning");
        var closedEl = countsEl.querySelector(".count.closed");
        if (openEl) openEl.textContent = counts.open + " Open";
        if (learningEl) learningEl.textContent = counts.learning + " Learning";
        if (closedEl) closedEl.textContent = counts.closed + " Closed";
    }

    function updatePendingBanner() {
        var banner = document.getElementById("pending-changes-banner");
        if (!banner) return;
        var overrides = getStatusOverrides();
        var links = getSkillLinks();
        var localItems = JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || "[]");
        var count = Object.keys(overrides).length + Object.keys(links).length + localItems.length;
        if (count > 0) {
            banner.classList.remove("hidden");
            banner.querySelector(".pending-count").textContent = count;
        } else {
            banner.classList.add("hidden");
        }
        updateSummaryCounts();
    }

    // === Inline confirm for changes ===
    function showInlineConfirm(row, onConfirm, onCancel) {
        // Remove any existing confirm
        var existing = row.querySelector(".inline-confirm");
        if (existing) existing.remove();

        var wrap = document.createElement("span");
        wrap.className = "inline-confirm";
        wrap.innerHTML = '<button class="ic-yes" title="Confirm">&#10003;</button><button class="ic-no" title="Cancel">&#10007;</button>';
        row.querySelector(".item-row-controls").appendChild(wrap);

        wrap.querySelector(".ic-yes").addEventListener("click", function () {
            wrap.remove();
            onConfirm();
        });
        wrap.querySelector(".ic-no").addEventListener("click", function () {
            wrap.remove();
            onCancel();
        });
    }

    // === Status overrides (client-side until commit) ===
    function getStatusOverrides() {
        var stored = localStorage.getItem(STATUS_OVERRIDES_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    function applyStatusOverrides() {
        var overrides = getStatusOverrides();
        var changed = false;
        document.querySelectorAll(".item-status-select").forEach(function (sel) {
            var id = sel.getAttribute("data-item-id");
            if (overrides[id]) {
                var row = sel.closest(".item-row-managed");
                var orig = row ? row.getAttribute("data-orig-status") : null;
                if (orig && overrides[id] === orig) {
                    delete overrides[id];
                    changed = true;
                    return;
                }
                sel.value = overrides[id];
                if (row) row.setAttribute("data-item-status", overrides[id].toLowerCase());
            }
        });
        if (changed) {
            localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
        }
    }

    document.querySelectorAll(".item-status-select").forEach(function (sel) {
        var prevValue = sel.value;
        sel.addEventListener("change", function () {
            var newValue = sel.value;
            var row = sel.closest(".item-row-managed");
            // Revert visually, wait for confirm
            sel.value = prevValue;

            showInlineConfirm(row, function () {
                // Confirmed
                var id = sel.getAttribute("data-item-id");
                var overrides = getStatusOverrides();
                var orig = row.getAttribute("data-orig-status");
                if (newValue === orig) {
                    delete overrides[id];
                } else {
                    overrides[id] = newValue;
                }
                localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
                sel.value = newValue;
                prevValue = newValue;
                row.setAttribute("data-item-status", newValue.toLowerCase());
                flashRow(row);
                updatePendingBanner();
            }, function () {
                // Cancelled — stays at previous value
                sel.value = prevValue;
            });
        });
    });

    applyStatusOverrides();
    // Update prevValue for selects that had overrides applied
    document.querySelectorAll(".item-status-select").forEach(function (sel) {
        sel._prevValue = sel.value;
    });

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
        var prevValue = sel.value;
        sel.addEventListener("change", function () {
            var newValue = sel.value;
            var row = sel.closest(".item-row-managed");
            sel.value = prevValue;

            showInlineConfirm(row, function () {
                var id = sel.getAttribute("data-item-id");
                var links = getSkillLinks();
                if (newValue) {
                    links[id] = newValue;
                } else {
                    delete links[id];
                }
                localStorage.setItem(SKILL_LINKS_KEY, JSON.stringify(links));
                sel.value = newValue;
                prevValue = newValue;
                flashRow(row);
                updatePendingBanner();
            }, function () {
                sel.value = prevValue;
            });
        });
    });

    applySkillLinks();

    // === Clear pending changes ===
    var clearBtn = document.getElementById("clear-pending-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            localStorage.removeItem(STATUS_OVERRIDES_KEY);
            localStorage.removeItem(SKILL_LINKS_KEY);
            // Remove local item rows from DOM
            var localItems = JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || "[]");
            localItems.forEach(function (item) {
                var row = document.querySelector('[data-item-id="' + item.id + '"]');
                if (row) row.remove();
            });
            localStorage.removeItem(LOCAL_ITEMS_KEY);
            updatePendingBanner();
            document.querySelectorAll(".item-status-select").forEach(function (sel) {
                var row = sel.closest(".item-row-managed");
                if (!row) return;
                var origStatus = row.getAttribute("data-orig-status");
                if (origStatus) {
                    sel.value = origStatus;
                    row.setAttribute("data-item-status", origStatus.toLowerCase());
                }
            });
            document.querySelectorAll(".item-skill-select").forEach(function (sel) {
                sel.value = "";
            });
        });
    }

    updatePendingBanner();

    // === Rebuild banner — poll GitHub Actions after commit ===
    function showRebuildBanner(auth) {
        var banner = document.getElementById("pending-changes-banner");
        if (!banner) return;

        banner.innerHTML =
            '<span class="rebuild-status">' +
                '<span class="rebuild-spinner"></span> Rebuilding dashboard — waiting for GitHub Action...' +
            '</span>';
        banner.classList.remove("hidden");

        if (syncStatusEl) {
            syncStatusEl.innerHTML = '<span class="sync-pending">Rebuilding...</span>';
        }

        AppLog.info("Rebuild", "Polling GitHub Actions for rebuild status");
        pollRebuildStatus(auth, banner, 0);
    }

    function pollRebuildStatus(auth, banner, attempt) {
        if (attempt > 30) {
            // 60 seconds max — give up
            banner.innerHTML =
                '<span class="rebuild-status">Rebuild is taking longer than expected. ' +
                '<button class="btn btn-sm btn-action" id="refresh-timeout-btn">Refresh now</button></span>';
            document.getElementById("refresh-timeout-btn").addEventListener("click", function () {
                location.reload(true);
            });
            AppLog.warn("Rebuild", "Polling timed out after 30 attempts");
            return;
        }

        setTimeout(function () {
            fetch("https://api.github.com/repos/" + auth.repo + "/actions/runs?per_page=3&branch=master", {
                headers: {
                    "Authorization": "Bearer " + auth.token,
                    "Accept": "application/vnd.github+json"
                }
            }).then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            }).then(function (data) {
                var runs = data.workflow_runs || [];
                // Find the Rebuild Dashboard run
                var rebuildRun = null;
                for (var i = 0; i < runs.length; i++) {
                    if (runs[i].name === "Rebuild Dashboard") {
                        rebuildRun = runs[i];
                        break;
                    }
                }

                if (!rebuildRun) {
                    AppLog.debug("Rebuild", "No rebuild run found yet, retrying...");
                    pollRebuildStatus(auth, banner, attempt + 1);
                    return;
                }

                AppLog.debug("Rebuild", "Run status: " + rebuildRun.status + " / " + rebuildRun.conclusion);

                if (rebuildRun.status === "completed") {
                    if (rebuildRun.conclusion === "success") {
                        banner.innerHTML =
                            '<span class="rebuild-status rebuild-done">' +
                                'Dashboard rebuilt successfully. ' +
                                '<button class="btn btn-sm btn-action" id="refresh-page-btn">Refresh to update</button>' +
                            '</span>';
                        document.getElementById("refresh-page-btn").addEventListener("click", function () {
                            location.reload(true);
                        });
                        if (syncStatusEl) {
                            syncStatusEl.innerHTML = '<span class="sync-ok">Rebuild complete — refresh to update</span>';
                        }
                        AppLog.info("Rebuild", "Dashboard rebuilt successfully");
                    } else {
                        banner.innerHTML =
                            '<span class="rebuild-status rebuild-failed">' +
                                'Rebuild failed (' + rebuildRun.conclusion + '). ' +
                                '<a href="' + rebuildRun.html_url + '" target="_blank">View run</a>' +
                            '</span>';
                        AppLog.error("Rebuild", "Rebuild failed: " + rebuildRun.conclusion);
                    }
                } else {
                    // Still running
                    pollRebuildStatus(auth, banner, attempt + 1);
                }
            }).catch(function (err) {
                AppLog.error("Rebuild", "Poll failed: " + err.message);
                if (err.message && err.message.indexOf("403") !== -1) {
                    // PAT doesn't have Actions read permission — show timed refresh
                    AppLog.warn("Rebuild", "No Actions API access — showing timed refresh");
                    showTimedRefresh(banner, 15);
                    return;
                }
                pollRebuildStatus(auth, banner, attempt + 1);
            });
        }, 2000);
    }

    function showTimedRefresh(banner, seconds) {
        var remaining = seconds;
        function tick() {
            banner.innerHTML =
                '<span class="rebuild-status rebuild-done">' +
                    'Committed. Refreshing in <strong>' + remaining + 's</strong> for rebuild... ' +
                    '<button class="btn btn-sm btn-action" id="refresh-now-btn">Refresh now</button>' +
                '</span>';
            document.getElementById("refresh-now-btn").addEventListener("click", function () {
                location.reload(true);
            });
            if (remaining <= 0) {
                location.reload(true);
                return;
            }
            remaining--;
            setTimeout(tick, 1000);
        }
        tick();
    }

    // === Sync status on load ===
    var TRACKER_PATH = "/contents/Notes/LEARNING_TRACKER.md";
    var syncStatusEl = document.getElementById("sync-status");
    var remoteTrackerSha = null;

    function checkRemoteSync() {
        if (!syncStatusEl) return;
        var auth = (typeof Sync !== "undefined") ? getGitHubAuth() : null;
        if (!auth) {
            AppLog.info("Sync", "No auth — offline mode");
            syncStatusEl.innerHTML = '<span class="sync-offline">Offline — configure GitHub PAT in settings to enable sync</span>';
            return;
        }

        AppLog.info("Sync", "Checking remote...", { repo: auth.repo });
        syncStatusEl.innerHTML = '<span class="sync-checking">Checking remote...</span>';

        fetchRemoteTracker(auth).then(function (remote) {
            remoteTrackerSha = remote.sha;
            AppLog.info("Sync", "Remote tracker fetched", { sha: remote.sha.substring(0, 8) });
            var remoteContent = decodeBase64(remote.content);
            var localStatuses = getLocalStatuses();
            var remoteStatuses = parseTrackerStatuses(remoteContent);
            AppLog.debug("Sync", "Remote statuses", remoteStatuses);
            AppLog.debug("Sync", "Local build statuses", localStatuses);

            var conflicts = findConflicts(localStatuses, remoteStatuses);
            var overrides = getStatusOverrides();
            var hasLocal = Object.keys(overrides).length > 0;

            if (conflicts.length > 0) {
                AppLog.warn("Sync", "Conflicts detected", conflicts);
                syncStatusEl.innerHTML = '<span class="sync-conflict">Conflict — remote and local have different changes</span>';
                showConflictBanner(conflicts, remoteStatuses);
            } else if (hasLocal) {
                AppLog.info("Sync", "Local changes pending", overrides);
                syncStatusEl.innerHTML = '<span class="sync-pending">Local changes pending commit</span>';
            } else {
                AppLog.info("Sync", "In sync with remote");
                syncStatusEl.innerHTML = '<span class="sync-ok">In sync with remote</span>';
            }
        }).catch(function (err) {
            AppLog.error("Sync", "Sync check failed: " + err.message, { repo: auth.repo });
            syncStatusEl.innerHTML = '<span class="sync-error">Sync check failed: ' + err.message + '</span>';
        });
    }

    function getGitHubAuth() {
        var token = DashCrypto.getToken();
        var repo = sessionStorage.getItem("claude_learn_repo");
        if (!token || !repo) return null;
        return { token: token, repo: repo };
    }

    function fetchRemoteTracker(auth) {
        var url = "https://api.github.com/repos/" + auth.repo + TRACKER_PATH;
        AppLog.debug("Sync", "GET " + url);
        return fetch(url, {
            headers: {
                "Authorization": "Bearer " + auth.token,
                "Accept": "application/vnd.github+json"
            }
        }).then(function (r) {
            if (!r.ok) {
                AppLog.error("Sync", "GitHub API " + r.status + " " + r.statusText, { url: url });
                return r.json().catch(function () { return {}; }).then(function (body) {
                    throw new Error("HTTP " + r.status + (body.message ? " — " + body.message : ""));
                });
            }
            AppLog.debug("Sync", "GitHub API 200 OK");
            return r.json();
        });
    }

    function decodeBase64(encoded) {
        return decodeURIComponent(escape(atob(encoded.replace(/\n/g, ""))));
    }

    function parseTrackerStatuses(md) {
        var statuses = {};
        md.split("\n").forEach(function (line) {
            line = line.trim();
            if (!line.startsWith("|") || line.indexOf("---") !== -1) return;
            var cells = line.split("|").map(function (c) { return c.trim(); }).filter(Boolean);
            if (cells.length >= 3 && /^\d+$/.test(cells[0])) {
                statuses[cells[0]] = cells[2];
            }
        });
        return statuses;
    }

    function getLocalStatuses() {
        var statuses = {};
        document.querySelectorAll(".item-row-managed").forEach(function (row) {
            var id = row.getAttribute("data-item-id");
            var orig = row.getAttribute("data-orig-status");
            if (id && orig) statuses[id] = orig;
        });
        return statuses;
    }

    function findConflicts(localBuild, remote) {
        var overrides = getStatusOverrides();
        var conflicts = [];
        Object.keys(overrides).forEach(function (id) {
            var remoteStat = remote[id];
            var buildStat = localBuild[id];
            // Conflict: remote changed AND we have a local override
            if (remoteStat && buildStat && remoteStat !== buildStat) {
                conflicts.push({
                    id: id,
                    build: buildStat,
                    remote: remoteStat,
                    local: overrides[id]
                });
            }
        });
        return conflicts;
    }

    function showConflictBanner(conflicts, remoteStatuses) {
        var banner = document.getElementById("pending-changes-banner");
        if (!banner) return;
        var html = '<span class="sync-conflict-msg">';
        html += conflicts.length + ' conflict(s) — remote changed since last build. ';
        html += '</span>';
        html += '<div class="pending-actions">';
        html += '<button class="btn btn-sm btn-action" id="use-remote-btn">Use Remote</button>';
        html += '<button class="btn btn-sm btn-commit" id="commit-changes-btn">Push Local</button>';
        html += '<button class="btn btn-sm btn-text" id="clear-pending-btn">Clear All</button>';
        html += '</div>';
        banner.innerHTML = html;
        banner.classList.remove("hidden");

        document.getElementById("use-remote-btn").addEventListener("click", function () {
            // Discard local overrides, accept remote values
            localStorage.removeItem(STATUS_OVERRIDES_KEY);
            localStorage.removeItem(SKILL_LINKS_KEY);
            // Update display to remote values
            Object.keys(remoteStatuses).forEach(function (id) {
                var sel = document.querySelector('.item-status-select[data-item-id="' + id + '"]');
                if (sel) {
                    sel.value = remoteStatuses[id];
                    var row = sel.closest(".item-row-managed");
                    if (row) row.setAttribute("data-item-status", remoteStatuses[id].toLowerCase());
                }
            });
            updatePendingBanner();
            if (syncStatusEl) syncStatusEl.innerHTML = '<span class="sync-ok">Accepted remote — rebuild to persist</span>';
        });
    }

    checkRemoteSync();

    // === Commit to GitHub ===
    var commitBtn = document.getElementById("commit-changes-btn");
    var commitModal = document.getElementById("commit-modal");

    if (commitBtn && commitModal) {
        var commitList = document.getElementById("commit-changes-list");
        var confirmBtn = document.getElementById("commit-confirm-btn");
        var commitStatus = document.getElementById("commit-status");

        commitBtn.addEventListener("click", function () {
            var overrides = getStatusOverrides();
            var links = getSkillLinks();
            var localItems = JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || "[]");

            if (Object.keys(overrides).length === 0 && Object.keys(links).length === 0 && localItems.length === 0) {
                return;
            }

            var auth = getGitHubAuth();
            var html = "";

            if (!auth) {
                html += '<div class="commit-warning">GitHub PAT not configured. Open Settings (sidebar footer) to set up sync first.</div>';
            }

            Object.keys(overrides).forEach(function (id) {
                var row = document.querySelector('[data-item-id="' + id + '"]');
                var topic = row ? row.querySelector(".item-topic").textContent : "#" + id;
                var orig = row ? row.getAttribute("data-orig-status") : "?";
                html += '<div class="commit-item"><span class="commit-icon">&#9998;</span> <strong>#' + id + ' ' + topic + '</strong> — status: ' + orig + ' &rarr; ' + overrides[id] + '</div>';
            });
            Object.keys(links).forEach(function (id) {
                var row = document.querySelector('[data-item-id="' + id + '"]');
                var topic = row ? row.querySelector(".item-topic").textContent : "#" + id;
                html += '<div class="commit-item"><span class="commit-icon">&#128279;</span> <strong>#' + id + ' ' + topic + '</strong> — skill: ' + links[id] + '</div>';
            });
            localItems.forEach(function (item) {
                html += '<div class="commit-item"><span class="commit-icon">&#10010;</span> <strong>#' + item.id + ' ' + item.topic + '</strong> — new item (' + item.status + ')</div>';
            });

            commitList.innerHTML = html;
            if (commitStatus) commitStatus.textContent = "";
            confirmBtn.disabled = !auth;
            commitModal.classList.remove("hidden");
        });

        commitModal.querySelectorAll("[data-dismiss='modal']").forEach(function (btn) {
            btn.addEventListener("click", function () { commitModal.classList.add("hidden"); });
        });
        commitModal.addEventListener("click", function (e) {
            if (e.target === commitModal) commitModal.classList.add("hidden");
        });

        confirmBtn.addEventListener("click", function () {
            var auth = getGitHubAuth();
            if (!auth) return;

            confirmBtn.disabled = true;
            if (commitStatus) commitStatus.textContent = "Committing to GitHub...";

            var overrides = getStatusOverrides();
            var localItems = JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || "[]");
            AppLog.info("Commit", "Starting commit", { overrides: overrides, newItems: localItems.length });

            // 1. Fetch current LEARNING_TRACKER.md from GitHub
            fetchRemoteTracker(auth).then(function (remote) {
                var content = decodeBase64(remote.content);
                var lines = content.split("\n");
                var updatedLines = [];

                // 2. Apply status overrides
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.trim().startsWith("|") && line.indexOf("---") === -1) {
                        var cells = line.split("|").map(function (c) { return c.trim(); }).filter(Boolean);
                        if (cells.length >= 3 && /^\d+$/.test(cells[0]) && overrides[cells[0]]) {
                            cells[2] = overrides[cells[0]];
                            line = "| " + cells.join(" | ") + " |";
                        }
                    }
                    // Update last updated date
                    if (line.trim().startsWith("*Last updated:")) {
                        line = "*Last updated: " + new Date().toISOString().slice(0, 10) + "*";
                    }
                    updatedLines.push(line);
                }

                // 3. Add new items before --- line
                if (localItems.length > 0) {
                    var insertIdx = updatedLines.length;
                    for (var j = updatedLines.length - 1; j >= 0; j--) {
                        if (updatedLines[j].trim().startsWith("---")) { insertIdx = j; break; }
                    }
                    localItems.forEach(function (item) {
                        updatedLines.splice(insertIdx, 0, "| " + item.id + " | " + item.topic + " | " + item.status + " | - |");
                        insertIdx++;
                    });
                }

                var newContent = updatedLines.join("\n");
                var encoded = btoa(unescape(encodeURIComponent(newContent)));

                // 4. PUT to GitHub
                return fetch("https://api.github.com/repos/" + auth.repo + TRACKER_PATH, {
                    method: "PUT",
                    headers: {
                        "Authorization": "Bearer " + auth.token,
                        "Accept": "application/vnd.github+json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: "dashboard: update learning tracker",
                        content: encoded,
                        sha: remote.sha
                    })
                });
            }).then(function (resp) {
                if (!resp.ok) return resp.json().then(function (e) { throw new Error(e.message); });
                return resp.json();
            }).then(function () {
                AppLog.info("Commit", "Committed successfully");
                // 5. Clear local overrides
                localStorage.removeItem(STATUS_OVERRIDES_KEY);
                localStorage.removeItem(SKILL_LINKS_KEY);
                localStorage.removeItem(LOCAL_ITEMS_KEY);

                if (commitStatus) {
                    commitStatus.textContent = "Committed. Waiting for rebuild...";
                    commitStatus.className = "commit-status success";
                }
                confirmBtn.disabled = false;
                updatePendingBanner();

                // Close modal, show rebuild banner
                setTimeout(function () {
                    commitModal.classList.add("hidden");
                    showRebuildBanner(auth);
                }, 1000);
            }).catch(function (err) {
                AppLog.error("Commit", "Commit failed: " + err.message);
                if (commitStatus) {
                    commitStatus.textContent = "Commit failed: " + err.message;
                    commitStatus.className = "commit-status error";
                }
                confirmBtn.disabled = false;
            });
        });
    }

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
                    row.innerHTML = '<span class="item-row-link item-local">' +
                        '<span class="item-id">#' + newId + '</span>' +
                        '<span class="item-topic">' + name.replace(/</g, '&lt;') + '</span>' +
                        '<span class="local-badge">Local</span>' +
                        '</span>' +
                        '<div class="item-row-controls">' +
                        '<span class="badge badge-' + newItem.status.toLowerCase() + '">' + newItem.status + '</span>' +
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
                updatePendingBanner();
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
            row.innerHTML = '<span class="item-row-link item-local">' +
                '<span class="item-id">#' + item.id + '</span>' +
                '<span class="item-topic">' + item.topic.replace(/</g, '&lt;') + '</span>' +
                '<span class="local-badge">Local</span>' +
                '</span>' +
                '<div class="item-row-controls">' +
                '<span class="badge badge-' + item.status.toLowerCase() + '">' + item.status + '</span>' +
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
