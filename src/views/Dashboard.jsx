import { useEffect, useState } from "react";
import { api, connection } from "../api.js";
import { Badge, Button, Card, Confirm, Dot, Empty, OpLog } from "../ui.jsx";
import { formatDuration } from "../format.js";

const CBS_TMS = ["cdci", "cdci-http"];
const FILE_NAMES = { setenv: "setenv.sh", cdci: "cdci_rc.cfg", financial: "financial_rc.cfg" };

export default function Dashboard({ live, connErr, pending, runOp, opResult, goto }) {
  const [confirm, setConfirm] = useState(null);
  const [activity, setActivity] = useState([]);
  const online = !!live;                       // console API answers
  const sim = live?.simulator;                 // running | stopping | stopped | starting
  const running = sim === "running";

  useEffect(() => {
    if (!online) return undefined;
    let alive = true;
    const load = () => api.activity().then((a) => alive && setActivity(a)).catch(() => {});
    const first = setTimeout(load, 0);
    const t = setInterval(load, 5000);
    return () => { alive = false; clearTimeout(first); clearInterval(t); };
  }, [online]);

  if (connErr?.kind === "unconfigured") {
    return (
      <Empty title="Connect to a simulator" action={<Button variant="primary" onClick={() => goto("settings")}>Open settings</Button>}>
        Enter the URL and token of the simulator's REST API. The simulator must be built with ConfigAdminServer.
      </Empty>
    );
  }

  const busy = pending || (live?.busy ? live.busy : null);
  const state = busy ? `${String(busy).toUpperCase()}…` : online ? (sim || "running").toUpperCase() : connErr?.kind === "unreachable" ? "UNREACHABLE" : connErr ? "ERROR" : "…";
  const tone = busy ? "warn" : running ? "ok" : online ? "muted" : "bad";
  const tms = (live?.tms || []).slice().sort((a, b) => (CBS_TMS.indexOf(b.name) >= 0) - (CBS_TMS.indexOf(a.name) >= 0) || a.name.localeCompare(b.name));
  const reloaded = tms.filter((t) => t.version > 1);
  const inFlightOld = tms.reduce((n, t) => n + Object.entries(t.inFlight || {}).filter(([v]) => Number(v) !== t.version).reduce((s, [, c]) => s + c, 0), 0);
  const overrides = Object.entries(live?.overrides || {});
  const ask = (action, title, message) => setConfirm({ action, title, message });

  return (
    <div className="view">
      <div className="grid-2">
        <Card className="status-card">
          <div className="status-hero">
            <span className={`status-orb orb-${tone}${running || busy ? " pulse" : ""}`} />
            <div>
              <div className={`status-state tone-${tone}`}>{state}</div>
              <div className="muted mono small">{connection.url}</div>
            </div>
          </div>
          <dl className="facts">
            <div><dt>PID</dt><dd className="mono">{live?.pid ?? "—"}</dd></div>
            <div><dt>Uptime</dt><dd>{live ? formatDuration(live.uptimeMs) : "—"}</dd></div>
            <div><dt>Java</dt><dd className="mono">{live?.java ?? "—"}</dd></div>
          </dl>
          {live && <p className="muted mono small">{live.home}</p>}
          {online && sim === "stopped" && !busy && (
            <p className="note note-info">The simulator is stopped: it accepts no CBS traffic. The console stays connected - press <b>Start</b> to bring it back.</p>
          )}
          {connErr && connErr.kind !== "unconfigured" && (
            <p className={`note ${connErr.kind === "unreachable" ? "note-warn" : "note-bad"}`}>
              {connErr.message}
              {connErr.kind === "unreachable" && <> The simulator process (and its console API) is down - start it on its machine with <code>bin/start</code> (or <code>build.sh</code>); this page reconnects automatically.</>}
              {connErr.kind === "unauthorized" && <> <button className="link" onClick={() => goto("settings")}>Check the token in Settings</button>.</>}
            </p>
          )}
          <div className="btn-row">
            <Button variant="primary" icon="▶" disabled={!!busy || running || (online && sim !== "stopped")} onClick={() => runOp("start")}>Start</Button>
            <Button icon="■" disabled={!!busy || !running} onClick={() => ask("stop", "Stop the simulator?", "The CBS port closes, transactions in flight are allowed to finish (up to 30 s), then the transaction managers are undeployed. The console stays connected so you can Start it again from here.")}>Stop</Button>
            <Button icon="↻" disabled={!!busy || !running} onClick={() => ask("restart", "Restart the simulator?", "Stop (with drain) and Start inside the running process - the console stays connected. To change settings without interrupting anything, use Apply live instead.")}>Restart</Button>
            <Button variant="danger-ghost" icon="⟳" disabled={!!busy || !online} title="Restart the Java process - needed after a rebuild or a startup-setting change"
              onClick={() => ask("full-restart", "Full restart (JVM)?", "Restarts the whole simulator process with bin/console-restart.sh. Needed only after rebuilding the simulator or changing startup settings (JVM, Redis, CBS_ADMIN_*, …). The console disconnects for a few seconds and reconnects.")}>Full restart</Button>
          </div>
        </Card>

        <Card title="Live configuration" desc="Settings are applied to the running simulator without a restart. Transactions already in progress finish on the configuration they started with.">
          {!running ? (
            <p className="muted">{online ? "The simulator is not running." : "Connect to a running simulator to see its live configuration."}</p>
          ) : (
            <>
              <div className="stat-row">
                <div className="stat"><span className="stat-num">{tms.length}</span><span className="stat-lbl">hot-reload TMs</span></div>
                <div className="stat"><span className="stat-num">{reloaded.length}</span><span className="stat-lbl">reloaded since start</span></div>
                <div className="stat"><span className="stat-num">{overrides.length}</span><span className="stat-lbl">runtime overrides</span></div>
                <div className="stat"><span className={`stat-num${inFlightOld ? " tone-warn" : ""}`}>{inFlightOld}</span><span className="stat-lbl">txns on previous config</span></div>
              </div>
              <div className="table-wrap tm-table">
                <table className="table">
                  <thead><tr><th>Transaction manager</th><th>Config</th><th>In flight</th><th>Queue</th></tr></thead>
                  <tbody>
                    {tms.map((t) => {
                      const flights = Object.entries(t.inFlight || {}).filter(([, n]) => n > 0);
                      return (
                        <tr key={t.name} className={CBS_TMS.includes(t.name) ? "row-strong" : ""}>
                          <td className="mono">{t.name}</td>
                          <td>{t.version > 1 ? <Badge tone="info">v{t.version}</Badge> : <span className="muted">v1</span>}</td>
                          <td className="mono small">{flights.length ? flights.map(([v, n]) => `${n} on v${v}`).join(", ") : <span className="muted">idle</span>}</td>
                          <td className="mono small">{t.outstanding}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Operation output" desc={busy ? `${busy} in progress…` : opResult ? `Last: ${opResult.name}` : "Output of start / stop / restart / apply"}>
          <OpLog entries={opResult?.log} empty="Run an operation to see its output here." />
        </Card>
        <Card title="Recent activity" desc="Since the simulator started">
          {activity.length === 0 ? <p className="muted">Nothing yet.</p> : (
            <ul className="activity">
              {activity.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <Dot tone={a.kind === "apply" ? "info" : a.ok ? "ok" : "bad"} />
                  <span className="activity-text">
                    {a.kind === "apply"
                      ? <>Applied changes to <b>{a.files.map((f) => FILE_NAMES[f] || f).join(", ")}</b>{a.reload ? (a.reload.some((r) => r.ok) ? <> · hot-reloaded {a.reload.filter((r) => r.ok).map((r) => r.tm).join(", ")}</> : " · saved (nothing running to reload)") : " · saved only"}</>
                      : <><b>{a.name}</b> {a.ok ? (a.name === "full restart" ? "requested" : "completed") : "failed"}</>}
                  </span>
                  <span className="muted small">{new Date(a.at).toLocaleTimeString("en-GB", { hour12: false })}</span>
                </li>
              ))}
            </ul>
          )}
          {overrides.length > 0 && (
            <>
              <h4 className="subhead">Runtime overrides (live, also saved in setenv.sh)</h4>
              <div className="kv mono small">
                {overrides.map(([k, v]) => <div key={k}><span>{k}</span><span>{v === "" ? <i className="muted">(unset)</i> : v}</span></div>)}
              </div>
            </>
          )}
        </Card>
      </div>

      {confirm && (
        <Confirm
          title={confirm.title}
          message={confirm.message}
          confirmLabel={{ stop: "Stop", restart: "Restart", "full-restart": "Full restart" }[confirm.action]}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const a = confirm.action; setConfirm(null); runOp(a); }}
        />
      )}
    </div>
  );
}
