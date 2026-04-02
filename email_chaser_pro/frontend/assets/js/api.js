const API_BASE_URL = "/api";

class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || "Request failed. Please try again.";
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function healthCheck() {
  return request("/health");
}

export async function analyzeEmail(emailBody) {
  const CATEGORY_KEYWORDS = {
    Job: ["interview", "recruiter", "resume", "application", "hiring", "role", "position"],
    Client: ["proposal", "invoice", "project", "contract", "scope", "delivery", "timeline"],
    Personal: ["family", "friend", "personal", "party", "dinner", "holiday"],
  };

  const lowered = (emailBody || "").toLowerCase();
  let detectedCategory = "Client";
  let bestScore = -1;
  let matchedKeyword = "general context";

  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = words.filter((word) => lowered.includes(word));
    if (matches.length > bestScore) {
      bestScore = matches.length;
      detectedCategory = category;
      matchedKeyword = matches[0] || "general context";
    }
  }

  const waitDaysByCategory = { Job: 3, Client: 2, Personal: 5 };
  const waitDays = waitDaysByCategory[detectedCategory] || 4;

  return {
    category: detectedCategory,
    wait_days: waitDays,
    reasoning: `Based on '${detectedCategory}' category and '${matchedKeyword}' keyword.`,
  };
}

export async function createOrGetUser({ name, email, role = "user" }) {
  return request("/users", {
    method: "POST",
    body: { name, email, role },
  });
}

export async function createEmailRecord({
  user_id,
  subject,
  body,
  category,
  tone = "Professional",
  sent_at = new Date().toISOString(),
}) {
  return request("/emails", {
    method: "POST",
    body: { user_id, subject, body, category, tone, sent_at },
  });
}

export async function generateFollowUps(emailId, { onProgress } = {}) {
  const messages = [
    "Writing your follow-ups",
    "Writing your follow-ups.",
    "Writing your follow-ups..",
    "Writing your follow-ups...",
  ];

  let index = 0;
  if (typeof onProgress === "function") {
    onProgress(messages[index]);
  }

  const ticker = setInterval(() => {
    index = (index + 1) % messages.length;
    if (typeof onProgress === "function") {
      onProgress(messages[index]);
    }
  }, 350);

  try {
    const result = await request(`/emails/${emailId}/generate`, { method: "POST" });
    return result;
  } finally {
    clearInterval(ticker);
  }
}

export async function getEmailDrafts(emailId) {
  return request(`/emails/${emailId}/drafts`);
}

export async function markEmailSent(emailId, payload = {}) {
  return request(`/emails/${emailId}/mark_sent`, { method: "POST", body: payload });
}

export async function getDashboardData(userId) {
  return request(`/dashboard/${userId}`);
}

export async function getAdminStats() {
  return request("/admin/stats");
}

export { ApiError };
