import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt  = (n, d = 0) =>
  new Intl.NumberFormat("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n ?? 0);
const fmtE = (n, d = 0) => `€\u00A0${fmt(n, d)}`;
const fmtP = (n, d = 2) => `${fmt(n, d)}%`;

const pmt = (P, r_pct, years) => {
  const r = r_pct / 100 / 12;
  const n = years * 12;
  if (!P || P <= 0) return 0;
  if (r === 0) return P / n;
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/* ─────────────────────────────────────────────
   MILAN 2026 MARKET DATA  (source: Immobiliare.it,
   Investropa, Wikicasa – April/May 2026)
───────────────────────────────────────────── */
const MILAN_ZONES = [
  { z:"Centro Storico",        tier:"Prime",        bMin:11000,bMax:15000, rSqm:31.5, gyMin:2.5,gyMax:3.2, profile:"Appreciation" },
  { z:"Brera",                 tier:"Prime",        bMin:8000, bMax:10000, rSqm:32.0, gyMin:3.2,gyMax:4.2, profile:"Appreciation" },
  { z:"Porta Nuova / Garibaldi",tier:"Premium",     bMin:7300, bMax:9900,  rSqm:27.0, gyMin:3.2,gyMax:4.3, profile:"Appreciation" },
  { z:"Porta Venezia",         tier:"Premium",      bMin:7000, bMax:8500,  rSqm:26.0, gyMin:3.7,gyMax:4.5, profile:"Balanced" },
  { z:"Navigli",               tier:"Semi-central", bMin:5500, bMax:7000,  rSqm:24.0, gyMin:4.0,gyMax:5.5, profile:"Balanced" },
  { z:"Porta Romana",          tier:"Semi-central", bMin:6000, bMax:8000,  rSqm:24.0, gyMin:3.7,gyMax:4.7, profile:"Balanced" },
  { z:"Isola / Sarpi",         tier:"Semi-central", bMin:5000, bMax:6500,  rSqm:22.0, gyMin:4.0,gyMax:5.2, profile:"Balanced" },
  { z:"Città Studi",           tier:"Semi-central", bMin:3500, bMax:5000,  rSqm:20.0, gyMin:4.5,gyMax:6.5, profile:"Income" },
  { z:"Bicocca / Niguarda",    tier:"Peripheral",   bMin:2500, bMax:3500,  rSqm:16.0, gyMin:5.0,gyMax:7.0, profile:"Income" },
  { z:"Loreto / Padova",       tier:"Peripheral",   bMin:3000, bMax:4500,  rSqm:18.0, gyMin:4.5,gyMax:6.0, profile:"Income" },
];

const PRESETS = {
  bicocca:   { prezzo:185000, canone:990,  affittoMercato:990,  condo:80,  sqm:55,  label:"Bicocca 1BR" },
  citta:     { prezzo:230000, canone:1150, affittoMercato:1150, condo:95,  sqm:58,  label:"Città Studi 1BR" },
  navigli:   { prezzo:370000, canone:1320, affittoMercato:1380, condo:140, sqm:58,  label:"Navigli 1BR" },
  pv2br:     { prezzo:560000, canone:1950, affittoMercato:2000, condo:185, sqm:75,  label:"Porta Venezia 2BR" },
  brera2br:  { prezzo:720000, canone:2350, affittoMercato:2500, condo:210, sqm:78,  label:"Brera 2BR" },
};

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const GOLD="#C9A96E", NAVY="#0D1B2A", GREEN="#2D6A4F",
      RED="#C1121F",  PURPLE="#6D3FA0", ORANGE="#D97047",
      TEAL="#1A7A7A";

/* ─────────────────────────────────────────────
   MICRO-COMPONENTS
───────────────────────────────────────────── */
const SS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;} body{margin:0;}
  input[type=range]{-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;background:#ddd;outline:none;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:${GOLD};cursor:pointer;}
  input[type=number]{-moz-appearance:textfield;}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px;}
  .hov:hover{opacity:.82;}
  table{border-collapse:collapse;width:100%;}
  th,td{padding:6px 10px;text-align:right;font-family:'DM Sans',sans-serif;}
  th{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}
  td{font-size:11px;}
`;

function SideCard({title,icon,children}){
  return(
    <div style={{background:"#fff",borderRadius:12,padding:"13px 13px 10px",boxShadow:"0 1px 5px rgba(0,0,0,.07)",marginBottom:10}}>
      <div style={{fontSize:9,fontWeight:800,color:GOLD,letterSpacing:".12em",textTransform:"uppercase",marginBottom:11,display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif"}}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

function Field({label,hint,children}){
  return(
    <div style={{marginBottom:11}}>
      <div style={{fontSize:11,fontWeight:600,color:"#4a4a4a",marginBottom:5,fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
      {children}
      {hint&&<div style={{fontSize:9.5,color:"#b5b5b5",marginTop:3,lineHeight:1.45,fontFamily:"'DM Sans',sans-serif"}}>{hint}</div>}
    </div>
  );
}

function Toggle({opts,val,set}){
  return(
    <div style={{display:"flex",gap:3,background:"#f0ede8",borderRadius:8,padding:3}}>
      {opts.map(o=>(
        <button key={o.v} onClick={()=>set(o.v)} style={{flex:1,padding:"5px 4px",fontSize:10.5,fontWeight:700,borderRadius:6,border:"none",cursor:"pointer",transition:"all .15s",background:val===o.v?NAVY:"transparent",color:val===o.v?GOLD:"#777",fontFamily:"'DM Sans',sans-serif"}}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function NumIn({val,set,pre,suf,step=1000,min=0,max}){
  return(
    <div style={{display:"flex",alignItems:"center",border:"1.5px solid #e5e5e5",borderRadius:7,overflow:"hidden",background:"#fff"}}>
      {pre&&<span style={{padding:"7px 9px",background:"#f8f5f0",fontSize:12,color:"#888",borderRight:"1px solid #e5e5e5",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>{pre}</span>}
      <input type="number" value={val} step={step} min={min} max={max} onChange={e=>set(Number(e.target.value))} style={{flex:1,padding:"7px 9px",border:"none",outline:"none",fontSize:13,background:"transparent",fontFamily:"'DM Sans',sans-serif"}}/>
      {suf&&<span style={{padding:"7px 9px",background:"#f8f5f0",fontSize:12,color:"#888",borderLeft:"1px solid #e5e5e5",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>{suf}</span>}
    </div>
  );
}

function Slide({val,set,min,max,step=1,show}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:3}}>
        <span style={{fontSize:12,fontWeight:700,color:NAVY,fontFamily:"'DM Sans',sans-serif"}}>{show??val}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e=>set(Number(e.target.value))} style={{width:"100%",accentColor:GOLD,cursor:"pointer"}}/>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#ccc",marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function KPI({label,value,sub,accent=NAVY,small}){
  return(
    <div style={{background:"#fff",borderRadius:10,padding:small?"9px 11px":"11px 14px",borderLeft:`3px solid ${accent}`,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
      <div style={{fontSize:9,fontWeight:800,color:"#999",textTransform:"uppercase",letterSpacing:".09em",marginBottom:3,fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
      <div style={{fontSize:small?15:17,fontWeight:800,color:NAVY,fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>{value}</div>
      {sub&&<div style={{fontSize:9.5,color:"#aaa",marginTop:3,lineHeight:1.4,fontFamily:"'DM Sans',sans-serif"}}>{sub}</div>}
    </div>
  );
}

function Card({children,style={}}){
  return <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 5px rgba(0,0,0,.07)",...style}}>{children}</div>;
}

function CardTitle({children}){
  return <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f0ede8",fontFamily:"'DM Sans',sans-serif",letterSpacing:".03em"}}>{children}</div>;
}

function Div(){return <div style={{height:1,background:"#f0ede8",margin:"5px 0"}}/>;}

function Row({l,v,bold,neg,pos,hl,indent,muted}){
  const isNeg=typeof v==="number"&&v<0;
  const color=neg?RED:pos?GREEN:bold?NAVY:"#333";
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:hl?"5px 9px":"2.5px 2px",background:hl?"#f4f7ff":"transparent",borderRadius:hl?7:0,marginBottom:1}}>
      <span style={{fontSize:11.5,color:muted?"#bbb":"#4a4a4a",fontWeight:bold?600:400,paddingLeft:indent?10:0,fontFamily:"'DM Sans',sans-serif"}}>{l}</span>
      <span style={{fontSize:11.5,fontWeight:bold?700:400,color,fontFamily:"'DM Sans',sans-serif"}}>
        {isNeg||neg?(v!==undefined?`−${fmtE(Math.abs(v))}`:""):(v!==undefined?fmtE(v):"")}
      </span>
    </div>
  );
}

function InfoBox({color,bg,border,title,children}){
  return(
    <div style={{background:bg,borderRadius:10,padding:12,border:`1px solid ${border}`}}>
      <div style={{fontSize:11,fontWeight:700,color,marginBottom:7,fontFamily:"'DM Sans',sans-serif"}}>{title}</div>
      <div style={{fontSize:10,color,lineHeight:1.75,fontFamily:"'DM Sans',sans-serif"}}>{children}</div>
    </div>
  );
}

const CT = ({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:NAVY,borderRadius:8,padding:"9px 13px",boxShadow:"0 4px 14px rgba(0,0,0,.2)"}}>
      <div style={{fontSize:10,color:GOLD,fontWeight:700,marginBottom:5,fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{fontSize:11,display:"flex",justifyContent:"space-between",gap:14,fontFamily:"'DM Sans',sans-serif"}}>
          <span style={{color:p.color}}>{p.name}</span>
          <span style={{fontWeight:700,color:"#fff"}}>{fmtE(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ItalianPropertyCalc(){

  /* ── Immobile ── */
  const [prezzo,    setPrezzo]    = useState(370000);
  const [accontoPct,setAccontoPct]= useState(20);
  const [tipoUso,   setTipoUso]   = useState("investimento");
  const [venditore, setVenditore] = useState("privato");

  /* ── Mortgage ── */
  const [durataAnni,     setDurataAnni]     = useState(25);
  const [tipoTasso,      setTipoTasso]      = useState("fisso");
  const [tassoFisso,     setTassoFisso]     = useState(3.00);
  const [tassoVariabile, setTassoVariabile] = useState(2.80);

  /* ── Running costs ── */
  const [condo,        setCondo]        = useState(140);
  const [assicurazione,setAssicurazione]= useState(420);
  const [manutenzione, setManutenzione] = useState(0.8);
  const [aliquotaIMU,  setAliquotaIMU]  = useState(10.6);

  /* ── Rental ── */
  const [canone,         setCanone]         = useState(1320);
  const [contratto,      setContratto]      = useState("libero");
  const [sfitto,         setSfitto]         = useState(5);
  const [affittoMercato, setAffittoMercato] = useState(1380);
  const [rendAlt,        setRendAlt]        = useState(4);

  /* ── UI ── */
  const [tab,   setTab]   = useState("summary");
  const [sqmRef,setSqmRef]= useState(58);

  /* ── Apply preset ── */
  const applyPreset = p => {
    setPrezzo(p.prezzo); setCanone(p.canone);
    setAffittoMercato(p.affittoMercato); setCondo(p.condo);
    setSqmRef(p.sqm);
  };

  /* ─────────────────────────────────────────
     CORE CALCULATIONS
  ───────────────────────────────────────── */
  const c = useMemo(()=>{
    const tasso   = tipoTasso==="fisso"?tassoFisso:tassoVariabile;
    const acconto = prezzo*(accontoPct/100);
    const mutuo   = Math.max(0,prezzo-acconto);
    const r       = tasso/100/12;
    const nMesi   = durataAnni*12;

    const rata            = pmt(mutuo,tasso,durataAnni);
    const totaleRate      = rata*nMesi;
    const totaleInteressi = Math.max(0,totaleRate-mutuo);
    const interessiA1     = mutuo*(tasso/100);   // linear approx year 1

    /* ── Purchase taxes (DPR 131/1986 + DPR 633/1972) ── */
    let regImposta=0, ivaAcq=0;
    const ipotecaria = venditore==="privato"?50:200;
    const catastale  = venditore==="privato"?50:200;

    if(tipoUso==="prima_casa"){
      venditore==="privato"
        ?(regImposta=Math.max(prezzo*0.02,1000))
        :(ivaAcq=prezzo*0.04);
    } else {
      venditore==="privato"
        ?(regImposta=Math.max(prezzo*0.09,1000))
        :(ivaAcq=prezzo*0.10);
    }
    const imposte = regImposta+ivaAcq+ipotecaria+catastale;

    /* ── Acquisition costs ── */
    const notaio  = prezzo<100000?prezzo*0.025:prezzo<300000?prezzo*0.018:prezzo<600000?prezzo*0.013:prezzo*0.010;
    const agenzia = prezzo*0.03*1.22;   // 3% + IVA 22%
    const banca   = 1150;               // perizia €350 + istruttoria €800
    const totSpese        = imposte+notaio+agenzia+banca;
    const liquiditaIniziale = acconto+totSpese;

    /* ── Annual holding costs ──
         IMU base imponibile = rendita catastale × 160 × 1.05  (D.L. 23/2011)
         For Milan residential (cat A excl A1/A8/A9): coefficient 160
         Typical rendita catastale ≈ 0.30 % of market value for Milan
         (catastral values significantly below market; OMI ratio 3-6×)       */
    const renditaCat = prezzo*0.003;           // ≈ 0.30% Milan empirical ratio
    const baseIMU    = renditaCat*160*1.05;
    const imuAnnuale = tipoUso!=="prima_casa"?baseIMU*(aliquotaIMU/1000):0;

    const mantAnnua  = prezzo*(manutenzione/100);
    const condAnnuo  = condo*12;
    const costiProp  = imuAnnuale+mantAnnua+condAnnuo+assicurazione;
    const costiPropM = costiProp/12;
    const costoMesT  = rata+costiPropM;

    /* ── Mortgage interest deduction (art.15 TUIR) – Prima Casa only ── */
    const detrazFisc  = tipoUso==="prima_casa"?Math.min(interessiA1,4000)*0.19:0;
    const costoMesN   = costoMesT-detrazFisc/12;

    /* ── Rental P&L (Legge 431/1998 + D.Lgs 23/2011 cedolare secca) ── */
    const cedolare     = contratto==="concordato"?0.10:0.21;
    const rentaBrutta  = canone*12;
    const rentaEff     = rentaBrutta*(1-sfitto/100);
    const cedEuro      = rentaEff*cedolare;
    const rentaNetta   = rentaEff-cedEuro;
    const rentaNetM    = rentaNetta/12;

    /* ── Yields ── */
    const rendLordo = prezzo>0?(rentaBrutta/prezzo)*100:0;
    const rendNetto = (prezzo+totSpese)>0?(rentaNetta/(prezzo+totSpese))*100:0;
    const noi       = rentaNetta-costiProp;
    const capRate   = prezzo>0?(noi/prezzo)*100:0;
    const cfMens    = rentaNetM-costoMesT;
    const cfAnnuo   = cfMens*12;
    const pareggioM = costoMesT/((1-cedolare)*Math.max(0.01,1-sfitto/100));

    /* ── Buy vs Rent ── */
    const oppCost    = liquiditaIniziale*(rendAlt/100)/12;
    const costoReale = costoMesN+oppCost;
    const vantaggio  = affittoMercato-costoReale;

    /* ── Gross yield benchmark vs market ── */
    const rentPerSqm     = sqmRef>0?canone/sqmRef:0;
    const pricePerSqm    = sqmRef>0?prezzo/sqmRef:0;
    const milanAvgSqmBuy = 5679;   // Immobiliare.it May 2026
    const milanAvgSqmRnt = 22.23;  // Immobiliare.it May 2026

    const centerSaleSqm = 11300;   // Centro area, Immobiliare.it May 2026
    const centerRentSqm = 31.29;   // Centro area, Immobiliare.it May 2026
    const centerGrossYield = centerSaleSqm > 0 ? (centerRentSqm * 12 / centerSaleSqm) * 100 : 0;
    const expectedCentralSize = centerSaleSqm > 0 ? prezzo / centerSaleSqm : 0;
    const expectedCentralRent = prezzo > 0 ? prezzo * (centerGrossYield / 100) / 12 : 0;
    const expectedCentralRentLow = prezzo > 0 ? prezzo * 0.030 / 12 : 0;
    const expectedCentralRentHigh = prezzo > 0 ? prezzo * 0.036 / 12 : 0;
    const expectedCentralNetRent = expectedCentralRent * (1 - cedolare);

    /* ── Amortisation schedule ── */
    const ammort=[];
    let residuo=mutuo;
    for(let a=1;a<=durataAnni;a++){
      let iA=0,cA=0;
      for(let m=0;m<12;m++){
        const iM=residuo*r; const cM=Math.max(0,rata-iM);
        iA+=iM; cA+=cM; residuo=Math.max(0,residuo-cM);
      }
      ammort.push({anno:`${a}°`,Capitale:Math.round(cA),Interessi:Math.round(iA),Residuo:Math.round(residuo),Equity:Math.round(mutuo-residuo+acconto)});
    }

    /* ── Buy vs Rent cumulative ── */
    const bvr=[];
    let cumB=liquiditaIniziale,cumR=0;
    for(let a=1;a<=Math.min(durataAnni,30);a++){
      cumB+=costoMesN*12;
      cumR+=affittoMercato*12*Math.pow(1.02,a-1);
      bvr.push({anno:`${a}°`,Purchase:Math.round(cumB),Rent:Math.round(cumR)});
    }

    /* ── Cumulative cash flow ── */
    const cfCum=[];
    let cum=-liquiditaIniziale;
    for(let a=1;a<=Math.min(durataAnni,30);a++){
      cum+=cfAnnuo;
      cfCum.push({anno:`${a}°`,"Cash Flow":Math.round(cum)});
    }

    return {
      tasso,acconto,mutuo,rata,totaleRate,totaleInteressi,interessiA1,
      regImposta,ivaAcq,ipotecaria,catastale,imposte,
      notaio,agenzia,banca,totSpese,liquiditaIniziale,
      renditaCat,imuAnnuale,mantAnnua,condAnnuo,costiProp,costiPropM,
      costoMesT,detrazFisc,costoMesN,
      cedolare,rentaBrutta,rentaEff,cedEuro,rentaNetta,rentaNetM,
      rendLordo,rendNetto,capRate,noi,cfMens,cfAnnuo,pareggioM,
      oppCost,costoReale,vantaggio,
      rentPerSqm,pricePerSqm,milanAvgSqmBuy,milanAvgSqmRnt,
      centerSaleSqm,centerRentSqm,centerGrossYield,expectedCentralSize,
      expectedCentralRent,expectedCentralRentLow,expectedCentralRentHigh,expectedCentralNetRent,
      ammort,bvr,cfCum,
    };
  },[prezzo,accontoPct,tipoUso,venditore,durataAnni,tipoTasso,tassoFisso,tassoVariabile,
     condo,assicurazione,manutenzione,aliquotaIMU,canone,contratto,sfitto,affittoMercato,rendAlt,sqmRef]);

  /* ─────────────────────────────────────────
     TABS
  ───────────────────────────────────────── */
  const TABS=[
    {id:"summary",    l:"📊  Summary"},
    {id:"investment", l:"💼  Investment"},
    {id:"buyvrent",   l:"⚖️  Buy vs Rent"},
    {id:"loan",       l:"📈  Loan Schedule"},
    {id:"milan",      l:"🏙️  Milan Market"},
  ];

  const tierColor={Prime:RED,Premium:PURPLE,"Semi-central":TEAL,Peripheral:GREEN};
  const profileColor={Appreciation:RED,Balanced:ORANGE,Income:GREEN};

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F7F3EE",minHeight:"100vh"}}>
      <style>{SS}</style>

      {/* ── HEADER ── */}
      <div style={{background:NAVY,padding:"18px 24px 0"}}>
        <div style={{maxWidth:1180,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:3}}>
            <span style={{fontSize:23,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",letterSpacing:"-.4px"}}>
              Property Finance Calculator
            </span>
            <span style={{fontSize:23,fontFamily:"'Playfair Display',serif",fontWeight:400,color:GOLD}}>🇮🇹 Italy</span>
          </div>
          <div style={{fontSize:11,color:"#7a90a8",marginBottom:18,fontWeight:300,letterSpacing:".03em"}}>
            Mortgage · Investment Analysis · Italian Tax Law 2025/2026 · Rates updated June 2026 · Calibrated on Milan central market data
          </div>
          <div style={{display:"flex",gap:2,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} className="hov" onClick={()=>setTab(t.id)} style={{
                padding:"9px 17px",fontSize:11,fontWeight:700,letterSpacing:".04em",whiteSpace:"nowrap",
                background:tab===t.id?"#F7F3EE":"transparent",
                color:tab===t.id?NAVY:"rgba(255,255,255,.5)",
                border:"none",borderRadius:"7px 7px 0 0",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"
              }}>{t.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{maxWidth:1180,margin:"0 auto",padding:"18px 14px",display:"flex",gap:16,alignItems:"flex-start"}}>

        {/* ════ SIDEBAR ════ */}
        <div style={{width:270,flexShrink:0}}>

          {/* Quick Presets */}
          <SideCard title="Milan Quick Presets (2026 data)" icon="⚡">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:2}}>
              {Object.entries(PRESETS).map(([k,p])=>(
                <button key={k} className="hov" onClick={()=>applyPreset(p)} style={{
                  padding:"5px 4px",fontSize:9.5,fontWeight:700,borderRadius:6,border:`1px solid ${GOLD}33`,
                  background:"#fdfaf5",color:NAVY,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center"
                }}>{p.label}</button>
              ))}
            </div>
            <div style={{fontSize:9,color:"#bbb",marginTop:6,fontFamily:"'DM Sans',sans-serif"}}>
              Sets price, rent & condo fees to typical {new Date().getFullYear()} values. Adjust below as needed.
            </div>
          </SideCard>

          {/* Property */}
          <SideCard title="Property" icon="🏠">
            <Field label="Purchase price">
              <NumIn val={prezzo} set={setPrezzo} pre="€" step={5000} min={50000}/>
            </Field>
            <Field label="Size reference (for €/sqm display)">
              <NumIn val={sqmRef} set={setSqmRef} suf="m²" step={5} min={20} max={500}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:3}}>
                → {fmtE(Math.round(c.pricePerSqm))}/m²&nbsp;·&nbsp;Milan avg: {fmtE(c.milanAvgSqmBuy)}/m²
              </div>
            </Field>
            <Field label="Purchase type">
              <Toggle val={tipoUso} set={setTipoUso} opts={[{v:"prima_casa",l:"Prima Casa"},{v:"investimento",l:"Investment"}]}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:4,lineHeight:1.5}}>
                {tipoUso==="prima_casa"?"✓ IMU exempt if primary residence · Registro 2% or IVA 4%":"⚠ IMU owed every year · Registro 9% or IVA 10%"}
              </div>
            </Field>
            <Field label="Seller type">
              <Toggle val={venditore} set={setVenditore} opts={[{v:"privato",l:"Private seller"},{v:"costruttore",l:"Developer"}]}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:3}}>
                {venditore==="privato"?"Imposta di Registro applies":"IVA applies · Ipotecaria & catastale €200 each"}
              </div>
            </Field>
          </SideCard>

          {/* Financing */}
          <SideCard title="Financing (Mutuo)" icon="💳">
            <Field label={`Down payment — ${accontoPct}%`}>
              <Slide val={accontoPct} set={setAccontoPct} min={5} max={100} show={`${accontoPct}%  ·  ${fmtE(c.acconto)}`}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:3}}>Loan requested: <strong style={{color:NAVY}}>{fmtE(c.mutuo)}</strong></div>
            </Field>
            <Field label={`Loan term — ${durataAnni} years`}>
              <Slide val={durataAnni} set={setDurataAnni} min={5} max={30} show={`${durataAnni} years`}/>
            </Field>
            <Field label="Rate type">
              <Toggle val={tipoTasso} set={setTipoTasso} opts={[{v:"fisso",l:"Fixed (Fisso)"},{v:"variabile",l:"Variable"}]}/>
            </Field>
            {tipoTasso==="fisso"?(
              <Field label="Fixed rate (TAN)" hint="June 2026, under-36 excellent credit: ~2.85–3.50% fixed">
                <NumIn val={tassoFisso} set={setTassoFisso} suf="%" step={0.05} min={0.5} max={10}/>
              </Field>
            ):(
              <Field label="Variable rate (TAN)" hint="June 2026: ~2.70–3.10% (Euribor 3M ~2.1% + spread)">
                <NumIn val={tassoVariabile} set={setTassoVariabile} suf="%" step={0.05} min={0.5} max={10}/>
              </Field>
            )}
          </SideCard>

          {/* Running Costs */}
          <SideCard title="Running Costs" icon="🔧">
            <Field label="Condominium fees (spese condominiali)">
              <NumIn val={condo} set={setCondo} pre="€" suf="/mo" step={10} min={0}/>
            </Field>
            <Field label="Home insurance (assicurazione)">
              <NumIn val={assicurazione} set={setAssicurazione} pre="€" suf="/yr" step={50} min={0}/>
            </Field>
            <Field label={`Maintenance (manutenzione) — ${manutenzione}%/yr · ${fmtE(c.mantAnnua)}/yr`}>
              <Slide val={manutenzione} set={setManutenzione} min={0.1} max={2} step={0.1} show={`${manutenzione}%`}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:2}}>Central Milan older stock: 0.8–1.2% typical</div>
            </Field>
            {tipoUso!=="prima_casa"&&(
              <Field label="IMU rate (aliquota IMU)" hint={`Milan seconda casa: 10.6‰ · Est. rendita catastale: ${fmtE(c.renditaCat)}/yr → IMU: ${fmtE(c.imuAnnuale)}/yr`}>
                <NumIn val={aliquotaIMU} set={setAliquotaIMU} suf="‰" step={0.1} min={7.6} max={10.6}/>
                <div style={{fontSize:9,color:"#bbb",marginTop:3}}>Base = rendita×160×1.05. Rendita ≈0.30% of price (Milan ratio).</div>
              </Field>
            )}
            <div style={{marginTop:6,padding:"8px 10px",background:"#f7f3ee",borderRadius:7}}>
              <div style={{fontSize:9,color:"#999",marginBottom:3,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>Total running costs</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#666"}}>{fmtE(c.costiProp)}/yr</span>
                <span style={{fontSize:11,fontWeight:700,color:NAVY}}>{fmtE(c.costiPropM)}/mo</span>
              </div>
            </div>
          </SideCard>

          {/* Rental */}
          <SideCard title="Rental & Comparison" icon="🔑">
            <Field label="Expected monthly rent">
              <NumIn val={canone} set={setCanone} pre="€" suf="/mo" step={50} min={0}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:3}}>
                {fmtE(Math.round(c.rentPerSqm),2)}/m²/mo · Milan avg: {fmtE(c.milanAvgSqmRnt,2)}/m²/mo
              </div>
            </Field>
            <Field label="Contract type (tipo contratto)">
              <Toggle val={contratto} set={setContratto} opts={[{v:"libero",l:"4+4 · 21%"},{v:"concordato",l:"3+2 · 10%"}]}/>
              <div style={{fontSize:9.5,color:"#aaa",marginTop:4,lineHeight:1.5}}>
                {contratto==="libero"?"Free-market 4+4 · Cedolare secca 21%":"Regulated 3+2 · Cedolare secca 10% · IMU −25% possible"}
              </div>
            </Field>
            <Field label={`Vacancy allowance — ${sfitto}%`}>
              <Slide val={sfitto} set={setSfitto} min={0} max={30} show={`${sfitto}%`}/>
            </Field>
            <div style={{borderTop:"1px solid #eee",paddingTop:10,marginTop:4}}>
              <Field label="Market rent for equivalent property" hint="What you'd pay renting a comparable unit — used for Buy vs Rent tab">
                <NumIn val={affittoMercato} set={setAffittoMercato} pre="€" suf="/mo" step={50}/>
              </Field>
              <Field label={`Alternative investment return — ${rendAlt}%`} hint="BOT/BTP, ETF, bank deposit...">
                <Slide val={rendAlt} set={setRendAlt} min={0} max={10} step={0.5} show={`${rendAlt}%`}/>
              </Field>
            </div>
          </SideCard>
        </div>

        {/* ════ CONTENT AREA ════ */}
        <div style={{flex:1,minWidth:0}}>

          {/* ══════════════════════════════════
              SUMMARY
          ══════════════════════════════════ */}
          {tab==="summary"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
                <KPI label="Monthly Mortgage Payment" value={fmtE(c.rata)} sub={`${c.tasso}% TAN · ${durataAnni}-year term · ${fmtE(c.mutuo)} financed`} accent={NAVY}/>
                <KPI label="Total Monthly Ownership Cost" value={fmtE(c.costoMesT)} sub="Mortgage + condo + maintenance + insurance + IMU" accent={GOLD}/>
                <KPI label="Initial Cash Required" value={fmtE(c.liquiditaIniziale)} sub="Down payment + all acquisition costs" accent={PURPLE}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                <KPI label="Total Interest over Life" value={fmtE(c.totaleInteressi)} sub={`Cost of borrowing over ${durataAnni} years`} accent={RED}/>
                <KPI label="Acquisition Costs (excl. down pmt)" value={fmtE(c.totSpese)} sub="Taxes + notary + agency + bank fees" accent={ORANGE}/>
                {tipoUso==="prima_casa"
                  ?<KPI label="Mortgage Interest Deduction" value={fmtE(c.detrazFisc)} sub="19% on interest up to €4,000/yr · max €760/yr (art.15 TUIR)" accent={GREEN}/>
                  :<KPI label="Annual IMU Estimated" value={fmtE(c.imuAnnuale)} sub={`Rate ${aliquotaIMU}‰ · catastral ratio 0.30% of price · Milan`} accent={RED}/>
                }
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {/* Acquisition cost breakdown */}
                <Card>
                  <CardTitle>📋 Acquisition Cost Breakdown</CardTitle>
                  <Row l="Purchase price" v={prezzo} bold/>
                  <Row l={`  Down payment (${accontoPct}%)`} v={c.acconto} indent/>
                  <Row l="  Loan (mutuo)" v={c.mutuo} indent/>
                  <Div/>
                  {venditore==="privato"
                    ?<Row l={tipoUso==="prima_casa"?"Imposta di Registro (2%, min €1,000)":"Imposta di Registro (9%, min €1,000)"} v={c.regImposta}/>
                    :<Row l={tipoUso==="prima_casa"?"IVA reduced 4% (developer)":"IVA standard 10% (developer)"} v={c.ivaAcq}/>
                  }
                  <Row l="Imposta ipotecaria + catastale" v={c.ipotecaria+c.catastale}/>
                  <Row l="Notary fees (spese notarili, ~1.3–2.5%)" v={c.notaio}/>
                  <Row l="Agency commission (3% + IVA 22%)" v={c.agenzia}/>
                  <Row l="Bank fees (appraisal + loan origination)" v={c.banca}/>
                  <Div/>
                  <Row l="TOTAL ACQUISITION COSTS" v={c.totSpese} bold hl/>
                  <div style={{background:NAVY,borderRadius:8,padding:"9px 11px",marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#aac",fontFamily:"'DM Sans',sans-serif"}}>TOTAL CASH NEEDED DAY 1</span>
                    <span style={{fontSize:14,fontWeight:800,color:GOLD,fontFamily:"'Playfair Display',serif"}}>{fmtE(c.liquiditaIniziale)}</span>
                  </div>
                </Card>

                {/* Monthly cost breakdown */}
                <Card>
                  <CardTitle>💰 Monthly Cost Breakdown</CardTitle>
                  <Row l="Mortgage instalment (rata)" v={c.rata} bold/>
                  <Div/>
                  <Row l="Condominium fees" v={c.condAnnuo/12} indent/>
                  <Row l="Home insurance" v={c.assicurazione/12} indent/>
                  <Row l="Maintenance reserve" v={c.mantAnnua/12} indent/>
                  {tipoUso!=="prima_casa"&&<Row l="IMU (monthly)" v={c.imuAnnuale/12} indent/>}
                  <Div/>
                  <Row l="TOTAL MONTHLY COST" v={c.costoMesT} bold hl/>
                  {tipoUso==="prima_casa"&&(
                    <>
                      <Row l="— Interest deduction benefit (÷12)" v={-(c.detrazFisc/12)} neg/>
                      <div style={{background:"#f0fdf4",borderRadius:8,padding:"7px 10px",marginTop:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#3a7a5a",fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>NET MONTHLY COST</span>
                        <span style={{fontSize:13,fontWeight:800,color:GREEN,fontFamily:"'Playfair Display',serif"}}>{fmtE(c.costoMesN)}</span>
                      </div>
                    </>
                  )}
                  {/* Stacked bar */}
                  <div style={{marginTop:14,background:"#f7f3ee",borderRadius:9,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:"#aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:".07em",fontWeight:700}}>Cost split</div>
                    <div style={{height:9,borderRadius:5,overflow:"hidden",display:"flex"}}>
                      {[[c.rata,NAVY],[c.condAnnuo/12,GOLD],[c.mantAnnua/12,ORANGE],[c.assicurazione/12,"#A8A8A8"],[c.imuAnnuale/12,RED]].map(([v,col],i)=>(
                        <div key={i} style={{width:`${(v/Math.max(1,c.costoMesT))*100}%`,background:col}}/>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
                      {[[NAVY,"Mortgage"],[GOLD,"Condo"],[ORANGE,"Maintenance"],["#A8A8A8","Insurance"],tipoUso!=="prima_casa"&&[RED,"IMU"]].filter(Boolean).map(([col,lbl])=>(
                        <div key={lbl} style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:8,height:8,borderRadius:2,background:col}}/>
                          <span style={{fontSize:9.5,color:"#888"}}>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Summary banner */}
              <div style={{background:NAVY,borderRadius:12,padding:16,marginTop:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[["Loan Amount",fmtE(c.mutuo)],["Total Interest",fmtE(c.totaleInteressi)],["Total Loan Cost",fmtE(c.totaleRate)],["True Cost of Property",fmtE(prezzo+c.totaleInteressi+c.totSpese)]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center",padding:"9px 8px",background:"rgba(255,255,255,.06)",borderRadius:9}}>
                    <div style={{fontSize:9,color:"#7a90a8",textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,color:GOLD,fontFamily:"'Playfair Display',serif"}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Tax notes */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
                <InfoBox color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" title="🏛 Tax Regime on Purchase">
                  {tipoUso==="prima_casa"?(
                    <>{venditore==="privato"?"• Imposta di Registro 2% (min €1,000)\n• Ipotecaria €50 + Catastale €50":"• IVA reduced 4% (from developer)\n• Ipotecaria €200 + Catastale €200"}<br/>• IMU exempt as primary residence<br/>• 19% deduction on interest ≤ €4,000/yr (max €760 benefit)<br/>• Consap fund available: LTV up to 100%</>
                  ):(
                    <>{venditore==="privato"?"• Imposta di Registro 9% (min €1,000)\n• Ipotecaria €50 + Catastale €50":"• IVA 10% standard (from developer)\n• Ipotecaria €200 + Catastale €200"}<br/>• IMU owed annually (no exemption)<br/>• No mortgage interest deduction<br/>• Capital gain tax 26% if sold within 5 years</>
                  )}
                </InfoBox>
                <InfoBox color="#92400e" bg="#fffbeb" border="#fde68a" title="💡 Consap First Home Guarantee (Fondo Prima Casa)">
                  • Under 36 with ISEE ≤ €40,000<br/>
                  • State guarantee covers 50–80% of loan capital<br/>
                  • Enables mortgages up to 100% of appraised value<br/>
                  • TAEG cap June 2026: 4.38% fixed · 4.41% variable<br/>
                  • Stamp duty (imposta sostitutiva) waived on loan<br/>
                  • Extended to 31 December 2027 (DL Piano Casa, May 2026)
                </InfoBox>
              </div>
            </>
          )}

          {/* ══════════════════════════════════
              INVESTMENT ANALYSIS
          ══════════════════════════════════ */}
          {tab==="investment"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
                <KPI label="Gross Rental Yield" value={fmtP(c.rendLordo)} sub="Annual rent / Purchase price · Milan semi-central avg: 4–5.5%" accent={c.rendLordo>5?GREEN:c.rendLordo>3.5?ORANGE:RED}/>
                <KPI label="Net Rental Yield" value={fmtP(c.rendNetto)} sub="Net income after cedolare secca & costs / (Price + acquisition costs)" accent={c.rendNetto>4?GREEN:c.rendNetto>2.5?ORANGE:RED}/>
                <KPI label="Cap Rate (NOI / Price)" value={fmtP(c.capRate)} sub="Net operating income / Purchase price · Milan central avg: 1.5–3%" accent={c.capRate>3?GREEN:ORANGE}/>
                <KPI label="Net Rental Income" value={`${fmtE(c.rentaNetM)}/mo`} sub={`After cedolare secca ${c.cedolare*100}% and ${sfitto}% vacancy`} accent={GREEN}/>
                <KPI label="Monthly Cash Flow" value={`${c.cfMens>=0?"+":""}${fmtE(c.cfMens)}/mo`} sub="Net rent − mortgage − IMU − condo − maintenance" accent={c.cfMens>=0?GREEN:RED}/>
                <KPI label="Break-even Rent (gross)" value={`${fmtE(c.pareggioM)}/mo`} sub="Minimum gross rent to cover all ownership costs" accent={PURPLE}/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12}}>
                {/* P&L */}
                <Card>
                  <CardTitle>📑 Annual Rental P&L Statement</CardTitle>
                  <div style={{fontSize:10,fontWeight:800,color:GREEN,textTransform:"uppercase",letterSpacing:".09em",marginBottom:5}}>REVENUE</div>
                  <Row l="Monthly rent × 12 months" v={c.rentaBrutta} pos/>
                  <Row l={`  − Vacancy ${sfitto}% allowance`} v={c.rentaBrutta*(sfitto/100)} neg indent/>
                  <Row l="= Effective rent collected" v={c.rentaEff} bold/>
                  <Div/>
                  <div style={{fontSize:10,fontWeight:800,color:RED,textTransform:"uppercase",letterSpacing:".09em",marginBottom:5,marginTop:8}}>TAX (FISCALITÀ)</div>
                  <Row l={`Cedolare secca ${contratto==="concordato"?"3+2":"4+4"} — ${c.cedolare*100}% flat tax on rent`} v={c.cedEuro} neg/>
                  <Row l="= Net rental income (after cedolare)" v={c.rentaNetta} bold hl/>
                  <Div/>
                  <div style={{fontSize:10,fontWeight:800,color:ORANGE,textTransform:"uppercase",letterSpacing:".09em",marginBottom:5,marginTop:8}}>PROPERTY COSTS</div>
                  <Row l="Condominium fees" v={c.condAnnuo} neg indent/>
                  <Row l="Maintenance" v={c.mantAnnua} neg indent/>
                  <Row l="Insurance" v={c.assicurazione} neg indent/>
                  {tipoUso!=="prima_casa"&&<Row l="IMU (Imposta Municipale Unica)" v={c.imuAnnuale} neg indent/>}
                  <Row l="= NOI — Net Operating Income" v={c.noi} bold/>
                  <Div/>
                  <div style={{fontSize:10,fontWeight:800,color:NAVY,textTransform:"uppercase",letterSpacing:".09em",marginBottom:5,marginTop:8}}>DEBT SERVICE (Year 1 estimate)</div>
                  <Row l="Mortgage interest (interessi passivi)" v={c.interessiA1} neg indent/>
                  <Row l="Principal repayment (quota capitale)" v={Math.max(0,c.rata*12-c.interessiA1)} neg indent/>
                  <Div/>
                  <div style={{padding:"10px 12px",borderRadius:9,marginTop:6,background:c.cfAnnuo>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${c.cfAnnuo>=0?"#86efac":"#fca5a5"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#1a1a1a",fontFamily:"'DM Sans',sans-serif"}}>ANNUAL CASH FLOW</span>
                      <span style={{fontSize:16,fontWeight:900,fontFamily:"'Playfair Display',serif",color:c.cfAnnuo>=0?GREEN:RED}}>
                        {c.cfAnnuo>=0?"+":"−"}{fmtE(Math.abs(c.cfAnnuo))}
                      </span>
                    </div>
                    <div style={{fontSize:10,color:"#777",marginTop:4,fontFamily:"'DM Sans',sans-serif"}}>
                      {c.cfMens>=0
                        ?`✓ Positive: property self-funds with ${fmtE(c.cfMens)}/month surplus`
                        :`⚠ Negative: requires ${fmtE(-c.cfMens)}/month top-up — typical for leveraged central Milan`}
                    </div>
                  </div>
                </Card>

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Card>
                    <CardTitle>📊 Investment KPIs</CardTitle>
                    {[
                      ["Total initial outlay",fmtE(c.liquiditaIniziale)],
                      ["Price + acquisition costs",fmtE(prezzo+c.totSpese)],
                      ["Gross annual rent",fmtE(c.rentaBrutta)],
                      ["Gross yield",fmtP(c.rendLordo)],
                      ["Net yield (after all costs)",fmtP(c.rendNetto)],
                      ["Cap rate (NOI/price)",fmtP(c.capRate)],
                      ["Cash yield on down pmt",fmtP((c.cfAnnuo/Math.max(1,c.liquiditaIniziale))*100)],
                      ["Payback period (cash flow)",c.cfAnnuo>0?`${fmt(c.liquiditaIniziale/c.cfAnnuo,1)} yrs`:"N/A (neg. CF)"],
                    ].map(([l,v])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4.5px 0",borderBottom:"1px solid #f5f0eb"}}>
                        <span style={{fontSize:10.5,color:"#666",fontFamily:"'DM Sans',sans-serif"}}>{l}</span>
                        <span style={{fontSize:11,fontWeight:700,color:NAVY,fontFamily:"'DM Sans',sans-serif"}}>{v}</span>
                      </div>
                    ))}
                  </Card>

                  <InfoBox color="#5b21b6" bg="#f5f3ff" border="#c4b5fd" title="📜 Cedolare Secca">
                    {contratto==="libero"?(
                      <>• <strong>4+4 free-market contract</strong> (L.431/98)<br/>• Flat tax <strong>21%</strong> on rent (sostitutiva)<br/>• Rent freely negotiated<br/>• TARI waste tax paid by tenant<br/>• Mandatory registration (modello RLI)</>
                    ):(
                      <>• <strong>3+2 regulated contract</strong> (L.431/98)<br/>• Flat tax reduced to <strong>10%</strong><br/>• Rent set by local union agreements<br/>• IMU −25% in high-tension municipalities<br/>• IRPEF base −30% if no cedolare elected</>
                    )}
                  </InfoBox>

                  <InfoBox color="#065f46" bg="#ecfdf5" border="#6ee7b7" title="⚠️ Capital Gains on Sale (Plusvalenza)">
                    • Sold within 5 years: <strong>26% flat tax</strong> on gain<br/>
                    • After 5 years: <strong>tax-free</strong> (main rule)<br/>
                    • Prima casa: exempt if reinvested within 12 months<br/>
                    • Taxable base = sale price − purchase price − documented costs<br/>
                    • Option: include in IRPEF progressive bracket
                  </InfoBox>
                </div>
              </div>

              {/* Cash flow chart */}
              <Card style={{marginTop:12}}>
                <CardTitle>📈 Cumulative Investment Cash Flow (30 years)</CardTitle>
                <div style={{fontSize:10,color:"#999",marginBottom:8}}>Starts negative (initial outlay {fmtE(c.liquiditaIniziale)}) — break-even when line crosses zero</div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={c.cfCum} margin={{top:5,right:10,left:-10,bottom:0}}>
                    <defs>
                      <linearGradient id="gCF" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={GREEN} stopOpacity={.25}/>
                        <stop offset="95%" stopColor={GREEN} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8"/>
                    <XAxis dataKey="anno" tick={{fontSize:9}} interval={4}/>
                    <YAxis tickFormatter={v=>`€${fmt(v/1000)}k`} tick={{fontSize:9}}/>
                    <ReferenceLine y={0} stroke={RED} strokeDasharray="4 3" strokeWidth={1.5}/>
                    <Tooltip content={<CT/>}/>
                    <Area dataKey="Cash Flow" stroke={GREEN} fill="url(#gCF)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}

          {/* ══════════════════════════════════
              BUY vs RENT
          ══════════════════════════════════ */}
          {tab==="buyvrent"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
                <KPI label="Net Purchase Cost/month" value={fmtE(c.costoMesN)} sub={tipoUso==="prima_casa"?"After tax deduction":"Mortgage + running costs"} accent={NAVY}/>
                <KPI label="Market Rent (equivalent unit)" value={`${fmtE(affittoMercato)}/mo`} sub="What you'd pay renting a comparable property" accent={PURPLE}/>
                <KPI label={c.vantaggio>=0?"Buying Advantage":"Renting Advantage"} value={`${fmtE(Math.abs(c.vantaggio))}/mo`} sub={c.vantaggio>=0?"Buying cheaper than renting (excl. opp. cost)":"Renting cheaper (excl. opportunity cost)"} accent={c.vantaggio>=0?GREEN:RED}/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Card>
                  <CardTitle>⚖️ True Monthly Cost Comparison</CardTitle>
                  <div style={{fontSize:10,fontWeight:800,color:NAVY,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>SCENARIO A — BUYING</div>
                  <Row l="Mortgage instalment" v={c.rata}/>
                  <Row l="+ Condominium fees" v={c.condAnnuo/12} indent/>
                  <Row l="+ Maintenance" v={c.mantAnnua/12} indent/>
                  <Row l="+ Insurance" v={c.assicurazione/12} indent/>
                  {tipoUso!=="prima_casa"&&<Row l="+ IMU (monthly)" v={c.imuAnnuale/12} indent/>}
                  {tipoUso==="prima_casa"&&<Row l="− Interest deduction (÷12)" v={-(c.detrazFisc/12)} neg indent/>}
                  <Row l="= Net monthly cost" v={c.costoMesN} bold hl/>
                  <Row l={`+ Opportunity cost of capital* (${rendAlt}%)`} v={c.oppCost}/>
                  <div style={{padding:"7px 10px",background:NAVY,borderRadius:7,marginTop:5,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#aac",fontFamily:"'DM Sans',sans-serif"}}>TRUE MONTHLY COST</span>
                    <span style={{fontSize:13,fontWeight:800,color:GOLD,fontFamily:"'Playfair Display',serif"}}>{fmtE(c.costoReale)}</span>
                  </div>
                  <div style={{fontSize:10,fontWeight:800,color:PURPLE,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>SCENARIO B — RENTING</div>
                  <Row l="Market rent" v={affittoMercato} bold hl/>
                  <Div/>
                  <div style={{padding:"9px 11px",borderRadius:8,marginTop:6,background:(c.costoReale-affittoMercato)<=0?"#f0fdf4":"#fef2f2",border:`1px solid ${(c.costoReale-affittoMercato)<=0?"#86efac":"#fca5a5"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>Difference (Buy − Rent)</span>
                      <span style={{fontSize:14,fontWeight:900,fontFamily:"'Playfair Display',serif",color:(c.costoReale-affittoMercato)<=0?GREEN:RED}}>
                        {(c.costoReale-affittoMercato)>0?"+":""}{fmtE(c.costoReale-affittoMercato)}
                      </span>
                    </div>
                    <div style={{fontSize:9.5,color:"#888",marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>
                      {(c.costoReale-affittoMercato)<=0
                        ?`✓ Buying wins: saves ${fmtE(-(c.costoReale-affittoMercato))}/month vs renting`
                        :`⚠ Renting cheaper by ${fmtE(c.costoReale-affittoMercato)}/month (incl. opportunity cost)`}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:"#bbb",marginTop:8,lineHeight:1.5,fontFamily:"'DM Sans',sans-serif"}}>
                    * Opportunity cost = {rendAlt}% annual return applied to {fmtE(c.liquiditaIniziale)} of capital tied up in property
                  </div>
                </Card>

                <Card>
                  <CardTitle>📈 Cumulative Cash Outflows (30 years)</CardTitle>
                  <div style={{fontSize:9.5,color:"#aaa",marginBottom:8}}>Buying includes initial outlay + net monthly costs. Rent grows at +2%/year.</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={c.bvr} margin={{top:5,right:5,left:-15,bottom:0}}>
                      <defs>
                        <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={NAVY}   stopOpacity={.22}/>
                          <stop offset="95%" stopColor={NAVY}   stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PURPLE} stopOpacity={.22}/>
                          <stop offset="95%" stopColor={PURPLE} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8"/>
                      <XAxis dataKey="anno" tick={{fontSize:9}} interval={4}/>
                      <YAxis tickFormatter={v=>`€${fmt(v/1000)}k`} tick={{fontSize:9}}/>
                      <Tooltip content={<CT/>}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:10,fontFamily:"'DM Sans',sans-serif"}}/>
                      <Area dataKey="Purchase" stroke={NAVY}   fill="url(#gB)" strokeWidth={2}/>
                      <Area dataKey="Rent"     stroke={PURPLE} fill="url(#gR)" strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{background:"#f7f3ee",borderRadius:8,padding:"9px 11px",marginTop:10,fontSize:10,color:"#666",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>
                    <strong>Note:</strong> Chart shows cash outflows only. When buying, at loan end you own the property outright (capital asset). This comparison excludes property price appreciation and the equity you build through repayments.
                  </div>
                </Card>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:12}}>
                {[
                  {t:"🏛 First Home (Prima Casa) Benefits",items:["Registro 2% from private seller (min €1,000)","IVA 4% from developer","IMU exempt if primary residence","19% deduction on interest (max €760/yr benefit)","Consap guarantee: LTV up to 100% for under 36","Piano Casa DL: extended incentives 2026"]},
                  {t:"⚡ Case for Buying",items:["Build equity (patrimonio) over time","Hedge against rent inflation","Freedom to renovate and personalise","No risk of eviction or rent hikes","Potential future rental income","Long-term housing security"]},
                  {t:"🔄 Case for Renting",items:["Flexibility and geographic mobility","Capital free for higher-yield investments","No market value risk on property","No extraordinary maintenance exposure","No notary/tax/agency bureaucracy","Easier to adapt to life changes"]},
                ].map(({t,items})=>(
                  <div key={t} style={{background:"#fff",borderRadius:11,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                    <div style={{fontSize:11,fontWeight:700,color:NAVY,marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>{t}</div>
                    {items.map(item=>(
                      <div key={item} style={{fontSize:10,color:"#555",padding:"3px 0",borderBottom:"1px solid #f5f5f5",display:"flex",gap:5,fontFamily:"'DM Sans',sans-serif"}}>
                        <span style={{color:GOLD}}>•</span>{item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══════════════════════════════════
              LOAN SCHEDULE
          ══════════════════════════════════ */}
          {tab==="loan"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
                <KPI label="Monthly Payment" value={fmtE(c.rata)} sub={`${c.tasso}% TAN · ${durataAnni} years`} accent={NAVY}/>
                <KPI label="Loan Amount" value={fmtE(c.mutuo)} sub={`${accontoPct}% down payment`} accent={GOLD}/>
                <KPI label="Total Interest" value={fmtE(c.totaleInteressi)} sub={`${fmtP(c.totaleInteressi/Math.max(1,c.mutuo)*100,1)} of principal`} accent={RED}/>
                <KPI label="Total Loan Cost" value={fmtE(c.totaleRate)} sub="Principal + Interest" accent={PURPLE}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <Card>
                  <CardTitle>📊 Principal vs Interest per Year</CardTitle>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.ammort} margin={{top:5,right:5,left:-20,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8"/>
                      <XAxis dataKey="anno" tick={{fontSize:9}} interval={Math.max(0,Math.floor(durataAnni/8)-1)}/>
                      <YAxis tickFormatter={v=>`€${fmt(v/1000)}k`} tick={{fontSize:9}}/>
                      <Tooltip content={<CT/>}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:10,fontFamily:"'DM Sans',sans-serif"}}/>
                      <Bar dataKey="Capitale"  fill={NAVY} stackId="a" name="Principal"/>
                      <Bar dataKey="Interessi" fill={RED}  stackId="a" name="Interest" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <CardTitle>📉 Remaining Debt & Equity Built</CardTitle>
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={c.ammort} margin={{top:5,right:5,left:-20,bottom:5}}>
                      <defs>
                        <linearGradient id="gRe" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={NAVY}  stopOpacity={.25}/><stop offset="95%" stopColor={NAVY}  stopOpacity={.02}/>
                        </linearGradient>
                        <linearGradient id="gEq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={GREEN} stopOpacity={.25}/><stop offset="95%" stopColor={GREEN} stopOpacity={.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8"/>
                      <XAxis dataKey="anno" tick={{fontSize:9}} interval={Math.max(0,Math.floor(durataAnni/8)-1)}/>
                      <YAxis tickFormatter={v=>`€${fmt(v/1000)}k`} tick={{fontSize:9}}/>
                      <Tooltip content={<CT/>}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:10,fontFamily:"'DM Sans',sans-serif"}}/>
                      <Area dataKey="Residuo" stroke={NAVY}  fill="url(#gRe)" strokeWidth={2} name="Remaining Debt"/>
                      <Area dataKey="Equity"  stroke={GREEN} fill="url(#gEq)" strokeWidth={2} name="Equity Built"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card>
                <CardTitle>📋 Annual Amortisation Schedule (Piano di Ammortamento)</CardTitle>
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr style={{background:NAVY}}>
                        {["Year","Annual Instalment","Principal","Interest","% Interest","Remaining Debt","Equity Accumulated"].map(h=>(
                          <th key={h} style={{color:GOLD,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.ammort.map((row,i)=>{
                        const rA=row.Capitale+row.Interessi;
                        const pI=rA>0?(row.Interessi/rA)*100:0;
                        return(
                          <tr key={i} style={{background:i%2===0?"#faf9f7":"#fff"}}>
                            <td style={{fontWeight:700,color:NAVY}}>{row.anno}</td>
                            <td style={{color:"#444"}}>{fmtE(rA)}</td>
                            <td style={{color:NAVY,fontWeight:600}}>{fmtE(row.Capitale)}</td>
                            <td style={{color:RED}}>{fmtE(row.Interessi)}</td>
                            <td style={{color:"#999",fontSize:10}}>{fmtP(pI,1)}</td>
                            <td>{fmtE(row.Residuo)}</td>
                            <td style={{color:GREEN,fontWeight:600}}>{fmtE(row.Equity)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{background:"#f0f0f0",fontWeight:700}}>
                        <td style={{color:NAVY}}>TOTAL</td>
                        <td style={{color:NAVY}}>{fmtE(c.totaleRate)}</td>
                        <td style={{color:NAVY}}>{fmtE(c.mutuo)}</td>
                        <td style={{color:RED}}>{fmtE(c.totaleInteressi)}</td>
                        <td style={{color:"#999",fontSize:10}}>{fmtP(c.totaleInteressi/Math.max(1,c.totaleRate)*100,1)}</td>
                        <td>€ 0</td>
                        <td style={{color:GREEN}}>{fmtE(prezzo)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Milestones */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14}}>
                  {[25,50,75,100].map(pct=>{
                    const target=c.mutuo*(pct/100);
                    const ms=c.ammort.find(r=>(c.mutuo-r.Residuo)>=target);
                    return(
                      <div key={pct} style={{background:"#f7f3ee",borderRadius:8,padding:"9px 11px",textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:900,color:NAVY,fontFamily:"'Playfair Display',serif"}}>{pct}%</div>
                        <div style={{fontSize:9,color:"#aaa",marginTop:1}}>paid off by</div>
                        <div style={{fontSize:12,fontWeight:700,color:GREEN,marginTop:2}}>{ms?`Year ${ms.anno}`:"—"}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

          {/* ══════════════════════════════════
              MILAN MARKET
          ══════════════════════════════════ */}
          {tab==="milan"&&(
            <>
              {/* Header stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                <KPI label="Milan Avg Sale Price" value="€ 5,481/m²" sub="April 2026 · +3% vs April 2025 (Immobiliare.it)" accent={NAVY}/>
                <KPI label="Milan Avg Rental Price" value="€ 22.25/m²/mo" sub="April 2026 · −1.5% vs 2025 (Immobiliare.it)" accent={GOLD}/>
                <KPI label="Centro Storico Sale" value="€ 11,233/m²" sub="Highest Milan zone · April 2026" accent={RED}/>
                <KPI label="Centro Storico Rent" value="€ 31.52/m²/mo" sub="Highest Milan zone · April 2026" accent={TEAL}/>
              </div>

              {/* Your property vs market */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <Card>
                  <CardTitle>🎯 Your Property vs Milan Market (April 2026)</CardTitle>
                  {[
                    ["Your purchase price/m²",`€ ${fmt(Math.round(c.pricePerSqm))}/m²`,c.pricePerSqm<c.milanAvgSqmBuy?"Below city avg ✓":"Above city avg"],
                    ["Milan city average sale",`€ ${fmt(c.milanAvgSqmBuy)}/m²`,"Immobiliare.it Apr 2026"],
                    ["Your expected rent/m²",`€ ${fmt(c.rentPerSqm,2)}/m²/mo`,c.rentPerSqm<c.milanAvgSqmRnt?"Below city avg":"Above city avg"],
                    ["Milan city average rent",`€ ${fmt(c.milanAvgSqmRnt,2)}/m²/mo`,"Immobiliare.it Apr 2026"],
                    ["Your gross yield",fmtP(c.rendLordo),c.rendLordo>4.5?"Above avg — good income profile":c.rendLordo>3.5?"Average for semi-central Milan":"Below avg — appreciation play"],
                    ["Typical central Milan net yield","2.5–4.5%","After cedolare secca & costs"],
                    ["Your cap rate",fmtP(c.capRate),c.capRate>2.5?"Above avg for central Milan":"Low — typical for prime locations"],
                  ].map(([l,v,note])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"5px 0",borderBottom:"1px solid #f5f0eb",gap:8}}>
                      <span style={{fontSize:10.5,color:"#666",fontFamily:"'DM Sans',sans-serif"}}>{l}</span>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:NAVY,fontFamily:"'DM Sans',sans-serif"}}>{v}</div>
                        <div style={{fontSize:9.5,color:"#bbb",fontFamily:"'DM Sans',sans-serif"}}>{note}</div>
                      </div>
                    </div>
                  ))}
                </Card>

                {/* Market context */}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <InfoBox color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" title="📰 Milan Market Context — May 2026">
                    • Milan municipality average sale: <strong>€5,679/m²</strong><br/>
                    • Milan municipality average rent: <strong>€22.23/m²/mo</strong><br/>
                    • Centro area sale: <strong>€11,300/m²</strong><br/>
                    • Centro area rent: <strong>€31.29/m²/mo</strong><br/>
                    • Implied Centro gross yield: <strong>{fmtP(c.centerGrossYield)}</strong><br/>
                    • Estimated rent from this acquisition price in Centro: <strong>{fmtE(c.expectedCentralRent)}</strong>/mo gross<br/>
                    • Range at 3.0–3.6% gross yield: <strong>{fmtE(c.expectedCentralRentLow)}</strong> to <strong>{fmtE(c.expectedCentralRentHigh)}</strong>/mo gross
                  </InfoBox>
                  <InfoBox color="#065f46" bg="#ecfdf5" border="#6ee7b7" title="💡 Investment Strategy by Zone">
                    • <strong>Centro / Brera / Porta Nuova:</strong> appreciation play — premium entry price, strong liquidity, gross yield usually around 3.0–3.5%.<br/>
                    • <strong>Navigli / Porta Romana / Isola:</strong> balanced — typically around 3.6–4.8% gross, with solid tenant demand.<br/>
                    • <strong>Città Studi / Bicocca / Loreto:</strong> income play — typically around 4.5–6.5% gross, depending on vacancy and condition.
                  </InfoBox>
                  <Card>
                    <CardTitle>📐 Expected rent from acquisition price in Centro Milano</CardTitle>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                      <KPI label="Implied size at Centro price" value={`${fmt(c.expectedCentralSize,1)} m²`} sub={`€${fmt(c.centerSaleSqm)}/m² sale benchmark`} accent={NAVY}/>
                      <KPI label="Gross monthly rent" value={fmtE(c.expectedCentralRent)} sub={`Based on ${fmtP(c.centerGrossYield)} gross yield`} accent={GOLD}/>
                      <KPI label="Net monthly rent after cedolare" value={fmtE(c.expectedCentralNetRent)} sub={`Using current ${contratto==="concordato"?"10%":"21%"} flat tax`} accent={GREEN}/>
                    </div>
                    <div style={{fontSize:10,color:"#666",marginTop:8,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>
                      Formula used: purchase price × Centro gross yield ÷ 12. For reference, a €500,000 Centro property implies about {fmtE(500000 * c.centerGrossYield / 100 / 12)} gross monthly rent, while €1,000,000 implies about {fmtE(1000000 * c.centerGrossYield / 100 / 12)}.
                    </div>
                  </Card>
                  <Card>
                    <CardTitle>🏙 Zone snapshot</CardTitle>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
                        <thead>
                          <tr style={{background:NAVY}}>
                            <th style={{textAlign:"left",color:GOLD,padding:"8px 10px",fontSize:9.5,letterSpacing:"0.05em"}}>Zone</th>
                            <th style={{color:GOLD,padding:"8px 10px",fontSize:9.5,letterSpacing:"0.05em"}}>Tier</th>
                            <th style={{color:GOLD,padding:"8px 10px",fontSize:9.5,letterSpacing:"0.05em"}}>Buy €/m²</th>
                            <th style={{color:GOLD,padding:"8px 10px",fontSize:9.5,letterSpacing:"0.05em"}}>Rent €/m²/mo</th>
                            <th style={{color:GOLD,padding:"8px 10px",fontSize:9.5,letterSpacing:"0.05em"}}>Gross yield</th>
                            <th style={{color:GOLD,padding:"8px 10px",fontSize:9.5,letterSpacing:"0.05em"}}>Profile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MILAN_ZONES.map((z, idx) => {
                            const buyAvg = (z.bMin + z.bMax) / 2;
                            const grossYield = buyAvg > 0 ? (z.rSqm * 12 / buyAvg) * 100 : 0;
                            const tierCol = tierColor[z.tier] ?? NAVY;
                            const profCol = profileColor[z.profile] ?? NAVY;
                            return (
                              <tr key={z.z} style={{background: idx % 2 === 0 ? "#faf9f7" : "#fff"}}>
                                <td style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:NAVY}}>{z.z}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",color:tierCol,fontWeight:600}}>{z.tier}</td>
                                <td style={{padding:"7px 10px",textAlign:"right"}}>{fmtE(Math.round(buyAvg))}</td>
                                <td style={{padding:"7px 10px",textAlign:"right"}}>{fmtE(z.rSqm,2)}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:GREEN}}>{fmtP(grossYield)}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",color:profCol,fontWeight:600}}>{z.profile}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}

        </div>{/* end right */}
      </div>{/* end body */}
    </div>
  );
}
          