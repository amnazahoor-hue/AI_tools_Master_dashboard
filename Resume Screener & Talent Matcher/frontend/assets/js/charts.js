let scoreChart = null;

const SCORE_LABELS = ["0-30%", "31-70%", "71-100%"];

function updateCharts(statsData) {
  const bins = Array.isArray(statsData?.score_bins) ? statsData.score_bins : [0, 0, 0];
  const counts = [Number(bins[0] || 0), Number(bins[1] || 0), Number(bins[2] || 0)];

  const ctx = document.getElementById("scoreDistributionChart");
  if (!ctx) return;

  if (scoreChart) {
    scoreChart.destroy();
    scoreChart = null;
  }

  scoreChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: SCORE_LABELS,
      datasets: [
        {
          label: "Scanned Resumes",
          data: counts,
          backgroundColor: [
            "rgba(59, 130, 246, 0.65)", // blue-500
            "rgba(236, 72, 153, 0.65)", // pink-500
            "rgba(34, 197, 94, 0.65)", // green-500
          ],
          borderColor: "rgba(255,255,255,0.25)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (ctx) => `${ctx.raw} resumes`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.85)" },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "rgba(255,255,255,0.85)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });
}

function setModelStatus(modelLoaded) {
  const statusDot = document.getElementById("model-status-dot");
  const statusText = document.getElementById("model-status-text");

  const loaded = Boolean(modelLoaded);

  if (statusDot) {
    statusDot.className = loaded
      ? "h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]"
      : "h-3.5 w-3.5 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.35)]";
  }

  if (statusText) {
    statusText.textContent = loaded
      ? "Ready"
      : "Waking up... (First scan pending)";
  }
}

function renderRecentActivity(items) {
  const tbody = document.getElementById("recent-activity-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="px-3 py-5 text-center text-gray-400">
          No scan activity yet.
        </td>
      </tr>
    `;
    return;
  }

  for (const ev of items) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-white/5";

    const score = Number(ev.match_score || 0);
    const scoreStr = `${score.toFixed(1)}%`;

    // Backend sends created_at as ISO-ish string (SQLite CURRENT_TIMESTAMP).
    let timeStr = "";
    try {
      timeStr = ev.created_at ? new Date(ev.created_at).toLocaleString() : "";
    } catch (e) {
      timeStr = "";
    }

    tr.innerHTML = `
      <td class="px-3 py-3">
        <div class="font-medium text-white">${ev.candidate_name ? escapeHtml(ev.candidate_name) : "Candidate"}</div>
      </td>
      <td class="px-3 py-3">
        <div class="font-semibold text-white">${scoreStr}</div>
      </td>
      <td class="px-3 py-3 text-xs text-white/60">${timeStr || "—"}</td>
    `;
    tbody.appendChild(tr);
  }
}

// api.js defines escapeHtml for the recruiter view; reuse it if present.
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAdminDashboard(statsData) {
  if (!statsData || !statsData.success) return;

  const totalEl = document.getElementById("metric-total-count");
  const avgEl = document.getElementById("metric-avg-score");

  if (totalEl) totalEl.textContent = Number(statsData.total_count || 0).toLocaleString();
  if (avgEl) avgEl.textContent = `${Number(statsData.avg_score || 0).toFixed(2)}%`;

  setModelStatus(statsData.model_loaded);
  updateCharts(statsData);
  renderRecentActivity(statsData.recent_activity || []);
}

// Expose to api.js polling.
window.renderAdminDashboard = renderAdminDashboard;


