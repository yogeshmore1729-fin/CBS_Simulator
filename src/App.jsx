import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { changeList, emptyDraft, isDirty, setValue, toPayload } from "./draft.js";
import { KNOWN_ENV, txnName } from "./meta.js";
import { Badge, Button, Dot, Modal, OpLog, Spinner } from "./ui.jsx";
import Dashboard from "./views/Dashboard.jsx";
import EnvView from "./views/EnvView.jsx";
import CdciView from "./views/CdciView.jsx";
import FinancialView from "./views/FinancialView.jsx";
import LogsView from "./views/LogsView.jsx";
import SettingsView from "./views/SettingsView.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "◉" },
  { id: "env", label: "Responses & behaviour", icon: "⚙", file: "setenv" },
  { id: "cdci", label: "RC distribution", icon: "▦", file: "cdci" },
  { id: "financial", label: "Account mappings", icon: "☰", file: "financial" },
  { id: "logs", label: "Logs", icon: "≡" },
  { id: "settings", label: "Settings", icon: "⚒" },
];
const FILE_NAMES = { setenv: "setenv.sh", cdci: "cdci_rc.cfg", financial: "financial_rc.cfg" };

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("cbs-theme") || "system");
  useEffect(() => {
    localStorage.setItem("cbs-theme", theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => { document.documentElement.dataset.theme = theme === "system" ? (mq.matches ? "dark" : "light") : theme; };
    applyTheme();
    mq.addEventListener("change", applyTheme);
    return () => mq.removeEventListener("change", applyTheme);
  }, [theme]);
  return [theme, setTheme];
}

function describe(c) {
  if (c.file === "setenv") return KNOWN_ENV.get(c.key)?.label || c.key;
  const m = c.key.match(/^(\d{6})\.(.+)$/);
  if (m) return `${txnName(m[1])} · ${m[2]}`;
  if (/^\d{3}$/.test(c.key)) return `Random bucket ${c.key}`;
  return c.key;
}

function ReviewModal({ draft, config, status, onClose, onApplied, notify }) {
  const changes = changeList(draft, config);
  const running = !!status?.process?.running;
  const live = status?.live;
  const hotKeys = new Set(Object.keys(live?.env || {}));
  const restartOnly = changes.filter((c) => c.file === "setenv" && live && !hotKeys.has(c.key));
  const [phase, setPhase] = useState("review"); // review | applying | done
  const [result, setResult] = useState(null);

  const go = async (liveMode) => {
    setPhase("applying");
    try {
      const r = await api.apply(toPayload(draft, config, liveMode));
      setResult({ ok: r.ok, log: r.log });
      notify(r.ok ? (liveMode && running && live ? "Changes applied live" : "Changes saved") : "Saved, but the live reload did not complete - see details", r.ok ? "ok" : "warn");
      onApplied(true);
    } catch (e) {
      // nothing was written (validation error or the file changed on disk) : keep the edits
      setResult({ ok: false, log: e.data?.log || [{ at: Date.now(), text: e.message, type: "error" }], conflict: e.status === 409 });
      onApplied(false);
    }
    setPhase("done");
  };

  if (phase !== "review") {
    return (
      <Modal title={phase === "applying" ? "Applying…" : result?.ok ? "Done" : "Finished with problems"} onClose={phase === "done" ? onClose : undefined}
        footer={phase === "done" && <Button variant="primary" onClick={onClose}>Close</Button>}>
        {phase === "applying" ? <div className="center"><Spinner /></div> : <OpLog entries={result?.log} />}
        {result?.conflict && <p className="note note-warn">The file changed on disk. The console reloaded it; review your edits and apply again.</p>}
      </Modal>
    );
  }

  return (
    <Modal
      wide
      title={`Review ${changes.length} change${changes.length > 1 ? "s" : ""}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Keep editing</Button>
          <Button onClick={() => go(false)} title="Write the files only; the running simulator keeps its current config until it restarts">Save to disk only</Button>
          <Button variant="primary" onClick={() => go(true)}>
            {running && live ? "Apply live" : running ? "Save (restart needed)" : "Save (applies on start)"}
          </Button>
        </>
      }
    >
      {running && live && (
        <p className="note note-info">
          <b>Apply live</b> saves the files and hot-reloads the affected transaction managers in the running simulator.
          Transactions already in progress finish on their current configuration; new ones use the new one. Nothing is restarted.
        </p>
      )}
      {running && !live && <p className="note note-warn">The running simulator has no live-config API, so changes are saved and take effect after a restart.</p>}
      {restartOnly.length > 0 && (
        <p className="note note-warn">{restartOnly.length} startup setting{restartOnly.length > 1 ? "s" : ""} ({restartOnly.map((c) => c.key).join(", ")}) will only take effect after a restart.</p>
      )}
      {["setenv", "cdci", "financial"].map((file) => {
        const list = changes.filter((c) => c.file === file);
        if (!list.length) return null;
        return (
          <div key={file} className="review-group">
            <h4 className="mono">{FILE_NAMES[file]}</h4>
            <table className="table table-compact">
              <tbody>
                {list.map((c) => (
                  <tr key={c.key}>
                    <td>{describe(c)}<div className="muted mono small">{c.key}</div></td>
                    <td className="mono small diff-from">{c.from === undefined ? <Badge tone="info">new</Badge> : c.from === "" ? <i className="muted">(empty)</i> : c.from}</td>
                    <td className="muted">→</td>
                    <td className="mono small diff-to">{c.to === null ? <Badge tone="bad">removed</Badge> : c.to === "" ? <i className="muted">(empty)</i> : c.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </Modal>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [view, setView] = useState(() => (location.hash.slice(1) && NAV.some((n) => n.id === location.hash.slice(1)) ? location.hash.slice(1) : "dashboard"));
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [serverDown, setServerDown] = useState(false);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [review, setReview] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [opResult, setOpResult] = useState(null);
  const configRef = useRef(null);
  useEffect(() => { configRef.current = config; }, [config]);

  const notify = useCallback((text, tone = "info") => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "bad" ? 8000 : 4000);
  }, []);

  const goto = (id) => { setView(id); history.replaceState(null, "", `#${id}`); };

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.status());
      setServerDown(false);
    } catch (e) {
      if (e.status === 0) setServerDown(true);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await api.config());
      setConfigError(null);
    } catch (e) {
      setConfigError(e.message);
    }
  }, []);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => setServerDown(true));
    const first = setTimeout(() => { refreshStatus(); loadConfig(); }, 0);
    const t = setInterval(refreshStatus, 3000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [refreshStatus, loadConfig]);

  const dirty = isDirty(draft);
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setProp = useCallback((file, key, value) => setDraft((d) => setValue(d, configRef.current, file, key, value)), []);
  const setEnv = useCallback((key, value) => setProp("setenv", key, value), [setProp]);
  const setLabel = useCallback((key, label) => setDraft((d) => ({ ...d, labels: { ...d.labels, [key]: label } })), []);

  const runOp = async (action) => {
    setTimeout(refreshStatus, 300);
    try {
      const r = await api.sim(action);
      setOpResult({ name: action, log: r.log });
      notify(`${action[0].toUpperCase() + action.slice(1)} ${r.ok ? "completed" : "did not complete"}`, r.ok ? "ok" : "warn");
    } catch (e) {
      setOpResult({ name: action, log: e.data?.log || [{ at: Date.now(), text: e.message, type: "error" }] });
      notify(e.message, "bad");
    }
    refreshStatus();
  };

  const counts = useMemo(() => ({
    setenv: Object.keys(draft.setenv).length,
    cdci: Object.keys(draft.cdci).length,
    financial: Object.keys(draft.financial).length,
  }), [draft]);
  const total = counts.setenv + counts.cdci + counts.financial;

  const proc = status?.process;
  const headerTone = serverDown ? "bad" : status?.busy ? "warn" : proc?.running ? "ok" : "bad";
  const headerText = serverDown ? "Console server offline" : status?.busy ? `${status.busy.name}…` : proc?.running ? `Running · PID ${proc.pid}` : status?.homeError ? "Not configured" : "Stopped";

  const needsConfig = ["env", "cdci", "financial"].includes(view);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CBS</span>
          <div>
            <div className="brand-title">CBS Simulator</div>
            <div className="brand-sub">Console</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item${view === n.id ? " is-active" : ""}`} onClick={() => goto(n.id)}>
              <span className="nav-icon" aria-hidden>{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {n.file && counts[n.file] > 0 && <span className="nav-count" title="Unsaved changes">{counts[n.file]}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="status-pill"><Dot tone={headerTone} /> {headerText}</div>
          {status?.live && <div className="muted small">Live config API connected</div>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{NAV.find((n) => n.id === view)?.label}</h1>
          <div className="topbar-actions">
            {needsConfig && config && <Button size="sm" onClick={() => { if (!dirty || confirm("Discard unsaved changes and reload the files from disk?")) { setDraft(emptyDraft()); loadConfig(); } }}>Reload from disk</Button>}
          </div>
        </header>

        {serverDown && (
          <div className="banner banner-bad">
            The console server is not reachable. Start it with <code>npm run server</code> (or <code>npm start</code>), then this page reconnects automatically.
          </div>
        )}

        <div className="content">
          {view === "dashboard" && <Dashboard status={status} runOp={runOp} opResult={opResult} goto={goto} settings={settings} />}
          {needsConfig && !config && (
            <div className="view">{configError
              ? <div className="banner banner-warn">{configError} <Button size="sm" onClick={() => (status?.homeError ? goto("settings") : loadConfig())}>{status?.homeError ? "Open settings" : "Retry"}</Button></div>
              : <div className="center"><Spinner /></div>}</div>
          )}
          {view === "env" && config && <EnvView config={config} draft={draft} setEnv={setEnv} live={status?.live} />}
          {view === "cdci" && config && <CdciView config={config} draft={draft} setProp={setProp} />}
          {view === "financial" && config && <FinancialView config={config} draft={draft} setProp={setProp} setLabel={setLabel} />}
          {view === "logs" && <LogsView />}
          {view === "settings" && settings && (
            <SettingsView settings={settings} theme={theme} setTheme={setTheme} notify={notify}
              onSaved={(s) => { setSettings(s); setDraft(emptyDraft()); refreshStatus(); loadConfig(); }} />
          )}
        </div>

        {dirty && (
          <div className="applybar" role="region" aria-label="Unsaved changes">
            <span className="applybar-dot" />
            <span>
              <b>{total} unsaved change{total > 1 ? "s" : ""}</b>
              <span className="muted"> · {Object.entries(counts).filter(([, n]) => n).map(([f]) => FILE_NAMES[f]).join(", ")}</span>
            </span>
            <div className="applybar-actions">
              <Button onClick={() => confirm("Discard all unsaved changes?") && setDraft(emptyDraft())}>Discard</Button>
              <Button variant="primary" onClick={() => setReview(true)}>Review &amp; apply</Button>
            </div>
          </div>
        )}
      </main>

      {review && config && (
        <ReviewModal
          draft={draft}
          config={config}
          status={status}
          notify={notify}
          onClose={() => setReview(false)}
          onApplied={async (written) => { if (written) setDraft(emptyDraft()); await loadConfig(); refreshStatus(); }}
        />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>)}
      </div>
    </div>
  );
}
