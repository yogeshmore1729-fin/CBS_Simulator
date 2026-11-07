import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Button, Card, Input, Select, Toggle } from "../ui.jsx";

function tone(line) {
  if (/\b(ERROR|FATAL|Exception)\b|<exception|<error/i.test(line)) return "bad";
  if (/\bWARN(ING)?\b|<warn/i.test(line)) return "warn";
  if (/hot reload|config admin/i.test(line)) return "info";
  return "";
}

export default function LogsView() {
  const [lines, setLines] = useState([]);
  const [meta, setMeta] = useState({});
  const [count, setCount] = useState("500");
  const [filter, setFilter] = useState("");
  const [follow, setFollow] = useState(true);
  const [auto, setAuto] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [error, setError] = useState(null);
  const box = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.logs(count);
      setLines(d.lines || []);
      setMeta({ path: d.path, size: d.size });
      setError(d.error || null);
    } catch (e) {
      setError(e.message);
    }
  }, [count]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = auto ? setInterval(load, 2000) : null;
    return () => { clearTimeout(first); if (t) clearInterval(t); };
  }, [auto, load]);
  useEffect(() => { if (follow && box.current) box.current.scrollTop = box.current.scrollHeight; }, [lines, follow]);

  let shown = lines;
  if (filter) {
    let re;
    try { re = new RegExp(filter, "i"); } catch { re = null; }
    shown = lines.filter((l) => (re ? re.test(l) : l.toLowerCase().includes(filter.toLowerCase())));
  }

  return (
    <div className="view view-fill">
      <Card
        className="card-fill"
        bodyClass="card-body-fill"
        title="Simulator log"
        desc={meta.path ? `${meta.path}${meta.size != null ? ` · ${(meta.size / 1048576).toFixed(1)} MB` : ""}` : ""}
        actions={
          <div className="toolbar toolbar-tight">
            <Input value={filter} onChange={setFilter} placeholder="Filter (text or regex)…" className="search" />
            <Select value={count} onChange={setCount} options={["200", "500", "1000", "2000", "5000"].map((v) => ({ value: v, label: `Last ${v} lines` }))} />
            <Toggle checked={auto} onChange={setAuto} label="Live" />
            <Toggle checked={follow} onChange={setFollow} label="Follow" />
            <Toggle checked={wrap} onChange={setWrap} label="Wrap" />
            <Button size="sm" onClick={load}>Refresh</Button>
            <Button size="sm" onClick={() => navigator.clipboard?.writeText(shown.join("\n"))}>Copy</Button>
          </div>
        }
      >
        {error && <p className="note note-warn">{error}</p>}
        <pre
          className={`logbox mono${wrap ? " wrap" : ""}`}
          ref={box}
          onScroll={(e) => {
            const el = e.currentTarget;
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            if (follow !== atBottom) setFollow(atBottom);
          }}
        >
          {shown.map((l, i) => <span key={i} className={`logline ${tone(l) && `tone-${tone(l)}`}`}>{l || " "}{"\n"}</span>)}
          {!shown.length && <span className="muted">{filter ? "No lines match the filter." : "Log is empty."}</span>}
        </pre>
      </Card>
    </div>
  );
}
