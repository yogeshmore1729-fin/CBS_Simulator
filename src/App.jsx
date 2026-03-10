import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";

/* ═══════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════ */
const Ctx = createContext(null);
const useT = () => useContext(Ctx);

const DARK = {
  bg: "#080c10", surf: "#0d1117", surf2: "#161b22", surf3: "#21262d",
  bdr: "#30363d", bdr2: "#1e2530",
  tx: "#e6edf3", txM: "#8b949e", txF: "#484f58",
  acc: "#f0883e", accD: "#f0883e16", accB: "#f0883e50",
  grn: "#3fb950", grnD: "#3fb95018",
  red: "#f85149", redD: "#f8514918",
  amb: "#d29922", ambD: "#d2992218",
  blu: "#58a6ff", bluD: "#58a6ff18",
  pur: "#bc8cff",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
  sans: "'IBM Plex Sans', system-ui, sans-serif",
};
const LIGHT = {
  bg: "#f5f0e8", surf: "#fffef9", surf2: "#ede8dd", surf3: "#e0d9cc",
  bdr: "#c8c0b0", bdr2: "#ddd8cc",
  tx: "#1c1814", txM: "#6b5e4e", txF: "#a8998a",
  acc: "#b85c00", accD: "#b85c0010", accB: "#b85c0044",
  grn: "#1a7f37", grnD: "#1a7f3710",
  red: "#cf222e", redD: "#cf222e10",
  amb: "#9a6700", ambD: "#9a670010",
  blu: "#0550ae", bluD: "#0550ae10",
  pur: "#5e35b1",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
  sans: "'IBM Plex Sans', system-ui, sans-serif",
};

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const TXN_OPTS = ["010042","010043","010044","010045","010049","010052","010053","010054","010056","010058","010060","010065","010066"];
const TXN_LBL  = { "010042":"LIST_ACCT","010043":"SET_PIN","010044":"DEBIT","010045":"CREDIT","010049":"BAL_INQ","010052":"CHK_STATUS","010053":"CREDIT_REV","010054":"DEBIT_REV","010056":"LIEN","010058":"UNBLOCK","010060":"UPD_MANDATE","010065":"LIEN_WO_PIN","010066":"CHK_UDIR" };
const BOOL_SET = new Set(["ENABLE_RND_010049","ENABLE_RND_010065","ENABLE_RND_010058","ENABLE_RND_010052","ENABLE_RND_010066","ENABLE_RND_010056","ENABLE_RND_010060","ENABLE_RND_010044","ENABLE_RND_010045","ENABLE_RND_010053","ENABLE_RND_010054","ENABLE_RND_010043","ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN","HOLD_REV_RESP","HOLD_CHK_TXN_UDIR_RESP","HOLD_CHK_TXN_RESP","FAIL_REVERSAL_RESP","ENABLE_TXN_ACC_BASE_RC_MAPPING","ENABLE_LIST_ACCOUNT_CFG_FILE","RESPOND_CHK_TXN_RESP","REDIS_SUPPORT","REDIS_USE_SSL"]);
const RND_LBL  = { ENABLE_RND_010049:"BAL_INQ",ENABLE_RND_010065:"LIEN_WO_PIN",ENABLE_RND_010058:"UNBLOCK",ENABLE_RND_010052:"CHK_STATUS",ENABLE_RND_010066:"CHK_UDIR",ENABLE_RND_010056:"LIEN",ENABLE_RND_010060:"UPD_MANDATE",ENABLE_RND_010044:"DEBIT",ENABLE_RND_010045:"CREDIT",ENABLE_RND_010053:"CREDIT_REV",ENABLE_RND_010054:"DEBIT_REV",ENABLE_RND_010043:"SET_PIN" };
const PROC     = "simulator-service-1.0.1.jar";
const PS_CMD   = "ps -ef | grep " + PROC + " | grep -v grep";

const rcColor = (rc, t) => {
  const b = (rc || "").split("|")[0];
  if (b === "00")  return t.grn;
  if (b === "91")  return t.amb;
  if (["52","89","90","NP"].includes(b)) return t.red;
  if (b === "130") return t.pur;
  return t.txM;
};

/* ═══════════════════════════════════════════════════════════════
   DEFAULT DATA
═══════════════════════════════════════════════════════════════ */
const DEF_ENV = {
  BALANCE_ENQUIRY_RESP:"75457.080-CR|75474.080-CR", LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP:"000062631|27032025",
  UNBLOCK_EXECUTE_RESP:"000062644", TXN_STATUS_RESP:"00", CHK_REVERSAL_RESP:"00|NA",
  LIEN_AMOUNT_RESP:"000162663|28032025", UPDATE_MANDATE_RESP:"000043957|24032025",
  DEBIT_RESP:"00", CREDIT_RESP:"00", CREDIT_REVERSAL_RESP:"00", DEBIT_REVERSAL_RESP:"00",
  SET_PIN_RESP:"00", SUCCESS_RC:"00",
  ACCOUNT_HOLDER_NAME:"Mr. RAJAT SINGH", CLEAR_ACC_NUMS:"60347139856,60347137532",
  IFSC_CODES:"MAHB0001157,MAHB0001192", MMIDS:"", AEBA_FLAGS:"Y,N",
  ACCOUNT_CATEGORIES:"SB,CC", ACC_TYPES:"GEN,GEN", MBEBA_FLAGS:"N,Y",
  ENABLE_RND_010049:"true", ENABLE_RND_010065:"true", ENABLE_RND_010058:"true",
  ENABLE_RND_010052:"true", ENABLE_RND_010066:"true", ENABLE_RND_010056:"true",
  ENABLE_RND_010060:"true", ENABLE_RND_010044:"true", ENABLE_RND_010045:"true",
  ENABLE_RND_010053:"true", ENABLE_RND_010054:"true", ENABLE_RND_010043:"true",
  ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN:"true", HOLD_REV_RESP:"false",
  HOLD_CHK_TXN_UDIR_RESP:"false", HOLD_CHK_TXN_RESP:"false", FAIL_REVERSAL_RESP:"false",
  ENABLE_TXN_ACC_BASE_RC_MAPPING:"true", ENABLE_LIST_ACCOUNT_CFG_FILE:"true",
  RESPOND_CHK_TXN_RESP:"true", HOLD_CHK_TXN_RESP_ACC:"00000100048445124",
  NON_PERSISTENT_ACCOUNT:"00000100048445125", REVERSAL_FAILURE_RC:"90",
  DELAY_BUFFER:"100", SUCCESS_TIMEOUT_RCS:"00,91",
  REDIS_SUPPORT:"true", REDIS_HOST:"127.0.0.1", REDIS_PORT:"6379",
  REDIS_USER:"appredis", REDIS_PASSWORD:"#162fdbc2f46bbce7bf045ed3201873bdc6344857864544dfa35bf3d02e0ad5ba",
  REDIS_USE_SSL:"false",
};

const mkCdciStd = () => Array.from({ length: 100 }, (_, i) => {
  const n = i + 1, k = String(n).padStart(3, "0");
  if ([81,82,83,84,85].includes(n)) return { key:k, rc:"000", delay:"",     inhibit:"true" };
  if (n === 86) return { key:k, rc:"000", delay:"1000", inhibit:"" };
  if (n === 87) return { key:k, rc:"000", delay:"2000", inhibit:"" };
  if (n === 88) return { key:k, rc:"000", delay:"3000", inhibit:"" };
  if (n === 89) return { key:k, rc:"000", delay:"5000", inhibit:"" };
  if (n === 90) return { key:k, rc:"000", delay:"6000", inhibit:"" };
  if (n === 91) return { key:k, rc:"130", delay:"7000", inhibit:"" };
  if (n === 92) return { key:k, rc:"130", delay:"8000", inhibit:"" };
  if (n === 93) return { key:k, rc:"130", delay:"9000", inhibit:"" };
  if (n === 94) return { key:k, rc:"130", delay:"1000", inhibit:"" };
  if (n === 95) return { key:k, rc:"130", delay:"2000", inhibit:"true" };
  if (n >= 96)  return { key:k, rc:"130", delay:"",     inhibit:"" };
  return { key:k, rc:"000", delay:"", inhibit:"" };
});

const DEF_SP  = [{ key:"7790", rc:"00", delay:"", inhibit:"true" }];
const DEF_FIN = [
  { txn:"010043",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"SET_PIN"       },
  { txn:"010044",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"DEBIT DRC-102" },
  { txn:"010044",last4:"0918",rc:"00",  delay:"100",inhibit:"false",lbl:"DEBIT DRC-102b"},
  { txn:"010044",last4:"7792",rc:"00",  delay:"100",inhibit:"true", lbl:"DEBIT DRC-103" },
  { txn:"010044",last4:"7790",rc:"52",  delay:"0",  inhibit:"true", lbl:"DEBIT DRC-104" },
  { txn:"010044",last4:"7791",rc:"00",  delay:"0",  inhibit:"false",lbl:"DEBIT DRC-UT1" },
  { txn:"010044",last4:"9999",rc:"52",  delay:"0",  inhibit:"false",lbl:"DEBIT FAILURE" },
  { txn:"010044",last4:"2419",rc:"00",  delay:"0",  inhibit:"false",lbl:"DEBIT SUCCESS" },
  { txn:"010045",last4:"2419",rc:"00",  delay:"100",inhibit:"false",lbl:"CREDIT SUCCESS"},
  { txn:"010045",last4:"0999",rc:"91",  delay:"100",inhibit:"true", lbl:"CREDIT HELD"  },
  { txn:"010045",last4:"5124",rc:"52",  delay:"0",  inhibit:"true", lbl:"CREDIT RET-114"},
  { txn:"010045",last4:"5125",rc:"91",  delay:"0",  inhibit:"true", lbl:"CREDIT BUU-NO"},
  { txn:"010052",last4:"7789",rc:"91",  delay:"100",inhibit:"true", lbl:"CHK_STATUS"   },
  { txn:"010053",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"CREDIT_REV"   },
  { txn:"010054",last4:"7789",rc:"91",  delay:"100",inhibit:"true", lbl:"DEBIT_REV"    },
  { txn:"010056",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"LIEN_AMOUNT"  },
  { txn:"010058",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"UNBLOCK_EXEC" },
  { txn:"010060",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"UPD_MANDATE"  },
  { txn:"010065",last4:"7789",rc:"00",  delay:"100",inhibit:"false",lbl:"LIEN_WO_PIN"  },
  { txn:"010066",last4:"7789",rc:"00|00",delay:"100",inhibit:"false",lbl:"CHK_UDIR"   },
];
const DEF_LA = [
  { mobile:"9527", holder:"Mr. RAJAT SINGH",   accounts:"68017922488-XXXXXXX2488-MAHB0000174- -N-SB-GEN-NA|60398953145-XXXXXXX3145-MAHB0001379- -N-CC-SOD-NA|" },
  { mobile:"9528", holder:"Mr. RAJESH PATIL",  accounts:"60347131234-XXXXXXX1234-MAHB0001158--N-SB-GEN-N|60347139834-XXXXXXX9834-MAHB0001158--N-CC-GEN-N" },
  { mobile:"9529", holder:"Mr. YOGESH JADHAV", accounts:"60347130987-XXXXXXX0987-MAHB0001127--N-CL07-GEN-Y|" },
  { mobile:"9601", holder:"Mr. AMIT SHARMA",   accounts:"60347140001-XXXXXXX0001-MAHB0001157--N-SB-GEN-Y|" },
  { mobile:"9607", holder:"Ms. PRIYA NAIR",    accounts:"60347140661-XXXXXXX6661-MAHB0001157--Y-SB-GEN-Y|" },
  { mobile:"9608", holder:"Mr. ROHAN VERMA",   accounts:"60347140771-XXXXXXX7771-MAHB0001157--N-SB-GEN-Y|" },
];
const DEF_PATHS = {
  envFile:     "cfg/setenv.sh",
  cdciCfg:     "cfg/cdci_rc.cfg",
  financialCfg:"cfg/financial_rc.cfg",
  logFile:     "logs/simulator.log",
  startScript: "./modules/simulator-service/build/install/simulator-service/bin/start",
  stopScript:  "./modules/simulator-service/build/install/simulator-service/bin/stop",
};

/* ═══════════════════════════════════════════════════════════════
   PARSERS
═══════════════════════════════════════════════════════════════ */
function parseEnv(text) {
  const r = {};
  text.split("\n").forEach(raw => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const m = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*?)(?:\s{2,}#.*)?$/);
    if (!m) return;
    const key = m[1], rv = (m[2] || "").trim();
    const d = rv.match(/^\$\{[A-Z0-9_]+:-"?([^"}\n]*)"?\}/);
    if (d) { r[key] = d[1]; return; }
    const q = rv.match(/^"([^"]*)"$/);
    if (q) { r[key] = q[1]; return; }
    r[key] = rv.replace(/\s+#.*$/, "");
  });
  return r;
}
function parseCdci(text) {
  const std = [], sp = [];
  text.split("\n").forEach(raw => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const eq = line.indexOf("="); if (eq < 0) return;
    const key = line.substring(0, eq).trim(), val = line.substring(eq + 1).trim(), p = val.split(",");
    const e = { key, rc: p[0]||"", delay: p[1]||"", inhibit: p[2]||"" };
    (/^\d{3}$/.test(key) ? std : sp).push(e);
  });
  return { std, sp };
}
function parseFin(text) {
  const fin = [], la = [];
  text.split("\n").forEach(raw => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const eq = line.indexOf("="); if (eq < 0) return;
    const key = line.substring(0, eq).trim(), val = line.substring(eq + 1).trim();
    const mH = key.match(/^010042\.(\d{4})\.holder$/);
    if (mH) { la.push({ mobile: mH[1], holder: val, accounts: "" }); return; }
    const mA = key.match(/^010042\.(\d{4})\.accounts$/);
    if (mA) { const f = la.find(x => x.mobile === mA[1]); if (f) f.accounts = val; return; }
    const mF = key.match(/^(\d{6})\.(\d{4})$/);
    if (mF) { const p = val.split(","); fin.push({ txn:mF[1], last4:mF[2], rc:p[0]||"00", delay:p[1]||"0", inhibit:p[2]||"false", lbl:TXN_LBL[mF[1]]||mF[1] }); }
  });
  return { fin, la };
}

/* ═══════════════════════════════════════════════════════════════
   GENERATORS
═══════════════════════════════════════════════════════════════ */
const ENV_GROUPS = [
  { c:"# CBS RESPONSE DEFAULTS", k:["BALANCE_ENQUIRY_RESP","LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP","UNBLOCK_EXECUTE_RESP","TXN_STATUS_RESP","CHK_REVERSAL_RESP","LIEN_AMOUNT_RESP","UPDATE_MANDATE_RESP","DEBIT_RESP","CREDIT_RESP","CREDIT_REVERSAL_RESP","DEBIT_REVERSAL_RESP","SET_PIN_RESP","SUCCESS_RC"] },
  { c:"# ACCOUNT CONFIGURATION", k:["ACCOUNT_HOLDER_NAME","CLEAR_ACC_NUMS","IFSC_CODES","MMIDS","AEBA_FLAGS","ACCOUNT_CATEGORIES","ACC_TYPES","MBEBA_FLAGS"] },
  { c:"# RANDOM RESPONSE FLAGS",  k:["ENABLE_RND_010049","ENABLE_RND_010065","ENABLE_RND_010058","ENABLE_RND_010052","ENABLE_RND_010066","ENABLE_RND_010056","ENABLE_RND_010060","ENABLE_RND_010044","ENABLE_RND_010045","ENABLE_RND_010053","ENABLE_RND_010054","ENABLE_RND_010043"] },
  { c:"# BEHAVIOR FLAGS",         k:["ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN","HOLD_REV_RESP","HOLD_CHK_TXN_UDIR_RESP","HOLD_CHK_TXN_RESP","FAIL_REVERSAL_RESP","ENABLE_TXN_ACC_BASE_RC_MAPPING","ENABLE_LIST_ACCOUNT_CFG_FILE","RESPOND_CHK_TXN_RESP","HOLD_CHK_TXN_RESP_ACC","NON_PERSISTENT_ACCOUNT","REVERSAL_FAILURE_RC","DELAY_BUFFER","SUCCESS_TIMEOUT_RCS"] },
  { c:"# REDIS CONFIGURATION",    k:["REDIS_SUPPORT","REDIS_HOST","REDIS_PORT","REDIS_USER","REDIS_PASSWORD","REDIS_USE_SSL"] },
];
function genEnv(env) {
  let o = "#!/bin/bash\n\necho \"Setting up Env for CBS Simulator\"\n\n";
  ENV_GROUPS.forEach(g => {
    o += g.c + "\n";
    g.k.forEach(k => { if (env[k] !== undefined) o += `export ${k}=\${${k}:-"${env[k]}"}\n`; });
    o += "\n";
  });
  return o;
}
function genCdci(std, sp) {
  let o = "#<last4>=rc,delay,inhibit\n";
  const fmt = m => { let v = m.rc; if (m.delay||m.inhibit) v += "," + (m.delay||""); if (m.inhibit) v += "," + m.inhibit; o += `${m.key}=${v}\n`; };
  std.forEach(fmt);
  if (sp.length) { o += "\n# Special account mappings\n"; sp.forEach(fmt); }
  return o;
}
function genFin(fin, la) {
  let o = "# FINANCIAL RC MAPPINGS\n\n";
  fin.forEach(m => { o += `# ${m.lbl}\n${m.txn}.${m.last4}=${m.rc},${m.delay},${m.inhibit}\n\n`; });
  o += "\n# LIST ACCOUNT (010042) MAPPINGS\n\n";
  la.forEach(a => { o += `010042.${a.mobile}.holder=${a.holder}\n010042.${a.mobile}.accounts=${a.accounts}\n\n`; });
  return o;
}

/* ═══════════════════════════════════════════════════════════════
   ATOMS / PRIMITIVES
═══════════════════════════════════════════════════════════════ */
function TxtInp({ value, onChange, mono, sm, style, ...rest }) {
  const t = useT();
  const [foc, setFoc] = useState(false);
  const base = {
    background: t.surf, borderRadius: 5, outline: "none", boxSizing: "border-box",
    width: "100%", transition: "border-color .15s, box-shadow .15s",
    color: mono ? t.acc : t.tx,
    fontFamily: mono ? t.mono : t.sans,
    fontSize: sm ? 11 : 13,
    padding: sm ? "3px 8px" : "7px 11px",
    border: `1px solid ${foc ? t.acc : t.bdr}`,
    boxShadow: foc ? `0 0 0 3px ${t.accD}` : "none",
  };
  return <input value={value} onChange={e => onChange(e.target.value)}
    onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
    style={{ ...base, ...style }} {...rest} />;
}

function Toggle({ value, onChange }) {
  const t = useT();
  const on = value === "true";
  return (
    <button onClick={() => onChange(on ? "false" : "true")} style={{
      width: 40, height: 22, borderRadius: 11, padding: 0, flexShrink: 0,
      border: `1px solid ${on ? t.acc : t.bdr}`,
      background: on ? t.accD : t.surf3,
      cursor: "pointer", position: "relative", transition: "all .2s",
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 20 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: on ? t.acc : t.txF,
        transition: "left .2s, background .2s",
      }} />
    </button>
  );
}

function Sel({ value, onChange, options }) {
  const t = useT();
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: t.surf, border: `1px solid ${t.bdr}`, borderRadius: 5,
      color: t.tx, fontFamily: t.mono, fontSize: 11, padding: "4px 8px",
      outline: "none", cursor: "pointer",
    }}>
      {options.map(o => <option key={o} value={o}>{TXN_LBL[o] || o}</option>)}
    </select>
  );
}

function Badge({ color, children, sm }) {
  const t = useT();
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}44`,
      borderRadius: 4, fontFamily: t.mono, fontWeight: 600, whiteSpace: "nowrap",
      padding: sm ? "1px 5px" : "2px 8px",
      fontSize: sm ? 9 : 11,
    }}>{children}</span>
  );
}

function CpyBtn({ text }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <button onClick={copy} style={{
      background: ok ? t.grnD : t.surf3,
      border: `1px solid ${ok ? t.grn : t.bdr}`,
      color: ok ? t.grn : t.txM,
      borderRadius: 4, padding: "3px 10px", fontSize: 11,
      cursor: "pointer", fontFamily: t.mono, transition: "all .2s", flexShrink: 0,
    }}>{ok ? "✓ copied" : "copy"}</button>
  );
}

function DlBtn({ name, content }) {
  const t = useT();
  const dl = () => {
    const b = new Blob([content], { type: "text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = name; a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <button onClick={dl} style={{
      background: t.bluD, border: `1px solid ${t.blu}44`,
      color: t.blu, borderRadius: 4, padding: "4px 13px",
      fontSize: 11, cursor: "pointer", fontFamily: t.mono, flexShrink: 0,
    }}>↓ {name}</button>
  );
}

function UpBtn({ label, onLoad }) {
  const t = useT();
  const ref = useRef();
  const handle = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => onLoad(ev.target.result, f.name);
    r.readAsText(f);
    e.target.value = "";
  };
  return (
    <>
      <input type="file" ref={ref} style={{ display: "none" }} onChange={handle} />
      <button onClick={() => ref.current.click()} style={{
        background: t.accD, border: `1px solid ${t.accB}`,
        color: t.acc, borderRadius: 5, padding: "4px 13px",
        fontSize: 11, cursor: "pointer", fontFamily: t.mono, flexShrink: 0,
      }}>↑ {label}</button>
    </>
  );
}

function Card({ children, style }) {
  const t = useT();
  return (
    <div style={{
      background: t.surf, border: `1px solid ${t.bdr}`,
      borderRadius: 9, padding: 16, ...style,
    }}>{children}</div>
  );
}

function SecHead({ title, sub }) {
  const t = useT();
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.acc, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: t.txM, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Divider() {
  const t = useT();
  return <div style={{ height: 1, background: t.bdr2, margin: "10px 0" }} />;
}

/* ═══════════════════════════════════════════════════════════════
   FILE PATH PANEL
═══════════════════════════════════════════════════════════════ */
function PathPanel({ paths, setPaths }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const upd = (k, v) => setPaths(p => ({ ...p, [k]: v }));
  const rows = [
    { k: "envFile",      label: "setenv.sh path"     },
    { k: "cdciCfg",      label: "cdci_rc.cfg path"   },
    { k: "financialCfg", label: "financial_rc.cfg path" },
    { k: "logFile",      label: "simulator.log path" },
    { k: "startScript",  label: "Start script path"  },
    { k: "stopScript",   label: "Stop script path"   },
  ];
  return (
    <div style={{ background: t.surf2, border: `1px solid ${t.bdr}`, borderRadius: 7, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "none", border: "none", padding: "9px 14px",
        cursor: "pointer", color: t.acc, fontFamily: t.mono, fontSize: 10.5,
      }}>
        <span>⚙  FILE PATH CONFIGURATION</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "6px 14px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "8px 14px" }}>
          {rows.map(r => (
            <div key={r.k}>
              <div style={{ fontSize: 9.5, color: t.txF, fontFamily: t.mono, marginBottom: 3 }}>{r.label}</div>
              <TxtInp value={paths[r.k] || ""} onChange={v => upd(r.k, v)} mono sm />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENV TAB
═══════════════════════════════════════════════════════════════ */
const ENV_DISPLAY = [
  { title:"CBS Response Defaults",  sub:"Default values returned per transaction type",              keys:["BALANCE_ENQUIRY_RESP","LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP","UNBLOCK_EXECUTE_RESP","TXN_STATUS_RESP","CHK_REVERSAL_RESP","LIEN_AMOUNT_RESP","UPDATE_MANDATE_RESP","DEBIT_RESP","CREDIT_RESP","CREDIT_REVERSAL_RESP","DEBIT_REVERSAL_RESP","SET_PIN_RESP","SUCCESS_RC"] },
  { title:"Account Configuration",  sub:"Default account details for CBS list account response",     keys:["ACCOUNT_HOLDER_NAME","CLEAR_ACC_NUMS","IFSC_CODES","MMIDS","AEBA_FLAGS","ACCOUNT_CATEGORIES","ACC_TYPES","MBEBA_FLAGS"] },
  { title:"Random Response Flags",  sub:"Toggle randomised RC per transaction code",                 keys:["ENABLE_RND_010049","ENABLE_RND_010065","ENABLE_RND_010058","ENABLE_RND_010052","ENABLE_RND_010066","ENABLE_RND_010056","ENABLE_RND_010060","ENABLE_RND_010044","ENABLE_RND_010045","ENABLE_RND_010053","ENABLE_RND_010054","ENABLE_RND_010043"] },
  { title:"Behavior Flags",         sub:"Response holding, reversal, check-status behavior",        keys:["ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN","HOLD_REV_RESP","HOLD_CHK_TXN_UDIR_RESP","HOLD_CHK_TXN_RESP","FAIL_REVERSAL_RESP","ENABLE_TXN_ACC_BASE_RC_MAPPING","ENABLE_LIST_ACCOUNT_CFG_FILE","RESPOND_CHK_TXN_RESP","HOLD_CHK_TXN_RESP_ACC","NON_PERSISTENT_ACCOUNT","REVERSAL_FAILURE_RC","DELAY_BUFFER","SUCCESS_TIMEOUT_RCS"] },
  { title:"Redis Configuration",    sub:"Redis connection for transaction state persistence",        keys:["REDIS_SUPPORT","REDIS_HOST","REDIS_PORT","REDIS_USER","REDIS_PASSWORD","REDIS_USE_SSL"] },
];

function EnvTab({ env, setEnv, paths, setPaths, syncSt }) {
  const t = useT();
  const set = (k, v) => setEnv(p => ({ ...p, [k]: v }));
  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <SecHead title="Environment — setenv.sh" sub="Auto-synced · changes save to server automatically" />
            <SyncPill st={syncSt} />
          </div>
          <PathPanel paths={paths} setPaths={setPaths} />
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(460px,1fr))", gap: 14 }}>
          {ENV_DISPLAY.map(g => {
            const allBool = g.keys.every(k => BOOL_SET.has(k));
            return (
              <Card key={g.title}>
                <SecHead title={g.title} sub={g.sub} />
                {allBool ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
                    {g.keys.map(k => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Toggle value={env[k] || "false"} onChange={v => set(k, v)} />
                        <span style={{ fontSize: 10.5, color: t.txM, fontFamily: t.mono }}>{RND_LBL[k] || k}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  g.keys.map(k => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
                      <label style={{ fontSize: 10, color: t.txM, fontFamily: t.mono, minWidth: 180, flexShrink: 0 }}>{k}</label>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        {BOOL_SET.has(k) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Toggle value={env[k] || "false"} onChange={v => set(k, v)} />
                            <span style={{ fontSize: 10.5, fontFamily: t.mono, color: env[k] === "true" ? t.grn : t.red }}>{env[k]}</span>
                          </div>
                        ) : (
                          <TxtInp value={env[k] || ""} onChange={v => set(k, v)} mono sm />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CDCI RC TAB
═══════════════════════════════════════════════════════════════ */
function CdciTab({ std, setStd, sp, setSp, syncSt }) {
  const t = useT();
  const [filter, setFilter] = useState("");
  const uS  = (i, f, v) => setStd(p => p.map((m, j) => j === i ? { ...m, [f]: v } : m));
  const uSp = (i, f, v) => setSp(p  => p.map((m, j) => j === i ? { ...m, [f]: v } : m));
  const shown = std.filter(m => !filter || m.key.includes(filter) || m.rc.includes(filter));

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <SecHead title="cdci_rc.cfg" sub="Account last-4 → RC, delay, inhibit · auto-synced" />
            <SyncPill st={syncSt} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <TxtInp value={filter} onChange={setFilter} mono sm placeholder="filter last4 or rc…" style={{ width: 190 }} />
            <Badge color={t.acc}>{std.length} entries</Badge>
            <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontFamily: t.mono, fontSize: 10, color: t.txF }}>
              {[["00",t.grn],["91",t.amb],["52",t.red],["130",t.pur]].map(([rc, c]) => (
                <span key={rc}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c, marginRight: 4 }} />{rc}</span>
              ))}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 120px", gap: 6, marginBottom: 6, minWidth: 400 }}>
              {["LAST4","RC","DELAY ms","INHIBIT"].map(h => <span key={h} style={{ fontSize: 9.5, color: t.txF, fontFamily: t.mono }}>{h}</span>)}
            </div>
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {shown.map(e => {
                const ri = std.findIndex(x => x.key === e.key);
                return (
                  <div key={e.key} style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 120px", gap: 6, alignItems: "center", padding: "3px 0", borderBottom: `1px solid ${t.bdr2}`, minWidth: 400 }}>
                    <span style={{ fontFamily: t.mono, fontSize: 11, color: t.blu }}>{e.key}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: rcColor(e.rc, t), flexShrink: 0 }} />
                      <TxtInp value={e.rc} onChange={v => uS(ri, "rc", v)} mono sm />
                    </div>
                    <TxtInp value={e.delay} onChange={v => uS(ri, "delay", v)} mono sm placeholder="ms" />
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Toggle value={e.inhibit === "true" ? "true" : "false"} onChange={v => uS(ri, "inhibit", v === "true" ? "true" : "")} />
                      {e.inhibit === "true" && <Badge color={t.amb} sm>HOLD</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <SecHead title="Special Account Mappings" sub="Non-range last-4 overrides" />
            <button onClick={() => setSp(p => [...p, { key:"0000", rc:"000", delay:"", inhibit:"" }])} style={{ background: t.accD, border: `1px solid ${t.accB}`, color: t.acc, borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: t.mono }}>+ Add</button>
          </div>
          {sp.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${t.bdr2}`, flexWrap: "wrap" }}>
              <TxtInp value={e.key} onChange={v => uSp(i, "key", v)} mono sm style={{ width: 64 }} maxLength={4} />
              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: rcColor(e.rc, t), flexShrink: 0 }} />
                <TxtInp value={e.rc} onChange={v => uSp(i, "rc", v)} mono sm />
              </div>
              <TxtInp value={e.delay} onChange={v => uSp(i, "delay", v)} mono sm placeholder="ms" style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Toggle value={e.inhibit === "true" ? "true" : "false"} onChange={v => uSp(i, "inhibit", v === "true" ? "true" : "")} />
                {e.inhibit === "true" && <Badge color={t.amb} sm>HOLD</Badge>}
              </div>
              <button onClick={() => setSp(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: t.red, cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FINANCIAL RC TAB
═══════════════════════════════════════════════════════════════ */
function FinTab({ fin, setFin, la, setLa, syncSt }) {
  const t = useT();
  const uF = (i, f, v) => setFin(p => p.map((m, j) => j === i ? { ...m, [f]: v } : m));
  const uL = (i, f, v) => setLa(p  => p.map((m, j) => j === i ? { ...m, [f]: v } : m));
  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <SecHead title="financial_rc.cfg" sub="TXN_ID.last4 → rc, delay, inhibit per scenario · auto-synced" />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SyncPill st={syncSt} />
              <button onClick={() => setFin(p => [...p, { txn:"010044", last4:"0000", rc:"00", delay:"0", inhibit:"false", lbl:"NEW" }])} style={{ background: t.accD, border: `1px solid ${t.accB}`, color: t.acc, borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: t.mono }}>+ Row</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  {[["TXN ID",90],["TYPE",76],["LAST4",56],["RC",80],["DELAY ms",80],["INHIBIT",80],["LABEL",null],[" ",26]].map(([h, w]) => (
                    <th key={h} style={{ padding: "6px 6px", textAlign: "left", color: t.txF, fontSize: 9.5, fontFamily: t.mono, fontWeight: 500, borderBottom: `1px solid ${t.bdr}`, width: w || undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fin.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}><Sel value={row.txn} onChange={v => uF(i, "txn", v)} options={TXN_OPTS} /></td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}><Badge color={t.blu} sm>{TXN_LBL[row.txn] || row.txn}</Badge></td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}><TxtInp value={row.last4} onChange={v => uF(i, "last4", v)} mono sm maxLength={4} style={{ width: 46 }} /></td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: rcColor(row.rc, t), flexShrink: 0 }} />
                        <TxtInp value={row.rc} onChange={v => uF(i, "rc", v)} mono sm style={{ width: 58 }} />
                      </div>
                    </td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}><TxtInp value={row.delay} onChange={v => uF(i, "delay", v)} mono sm style={{ width: 60 }} /></td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Toggle value={row.inhibit} onChange={v => uF(i, "inhibit", v)} />
                        {row.inhibit === "true" && <Badge color={t.amb} sm>HOLD</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}><TxtInp value={row.lbl} onChange={v => uF(i, "lbl", v)} sm style={{ width: "100%", minWidth: 100 }} /></td>
                    <td style={{ padding: "3px 4px", borderBottom: `1px solid ${t.bdr2}` }}><button onClick={() => setFin(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: t.red, cursor: "pointer", fontSize: 13 }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <SecHead title="List Account Mappings (010042)" sub="Mobile last-4 → holder + accounts pipe-string" />
            <button onClick={() => setLa(p => [...p, { mobile:"0000", holder:"Mr. NAME", accounts:"" }])} style={{ background: t.accD, border: `1px solid ${t.accB}`, color: t.acc, borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: t.mono }}>+ Add</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(460px,1fr))", gap: 10 }}>
            {la.map((item, i) => (
              <div key={i} style={{ background: t.surf2, border: `1px solid ${t.bdr2}`, borderRadius: 7, padding: "10px 12px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ width: 88 }}>
                    <div style={{ fontSize: 9.5, color: t.txF, fontFamily: t.mono, marginBottom: 3 }}>MOBILE LAST4</div>
                    <TxtInp value={item.mobile} onChange={v => uL(i, "mobile", v)} mono sm maxLength={4} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9.5, color: t.txF, fontFamily: t.mono, marginBottom: 3 }}>HOLDER NAME</div>
                    <TxtInp value={item.holder} onChange={v => uL(i, "holder", v)} sm />
                  </div>
                  <button onClick={() => setLa(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: t.red, cursor: "pointer", fontSize: 14, marginTop: 16, flexShrink: 0 }}>✕</button>
                </div>
                <div style={{ fontSize: 9.5, color: t.txF, fontFamily: t.mono, marginBottom: 3 }}>ACCOUNTS (pipe-separated)</div>
                <textarea value={item.accounts} onChange={e => uL(i, "accounts", e.target.value)} rows={2} style={{ width: "100%", background: t.surf, border: `1px solid ${t.bdr}`, borderRadius: 4, color: t.acc, fontFamily: t.mono, fontSize: 11, padding: "6px 10px", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREVIEW TAB
═══════════════════════════════════════════════════════════════ */
function PreviewTab({ env, std, sp, fin, la }) {
  const t = useT();
  const [active, setActive] = useState("env");
  const files = {
    env:      { name: "setenv.sh",        content: genEnv(env)         },
    cdci:     { name: "cdci_rc.cfg",      content: genCdci(std, sp)    },
    financial:{ name: "financial_rc.cfg", content: genFin(fin, la)     },
  };
  const cur = files[active];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", width: "100%", padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Card style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, minHeight: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${t.bdr}`, gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            {Object.entries(files).map(([k, f]) => (
              <button key={k} onClick={() => setActive(k)} style={{
                background: active === k ? t.accD : "transparent",
                border: `1px solid ${active === k ? t.accB : t.bdr}`,
                color: active === k ? t.acc : t.txM,
                borderRadius: 5, padding: "5px 16px", cursor: "pointer",
                fontFamily: t.mono, fontSize: 12, transition: "all .15s",
              }}>{f.name}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <CpyBtn text={cur.content} />
              <DlBtn name={cur.name} content={cur.content} />
            </div>
          </div>
          <pre style={{ flex: 1, margin: 0, padding: "14px 18px", fontFamily: t.mono, fontSize: 11, lineHeight: 1.75, overflowX: "auto", overflowY: "auto", background: "transparent", color: t.tx, minHeight: 0 }}>
            {cur.content.split("\n").map((line, i) => {
              const isCmt = line.trim().startsWith("#");
              const isExp = line.trim().startsWith("export");
              const hasEq = !isCmt && !isExp && line.includes("=");
              if (isCmt) return <span key={i} style={{ display: "block", color: t.txF }}>{line || " "}</span>;
              if (isExp) return <span key={i} style={{ display: "block", color: t.acc }}>{line || " "}</span>;
              if (hasEq) {
                const eq = line.indexOf("=");
                return <span key={i} style={{ display: "block" }}>
                  <span style={{ color: t.blu }}>{line.substring(0, eq)}</span>
                  <span style={{ color: t.txF }}>=</span>
                  <span style={{ color: t.tx }}>{line.substring(eq + 1)}</span>
                </span>;
              }
              return <span key={i} style={{ display: "block", color: t.tx }}>{line || " "}</span>;
            })}
          </pre>
        </Card>
      </div>
    </div>
  );
}



/* ═══════════════════════════════════════════════════════════════
   useSimulator  — lives at App level, never unmounts.
   "Check-first" pattern: every public action verifies the actual
   process state before acting, then toasts if precondition fails.
═══════════════════════════════════════════════════════════════ */
const SRV  = "http://127.0.0.1:3001";
// PROC already declared at module level (line 43)

/* ── Module-level file I/O helpers (use SRV) ────────────────── */
async function fetchFile(path) {
  const r = await fetch(`${SRV}/readfile?path=${encodeURIComponent(path.trim())}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "read failed");
  return d.content;
}
async function writeFile(path, content) {
  const r = await fetch(`${SRV}/writefile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: path.trim(), content }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "write failed");
  return true;
}

function useSimulator(pathsRef) {
  /* ── State ─────────────────────────────────────────────────────── */
  const [simSt,    setSimSt]    = useState("UNKNOWN");
  const [busy,     setBusy]     = useState(false);
  const [serverOk, setServerOk] = useState(null);
  const [opLog,    setOpLog]    = useState([]);
  const [toast,    setToast]    = useState(null);

  /* ── Refs (stable across renders, safe inside async closures) ─── */
  const busyRef  = useRef(false);
  const simStRef = useRef("UNKNOWN");
  const opLogRef = useRef(null);

  /* ── Helpers ────────────────────────────────────────────────────── */
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const setBusyAll  = v => { busyRef.current  = v; setBusy(v); };
  const setSimStAll = s => { simStRef.current = s; setSimSt(s); };

  /* ── Toast (auto-dismiss 3.5 s) ─────────────────────────────────── */
  const showToast = useCallback((msg, type) => {
    setToast({ msg, type: type || "info" });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Operation log ──────────────────────────────────────────────── */
  const addLog = useCallback((text, type) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setOpLog(prev => [
      ...prev.slice(-800),
      { id: Date.now() + Math.random(), ts, text, type: type || "info" },
    ]);
    requestAnimationFrame(() => {
      if (opLogRef.current)
        opLogRef.current.scrollTop = opLogRef.current.scrollHeight;
    });
  }, []);

  /* ── exec: POST /exec to server.js, returns {stdout,stderr,exitCode}|null */
  const exec = useCallback(async function execCmd(cmd) {
    try {
      const res = await fetch(SRV + "/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: cmd }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (_e) {
      return null;
    }
  }, []);

  /* ── pingServer: GET /health, returns server pid or null ─────────── */
  const pingServer = useCallback(async function ping() {
    try {
      const res = await fetch(SRV + "/health");
      const d   = await res.json();
      setServerOk(true);
      return d.pid || true;
    } catch (_e) {
      setServerOk(false);
      return null;
    }
  }, []);

  /* ── checkProcess: the ONLY source of truth for process state ──────
     Runs:  ps -ef | grep simulator-service-1.0.1.jar | grep -v grep
     Returns: { alive: true, pid: "12345" }
           or { alive: false, pid: null }
           or null if the server itself is unreachable.
     NOTE: No pid files are ever read or written anywhere.             */
  const checkProcess = useCallback(async function check() {
    var cmd = 'ps -ef | grep "' + PROC + '" | grep -v grep';
    var d   = await exec(cmd);
    if (!d) return null;
    var lines = (d.stdout || "").split("\n");
    var hits  = lines.filter(function(l) {
      return l.indexOf(PROC) >= 0 && l.indexOf("grep") < 0 && l.indexOf("-jar") >= 0;
    });
    if (hits.length === 0) return { alive: false, pid: null };
    // ps -ef: UID PID PPID C STIME TTY TIME CMD  →  column index 1 is PID
    var pid = hits[0].trim().split(/\s+/)[1] || null;
    return { alive: true, pid: pid };
  }, [exec]);

  /* ══════════════════════════════════════════════════════════════════
     PRIVATE HELPERS  (no busy management — called only by actions)
  ══════════════════════════════════════════════════════════════════ */

  /* _runStart
     ─────────────────────────────────────────────────────────────────
     Sequence
       1. Derive installDir  =  parent of bin/  (where start script lives)
       2. Pre-flight checks  — script exists? executable? show ls -la
       3. Delete stale pid   — rm -f <installDir>/simulator.pid
       4. Launch             — cd <installDir> && bash ./bin/start
                               (cd is CRITICAL: jPOS start script resolves
                                cfg/, logs/, lib/ relative to its own cwd)
       5. Poll ps -ef        — 5 × 1 s  (max 5 s total)
     ─────────────────────────────────────────────────────────────────*/
  const _runStart = useCallback(async function runStart() {
    var p      = pathsRef.current || {};
    var script = (p.startScript || "").trim() ||
      "./modules/simulator-service/build/install/simulator-service/bin/start";

    // ── 1. Derive paths ───────────────────────────────────────────────
    // script  =  <installDir>/bin/start   →  strip last 2 segments
    var parts      = script.replace(/\/+$/, "").split("/");
    var installDir = parts.slice(0, -2).join("/") || ".";
    var pidFile    = installDir + "/simulator.pid";

    // ── 2. Pre-flight: show ls -la so we can see permissions in the log
    addLog("── Pre-flight check:", "info");
    var lsR = await exec("ls -la " + script + " 2>&1 || echo NOT_FOUND");
    if (!lsR) { addLog("Cannot reach server.js", "error"); return false; }
    addLog(lsR.stdout.trim() || "(no output)", lsR.stdout.includes("NOT_FOUND") ? "error" : "out");
    if (lsR.stdout.includes("NOT_FOUND")) {
      addLog("⚠ Start script not found at: " + script, "error");
      addLog("  Check the Start Script path in the Paths section", "warn");
      setSimStAll("STOPPED");
      return false;
    }

    // ── 3. Delete stale pid file ──────────────────────────────────────
    addLog("── Removing stale pid (if any): " + pidFile, "info");
    var rmR = await exec("rm -f " + pidFile + " && echo REMOVED");
    if (!rmR) { addLog("Cannot reach server.js", "error"); return false; }
    addLog("✓ " + (rmR.stdout.trim() || "done"), "ok");

    // ── 4. Launch — must cd to installDir first ───────────────────────
    //    jPOS start script resolves cfg/, logs/, lib/ relative to cwd.
    //    Running it from any other directory will silently fail or crash.
    var launchCmd = "cd " + installDir + " && bash ./bin/start";
    addLog("$ " + launchCmd, "cmd");
    setSimStAll("STARTING");

    var r = await exec(launchCmd);
    if (!r) { addLog("Cannot reach server.js", "error"); return false; }
    if ((r.stdout || "").trim())
      r.stdout.trim().split("\n").forEach(function(l) { addLog(l, "out"); });
    if ((r.stderr || "").trim())
      r.stderr.trim().split("\n").forEach(function(l) { addLog(l, "err"); });
    addLog("exit " + r.exitCode, r.exitCode === 0 ? "ok" : "warn");

    // ── 5. Poll ps -ef — max 5 s (5 × 1 s) ──────────────────────────
    addLog("Polling for process (max 5 s)…", "info");
    for (var i = 1; i <= 5; i++) {
      await sleep(1000);
      var s = await checkProcess();
      if (!s) { addLog("Server unreachable during poll", "error"); return false; }
      if (s.alive) {
        addLog("✓ RUNNING  PID " + s.pid + "  (" + i + "s)", "ok");
        setSimStAll("RUNNING");
        return true;
      }
      addLog("  not yet… (" + i + "s / 5s)", "info");
    }
    addLog("⚠ Process not detected after 5 s — check simulator log tab", "error");
    setSimStAll("STOPPED");
    return false;
  }, [addLog, exec, checkProcess, pathsRef]);

  /* _runStop: send SIGTERM to live PID, poll ps-ef until process gone.
     Accepts the live PID string obtained from checkProcess().
     No stop script, no pid file — pure ps-ef + kill.                 */
  const _runStop = useCallback(async function runStop(livePid) {
    setSimStAll("STOPPING");
    addLog("$ kill " + livePid + "  (SIGTERM)", "cmd");

    var kr = await exec("kill " + livePid);
    if (!kr) { addLog("Cannot reach server.js", "error"); return false; }
    addLog("exit " + kr.exitCode, kr.exitCode === 0 ? "ok" : "warn");
    addLog("Polling for process exit (max 30 s)…", "info");

    for (var i = 1; i <= 10; i++) {
      await sleep(3000);
      var s = await checkProcess();
      if (!s) { addLog("Server unreachable during poll", "error"); return false; }
      if (!s.alive) {
        addLog("✓ Stopped  (" + (i * 3) + "s)", "ok");
        return true;
      }
      addLog("  still running… PID " + s.pid + "  (" + (i * 3) + "s / 30s)", "warn");
    }
    addLog("⚠ Still alive after 30 s — use ☠ KILL -9", "error");
    return false;
  }, [addLog, exec, checkProcess]);

  /* ══════════════════════════════════════════════════════════════════
     PUBLIC ACTIONS
     Every action:
       1. Pings server.js (backend reachability)
       2. Runs ps-ef check (single source of truth for process state)
       3. Acts on the live result
     No pid files are touched at any point.
  ══════════════════════════════════════════════════════════════════ */

  /* START — ps-ef → if stopped, launch */
  const doStart = useCallback(async function doStart() {
    addLog("──── START", "sep");
    setBusyAll(true);
    try {
      var sPid = await pingServer();
      if (sPid === null) {
        addLog("Backend OFFLINE — run: node server.js", "error");
        showToast("server.js is offline", "error");
        setSimStAll("UNKNOWN"); return;
      }
      addLog("Server ONLINE  pid=" + sPid, "ok");

      addLog("$ " + PS_CMD, "cmd");
      var s = await checkProcess();
      if (!s) { addLog("Process check failed", "error"); setSimStAll("UNKNOWN"); return; }

      if (s.alive) {
        addLog("Simulator already RUNNING  PID " + s.pid, "warn");
        showToast("Simulator is already RUNNING", "warn");
        setSimStAll("RUNNING"); return;
      }

      addLog("Process not found — launching…", "info");
      var ok = await _runStart();
      if (!ok) setSimStAll("UNKNOWN");
    } catch (err) {
      addLog("START error: " + err.message, "error");
      setSimStAll("UNKNOWN");
    } finally {
      setBusyAll(false);
    }
  }, [addLog, pingServer, checkProcess, _runStart, showToast]);

  /* STOP — ps-ef → SIGTERM live PID → poll until gone */
  const doStop = useCallback(async function doStop() {
    addLog("──── STOP", "sep");
    setBusyAll(true);
    try {
      var sPid = await pingServer();
      if (sPid === null) {
        addLog("Backend OFFLINE — run: node server.js", "error");
        showToast("server.js is offline", "error");
        setSimStAll("UNKNOWN"); return;
      }
      addLog("Server ONLINE  pid=" + sPid, "ok");

      addLog("$ " + PS_CMD, "cmd");
      var s = await checkProcess();
      if (!s) { addLog("Process check failed", "error"); setSimStAll("UNKNOWN"); return; }

      if (!s.alive) {
        addLog("Process not found — simulator already STOPPED", "info");
        showToast("Simulator is already STOPPED", "info");
        setSimStAll("STOPPED"); return;
      }

      addLog("Process found  PID " + s.pid + " — sending SIGTERM…", "info");
      var ok = await _runStop(s.pid);
      setSimStAll(ok ? "STOPPED" : "RUNNING");
    } catch (err) {
      addLog("STOP error: " + err.message, "error");
      setSimStAll("UNKNOWN");
    } finally {
      setBusyAll(false);
    }
  }, [addLog, pingServer, checkProcess, _runStop, showToast]);

  /* RESTART — ps-ef check:
       RUNNING → SIGTERM live PID → poll until gone → launch
       STOPPED → launch directly
     busyRef guard prevents concurrent invocations from auto-restart. */
  const doRestart = useCallback(async function doRestart() {
    if (busyRef.current) {
      showToast("Operation already in progress — please wait", "warn");
      return;
    }
    addLog("──── RESTART", "sep");
    setBusyAll(true);
    try {
      var sPid = await pingServer();
      if (sPid === null) {
        addLog("Backend OFFLINE — run: node server.js", "error");
        showToast("server.js is offline", "error");
        setSimStAll("UNKNOWN"); return;
      }
      addLog("Server ONLINE  pid=" + sPid, "ok");

      addLog("$ " + PS_CMD, "cmd");
      var s = await checkProcess();
      if (!s) { addLog("Process check failed", "error"); setSimStAll("UNKNOWN"); return; }

      if (s.alive) {
        addLog("Process found  PID " + s.pid + " — stopping first…", "info");
        var stopped = await _runStop(s.pid);
        if (!stopped) { setSimStAll("RUNNING"); return; }
        setSimStAll("STOPPED");
        addLog("Process gone — starting fresh…", "sep");
      } else {
        addLog("Process not found — starting directly…", "info");
      }

      var ok = await _runStart();
      if (!ok) setSimStAll("UNKNOWN");
    } catch (err) {
      addLog("RESTART error: " + err.message, "error");
      setSimStAll("UNKNOWN");
    } finally {
      setBusyAll(false);
    }
  }, [addLog, pingServer, checkProcess, _runStop, _runStart, showToast]);

  /* KILL -9 — collect all live PIDs from ps-ef → SIGKILL each → verify */
  const doKill = useCallback(async function doKill() {
    addLog("──── FORCE KILL  (SIGKILL)", "sep");
    setBusyAll(true);
    try {
      var sPid = await pingServer();
      if (sPid === null) {
        addLog("Backend OFFLINE — cannot execute kill", "error");
        showToast("server.js is offline", "error");
        setSimStAll("UNKNOWN"); return;
      }
      addLog("Server ONLINE  pid=" + sPid, "ok");

      addLog("$ " + PS_CMD, "cmd");
      var d = await exec('ps -ef | grep "' + PROC + '" | grep -v grep');
      if (!d) { addLog("Process check failed", "error"); setSimStAll("UNKNOWN"); return; }

      var pids = (d.stdout || "").split("\n")
        .filter(function(l) {
          return l.indexOf(PROC) >= 0 && l.indexOf("grep") < 0 && l.indexOf("-jar") >= 0;
        })
        .map(function(l) { return l.trim().split(/\s+/)[1]; })
        .filter(Boolean);

      if (pids.length === 0) {
        addLog("No matching process — already STOPPED", "info");
        showToast("Simulator is already STOPPED", "info");
        setSimStAll("STOPPED"); return;
      }

      for (var pi = 0; pi < pids.length; pi++) {
        var p = pids[pi];
        addLog("$ kill -9 " + p, "cmd");
        var kr = await exec("kill -9 " + p);
        if (!kr) { addLog("kill -9 " + p + ": server error", "error"); continue; }
        addLog("exit " + kr.exitCode, kr.exitCode === 0 ? "ok" : "warn");
      }

      addLog("Waiting 2 s for kernel to reap…", "info");
      await sleep(2000);
      var sv = await checkProcess();
      if (!sv) {
        addLog("Server unreachable after kill", "error"); setSimStAll("UNKNOWN");
      } else if (sv.alive) {
        addLog("⚠ Process STILL alive  PID " + sv.pid + " after SIGKILL", "error");
        setSimStAll("RUNNING");
      } else {
        addLog("✓ Process killed — STOPPED", "ok");
        setSimStAll("STOPPED");
      }
    } catch (err) {
      addLog("KILL error: " + err.message, "error");
      setSimStAll("UNKNOWN");
    } finally {
      setBusyAll(false);
    }
  }, [addLog, exec, pingServer, checkProcess, showToast]);

  /* Force-reset — clears stuck busy state */
  const doReset = useCallback(function doReset() {
    setBusyAll(false);
    setSimStAll("UNKNOWN");
    addLog("──── FORCE RESET  (busy cleared)", "warn");
  }, [addLog]);

  /* ── On mount: detect initial process state ─────────────────────── */
  useEffect(function initCheck() {
    (async function() {
      addLog("──── INITIALISING", "sep");
      setBusyAll(true);
      try {
        var pid = await pingServer();
        if (pid === null) {
          addLog("Backend OFFLINE — run: node server.js", "error");
          setSimStAll("UNKNOWN"); return;
        }
        addLog("Server ONLINE  pid=" + pid, "ok");
        addLog("$ " + PS_CMD, "cmd");
        var s = await checkProcess();
        if (!s) { addLog("Process check failed", "error"); setSimStAll("UNKNOWN"); return; }
        if (s.alive) {
          addLog("Process RUNNING  PID " + s.pid, "ok");
          setSimStAll("RUNNING");
        } else {
          addLog("Process NOT running", "info");
          setSimStAll("STOPPED");
        }
      } finally {
        setBusyAll(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    simSt, busy, serverOk, opLog, setOpLog, opLogRef,
    simStRef, busyRef, toast, showToast,
    doStart, doStop, doRestart, doReset,
  };
}

/* ═══════════════════════════════════════════════════════════════
   SimBtn — module-level so React never unmounts/remounts buttons
   on ControlTab re-renders. Receives theme as prop.
═══════════════════════════════════════════════════════════════ */
function SimBtn({ label, icon, color, onClick, disabled, t }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: "10px 6px", minWidth: 0,
        background: disabled ? "transparent" : color + "18",
        border: `1px solid ${disabled ? t.bdr2 : color + "55"}`,
        color: disabled ? t.txF : color,
        borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: t.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
        transition: "all .15s", opacity: disabled ? 0.35 : 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>{label}
    </button>
  );
}

/* Toast — fixed-position popup, never affects layout */
function SimToast({ toast, t }) {
  if (!toast) return null;
  const bg  = { info: t.surf3, warn: t.ambD, error: t.redD }[toast.type] || t.surf3;
  const col = { info: t.txM,   warn: t.amb,  error: t.red  }[toast.type] || t.txM;
  const ico = { info: "ℹ",     warn: "⚠",    error: "✗"    }[toast.type] || "·";
  return (
    <div style={{
      position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 10,
      background: bg, border: `1px solid ${col}55`,
      borderRadius: 8, padding: "10px 22px",
      boxShadow: "0 4px 32px #00000070",
      fontFamily: t.mono, fontSize: 12, color: col,
      whiteSpace: "nowrap", pointerEvents: "none",
      animation: "toastIn .18s ease",
    }}>
      {ico} {toast.msg}
    </div>
  );
}

function logLineColor(line, t) {
  const u = (line || "").toUpperCase();
  if (u.includes("ERROR") || u.includes("EXCEPTION") || u.includes("FATAL")) return t.red;
  if (u.includes("WARN"))  return t.amb;
  if (u.includes("STARTED") || u.includes("SUCCESS") || u.includes("READY")) return t.grn;
  if (u.includes("DEBUG")) return t.txF;
  return t.txM;
}

/* ── SyncPill — shows per-file server sync state ─────────────── */
function SyncPill({ st }) {
  const t = useT();
  if (!st) return null;
  const { state, error, at } = st;
  const timeStr = at ? at.toLocaleTimeString("en-GB", { hour12:false }) : "";
  const cfg = {
    idle:    { color:t.txF,  icon:"—",  label:"not loaded"                          },
    loading: { color:t.blu,  icon:"↻",  label:"loading…",         spin:true          },
    synced:  { color:t.grn,  icon:"✓",  label:`synced ${timeStr}`                   },
    saving:  { color:t.amb,  icon:"↑",  label:"saving…",          spin:true          },
    saved:   { color:t.grn,  icon:"✓",  label:`saved ${timeStr}`                    },
    error:   { color:t.red,  icon:"⚠",  label: error || "error"                     },
  }[state] || { color:t.txF, icon:"—", label:"—" };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontSize:9.5, color:cfg.color, fontFamily:t.mono, whiteSpace:"nowrap",
      background:cfg.color+"18", border:`1px solid ${cfg.color}30`,
      borderRadius:4, padding:"2px 8px", flexShrink:0,
    }}>
      <span style={{ display:"inline-block", animation:cfg.spin?"cSpin .8s linear infinite":"none" }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTROL TAB
   Layout: two-column top row (status+controls | paths+auto-restart)
           full-width operation log fills remaining height
═══════════════════════════════════════════════════════════════ */
function ControlTab({ sim, paths, autoRestart, setAutoRestart, autoDelay, setAutoDelay, pendingRestart }) {
  const t = useT();
  const {
    simSt, busy, serverOk, opLog, setOpLog, opLogRef, toast,
    doStart, doStop, doRestart, doReset,
  } = sim;

  const dp = (() => {
    const p = paths || {};
    return {
      start: (p.startScript || "").trim() || "./modules/simulator-service/build/install/simulator-service/bin/start",
      stop:  (p.stopScript  || "").trim() || "./modules/simulator-service/build/install/simulator-service/bin/stop",
    };
  })();

  const stColor = ({ UNKNOWN:t.txF, STOPPED:t.red, STARTING:t.blu, RUNNING:t.grn, STOPPING:t.amb })[simSt] || t.txF;
  const stPulse = ["STARTING","RUNNING","STOPPING"].includes(simSt);
  const stBg    = stColor + "12";
  const LOG_C   = { sep:t.txF, cmd:t.acc, out:t.txM, err:t.red, ok:t.grn, warn:t.amb, error:t.red, info:t.txM };
  const LOG_I   = { sep:"", cmd:"$", out:" ", err:"!", ok:"\u2713", warn:"\u26a0", error:"\u2717", info:"\u00b7" };

  return (
    <>
      <SimToast toast={toast} t={t} />

      <div style={{
        flex:1, display:"flex", flexDirection:"column", minHeight:0,
        overflow:"hidden", padding:"14px 18px", gap:12,
      }}>

        {/* ══ TOP ROW ══════════════════════════════════════════════════ */}
        <div style={{ display:"flex", gap:12, flexShrink:0, flexWrap:"wrap" }}>

          {/* ── LEFT: Status + Controls ─────────────────────────────── */}
          <Card style={{ flex:"1 1 300px", minWidth:280 }}>

            {/* Backend status pill */}
            <div style={{
              display:"flex", alignItems:"center", gap:8, marginBottom:16,
              padding:"7px 12px", borderRadius:8,
              background: serverOk===null ? t.surf3 : serverOk ? t.grnD : t.redD,
              border: `1px solid ${serverOk===null ? t.bdr : serverOk ? t.grn+"55" : t.red+"55"}`,
            }}>
              <span style={{
                width:7, height:7, borderRadius:"50%", flexShrink:0,
                background: serverOk===null ? t.txM : serverOk ? t.grn : t.red,
                animation: serverOk===null ? "cPing 1.1s ease-out infinite" : "none",
              }}/>
              <span style={{ fontFamily:t.mono, fontSize:10.5, fontWeight:600,
                color: serverOk===null ? t.txM : serverOk ? t.grn : t.red }}>
                {serverOk===null ? "Connecting to server.js\u2026"
                  : serverOk ? "server.js ONLINE \u00b7 127.0.0.1:3001"
                  : "server.js OFFLINE \u2014 run: node server.js"}
              </span>
            </div>

            {/* Big status badge */}
            <div style={{
              display:"flex", alignItems:"center", gap:14, marginBottom:18,
              padding:"12px 16px", borderRadius:10,
              background: stBg, border:`1.5px solid ${stColor}30`,
            }}>
              <div style={{ position:"relative", flexShrink:0, width:18, height:18 }}>
                <span style={{ display:"block", width:18, height:18, borderRadius:"50%", background:stColor }}/>
                {stPulse && (
                  <span style={{
                    position:"absolute", inset:-5, borderRadius:"50%",
                    border:`2px solid ${stColor}`,
                    animation:"cPing 1.4s ease-out infinite", opacity:.5,
                  }}/>
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:t.mono, fontSize:22, fontWeight:800,
                  color:stColor, letterSpacing:4, lineHeight:1 }}>{simSt}</div>
                <div style={{ fontSize:9, color:t.txF, fontFamily:t.mono, marginTop:4,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{PROC}</div>
              </div>
              <div style={{ width:26, flexShrink:0, textAlign:"center" }}>
                {busy && (
                  <span style={{ fontSize:20, color:t.amb, display:"inline-block",
                    animation:"cSpin .65s linear infinite" }}>{"\u21bb"}</span>
                )}
              </div>
            </div>

            {/* Control buttons — START · STOP · RESTART */}
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <SimBtn t={t} icon="&#9654;" label="START"   color={t.grn} disabled={busy} onClick={doStart} />
              <SimBtn t={t} icon="&#9632;" label="STOP"    color={t.red} disabled={busy} onClick={doStop} />
              <SimBtn t={t} icon="&#8634;" label="RESTART" color={t.amb} disabled={busy} onClick={doRestart} />
            </div>

            {/* Working / idle status line */}
            <div style={{ height:18, display:"flex", alignItems:"center" }}>
              {busy
                ? <span style={{ fontFamily:t.mono, fontSize:9.5, color:t.amb, display:"flex", alignItems:"center", gap:8 }}>
                    {"\u21bb"} working\u2026
                    <button onClick={doReset} style={{
                      background:"none", border:"none", color:t.txF,
                      fontFamily:t.mono, fontSize:9.5, cursor:"pointer",
                      textDecoration:"underline", padding:0,
                    }}>force reset</button>
                  </span>
                : <span style={{ fontFamily:t.mono, fontSize:9.5, color:t.txF }}>
                    {pendingRestart ? "\u23f3 pending restart\u2026" : "idle"}
                  </span>
              }
            </div>
          </Card>

          {/* ── RIGHT: Paths + Auto-restart ─────────────────────────── */}
          <Card style={{ flex:"2 1 340px", minWidth:280 }}>

            <SecHead title="Configured Paths" sub="Live values resolved for each action" />
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
              {[
                { lbl:"\u25b6 START", val:dp.start, c:t.grn },
                { lbl:"\u25a0 STOP",  val:dp.stop,  c:t.red },
              ].map(row => (
                <div key={row.lbl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{
                    fontSize:9.5, color:row.c, fontFamily:t.mono, fontWeight:700,
                    flexShrink:0, minWidth:54,
                  }}>{row.lbl}</span>
                  <code style={{
                    fontFamily:t.mono, fontSize:10.5, color:t.acc, flex:1,
                    wordBreak:"break-all", background:t.surf2,
                    border:`1px solid ${t.bdr2}`, borderRadius:5,
                    padding:"4px 10px", minWidth:0,
                  }}>{row.val}</code>
                  <CpyBtn text={row.val} />
                </div>
              ))}
            </div>

            <Divider />

            {/* Auto-restart section */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <Toggle value={autoRestart?"true":"false"} onChange={v => setAutoRestart(v==="true")} />
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontFamily:t.mono, fontSize:11, fontWeight:700,
                    color: autoRestart ? t.grn : t.tx, display:"flex", alignItems:"center", gap:8 }}>
                    Auto-Restart
                    {autoRestart
                      ? <span style={{ fontSize:9, color:t.grn,
                          background:t.grnD, border:`1px solid ${t.grn}44`,
                          borderRadius:4, padding:"1px 6px", letterSpacing:1 }}>ENABLED</span>
                      : <span style={{ fontSize:9, color:t.txF,
                          background:t.surf3, border:`1px solid ${t.bdr}`,
                          borderRadius:4, padding:"1px 6px", letterSpacing:1 }}>DISABLED</span>
                    }
                  </div>
                  <div style={{ fontSize:9.5, color:t.txM, marginTop:3, lineHeight:1.5 }}>
                    {autoRestart
                      ? "Config changes will trigger an automatic restart"
                      : "Config changes are saved but require a manual restart"}
                  </div>
                </div>
                {pendingRestart && <Badge color={t.amb}>{"\u23f3"} pending</Badge>}
              </div>

              <div style={{
                display:"flex", alignItems:"center", gap:10, marginTop:12,
                padding:"8px 12px", borderRadius:7,
                background: autoRestart ? t.accD : t.surf3,
                border:`1px solid ${autoRestart ? t.accB : t.bdr2}`,
                transition:"all .2s",
              }}>
                <span style={{ fontFamily:t.mono, fontSize:10, color: autoRestart ? t.acc : t.txF, flexShrink:0 }}>
                  Delay before restart
                </span>
                <input
                  type="number" min={1} max={60} value={autoDelay}
                  onChange={e => setAutoDelay(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  style={{
                    width:52, background:t.surf, border:`1px solid ${autoRestart ? t.acc+"66" : t.bdr}`,
                    borderRadius:5, color:t.acc, fontFamily:t.mono, fontSize:12,
                    padding:"3px 6px", textAlign:"center", outline:"none",
                    boxShadow: autoRestart ? `0 0 0 2px ${t.acc}18` : "none",
                    transition:"all .2s",
                  }}
                />
                <span style={{ fontFamily:t.mono, fontSize:10, color: autoRestart ? t.acc : t.txF }}>seconds</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ══ OPERATION LOG (fills remaining height) ═══════════════════ */}
        <Card style={{
          flex:1, display:"flex", flexDirection:"column",
          padding:0, overflow:"hidden", minHeight:160,
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"8px 14px", borderBottom:`1px solid ${t.bdr}`,
            flexShrink:0, flexWrap:"wrap",
          }}>
            <span style={{
              fontFamily:t.mono, fontSize:10, color:t.acc,
              letterSpacing:2, textTransform:"uppercase", fontWeight:700, flex:1,
            }}>Operation Log</span>
            <Badge color={t.txF} sm>{opLog.length} entries</Badge>
            <button
              onClick={() => setOpLog([])}
              style={{
                background:"none", border:`1px solid ${t.bdr}`, color:t.txM,
                borderRadius:5, padding:"2px 10px", fontSize:10,
                cursor:"pointer", fontFamily:t.mono,
              }}>
              clear
            </button>
          </div>

          <div ref={opLogRef} style={{
            flex:1, overflowY:"auto", overflowX:"hidden",
            background:t.surf2, fontFamily:t.mono, lineHeight:1.9, minHeight:0,
          }}>
            {opLog.length === 0
              ? <div style={{ color:t.txF, padding:"20px 16px", fontSize:11 }}>
                  Initialising\u2026
                </div>
              : opLog.map(e =>
                  e.type === "sep"
                    ? <div key={e.id} style={{
                        color:t.txF, fontSize:9, letterSpacing:2.5,
                        padding:"8px 14px 3px", marginTop:4,
                        borderTop:`1px solid ${t.bdr}`,
                        textTransform:"uppercase", fontWeight:700,
                      }}>{e.text}</div>
                    : <div key={e.id} style={{ display:"flex", alignItems:"baseline", padding:"1px 0" }}>
                        <span style={{ color:t.txF, fontSize:9.5, flexShrink:0, width:72, paddingLeft:10 }}>{e.ts}</span>
                        <span style={{ color:LOG_C[e.type]||t.txM, flexShrink:0, width:18, textAlign:"center", fontSize:12 }}>{LOG_I[e.type]}</span>
                        <span style={{ color:LOG_C[e.type]||t.txM, flex:1, wordBreak:"break-word", paddingRight:14, fontSize:11.5 }}>{e.text}</span>
                      </div>
                )
            }
          </div>
        </Card>

        <style>{`
          @keyframes cPing  { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.2);opacity:0} }
          @keyframes cSpin  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          @keyframes toastIn{ from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        `}</style>
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id:"env",       icon:"⚙", label:"setenv"                    },
  { id:"cdci",      icon:"⊞", label:"Response Code Config"      },
  { id:"financial", icon:"⊟", label:"Financial Response Config" },
  { id:"preview",   icon:"◈", label:"Preview"                   },
  { id:"control",   icon:"⏻", label:"Control"                   },
];

export default function App() {
  const [dark,    setDark]    = useState(true);
  const [tab,     setTab]     = useState("env");
  const [env,     setEnv]     = useState(() => ({ ...DEF_ENV }));
  const [std,     setStd]     = useState(mkCdciStd);
  const [sp,      setSp]      = useState(() => [...DEF_SP]);
  const [fin,     setFin]     = useState(() => [...DEF_FIN]);
  const [la,      setLa]      = useState(() => [...DEF_LA]);
  const [paths,   setPaths]   = useState(() => {
    try {
      const saved = localStorage.getItem("cbs_paths");
      if (saved) return { ...DEF_PATHS, ...JSON.parse(saved) };
    } catch (_err) {}
    return { ...DEF_PATHS };
  });
  const [autoR,     setAutoR]     = useState(false);
  const [autoDelay, setAutoDelay] = useState(5);
  const autoRRef = useRef(false);   // stable ref — safe inside async closures
  const [pending,   setPending]   = useState(false);
  const [flash,     setFlash]     = useState(false);

  /* ── Stable value refs (for use inside async callbacks) ── */
  const debRef   = useRef();
  const pathsRef = useRef(paths);
  const envRef   = useRef(env);
  const stdRef   = useRef(std);
  const spRef    = useRef(sp);
  const finRef   = useRef(fin);
  const laRef    = useRef(la);
  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { envRef.current   = env;   }, [env]);
  useEffect(() => { stdRef.current   = std;   }, [std]);
  useEffect(() => { spRef.current    = sp;    }, [sp]);
  useEffect(() => { finRef.current   = fin;   }, [fin]);
  useEffect(() => { laRef.current    = la;    }, [la]);
  useEffect(() => { autoRRef.current = autoR; }, [autoR]);

  /* ── Per-file sync status ─────────────────────────────── */
  const [syncSt, setSyncSt] = useState({
    env:  { state:"idle", error:null, at:null },
    cdci: { state:"idle", error:null, at:null },
    fin:  { state:"idle", error:null, at:null },
  });
  const updSyncSt = useCallback((key, upd) =>
    setSyncSt(s => ({ ...s, [key]: { ...s[key], ...upd } })), []);

  /* Whether user has unsaved in-memory edits (blocks file-watch overwrite) */
  const hasEditsRef = useRef(false);

  /* ── Load a config from server & parse into state ─────── */
  const loadConfig = useCallback(async (key, path, parser, apply) => {
    if (!path || !path.trim()) return;
    updSyncSt(key, { state:"loading", error:null });
    try {
      const content = await fetchFile(path);
      apply(parser(content));
      updSyncSt(key, { state:"synced", error:null, at:new Date() });
    } catch (e) {
      updSyncSt(key, { state:"error", error:e.message, at:null });
    }
  }, [updSyncSt]);

  /* ── Paths persisted to localStorage ─────────────────── */
  const sim   = useSimulator(pathsRef);
  const theme = dark ? DARK : LIGHT;

  useEffect(() => {
    try { localStorage.setItem("cbs_paths", JSON.stringify(paths)); } catch (_err) {}
  }, [paths]);

  /* ── Auto-load files when their paths are set / change ── */
  useEffect(() => {
    loadConfig("env",  paths.envFile,      parseEnv,
      d => setEnv(p => ({ ...p, ...d })));
  }, [paths.envFile]); // eslint-disable-line

  useEffect(() => {
    loadConfig("cdci", paths.cdciCfg,      parseCdci,
      ({ std: s, sp: x }) => { if (s.length) setStd(s); if (x.length) setSp(x); });
  }, [paths.cdciCfg]); // eslint-disable-line

  useEffect(() => {
    loadConfig("fin",  paths.financialCfg, parseFin,
      ({ fin: f, la: l }) => { if (f.length) setFin(f); if (l.length) setLa(l); });
  }, [paths.financialCfg]); // eslint-disable-line

  /* ── File-watch: re-fetch silently every 15 s if no pending edits ── */
  const lastKnownRef   = useRef({ env:"", cdci:"", fin:"" });
  const watchTimerRef  = useRef();
  useEffect(() => {
    clearInterval(watchTimerRef.current);
    watchTimerRef.current = setInterval(async () => {
      if (hasEditsRef.current) return;     // user is editing — skip
      const p = pathsRef.current;
      const poll = async (key, path, parser, apply) => {
        if (!path || !path.trim()) return;
        try {
          const c = await fetchFile(path);
          if (c !== lastKnownRef.current[key]) {
            lastKnownRef.current[key] = c;
            apply(parser(c));
            updSyncSt(key, { state:"synced", error:null, at:new Date() });
          }
        } catch (_err) {}
      };
      await Promise.all([
        poll("env",  p.envFile,      parseEnv,
          d => setEnv(prev => ({ ...prev, ...d }))),
        poll("cdci", p.cdciCfg,      parseCdci,
          ({ std: s, sp: x }) => { if (s.length) setStd(s); if (x.length) setSp(x); }),
        poll("fin",  p.financialCfg, parseFin,
          ({ fin: f, la: l }) => { if (f.length) setFin(f); if (l.length) setLa(l); }),
      ]);
    }, 15000);
    return () => clearInterval(watchTimerRef.current);
  }, [paths.envFile, paths.cdciCfg, paths.financialCfg, updSyncSt]);

  /* ── Save all 3 configs to server atomically ─────────── */
  const saveAll = useCallback(async () => {
    const p = pathsRef.current;
    const save = async (key, path, content) => {
      updSyncSt(key, { state:"saving" });
      try {
        await writeFile(path || DEF_PATHS[key === "env" ? "envFile" : key === "cdci" ? "cdciCfg" : "financialCfg"], content);
        const at = new Date();
        updSyncSt(key, { state:"saved", error:null, at });
        lastKnownRef.current[key] = content;
        return true;
      } catch (e) {
        updSyncSt(key, { state:"error", error:e.message, at:null });
        return false;
      }
    };
    const [ok1, ok2, ok3] = await Promise.all([
      save("env",  p.envFile      || DEF_PATHS.envFile,      genEnv(envRef.current)),
      save("cdci", p.cdciCfg      || DEF_PATHS.cdciCfg,      genCdci(stdRef.current, spRef.current)),
      save("fin",  p.financialCfg || DEF_PATHS.financialCfg, genFin(finRef.current, laRef.current)),
    ]);
    return ok1 && ok2 && ok3;
  }, [updSyncSt]);

  /* ── simRef: always holds latest sim so async callbacks never
     hold a stale closure. Updated inline on every render.       */
  const simRef = useRef(null);
  simRef.current = sim;

  /* ── markChange: debounce → save → act based on auto-restart + sim state
     ────────────────────────────────────────────────────────────────────────
     Branch matrix (evaluated AFTER successful save):

     Auto-restart OFF  (any sim state)
       → toast: "Auto-restart is disabled. Please enable auto-restart to sync
                 changes with the server. Note: If not enabled, changes will
                 be reflected on the next restart."

     Auto-restart ON + sim RUNNING
       → restart immediately (doRestart)

     Auto-restart ON + sim STOPPED
       → toast: "The simulator is currently stopped but will be launched
                 because auto-restart is enabled."
       → start immediately (doStart)

     Auto-restart ON + another operation already busy
       → toast: "Config saved · Another operation in progress — retry shortly"
     ─────────────────────────────────────────────────────────────────────── */
  const markChange = useCallback(() => {
    hasEditsRef.current = true;
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      const ok = await saveAll();
      hasEditsRef.current = false;
      const s = simRef.current;   // always latest sim instance, never stale

      if (!ok) {
        s && s.showToast("⚠ Save failed — check paths and server.js", "error");
        return;
      }

      // ── Auto-restart DISABLED ────────────────────────────────────────
      if (!autoRRef.current) {
        s && s.showToast(
          "Auto-restart is disabled. Please enable auto-restart to sync changes with the server. " +
          "Note: If not enabled, changes will be reflected on the next restart.",
          "warn"
        );
        return;
      }

      // ── Auto-restart ENABLED ─────────────────────────────────────────
      if (!s) return;

      if (s.busyRef.current) {
        s.showToast("Config saved · Another operation in progress — retry shortly", "warn");
        return;
      }

      if (s.simStRef.current === "RUNNING") {
        // Simulator running → restart with latest config
        setPending(true);
        s.doRestart().finally(() => setPending(false));
      } else {
        // Simulator stopped → inform user then start it
        s.showToast(
          "The simulator is currently stopped but will be launched because auto-restart is enabled.",
          "info"
        );
        setPending(true);
        s.doStart().finally(() => setPending(false));
      }
    }, autoDelay * 1000);
  }, [autoDelay, saveAll]); // eslint-disable-line

  const wrap = setter => updater => { setter(updater); markChange(); };

  return (
    <Ctx.Provider value={theme}>
      <style>{`
        body { background: ${theme.bg}; color: ${theme.tx}; }
        ::-webkit-scrollbar-track { background: ${theme.surf2}; }
        ::-webkit-scrollbar-thumb { background: ${theme.bdr}; border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: ${theme.txF} !important; }
        select option { background: ${theme.surf}; color: ${theme.tx}; }
        textarea { outline: none; }
        @keyframes cPing { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.2);opacity:0} }
      `}</style>

      <div style={{ display:"flex", flexDirection:"column", width:"100vw", height:"100vh", background:theme.bg, color:theme.tx, overflow:"hidden" }}>

        <header style={{ background:theme.surf, borderBottom:`1px solid ${theme.bdr}`, padding:"0 16px", display:"flex", alignItems:"center", gap:8, flexShrink:0, flexWrap:"wrap", boxShadow:dark?"0 2px 20px #00000050":"0 2px 12px #0000001a", zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", flexShrink:0 }}>
            <div style={{ width:32, height:32, background:theme.accD, border:`1px solid ${theme.accB}`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
            <div>
              <div style={{ fontFamily:theme.mono, fontSize:12, color:theme.acc, fontWeight:600, letterSpacing:1.5 }}>CBS SIMULATOR</div>
              <div style={{ fontSize:8, color:theme.txF, fontFamily:theme.mono, letterSpacing:3 }}>CONFIG MANAGER</div>
            </div>
          </div>
          <div style={{ width:1, height:28, background:theme.bdr, flexShrink:0 }} />
          <nav style={{ display:"flex", gap:2, flexWrap:"wrap", flex:1 }}>
            {TABS.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                background: tab===tb.id ? theme.accD : "transparent",
                border: `1px solid ${tab===tb.id ? theme.accB : "transparent"}`,
                color: tab===tb.id ? theme.acc : theme.txM,
                borderRadius:5, padding:"7px 10px", cursor:"pointer",
                fontFamily:theme.mono, fontSize:11, fontWeight:500,
                transition:"all .15s", display:"flex", alignItems:"center",
                gap:4, whiteSpace:"nowrap",
              }}>
                {tb.icon} {tb.label}
                {tb.id==="control" && sim.busy && tab!=="control" && (
                  <span style={{ width:6, height:6, borderRadius:"50%", background:theme.amb, display:"inline-block", marginLeft:2, animation:"cPing 1.2s ease-out infinite" }} />
                )}
                {tb.id==="control" && pending && !sim.busy && (
                  <span style={{ width:6, height:6, borderRadius:"50%", background:theme.acc, display:"inline-block", marginLeft:2 }} />
                )}
              </button>
            ))}
          </nav>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", padding:"6px 0" }}>
            {flash   && <Badge color={theme.amb} sm>● changed</Badge>}
            {pending && <Badge color={theme.amb} sm>↺ pending</Badge>}
            <button onClick={() => setDark(d => !d)} style={{ background:theme.surf2, border:`1px solid ${theme.bdr}`, borderRadius:6, padding:"5px 10px", cursor:"pointer", color:theme.tx, fontFamily:theme.mono, fontSize:11, display:"flex", alignItems:"center", gap:5, transition:"all .2s" }}>
              {dark ? "☀ Light" : "◑ Dark"}
            </button>
          </div>
        </header>

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
          {tab==="env"       && <EnvTab  env={env} setEnv={wrap(setEnv)} paths={paths} setPaths={setPaths} syncSt={syncSt.env} />}
          {tab==="cdci"      && <CdciTab std={std} setStd={wrap(setStd)} sp={sp} setSp={wrap(setSp)} syncSt={syncSt.cdci} />}
          {tab==="financial" && <FinTab  fin={fin} setFin={wrap(setFin)} la={la} setLa={wrap(setLa)} syncSt={syncSt.fin} />}
          {tab==="preview"   && <PreviewTab env={env} std={std} sp={sp} fin={fin} la={la} />}
          {tab==="control"   && <ControlTab sim={sim} paths={paths} autoRestart={autoR} setAutoRestart={setAutoR} autoDelay={autoDelay} setAutoDelay={setAutoDelay} pendingRestart={pending} />}
        </div>
      </div>
    </Ctx.Provider>
  );
}
