function renderCandidates(candidates) {
  const tbody = document.getElementById("results-body");
  tbody.innerHTML = "";

  if (!Array.isArray(candidates) || candidates.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="px-4 py-6 text-center text-gray-400">No candidates found.</td></tr>';
    return;
  }

  for (const c of candidates) {
    const tr = document.createElement("tr");
    tr.className = "border-t border-white/10";

    const skills = Array.isArray(c.top_skills) ? c.top_skills : [];
    const skillsHtml = skills.length
      ? skills.map((s) => `<span class="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-gray-200 ring-1 ring-white/10">${escapeHtml(s)}</span>`).join(" ")
      : '<span class="text-sm text-gray-400">N/A</span>';

    tr.innerHTML = `
      <td class="px-4 py-4">
        <div class="font-medium text-white">${escapeHtml(c.candidate_name || "Candidate")}</div>
      </td>
      <td class="px-4 py-4">
        <div class="text-white font-semibold">${Number(c.match_score || 0).toFixed(1)}%</div>
        <div class="text-xs text-gray-400">Semantic similarity</div>
      </td>
      <td class="px-4 py-4">
        <div class="flex flex-wrap gap-2">${skillsHtml}</div>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function submitMatch() {
  const jobEl = document.getElementById("job_description");
  const resumesEl = document.getElementById("resumes");
  const statusEl = document.getElementById("submit-status");
  const errorEl = document.getElementById("submit-error");

  const job_description = jobEl.value.trim();
  const files = resumesEl.files;

  errorEl.classList.add("hidden");
  errorEl.textContent = "";

  if (!job_description) {
    statusEl.textContent = "";
    errorEl.textContent = "Please paste a job description.";
    errorEl.classList.remove("hidden");
    return;
  }
  if (!files || files.length === 0) {
    statusEl.textContent = "";
    errorEl.textContent = "Please upload at least one resume PDF.";
    errorEl.classList.remove("hidden");
    return;
  }

  const formData = new FormData();
  formData.append("job_description", job_description);
  for (const file of files) {
    formData.append("resumes", file);
  }

  statusEl.textContent = "Matching candidates (this may take a moment)...";

  try {
    const res = await fetch("/api/match", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const msg = data?.error || "Failed to process resumes.";
      throw new Error(msg);
    }

    renderCandidates(data.candidates || []);
    statusEl.textContent = `Processed ${data.meta?.processed ?? 0} resume(s).`;
  } catch (e) {
    statusEl.textContent = "";
    errorEl.textContent = e?.message || "An unexpected error occurred.";
    errorEl.classList.remove("hidden");
  }
}

async function loadAdminStats() {
  const res = await fetch("/api/admin-stats", { method: "GET" });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data?.error || "Failed to load admin stats.");
  }
  return data;
}

async function pollAdminStats() {
  const data = await loadAdminStats();
  if (typeof window.renderAdminDashboard === "function") {
    window.renderAdminDashboard(data);
  }
}

async function exportAdminReportPdf() {
  const res = await fetch("/api/admin-report.pdf", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to export analytics report.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "analytics-report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Poll admin stats every 10 seconds (admin.html only).
function startAdminStatsPolling(intervalMs = 10000) {
  if (startAdminStatsPolling._timer) {
    clearInterval(startAdminStatsPolling._timer);
  }

  const tick = async () => {
    try {
      await pollAdminStats();
    } catch (e) {
      // Keep polling even if one request fails.
      console.error("Admin stats polling failed:", e?.message || e);
    }
  };

  tick();
  startAdminStatsPolling._timer = setInterval(tick, intervalMs);
}

document.addEventListener("DOMContentLoaded", () => {
  // Only run polling on the admin dashboard page.
  const chartEl = document.getElementById("scoreDistributionChart");
  if (chartEl) {
    startAdminStatsPolling(10000);

    const exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        try {
          exportBtn.disabled = true;
          exportBtn.textContent = "Generating...";
          await exportAdminReportPdf();
          exportBtn.textContent = "Export PDF Report";
        } catch (e) {
          console.error(e?.message || e);
          exportBtn.textContent = "Export Failed";
          setTimeout(() => {
            exportBtn.textContent = "Export PDF Report";
          }, 1500);
        } finally {
          exportBtn.disabled = false;
        }
      });
    }
  }
});

