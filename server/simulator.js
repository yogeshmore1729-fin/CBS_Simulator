/**
 * Simulator process control.
 *
 * The NPCI simulator runs the same simulator-service jar, so a process is only ours if
 * its working directory is the configured install dir (same rule as bin/q2 and
 * bin/restart.sh) - STOP / KILL can never hit another simulator.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { parseEnv } from "./files.js";

const JAR_RE = /simulator-service-[0-9.]+\.jar/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(file, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: 30000, ...opts }, (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) }));
  });
}

export function paths(simHome) {
  return {
    home: simHome,
    setenv: path.join(simHome, "bin", "setenv.sh"),
    start: path.join(simHome, "bin", "start"),
    stop: path.join(simHome, "bin", "stop"),
    cdci: path.join(simHome, "cfg", "cdci_rc.cfg"),
    financial: path.join(simHome, "cfg", "financial_rc.cfg"),
    log: path.join(simHome, "log", "simulator.log"),
    deploy: path.join(simHome, "deploy"),
  };
}

export async function validateHome(simHome) {
  if (!simHome) return "Simulator install directory is not set";
  const p = paths(simHome);
  const missing = [];
  for (const k of ["setenv", "start", "stop", "cdci", "financial"]) {
    try { await fs.access(p[k]); } catch { missing.push(path.relative(simHome, p[k])); }
  }
  return missing.length ? `Not a CBS simulator install dir (missing ${missing.join(", ")})` : null;
}

/** {running, pid, stale, startedAt} for the simulator started from simHome. */
export async function findProcess(simHome) {
  let real;
  try { real = await fs.realpath(simHome); } catch { return { running: false, pid: null }; }
  const r = await run("pgrep", ["-f", JAR_RE.source]);
  for (const pid of r.stdout.split("\n").map((s) => s.trim()).filter(Boolean)) {
    let cwd;
    try { cwd = await fs.readlink(`/proc/${pid}/cwd`); } catch { continue; }
    const deleted = cwd.endsWith(" (deleted)");
    if (cwd.replace(/ \(deleted\)$/, "") !== real) continue;
    let startedAt = null;
    try { startedAt = (await fs.stat(`/proc/${pid}`)).mtimeMs; } catch { /* gone */ }
    return { running: true, pid: Number(pid), stale: deleted, startedAt };
  }
  return { running: false, pid: null };
}

/** Newest JDK under /usr/lib/jvm (bin/q2 runs whatever `java` is on PATH; the simulator needs a recent one). */
export async function detectJavaHome() {
  let best = null;
  try {
    for (const d of await fs.readdir("/usr/lib/jvm")) {
      const m = d.match(/^(?:java|jdk|openjdk)-(?:1\.)?(\d+)/);
      if (!m) continue;
      try { await fs.access(path.join("/usr/lib/jvm", d, "bin", "java")); } catch { continue; }
      if (!best || Number(m[1]) > best.version) best = { version: Number(m[1]), home: path.join("/usr/lib/jvm", d) };
    }
  } catch { /* no /usr/lib/jvm */ }
  return best?.home || null;
}

/**
 * Environment for bin/start : variables exported by setenv.sh are removed so the
 * file is authoritative (setenv.sh uses ${KEY:-default}, an inherited value would win),
 * and the chosen JDK is put first on PATH.
 */
async function startEnv(setenvFile, javaHome) {
  const env = { ...process.env };
  try {
    for (const v of parseEnv(await fs.readFile(setenvFile, "utf8"))) delete env[v.key];
  } catch { /* start without */ }
  if (javaHome) {
    env.JAVA_HOME = javaHome;
    env.PATH = `${path.join(javaHome, "bin")}:${env.PATH || ""}`;
  }
  return env;
}

export async function start(simHome, log, { javaHome } = {}) {
  const p = paths(simHome);
  const before = await findProcess(simHome);
  if (before.running) { log(`Already running (PID ${before.pid})`, "warn"); return before; }
  const java = javaHome || (await detectJavaHome());
  log(`$ ${path.relative(simHome, p.start)}   (Java: ${java || "java on PATH"})`, "cmd");
  const child = spawn("bash", [p.start], { cwd: path.dirname(p.start), env: await startEnv(p.setenv, java), detached: true, stdio: "ignore" });
  child.unref();
  let s = { running: false };
  for (let i = 1; i <= 20 && !s.running; i++) {
    await sleep(500);
    s = await findProcess(simHome);
  }
  if (s.running) {
    // a JVM that cannot start (wrong Java, bad config) exits within a moment
    await sleep(3000);
    const again = await findProcess(simHome);
    if (again.running && again.pid === s.pid) { log(`Started, PID ${s.pid}`, "ok"); return again; }
  }
  log("The simulator did not stay up - last lines of the log:", "error");
  const t = await tail(p.log, 8);
  for (const l of t.lines || []) log(l, "error");
  return findProcess(simHome);
}

/** Graceful Q2 shutdown (bin/stop drops shutdown.xml in deploy/); waits for the JVM to exit. */
export async function stop(simHome, log, { timeoutMs = 60000 } = {}) {
  const p = paths(simHome);
  const s = await findProcess(simHome);
  if (!s.running) { log("Already stopped", "info"); return true; }
  log(`$ ${path.relative(simHome, p.stop)}   (graceful Q2 shutdown, PID ${s.pid})`, "cmd");
  const r = await run("bash", [p.stop], { cwd: path.dirname(p.stop) });
  if (r.code !== 0) log(`stop exited ${r.code}: ${r.stderr.trim()}`, "warn");
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    await sleep(1000);
    if (!(await findProcess(simHome)).running) { log("Stopped", "ok"); return true; }
  }
  log(`Still running after ${timeoutMs / 1000} s - use Force kill`, "error");
  return false;
}

export async function kill(simHome, log) {
  const s = await findProcess(simHome);
  if (!s.running) { log("Already stopped", "info"); return true; }
  log(`$ kill -9 ${s.pid}`, "cmd");
  try { process.kill(s.pid, "SIGKILL"); } catch (e) { log(e.message, "error"); }
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    if (!(await findProcess(simHome)).running) {
      await fs.rm(path.join(simHome, "simulator.pid"), { force: true });
      log("Killed", "ok");
      return true;
    }
  }
  log("Process still alive after SIGKILL", "error");
  return false;
}

/** Last `lines` lines of a (possibly large) file, read from the end. */
export async function tail(file, lines = 400) {
  let fh;
  try { fh = await fs.open(file, "r"); } catch (e) { return { lines: [], error: e.message }; }
  try {
    const { size } = await fh.stat();
    const chunk = 64 * 1024;
    let pos = size, data = "", count = 0;
    while (pos > 0 && count <= lines) {
      const len = Math.min(chunk, pos);
      pos -= len;
      const buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, pos);
      data = buf.toString("utf8") + data;
      count = data.split("\n").length - 1;
      if (data.length > 8 * 1024 * 1024) break;
    }
    const all = data.split("\n");
    if (all[all.length - 1] === "") all.pop();
    return { lines: all.slice(-lines), size };
  } finally {
    await fh.close();
  }
}
