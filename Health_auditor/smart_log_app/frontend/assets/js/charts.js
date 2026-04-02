let focusSleepChart = null;
let correlationHeatmapChart = null;

export function renderFocusSleepChart(canvasId, logs) {
  const labels = logs.map((entry) => entry.date);
  const sleep = logs.map((entry) => entry.sleep_hours);
  const focus = logs.map((entry) => entry.focus_score);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (focusSleepChart) focusSleepChart.destroy();
  focusSleepChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Sleep Hours",
          data: sleep,
          yAxisID: "ySleep",
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          tension: 0.35,
        },
        {
          label: "Focus Score",
          data: focus,
          yAxisID: "yFocus",
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        ySleep: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Sleep (hours)" },
        },
        yFocus: {
          type: "linear",
          position: "right",
          min: 1,
          max: 10,
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Focus (1-10)" },
        },
      },
    },
  });
}

function correlationColor(value) {
  const absValue = Math.abs(Number(value || 0));
  if (absValue >= 0.6) return "rgba(34, 197, 94, 0.85)";
  if (absValue >= 0.35) return "rgba(250, 204, 21, 0.8)";
  return "rgba(148, 163, 184, 0.6)";
}

export function renderCorrelationHeatmap(canvasId, correlationMatrix) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const labels = (correlationMatrix?.row_labels || []).flatMap((rowLabel) =>
    (correlationMatrix?.col_labels || []).map((colLabel) => `${rowLabel} -> ${colLabel}`)
  );
  const values = (correlationMatrix?.values || [[0, 0], [0, 0]]).flat();
  const colors = values.map(correlationColor);

  if (correlationHeatmapChart) correlationHeatmapChart.destroy();
  correlationHeatmapChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Pearson Correlation (R)",
          data: values,
          backgroundColor: colors,
          borderColor: "rgba(15, 23, 42, 0.2)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const value = Number(context.raw || 0).toFixed(3);
              return `R = ${value}`;
            },
          },
        },
      },
      scales: {
        y: {
          min: -1,
          max: 1,
          ticks: {
            callback(value) {
              return Number(value).toFixed(1);
            },
          },
        },
      },
    },
  });
}
