/**
 * CBS Simulator — Command Execution Server
 * Run:  node server.js
 * Port: http://127.0.0.1:3001
 */

import http from "http";
import { exec } from "child_process";

const HOST = "127.0.0.1";
const PORT = 3001;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, code, data) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function runCmd(cmd) {
  return new Promise((resolve) => {
    console.log("[exec]", cmd);
    exec(cmd, { shell: "/bin/bash", timeout: 30000, env: { ...process.env } },
      (error, stdout, stderr) => {
        const exitCode = error ? (error.code ?? 1) : 0;
        console.log(`[done] exit=${exitCode}` + (stdout.trim() ? `  out: ${stdout.trim().substring(0, 200)}` : ""));
        resolve({ stdout: stdout || "", stderr: stderr || "", exitCode });
      }
    );
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data",  chunk => { body += chunk; });
    req.on("end",   ()    => { try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }

  if (method === "GET" && url === "/health") {
    return json(res, 200, { status: "ok", pid: process.pid, uptime: Math.round(process.uptime()) });
  }

  if (method === "GET" && url.startsWith("/readfile")) {
    const raw  = url.includes("?path=") ? decodeURIComponent(url.split("?path=")[1]) : "";
    const path = raw.trim();
    if (!path) return json(res, 400, { error: "path query param required" });
    const fs = await import("fs/promises");
    try {
      const content = await fs.readFile(path, "utf8");
      const lines   = content.split("\n");
      cors(res);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ content, lines, lineCount: lines.length, size: Buffer.byteLength(content) }));
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
    return;
  }

  if (method === "POST" && url === "/writefile") {
    const body = await readBody(req).catch(() => ({}));
    const path    = (body.path    || "").trim();
    const content = body.content ?? null;
    if (!path)             return json(res, 400, { error: "path is required" });
    if (content === null)  return json(res, 400, { error: "content is required" });
    const fs = await import("fs/promises");
    const pathMod = await import("path");
    try {
      // Ensure parent directory exists
      await fs.mkdir(pathMod.dirname(path), { recursive: true });
      await fs.writeFile(path, content, "utf8");
      const stat = await fs.stat(path);
      return json(res, 200, { ok: true, path, size: stat.size });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (method === "POST" && url === "/exec") {
    const body = await readBody(req).catch(() => ({}));
    const cmd  = (body.cmd || "").trim();
    if (!cmd) return json(res, 400, { error: "cmd is required" });

    const blocked = [/\brm\s+-rf\s+\//, /\bmkfs\b/, /\bdd\s+.*of=\/dev\//];
    if (blocked.some(re => re.test(cmd)))
      return json(res, 403, { error: "Command blocked", stdout: "", stderr: "", exitCode: 1 });

    const result = await runCmd(cmd);
    return json(res, 200, result);
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log("─────────────────────────────────────────");
  console.log("  CBS Simulator Command Server");
  console.log(`  http://${HOST}:${PORT}`);
  console.log("  GET  /health");
  console.log("  POST /exec  { cmd: '...' }");
  console.log("─────────────────────────────────────────");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE")
    console.error(`\n  ERROR: Port ${PORT} already in use. Kill the other process first.\n`);
  else
    console.error("  Server error:", err);
  process.exit(1);
});
