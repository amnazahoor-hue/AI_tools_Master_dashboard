const API_BASE_URL = "http://127.0.0.1:5104";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function createUser(username, email) {
  return apiRequest("/api/users", {
    method: "POST",
    body: JSON.stringify({ username, email }),
  });
}

export async function createLog(payload) {
  return apiRequest("/api/logs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDashboardData(userId, days = 7) {
  const today = new Date().toISOString().slice(0, 10);
  return apiRequest(`/api/dashboard/${userId}?days=${days}&today=${today}`);
}

export async function getAdminMetrics() {
  return apiRequest("/api/admin/metrics");
}

export async function seedDemoData(userId) {
  return apiRequest(`/api/demo-seed/${userId}`, {
    method: "POST",
  });
}
