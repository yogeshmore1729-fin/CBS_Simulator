import { useState } from "react";
import { effectiveEntries } from "../draft.js";
import { formatRcValue, parseRcValue, rcTone } from "../meta.js";
import { Badge, Button, Card, Input, Toggle } from "../ui.jsx";

const BUCKET = /^\d{3}$/;
const outcomeKey = (p) => `${p.rc || "?"}${p.hold ? " · held" : ""}${p.delay && p.delay !== "0" ? ` · ${p.delay}ms` : ""}`;

export default function CdciView({ config, draft, setProp }) {
  const entries = effectiveEntries(draft, config, "cdci");
  const buckets = entries.filter((e) => BUCKET.test(e.key)).sort((a, b) => a.key.localeCompare(b.key));
  const others = entries.filter((e) => !BUCKET.test(e.key));
  const [sel, setSel] = useState(new Set());
  const [anchor, setAnchor] = useState(null);
  const [form, setForm] = useState({ rc: "000", delay: "", hold: false });
  const [newKey, setNewKey] = useState("");

  const dist = new Map();
  for (const b of buckets) {
    const p = parseRcValue(b.value);
    const k = outcomeKey(p);
    dist.set(k, { label: k, tone: p.hold ? "hold" : rcTone(p.rc), count: (dist.get(k)?.count || 0) + 1 });
  }
  const distribution = [...dist.values()].sort((a, b) => b.count - a.count);

  const click = (key, e) => {
    const keys = buckets.map((b) => b.key);
    const next = new Set(e.metaKey || e.ctrlKey ? sel : []);
    if (e.shiftKey && anchor) {
      const [a, b] = [keys.indexOf(anchor), keys.indexOf(key)].sort((x, y) => x - y);
      keys.slice(a, b + 1).forEach((k) => next.add(k));
    } else if ((e.metaKey || e.ctrlKey) && sel.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      setAnchor(key);
    }
    setSel(next);
    if (next.size === 1) {
      const b = buckets.find((x) => x.key === [...next][0]);
      if (b) setForm(parseRcValue(b.value));
    }
  };

  const applyToSelection = () => {
    const value = formatRcValue(form, { compact: true });
    for (const k of sel) setProp("cdci", k, value);
  };

  return (
    <div className="view">
      <Card
        title="Random response distribution"
        desc="The simulator picks one of these 100 buckets at random, so each bucket is 1% of traffic. Value = RC, optional delay (ms) and hold (no response)."
      >
        <p className="note note-warn">
          The buckets are only used when the cdci participant has <code>use-random-rc-mapping=true</code>. The shipped
          10_cdci_txnmgr.xml does not set it, so transactions without an account mapping get RC 00. Changes here are still
          saved and hot-reloaded.
        </p>
        <div className="dist-bar" role="img" aria-label="Response distribution">
          {distribution.map((d) => (
            <span key={d.label} className={`dist-seg seg-${d.tone}`} style={{ flexGrow: d.count }} title={`${d.label}: ${d.count}%`} />
          ))}
        </div>
        <div className="dist-legend">
          {distribution.map((d) => (
            <span key={d.label} className="legend-item"><span className={`legend-swatch seg-${d.tone}`} />{d.label} <b>{d.count}%</b></span>
          ))}
        </div>

        <div className="bucket-layout">
          <div>
            <div className="bucket-grid" onMouseDown={(e) => e.shiftKey && e.preventDefault()}>
              {buckets.map((b) => {
                const p = parseRcValue(b.value);
                return (
                  <button
                    key={b.key}
                    className={`bucket seg-${p.hold ? "hold" : rcTone(p.rc)}${sel.has(b.key) ? " is-selected" : ""}${b.state !== "clean" ? " is-dirty" : ""}`}
                    onClick={(e) => click(b.key, e)}
                    title={`${b.key}: ${b.value}`}
                  >
                    <span className="bucket-key">{b.key}</span>
                    <span className="bucket-rc">{p.rc}</span>
                    {(p.hold || (p.delay && p.delay !== "0")) && <span className="bucket-flag">{p.hold ? "H" : "⏱"}</span>}
                  </button>
                );
              })}
            </div>
            <p className="muted small">Click a bucket, Shift+click to select a range, Ctrl/⌘+click to add or remove one.</p>
          </div>

          <div className="bucket-editor">
            <h4>{sel.size ? `${sel.size} bucket${sel.size > 1 ? "s" : ""} selected` : "Select buckets to edit"}</h4>
            <label className="form-row"><span>RC</span><Input value={form.rc} onChange={(v) => setForm({ ...form, rc: v.trim() })} disabled={!sel.size} /></label>
            <label className="form-row"><span>Delay (ms)</span><Input value={form.delay} onChange={(v) => setForm({ ...form, delay: v.replace(/[^0-9]/g, "") })} placeholder="none" disabled={!sel.size} /></label>
            <div className="form-row"><span>Hold response</span><Toggle checked={form.hold} onChange={(c) => setForm({ ...form, hold: c })} disabled={!sel.size} /></div>
            <div className="btn-row">
              <Button variant="primary" disabled={!sel.size || !form.rc} onClick={applyToSelection}>Set {sel.size || ""}</Button>
              <Button disabled={!sel.size} onClick={() => setSel(new Set())}>Clear selection</Button>
            </div>
            <div className="btn-row">
              <Button size="sm" onClick={() => setSel(new Set(buckets.map((b) => b.key)))}>Select all</Button>
              <Button size="sm" onClick={() => setSel(new Set(buckets.filter((b) => parseRcValue(b.value).rc === form.rc).map((b) => b.key)))} disabled={!form.rc}>Select same RC</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Other entries"
        desc="Additional keys in cdci_rc.cfg (for example account overrides)."
        actions={
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); const k = newKey.trim(); if (k && !entries.some((x) => x.key === k)) { setProp("cdci", k, "00,0,false"); setNewKey(""); } }}>
            <Input value={newKey} onChange={setNewKey} placeholder="new key" className="w-sm" />
            <Button size="sm" type="submit" disabled={!newKey.trim() || entries.some((x) => x.key === newKey.trim())}>Add</Button>
          </form>
        }
      >
        {others.length === 0 ? <p className="muted">No other entries.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Key</th><th>RC</th><th>Delay (ms)</th><th>Hold</th><th /></tr></thead>
              <tbody>
                {others.map((e) => {
                  const p = parseRcValue(e.value);
                  const upd = (patch) => setProp("cdci", e.key, formatRcValue({ ...p, ...patch }, { compact: true }));
                  return (
                    <tr key={e.key} className={e.state !== "clean" ? "row-dirty" : ""}>
                      <td className="mono">{e.key} {e.state === "new" && <Badge tone="info">new</Badge>}</td>
                      <td><Input value={p.rc} onChange={(v) => upd({ rc: v.trim() })} className={`w-xs tone-${rcTone(p.rc)}`} /></td>
                      <td><Input value={p.delay} onChange={(v) => upd({ delay: v.replace(/[^0-9]/g, "") })} className="w-xs" /></td>
                      <td><Toggle checked={p.hold} onChange={(c) => upd({ hold: c })} /></td>
                      <td className="right"><button className="icon-btn danger" aria-label={`Delete ${e.key}`} onClick={() => setProp("cdci", e.key, null)}>🗑</button></td>
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
