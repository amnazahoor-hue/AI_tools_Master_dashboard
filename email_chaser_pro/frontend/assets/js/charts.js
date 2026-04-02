import { ApiError, getAdminStats, healthCheck } from "./api.js";
import { createToastController } from "./ui.js";

const refs = {
  barCanvas: document.getElementById("barChart"),
  pieCanvas: document.getElementById("pieChart"),
  healthBadge: document.getElementById("systemHealthBadge"),
  totalUsers: document.getElementById("totalUsers"),
  totalEmails: document.getElementById("totalEmails"),
  mostUsedTone: document.getElementById("mostUsedTone"),
  totalChasesRibbon: document.getElementById("totalChasesRibbon"),
  activeWaitersRibbon: document.getElementById("activeWaitersRibbon"),
  sentTodayRibbon: document.getElementById("sentTodayRibbon"),
};

const toast = createToastController("appToast");
let barChart = null;
let pieChart = null;

function setHealthBadge(online) {
  refs.healthBadge.className = online
    ? "health-online inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100"
    : "inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/15 px-3 py-1 text-xs text-rose-100";

  refs.healthBadge.innerHTML = online
    ? `<span class="h-2 w-2 rounded-full bg-emerald-300"></span>AI Engine Online`
    : `<span class="h-2 w-2 rounded-full bg-rose-300"></span>Service Offline`;
}

async function checkHealth() {
  try {
    await healthCheck();
    setHealthBadge(true);
  } catch (_error) {
    setHealthBadge(false);
  }
}

function last7DaysSeries(points) {
  const map = new Map(points.map((p) => [p.date, Number(p.count || 0)]));
  const labels = [];
  const values = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    labels.push(key);
    values.push(map.get(key) || 0);
  }
  return { labels, values };
}

function buildBarChart(labels, values) {
  if (barChart) barChart.destroy();
  const ctx = refs.barCanvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
  gradient.addColorStop(1, "rgba(99, 102, 241, 0.15)");

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Emails Sent",
          data: values,
          backgroundColor: gradient,
          borderColor: "#818cf8",
          borderWidth: 1.5,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#cbd5e1" },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#cbd5e1", precision: 0 },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
      },
    },
  });
}

function buildPieChart(distribution) {
  if (pieChart) pieChart.destroy();
  const ctx = refs.pieCanvas.getContext("2d");
  const labels = ["Casual", "Professional", "Value-Add"];
  const values = labels.map((k) => Number(distribution?.[k] || 0));

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#34d399", "#818cf8", "#f59e0b"],
          borderColor: ["#022c22", "#1e1b4b", "#451a03"],
          borderWidth: 1,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e2e8f0",
          },
        },
      },
    },
  });
}

async function loadAdmin() {
  try {
    const data = await getAdminStats();
    refs.totalUsers.textContent = data?.global_stats?.total_users ?? 0;
    refs.totalEmails.textContent = data?.global_stats?.total_emails_analyzed ?? 0;
    refs.mostUsedTone.textContent = data?.global_stats?.most_used_tone ?? "N/A";
    refs.totalChasesRibbon.textContent = data?.global_stats?.total_emails_analyzed ?? 0;
    refs.activeWaitersRibbon.textContent = data?.global_stats?.active_waiters ?? 0;
    refs.sentTodayRibbon.textContent = data?.global_stats?.nudges_sent_today ?? 0;

    const points = data?.system_health?.emails_chased_per_day || [];
    const { labels, values } = last7DaysSeries(points);
    buildBarChart(labels, values);
    buildPieChart(data?.tone_distribution || {});
  } catch (error) {
    if (error instanceof ApiError) {
      toast.show(error.message, { variant: "error" });
    } else {
      toast.show("Failed to load admin analytics.", { variant: "error" });
    }
  }
}

checkHealth();
loadAdmin();
setInterval(checkHealth, 10000);
