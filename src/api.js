/*
 * Client for the simulator's REST API (ConfigAdminServer). The page is static: the API URL and token are
 * kept in this browser (localStorage) and every call goes straight to the simulator machine.
 */

const URL_KEY = "cbs-api-url";
const TOKEN_KEY = "cbs-api-token";

export const connection = {
  get url() { return (localStorage.getItem(URL_KEY) || "").replace(/\/+$/, ""); },
  get token() { return localStorage.getItem(TOKEN_KEY) || ""; },
  save(url, token) {
    localStorage.setItem(URL_KEY, url.trim().replace(/\/+$/, ""));
    localStorage.setItem(TOKEN_KEY, token.trim());
  },
};

/**
 * kind: "unconfigured" | "unreachable" | "mixed-content" | "unauthorized" | "forbidden" | "conflict" | "http"
 */
export class ApiError extends Error {
  constructor(message, kind, status, data) { super(message); this.kind = kind; this.status = status; this.data = data; }
}

/** An https page cannot call http:// on another host (browsers block mixed content; localhost is exempt). */
export function mixedContent(url) {
  try {
    const u = new URL(url);
    return location.protocol === "https:" && u.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

async function call(method, path, body, { url = connection.url, token = connection.token, timeout = 10000 } = {}) {
  if (!url) throw new ApiError("Set the simulator API URL in Settings", "unconfigured", 0);
  if (mixedContent(url))
    throw new ApiError(`This page is served over https, so the browser blocks calls to ${url}. Serve the simulator API over https (CBS_ADMIN_KEYSTORE) and use an https:// URL.`, "mixed-content", 0);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(url + path, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
  } catch {
    throw new ApiError(`The simulator at ${url} is not reachable - it may be stopped, or the URL / network / certificate is wrong.`, "unreachable", 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const kind = res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : res.status === 409 ? "conflict" : "http";
    throw new ApiError(data.error || `HTTP ${res.status}`, kind, res.status, data);
  }
  return data;
}

export const api = {
  health: (opts) => call("GET", "/api/health", null, opts),
  status: (opts) => call("GET", "/api/status", null, opts),
  config: () => call("GET", "/api/config"),
  apply: (changes) => call("POST", "/api/config/apply", changes, { timeout: 60000 }),
  sim: (action) => call("POST", `/api/sim/${action}`),
  logs: (lines) => call("GET", `/api/logs?lines=${lines}`),
  activity: () => call("GET", "/api/activity"),
};
