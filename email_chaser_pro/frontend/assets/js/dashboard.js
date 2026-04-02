import {
  ApiError,
  generateFollowUps,
  getDashboardData,
  getEmailDrafts,
  markEmailSent,
} from "./api.js";
import {
  createModalController,
  createToastController,
  renderDashboardSkeleton,
  showCopiedState,
} from "./ui.js";

const refs = {
  grid: document.getElementById("countdownGrid"),
  userIdInput: document.getElementById("userIdInput"),
  loadBtn: document.getElementById("loadBtn"),
  draftList: document.getElementById("draftList"),
  modalTitle: document.getElementById("modalTitle"),
};

const toast = createToastController("appToast");
const modal = createModalController({
  overlayId: "draftModalOverlay",
  panelId: "draftModalPanel",
  closeId: "closeDraftModal",
});

let currentUserId = Number(refs.userIdInput.value || "1");
let cardsCache = [];

function daysRemaining(isoDate) {
  if (!isoDate) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function badgeText(days, status) {
  if (status === "Sent") return "Follow-up sent";
  if (days <= 0) return "Nudge Today!";
  if (days === 1) return "Nudge in 1 day";
  return `Nudge in ${days} days`;
}

function badgeClass(days, status) {
  if (status === "Sent") {
    return "rounded-full border border-emerald-300/35 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-100";
  }
  if (days <= 0) {
    return "health-online rounded-full border border-amber-300/35 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-100";
  }
  return "rounded-full border border-indigo-300/30 bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-100";
}

async function markAsSent(emailId, variationType) {
  await markEmailSent(emailId, { variation_type: variationType });
}

async function markSentAndRefresh(emailId, variationType) {
  await markAsSent(emailId, variationType);
  cardsCache = cardsCache.map((item) => (item.id === emailId ? { ...item, status: "Sent" } : item));
  renderCards(cardsCache);
}

function renderDrafts(subject, drafts, emailId) {
  refs.modalTitle.textContent = subject || "Follow-up Drafts";
  refs.draftList.innerHTML = "";

  if (!drafts.length) {
    refs.draftList.innerHTML =
      '<p class="rounded-xl border border-slate-500/40 bg-slate-800/50 p-3 text-slate-200">No drafts available yet.</p>';
    return;
  }

  drafts.forEach((draft) => {
    const wrapper = document.createElement("article");
    wrapper.className = "rounded-xl border border-slate-500/35 bg-slate-900/55 p-4 transition-all duration-300";
    wrapper.innerHTML = `
      <div class="mb-2 flex items-center justify-between gap-2">
        <h4 class="font-semibold text-indigo-100">${draft.variation_type}</h4>
        <button class="copy-btn rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">
          Copy
        </button>
      </div>
      <p class="text-sm leading-6 text-slate-100 whitespace-pre-wrap">${draft.content}</p>
    `;

    const copyBtn = wrapper.querySelector(".copy-btn");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(draft.content);
        await markSentAndRefresh(emailId, draft.variation_type);
        showCopiedState(copyBtn);
        toast.show("Draft Copied & Status Updated to Sent!", { variant: "success" });
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("mark_sent API error:", error.message, error.payload);
        } else {
          console.error("Copy update fails:", error);
        }
        toast.show("Copy or status update failed.", { variant: "error" });
      }
    });

    refs.draftList.appendChild(wrapper);
  });
}

async function openDraftsForEmail(item, draftBtn) {
  draftBtn.disabled = true;
  draftBtn.textContent = "Loading...";
  try {
    let response = await getEmailDrafts(item.id);
    let drafts = response.follow_ups || [];

    if (!drafts.length) {
      await generateFollowUps(item.id);
      response = await getEmailDrafts(item.id);
      drafts = response.follow_ups || [];
    }

    renderDrafts(item.subject, drafts, item.id);
    modal.open();
  } catch (error) {
    if (error instanceof ApiError) {
      toast.show(error.message, { variant: "error" });
    } else {
      toast.show("Could not load drafts.", { variant: "error" });
    }
  } finally {
    draftBtn.disabled = false;
    draftBtn.innerHTML = '<i data-lucide="files" class="h-4 w-4"></i>View Drafts';
    lucide.createIcons();
  }
}

function renderCards(items) {
  refs.grid.innerHTML = "";

  if (!items.length) {
    refs.grid.innerHTML = `
      <article class="glass col-span-full rounded-2xl p-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-300/35 bg-indigo-500/15">
          <i data-lucide="rocket" class="h-8 w-8 text-indigo-100"></i>
        </div>
        <h3 class="mb-2 text-xl font-semibold">Welcome to your Chase Dashboard</h3>
        <p class="mx-auto mb-5 max-w-xl text-sm text-slate-300">
          No active chases yet. Start your first chase to see countdown cards, AI drafts, and follow-up status in one place.
        </p>
        <a href="/" class="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
          <i data-lucide="sparkles" class="h-4 w-4"></i>
          Start your first Chase
        </a>
      </article>
    `;
    lucide.createIcons();
    return;
  }

  items.forEach((item) => {
    const remaining = daysRemaining(item.suggested_nudge_date);
    const card = document.createElement("article");
    card.className = "glass rounded-2xl p-5 transition-all duration-300";
    card.innerHTML = `
      <div class="mb-4 flex items-start justify-between gap-3">
        <h3 class="text-base font-semibold leading-6">${item.subject}</h3>
        <span title="Indigo = wait, Amber = nudge today, Green = sent" class="${badgeClass(remaining, item.status)}">${badgeText(remaining, item.status)}</span>
      </div>
      <div class="mb-4 text-xs text-slate-300">
        <p>Status: <span class="text-slate-100">${item.status}</span></p>
        <p>Priority: <span class="text-slate-100">${item.nudge_priority}</span></p>
      </div>
      <button class="draft-btn inline-flex items-center gap-2 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-3 py-2 text-sm text-indigo-100 hover:bg-indigo-500/30">
        <i data-lucide="files" class="h-4 w-4"></i>
        View Drafts
      </button>
    `;

    const draftBtn = card.querySelector(".draft-btn");
    draftBtn.addEventListener("click", () => openDraftsForEmail(item, draftBtn));
    refs.grid.appendChild(card);
  });

  lucide.createIcons();
}

async function loadDashboard() {
  currentUserId = Number(refs.userIdInput.value || "1");
  refs.loadBtn.disabled = true;
  refs.loadBtn.textContent = "Loading...";
  renderDashboardSkeleton(refs.grid, 3);
  try {
    const data = await getDashboardData(currentUserId);
    cardsCache = (data.active_chases || []).filter((c) => c.status === "Pending" || c.status === "Sent");
    renderCards(cardsCache);
  } catch (error) {
    if (error instanceof ApiError) {
      toast.show(error.message, { variant: "error" });
    } else {
      toast.show("Failed to load dashboard data.", { variant: "error" });
    }
    refs.grid.innerHTML = "";
  } finally {
    refs.loadBtn.disabled = false;
    refs.loadBtn.textContent = "Load";
  }
}

refs.loadBtn.addEventListener("click", loadDashboard);
loadDashboard();
