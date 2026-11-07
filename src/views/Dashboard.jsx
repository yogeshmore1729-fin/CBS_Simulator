import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Card, Confirm, Dot, Empty, OpLog } from "../ui.jsx";
import { formatDuration } from "../format.js";

const CBS_TMS = ["cdci", "cdci-http"];
const FILE_NAMES = { setenv: "setenv.sh", cdci: "cdci_rc.cfg", financial: "financial_rc.cfg" };

export default function Dashboard({ status, runOp, opResult, goto, settings }) {
  const [confirm, setConfirm] = useState(null);
  const [activity, setActivity] = useState([]);
  const proc = status?.process;
  const live = status?.live;
  const busy = status?.busy;
  const running = !!proc?.running;

  useEffect(() => {
    let alive = true;
    const load = () => api.activity().then((a) => alive && setActivity(a)).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (status?.homeError) {
    return (
      <Empty title="Choose the simulator install directory" action={<Button variant="primary" onClick={() => goto("settings")}>Open settings</Button>}>
        {status.homeError}. Point the console at the simulator-service install dir (the one containing bin/start and cfg/).
      </Empty>
    );
  }

  const state = busy ? busy.name.toUpperCase() + "…" : running ? "RUNNING" : proc ? "STOPPED" : "…";
  const tone = busy ? "warn" : running ? "ok" : "bad";
  const tms = (live?.tms || []).slice().sort((a, b) => (CBS_TMS.indexOf(b.name) >= 0) - (CBS_TMS.indexOf(a.name) >= 0) || a.name.localeCompare(b.name));
  const reloaded = tms.filter((t) => t.version > 1);
  const inFlightOld = tms.reduce((n, t) => n + Object.entries(t.inFlight || {}).filter(([v]) => Number(v) !== t.version).reduce((s, [, c]) => s + c, 0), 0);
  const overrides = Object.entries(live?.overrides || {});
  const ask = (action, title, message, danger) => setConfirm({ action, title, message, danger });

  return (
    <div className="view">
      <div className="grid-2">
        <Card className="status-card">
          <div className="status-hero">
            <span className={`status-orb orb-${tone}${running || busy ? " pulse" : ""}`} />
            <div>
              <div className={`status-state tone-${tone}`}>{state}</div>
              <div className="muted mono small">{settings?.simHome}</div>
            </div>
          </div>
          <dl className="facts">
            <div><dt>PID</dt><dd className="mono">{proc?.pid ?? "—"}</dd></div>
            <div><dt>Uptime</dt><dd>{running && live ? formatDuration(live.uptimeMs) : running && proc?.startedAt ? `since ${new Date(proc.startedAt).toLocaleTimeString("en-GB", { hour12: false })}` : "—"}</dd></div>
            <div><dt>Live config API</dt><dd>{!running ? "—" : live ? <Badge tone="ok">connected</Badge> : <Badge tone="bad" title={status?.adminError}>unavailable</Badge>}</dd></div>
          </dl>
          {proc?.stale && (
            <p className="note note-warn">This process runs from a build directory that was deleted or rebuilt. Restart it to pick up the new build.</p>
          )}
          {running && !live && (
            <p className="note note-warn">
              The simulator is running but its live-config API ({settings?.adminUrl}) does not answer: {status?.adminError}.
              It was probably started from a build without the hot-reload support - changes will be saved to disk and need a restart.
            </p>
          )}
          <div className="btn-row">
            <Button variant="primary" icon="▶" disabled={!!busy || running} onClick={() => runOp("start")}>Start</Button>
            <Button icon="■" disabled={!!busy || !running} onClick={() => ask("stop", "Stop the simulator?", "Q2 shuts down gracefully. Transactions in flight are interrupted.")}>Stop</Button>
            <Button icon="↻" disabled={!!busy || !running} onClick={() => ask("restart", "Restart the simulator?", "Restarting interrupts transactions in flight. To change settings without interrupting anything, use Apply live instead.")}>Restart</Button>
            <Button variant="danger-ghost" icon="✕" disabled={!!busy || !running} onClick={() => ask("kill", "Force kill the simulator?", "Sends SIGKILL to the simulator process. Use only if a graceful stop does not finish.", true)}>Force kill</Button>
          </div>
        </Card>

        <Card title="Live configuration" desc="Settings are applied to the running simulator without a restart. Transactions already in progress finish on the configuration they started with.">
          {!running ? (
            <p className="muted">Start the simulator to see its live configuration.</p>
          ) : !live ? (
            <p className="muted">Live configuration is not available for this process.</p>
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
        <Card title="Operation output" desc={busy ? `${busy.name} in progress…` : opResult ? `Last: ${opResult.name}` : "Output of start / stop / apply operations"}>
          <OpLog entries={busy?.log || opResult?.log} empty="Run an operation to see its output here." />
        </Card>
        <Card title="Recent activity">
          {activity.length === 0 ? <p className="muted">Nothing yet in this console session.</p> : (
            <ul className="activity">
              {activity.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <Dot tone={a.kind === "apply" ? "info" : a.ok ? "ok" : "bad"} />
                  <span className="activity-text">
                    {a.kind === "apply"
                      ? <>Applied changes to <b>{a.files.map((f) => FILE_NAMES[f] || f).join(", ")}</b>{a.reload ? <> · hot-reloaded {a.reload.filter((r) => r.ok).map((r) => r.tm).join(", ") || "nothing"}</> : " · saved only"}</>
                      : <><b>{a.name}</b> {a.ok ? "completed" : "failed"}</>}
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
          danger={confirm.danger}
          confirmLabel={confirm.action === "kill" ? "Force kill" : confirm.action[0].toUpperCase() + confirm.action.slice(1)}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const a = confirm.action; setConfirm(null); runOp(a); }}
        />
      )}
    </div>
  );
}
