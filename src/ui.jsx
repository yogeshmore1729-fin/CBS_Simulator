import { useEffect, useRef, useState } from "react";

export function Button({ variant = "default", size, icon, children, className = "", ...rest }) {
  return (
    <button className={`btn btn-${variant}${size ? ` btn-${size}` : ""} ${className}`} {...rest}>
      {icon && <span className="btn-icon" aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, disabled, title }) {
  return (
    <label className={`toggle${disabled ? " is-disabled" : ""}`} title={title}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}

export function Input({ value, onChange, dirty, mono = true, className = "", ...rest }) {
  return (
    <input
      className={`input${mono ? " mono" : ""}${dirty ? " is-dirty" : ""} ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, className = "", ...rest }) {
  return (
    <select className={`input select ${className}`} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Comma separated list edited as chips. `wrapped` keeps the ",a,b," form the simulator matches with contains(",acc,"). */
export function ListInput({ value, onChange, wrapped, dirty, placeholder = "Add value and press Enter" }) {
  const items = String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
  const [text, setText] = useState("");
  const write = (list) => onChange(list.length ? (wrapped ? `,${list.join(",")},` : list.join(",")) : "");
  const add = () => {
    const extra = text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean).filter((s) => !items.includes(s));
    if (extra.length) write([...items, ...extra]);
    setText("");
  };
  return (
    <div className={`chips${dirty ? " is-dirty" : ""}`}>
      {items.map((it) => (
        <span key={it} className="chip mono">
          {it}
          <button type="button" aria-label={`Remove ${it}`} onClick={() => write(items.filter((x) => x !== it))}>×</button>
        </span>
      ))}
      <input
        className="chips-input mono"
        value={text}
        placeholder={items.length ? "" : placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          else if (e.key === "Backspace" && !text && items.length) write(items.slice(0, -1));
        }}
        onBlur={add}
        spellCheck={false}
      />
    </div>
  );
}

export function Badge({ tone = "muted", children, title, className = "" }) {
  return <span className={`badge badge-${tone} ${className}`} title={title}>{children}</span>;
}

export function Dot({ tone }) {
  return <span className={`dot dot-${tone}`} aria-hidden />;
}

export function Card({ title, desc, actions, children, className = "", bodyClass = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {desc && <p className="muted">{desc}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? " modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="modal-head">
          <h2>{title}</h2>
          {onClose && <button className="icon-btn" aria-label="Close" onClick={onClose}>×</button>}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export function Spinner({ small }) {
  return <span className={`spinner${small ? " spinner-sm" : ""}`} aria-label="Loading" />;
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function OpLog({ entries, empty = "No output yet" }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);
  if (!entries?.length) return <div className="oplog oplog-empty muted">{empty}</div>;
  return (
    <div className="oplog mono" ref={ref}>
      {entries.map((e, i) => (
        <div key={i} className={`oplog-line oplog-${e.type}`}>
          <span className="oplog-time">{new Date(e.at).toLocaleTimeString("en-GB", { hour12: false })}</span>
          <span className="oplog-text">{e.text}</span>
        </div>
      ))}
    </div>
  );
}
