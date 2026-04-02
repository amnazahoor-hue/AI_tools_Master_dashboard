import { healthCheck } from "./api.js";

let toastTimer = null;

export function createToastController(containerId = "appToast") {
  const el = document.getElementById(containerId);
  if (!el) {
    throw new Error(`Toast element '${containerId}' not found`);
  }

  const variants = {
    info: "border-slate-300/30 bg-slate-500/15 text-slate-50",
    success: "border-emerald-300/30 bg-emerald-500/15 text-emerald-50",
    error: "border-rose-300/30 bg-rose-500/15 text-rose-50",
  };

  function show(message, { variant = "info", duration = 2200 } = {}) {
    el.textContent = message;
    el.classList.remove("opacity-0", "translate-y-3");
    el.classList.add("opacity-100", "translate-y-0");

    Object.values(variants).forEach((cls) => {
      cls.split(" ").forEach((token) => el.classList.remove(token));
    });
    (variants[variant] || variants.info).split(" ").forEach((token) => el.classList.add(token));

    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => hide(), duration);
  }

  function hide() {
    el.classList.remove("opacity-100", "translate-y-0");
    el.classList.add("opacity-0", "translate-y-3");
  }

  return { show, hide };
}

export function createModalController({ overlayId, panelId, closeId }) {
  const overlay = document.getElementById(overlayId);
  const panel = document.getElementById(panelId);
  const closeBtn = document.getElementById(closeId);

  if (!overlay || !panel || !closeBtn) {
    throw new Error("Modal elements are missing");
  }

  function open() {
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    document.body.classList.add("overflow-hidden");
  }

  function close() {
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  return { open, close, panel, overlay };
}

export function initAnalyzeButtonUX({ onAnalyzeSuccess, onAnalyzeError } = {}) {
  if (!document.getElementById("analyze-btn")) return;

  document.getElementById("analyze-btn").addEventListener("click", async () => {
    try {
      await healthCheck();
      if (typeof onAnalyzeSuccess === "function") onAnalyzeSuccess();
    } catch (error) {
      if (typeof onAnalyzeError === "function") onAnalyzeError(error);
    }
  });
}

export function renderDashboardSkeleton(gridEl, count = 3) {
  if (!gridEl) return;
  gridEl.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement("article");
    skeleton.className =
      "glass rounded-2xl p-5 animate-pulse transition-all duration-300";
    skeleton.innerHTML = `
      <div class="mb-4 h-5 w-2/3 rounded bg-slate-700/70"></div>
      <div class="mb-2 h-3 w-1/2 rounded bg-slate-700/60"></div>
      <div class="mb-5 h-3 w-1/3 rounded bg-slate-700/60"></div>
      <div class="h-9 w-28 rounded bg-slate-700/65"></div>
    `;
    gridEl.appendChild(skeleton);
  }
}

export function showCopiedState(buttonEl) {
  if (!buttonEl) return;
  const previousHtml = buttonEl.innerHTML;
  buttonEl.innerHTML = "✓ Copied!";
  buttonEl.classList.remove("bg-indigo-500", "hover:bg-indigo-400");
  buttonEl.classList.add("bg-emerald-500", "hover:bg-emerald-400");
  setTimeout(() => {
    buttonEl.innerHTML = previousHtml;
    buttonEl.classList.remove("bg-emerald-500", "hover:bg-emerald-400");
    buttonEl.classList.add("bg-indigo-500", "hover:bg-indigo-400");
  }, 2000);
}
