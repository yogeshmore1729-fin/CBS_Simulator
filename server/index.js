/**
 * CBS Simulator Console - API server
 *
 *   node server/index.js            (serves the API, and the built UI from dist/ if present)
 *
 * Listens on 127.0.0.1 only. There is no generic command / file endpoint: the console can
 * only read and edit the three simulator config files and run the simulator's own scripts.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, editEnv, parseProps, editProps, sha } from "./files.js";
import * as sim from "./simulator.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETTINGS_FILE = path.join(ROOT, "cbs-console.settings.json");
const DIST = path.join(ROOT, "dist");
const HOST = process.env.CONSOLE_HOST || "127.0.0.1";
const PORT = Number(process.env.CONSOLE_PORT || 3001);

/* ── settings ──────────────────────────────────────────────────────────────── */

const DEFAULT_SETTINGS = {
  simHome: process.env.CBS_SIM_HOME || "",
  adminUrl: process.env.CBS_ADMIN_URL || "http://127.0.0.1:7099",
  javaHome: process.env.CBS_JAVA_HOME || "",
};
let settings = { ...DEFAULT_SETTINGS };
try { settings = { ...settings, ...JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8")) }; } catch { /* first run */ }
if (process.env.CBS_SIM_HOME) settings.simHome = process.env.CBS_SIM_HOME;

async function saveSettings(next) {
  settings = { ...settings, ...next };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2) + "\n");
}

/* ── helpers ───────────────────────────────────────────────────────────────── */

class HttpError extends Error {
  constructor(code, message, extra) { super(message); this.code = code; this.extra = extra; }
}

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function body(req) {
  let s = "";
  for await (const c of req) { s += c; if (s.length > 5e6) throw new HttpError(413, "Request too large"); }
  try { return s ? JSON.parse(s) : {}; } catch { throw new HttpError(400, "Invalid JSON body"); }
}

const LOCAL = ["127.0.0.1", "localhost", "[::1]"];

/**
 * Browsers send Origin on cross-site requests : only the console itself may call the API.
 * The Host check blocks DNS-rebinding pages that resolve their own name to 127.0.0.1.
 */
function sameOrigin(req) {
  const host = (req.headers.host || "").replace(/:\d+$/, "");
  if (HOST === "127.0.0.1" && !LOCAL.includes(host)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin);
    return LOCAL.includes(o.hostname);
  } catch { return false; }
}

async function requireHome() {
  const err = await sim.validateHome(settings.simHome);
  if (err) throw new HttpError(412, err);
  return sim.paths(settings.simHome);
}

async function admin(pathname, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(settings.adminUrl.replace(/\/+$/, "") + pathname, { ...init, signal: ctl.signal });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  } finally {
    clearTimeout(t);
  }
}

/* ── operation lock + activity log ─────────────────────────────────────────── */

let op = null;            // { name, startedAt, log: [] }
const activity = [];      // finished operations / applies, newest last

function record(entry) {
  activity.push({ id: Date.now() + Math.random(), at: Date.now(), ...entry });
  if (activity.length > 100) activity.shift();
}

async function exclusive(name, fn) {
  if (op) throw new HttpError(409, `"${op.name}" is already running - wait for it to finish`);
  op = { name, startedAt: Date.now(), log: [] };
  const log = (text, type = "info") => op.log.push({ at: Date.now(), text, type });
  try {
    const result = await fn(log);
    if (name !== "apply" || result === false) record({ kind: "op", name, ok: result !== false, log: op.log });
    return { ok: result !== false, log: op.log };
  } catch (e) {
    log(e.message, "error");
    record({ kind: "op", name, ok: false, log: op.log });
    throw new HttpError(e instanceof HttpError ? e.code : 500, e.message, { log: op.log });
  } finally {
    op = null;
  }
}

/* ── config ────────────────────────────────────────────────────────────────── */

const FILES = ["setenv", "cdci", "financial"];

async function readConfig(p) {
  const out = {};
  for (const f of FILES) {
    const text = await fs.readFile(p[f], "utf8");
    out[f] = {
      path: p[f],
      hash: sha(text),
      entries: f === "setenv" ? parseEnv(text) : parseProps(text),
    };
  }
  return out;
}

async function backup(p, files) {
  const dir = path.join(p.home, "cfg", ".console-backup", new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(dir, { recursive: true });
  for (const f of files) await fs.copyFile(p[f], path.join(dir, path.basename(p[f])));
  // keep the 30 most recent backups
  const root = path.dirname(dir);
  const all = (await fs.readdir(root)).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 30))) await fs.rm(path.join(root, old), { recursive: true, force: true });
  return dir;
}

/**
 * body: { base: {setenv: hash, ...}, setenv: {KEY: value}, cdci: {set, remove, labels},
 *         financial: {set, remove, labels}, live: true }
 * Writes the files (after a backup), then - if live and the simulator is running - hot-reloads
 * the affected transaction managers through the simulator admin API.
 */
async function apply(req) {
  const p = await requireHome();
  const changes = {
    setenv: req.setenv && Object.keys(req.setenv).length ? req.setenv : null,
    cdci: req.cdci && (Object.keys(req.cdci.set || {}).length || (req.cdci.remove || []).length) ? req.cdci : null,
    financial: req.financial && (Object.keys(req.financial.set || {}).length || (req.financial.remove || []).length) ? req.financial : null,
  };
  const touched = FILES.filter((f) => changes[f]);
  if (!touched.length) throw new HttpError(400, "Nothing to apply");

  for (const [k, v] of Object.entries(changes.setenv || {})) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw new HttpError(400, `Invalid variable name ${k}`);
    if (/[\n\r]/.test(String(v))) throw new HttpError(400, `${k}: value cannot contain a line break`);
  }
  for (const f of ["cdci", "financial"]) {
    for (const [k, v] of Object.entries(changes[f]?.set || {})) {
      if (!k.trim() || /[\s=#!]/.test(k)) throw new HttpError(400, `${f}: invalid key "${k}"`);
      if (/[\n\r]/.test(String(v))) throw new HttpError(400, `${f}: ${k} value cannot contain a line break`);
    }
  }

  return exclusive("apply", async (log) => {
    const texts = {};
    for (const f of touched) {
      texts[f] = await fs.readFile(p[f], "utf8");
      if (req.base?.[f] && req.base[f] !== sha(texts[f]))
        throw new HttpError(409, `${path.basename(p[f])} was changed on disk since it was loaded - reload and re-apply`);
    }
    const dir = await backup(p, touched);
    log(`Backup: ${path.relative(p.home, dir)}`, "info");
    for (const f of touched) {
      const next = f === "setenv" ? editEnv(texts[f], changes.setenv) : editProps(texts[f], changes[f]);
      await fs.writeFile(p[f] + ".tmp", next);
      await fs.rename(p[f] + ".tmp", p[f]);
      log(`Saved ${path.relative(p.home, p[f])}`, "ok");
    }

    const proc = await sim.findProcess(p.home);
    let reload = null;
    if (!req.live) {
      log("Saved only - the running simulator picks this up on the next restart", "info");
    } else if (!proc.running) {
      log("Simulator is stopped - changes apply when it starts", "info");
    } else {
      const files = ["cdci", "financial"].filter((f) => changes[f]).map((f) => path.relative(p.home, p[f]));
      try {
        reload = await admin("/admin/reload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ env: changes.setenv || {}, files }),
        });
        const results = reload.results || [];
        if (!results.length) log("No transaction manager uses these settings - nothing to reload", "warn");
        for (const r of results) {
          if (r.ok) log(`Hot-reloaded ${r.tm} -> config v${r.summary.version} (rebuilt ${r.summary.created}, kept ${r.summary.reused}, ${r.summary["in-flight-on-previous"]} txn(s) finishing on previous)`, "ok");
          else log(`Reload of ${r.tm} failed: ${r.error}`, "error");
        }
        if (results.some((r) => !r.ok)) return false;
      } catch (e) {
        log(`Live reload unavailable (${e.message}) - saved to disk, restart the simulator to apply`, "error");
        return false;
      }
    }
    record({ kind: "apply", files: touched, env: Object.keys(changes.setenv || {}), reload: reload?.results || null });
    return true;
  });
}

/* ── routes ────────────────────────────────────────────────────────────────── */

const routes = {
  "GET /api/health": async () => ({ ok: true, pid: process.pid, uptime: Math.round(process.uptime()) }),

  "GET /api/settings": async () => ({ ...settings, error: await sim.validateHome(settings.simHome), detectedJavaHome: await sim.detectJavaHome() }),

  "PUT /api/settings": async (req) => {
    const b = await body(req);
    const next = {};
    if (typeof b.simHome === "string") {
      const home = path.resolve(b.simHome.trim().replace(/^~(?=\/|$)/, process.env.HOME || "~"));
      const err = await sim.validateHome(home);
      if (err) throw new HttpError(400, err);
      next.simHome = home;
    }
    if (typeof b.javaHome === "string") {
      const jh = b.javaHome.trim();
      if (jh) {
        try { await fs.access(path.join(jh, "bin", "java")); } catch { throw new HttpError(400, `No bin/java under ${jh}`); }
      }
      next.javaHome = jh;
    }
    if (typeof b.adminUrl === "string") {
      try { new URL(b.adminUrl); } catch { throw new HttpError(400, "Admin URL is not a valid URL"); }
      next.adminUrl = b.adminUrl.trim();
    }
    await saveSettings(next);
    return { ...settings, error: await sim.validateHome(settings.simHome), detectedJavaHome: await sim.detectJavaHome() };
  },

  "GET /api/status": async () => {
    const homeError = await sim.validateHome(settings.simHome);
    const proc = homeError ? { running: false, pid: null } : await sim.findProcess(settings.simHome);
    let live = null, adminError = null;
    if (proc.running) {
      try { live = await admin("/admin/status"); } catch (e) { adminError = e.message; }
    }
    return { homeError, process: proc, live, adminError, busy: op ? { name: op.name, startedAt: op.startedAt, log: op.log } : null };
  },

  "GET /api/config": async () => readConfig(await requireHome()),

  "POST /api/config/apply": async (req) => apply(await body(req)),

  "POST /api/sim/start": async () => { const p = await requireHome(); return exclusive("start", async (log) => (await sim.start(p.home, log, settings)).running); },
  "POST /api/sim/stop": async () => { const p = await requireHome(); return exclusive("stop", (log) => sim.stop(p.home, log)); },
  "POST /api/sim/kill": async () => { const p = await requireHome(); return exclusive("force kill", (log) => sim.kill(p.home, log)); },
  "POST /api/sim/restart": async () => {
    const p = await requireHome();
    return exclusive("restart", async (log) => {
      if (!(await sim.stop(p.home, log))) return false;
      return (await sim.start(p.home, log, settings)).running;
    });
  },

  "GET /api/logs": async (req, url) => {
    const p = await requireHome();
    const lines = Math.min(5000, Math.max(10, Number(url.searchParams.get("lines")) || 400));
    return { path: p.log, ...(await sim.tail(p.log, lines)) };
  },

  "GET /api/activity": async () => activity.slice().reverse(),
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };

async function serveStatic(res, pathname) {
  let file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
  if (!file.startsWith(DIST)) return send(res, 403, { error: "Forbidden" });
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(DIST, "index.html");     // SPA fallback
  }
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    send(res, 404, { error: "UI not built - run `npm run build`, or use `npm run dev` during development" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/")) return serveStatic(res, url.pathname);
  if (!sameOrigin(req)) return send(res, 403, { error: "Cross-origin requests are not allowed" });
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: "Not found" });
  try {
    send(res, 200, await handler(req, url));
  } catch (e) {
    const code = e instanceof HttpError ? e.code : 500;
    if (code === 500) console.error(e);
    send(res, code, { error: e.message, ...(e.extra || {}) });
  }
});

server.on("error", (err) => {
  console.error(err.code === "EADDRINUSE" ? `Port ${PORT} is already in use` : err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`CBS Simulator Console  ->  http://${HOST}:${PORT}`);
  console.log(`Simulator install dir  :  ${settings.simHome || "(not set - choose it in Settings)"}`);
  console.log(`Simulator admin API    :  ${settings.adminUrl}`);
});
