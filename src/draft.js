/*
 * Pending edits on top of the config loaded from disk.
 * draft = { setenv: {KEY: value}, cdci: {key: value | null}, financial: {key: value | null}, labels: {key: text} }
 * (null = remove). Edits equal to the value on disk are dropped, so "dirty" is always exact.
 */

export const emptyDraft = () => ({ setenv: {}, cdci: {}, financial: {}, labels: {} });

export function originalMap(config, file) {
  const m = new Map();
  for (const e of config?.[file]?.entries || []) m.set(e.key, e.value);
  return m;
}

export function setValue(draft, config, file, key, value) {
  const orig = originalMap(config, file);
  const next = { ...draft, [file]: { ...draft[file] } };
  if ((value === null && !orig.has(key)) || (value !== null && orig.get(key) === value)) delete next[file][key];
  else next[file][key] = value;
  return next;
}

export function current(draft, config, file, key) {
  if (key in draft[file]) return draft[file][key];
  return originalMap(config, file).get(key);
}

/** Entries as they would be after applying the draft (file order, new keys last). */
export function effectiveEntries(draft, config, file) {
  const out = [];
  for (const e of config?.[file]?.entries || []) {
    if (!(e.key in draft[file])) out.push({ ...e, state: "clean" });
    else if (draft[file][e.key] !== null) out.push({ ...e, value: draft[file][e.key], state: "changed", original: e.value });
  }
  for (const [key, value] of Object.entries(draft[file])) {
    if (value !== null && !(config?.[file]?.entries || []).some((e) => e.key === key))
      out.push({ key, value, label: draft.labels[key] || "", state: "new" });
  }
  return out;
}

/** Flat list of {file, key, from, to} for review. */
export function changeList(draft, config) {
  const list = [];
  for (const file of ["setenv", "cdci", "financial"]) {
    const orig = originalMap(config, file);
    for (const [key, to] of Object.entries(draft[file])) list.push({ file, key, from: orig.get(key), to });
  }
  return list;
}

export const isDirty = (draft) => ["setenv", "cdci", "financial"].some((f) => Object.keys(draft[f]).length);

export function toPayload(draft, config, live) {
  const props = (file) => {
    const set = {}, remove = [], labels = {};
    for (const [k, v] of Object.entries(draft[file])) {
      if (v === null) remove.push(k);
      else { set[k] = v; if (draft.labels[k]) labels[k] = draft.labels[k]; }
    }
    return { set, remove, labels };
  };
  return {
    base: { setenv: config.setenv.hash, cdci: config.cdci.hash, financial: config.financial.hash },
    setenv: { ...draft.setenv },
    cdci: props("cdci"),
    financial: props("financial"),
    live,
  };
}
