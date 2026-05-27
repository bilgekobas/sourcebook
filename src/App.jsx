import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { SEED_ENTRIES, CATEGORIES, GLOSSARY, VERSION, LAST_UPDATED } from "./data/entries.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — update REPO_URL to your actual GitHub repository URL
// ─────────────────────────────────────────────────────────────────────────────
const REPO_URL = "https://github.com/bilgekobas/sourcebook";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  paper:  "#f4f1eb", paper2: "#edeae2", ink:   "#18181b",
  ink2:   "#52504c", ink3:   "#9b9892", rule:  "#ccc8be",
  rule2:  "#e0ddd6", red:    "#bf2011", redFade:"#f5e8e6",
  white:  "#faf9f6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Entry is "new" if added within the last 60 days
const isNew = (entry) => {
  try {
    return (Date.now() - new Date(entry.dateAdded).getTime()) < 60 * 24 * 60 * 60 * 1000;
  } catch { return false; }
};

// localStorage — stores only student-contributed entries
const LS_KEY = "climate-kb-student-entries-v1";
function loadStudentEntries() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveStudentEntries(entries) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch {}
}

// CSV export
function exportToCSV(entries) {
  const headers = ["Name","Category","Description","URL","Cost Model","Coding Required",
    "Scale","Regions","Temporal Coverage","Temporal Resolution","Spatial Resolution",
    "Formats","Topics","Beginner Rating (1–5)","Date Added"];
  const rows = entries.map(e => [
    e.name, e.category, e.description, e.url, e.costModel, e.codingRequired,
    (e.scale||[]).join("; "), (e.regions||[]).join("; "),
    e.temporalCoverage||"", e.temporalResolution||"", e.spatialResolution||"",
    (e.formats||[]).join("; "), (e.topics||[]).join("; "),
    e.beginnerRating||"", e.dateAdded||"",
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v||"").replace(/"/g,'""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "open-data-knowledge-base.csv"; a.click();
  URL.revokeObjectURL(url);
}

// Citation generator
function getCitation(entry) {
  const year = new Date().getFullYear();
  return `Kobas, B. (${year}). ${entry.name}. In Open Data Knowledge Base for Built Environment & Climate Research. Chair of Building Technology and Climate-Responsive Design, Technical University of Munich. Available at: ${REPO_URL}`;
}

// GitHub Issue URL pre-filled with form data
function getIssueUrl(form) {
  const title = `[New Dataset] ${form.name || "Dataset submission"}`;
  const body = [
    `## Dataset Submission`,``,
    `**Name:** ${form.name}`,
    `**URL:** ${form.url}`,
    `**Category:** ${form.category}`,
    `**Cost Model:** ${form.costModel}`,
    `**Coding Required:** ${form.codingRequired}`,
    `**Scale:** ${(form.scale||[]).join(", ")}`,
    `**Regions:** ${form.regions}`,
    ``,`**Description:**`,form.description,
    ``,`**Topics:** ${form.topics}`,
    ``,`**Temporal Coverage:** ${form.temporalCoverage}`,
    `**Temporal Resolution:** ${form.temporalResolution}`,
    `**Spatial Resolution:** ${form.spatialResolution}`,
    `**Formats:** ${form.formats}`,
    `**Beginner Rating:** ${form.beginnerRating}/5`,
    ``,`**Example Research Questions:**`,form.researchQuestions,
    ``,`**Student Tip:** ${form.studentTip||"—"}`,
    ``,`**Submitted by:** ${form.submittedBy}`,
  ].join("\n");
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=new-dataset`;
}

// ─── Tooltip system ───────────────────────────────────────────────────────────
const TipCtx = createContext(null);

function TooltipProvider({ children }) {
  const [tip, setTip] = useState(null);
  return (
    <TipCtx.Provider value={setTip}>
      {children}
      {tip && (
        <div style={{ position:"fixed", top:tip.y-14, left:tip.x,
          transform:"translate(-50%,-100%)", background:T.ink, color:T.paper,
          padding:"10px 14px", maxWidth:250, zIndex:99999, pointerEvents:"none",
          lineHeight:1.55, borderLeft:`3px solid ${T.red}`,
          boxShadow:"0 4px 24px rgba(0,0,0,0.18)" }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.red,
            marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>{tip.term}</div>
          <div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:13 }}>{tip.def}</div>
        </div>
      )}
    </TipCtx.Provider>
  );
}

function GlossaryTerm({ term, children }) {
  const setTip = useContext(TipCtx);
  const ref = useRef(null);
  const def = GLOSSARY[term];
  if (!def) return <span>{children||term}</span>;
  return (
    <span ref={ref}
      onMouseEnter={() => {
        if (ref.current) {
          const r = ref.current.getBoundingClientRect();
          setTip({ x:r.left+r.width/2, y:r.top+window.scrollY, term, def });
        }
      }}
      onMouseLeave={() => setTip(null)}
      style={{ borderBottom:`1px dashed ${T.red}`, cursor:"help", color:T.red }}>
      {children||term}
    </span>
  );
}

function SmartText({ text }) {
  const terms = Object.keys(GLOSSARY).sort((a,b)=>b.length-a.length);
  const parts = []; let remaining = text; let key = 0;
  while (remaining.length > 0) {
    let matched = false;
    for (const term of terms) {
      const idx = remaining.indexOf(term);
      if (idx === 0) {
        parts.push(<GlossaryTerm key={key++} term={term}>{term}</GlossaryTerm>);
        remaining = remaining.slice(term.length); matched = true; break;
      } else if (idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
        parts.push(<GlossaryTerm key={key++} term={term}>{term}</GlossaryTerm>);
        remaining = remaining.slice(idx+term.length); matched = true; break;
      }
    }
    if (!matched) { parts.push(<span key={key++}>{remaining}</span>); remaining=""; }
  }
  return <span>{parts}</span>;
}

// ─── Micro-components ─────────────────────────────────────────────────────────
function Mono({ children, style={} }) {
  return <span style={{ fontFamily:"'IBM Plex Mono',monospace", ...style }}>{children}</span>;
}
function OutlineTag({ label, color }) {
  const c = color||T.ink3;
  return <span style={{ display:"inline-block", padding:"1px 7px", fontSize:10,
    fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase",
    border:`1px solid ${c}`, color:c, whiteSpace:"nowrap" }}>{label}</span>;
}
function CostTag({ model }) {
  const map = { free:[T.ink,"FREE"], freemium:["#8a6a00","FREEMIUM"], paid:[T.red,"PAID"] };
  const [c,l] = map[model]||[T.ink3,model];
  return <OutlineTag label={l} color={c}/>;
}
function CodingTag({ level }) {
  const map = { none:["#2d6a2d","NO CODE"], optional:[T.ink2,"CODE OPTIONAL"], required:[T.red,"CODE REQUIRED"] };
  const [c,l] = map[level]||[T.ink3,level];
  return <OutlineTag label={l} color={c}/>;
}
function FriendlinessBar({ rating }) {
  const labels = ["","Expert only","Advanced","Moderate","Easy","Very easy"];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", gap:2 }}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{ width:16, height:3, background:i<=rating?T.ink:T.rule2 }}/>
        ))}
      </div>
      <Mono style={{ fontSize:10, color:rating>=4?T.ink:T.ink3, textTransform:"uppercase", letterSpacing:"0.07em" }}>
        {labels[rating]||""}
      </Mono>
    </div>
  );
}

// ─── Glossary panel ───────────────────────────────────────────────────────────
function GlossaryPanel({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(24,24,27,0.3)" }}/>
      <div style={{ position:"relative", background:T.paper, width:380, maxWidth:"100%",
        height:"100%", overflowY:"auto", borderLeft:`1px solid ${T.rule}`,
        display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"24px 28px 20px", borderBottom:`1px solid ${T.rule}`,
          display:"flex", justifyContent:"space-between", alignItems:"baseline",
          position:"sticky", top:0, background:T.paper }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.ink, fontWeight:600 }}>Glossary</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.ink3,
            textTransform:"uppercase", letterSpacing:"0.07em" }}>close ×</button>
        </div>
        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {Object.entries(GLOSSARY).map(([term,def])=>(
            <div key={term}>
              <Mono style={{ fontSize:11, color:T.ink, fontWeight:"bold", display:"block",
                marginBottom:4, borderBottom:`1px solid ${T.rule2}`, paddingBottom:4 }}>{term}</Mono>
              <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink2, lineHeight:1.65 }}>{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── How to Contribute guide ──────────────────────────────────────────────────
function ContributeGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop:`1px solid ${T.rule2}`, borderBottom:`1px solid ${T.rule2}`, marginBottom:32 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", padding:"14px 0", background:"transparent",
        border:"none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
          <Mono style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.12em" }}>
            For students
          </Mono>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:T.ink, fontWeight:600 }}>
            How to contribute a dataset
          </span>
        </div>
        <Mono style={{ fontSize:11, color:T.ink3 }}>{open?"↑ collapse":"↓ expand"}</Mono>
      </button>
      {open && (
        <div style={{ paddingBottom:24 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px 32px", marginBottom:20 }}>
            {[
              ["01 — Find a source","It should be openly accessible (free or free with registration), relevant to built environment or climate research, and not already in the catalogue. Check the search box first."],
              ["02 — Fill in the form","Use the 'Contribute' button below. Write the description in plain language — imagine explaining it to a fellow student in their first year of the programme."],
              ["03 — Submit for review","After filling in the form, click 'Submit to Official Catalogue'. This opens a GitHub Issue pre-filled with your entry. Bilge will review and add approved entries to the main catalogue."],
              ["04 — Quality bar","Good entries have: a clear description, at least two example research questions, a realistic beginner rating, and accurate format/coverage information. Check the existing entries for the right tone and level of detail."],
            ].map(([title, text])=>(
              <div key={title}>
                <Mono style={{ fontSize:10, color:T.red, display:"block", marginBottom:6, letterSpacing:"0.08em" }}>{title}</Mono>
                <p style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink2, lineHeight:1.65, margin:0 }}>{text}</p>
              </div>
            ))}
          </div>
          <div style={{ background:T.paper2, padding:"12px 16px", borderLeft:`2px solid ${T.rule}` }}>
            <Mono style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>
              Note on local vs. official entries
            </Mono>
            <p style={{ fontFamily:"'Crimson Pro',serif", fontSize:13, color:T.ink2, lineHeight:1.6, margin:0 }}>
              Entries you add via the form below are saved locally in your browser — only you can see them. To add an entry to the shared official catalogue, use the "Submit to Official Catalogue" button inside the form. This creates a GitHub Issue that Bilge will review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Start Here wizard ────────────────────────────────────────────────────────
const FOCUS_MAP = {
  "Climate & Weather":   ["Climate & Atmosphere"],
  "Urban & Buildings":   ["Urban & Built Environment","Building Energy & Performance"],
  "Land & Environment":  ["Land Use & Land Cover"],
  "Energy":              ["Energy & Infrastructure"],
  "Air Quality":         ["Air Quality & Pollution"],
  "Hazards & Risk":      ["Climate Hazards & Risk"],
  "Not sure yet":        [],
};
const REGION_OPTIONS = ["Global / Anywhere","Europe","United Kingdom","North America","Asia or Africa","Flexible"];
const CODING_OPTIONS  = ["Complete beginner — no coding","Some experience — can follow tutorials","Comfortable — I write scripts"];

function StartHere({ entries, onHighlight }) {
  const [open, setOpen]     = useState(true);
  const [step, setStep]     = useState(0);
  const [focus, setFocus]   = useState(null);
  const [region, setRegion] = useState(null);
  const [coding, setCoding] = useState(null);
  const [pool, setPool]     = useState([]);
  const [shown, setShown]   = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  const compute = (f,r,c) => {
    let p = [...entries];
    const cats = FOCUS_MAP[f]||[];
    if (cats.length) p = p.filter(e=>cats.includes(e.category));
    if (r && r!=="Global / Anywhere" && r!=="Flexible") {
      p = p.filter(e=>e.regions.includes("Global")||e.regions.some(reg=>reg.toLowerCase().includes(r.split(" ")[0].toLowerCase())));
    }
    if (c?.includes("beginner")) p = p.filter(e=>e.codingRequired==="none"||e.codingRequired==="optional");
    else if (c?.includes("Some")) p = p.filter(e=>e.codingRequired!=="required"||e.beginnerRating>=3);
    return [...p].sort((a,b)=>(b.beginnerRating||3)-(a.beginnerRating||3));
  };

  const handleCoding = v => {
    setCoding(v);
    const fullPool = compute(focus, region, v);
    setPool(fullPool);
    setShown(fullPool.slice(0,3).map(e=>e.id));
    setDismissed(new Set());
    setStep(3);
  };

  const dismiss = (id) => {
    const newDismissed = new Set([...dismissed, id]);
    setDismissed(newDismissed);
    const next = pool.find(e=>!newDismissed.has(e.id)&&!shown.includes(e.id));
    setShown(prev=>{ const without=prev.filter(sid=>sid!==id); return next?[...without,next.id]:without; });
  };

  const reset = () => { setStep(0);setFocus(null);setRegion(null);setCoding(null);setPool([]);setShown([]);setDismissed(new Set()); };

  const shownEntries    = shown.map(id=>pool.find(e=>e.id===id)).filter(Boolean);
  const remainingInPool = pool.filter(e=>!dismissed.has(e.id)&&!shown.includes(e.id)).length;

  const optBtn = (label, active, onClick) => (
    <button key={label} onClick={onClick} style={{ padding:"9px 16px", cursor:"pointer",
      fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:"0.04em",
      textTransform:"uppercase", background:active?T.ink:"transparent",
      color:active?T.paper:T.ink2, border:`1px solid ${active?T.ink:T.rule}`, transition:"all 0.12s" }}
      onMouseEnter={e=>{ if(!active){e.currentTarget.style.borderColor=T.ink2; e.currentTarget.style.color=T.ink;} }}
      onMouseLeave={e=>{ if(!active){e.currentTarget.style.borderColor=T.rule; e.currentTarget.style.color=T.ink2;} }}>
      {label}
    </button>
  );

  const back = (to) => <button onClick={()=>setStep(to)} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.ink3, background:"none", border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.07em", marginTop:12 }}>← back</button>;

  return (
    <div style={{ borderTop:`2px solid ${T.ink}`, borderBottom:`1px solid ${T.rule}`, marginBottom:40 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", padding:"18px 0", background:"transparent", border:"none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:16 }}>
          <Mono style={{ fontSize:10, color:T.red, textTransform:"uppercase", letterSpacing:"0.12em" }}>New to research data?</Mono>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.ink, fontWeight:600 }}>Find your first dataset in 3 steps</span>
        </div>
        <Mono style={{ fontSize:11, color:T.ink3 }}>{open?"collapse ↑":"open ↓"}</Mono>
      </button>

      {open && (
        <div style={{ paddingBottom:28 }}>
          <div style={{ display:"flex", marginBottom:28, borderTop:`1px solid ${T.rule2}` }}>
            {["01 — Focus","02 — Region","03 — Coding"].map((l,i)=>(
              <div key={l} style={{ flex:1, padding:"8px 0", borderBottom:`2px solid ${i<step?T.ink:i===step&&step<3?T.red:T.rule2}` }}>
                <Mono style={{ fontSize:10, color:i<step?T.ink:i===step&&step<3?T.red:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em" }}>{l}</Mono>
              </div>
            ))}
          </div>

          {step===0 && <div><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:T.ink2, marginBottom:14 }}>What is your research primarily about?</div><div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{Object.keys(FOCUS_MAP).map(f=>optBtn(f,focus===f,()=>{setFocus(f);setStep(1);}))}</div></div>}
          {step===1 && <div><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:T.ink2, marginBottom:14 }}>Where is your study area?</div><div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:8 }}>{REGION_OPTIONS.map(r=>optBtn(r,region===r,()=>{setRegion(r);setStep(2);}))}</div>{back(0)}</div>}
          {step===2 && <div><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:T.ink2, marginBottom:14 }}>How comfortable are you with coding?</div><div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:480, marginBottom:8 }}>{CODING_OPTIONS.map(c=>optBtn(c,coding===c,()=>handleCoding(c)))}</div>{back(1)}</div>}

          {step===3 && (
            <div>
              {shownEntries.length > 0 ? (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:T.ink2 }}>
                      {shownEntries.length} suggestion{shownEntries.length!==1?"s":""} — dismiss any you already know:
                    </div>
                    {remainingInPool>0&&<Mono style={{ fontSize:10, color:T.ink3 }}>{remainingInPool} more in pool</Mono>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    {shownEntries.map((e,i)=>(
                      <div key={e.id} style={{ display:"flex", gap:20, padding:"14px 0", borderTop:`1px solid ${T.rule2}`, alignItems:"flex-start" }}>
                        <Mono style={{ fontSize:20, color:T.rule, fontWeight:700, minWidth:28, lineHeight:1.2, paddingTop:2 }}>{String(i+1).padStart(2,"0")}</Mono>
                        <div style={{ flex:1, cursor:"pointer" }} onClick={()=>{ onHighlight(e.id); setOpen(false); }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.ink, fontWeight:600, marginBottom:4 }}>{e.name} <span style={{ fontSize:14, color:T.ink3 }}>→</span></div>
                          <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink2, marginBottom:8, lineHeight:1.55 }}>{e.description.slice(0,110)}…</div>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                            <FriendlinessBar rating={e.beginnerRating||3}/><CostTag model={e.costModel}/><CodingTag level={e.codingRequired}/>
                          </div>
                        </div>
                        <button onClick={()=>dismiss(e.id)} title="I already know this — show me something else"
                          style={{ flexShrink:0, alignSelf:"flex-start", marginTop:4, background:"none",
                            border:`1px solid ${T.rule2}`, cursor:"pointer",
                            fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.ink3,
                            padding:"4px 8px", textTransform:"uppercase", letterSpacing:"0.06em",
                            whiteSpace:"nowrap", transition:"all 0.12s" }}
                          onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.ink; e.currentTarget.style.color=T.ink; }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.rule2; e.currentTarget.style.color=T.ink3; }}>
                          I know this ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {remainingInPool===0&&shownEntries.length<3&&(
                    <div style={{ marginTop:16, padding:"12px 14px", background:T.paper2, borderLeft:`2px solid ${T.rule}` }}>
                      <Mono style={{ fontSize:10, color:T.ink3 }}>You've seen all matching suggestions. Use the filters below to explore the full catalogue.</Mono>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding:"12px 14px", background:T.paper2, borderLeft:`2px solid ${T.rule}` }}>
                  <Mono style={{ fontSize:10, color:T.ink3 }}>
                    {pool.length===0?"No exact matches — try different criteria.":"You've dismissed all suggestions — great, you clearly know your sources! Use the filters below to explore."}
                  </Mono>
                </div>
              )}
              <button onClick={reset} style={{ marginTop:16, fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.ink3, background:"none", border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.07em" }}>← start over</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onExpand, isExpanded, highlighted }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(()=>{ if(highlighted&&ref.current) ref.current.scrollIntoView({behavior:"smooth",block:"center"}); },[highlighted]);

  const copyCitation = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getCitation(entry)).then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false), 2500);
    });
  };

  return (
    <div ref={ref} onClick={()=>onExpand(entry.id)} style={{
      padding:"20px 0 20px 16px", borderTop:`1px solid ${T.rule2}`,
      borderLeft:`3px solid ${isExpanded||highlighted?T.red:"transparent"}`,
      marginLeft:-3, cursor:"pointer",
      background:highlighted?T.redFade:"transparent", transition:"all 0.15s" }}
      onMouseEnter={e=>{ if(!isExpanded&&!highlighted) e.currentTarget.style.borderLeftColor=T.rule; }}
      onMouseLeave={e=>{ if(!isExpanded&&!highlighted) e.currentTarget.style.borderLeftColor="transparent"; }}>

      {/* Category + new badge */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
            <Mono style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em" }}>
              {entry.category}
            </Mono>
            {isNew(entry) && (
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.1em",
                textTransform:"uppercase", background:T.red, color:"#fff", padding:"1px 6px" }}>New</span>
            )}
            {entry.status==="pending" && (
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.1em",
                textTransform:"uppercase", background:T.ink2, color:T.paper, padding:"1px 6px" }}>Student submission</span>
            )}
          </div>
          <h2 style={{ margin:0, fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:600, color:T.ink, lineHeight:1.2 }}>
            {entry.name}
          </h2>
        </div>
        <FriendlinessBar rating={entry.beginnerRating||3}/>
      </div>

      {/* Description */}
      <p style={{ margin:"0 0 14px", fontFamily:"'Crimson Pro',serif", fontSize:15, color:T.ink2, lineHeight:1.6 }}>
        {isExpanded ? entry.description : entry.description.slice(0,140)+(entry.description.length>140?"…":"")}
      </p>

      {/* Tags */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        <CostTag model={entry.costModel}/>
        <CodingTag level={entry.codingRequired}/>
        {(entry.scale||[]).map(s=><OutlineTag key={s} label={s} color={T.ink3}/>)}
        {(entry.regions||[]).filter(r=>r!=="Global").map(r=><OutlineTag key={r} label={r} color={T.ink3}/>)}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div onClick={e=>e.stopPropagation()} style={{ marginTop:20 }}>

          {/* Research questions */}
          {entry.researchQuestions?.length>0 && (
            <div style={{ background:T.paper2, padding:"16px 18px", marginBottom:20, borderLeft:`2px solid ${T.rule}` }}>
              <Mono style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:12 }}>
                Good for answering questions like…
              </Mono>
              {entry.researchQuestions.map((q,i)=>(
                <div key={i} style={{ display:"flex", gap:12, marginBottom:i<entry.researchQuestions.length-1?10:0 }}>
                  <Mono style={{ color:T.ink3, fontSize:11, minWidth:16, paddingTop:2 }}>–</Mono>
                  <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:15, color:T.ink2, lineHeight:1.55 }}>{q}</span>
                </div>
              ))}
            </div>
          )}

          {/* Student tip */}
          {entry.studentTip && (
            <div style={{ background:T.redFade, padding:"14px 16px", marginBottom:20, borderLeft:`2px solid ${T.red}` }}>
              <Mono style={{ fontSize:10, color:T.red, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>Student tip</Mono>
              <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink2, lineHeight:1.55 }}>{entry.studentTip}</span>
            </div>
          )}

          {/* Metadata grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0, marginBottom:20, border:`1px solid ${T.rule2}` }}>
            {[["Coverage",entry.temporalCoverage],["Temporal res.",entry.temporalResolution],["Spatial res.",<SmartText key="sr" text={entry.spatialResolution||""}/>]].map(([k,v],i)=>(
              <div key={i} style={{ padding:"12px 14px", borderRight:i<2?`1px solid ${T.rule2}`:"none" }}>
                <Mono style={{ fontSize:9, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:5 }}>{k}</Mono>
                <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Formats + Topics */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
            <div>
              <Mono style={{ fontSize:9, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>Formats</Mono>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {(entry.formats||[]).map(f=>(
                  <span key={f} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.ink2, borderBottom:`1px solid ${T.rule}` }}>
                    <SmartText text={f}/>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <Mono style={{ fontSize:9, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:8 }}>Topics</Mono>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {(entry.topics||[]).map(t=>(
                  <span key={t} style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink2, marginRight:4 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer: link + citation + attribution */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:16, borderTop:`1px solid ${T.rule2}`, flexWrap:"wrap", gap:10 }}>
            <a href={entry.url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.ink, textDecoration:"none", borderBottom:`1px solid ${T.ink}` }}>
              {entry.url.replace(/^https?:\/\//,"").split("/")[0]} ↗
            </a>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <button onClick={copyCitation} style={{ background:"none", border:`1px solid ${T.rule}`, padding:"4px 10px", cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:copied?T.red:T.ink3, textTransform:"uppercase", letterSpacing:"0.06em", transition:"color 0.2s" }}>
                {copied?"✓ copied":"cite"}
              </button>
              {entry.status !== "curated" && (
                <Mono style={{ fontSize:10, color:T.ink3 }}>
                  submitted by {entry.submittedBy||"student"} · {entry.dateAdded}
                </Mono>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contribution Form ────────────────────────────────────────────────────────
function ContributionForm({ onSubmit, onCancel }) {
  const empty = { name:"",description:"",url:"",category:"Climate & Atmosphere",topics:"",
    costModel:"free",codingRequired:"optional",scale:[],regions:"",temporalCoverage:"",
    temporalResolution:"",spatialResolution:"",formats:"",beginnerRating:3,
    researchQuestions:"",submittedBy:"",studentTip:"" };
  const [form,setForm]     = useState(empty);
  const [errors,setErrors] = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleScale = s => set("scale", form.scale.includes(s)?form.scale.filter(x=>x!==s):[...form.scale,s]);

  const validate = () => {
    const e={};
    if(!form.name.trim())e.name="Required";
    if(!form.description.trim())e.description="Required";
    if(!form.url.trim())e.url="Required";
    if(!form.submittedBy.trim())e.submittedBy="Required";
    if(!form.scale.length)e.scale="Required";
    return e;
  };

  const handleLocalSubmit = () => {
    const e=validate(); if(Object.keys(e).length){setErrors(e);return;}
    onSubmit({...form,
      topics:form.topics.split(",").map(t=>t.trim()).filter(Boolean),
      regions:form.regions.split(",").map(r=>r.trim()).filter(Boolean),
      formats:form.formats.split(",").map(f=>f.trim()).filter(Boolean),
      researchQuestions:form.researchQuestions.split("\n").map(q=>q.trim()).filter(Boolean),
    });
  };

  const handleGithubSubmit = () => {
    const e=validate(); if(Object.keys(e).length){setErrors(e);return;}
    window.open(getIssueUrl(form),"_blank");
  };

  const inp = (err,multi=false) => ({
    width:"100%", boxSizing:"border-box", background:T.white,
    border:`1px solid ${err?T.red:T.rule}`, padding:"9px 11px",
    fontFamily:"'Crimson Pro',serif", fontSize:15, color:T.ink, outline:"none",
    resize:multi?"vertical":"none", minHeight:multi?80:"auto",
  });
  const lbl = { fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.ink3,
    textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 };

  return (
    <div style={{ borderTop:`2px solid ${T.ink}`, paddingTop:28, marginTop:16 }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.ink, marginBottom:4, fontWeight:600 }}>
        Contribute a Dataset
      </div>
      <p style={{ fontFamily:"'Crimson Pro',serif", fontSize:14, color:T.ink2, marginBottom:8 }}>
        Fill in the form, then choose how to submit. <strong>Local preview</strong> saves to your browser only. <strong>Official catalogue</strong> opens a GitHub Issue for review.
      </p>
      <div style={{ background:T.paper2, padding:"10px 14px", marginBottom:24, borderLeft:`2px solid ${T.rule}` }}>
        <Mono style={{ fontSize:10, color:T.ink3 }}>Fields marked * are required.</Mono>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px 28px" }}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Dataset Name *</label>
          <input value={form.name} onChange={e=>set("name",e.target.value)} style={inp(errors.name)} placeholder="e.g. UK Rainfall Radar Archive"/>
          {errors.name&&<Mono style={{fontSize:10,color:T.red,display:"block",marginTop:3}}>{errors.name}</Mono>}
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Description * — plain language, please</label>
          <textarea value={form.description} onChange={e=>set("description",e.target.value)} style={inp(errors.description,true)} placeholder="What is this dataset and why is it useful for research?"/>
          {errors.description&&<Mono style={{fontSize:10,color:T.red,display:"block",marginTop:3}}>{errors.description}</Mono>}
        </div>
        <div>
          <label style={lbl}>URL *</label>
          <input value={form.url} onChange={e=>set("url",e.target.value)} style={inp(errors.url)} placeholder="https://..."/>
          {errors.url&&<Mono style={{fontSize:10,color:T.red,display:"block",marginTop:3}}>{errors.url}</Mono>}
        </div>
        <div>
          <label style={lbl}>Category</label>
          <select value={form.category} onChange={e=>set("category",e.target.value)}
            style={{...inp(false),cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
            {CATEGORIES.filter(c=>c!=="All Categories").map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Example research questions this data can help answer (one per line)</label>
          <textarea value={form.researchQuestions} onChange={e=>set("researchQuestions",e.target.value)}
            style={inp(false,true)} placeholder={"How has X changed in Y region over time?\nWhat is the relationship between A and B?"}/>
        </div>
        <div>
          <label style={lbl}>Cost Model</label>
          <div style={{display:"flex"}}>
            {["free","freemium","paid"].map((c,i)=>(
              <button key={c} onClick={()=>set("costModel",c)} style={{flex:1,padding:"8px",cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:"0.07em",textTransform:"uppercase",
                background:form.costModel===c?T.ink:T.white,color:form.costModel===c?T.paper:T.ink3,
                border:`1px solid ${T.rule}`,borderRight:i<2?"none":`1px solid ${T.rule}`}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Coding Required?</label>
          <div style={{display:"flex"}}>
            {["none","optional","required"].map((c,i)=>(
              <button key={c} onClick={()=>set("codingRequired",c)} style={{flex:1,padding:"8px",cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:10,textTransform:"uppercase",
                background:form.codingRequired===c?T.ink:T.white,color:form.codingRequired===c?T.paper:T.ink3,
                border:`1px solid ${T.rule}`,borderRight:i<2?"none":`1px solid ${T.rule}`}}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>How beginner-friendly is it? *</label>
          <div style={{display:"flex",marginBottom:4}}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>set("beginnerRating",n)} style={{flex:1,padding:"10px 0",cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                background:n<=form.beginnerRating?T.ink:T.white,color:n<=form.beginnerRating?T.paper:T.ink3,
                border:`1px solid ${T.rule}`,borderRight:n<5?"none":`1px solid ${T.rule}`}}>{n}</button>
            ))}
          </div>
          <Mono style={{fontSize:10,color:T.ink3}}>
            {["","Expert only","Advanced","Moderate","Easy","Very easy — great for beginners"][form.beginnerRating]}
          </Mono>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Scale * {errors.scale&&<span style={{color:T.red,marginLeft:8}}>{errors.scale}</span>}</label>
          <div style={{display:"flex"}}>
            {["Global","Continental","National","Regional","Local"].map((s,i)=>(
              <button key={s} onClick={()=>toggleScale(s)} style={{flex:1,padding:"9px 0",cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",
                background:form.scale.includes(s)?T.ink:T.white,color:form.scale.includes(s)?T.paper:T.ink3,
                border:`1px solid ${T.rule}`,borderRight:i<4?"none":`1px solid ${T.rule}`}}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Regions (comma-separated)</label>
          <input value={form.regions} onChange={e=>set("regions",e.target.value)} style={inp(false)} placeholder="Global, Europe, UK"/>
        </div>
        <div>
          <label style={lbl}>Topics (comma-separated)</label>
          <input value={form.topics} onChange={e=>set("topics",e.target.value)} style={inp(false)} placeholder="Temperature, Flooding"/>
        </div>
        <div>
          <label style={lbl}>Temporal Coverage</label>
          <input value={form.temporalCoverage} onChange={e=>set("temporalCoverage",e.target.value)} style={inp(false)} placeholder="1940–present"/>
        </div>
        <div>
          <label style={lbl}>Temporal Resolution</label>
          <input value={form.temporalResolution} onChange={e=>set("temporalResolution",e.target.value)} style={inp(false)} placeholder="Hourly, Monthly…"/>
        </div>
        <div>
          <label style={lbl}>Spatial Resolution</label>
          <input value={form.spatialResolution} onChange={e=>set("spatialResolution",e.target.value)} style={inp(false)} placeholder="30 m, 1 km…"/>
        </div>
        <div>
          <label style={lbl}>Formats (comma-separated)</label>
          <input value={form.formats} onChange={e=>set("formats",e.target.value)} style={inp(false)} placeholder="CSV, GeoTIFF, API…"/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Student Tip — any practical gotchas or shortcuts?</label>
          <textarea value={form.studentTip} onChange={e=>set("studentTip",e.target.value)} style={inp(false,true)} placeholder="e.g. 'Registration takes 24 hours — do it early! Start with the 5-year average before trying hourly downloads.'"/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Your Name *</label>
          <input value={form.submittedBy} onChange={e=>set("submittedBy",e.target.value)} style={inp(errors.submittedBy)} placeholder="e.g. Priya (MSc Environmental Planning, 2026)"/>
          {errors.submittedBy&&<Mono style={{fontSize:10,color:T.red,display:"block",marginTop:3}}>{errors.submittedBy}</Mono>}
        </div>
      </div>

      {/* Submit buttons */}
      <div style={{ display:"flex", gap:12, marginTop:28, flexWrap:"wrap" }}>
        <button onClick={handleGithubSubmit} style={{ padding:"12px 24px", cursor:"pointer",
          background:T.ink, color:T.paper, border:"none",
          fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700,
          textTransform:"uppercase", letterSpacing:"0.08em" }}>
          ↗ Submit to Official Catalogue
        </button>
        <button onClick={handleLocalSubmit} style={{ padding:"12px 20px", cursor:"pointer",
          background:"transparent", color:T.ink2, border:`1px solid ${T.rule}`,
          fontFamily:"'IBM Plex Mono',monospace", fontSize:11,
          textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Local preview only
        </button>
        <button onClick={onCancel} style={{ padding:"12px 20px", cursor:"pointer",
          background:"transparent", color:T.ink3, border:`1px solid ${T.rule2}`,
          fontFamily:"'IBM Plex Mono',monospace", fontSize:11,
          textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Cancel
        </button>
      </div>
      <p style={{ fontFamily:"'Crimson Pro',serif", fontSize:12, color:T.ink3, marginTop:10, lineHeight:1.5 }}>
        "Submit to Official Catalogue" opens a pre-filled GitHub Issue — Bilge will review and add approved entries.
        "Local preview only" saves the entry to your browser for your own reference.
      </p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [studentEntries, setStudentEntries] = useState([]);
  const [expandedId, setExpandedId]         = useState(null);
  const [highlightId, setHighlightId]       = useState(null);
  const [showForm, setShowForm]             = useState(false);
  const [showGlossary, setShowGlossary]     = useState(false);
  const [toast, setToast]                   = useState(null);

  const [search, setSearch]             = useState("");
  const [filterCat, setFilterCat]       = useState("All Categories");
  const [filterCost, setFilterCost]     = useState("all");
  const [filterCoding, setFilterCoding] = useState("all");
  const [filterScale, setFilterScale]   = useState("all");
  const [sortBy, setSortBy]             = useState("default");

  useEffect(()=>{ setStudentEntries(loadStudentEntries()); }, []);

  const allEntries = useMemo(()=>[...SEED_ENTRIES, ...studentEntries], [studentEntries]);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null), 3200); };

  const handleHighlight = id => {
    setHighlightId(id); setExpandedId(id);
    setTimeout(()=>setHighlightId(null), 3000);
  };

  const handleSubmit = data => {
    const entry = { ...data, id:`student-${Date.now()}`, status:"pending", dateAdded:new Date().toISOString().split("T")[0] };
    const updated = [...studentEntries, entry];
    setStudentEntries(updated);
    saveStudentEntries(updated);
    setShowForm(false);
    showToast("Entry saved locally — visible only to you.");
  };

  const filtered = useMemo(()=>allEntries.filter(e=>{
    const q = search.toLowerCase();
    const ms = !q || [e.name, e.description, ...(e.topics||[]), e.category, ...(e.researchQuestions||[])].some(s=>(s||"").toLowerCase().includes(q));
    return ms &&
      (filterCat==="All Categories"||e.category===filterCat) &&
      (filterCost==="all"||e.costModel===filterCost) &&
      (filterCoding==="all"||e.codingRequired===filterCoding) &&
      (filterScale==="all"||(e.scale||[]).includes(filterScale));
  }), [allEntries, search, filterCat, filterCost, filterCoding, filterScale]);

  const sorted = useMemo(()=>{
    const list = [...filtered];
    if (sortBy==="az")     return list.sort((a,b)=>a.name.localeCompare(b.name));
    if (sortBy==="za")     return list.sort((a,b)=>b.name.localeCompare(a.name));
    if (sortBy==="rating") return list.sort((a,b)=>(b.beginnerRating||3)-(a.beginnerRating||3));
    if (sortBy==="newest") return list.sort((a,b)=>new Date(b.dateAdded)-new Date(a.dateAdded));
    return list;
  }, [filtered, sortBy]);

  const stats = useMemo(()=>({
    total:      allEntries.length,
    free:       allEntries.filter(e=>e.costModel==="free").length,
    noCode:     allEntries.filter(e=>e.codingRequired==="none").length,
    contributed:studentEntries.length,
    newCount:   allEntries.filter(isNew).length,
  }), [allEntries, studentEntries]);

  const selStyle = { background:"transparent", border:`1px solid ${T.rule}`, padding:"7px 10px",
    fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.ink2,
    textTransform:"uppercase", letterSpacing:"0.06em", cursor:"pointer", outline:"none" };

  return (
    <TooltipProvider>
      {toast && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          background:T.ink, color:T.paper, padding:"12px 24px",
          fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:"0.05em",
          zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      <GlossaryPanel open={showGlossary} onClose={()=>setShowGlossary(false)}/>

      <div style={{ minHeight:"100vh", background:T.paper }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{ borderBottom:`2px solid ${T.ink}`, padding:"28px 48px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"flex-end",
          flexWrap:"wrap", gap:16 }}>
          <div>
            <Mono style={{ fontSize:9, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.15em", display:"block", marginBottom:8 }}>
              Built Environment &amp; Climate Research
            </Mono>
            <h1 style={{ margin:0, fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:600, color:T.ink, lineHeight:1, letterSpacing:"-0.01em" }}>
              <span style={{color:T.red}}>Source</span>book
            </h1>
            <p style={{ margin:"8px 0 0", fontFamily:"'Crimson Pro',serif", fontSize:15, color:T.ink2, maxWidth:520, lineHeight:1.5 }}>
              A curated catalogue of open datasets for built environment and climate research.{" "}
              <GlossaryTerm term="raster">Hover red terms</GlossaryTerm> for plain-English definitions.
            </p>
            <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.rule2}` }}>
              <Mono style={{ fontSize:11, color:T.ink, letterSpacing:"0.03em", display:"block", marginBottom:2 }}>Bilge Kobas</Mono>
              <Mono style={{ fontSize:9, color:T.ink3, letterSpacing:"0.04em", display:"block", lineHeight:1.7 }}>
                Technical University of Munich<br/>
                Chair of Building Technology and Climate-Responsive Design
              </Mono>
              <Mono style={{ fontSize:9, color:T.ink3, marginTop:4, display:"block" }}>
                {VERSION} · {LAST_UPDATED}
              </Mono>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"flex-end" }}>
            <div style={{ display:"flex", gap:24, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {[["entries",stats.total],["fully free",stats.free],["no coding",stats.noCode],stats.newCount>0?["new",stats.newCount]:null].filter(Boolean).map(([l,v])=>(
                <div key={l} style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:600, color:l==="new"?T.red:T.ink, lineHeight:1 }}>{v}</div>
                  <Mono style={{ fontSize:9, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em" }}>{l}</Mono>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>exportToCSV(allEntries)} style={{ ...selStyle, color:T.ink, borderColor:T.ink }}>
                ↓ Export CSV
              </button>
              <button onClick={()=>setShowGlossary(true)} style={selStyle}>
                Glossary
              </button>
            </div>
          </div>
        </header>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 48px" }}>

          <StartHere entries={allEntries} onHighlight={handleHighlight}/>
          <ContributeGuide/>

          {/* Search + filters + sort */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:8 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name, topic, research question…"
              style={{ flex:"1 1 280px", minWidth:200, padding:"9px 12px", background:T.white,
                border:`1px solid ${T.rule}`, fontFamily:"'Crimson Pro',serif",
                fontSize:15, color:T.ink, outline:"none" }}/>
            <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={selStyle}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <select value={filterCost} onChange={e=>setFilterCost(e.target.value)} style={selStyle}>
              <option value="all">All Costs</option>
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
            </select>
            <select value={filterCoding} onChange={e=>setFilterCoding(e.target.value)} style={selStyle}>
              <option value="all">Any Coding</option>
              <option value="none">No Coding</option>
              <option value="optional">Optional</option>
              <option value="required">Required</option>
            </select>
            <select value={filterScale} onChange={e=>setFilterScale(e.target.value)} style={selStyle}>
              <option value="all">Any Scale</option>
              {["Global","Continental","National","Regional","Local"].map(s=><option key={s}>{s}</option>)}
            </select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...selStyle,borderColor:sortBy!=="default"?T.ink:T.rule,color:sortBy!=="default"?T.ink:T.ink2}}>
              <option value="default">Default order</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="rating">Best for beginners</option>
              <option value="newest">Newest first</option>
            </select>
            {(search||filterCat!=="All Categories"||filterCost!=="all"||filterCoding!=="all"||filterScale!=="all"||sortBy!=="default")&&(
              <button onClick={()=>{setSearch("");setFilterCat("All Categories");setFilterCost("all");setFilterCoding("all");setFilterScale("all");setSortBy("default");}}
                style={{...selStyle,color:T.red,borderColor:T.red}}>Clear</button>
            )}
          </div>

          {/* Sub-bar */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 0", borderBottom:`1px solid ${T.rule2}`, marginBottom:0 }}>
            <Mono style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.08em" }}>
              {sorted.length} {sorted.length===1?"entry":"entries"}{sorted.length!==allEntries.length?` of ${allEntries.length} total`:""}
            </Mono>
            {!showForm && (
              <button onClick={()=>setShowForm(true)}
                style={{...selStyle, color:T.ink, borderColor:T.ink}}>+ Contribute a Dataset</button>
            )}
          </div>

          {showForm && <ContributionForm onSubmit={handleSubmit} onCancel={()=>setShowForm(false)}/>}

          {/* Entry list */}
          {sorted.length===0 ? (
            <div style={{ padding:"60px 0", textAlign:"center" }}>
              <Mono style={{ fontSize:11, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.1em" }}>No entries match your filters</Mono>
            </div>
          ) : (
            <div>
              {sorted.map(entry=>(
                <EntryCard key={entry.id} entry={entry}
                  onExpand={id=>setExpandedId(p=>p===id?null:id)}
                  isExpanded={expandedId===entry.id}
                  highlighted={highlightId===entry.id}/>
              ))}
              <div style={{ borderTop:`1px solid ${T.rule2}`, paddingTop:12 }}>
                <Mono style={{ fontSize:10, color:T.ink3 }}>— End of catalogue —</Mono>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        select option { background: ${T.paper}; }
        input::placeholder, textarea::placeholder { color: ${T.ink3}; font-family: 'Crimson Pro', serif; }
        input:focus, textarea:focus, select:focus { border-color: ${T.ink} !important; outline: none; }
        ::-webkit-scrollbar { width: 5px; background: ${T.paper2}; }
        ::-webkit-scrollbar-thumb { background: ${T.rule}; }
        button { transition: all 0.1s; }
        a { transition: opacity 0.1s; }
        a:hover { opacity: 0.7; }
      `}</style>
    </TooltipProvider>
  );
}
