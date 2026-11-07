import { useMemo, useState } from "react";
import { ENV_GROUPS, KNOWN_ENV } from "../meta.js";
import { current } from "../draft.js";
import { Badge, Card, Input, ListInput, Toggle } from "../ui.jsx";

const isTrue = (v) => String(v).trim().toLowerCase() === "true";

function FieldEditor({ meta, value, onChange, dirty, disabled }) {
  switch (meta.type) {
    case "bool":
      return <Toggle checked={isTrue(value)} onChange={(c) => onChange(c ? "true" : "false")} label={isTrue(value) ? "On" : "Off"} disabled={disabled} />;
    case "accounts":
      return <ListInput value={value} onChange={onChange} dirty={dirty} placeholder={meta.hint || "Add value and press Enter"} />;
    case "accountsWrapped":
      return <ListInput value={value} onChange={onChange} wrapped dirty={dirty} placeholder="Add account number and press Enter" />;
    case "number":
      return <Input value={value} onChange={(v) => onChange(v.replace(/[^0-9]/g, ""))} dirty={dirty} inputMode="numeric" placeholder={meta.hint} />;
    default:
      return <Input value={value} onChange={onChange} dirty={dirty} placeholder={meta.hint} />;
  }
}

export default function EnvView({ config, draft, setEnv, live }) {
  const [q, setQ] = useState("");
  const [showStartup, setShowStartup] = useState(false);
  const entries = useMemo(() => new Map((config.setenv.entries || []).map((e) => [e.key, e])), [config]);
  const liveEnv = live?.env || {};
  const hotKeys = live ? new Set(Object.keys(liveEnv)) : null;
  const match = (key, label) => !q || key.toLowerCase().includes(q.toLowerCase()) || (label || "").toLowerCase().includes(q.toLowerCase());

  const row = (meta) => {
    const e = entries.get(meta.key);
    const value = current(draft, config, "setenv", meta.key) ?? "";
    const dirty = meta.key in draft.setenv;
    const lv = liveEnv[meta.key];
    const liveVal = lv ? (lv.value ?? "") : null;
    const differs = lv && !dirty && liveVal !== value && !(meta.type === "bool" && isTrue(liveVal) === isTrue(value));
    const hot = hotKeys ? hotKeys.has(meta.key) : true;
    return (
      <div key={meta.key} className={`field${dirty ? " field-dirty" : ""}`}>
        <div className="field-label">
          <span>{meta.label}</span>
          <code className="field-key">{meta.key}</code>
          {!e && <Badge tone="info" title="Not in setenv.sh yet - it will be added">new</Badge>}
          {hotKeys && !hot && <Badge tone="warn" title="Not used by a hot-reload transaction manager - needs a restart">restart</Badge>}
          {e && !e.editable && <Badge tone="muted" title={`Shell expression in setenv.sh: ${e.value}`}>expression</Badge>}
        </div>
        <div className="field-control">
          {e && !e.editable
            ? <code className="mono muted">{e.value}</code>
            : <FieldEditor meta={meta} value={value} dirty={dirty} onChange={(v) => setEnv(meta.key, v)} />}
          {differs && (
            <span className="field-live" title={lv.source === "runtime" ? "Value applied live" : "Value the simulator was started with"}>
              running with <code>{liveVal === "" ? "(empty)" : liveVal}</code>
            </span>
          )}
        </div>
      </div>
    );
  };

  const startup = (config.setenv.entries || []).filter((e) => !KNOWN_ENV.has(e.key) && match(e.key, e.comment));

  return (
    <div className="view">
      <div className="toolbar">
        <Input value={q} onChange={setQ} mono={false} placeholder="Search settings…" className="search" />
        <span className="muted small">
          File: <code>{config.setenv.path}</code>
        </span>
      </div>

      <div className="masonry">
        {ENV_GROUPS.map((g) => {
          const fields = g.fields.map(([key]) => KNOWN_ENV.get(key)).filter((m) => match(m.key, m.label));
          if (!fields.length) return null;
          const bools = g.id === "random";
          return (
            <Card key={g.id} title={g.title} desc={g.desc} className={g.id === "legacy" ? "card-dim" : ""}>
              {bools ? (
                <div className="toggle-grid">
                  {fields.map((m) => {
                    const value = current(draft, config, "setenv", m.key) ?? "";
                    const dirty = m.key in draft.setenv;
                    return (
                      <div key={m.key} className={`toggle-cell${dirty ? " field-dirty" : ""}`} title={m.key}>
                        <Toggle checked={isTrue(value)} onChange={(c) => setEnv(m.key, c ? "true" : "false")} label={m.label} />
                      </div>
                    );
                  })}
                </div>
              ) : fields.map(row)}
            </Card>
          );
        })}
      </div>

      <Card
        title="Startup settings"
        desc="Other variables in setenv.sh (JVM, HSM, Redis, Mongo, …). They are read when the simulator starts, so changes need a restart."
        actions={<button className="link" onClick={() => setShowStartup((s) => !s)}>{showStartup || q ? "Hide" : `Show ${startup.length}`}</button>}
      >
        {(showStartup || q) && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Variable</th><th>Value</th><th>Note</th></tr></thead>
              <tbody>
                {startup.map((e) => {
                  const dirty = e.key in draft.setenv;
                  return (
                    <tr key={e.key}>
                      <td className="mono small">{e.key}</td>
                      <td style={{ minWidth: 260 }}>
                        {e.editable
                          ? <Input value={current(draft, config, "setenv", e.key) ?? ""} dirty={dirty} onChange={(v) => setEnv(e.key, v)} />
                          : <code className="mono muted small" title="Shell expression - edit setenv.sh directly">{e.value}</code>}
                      </td>
                      <td className="muted small">{e.comment}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
