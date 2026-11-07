import { useState } from "react";
import { effectiveEntries } from "../draft.js";
import { TXNS, formatRcValue, parseRcValue, rcTone, txnName } from "../meta.js";
import { Badge, Button, Card, Input, Select, Toggle } from "../ui.jsx";

const RC_KEY = /^(\d{6})\.([^.]+)$/;
const LA_KEY = /^010042\.([^.]+)\.(holder|accounts)$/;
const ACC_FIELDS = ["Account no.", "Masked", "IFSC", "MMID", "AEBA", "Category", "Type", "MBEBA"];
const txnOptions = Object.entries(TXNS).map(([v, l]) => ({ value: v, label: `${v} · ${l}` }));
/* "#DEBIT_TXN.last4AccNum=rc,delay,hold_response_flag DRC-102" -> "DRC-102" */
const cleanLabel = (l) => String(l || "").replace(/^[A-Z_]+\.last4AccNum=rc,delay,hold_response_flag\s*/i, "").trim();

/* ── account RC mappings ───────────────────────────────────────────────────── */

function AddMapping({ exists, onAdd }) {
  const [f, setF] = useState({ txn: "010044", last4: "", rc: "00", delay: "0", hold: false, label: "" });
  const key = `${f.txn}.${f.last4}`;
  const dup = f.last4 && exists(key);
  const ok = /^[0-9A-Za-z]{1,10}$/.test(f.last4) && f.rc && !dup;
  return (
    <form className="add-row" onSubmit={(e) => { e.preventDefault(); if (ok) { onAdd(key, formatRcValue(f), f.label || `${txnName(f.txn).toUpperCase()} ${f.last4}`); setF({ ...f, last4: "", label: "" }); } }}>
      <Select value={f.txn} onChange={(txn) => setF({ ...f, txn })} options={txnOptions} />
      <Input value={f.last4} onChange={(v) => setF({ ...f, last4: v.trim() })} placeholder="last 4" className="w-xs" maxLength={10} />
      <Input value={f.rc} onChange={(v) => setF({ ...f, rc: v.trim() })} placeholder="RC" className="w-xs" />
      <Input value={f.delay} onChange={(v) => setF({ ...f, delay: v.replace(/[^0-9]/g, "") })} placeholder="delay" className="w-xs" />
      <Toggle checked={f.hold} onChange={(hold) => setF({ ...f, hold })} label="Hold" />
      <Input value={f.label} onChange={(label) => setF({ ...f, label })} placeholder="Label / scenario (optional)" mono={false} className="grow" />
      <Button variant="primary" size="sm" type="submit" disabled={!ok}>Add mapping</Button>
      {dup && <span className="error small">{key} already exists</span>}
    </form>
  );
}

/* ── list account accounts string ──────────────────────────────────────────── */

function parseAccounts(s) {
  const segs = String(s || "").split("|").filter((x) => x.trim() !== "");
  const rows = segs.map((x) => x.split("-"));
  return { rows, structured: rows.every((r) => r.length === ACC_FIELDS.length), trailing: String(s || "").endsWith("|") };
}
const formatAccounts = (rows, trailing) => rows.map((r) => r.join("-")).join("|") + (trailing && rows.length ? "|" : "");

function AccountsEditor({ value, onChange }) {
  const { rows, structured, trailing } = parseAccounts(value);
  const [raw, setRaw] = useState(!structured);
  if (raw || !structured) {
    return (
      <div>
        <textarea className="input mono textarea" rows={2} value={value} onChange={(e) => onChange(e.target.value.replace(/[\r\n]/g, ""))} spellCheck={false} />
        {structured && <button className="link small" onClick={() => setRaw(false)}>Table view</button>}
        {!structured && <p className="muted small">Each account: {ACC_FIELDS.join("-")}, accounts separated by |</p>}
      </div>
    );
  }
  const upd = (i, j, v) => onChange(formatAccounts(rows.map((r, a) => (a === i ? r.map((c, b) => (b === j ? v.replace(/[-|]/g, "") : c)) : r)), trailing));
  return (
    <div>
      <div className="table-wrap">
        <table className="table table-compact">
          <thead><tr>{ACC_FIELDS.map((h) => <th key={h}>{h}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    <Input value={c} onChange={(v) => upd(i, j, v)} className={j < 3 ? "" : "w-xs"}
                      onBlur={j === 0 && !r[1].trim() && c.length > 4 ? () => upd(i, 1, "X".repeat(c.length - 4) + c.slice(-4)) : undefined} />
                  </td>
                ))}
                <td><button className="icon-btn danger" aria-label="Remove account" onClick={() => onChange(formatAccounts(rows.filter((_, a) => a !== i), trailing))}>🗑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <Button size="sm" icon="+" onClick={() => onChange(formatAccounts([...rows, ["", "", "MAHB0000001", " ", "N", "SB", "GEN", "N"]], trailing || !rows.length))}>Add account</Button>
        <button className="link small" onClick={() => setRaw(true)}>Edit as text</button>
      </div>
    </div>
  );
}

/* ── view ──────────────────────────────────────────────────────────────────── */

export default function FinancialView({ config, draft, setProp, setLabel }) {
  const entries = effectiveEntries(draft, config, "financial");
  const exists = (k) => entries.some((e) => e.key === k);
  const [txnFilter, setTxnFilter] = useState("");
  const [q, setQ] = useState("");
  const [newLa, setNewLa] = useState({ last4: "", holder: "" });

  const mappings = entries.map((e) => ({ ...e, m: e.key.match(RC_KEY) })).filter((e) => e.m && !LA_KEY.test(e.key));
  const listAccounts = new Map();
  for (const e of entries) {
    const m = e.key.match(LA_KEY);
    if (!m) continue;
    const it = listAccounts.get(m[1]) || { id: m[1] };
    it[m[2]] = e;
    listAccounts.set(m[1], it);
  }
  const others = entries.filter((e) => !RC_KEY.test(e.key) && !LA_KEY.test(e.key));

  const shown = mappings.filter((e) =>
    (!txnFilter || e.m[1] === txnFilter) &&
    (!q || e.key.includes(q) || (e.label || "").toLowerCase().includes(q.toLowerCase()) || e.value.includes(q)));
  const counts = mappings.reduce((acc, e) => ({ ...acc, [e.m[1]]: (acc[e.m[1]] || 0) + 1 }), {});
  const add = (key, value, label) => { setLabel(key, label); setProp("financial", key, value); };

  return (
    <div className="view">
      <Card
        title="Account RC mappings"
        desc="Transaction + last 4 digits of the account → RC, delay (ms) and hold. Used when 'Use account RC mappings' is on; it takes precedence over random responses."
      >
        <AddMapping exists={exists} onAdd={add} />
        <div className="toolbar">
          <Select value={txnFilter} onChange={setTxnFilter} options={[{ value: "", label: `All transactions (${mappings.length})` }, ...Object.keys(counts).sort().map((t) => ({ value: t, label: `${t} · ${txnName(t)} (${counts[t]})` }))]} />
          <Input value={q} onChange={setQ} mono={false} placeholder="Search last 4, RC or label…" className="search" />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Transaction</th><th>Last 4</th><th>RC</th><th>Delay (ms)</th><th>Hold</th><th>Label</th><th /></tr></thead>
            <tbody>
              {shown.map((e) => {
                const p = parseRcValue(e.value);
                const upd = (patch) => setProp("financial", e.key, formatRcValue({ ...p, ...patch }));
                return (
                  <tr key={e.key} className={e.state !== "clean" ? "row-dirty" : ""}>
                    <td><span className="mono">{e.m[1]}</span> <span className="muted small">{txnName(e.m[1])}</span></td>
                    <td className="mono">{e.m[2]} {e.state === "new" && <Badge tone="info">new</Badge>}</td>
                    <td><Input value={p.rc} onChange={(v) => upd({ rc: v.trim() })} className={`w-xs tone-${rcTone(p.rc)}`} /></td>
                    <td><Input value={p.delay} onChange={(v) => upd({ delay: v.replace(/[^0-9]/g, "") })} className="w-xs" /></td>
                    <td><Toggle checked={p.hold} onChange={(hold) => upd({ hold })} /></td>
                    <td className="muted small" title={e.label}>{cleanLabel(e.label) || "—"}</td>
                    <td className="right"><button className="icon-btn danger" aria-label={`Delete ${e.key}`} onClick={() => setProp("financial", e.key, null)}>🗑</button></td>
                  </tr>
                );
              })}
              {!shown.length && <tr><td colSpan={7} className="muted center">No mappings match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="List account mappings (010042)"
        desc="Last 4 digits → account holder and the accounts returned by list account. Used when 'List account from cfg file' is on."
        actions={
          <form className="inline-form" onSubmit={(e) => {
            e.preventDefault();
            const id = newLa.last4.trim();
            if (!id || listAccounts.has(id)) return;
            add(`010042.${id}.holder`, newLa.holder || "Mr. NAME", "LIST ACCOUNT");
            setProp("financial", `010042.${id}.accounts`, "");
            setNewLa({ last4: "", holder: "" });
          }}>
            <Input value={newLa.last4} onChange={(v) => setNewLa({ ...newLa, last4: v.trim() })} placeholder="last 4" className="w-xs" />
            <Input value={newLa.holder} onChange={(holder) => setNewLa({ ...newLa, holder })} placeholder="Holder name" mono={false} />
            <Button size="sm" type="submit" disabled={!newLa.last4.trim() || listAccounts.has(newLa.last4.trim())}>Add</Button>
          </form>
        }
      >
        <div className="la-grid">
          {[...listAccounts.values()].map((it) => (
            <div key={it.id} className={`la-card${(it.holder?.state || "clean") !== "clean" || (it.accounts?.state || "clean") !== "clean" ? " field-dirty" : ""}`}>
              <div className="la-head">
                <Badge tone="info">…{it.id}</Badge>
                <Input value={it.holder?.value ?? ""} mono={false} onChange={(v) => setProp("financial", `010042.${it.id}.holder`, v)} placeholder="Account holder" className="grow" />
                <button className="icon-btn danger" aria-label={`Delete list account ${it.id}`}
                  onClick={() => { setProp("financial", `010042.${it.id}.holder`, null); setProp("financial", `010042.${it.id}.accounts`, null); }}>🗑</button>
              </div>
              <AccountsEditor value={it.accounts?.value ?? ""} onChange={(v) => setProp("financial", `010042.${it.id}.accounts`, v)} />
            </div>
          ))}
        </div>
      </Card>

      {others.length > 0 && (
        <Card title="Other entries" desc="Keys in financial_rc.cfg that are not account or list-account mappings.">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Key</th><th>Value</th><th /></tr></thead>
              <tbody>
                {others.map((e) => (
                  <tr key={e.key} className={e.state !== "clean" ? "row-dirty" : ""}>
                    <td className="mono">{e.key}</td>
                    <td><Input value={e.value} onChange={(v) => setProp("financial", e.key, v)} /></td>
                    <td className="right"><button className="icon-btn danger" aria-label={`Delete ${e.key}`} onClick={() => setProp("financial", e.key, null)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
