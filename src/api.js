/* Thin client for the console API (same origin; Vite proxies /api in development). */

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

async function call(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Console server is not reachable - start it with `npm run server`", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data);
  return data;
}

export const api = {
  settings: () => call("GET", "/api/settings"),
  saveSettings: (s) => call("PUT", "/api/settings", s),
  status: () => call("GET", "/api/status"),
  config: () => call("GET", "/api/config"),
  apply: (changes) => call("POST", "/api/config/apply", changes),
  sim: (action) => call("POST", `/api/sim/${action}`),
  logs: (lines) => call("GET", `/api/logs?lines=${lines}`),
  activity: () => call("GET", "/api/activity"),
};
