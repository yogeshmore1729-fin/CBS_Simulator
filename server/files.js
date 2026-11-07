/**
 * Line-preserving readers / editors for the simulator config files.
 *
 * Every edit keeps the rest of the file untouched (comments, ordering, variables the
 * console does not know about), so saving from the console can never drop settings.
 */
import crypto from "node:crypto";

export const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

/* ── setenv.sh ─────────────────────────────────────────────────────────────── */

const EXPORT_RE = /^(\s*)export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/** Splits `${KEY:-"value"}  # comment` style right-hand sides. */
function parseRhs(key, rhs) {
  const m = rhs.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*):-(.*)\}(\s*#.*)?$/);
  if (m && m[1] === key) {
    let raw = m[2];
    let quoted = false;
    if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1).replace(/\\(["\\$`])/g, "$1");
      quoted = true;
    }
    // a default that references another variable ($JDWP_PORT) is shell logic, not a value
    const editable = quoted || !/[$`]/.test(raw);
    return { value: raw, comment: (m[3] || "").trim().replace(/^#\s*/, ""), editable, form: "default" };
  }
  return { value: rhs.trim(), comment: "", editable: false, form: "raw" };
}

export function parseEnv(text) {
  const vars = [];
  let section = "";
  text.split("\n").forEach((line, i) => {
    const c = line.match(/^\s*#\s*(.+?)\s*#*\s*$/);
    if (c && !/^\s*#\s*export\s/.test(line) && !line.startsWith("#!")) section = c[1];
    const m = line.match(EXPORT_RE);
    if (!m) return;
    const p = parseRhs(m[2], m[3]);
    vars.push({ key: m[2], line: i + 1, section, ...p });
  });
  return vars;
}

const shellQuote = (v) => '"' + String(v).replace(/(["\\$`])/g, "\\$1") + '"';

/** Applies {KEY: value} to setenv.sh text; unknown keys are appended in a console section. */
export function editEnv(text, changes) {
  const lines = text.split("\n");
  const pending = new Map(Object.entries(changes));
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(EXPORT_RE);
    if (!m || !pending.has(m[2])) continue;
    const key = m[2];
    const old = parseRhs(key, m[3]);
    const comment = old.comment ? `   # ${old.comment}` : "";
    lines[i] = `${m[1]}export ${key}=\${${key}:-${shellQuote(pending.get(key))}}${comment}`;
    pending.delete(key);
  }
  if (pending.size) {
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    lines.push("", "# Added by CBS Simulator Console");
    for (const [key, v] of pending) lines.push(`export ${key}=\${${key}:-${shellQuote(v)}}`);
    lines.push("");
  }
  return lines.join("\n");
}

/* ── *.cfg (java.util.Properties subset) ──────────────────────────────────── */

const PROP_RE = /^\s*([^#!=\s][^=]*?)\s*=\s*(.*?)\s*$/;

/** Entries in file order; `label` is the nearest comment above (without the #### rulers). */
export function parseProps(text) {
  const entries = [];
  let label = "";
  text.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    if (t.startsWith("#") || t.startsWith("!")) {
      const c = t.replace(/^[#!]+/, "").trim();
      if (c && !/^#+$/.test(c)) label = c;
      return;
    }
    const m = line.match(PROP_RE);
    if (!m) return;
    // java.util.Properties keeps the last value of a duplicated key
    const prev = entries.findIndex((e) => e.key === m[1]);
    if (prev >= 0) entries.splice(prev, 1);
    entries.push({ key: m[1], value: m[2], label, line: i + 1 });
  });
  return entries;
}

/**
 * Applies {set: {key: value}, remove: [key], labels: {key: comment}} to a properties text.
 * Existing keys are updated in place, removed keys are deleted, new keys are appended
 * (with their label as a comment, matching the financial_rc.cfg style).
 */
export function editProps(text, { set = {}, remove = [], labels = {} }) {
  const drop = new Set(remove);
  const pending = new Map(Object.entries(set));
  const out = [];
  for (const line of text.split("\n")) {
    const m = line.match(PROP_RE);
    if (m && !line.trim().startsWith("#")) {
      const key = m[1];
      if (drop.has(key)) continue;
      if (pending.has(key)) {
        out.push(`${key}=${pending.get(key)}`);
        continue;
      }
    }
    out.push(line);
  }
  // keys updated in place are done; only new keys remain to append
  for (const key of Object.keys(set)) {
    if (out.some((l) => { const m = l.match(PROP_RE); return m && !l.trim().startsWith("#") && m[1] === key; }))
      pending.delete(key);
  }
  if (pending.size) {
    while (out.length && out[out.length - 1].trim() === "") out.pop();
    out.push("");
    for (const [key, v] of pending) {
      if (labels[key]) out.push(`# ${labels[key]}`);
      out.push(`${key}=${v}`);
    }
    out.push("");
  }
  return out.join("\n");
}
