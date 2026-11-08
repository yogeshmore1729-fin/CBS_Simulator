import { useState } from "react";
import { api, connection } from "../api.js";
import { Button, Card, Input, OpLog, Select } from "../ui.jsx";

export default function SettingsView({ onSaved, theme, setTheme, notify }) {
  const [url, setUrl] = useState(connection.url || "http://127.0.0.1:7099");
  const [token, setToken] = useState(connection.token);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const test = async () => {
    setTesting(true);
    const log = [];
    const add = (text, type) => log.push({ at: Date.now(), text, type });
    const opts = { url: url.trim().replace(/\/+$/, ""), token: token.trim() };
    try {
      const h = await api.health(opts);
      add(`Reached ${opts.url} (API v${h.version}, token ${h.authRequired ? "required" : "not required"})`, "ok");
      const s = await api.status(opts);
      add(`Authorized - simulator PID ${s.pid}, ${s.tms.length} hot-reload transaction managers, Java ${s.java}`, "ok");
      add(`Install dir: ${s.home}`, "info");
      setResult({ ok: true, log });
    } catch (e) {
      add(e.message, "error");
      if (e.kind === "unauthorized") add("Check the token: it must match CBS_ADMIN_TOKEN on the simulator.", "warn");
      if (e.kind === "unreachable") add("Check the simulator is running, the URL / port, firewall, and (for https) that this browser trusts the certificate - open the URL once to accept a self-signed one.", "warn");
      setResult({ ok: false, log });
    }
    setTesting(false);
  };

  const save = (e) => {
    e.preventDefault();
    connection.save(url, token);
    onSaved();
    notify("Connection saved", "ok");
  };

  return (
    <div className="view view-narrow">
      <Card title="Simulator connection" desc="This page is static: it calls the REST API built into the CBS simulator. The URL and token are stored only in this browser.">
        <form onSubmit={save} className="form">
          <label className="form-field">
            <span>Simulator API URL</span>
            <Input value={url} onChange={setUrl} placeholder="https://sim-host:7099" />
            <small className="muted">Host and port of the simulator's ConfigAdminServer (CBS_ADMIN_HOST / CBS_ADMIN_PORT, default 7099).</small>
          </label>
          <label className="form-field">
            <span>API token</span>
            <div className="inline-form">
              <Input value={token} onChange={setToken} type={show ? "text" : "password"} placeholder="CBS_ADMIN_TOKEN" className="grow" autoComplete="off" />
              <Button type="button" size="sm" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</Button>
            </div>
          </label>
          <div className="btn-row">
            <Button type="button" onClick={test} disabled={testing || !url.trim()}>{testing ? "Testing…" : "Test connection"}</Button>
            <Button variant="primary" type="submit" disabled={!url.trim()}>Save</Button>
          </div>
          {result && <OpLog entries={result.log} />}
        </form>
      </Card>

      <Card title="Simulator setup" desc="One-time, on the simulator machine (details in the README).">
        <pre className="logbox mono small" style={{ minHeight: 0 }}>{`cd <install-dir>                 # …/build/install/simulator-service
bin/console-setup.sh             # creates token + https certificate in ~/.cbs-simulator
bin/restart.sh                   # or build.sh - the simulator reads them at start

# printed by console-setup.sh:
#   Simulator API URL : https://<simulator-ip>:7099
#   API token         : <token>
# then open https://<simulator-ip>:7099/api/health once and accept the certificate.
# This page's origin must be in CBS_ADMIN_CORS_ORIGINS (bin/setenv.sh): ${location.origin}`}</pre>
      </Card>

      <Card title="Appearance">
        <label className="form-field">
          <span>Theme</span>
          <Select value={theme} onChange={setTheme} options={[{ value: "system", label: "Match system" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        </label>
      </Card>
    </div>
  );
}
