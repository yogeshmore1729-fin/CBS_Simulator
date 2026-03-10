import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

const DARK = {
  bg:"#080c10", surface:"#0d1117", surface2:"#161b22", surface3:"#21262d",
  border:"#30363d", border2:"#1e2530",
  text:"#e6edf3", textMuted:"#8b949e", textFaint:"#484f58",
  accent:"#f0883e", accentDim:"#f0883e16", accentBorder:"#f0883e50",
  green:"#3fb950", greenDim:"#3fb95018",
  red:"#f85149",   redDim:"#f8514918",
  amber:"#d29922", amberDim:"#d2992218",
  blue:"#58a6ff",  blueDim:"#58a6ff18",
  purple:"#bc8cff",
  mono:"'IBM Plex Mono', monospace",
  sans:"'IBM Plex Sans', sans-serif",
};
const LIGHT = {
  bg:"#f5f0e8", surface:"#fffef9", surface2:"#ede8dd", surface3:"#e0d9cc",
  border:"#c8c0b0", border2:"#ddd8cc",
  text:"#1c1814", textMuted:"#6b5e4e", textFaint:"#a8998a",
  accent:"#b85c00", accentDim:"#b85c0010", accentBorder:"#b85c0044",
  green:"#1a7f37", greenDim:"#1a7f3710",
  red:"#cf222e",   redDim:"#cf222e10",
  amber:"#9a6700", amberDim:"#9a670010",
  blue:"#0550ae",  blueDim:"#0550ae10",
  purple:"#5e35b1",
  mono:"'IBM Plex Mono', monospace",
  sans:"'IBM Plex Sans', sans-serif",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TXN_OPTIONS = ["010042","010043","010044","010045","010049","010052","010053","010054","010056","010058","010060","010065","010066"];
const TXN_LABELS  = { "010042":"LIST_ACCT","010043":"SET_PIN","010044":"DEBIT","010045":"CREDIT","010049":"BAL_INQ","010052":"CHK_STATUS","010053":"CREDIT_REV","010054":"DEBIT_REV","010056":"LIEN","010058":"UNBLOCK","010060":"UPD_MANDATE","010065":"LIEN_WO_PIN","010066":"CHK_UDIR" };
const BOOL_KEYS = new Set(["ENABLE_RND_010049","ENABLE_RND_010065","ENABLE_RND_010058","ENABLE_RND_010052","ENABLE_RND_010066","ENABLE_RND_010056","ENABLE_RND_010060","ENABLE_RND_010044","ENABLE_RND_010045","ENABLE_RND_010053","ENABLE_RND_010054","ENABLE_RND_010043","ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN","HOLD_REV_RESP","HOLD_CHK_TXN_UDIR_RESP","HOLD_CHK_TXN_RESP","FAIL_REVERSAL_RESP","ENABLE_TXN_ACC_BASE_RC_MAPPING","ENABLE_LIST_ACCOUNT_CFG_FILE","RESPOND_CHK_TXN_RESP","REDIS_SUPPORT","REDIS_USE_SSL"]);
const RND_LABELS = { ENABLE_RND_010049:"BAL_INQ",ENABLE_RND_010065:"LIEN_WO_PIN",ENABLE_RND_010058:"UNBLOCK",ENABLE_RND_010052:"CHK_STATUS",ENABLE_RND_010066:"CHK_UDIR",ENABLE_RND_010056:"LIEN",ENABLE_RND_010060:"UPD_MANDATE",ENABLE_RND_010044:"DEBIT",ENABLE_RND_010045:"CREDIT",ENABLE_RND_010053:"CREDIT_REV",ENABLE_RND_010054:"DEBIT_REV",ENABLE_RND_010043:"SET_PIN" };
const getRcColor = (rc, t) => { const b=(rc||"").split("|")[0]; if(b==="00") return t.green; if(b==="91") return t.amber; if(["52","89","90","NP"].includes(b)) return t.red; if(b==="130") return t.purple; return t.textMuted; };

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_ENV = {
  BALANCE_ENQUIRY_RESP:"75457.080-CR|75474.080-CR",LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP:"000062631|27032025",
  UNBLOCK_EXECUTE_RESP:"000062644",TXN_STATUS_RESP:"00",CHK_REVERSAL_RESP:"00|NA",
  LIEN_AMOUNT_RESP:"000162663|28032025",UPDATE_MANDATE_RESP:"000043957|24032025",
  DEBIT_RESP:"00",CREDIT_RESP:"00",CREDIT_REVERSAL_RESP:"00",DEBIT_REVERSAL_RESP:"00",SET_PIN_RESP:"00",SUCCESS_RC:"00",
  ACCOUNT_HOLDER_NAME:"Mr. RAJAT SINGH",CLEAR_ACC_NUMS:"60347139856,60347137532",
  IFSC_CODES:"MAHB0001157,MAHB0001192",MMIDS:"",AEBA_FLAGS:"Y,N",ACCOUNT_CATEGORIES:"SB,CC",ACC_TYPES:"GEN,GEN",MBEBA_FLAGS:"N,Y",
  ENABLE_RND_010049:"true",ENABLE_RND_010065:"true",ENABLE_RND_010058:"true",ENABLE_RND_010052:"true",
  ENABLE_RND_010066:"true",ENABLE_RND_010056:"true",ENABLE_RND_010060:"true",ENABLE_RND_010044:"true",
  ENABLE_RND_010045:"true",ENABLE_RND_010053:"true",ENABLE_RND_010054:"true",ENABLE_RND_010043:"true",
  ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN:"true",HOLD_REV_RESP:"false",HOLD_CHK_TXN_UDIR_RESP:"false",
  HOLD_CHK_TXN_RESP:"false",FAIL_REVERSAL_RESP:"false",ENABLE_TXN_ACC_BASE_RC_MAPPING:"true",
  ENABLE_LIST_ACCOUNT_CFG_FILE:"true",RESPOND_CHK_TXN_RESP:"true",
  HOLD_CHK_TXN_RESP_ACC:"00000100048445124",NON_PERSISTENT_ACCOUNT:"00000100048445125",
  REVERSAL_FAILURE_RC:"90",DELAY_BUFFER:"100",SUCCESS_TIMEOUT_RCS:"00,91",
  REDIS_SUPPORT:"true",REDIS_HOST:"127.0.0.1",REDIS_PORT:"6379",REDIS_USER:"appredis",
  REDIS_PASSWORD:"#162fdbc2f46bbce7bf045ed3201873bdc6344857864544dfa35bf3d02e0ad5ba",REDIS_USE_SSL:"false",
};

const buildCdciStd = () => Array.from({length:100},(_,i)=>{
  const n=i+1, k=String(n).padStart(3,"0");
  if([81,82,83,84,85].includes(n)) return{key:k,rc:"000",delay:"",inhibit:"true"};
  if(n===86)return{key:k,rc:"000",delay:"1000",inhibit:""};if(n===87)return{key:k,rc:"000",delay:"2000",inhibit:""};
  if(n===88)return{key:k,rc:"000",delay:"3000",inhibit:""};if(n===89)return{key:k,rc:"000",delay:"5000",inhibit:""};
  if(n===90)return{key:k,rc:"000",delay:"6000",inhibit:""};if(n===91)return{key:k,rc:"130",delay:"7000",inhibit:""};
  if(n===92)return{key:k,rc:"130",delay:"8000",inhibit:""};if(n===93)return{key:k,rc:"130",delay:"9000",inhibit:""};
  if(n===94)return{key:k,rc:"130",delay:"1000",inhibit:""};if(n===95)return{key:k,rc:"130",delay:"2000",inhibit:"true"};
  if(n>=96)return{key:k,rc:"130",delay:"",inhibit:""};
  return{key:k,rc:"000",delay:"",inhibit:""};
});

const DEFAULT_CDCI_SP=[{key:"7790",rc:"00",delay:"",inhibit:"true"}];
const DEFAULT_FIN=[
  {txn:"010043",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"SET_PIN"},
  {txn:"010044",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"DEBIT DRC-102"},
  {txn:"010044",last4:"0918",rc:"00",delay:"100",inhibit:"false",label:"DEBIT DRC-102b"},
  {txn:"010044",last4:"7792",rc:"00",delay:"100",inhibit:"true",label:"DEBIT DRC-103"},
  {txn:"010044",last4:"7790",rc:"52",delay:"0",inhibit:"true",label:"DEBIT DRC-104"},
  {txn:"010044",last4:"7791",rc:"00",delay:"0",inhibit:"false",label:"DEBIT DRC-UT1"},
  {txn:"010044",last4:"9999",rc:"52",delay:"0",inhibit:"false",label:"DEBIT FAILURE"},
  {txn:"010044",last4:"2419",rc:"00",delay:"0",inhibit:"false",label:"DEBIT SUCCESS"},
  {txn:"010045",last4:"2419",rc:"00",delay:"100",inhibit:"false",label:"CREDIT SUCCESS"},
  {txn:"010045",last4:"0999",rc:"91",delay:"100",inhibit:"true",label:"CREDIT HELD"},
  {txn:"010045",last4:"5124",rc:"52",delay:"0",inhibit:"true",label:"CREDIT RET-114"},
  {txn:"010045",last4:"5125",rc:"91",delay:"0",inhibit:"true",label:"CREDIT BUU-NO"},
  {txn:"010052",last4:"7789",rc:"91",delay:"100",inhibit:"true",label:"CHK_STATUS"},
  {txn:"010053",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"CREDIT_REV"},
  {txn:"010054",last4:"7789",rc:"91",delay:"100",inhibit:"true",label:"DEBIT_REV"},
  {txn:"010056",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"LIEN_AMOUNT"},
  {txn:"010058",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"UNBLOCK_EXEC"},
  {txn:"010060",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"UPDATE_MANDATE"},
  {txn:"010065",last4:"7789",rc:"00",delay:"100",inhibit:"false",label:"LIEN_WO_PIN"},
  {txn:"010066",last4:"7789",rc:"00|00",delay:"100",inhibit:"false",label:"CHK_UDIR"},
];
const DEFAULT_LA=[
  {mobile:"9527",holder:"Mr. RAJAT SINGH",accounts:"68017922488-XXXXXXX2488-MAHB0000174- -N-SB-GEN-NA|60398953145-XXXXXXX3145-MAHB0001379- -N-CC-SOD-NA|"},
  {mobile:"9528",holder:"Mr. RAJESH PATIL",accounts:"60347131234-XXXXXXX1234-MAHB0001158--N-SB-GEN-N|60347139834-XXXXXXX9834-MAHB0001158--N-CC-GEN-N"},
  {mobile:"9529",holder:"Mr. YOGESH JADHAV",accounts:"60347130987-XXXXXXX0987-MAHB0001127--N-CL07-GEN-Y|"},
  {mobile:"9601",holder:"Mr. AMIT SHARMA",accounts:"60347140001-XXXXXXX0001-MAHB0001157--N-SB-GEN-Y|"},
  {mobile:"9607",holder:"Ms. PRIYA NAIR",accounts:"60347140661-XXXXXXX6661-MAHB0001157--Y-SB-GEN-Y|"},
  {mobile:"9608",holder:"Mr. ROHAN VERMA",accounts:"60347140771-XXXXXXX7771-MAHB0001157--N-SB-GEN-Y|"},
];
const DEFAULT_PATHS={
  envFile:"/home/yogesh.more@sarvatra.in/Desktop/Gitlab/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service/bin/setenv.sh",
  cdciCfg:"/home/yogesh.more@sarvatra.in/Desktop/Gitlab/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service/cfg/cdci_rc.cfg",
  financialCfg:"/home/yogesh.more@sarvatra.in/Desktop/Gitlab/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service/cfg/financial_rc.cfg",
  logFile:"/home/yogesh.more@sarvatra.in/Desktop/Gitlab/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service/log/simulator.log",
  startScript:"./home/yogesh.more@sarvatra.in/Desktop/Gitlab/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service/bin/start",
  stopScript:"./home/yogesh.more@sarvatra.in/Desktop/Gitlab/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service/bin/stop",
};

// ─── PARSERS ─────────────────────────────────────────────────────────────────
function parseEnvFile(text) {
  const r={};
  text.split("\n").forEach(raw=>{
    const line=raw.trim(); if(!line||line.startsWith("#")) return;
    const m=line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*?)(?:\s{2,}#.*)?$/); if(!m) return;
    const key=m[1], rawVal=(m[2]||"").trim();
    const def=rawVal.match(/^\$\{[A-Z0-9_]+:-"?([^"}\n]*)"?\}/); if(def){r[key]=def[1];return;}
    const q=rawVal.match(/^"([^"]*)"$/); if(q){r[key]=q[1];return;}
    r[key]=rawVal.replace(/\s+#.*$/,"");
  });
  return r;
}
function parseCdci(text) {
  const std=[],sp=[];
  text.split("\n").forEach(raw=>{
    const line=raw.trim(); if(!line||line.startsWith("#")) return;
    const eq=line.indexOf("="); if(eq<0) return;
    const key=line.substring(0,eq).trim(), val=line.substring(eq+1).trim(), p=val.split(",");
    const e={key,rc:p[0]||"",delay:p[1]||"",inhibit:p[2]||""};
    (/^\d{3}$/.test(key)?std:sp).push(e);
  });
  return{std,sp};
}
function parseFinancial(text) {
  const fin=[],la=[];
  text.split("\n").forEach(raw=>{
    const line=raw.trim(); if(!line||line.startsWith("#")) return;
    const eq=line.indexOf("="); if(eq<0) return;
    const key=line.substring(0,eq).trim(), val=line.substring(eq+1).trim();
    const mH=key.match(/^010042\.(\d{4})\.holder$/); if(mH){la.push({mobile:mH[1],holder:val,accounts:""});return;}
    const mA=key.match(/^010042\.(\d{4})\.accounts$/); if(mA){const f=la.find(x=>x.mobile===mA[1]);if(f)f.accounts=val;return;}
    const mF=key.match(/^(\d{6})\.(\d{4})$/); if(mF){const p=val.split(",");fin.push({txn:mF[1],last4:mF[2],rc:p[0]||"00",delay:p[1]||"0",inhibit:p[2]||"false",label:TXN_LABELS[mF[1]]||mF[1]});}
  });
  return{fin,la};
}

// ─── GENERATORS ──────────────────────────────────────────────────────────────
function genEnv(env){
  const G=[
    {c:"# CBS RESPONSE DEFAULTS",k:["BALANCE_ENQUIRY_RESP","LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP","UNBLOCK_EXECUTE_RESP","TXN_STATUS_RESP","CHK_REVERSAL_RESP","LIEN_AMOUNT_RESP","UPDATE_MANDATE_RESP","DEBIT_RESP","CREDIT_RESP","CREDIT_REVERSAL_RESP","DEBIT_REVERSAL_RESP","SET_PIN_RESP","SUCCESS_RC"]},
    {c:"# ACCOUNT CONFIGURATION",k:["ACCOUNT_HOLDER_NAME","CLEAR_ACC_NUMS","IFSC_CODES","MMIDS","AEBA_FLAGS","ACCOUNT_CATEGORIES","ACC_TYPES","MBEBA_FLAGS"]},
    {c:"# RANDOM RESPONSE FLAGS",k:["ENABLE_RND_010049","ENABLE_RND_010065","ENABLE_RND_010058","ENABLE_RND_010052","ENABLE_RND_010066","ENABLE_RND_010056","ENABLE_RND_010060","ENABLE_RND_010044","ENABLE_RND_010045","ENABLE_RND_010053","ENABLE_RND_010054","ENABLE_RND_010043"]},
    {c:"# BEHAVIOR FLAGS",k:["ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN","HOLD_REV_RESP","HOLD_CHK_TXN_UDIR_RESP","HOLD_CHK_TXN_RESP","FAIL_REVERSAL_RESP","ENABLE_TXN_ACC_BASE_RC_MAPPING","ENABLE_LIST_ACCOUNT_CFG_FILE","RESPOND_CHK_TXN_RESP","HOLD_CHK_TXN_RESP_ACC","NON_PERSISTENT_ACCOUNT","REVERSAL_FAILURE_RC","DELAY_BUFFER","SUCCESS_TIMEOUT_RCS"]},
    {c:"# REDIS CONFIGURATION",k:["REDIS_SUPPORT","REDIS_HOST","REDIS_PORT","REDIS_USER","REDIS_PASSWORD","REDIS_USE_SSL"]},
  ];
  let o="#!/bin/bash\n\necho \"Setting up Env for CBS Simulator\"\n\n";
  G.forEach(g=>{o+=g.c+"\n";g.k.forEach(k=>{if(env[k]!==undefined)o+=`export ${k}=\${${k}:-"${env[k]}"}\n`;});o+="\n";});
  return o;
}
function genCdci(std,sp){
  let o="#<last4>=rc,delay,inhibit\n";
  const fmt=m=>{let v=m.rc;if(m.delay||m.inhibit)v+=","+(m.delay||"");if(m.inhibit)v+=","+m.inhibit;o+=`${m.key}=${v}\n`;};
  std.forEach(fmt);
  if(sp.length){o+="\n# Special account mappings\n";sp.forEach(fmt);}
  return o;
}
function genFinancial(fin,la){
  let o="#########################################################################\n# FINANCIAL RC MAPPINGS\n#########################################################################\n\n";
  fin.forEach(m=>{o+=`# ${m.label}\n${m.txn}.${m.last4}=${m.rc},${m.delay},${m.inhibit}\n\n`;});
  o+="\n#########################################################################\n# LIST ACCOUNT (010042) MAPPINGS\n#########################################################################\n\n";
  la.forEach(a=>{o+=`010042.${a.mobile}.holder=${a.holder}\n010042.${a.mobile}.accounts=${a.accounts}\n\n`;});
  return o;
}

// ─── LOG COLORIZER ────────────────────────────────────────────────────────────
function logColor(line, t) {
  const u=(line||"").toUpperCase();
  if(u.includes(" ERROR")||u.includes("EXCEPTION")||u.includes("FATAL")) return t.red;
  if(u.includes(" WARN")||u.includes("WARNING")) return t.amber;
  if(u.includes("STARTED")||u.includes("RUNNING")||u.includes("SUCCESS")||u.includes("READY")) return t.green;
  if(u.includes(" DEBUG")) return t.textFaint;
  if(u.includes("STOPPED")||u.includes("SHUTDOWN")) return t.amber;
  return t.textMuted;
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Inp({value,onChange,mono,small,style,...rest}){
  const t=useTheme();const[f,sf]=useState(false);
  return <input value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>sf(true)} onBlur={()=>sf(false)}
    style={{background:t.surface,border:`1px solid ${f?t.accent:t.border}`,borderRadius:5,color:mono?t.accent:t.text,
      fontFamily:mono?t.mono:t.sans,fontSize:small?11:13,padding:small?"3px 8px":"7px 11px",
      width:"100%",outline:"none",boxSizing:"border-box",transition:"border-color .15s, box-shadow .15s",
      boxShadow:f?`0 0 0 3px ${t.accentDim}`:"none",...style}} {...rest}/>;
}
function Tog({value,onChange}){
  const t=useTheme();const on=value==="true";
  return <button onClick={()=>onChange(on?"false":"true")} style={{width:40,height:22,borderRadius:11,padding:0,flexShrink:0,
    border:`1px solid ${on?t.accent:t.border}`,background:on?t.accentDim:t.surface3,cursor:"pointer",position:"relative",transition:"all .2s"}}>
    <span style={{position:"absolute",top:2,left:on?20:2,width:16,height:16,borderRadius:"50%",background:on?t.accent:t.textFaint,transition:"left .2s,background .2s"}}/>
  </button>;
}
function SelInp({value,onChange,options}){
  const t=useTheme();
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:5,color:t.text,fontFamily:t.mono,fontSize:11,padding:"4px 8px",outline:"none",cursor:"pointer"}}>
    {options.map(o=><option key={o} value={o}>{TXN_LABELS[o]||o}</option>)}
  </select>;
}
function Bdg({color,children,sm}){
  const t=useTheme();
  return <span style={{background:color+"20",color,border:`1px solid ${color}44`,borderRadius:4,padding:sm?"1px 5px":"2px 8px",fontSize:sm?9:11,fontFamily:t.mono,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;
}
function CopyBtn({text}){
  const t=useTheme();const[ok,s]=useState(false);
  return <button onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(text);s(true);setTimeout(()=>s(false),1500);}}
    style={{background:ok?t.greenDim:t.surface3,border:`1px solid ${ok?t.green:t.border}`,color:ok?t.green:t.textMuted,borderRadius:4,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:t.mono,transition:"all .2s",flexShrink:0}}>
    {ok?"✓ copied":"copy"}
  </button>;
}
function DlBtn({name,content}){
  const t=useTheme();
  return <button onClick={()=>{const b=new Blob([content],{type:"text/plain"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);}}
    style={{background:t.blueDim,border:`1px solid ${t.blue}44`,color:t.blue,borderRadius:4,padding:"4px 13px",fontSize:11,cursor:"pointer",fontFamily:t.mono,flexShrink:0}}>
    ↓ {name}
  </button>;
}
function UpBtn({label,onLoad}){
  const t=useTheme();const ref=useRef();
  return <><input type="file" ref={ref} style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>onLoad(ev.target.result,f.name);r.readAsText(f);e.target.value="";}}/><button onClick={()=>ref.current.click()} style={{background:t.accentDim,border:`1px solid ${t.accentBorder}`,color:t.accent,borderRadius:5,padding:"4px 13px",fontSize:11,cursor:"pointer",fontFamily:t.mono,flexShrink:0}}>↑ {label}</button></>;
}
function Card({children,style}){
  const t=useTheme();
  return <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:9,padding:16,...style}}>{children}</div>;
}
function SH({title,sub}){
  const t=useTheme();
  return <div style={{marginBottom:12}}>
    <div style={{fontFamily:t.mono,fontSize:10.5,color:t.accent,letterSpacing:2,textTransform:"uppercase",fontWeight:600}}>{title}</div>
    {sub&&<div style={{fontSize:11,color:t.textMuted,marginTop:2}}>{sub}</div>}
  </div>;
}
function Row({children,style}){return <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",...style}}>{children}</div>;}

// ─── FILE PATH PANEL ─────────────────────────────────────────────────────────
function FilePathPanel({paths,setPaths}){
  const t=useTheme();const[open,setOpen]=useState(false);
  const upd=(k,v)=>setPaths(p=>({...p,[k]:v}));
  const rows=[{key:"envFile",label:"setenv.sh / .env"},{key:"cdciCfg",label:"cdci_rc.cfg"},{key:"financialCfg",label:"financial_rc.cfg"},{key:"logFile",label:"simulator.log"},{key:"startScript",label:"Start script"},{key:"stopScript",label:"Stop script"}];
  return <div style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:7,overflow:"hidden"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:"none",padding:"9px 14px",cursor:"pointer",color:t.accent,fontFamily:t.mono,fontSize:10.5}}>
      <span>⚙  FILE PATH CONFIGURATION</span><span>{open?"▲":"▼"}</span>
    </button>
    {open&&<div style={{padding:"6px 14px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"8px 14px"}}>
      {rows.map(r=><div key={r.key}><div style={{fontSize:9.5,color:t.textFaint,fontFamily:t.mono,marginBottom:3}}>{r.label}</div><Inp value={paths[r.key]||""} onChange={v=>upd(r.key,v)} mono small/></div>)}
    </div>}
  </div>;
}

// ─── SCROLLABLE CONTENT WRAPPER ───────────────────────────────────────────────
// Makes any tab content fill height and scroll internally
function TabScroll({children}){
  return <div style={{flex:1,overflowY:"auto",overflowX:"hidden",minHeight:0}}>
    <div style={{maxWidth:1400,margin:"0 auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
      {children}
    </div>
  </div>;
}

// ─── ENV TAB ──────────────────────────────────────────────────────────────────
const ENV_GROUPS=[
  {title:"CBS Response Defaults",sub:"Default values returned per transaction type",keys:["BALANCE_ENQUIRY_RESP","LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP","UNBLOCK_EXECUTE_RESP","TXN_STATUS_RESP","CHK_REVERSAL_RESP","LIEN_AMOUNT_RESP","UPDATE_MANDATE_RESP","DEBIT_RESP","CREDIT_RESP","CREDIT_REVERSAL_RESP","DEBIT_REVERSAL_RESP","SET_PIN_RESP","SUCCESS_RC"]},
  {title:"Account Configuration",sub:"Default account details for CBS list account response",keys:["ACCOUNT_HOLDER_NAME","CLEAR_ACC_NUMS","IFSC_CODES","MMIDS","AEBA_FLAGS","ACCOUNT_CATEGORIES","ACC_TYPES","MBEBA_FLAGS"]},
  {title:"Random Response Flags",sub:"Toggle randomised RC per transaction code",keys:["ENABLE_RND_010049","ENABLE_RND_010065","ENABLE_RND_010058","ENABLE_RND_010052","ENABLE_RND_010066","ENABLE_RND_010056","ENABLE_RND_010060","ENABLE_RND_010044","ENABLE_RND_010045","ENABLE_RND_010053","ENABLE_RND_010054","ENABLE_RND_010043"]},
  {title:"Behavior Flags",sub:"Response holding, reversal, check-status behavior",keys:["ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN","HOLD_REV_RESP","HOLD_CHK_TXN_UDIR_RESP","HOLD_CHK_TXN_RESP","FAIL_REVERSAL_RESP","ENABLE_TXN_ACC_BASE_RC_MAPPING","ENABLE_LIST_ACCOUNT_CFG_FILE","RESPOND_CHK_TXN_RESP","HOLD_CHK_TXN_RESP_ACC","NON_PERSISTENT_ACCOUNT","REVERSAL_FAILURE_RC","DELAY_BUFFER","SUCCESS_TIMEOUT_RCS"]},
  {title:"Redis Configuration",sub:"Redis connection for transaction state persistence",keys:["REDIS_SUPPORT","REDIS_HOST","REDIS_PORT","REDIS_USER","REDIS_PASSWORD","REDIS_USE_SSL"]},
];

function EnvTab({env,setEnv,paths,setPaths,onUpload}){
  const t=useTheme();
  const set=(k,v)=>setEnv(p=>({...p,[k]:v}));
  return <TabScroll>
    <Card>
      <Row style={{justifyContent:"space-between",marginBottom:12}}>
        <SH title="Environment — setenv.sh" sub="Load file → edit values → download updated"/>
        <Row><UpBtn label="Load .env / setenv.sh" onLoad={(c,n)=>{setEnv(p=>({...p,...parseEnvFile(c)}));onUpload("env",n);}}/><DlBtn name="setenv.sh" content={genEnv(env)}/></Row>
      </Row>
      <FilePathPanel paths={paths} setPaths={setPaths}/>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(460px,1fr))",gap:14}}>
      {ENV_GROUPS.map(g=>{
        const allBool=g.keys.every(k=>BOOL_KEYS.has(k));
        return <Card key={g.title}>
          <SH title={g.title} sub={g.sub}/>
          {allBool
            ?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
               {g.keys.map(k=><div key={k} style={{display:"flex",alignItems:"center",gap:8}}><Tog value={env[k]} onChange={v=>set(k,v)}/><span style={{fontSize:10.5,color:t.textMuted,fontFamily:t.mono}}>{RND_LABELS[k]||k}</span></div>)}
             </div>
            :g.keys.map(k=><div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9,flexWrap:"wrap"}}>
                <label style={{fontSize:10,color:t.textMuted,fontFamily:t.mono,minWidth:180,flexShrink:0}}>{k}</label>
                <div style={{flex:1,minWidth:150}}>
                  {BOOL_KEYS.has(k)
                    ?<div style={{display:"flex",alignItems:"center",gap:8}}><Tog value={env[k]} onChange={v=>set(k,v)}/><span style={{fontSize:10.5,fontFamily:t.mono,color:env[k]==="true"?t.green:t.red}}>{env[k]}</span></div>
                    :<Inp value={env[k]||""} onChange={v=>set(k,v)} mono small/>}
                </div>
              </div>)
          }
        </Card>;
      })}
    </div>
  </TabScroll>;
}

// ─── CDCI RC TAB ─────────────────────────────────────────────────────────────
function CdciRcTab({std,setStd,sp,setSp,onUpload}){
  const t=useTheme();const[filter,setFilter]=useState("");
  const uS=(i,f,v)=>setStd(p=>p.map((m,j)=>j===i?{...m,[f]:v}:m));
  const uSp=(i,f,v)=>setSp(p=>p.map((m,j)=>j===i?{...m,[f]:v}:m));
  const shown=std.filter(m=>!filter||m.key.includes(filter)||m.rc.includes(filter));
  return <TabScroll>
    <Card style={{flex:1}}>
      <Row style={{justifyContent:"space-between",marginBottom:12}}>
        <SH title="cdci_rc.cfg" sub="Account last-4 → RC, delay, inhibit response mappings"/>
        <Row><UpBtn label="Load cdci_rc.cfg" onLoad={(c,n)=>{const{std:s,sp:x}=parseCdci(c);if(s.length)setStd(s);if(x.length)setSp(x);onUpload("cdci",n);}}/><DlBtn name="cdci_rc.cfg" content={genCdci(std,sp)}/></Row>
      </Row>
      <Row style={{marginBottom:12}}>
        <Inp value={filter} onChange={setFilter} mono small placeholder="filter last4 or rc…" style={{width:190}}/>
        <Bdg color={t.accent}>{std.length} entries</Bdg>
        <div style={{marginLeft:"auto",display:"flex",gap:14,fontFamily:t.mono,fontSize:10,color:t.textFaint}}>
          {[["00",t.green],["91",t.amber],["52",t.red],["130",t.purple]].map(([rc,c])=><span key={rc}><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:c,marginRight:4}}/>{rc}</span>)}
        </div>
      </Row>
      <div style={{overflowX:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr 120px",gap:6,marginBottom:6,minWidth:400}}>
          {["LAST4","RC","DELAY ms","INHIBIT"].map(h=><span key={h} style={{fontSize:9.5,color:t.textFaint,fontFamily:t.mono}}>{h}</span>)}
        </div>
        <div style={{maxHeight:"50vh",overflowY:"auto"}}>
          {shown.map(e=>{const ri=std.findIndex(x=>x.key===e.key);return <div key={e.key} style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr 120px",gap:6,alignItems:"center",padding:"3px 0",borderBottom:`1px solid ${t.border2}`,minWidth:400}}>
            <span style={{fontFamily:t.mono,fontSize:11,color:t.blue}}>{e.key}</span>
            <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:getRcColor(e.rc,t),flexShrink:0}}/><Inp value={e.rc} onChange={v=>uS(ri,"rc",v)} mono small/></div>
            <Inp value={e.delay} onChange={v=>uS(ri,"delay",v)} mono small placeholder="ms"/>
            <div style={{display:"flex",alignItems:"center",gap:6}}><Tog value={e.inhibit==="true"?"true":"false"} onChange={v=>uS(ri,"inhibit",v==="true"?"true":"")}/>{e.inhibit==="true"&&<Bdg color={t.amber} sm>HOLD</Bdg>}</div>
          </div>;})}
        </div>
      </div>
    </Card>
    <Card>
      <Row style={{justifyContent:"space-between",marginBottom:12}}>
        <SH title="Special Account Mappings" sub="Non-range last-4 mappings"/>
        <button onClick={()=>setSp(p=>[...p,{key:"0000",rc:"000",delay:"",inhibit:""}])} style={{background:t.accentDim,border:`1px solid ${t.accentBorder}`,color:t.accent,borderRadius:5,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:t.mono}}>+ Add</button>
      </Row>
      {sp.map((e,i)=><Row key={i} style={{padding:"4px 0",borderBottom:`1px solid ${t.border2}`}}>
        <Inp value={e.key} onChange={v=>uSp(i,"key",v)} mono small style={{width:64}} maxLength={4}/>
        <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}><span style={{width:7,height:7,borderRadius:"50%",background:getRcColor(e.rc,t),flexShrink:0}}/><Inp value={e.rc} onChange={v=>uSp(i,"rc",v)} mono small/></div>
        <Inp value={e.delay} onChange={v=>uSp(i,"delay",v)} mono small placeholder="ms" style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:6}}><Tog value={e.inhibit==="true"?"true":"false"} onChange={v=>uSp(i,"inhibit",v==="true"?"true":"")}/>{e.inhibit==="true"&&<Bdg color={t.amber} sm>HOLD</Bdg>}</div>
        <button onClick={()=>setSp(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:t.red,cursor:"pointer",fontSize:14}}>✕</button>
      </Row>)}
    </Card>
  </TabScroll>;
}

// ─── FINANCIAL RC TAB ────────────────────────────────────────────────────────
function FinancialRcTab({fin,setFin,la,setLa,onUpload}){
  const t=useTheme();
  const uF=(i,f,v)=>setFin(p=>p.map((m,j)=>j===i?{...m,[f]:v}:m));
  const uL=(i,f,v)=>setLa(p=>p.map((m,j)=>j===i?{...m,[f]:v}:m));
  const TH=({c,w})=><th style={{padding:"6px 6px",textAlign:"left",color:t.textFaint,fontSize:9.5,fontFamily:t.mono,fontWeight:500,borderBottom:`1px solid ${t.border}`,width:w}}>{c}</th>;
  const TD=({children,w})=><td style={{padding:"3px 4px",borderBottom:`1px solid ${t.border2}`,width:w}}>{children}</td>;
  return <TabScroll>
    <Card style={{flex:1}}>
      <Row style={{justifyContent:"space-between",marginBottom:12}}>
        <SH title="financial_rc.cfg" sub="TXN_ID.last4 → rc, delay, inhibit per scenario"/>
        <Row>
          <UpBtn label="Load financial_rc.cfg" onLoad={(c,n)=>{const{fin:f,la:l}=parseFinancial(c);if(f.length)setFin(f);if(l.length)setLa(l);onUpload("financial",n);}}/>
          <DlBtn name="financial_rc.cfg" content={genFinancial(fin,la)}/>
          <button onClick={()=>setFin(p=>[...p,{txn:"010044",last4:"0000",rc:"00",delay:"0",inhibit:"false",label:"NEW"}])} style={{background:t.accentDim,border:`1px solid ${t.accentBorder}`,color:t.accent,borderRadius:5,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:t.mono}}>+ Row</button>
        </Row>
      </Row>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr><TH c="TXN ID" w={90}/><TH c="TYPE" w={76}/><TH c="LAST4" w={56}/><TH c="RC" w={80}/><TH c="DELAY ms" w={80}/><TH c="INHIBIT" w={80}/><TH c="LABEL"/><TH c="" w={26}/></tr></thead>
          <tbody>{fin.map((r,i)=><tr key={i}>
            <TD><SelInp value={r.txn} onChange={v=>uF(i,"txn",v)} options={TXN_OPTIONS}/></TD>
            <TD><Bdg color={t.blue} sm>{TXN_LABELS[r.txn]||r.txn}</Bdg></TD>
            <TD><Inp value={r.last4} onChange={v=>uF(i,"last4",v)} mono small maxLength={4} style={{width:46}}/></TD>
            <TD><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:getRcColor(r.rc,t),flexShrink:0}}/><Inp value={r.rc} onChange={v=>uF(i,"rc",v)} mono small style={{width:58}}/></div></TD>
            <TD><Inp value={r.delay} onChange={v=>uF(i,"delay",v)} mono small style={{width:60}}/></TD>
            <TD><div style={{display:"flex",alignItems:"center",gap:5}}><Tog value={r.inhibit} onChange={v=>uF(i,"inhibit",v)}/>{r.inhibit==="true"&&<Bdg color={t.amber} sm>HOLD</Bdg>}</div></TD>
            <TD><Inp value={r.label} onChange={v=>uF(i,"label",v)} small style={{width:"100%",minWidth:100}}/></TD>
            <TD><button onClick={()=>setFin(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:t.red,cursor:"pointer",fontSize:13}}>✕</button></TD>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>
    <Card>
      <Row style={{justifyContent:"space-between",marginBottom:12}}>
        <SH title="List Account Mappings (010042)" sub="Mobile last-4 → holder + accounts pipe-string"/>
        <button onClick={()=>setLa(p=>[...p,{mobile:"0000",holder:"Mr. NAME",accounts:""}])} style={{background:t.accentDim,border:`1px solid ${t.accentBorder}`,color:t.accent,borderRadius:5,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:t.mono}}>+ Add</button>
      </Row>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(460px,1fr))",gap:10}}>
        {la.map((item,i)=><div key={i} style={{background:t.surface2,border:`1px solid ${t.border2}`,borderRadius:7,padding:"10px 12px"}}>
          <Row style={{marginBottom:8,alignItems:"flex-start"}}>
            <div style={{width:88}}><div style={{fontSize:9.5,color:t.textFaint,fontFamily:t.mono,marginBottom:3}}>MOBILE LAST4</div><Inp value={item.mobile} onChange={v=>uL(i,"mobile",v)} mono small maxLength={4}/></div>
            <div style={{flex:1}}><div style={{fontSize:9.5,color:t.textFaint,fontFamily:t.mono,marginBottom:3}}>HOLDER NAME</div><Inp value={item.holder} onChange={v=>uL(i,"holder",v)} small/></div>
            <button onClick={()=>setLa(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:t.red,cursor:"pointer",fontSize:14,marginTop:16,flexShrink:0}}>✕</button>
          </Row>
          <div style={{fontSize:9.5,color:t.textFaint,fontFamily:t.mono,marginBottom:3}}>ACCOUNTS (pipe-separated)</div>
          <textarea value={item.accounts} onChange={e=>uL(i,"accounts",e.target.value)} rows={2} style={{width:"100%",background:t.surface,border:`1px solid ${t.border}`,borderRadius:4,color:t.accent,fontFamily:t.mono,fontSize:11,padding:"6px 10px",resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
        </div>)}
      </div>
    </Card>
  </TabScroll>;
}

// ─── PREVIEW TAB ─────────────────────────────────────────────────────────────
function PreviewTab({env,std,sp,fin,la}){
  const t=useTheme();const[active,setActive]=useState("env");
  const files={env:{name:"setenv.sh",content:genEnv(env)},cdci:{name:"cdci_rc.cfg",content:genCdci(std,sp)},financial:{name:"financial_rc.cfg",content:genFinancial(fin,la)}};
  const cur=files[active];
  return <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden",maxWidth:1400,margin:"0 auto",width:"100%",padding:"16px 20px"}}>
    <Card style={{flex:1,display:"flex",flexDirection:"column",padding:0,minHeight:0,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${t.border}`,gap:8,flexWrap:"wrap",flexShrink:0}}>
        {Object.entries(files).map(([k,f])=><button key={k} onClick={()=>setActive(k)} style={{background:active===k?t.accentDim:"transparent",border:`1px solid ${active===k?t.accentBorder:t.border}`,color:active===k?t.accent:t.textMuted,borderRadius:5,padding:"5px 16px",cursor:"pointer",fontFamily:t.mono,fontSize:12,transition:"all .15s"}}>{f.name}</button>)}
        <div style={{marginLeft:"auto",display:"flex",gap:8}}><CopyBtn text={cur.content}/><DlBtn name={cur.name} content={cur.content}/></div>
      </div>
      <pre style={{flex:1,margin:0,padding:"14px 18px",fontFamily:t.mono,fontSize:11,lineHeight:1.75,overflowX:"auto",overflowY:"auto",background:"transparent",color:t.text,minHeight:0}}>
        {cur.content.split("\n").map((line,i)=>{
          const isCmt=line.trim().startsWith("#"),isExp=line.trim().startsWith("export"),hasEq=!isCmt&&!isExp&&line.includes("=");
          if(isCmt)return<span key={i} style={{display:"block",color:t.textFaint}}>{line||" "}</span>;
          if(isExp)return<span key={i} style={{display:"block",color:t.accent}}>{line||" "}</span>;
          if(hasEq){const eq=line.indexOf("=");return<span key={i} style={{display:"block"}}><span style={{color:t.blue}}>{line.substring(0,eq)}</span><span style={{color:t.textFaint}}>=</span><span style={{color:t.text}}>{line.substring(eq+1)}</span></span>;}
          return<span key={i} style={{display:"block",color:t.text}}>{line||" "}</span>;
        })}
      </pre>
    </Card>
  </div>;
}

// ─── CONTROL TAB ─────────────────────────────────────────────────────────────
const PROC_NAME = "simulator-service-1.0.1.jar";
const PS_CMD    = `ps -ef | grep ${PROC_NAME} | grep -v grep`;
const SIM_ST    = { UNKNOWN:"UNKNOWN", STOPPED:"STOPPED", STARTING:"STARTING", RUNNING:"RUNNING", STOPPING:"STOPPING" };

// Always read the freshest paths from the ref — never stale closures
function getPaths(ref) {
  const p = ref.current || {};
  return {
    startScript: (p.startScript || "").trim() || "./modules/simulator-service/build/install/simulator-service/bin/start",
    stopScript:  (p.stopScript  || "").trim() || "./modules/simulator-service/build/install/simulator-service/bin/stop",
    logFile:     (p.logFile     || "").trim() || "logs/simulator.log",
    envFile:      p.envFile      || "cfg/setenv.sh",
    cdciCfg:      p.cdciCfg     || "cfg/cdci_rc.cfg",
    financialCfg: p.financialCfg || "cfg/financial_rc.cfg",
  };
}

function ControlTab({ paths, autoRestart, setAutoRestart, pendingRestart, clearPending }) {
  const t = useTheme();

  // pathsRef ensures all callbacks always use the latest configured paths
  const pathsRef = useRef(paths);
  useEffect(() => { pathsRef.current = paths; }, [paths]);

  const [simState,    setSimState]    = useState(SIM_ST.UNKNOWN);
  const [opLog,       setOpLog]       = useState([]);
  const [logLines,    setLogLines]    = useState([]);
  const [logHandle,   setLogHandle]   = useState(null);
  const [logFile,     setLogFile]     = useState("");
  const [logLoading,  setLogLoading]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterLog,   setFilterLog]   = useState("");
  const [tailMode,    setTailMode]    = useState(true);

  const logRef      = useRef();
  const opLogRef    = useRef();
  const autoTimer   = useRef();
  const logInputRef = useRef();

  const hasFileAPI = typeof window !== "undefined" && "showOpenFilePicker" in window;

  // ── Operation log ─────────────────────────────────────────────────────────
  const addOp = useCallback((msg, type) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setOpLog(prev => [...prev.slice(-200), { ts, msg, type: type || "info" }]);
    setTimeout(() => { if (opLogRef.current) opLogRef.current.scrollTop = opLogRef.current.scrollHeight; }, 40);
  }, []);

  // ── Start — logs the exact script from configured paths ──────────────────
  const execStart = useCallback(() => {
    const { startScript } = getPaths(pathsRef);
    addOp("─── START ───────────────────────────────────", "divider");
    addOp(`[START] Script: ${startScript}`, "cmd");
    addOp("  Run this command on the server to start the simulator.", "info");
    addOp("  After starting, click  ⟳ Mark as RUNNING  to update status here.", "info");
    setSimState(SIM_ST.STARTING);
    // Transition to a "pending" state; user confirms via Mark Running button
  }, [addOp]);

  // ── Stop — logs the exact script from configured paths ───────────────────
  const execStop = useCallback((thenStart = false) => {
    const { stopScript } = getPaths(pathsRef);
    addOp("─── STOP ────────────────────────────────────", "divider");
    addOp(`[STOP] Script: ${stopScript}`, "cmd");
    addOp("  Run this command on the server to stop the simulator.", "info");
    addOp(`  Verify with:  ${PS_CMD}`, "info");
    addOp("  After stopping, click  ⟳ Mark as STOPPED  to update status here.", "info");
    if (thenStart) {
      const { startScript } = getPaths(pathsRef);
      addOp("─── RESTART — after stop, also run: ─────────", "divider");
      addOp(`[START] Script: ${startScript}`, "cmd");
    }
    setSimState(SIM_ST.STOPPING);
    if (clearPending) clearPending();
  }, [addOp, clearPending]);

  // ── Manual status override (user confirms after running commands) ─────────
  const markRunning = useCallback(() => {
    addOp("✓ Status manually set to RUNNING", "success");
    setSimState(SIM_ST.RUNNING);
  }, [addOp]);

  const markStopped = useCallback(() => {
    addOp("✓ Status manually set to STOPPED", "info");
    setSimState(SIM_ST.STOPPED);
  }, [addOp]);

  // ── Check hint — shows command to run; user then marks status ────────────
  const showCheckCmd = useCallback(() => {
    addOp("─── CHECK ───────────────────────────────────", "divider");
    addOp(`[CHECK] Run on server:  ${PS_CMD}`, "cmd");
    addOp("  If output contains simulator-service-1.0.1.jar → click  ✓ Mark RUNNING", "info");
    addOp("  If output is empty → click  ✗ Mark STOPPED", "info");
  }, [addOp]);

  // Auto-restart — triggers on pendingRestart flag
  useEffect(() => {
    if (pendingRestart && autoRestart && simState === SIM_ST.RUNNING) {
      addOp("─── AUTO-RESTART triggered by config change ───", "divider");
      execStop(true);
    }
  }, [pendingRestart]); // eslint-disable-line

  // Auto-refresh log
  useEffect(() => {
    if (autoRefresh) {
      autoTimer.current = setInterval(() => refreshLog(), 5000);
    } else {
      clearInterval(autoTimer.current);
    }
    return () => clearInterval(autoTimer.current);
  }, [autoRefresh, logHandle]); // eslint-disable-line

  // Initial hint
  useEffect(() => {
    addOp("[INIT] Configure start/stop script paths in the setenv.sh tab → File Path Configuration.", "info");
    addOp(`[INIT] To check if simulator is running, run:  ${PS_CMD}`, "cmd");
  }, []); // eslint-disable-line

  // ── Log file ──────────────────────────────────────────────────────────────
  const readLogHandle = useCallback(async (h) => {
    setLogLoading(true);
    try {
      const f = await h.getFile();
      const txt = await f.text();
      const lines = txt.split("\n").filter(l => l.trim());
      setLogLines(lines);
      setLastRefresh(new Date());
      if (tailMode) setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 60);
    } catch (e) {
      setLogLines([`[ERROR] Could not read log file: ${e.message}`]);
    }
    setLogLoading(false);
  }, [tailMode]);

  const pickLog = useCallback(async () => {
    if (hasFileAPI) {
      try {
        const [h] = await window.showOpenFilePicker({ types:[{ description:"Log", accept:{"text/plain":[".log",".txt"]} }], multiple: false });
        setLogHandle(h); setLogFile(h.name);
        await readLogHandle(h);
      } catch {}
    } else {
      logInputRef.current.click();
    }
  }, [hasFileAPI, readLogHandle]);

  const refreshLog = useCallback(async () => {
    if (logHandle) await readLogHandle(logHandle);
    else if (hasFileAPI) await pickLog();
    else logInputRef.current.click();
  }, [logHandle, readLogHandle, hasFileAPI, pickLog]);

  const onLogInput = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setLogFile(f.name);
    const r = new FileReader();
    r.onload = ev => {
      const lines = (ev.target.result || "").split("\n").filter(l => l.trim());
      setLogLines(lines); setLastRefresh(new Date());
      if (tailMode) setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 60);
    };
    r.readAsText(f); e.target.value = "";
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const isRunning = simState === SIM_ST.RUNNING;
  const isBusy    = [SIM_ST.STARTING, SIM_ST.STOPPING].includes(simState);
  const isStopped = simState === SIM_ST.STOPPED || simState === SIM_ST.UNKNOWN;
  const shownLines = filterLog.trim() ? logLines.filter(l => l.toLowerCase().includes(filterLog.toLowerCase())) : logLines;
  const dispPaths  = getPaths(pathsRef);

  const STATUS_CFG = {
    [SIM_ST.UNKNOWN]: { label:"UNKNOWN",  color:t.textFaint, pulse:false },
    [SIM_ST.STOPPED]: { label:"STOPPED",  color:t.red,       pulse:false },
    [SIM_ST.STARTING]:{ label:"STARTING", color:t.blue,      pulse:true  },
    [SIM_ST.RUNNING]: { label:"RUNNING",  color:t.green,     pulse:true  },
    [SIM_ST.STOPPING]:{ label:"STOPPING", color:t.amber,     pulse:true  },
  };
  const si = STATUS_CFG[simState];

  const OP_COLORS = { info:t.textMuted, cmd:t.accent, success:t.green, warn:t.amber, error:t.red, divider:t.textFaint };

  function CtrlBtn({ onClick, disabled, color, children }) {
    return <button onClick={onClick} disabled={disabled} style={{ flex:1, padding:"10px 6px", background:disabled?t.surface3:color+"1e", border:`1px solid ${disabled?t.border:color+"55"}`, color:disabled?t.textFaint:color, borderRadius:7, cursor:disabled?"not-allowed":"pointer", fontFamily:t.mono, fontSize:12, fontWeight:600, letterSpacing:1, transition:"all .2s", opacity:disabled?0.4:1 }}>{children}</button>;
  }
  function SmBtn({ onClick, color, children }) {
    return <button onClick={onClick} style={{ background:color+"18", border:`1px solid ${color}44`, color, borderRadius:5, padding:"4px 11px", fontSize:11, cursor:"pointer", fontFamily:t.mono, fontWeight:500, whiteSpace:"nowrap" }}>{children}</button>;
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden", maxWidth:1400, margin:"0 auto", width:"100%", padding:"16px 20px", gap:14 }}>

      {/* ── TOP ROW ── */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", flexShrink:0 }}>

        {/* Status + Main Buttons */}
        <Card style={{ flex:"1 1 300px", minWidth:0 }}>
          <SH title="Simulator Status"/>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <span style={{ display:"block", width:14, height:14, borderRadius:"50%", background:si.color }}/>
              {si.pulse && <span style={{ position:"absolute", inset:-4, borderRadius:"50%", border:`2px solid ${si.color}`, animation:"cbsPing 1.3s ease-out infinite", opacity:.3 }}/>}
            </div>
            <span style={{ fontFamily:t.mono, fontSize:22, fontWeight:700, color:si.color, letterSpacing:2 }}>{si.label}</span>
          </div>

          {/* Main action buttons */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <CtrlBtn onClick={execStart}       disabled={isBusy||isRunning}  color={t.green}>▶ START</CtrlBtn>
            <CtrlBtn onClick={()=>execStop(false)} disabled={!isRunning}     color={t.red}>■ STOP</CtrlBtn>
            <CtrlBtn onClick={()=>execStop(true)}  disabled={isBusy||isStopped} color={t.amber}>↺ RESTART</CtrlBtn>
            <CtrlBtn onClick={showCheckCmd}    disabled={false}              color={t.blue}>? CHECK</CtrlBtn>
          </div>

          {/* Manual status confirmation row */}
          <div style={{ background:t.surface2, border:`1px solid ${t.border2}`, borderRadius:6, padding:"8px 12px", marginBottom:12 }}>
            <div style={{ fontSize:9.5, color:t.textFaint, fontFamily:t.mono, marginBottom:6 }}>MANUALLY CONFIRM STATUS AFTER RUNNING COMMAND ON SERVER</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <SmBtn onClick={markRunning} color={t.green}>✓ Mark as RUNNING</SmBtn>
              <SmBtn onClick={markStopped} color={t.red}>✗ Mark as STOPPED</SmBtn>
            </div>
          </div>

          <div style={{ height:1, background:t.border2, margin:"8px 0" }}/>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <Tog value={autoRestart?"true":"false"} onChange={v=>setAutoRestart(v==="true")}/>
            <div>
              <div style={{ fontFamily:t.mono, fontSize:11, color:t.text }}>Auto-Restart on Config Change</div>
              <div style={{ fontSize:10, color:t.textMuted, marginTop:2 }}>Copies restart commands to op log after 3s edit</div>
            </div>
            {pendingRestart && <Bdg color={t.amber}>⏳ pending</Bdg>}
          </div>
        </Card>

        {/* Configured Paths in Use */}
        <Card style={{ flex:"2 1 380px", minWidth:0 }}>
          <SH title="Configured Paths in Use" sub="These exact values are used on every Start / Stop / Check"/>
          {[
            ["▶ START script",  dispPaths.startScript,  t.green],
            ["■ STOP script",   dispPaths.stopScript,   t.red],
            ["? CHECK cmd",     PS_CMD,                 t.blue],
            ["📋 Log file",     dispPaths.logFile,      t.textMuted],
            ["📄 setenv.sh",    dispPaths.envFile,      t.textFaint],
            ["📄 cdci_rc.cfg",  dispPaths.cdciCfg,      t.textFaint],
            ["📄 financial_rc", dispPaths.financialCfg, t.textFaint],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, flexWrap:"wrap" }}>
              <span style={{ fontSize:9.5, color, fontFamily:t.mono, fontWeight:600, flexShrink:0, minWidth:110 }}>{label}</span>
              <code style={{ fontFamily:t.mono, fontSize:10.5, color:t.accent, flex:1, wordBreak:"break-all", background:t.surface2, border:`1px solid ${t.border2}`, borderRadius:4, padding:"3px 8px", minWidth:0 }}>{value}</code>
              <CopyBtn text={value}/>
            </div>
          ))}
        </Card>
      </div>

      {/* ── BOTTOM ROW: operation log + simulator log ── */}
      <div style={{ flex:1, display:"flex", gap:14, minHeight:0, flexWrap:"wrap" }}>

        {/* Operation Log */}
        <Card style={{ flex:"1 1 320px", display:"flex", flexDirection:"column", padding:0, minHeight:0, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:`1px solid ${t.border}`, flexShrink:0, gap:8 }}>
            <span style={{ fontFamily:t.mono, fontSize:10.5, color:t.accent, letterSpacing:2, textTransform:"uppercase", fontWeight:600 }}>Operation Log</span>
            <button onClick={()=>setOpLog([])} style={{ background:"none", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4, padding:"2px 8px", fontSize:10, cursor:"pointer", fontFamily:t.mono }}>clear</button>
          </div>
          <div ref={opLogRef} style={{ flex:1, overflowY:"auto", padding:"6px 12px", background:t.surface2, fontFamily:t.mono, fontSize:10.5, lineHeight:1.85, minHeight:0 }}>
            {opLog.length === 0
              ? <span style={{ color:t.textFaint }}>Click Start / Stop / Check to see commands…</span>
              : opLog.map((e,i) => (
                  <div key={i} style={{ display:"flex", gap:8, borderBottom:`1px solid ${t.border2}20` }}>
                    <span style={{ color:t.textFaint, flexShrink:0 }}>{e.ts}</span>
                    <span style={{ color:OP_COLORS[e.type]||t.textMuted, wordBreak:"break-word", flex:1 }}>{e.msg}</span>
                  </div>
                ))
            }
          </div>
        </Card>

        {/* Simulator Log */}
        <Card style={{ flex:"2 1 420px", display:"flex", flexDirection:"column", padding:0, minHeight:0, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderBottom:`1px solid ${t.border}`, flexWrap:"wrap", flexShrink:0 }}>
            <span style={{ fontFamily:t.mono, fontSize:10.5, color:t.accent, letterSpacing:2, textTransform:"uppercase", fontWeight:600, flexShrink:0 }}>Simulator Log</span>
            {logFile ? <Bdg color={t.green} sm>📄 {logFile}</Bdg> : <Bdg color={t.textFaint} sm>no file loaded</Bdg>}
            <code style={{ fontFamily:t.mono, fontSize:9.5, color:t.textFaint }}>{dispPaths.logFile}</code>
            {lastRefresh && <span style={{ fontSize:9.5, color:t.textFaint, fontFamily:t.mono, flexShrink:0 }}>⏱ {lastRefresh.toLocaleTimeString()}</span>}
            <div style={{ flex:1, minWidth:100 }}><Inp value={filterLog} onChange={setFilterLog} mono small placeholder="filter lines…"/></div>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}><Tog value={tailMode?"true":"false"} onChange={v=>setTailMode(v==="true")}/><span style={{ fontSize:10, color:t.textMuted, fontFamily:t.mono }}>tail</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}><Tog value={autoRefresh?"true":"false"} onChange={v=>setAutoRefresh(v==="true")}/><span style={{ fontSize:10, color:t.textMuted, fontFamily:t.mono }}>auto 5s</span></div>
              <input type="file" ref={logInputRef} accept=".log,.txt" style={{ display:"none" }} onChange={onLogInput}/>
              {logLines.length === 0
                ? <button onClick={pickLog} style={{ background:t.accentDim, border:`1px solid ${t.accentBorder}`, color:t.accent, borderRadius:5, padding:"4px 12px", fontSize:11, cursor:"pointer", fontFamily:t.mono, whiteSpace:"nowrap" }}>📂 Open log</button>
                : <>
                    <button onClick={refreshLog} disabled={logLoading} style={{ background:logLoading?t.surface3:t.surface2, border:`1px solid ${t.border}`, color:logLoading?t.textFaint:t.blue, borderRadius:5, padding:"4px 10px", fontSize:11, cursor:logLoading?"not-allowed":"pointer", fontFamily:t.mono, display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ display:"inline-block", animation:logLoading?"cbsSpin .8s linear infinite":"none" }}>↻</span>{logLoading?"…":"Refresh"}
                    </button>
                    <button onClick={pickLog} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:5, padding:"4px 8px", fontSize:11, cursor:"pointer", fontFamily:t.mono }}>📂</button>
                  </>
              }
              {logLines.length > 0 && <Bdg color={t.textFaint} sm>{shownLines.length}/{logLines.length}</Bdg>}
            </div>
          </div>
          <div ref={logRef} style={{ flex:1, overflowY:"auto", overflowX:"auto", padding:"6px 14px", background:t.surface2, fontFamily:t.mono, fontSize:11.5, lineHeight:1.75, minHeight:0 }}>
            {logLines.length === 0
              ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:14, padding:40 }}>
                  <div style={{ fontSize:40, opacity:.2 }}>📋</div>
                  <div style={{ color:t.textFaint, fontSize:13 }}>No log file loaded</div>
                  <div style={{ color:t.textFaint, fontSize:11 }}>Configured: <span style={{ color:t.accent }}>{dispPaths.logFile}</span></div>
                  <button onClick={pickLog} style={{ background:t.accentDim, border:`1px solid ${t.accentBorder}`, color:t.accent, borderRadius:6, padding:"8px 20px", fontSize:12, cursor:"pointer", fontFamily:t.mono }}>📂 Open simulator.log</button>
                </div>
              : shownLines.length === 0
                ? <div style={{ color:t.textFaint, padding:20, textAlign:"center" }}>No lines match "{filterLog}"</div>
                : shownLines.map((line,i) => {
                    const c = logColor(line, t);
                    return <div key={i} style={{ display:"flex", gap:8, borderBottom:`1px solid ${t.border2}20`, paddingBottom:1 }}>
                      <span style={{ color:t.textFaint, fontSize:10, flexShrink:0, userSelect:"none", paddingTop:1, minWidth:42, textAlign:"right" }}>{shownLines.length-i}</span>
                      <span style={{ color:c, wordBreak:"break-word", minWidth:0, flex:1 }}>{line}</span>
                    </div>;
                  })
            }
          </div>
        </Card>
      </div>

      <style>{`@keyframes cbsPing{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}@keyframes cbsSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const[isDark,setIsDark]=useState(true);
  const theme=isDark?DARK:LIGHT;
  const[activeTab,setActiveTab]           =useState("env");
  const[env,setEnv]                       =useState({...DEFAULT_ENV});
  const[cdciStd,setCdciStd]               =useState(buildCdciStd);
  const[cdciSp,setCdciSp]                 =useState(DEFAULT_CDCI_SP);
  const[fin,setFin]                       =useState(DEFAULT_FIN);
  const[la,setLa]                         =useState(DEFAULT_LA);
  const[paths,setPaths]                   =useState({...DEFAULT_PATHS});
  const[autoRestart,setAutoRestart]       =useState(false);
  const[pendingRestart,setPendingRestart] =useState(false);
  const[loadedFiles,setLoadedFiles]       =useState({});
  const[flash,setFlash]                   =useState(false);
  const debRef=useRef();

  const markChanged=useCallback(()=>{
    setFlash(true);setTimeout(()=>setFlash(false),900);
    if(debRef.current)clearTimeout(debRef.current);
    debRef.current=setTimeout(()=>setPendingRestart(true),3000);
  },[]);

  const wrap=setter=>updater=>{setter(updater);markChanged();};

  const TABS=[
    {id:"env",    icon:"⚙",label:"setenv.sh"},
    {id:"cdci",   icon:"⊞",label:"cdci_rc.cfg"},
    {id:"financial",icon:"⊟",label:"financial_rc.cfg"},
    {id:"preview",icon:"◈",label:"Preview"},
    {id:"control",icon:"⏻",label:"Control"},
  ];

  return <ThemeCtx.Provider value={theme}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { width: 100%; height: 100%; }
      body { background: ${theme.bg}; font-family: ${theme.sans}; overflow: hidden; transition: background .3s; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: ${theme.surface2}; }
      ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
      input::placeholder, textarea::placeholder { color: ${theme.textFaint} !important; }
      select option { background: ${theme.surface}; color: ${theme.text}; }
      textarea { outline: none; }
    `}</style>

    <div style={{display:"flex",flexDirection:"column",height:"100vh",width:"100vw",background:theme.bg,color:theme.text,overflow:"hidden",transition:"background .3s,color .3s"}}>

      {/* HEADER — fixed height */}
      <header style={{background:theme.surface,borderBottom:`1px solid ${theme.border}`,padding:"0 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap",boxShadow:isDark?"0 2px 20px #00000050":"0 2px 12px #0000001a",zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",flexShrink:0}}>
          <div style={{width:32,height:32,background:theme.accentDim,border:`1px solid ${theme.accentBorder}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>⚡</div>
          <div>
            <div style={{fontFamily:theme.mono,fontSize:12,color:theme.accent,fontWeight:600,letterSpacing:1.5}}>CBS SIMULATOR</div>
            <div style={{fontSize:8,color:theme.textFaint,fontFamily:theme.mono,letterSpacing:3}}>CONFIG MANAGER</div>
          </div>
        </div>
        <div style={{width:1,height:28,background:theme.border,flexShrink:0}}/>
        <nav style={{display:"flex",gap:2,flexWrap:"wrap",flex:1}}>
          {TABS.map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{background:activeTab===tab.id?theme.accentDim:"transparent",border:`1px solid ${activeTab===tab.id?theme.accentBorder:"transparent"}`,color:activeTab===tab.id?theme.accent:theme.textMuted,borderRadius:5,padding:"7px 10px",cursor:"pointer",fontFamily:theme.mono,fontSize:11,fontWeight:500,transition:"all .15s",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>{tab.icon} {tab.label}</button>)}
        </nav>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",padding:"6px 0"}}>
          {Object.entries(loadedFiles).map(([k,n])=><Bdg key={k} color={theme.green} sm>✓ {n}</Bdg>)}
          {flash&&<Bdg color={theme.amber} sm>● changed</Bdg>}
          {pendingRestart&&<Bdg color={theme.amber} sm>↺ pending</Bdg>}
          <button onClick={()=>setIsDark(d=>!d)} style={{background:theme.surface2,border:`1px solid ${theme.border}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",color:theme.text,fontFamily:theme.mono,fontSize:11,display:"flex",alignItems:"center",gap:5,transition:"all .2s"}}>
            {isDark?"☀ Light":"◑ Dark"}
          </button>
        </div>
      </header>

      {/* BODY — fills remaining height, each tab manages its own scroll */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
        {activeTab==="env"       &&<EnvTab       env={env}     setEnv={wrap(setEnv)}     paths={paths} setPaths={setPaths} onUpload={(k,n)=>setLoadedFiles(p=>({...p,[k]:n}))}/>}
        {activeTab==="cdci"      &&<CdciRcTab    std={cdciStd} setStd={wrap(setCdciStd)} sp={cdciSp}   setSp={wrap(setCdciSp)} onUpload={(k,n)=>setLoadedFiles(p=>({...p,[k]:n}))}/>}
        {activeTab==="financial" &&<FinancialRcTab fin={fin}   setFin={wrap(setFin)}     la={la}       setLa={wrap(setLa)}    onUpload={(k,n)=>setLoadedFiles(p=>({...p,[k]:n}))}/>}
        {activeTab==="preview"   &&<PreviewTab   env={env} std={cdciStd} sp={cdciSp} fin={fin} la={la}/>}
        {activeTab==="control"   &&<ControlTab   paths={paths} autoRestart={autoRestart} setAutoRestart={setAutoRestart} pendingRestart={pendingRestart} clearPending={()=>setPendingRestart(false)}/>}
      </div>
    </div>
  </ThemeCtx.Provider>;
}
