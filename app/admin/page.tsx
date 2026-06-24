'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  adminLogin, getAllOrders, getOrderStats, updateOrderStatus, deleteOrder, exportOrdersCSV,
  checkDbConnected,
  getCompanyProfile, saveCompanyProfile, uploadAsset,
  getProducts, saveProduct, deleteProduct,
  getPaymentSettings, savePaymentSettings,
  getPageContent, savePageContent,
  getPlugins, savePlugin,
  getAdminSettings, saveAdminSettings,
  sendTestEmail, sendManualEmail,
} from '@/lib/actions';
import type { Order, OrderStatus, CompanyProfile, Product, PaymentSettings, AdminSettings } from '@/types';

/* ─── helpers ─── */
const fmt  = (d: string) => new Date(d).toLocaleDateString('en-MY', { day:'numeric', month:'short', year:'numeric' });
const fmtT = (d: string) => new Date(d).toLocaleString('en-MY', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

const SC: Record<OrderStatus, { label:string; bg:string; text:string; dot:string; next?: OrderStatus }> = {
  new:                   { label:'New Order',             bg:'#eff6ff', text:'#1d4ed8', dot:'#3b82f6', next:'pending_verification' },
  pending_verification:  { label:'Pending Verification',  bg:'#fefce8', text:'#a16207', dot:'#eab308', next:'in_production' },
  in_production:         { label:'In Production',         bg:'#fff7ed', text:'#9a3412', dot:'#f97316', next:'ready_for_programming' },
  ready_for_programming: { label:'Ready for Programming', bg:'#faf5ff', text:'#7e22ce', dot:'#a855f7', next:'shipped' },
  shipped:               { label:'Shipped',               bg:'#eef2ff', text:'#4338ca', dot:'#6366f1', next:'completed' },
  completed:             { label:'Completed',             bg:'#f0fdf4', text:'#15803d', dot:'#22c55e' },
};
const SO = Object.entries(SC).map(([k,v]) => ({ value: k as OrderStatus, label: v.label }));
const SWATCH: Record<string,string> = { black:'#0F0F0F',white:'#e5e7eb',orange:'#f97316',green:'#22c55e',red:'#ef4444',pink:'#ec4899',blue:'#3b82f6',turquoise:'#06b6d4' };

/* ─── UI primitives ─── */
const F: React.CSSProperties = { fontFamily:"'DM Sans',system-ui,sans-serif" };
const card: React.CSSProperties = { background:'#fff', borderRadius:14, border:'1px solid #f0f0f0', padding:'20px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' };
const inp = (w='100%'): React.CSSProperties => ({ width:w, fontSize:13, background:'#f8f8f7', border:'1px solid #e5e7eb', borderRadius:9, padding:'9px 12px', outline:'none', fontFamily:'inherit', color:'#374151', boxSizing:'border-box' as const });
const btn = (bg='#0F0F0F', c='#fff'): React.CSSProperties => ({ background:bg, color:c, border:'none', cursor:'pointer', padding:'10px 20px', borderRadius:9, fontSize:13, fontWeight:700, fontFamily:'inherit' });

function Pill({ status }: { status: OrderStatus }) {
  const c = SC[status];
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:c.bg, color:c.text, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}><span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }}/>{c.label}</span>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button onClick={() => onChange(!on)} style={{ width:44, height:24, borderRadius:99, border:'none', cursor:'pointer', background:on?'#00D4FF':'#e5e7eb', position:'relative', flexShrink:0, transition:'background .2s' }}><div style={{ position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s', left:on?23:3 }}/></button>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', marginBottom:6, letterSpacing:'0.07em', textTransform:'uppercase' as const }}>{children}</label>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, marginBottom:16 }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:'#0F0F0F', margin:'0 0 16px', paddingBottom:12, borderBottom:'1px solid #f3f4f6' }}>{title}</h3>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{children}</div>;
}

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  const ok = msg.startsWith('✅');
  return <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, background:ok?'#0F0F0F':'#ef4444', color:'#fff', padding:'12px 20px', borderRadius:11, fontSize:13, fontWeight:500, boxShadow:'0 8px 28px rgba(0,0,0,.2)', maxWidth:320 }}>{msg}</div>;
}

/* ─── mini bar chart ─── */
function MiniChart({ data }: { data: Record<string,number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([,v]) => v), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:48 }}>
      {entries.map(([d, v]) => (
        <div key={d} title={`${d}: ${v} orders`} style={{ flex:1, background: v > 0 ? '#00D4FF' : '#e5e7eb', height:`${Math.max((v/max)*100, 4)}%`, borderRadius:'2px 2px 0 0', minWidth:4, transition:'height .3s' }}/>
      ))}
    </div>
  );
}

/* ─── ImageUploader ─── */
function ImageUploader({ label, current, onUpload, bucket }: { label:string; current:string; onUpload:(url:string)=>void; bucket:string }) {
  const [loading, setLoading] = useState(false);
  const [errMsg,  setErrMsg]  = useState('');
  const [preview, setPreview] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErrMsg('Fail terlalu besar. Max 5MB.'); return; }
    setLoading(true); setErrMsg('');

    const r = new FileReader();
    r.onload = async () => {
      const b64 = r.result as string;
      setPreview(b64); // Show preview immediately

      // Try Supabase storage upload
      const res = await uploadAsset(b64, f.name, bucket);
      if (res.url) {
        onUpload(res.url);
        setPreview('');
      } else {
        // Fallback: use base64 directly (works without storage bucket)
        console.warn('Storage upload failed, using base64 fallback:', res.error);
        onUpload(b64);
        setPreview('');
      }
      setLoading(false);
    };
    r.onerror = () => { setErrMsg('Gagal baca fail.'); setLoading(false); };
    r.readAsDataURL(f);
  };

  const displayImg = preview || current;

  return (
    <div>
      <Label>{label}</Label>
      <div onClick={() => !loading && ref.current?.click()} style={{ display:'flex', alignItems:'center', gap:12, padding:12, border:`2px dashed ${errMsg ? '#ef4444' : '#e5e7eb'}`, borderRadius:10, cursor: loading ? 'wait' : 'pointer', transition:'all .15s', opacity: loading ? 0.7 : 1 }}
        onMouseOver={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor='#00D4FF'; }}
        onMouseOut={e  => { (e.currentTarget as HTMLElement).style.borderColor = errMsg ? '#ef4444' : '#e5e7eb'; }}>
        {displayImg && displayImg.length > 10
          ? <img
              src={displayImg}
              alt="preview"
              style={{ width:56, height:56, objectFit:'cover', borderRadius:8, background:'#f3f4f6', flexShrink:0, border:'2px solid #00D4FF' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
            />
          : <div style={{ width:56, height:56, background:'#f3f4f6', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🖼️</div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 2px' }}>
            {loading ? '⏳ Uploading…' : displayImg ? '✅ Uploaded — click to change' : 'Click to upload image'}
          </p>
          <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>PNG, JPG, WebP — max 5MB</p>
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={handle}/>
      </div>
      {errMsg && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0', display:'flex', alignItems:'center', gap:4 }}>⚠️ {errMsg}</p>}
      {displayImg && displayImg.length > 10 && (
        <div style={{ marginTop:10, display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <img
              src={displayImg}
              alt="preview"
              style={{ height:64, width:'auto', maxWidth:200, borderRadius:10, objectFit:'contain', border:'1px solid #e5e7eb', background:'#f9fafb', display:'block' }}
              onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display='none'; }}
            />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <p style={{ fontSize:11, color:'#22c55e', fontWeight:600, margin:0 }}>✅ Gambar berjaya dimuatnaik</p>
            <p style={{ fontSize:10, color:'#9ca3af', margin:0, wordBreak:'break-all', maxWidth:160 }}>
              {displayImg.startsWith('data:') ? 'Saved locally' : displayImg.slice(0,50)+'...'}
            </p>
            <button
              onClick={e => { e.stopPropagation(); onUpload(''); setPreview(''); }}
              style={{ fontSize:11, color:'#ef4444', border:'1px solid #fecaca', cursor:'pointer', fontFamily:'inherit', padding:'3px 8px', borderRadius:6, background:'#fff0f0', width:'fit-content' }}>
              ✕ Buang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ LOGIN */
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [show,  setShow]  = useState(false);
  const [err,   setErr]   = useState('');
  const [busy,  setBusy]  = useState(false);

  const go = async () => {
    if (!email || !pass) return;
    setBusy(true); setErr('');
    const r = await adminLogin(email, pass);
    if (r.success) onLogin(); else setErr(r.error || 'Failed');
    setBusy(false);
  };

  return (
    <div style={{ ...F, minHeight:'100vh', background:'#0A0A0A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:420, padding:40, background:'#111', borderRadius:20, border:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
          <div style={{ width:38, height:38, background:'#00D4FF', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(0,212,255,.4)' }}>
            <span style={{ color:'#0A0A0A', fontSize:15, fontWeight:800 }}>N</span>
          </div>
          <div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>ThisIsMyCard</div>
            <div style={{ color:'rgba(255,255,255,.3)', fontSize:11 }}>Admin Portal</div>
          </div>
        </div>
        <h1 style={{ fontSize:26, fontWeight:700, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.03em' }}>Selamat datang</h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.35)', margin:'0 0 28px' }}>Log masuk ke admin dashboard</p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <Label>Email</Label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&go()} placeholder="admin@thisismycard.io"
              style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:14, padding:'12px 14px', borderRadius:10, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
          </div>
          <div>
            <Label>Password</Label>
            <div style={{ position:'relative' }}>
              <input type={show?'text':'password'} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter'&&go()} placeholder="••••••••••"
                style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:14, padding:'12px 44px 12px 14px', borderRadius:10, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
              <button type="button" onClick={() => setShow(!show)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{show?'Hide':'Show'}</button>
            </div>
          </div>
          {err && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#fca5a5', fontSize:13, padding:'10px 14px', borderRadius:9 }}>{err}</div>}
          <button onClick={go} disabled={busy} style={{ ...btn('#00D4FF','#0A0A0A'), padding:'14px', width:'100%', fontSize:15, marginTop:4, boxShadow:'0 4px 20px rgba(0,212,255,.35)', opacity:busy?.7:1 }}>
            {busy ? 'Logging in…' : 'Log Masuk →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ MAIN ADMIN */
type Tab = 'dashboard'|'orders'|'products'|'company'|'payments'|'email'|'pages'|'plugins'|'settings';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id:'dashboard', icon:'▦', label:'Dashboard' },
  { id:'orders',    icon:'≡', label:'Orders' },
  { id:'products',  icon:'⬡', label:'Products' },
  { id:'company',   icon:'🏢', label:'Syarikat' },
  { id:'payments',  icon:'💳', label:'Payment' },
  { id:'email',     icon:'✉', label:'Email' },
  { id:'pages',     icon:'📄', label:'Pages' },
  { id:'plugins',   icon:'🔌', label:'Plugins' },
  { id:'settings',  icon:'⚙', label:'Settings' },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab,    setTab]    = useState<Tab>('dashboard');
  const [toast,  setToast]  = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // data
  const [orders,    setOrders]   = useState<Order[]>([]);
  const [stats,     setStats]    = useState({ total:0, new:0, pending:0, production:0, shipped:0, completed:0, todayCount:0, weekCount:0, monthCount:0, revenue:0, chartData:{} as Record<string,number> });
  const [products,  setProducts] = useState<Product[]>([]);
  const [company,   setCompany]  = useState<Partial<CompanyProfile>>({});
  const [payments,  setPayments] = useState<Partial<PaymentSettings>>({});
  const [settings,  setSettings] = useState<Partial<AdminSettings>>({});
  const [landingContent,  setLandingContent]  = useState<Record<string, unknown>>({});
  const [storyContent,    setStoryContent]    = useState<Record<string, unknown>>({});
  const [termsContent,    setTermsContent]    = useState<Record<string, unknown>>({});
  const [activePageTab,   setActivePageTab]   = useState<'landing'|'our-story'|'terms'>('landing');
  const [pbDevice,        setPbDevice]        = useState<'desktop'|'mobile'>('desktop');
  const [pbSection,       setPbSection]       = useState<string>('hero');
  const [pbHistory,       setPbHistory]       = useState<Record<string,Array<Record<string,unknown>>>>({ landing:[], 'our-story':[], terms:[] });
  const [pbFuture,        setPbFuture]        = useState<Record<string,Array<Record<string,unknown>>>>({ landing:[], 'our-story':[], terms:[] });
  const [pbSaving,        setPbSaving]        = useState(false);
  const [pbPublishModal,  setPbPublishModal]  = useState(false);
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [bulkSelected,    setBulkSelected]    = useState<string[]>([]);
  const [bulkStatus,      setBulkStatus]      = useState<OrderStatus|''>('');
  const [trackingInputs,  setTrackingInputs]  = useState<Record<string,string>>({});
  const [plugins,   setPlugins]  = useState<Array<{ plugin_key:string; enabled:boolean; config:Record<string,string> }>>([]);
  const [loading,     setLoading]    = useState(true);
  const [isSeedData,  setIsSeedData]  = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // orders UI
  const [selOrder,   setSelOrder]   = useState<Order | null>(null);
  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState<OrderStatus|'all'>('all');
  const [emailOId,   setEmailOId]   = useState('');
  const [emailSubj,  setEmailSubj]  = useState('');
  const [emailBody,  setEmailBody]  = useState('');
  const [emailBusy,  setEmailBusy]  = useState(false);
  const [emailMsg,   setEmailMsg]   = useState('');
  const [testTo,     setTestTo]     = useState('');

  // product modal
  const [editProd,   setEditProd]   = useState<Partial<Product> | null>(null);
  const [savedOk,    setSavedOk]    = useState(false);

  const toast$ = (m: string) => {
    setToast(m);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3200);
  };

  // ── Page builder undo/redo ────────────────────────────────────────────────
  const pbSetContent = (page: 'landing'|'our-story'|'terms', updater: (prev: Record<string,unknown>) => Record<string,unknown>) => {
    const setters = { landing: setLandingContent, 'our-story': setStoryContent, 'terms': setTermsContent };
    const getters: Record<string, Record<string,unknown>> = { landing: landingContent, 'our-story': storyContent, 'terms': termsContent };
    const prev = getters[page];
    setPbHistory(h => ({ ...h, [page]: [...h[page].slice(-19), prev] }));
    setPbFuture(f => ({ ...f, [page]: [] }));
    setters[page](updater(prev) as Record<string,unknown>);
  };

  const pbUndo = () => {
    const page = activePageTab;
    const hist = pbHistory[page];
    if (!hist.length) return;
    const prev = hist[hist.length-1] as Record<string,unknown>;
    const getters: Record<string, Record<string,unknown>> = { landing: landingContent, 'our-story': storyContent, 'terms': termsContent };
    const setters = { landing: setLandingContent, 'our-story': setStoryContent, 'terms': setTermsContent };
    setPbFuture(f => ({ ...f, [page]: [...f[page], getters[page]] }));
    setPbHistory(h => ({ ...h, [page]: h[page].slice(0,-1) }));
    setters[page](prev);
    toast$('↩ Undo');
  };

  const pbRedo = () => {
    const page = activePageTab;
    const fut = pbFuture[page];
    if (!fut.length) return;
    const next = fut[fut.length-1] as Record<string,unknown>;
    const getters: Record<string, Record<string,unknown>> = { landing: landingContent, 'our-story': storyContent, 'terms': termsContent };
    const setters = { landing: setLandingContent, 'our-story': setStoryContent, 'terms': setTermsContent };
    setPbHistory(h => ({ ...h, [page]: [...h[page], getters[page]] }));
    setPbFuture(f => ({ ...f, [page]: f[page].slice(0,-1) }));
    setters[page](next);
    toast$('↪ Redo');
  };

  const pbSave = async () => {
    setPbSaving(true);
    const saves: Record<string, ()=>Promise<{success:boolean;error?:string}>> = {
      'landing': ()=>savePageContent('landing',landingContent),
      'our-story': ()=>savePageContent('our-story',storyContent),
      'terms': ()=>savePageContent('terms',termsContent),
    };
    const r = await saves[activePageTab]();
    setPbSaving(false);
    if (r.success) { toast$('✅ Published!'); setPbPublishModal(false); }
    else toast$('❌ ' + r.error);
  };

  const doBulkStatus = async () => {
    if (!bulkStatus || !bulkSelected.length) return;
    for (const id of bulkSelected) await updateOrderStatus(id, bulkStatus as OrderStatus);
    setOrders(prev => prev.map(o => bulkSelected.includes(o.id) ? { ...o, status: bulkStatus as OrderStatus } : o));
    toast$('✅ ' + bulkSelected.length + ' orders updated → ' + bulkStatus);
    setBulkSelected([]); setBulkStatus('');
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [oRes, stRes, pRes, cRes, payRes, sRes, lcRes, scRes, tcRes, plRes] = await Promise.all([
      getAllOrders(), getOrderStats(), getProducts(), getCompanyProfile(),
      getPaymentSettings(), getAdminSettings(),
      getPageContent('landing'), getPageContent('our-story'), getPageContent('terms'),
      getPlugins(),
    ]);
    if (oRes.orders) {
      setOrders(oRes.orders);
    }
    // Check if DB is actually connected (tables exist)
    const dbOk = await checkDbConnected();
    setIsSeedData(!dbOk);
    setStats(stRes);
    if (pRes.products) setProducts(pRes.products);
    if (cRes)   setCompany(cRes);
    if (payRes) setPayments(payRes);
    if (sRes)   setSettings(sRes);
    if (lcRes)  setLandingContent(lcRes.content || {});
    if (scRes)  setStoryContent(scRes.content || {});
    if (tcRes)  setTermsContent(tcRes.content || {});
    setPlugins(plRes);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);
  // Check if user already dismissed the banner
  useEffect(() => {
    try { if (localStorage.getItem('timc_banner_dismissed') === '1') setBannerDismissed(true); } catch {}
  }, []);

  const chStatus = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    setOrders(p => p.map(o => o.id===id ? { ...o, status } : o));
    if (selOrder?.id===id) setSelOrder(p => p ? { ...p, status } : null);
    toast$(`✅ Status → ${SC[status].label}`);
  };

  const delOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    await deleteOrder(id);
    setOrders(p => p.filter(o => o.id!==id));
    setSelOrder(null);
    toast$('✅ Order deleted');
  };

  const saveAll = async <T extends object>(fn: (d: T) => Promise<{ success: boolean; error?: string }>, data: T, label = 'Saved') => {
    const r = await fn(data);
    if (r.success) { toast$(`✅ ${label}`); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000); }
    else toast$(`❌ ${r.error}`);
  };

  const doExport = async () => {
    const csv = await exportOrdersCSV();
    if (!csv) { toast$('No orders to export'); return; }
    const blob = new Blob([csv], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (!q || o.full_name.toLowerCase().includes(q) || o.company_name.toLowerCase().includes(q) || o.order_number.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
      && (statusF==='all' || o.status===statusF);
  });

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ ...F, display:'flex', minHeight:'100vh', background:'#f7f7f6' }}>

      {/* ── Setup Banner ── */}
      {isSeedData && !bannerDismissed && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'linear-gradient(90deg,#f59e0b,#d97706)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
            <span style={{ fontSize:15, flexShrink:0 }}>⚠️</span>
            <span style={{ fontSize:12, color:'#0F0F0F' }}>
              <strong>Supabase orders table belum dibuat.</strong> Run SQL orders table migration, lepas tu click Semak Semula.
            </span>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={async () => { const ok = await checkDbConnected(); setIsSeedData(!ok); if(ok) toast$('✅ Database disambungkan!'); else toast$('❌ Masih belum connected. Run SQL dulu.'); }}
              style={{ background:'#0F0F0F', color:'#fff', padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              ↻ Semak Semula
            </button>
            <button onClick={() => { setBannerDismissed(true); try { localStorage.setItem('timc_banner_dismissed','1'); } catch {} }}
              style={{ background:'rgba(0,0,0,0.2)', color:'#0F0F0F', padding:'6px 10px', borderRadius:7, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              ✕ Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={{ width:220, background:'#0F0F0F', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top: (isSeedData && !bannerDismissed) ? 44 : 0, height: (isSeedData && !bannerDismissed) ? 'calc(100vh - 44px)' : '100vh', overflowY:'auto' }}>
        <div style={{ padding:'22px 20px 16px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {company.logo_url
              ? <img src={company.logo_url} alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:8, background:'rgba(255,255,255,.1)', flexShrink:0 }}/>
              : <div style={{ width:32, height:32, background:'#00D4FF', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(0,212,255,.35)', flexShrink:0 }}><span style={{ color:'#0F0F0F', fontSize:13, fontWeight:800 }}>N</span></div>
            }
            <div>
              <div style={{ color:'#fff', fontWeight:700, fontSize:13, letterSpacing:'-0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{company.name || 'ThisIsMyCard'}</div>
              <div style={{ color:'rgba(255,255,255,.3)', fontSize:10 }}>Admin Portal</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:'10px 10px', display:'flex', flexDirection:'column', gap:2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
              borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', width:'100%', textAlign:'left',
              background: tab===t.id ? 'rgba(0,212,255,.12)' : 'transparent',
              color: tab===t.id ? '#00D4FF' : 'rgba(255,255,255,.45)',
              fontSize:13, fontWeight: tab===t.id ? 600 : 400, transition:'all .15s',
            }}
            onMouseOver={e => { if(tab!==t.id){ e.currentTarget.style.background='rgba(255,255,255,.04)'; e.currentTarget.style.color='#fff'; }}}
            onMouseOut={e  => { if(tab!==t.id){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.45)'; }}}>
              <span style={{ fontSize:13 }}>{t.icon}</span>
              {t.label}
              {t.id==='orders' && stats.new>0 && <span style={{ marginLeft:'auto', background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:99 }}>{stats.new}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <div style={{ width:7, height:7, background:'#22c55e', borderRadius:'50%' }}/>
            <span style={{ color:'rgba(255,255,255,.3)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>admin@thisismycard.io</span>
          </div>
          <button onClick={() => setAuthed(false)} style={{ ...btn('rgba(255,255,255,.05)','rgba(255,255,255,.4)'), width:'100%', padding:'8px', fontSize:12, border:'1px solid rgba(255,255,255,.08)' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex:1, overflow:'auto', padding:28 }}>

        {/* ══ DASHBOARD ══════════════════════════════════════════ */}
        {tab==='dashboard' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
              <div>
                <h1 style={{ fontSize:24, fontWeight:700, color:'#0F0F0F', margin:'0 0 4px', letterSpacing:'-0.03em' }}>Dashboard</h1>
                <p style={{ fontSize:14, color:'#6b7280', margin:0 }}>Selamat datang semula. Berikut adalah ringkasan hari ini.</p>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <button onClick={()=>setNotifOpen(n=>!n)} style={{ width:38,height:38,borderRadius:9,border:'1px solid #f0f0f0',background:'#fff',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>🔔</button>
                  {stats.new>0 && <div style={{ position:'absolute',top:-4,right:-4,background:'#ef4444',color:'#fff',fontSize:10,fontWeight:700,width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>{stats.new}</div>}
                  {notifOpen && (
                    <div style={{ position:'absolute',top:44,right:0,width:320,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.15)',border:'1px solid #f0f0f0',zIndex:99,overflow:'hidden' }}>
                      <div style={{ padding:'14px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                        <span style={{ fontSize:14,fontWeight:700,color:'#0F0F0F' }}>Notifications</span>
                        <button onClick={()=>setNotifOpen(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#9ca3af' }}>✕</button>
                      </div>
                      {orders.filter(o=>o.status==='new').slice(0,5).map(o=>(
                        <div key={o.id} onClick={()=>{setSelOrder(o);setTab('orders');setNotifOpen(false);}} style={{ padding:'12px 16px',borderBottom:'1px solid #fafafa',cursor:'pointer',display:'flex',gap:10,alignItems:'center' }}
                          onMouseOver={e=>(e.currentTarget as HTMLElement).style.background='#f8f8f7'}
                          onMouseOut={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                          <div style={{ width:36,height:36,background:'#eff6ff',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#3b82f6',flexShrink:0 }}>{o.full_name.charAt(0)}</div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:13,fontWeight:600,color:'#0F0F0F',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>New — {o.full_name}</p>
                            <p style={{ fontSize:11,color:'#9ca3af',margin:0 }}>{o.company_name} · {o.order_number}</p>
                          </div>
                        </div>
                      ))}
                      {stats.new===0 && <div style={{ padding:'24px',textAlign:'center',color:'#9ca3af',fontSize:13 }}>No new notifications 🎉</div>}
                    </div>
                  )}
                </div>
                <button onClick={() => { setTab('orders'); }} style={{ ...btn(), padding:'9px 18px' }}>+ New Order</button>
              </div>
            </div>

            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                { label:'Total Orders', value: stats.total,      bg:'#0F0F0F', vc:'#fff',    sc:'rgba(255,255,255,.4)', dot:'#00D4FF' },
                { label:'New Orders',   value: stats.new,        bg:'#fff',    vc:'#0F0F0F', sc:'#6b7280',             dot:'#3b82f6' },
                { label:'Hari Ini',     value: stats.todayCount, bg:'#fff',    vc:'#0F0F0F', sc:'#6b7280',             dot:'#22c55e' },
                { label:'Revenue Est.', value:`RM ${stats.revenue.toLocaleString()}`, bg:'#fff', vc:'#0F0F0F', sc:'#6b7280', dot:'#a855f7' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:'20px 22px', border:'1px solid #f0f0f0', boxShadow: s.bg==='#0F0F0F'?'0 4px 20px rgba(0,0,0,.15)':'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize:30, fontWeight:700, color:s.vc, letterSpacing:'-0.04em', lineHeight:1 }}>{loading?'—':s.value}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:s.dot }}/>
                    <span style={{ fontSize:12, fontWeight:500, color:s.sc }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Status + Chart row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, marginBottom:20 }}>
              {/* Chart */}
              <div style={{ ...card }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'#0F0F0F', margin:0 }}>Orders — 14 Hari Terakhir</h3>
                  <span style={{ fontSize:12, color:'#9ca3af' }}>{stats.weekCount} minggu ini</span>
                </div>
                <MiniChart data={stats.chartData}/>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:10, color:'#9ca3af' }}>14 hari lalu</span>
                  <span style={{ fontSize:10, color:'#9ca3af' }}>Hari ini</span>
                </div>
              </div>

              {/* Status breakdown */}
              <div style={{ ...card }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'#0F0F0F', margin:'0 0 14px' }}>Status Breakdown</h3>
                {[
                  { title:'Pending',    v:stats.pending,    bg:SC.pending_verification.bg,  text:SC.pending_verification.text,  dot:SC.pending_verification.dot },
                  { title:'Production', v:stats.production, bg:SC.in_production.bg,         text:SC.in_production.text,         dot:SC.in_production.dot },
                  { title:'Shipped',    v:stats.shipped,    bg:SC.shipped.bg,               text:SC.shipped.text,               dot:SC.shipped.dot },
                  { title:'Completed',  v:stats.completed,  bg:SC.completed.bg,             text:SC.completed.text,             dot:SC.completed.dot },
                ].map(s => (
                  <div key={s.title} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:s.bg, borderRadius:9, marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:s.dot }}/>
                      <span style={{ fontSize:12, fontWeight:600, color:s.text }}>{s.title}</span>
                    </div>
                    <span style={{ fontSize:16, fontWeight:700, color:s.text }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent orders */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'#0F0F0F', margin:0 }}>Order Terbaru</h3>
                <button onClick={() => setTab('orders')} style={{ fontSize:12, color:'#00D4FF', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Lihat semua →</button>
              </div>
              {loading ? <p style={{ color:'#9ca3af', fontSize:13 }}>Loading…</p> :
                orders.slice(0,6).map((o,i) => (
                  <div key={o.id} onClick={() => { setSelOrder(o); setTab('orders'); }} style={{ display:'grid', gridTemplateColumns:'36px 1fr 140px 130px 120px', gap:12, alignItems:'center', padding:'9px 0', borderBottom:i<5?'1px solid #f8f8f8':'none', cursor:'pointer' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.background='#fafafa'}
                    onMouseOut={e  => (e.currentTarget as HTMLElement).style.background='transparent'}>
                    <div style={{ width:32,height:32,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#6b7280',fontSize:12 }}>{o.full_name.charAt(0)}</div>
                    <div><p style={{ fontSize:13,fontWeight:600,color:'#111',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.full_name}</p><p style={{ fontSize:11,color:'#9ca3af',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.company_name}</p></div>
                    <span style={{ fontSize:12,color:'#6b7280' }}>{o.order_number}</span>
                    <span style={{ fontSize:11,color:'#9ca3af' }}>{fmtT(o.created_at)}</span>
                    <Pill status={o.status}/>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══ ORDERS ══════════════════════════════════════════ */}
        {tab==='orders' && (
          <div style={{ display:'grid', gridTemplateColumns: selOrder?'1fr 360px':'1fr', gap:20 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 2px',letterSpacing:'-0.03em' }}>Orders</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>{filtered.length} orders</p></div>
                <button onClick={doExport} style={{ ...btn('#f3f4f6','#374151'), padding:'9px 16px', border:'1px solid #e5e7eb' }}>⬇ Export CSV</button>
              </div>

              {/* Search + Filter */}
              <div style={{ display:'flex', gap:10, marginBottom:10, flexWrap:'wrap' as const }}>
                <div style={{ position:'relative', flex:1, minWidth:200 }}>
                  <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#9ca3af' }}>🔍</span>
                  <input style={{ ...inp(), paddingLeft:32 }} type="search" placeholder="Search nama, syarikat, order…" value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
                <select value={statusF} onChange={e => { setStatusF(e.target.value as OrderStatus|'all'); setBulkSelected([]); }} style={inp('auto')}>
                  <option value="all">Semua Status</option>
                  {SO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={load} style={{ ...btn('#f3f4f6','#374151'), padding:'9px 12px', border:'1px solid #e5e7eb' }}>↻</button>
              </div>

              {/* Bulk Actions Bar */}
              {bulkSelected.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'#eff6ff', borderRadius:10, marginBottom:10, border:'1px solid #bfdbfe' }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1d4ed8' }}>{bulkSelected.length} orders selected</span>
                  <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as OrderStatus|'')} style={{ ...inp('auto'), fontSize:12 }}>
                    <option value="">Tukar status ke…</option>
                    {SO.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={doBulkStatus} disabled={!bulkStatus} style={{ ...btn('#1d4ed8'), padding:'7px 16px', fontSize:12, opacity:bulkStatus?1:.5 }}>Apply</button>
                  <button onClick={doExport} style={{ ...btn('#f3f4f6','#374151'), padding:'7px 14px', fontSize:12, border:'1px solid #e5e7eb' }}>⬇ Export Selected</button>
                  <button onClick={()=>setBulkSelected([])} style={{ marginLeft:'auto', fontSize:11, color:'#6b7280', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>✕ Clear</button>
                </div>
              )}

              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f0f0f0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'28px 34px 1fr 120px 110px 140px 80px', gap:10, padding:'10px 18px', background:'#f8f8f7', borderBottom:'1px solid #f0f0f0' }}>
                  <input type="checkbox" style={{ cursor:'pointer', accentColor:'#0F0F0F' }} checked={bulkSelected.length===filtered.length&&filtered.length>0} onChange={e=>setBulkSelected(e.target.checked?filtered.map(o=>o.id):[])}/>
                  {['','Customer','Order #','Date','Status','Action'].map(h => <div key={h} style={{ fontSize:10,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase' as const,color:'#9ca3af' }}>{h}</div>)}
                </div>
                {loading ? <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading…</div>
                  : filtered.length===0 ? <div style={{ padding:48, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Tiada orders.</div>
                  : filtered.map((o,i) => (
                    <div key={o.id} style={{ display:'grid', gridTemplateColumns:'28px 34px 1fr 120px 110px 140px 80px', gap:10, padding:'11px 18px', alignItems:'center', background:bulkSelected.includes(o.id)?'#eff6ff':selOrder?.id===o.id?'#f0fdf4':'transparent', borderBottom:i<filtered.length-1?'1px solid #fafafa':'none' }}
                      onMouseOver={e => { if(!bulkSelected.includes(o.id)&&selOrder?.id!==o.id)(e.currentTarget as HTMLElement).style.background='#fafafa'; }}
                      onMouseOut={e  => { if(!bulkSelected.includes(o.id)&&selOrder?.id!==o.id)(e.currentTarget as HTMLElement).style.background='transparent'; }}>
                      <input type="checkbox" style={{ cursor:'pointer', accentColor:'#0F0F0F' }} checked={bulkSelected.includes(o.id)} onChange={e=>{e.stopPropagation();setBulkSelected(p=>e.target.checked?[...p,o.id]:p.filter(id=>id!==o.id));}} onClick={e=>e.stopPropagation()}/>
                      <div onClick={()=>setSelOrder(o===selOrder?null:o)} style={{ width:32,height:32,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#6b7280',fontSize:12,cursor:'pointer' }}>{o.full_name.charAt(0)}</div>
                      <div style={{ minWidth:0 }}><p style={{ fontSize:13,fontWeight:600,color:'#111',margin:'0 0 1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.full_name}</p><p style={{ fontSize:11,color:'#9ca3af',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.company_name}</p></div>
                      <div><p style={{ fontSize:12,fontWeight:600,color:'#374151',margin:'0 0 2px' }}>{o.order_number}</p><div style={{ display:'flex',alignItems:'center',gap:4 }}><div style={{ width:8,height:8,borderRadius:2,background:SWATCH[o.card_color]||'#ccc' }}/><span style={{ fontSize:10,color:'#9ca3af',textTransform:'capitalize' }}>{o.card_color}</span></div></div>
                      <span style={{ fontSize:11,color:'#9ca3af' }}>{fmt(o.created_at)}</span>
                      <Pill status={o.status}/>
                      {SC[o.status].next && <button onClick={e => { e.stopPropagation(); chStatus(o.id, SC[o.status].next!); }} style={{ fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #bbf7d0',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit',fontWeight:600,whiteSpace:'nowrap' }}>→ Next</button>}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Order detail panel */}
            {selOrder && (
              <div style={{ ...card, padding:0, overflow:'hidden', position:'sticky', top:0, maxHeight:'calc(100vh - 56px)', display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:38,height:38,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#6b7280',fontSize:15 }}>{selOrder.full_name.charAt(0)}</div>
                    <div><p style={{ fontSize:14,fontWeight:700,color:'#0F0F0F',margin:'0 0 1px' }}>{selOrder.full_name}</p><p style={{ fontSize:12,color:'#6b7280',margin:0 }}>{selOrder.company_name}</p></div>
                  </div>
                  <button onClick={() => setSelOrder(null)} style={{ width:28,height:28,background:'#f3f4f6',border:'none',borderRadius:7,cursor:'pointer',fontSize:14,color:'#6b7280' }}>✕</button>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:18 }}>

                  {/* Status pipeline */}
                  <div>
                    <Label>Status</Label>
                    <div style={{ marginBottom:10 }}><Pill status={selOrder.status}/></div>
                    <select value={selOrder.status} onChange={e => chStatus(selOrder.id, e.target.value as OrderStatus)} style={inp()}>
                      {SO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div style={{ display:'flex', gap:3, marginTop:10 }}>
                      {SO.map((s,idx) => { const ci = SO.findIndex(x => x.value===selOrder.status); return <div key={s.value} title={s.label} onClick={() => chStatus(selOrder.id, s.value)} style={{ flex:1, height:4, borderRadius:99, background:idx<=ci?SC[s.value].dot:'#e5e7eb', cursor:'pointer', transition:'background .2s' }}/>; })}
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <Label>Contact</Label>
                    {[['Email',selOrder.email,`mailto:${selOrder.email}`],['Phone',selOrder.phone,`tel:${selOrder.phone}`],['WhatsApp',selOrder.whatsapp,`https://wa.me/${selOrder.whatsapp.replace(/\D/g,'')}`]].map(([k,v,h]) => (
                      <div key={k} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8f8f7',borderRadius:8,padding:'7px 11px',marginBottom:6 }}>
                        <span style={{ fontSize:11,color:'#9ca3af',fontWeight:500 }}>{k}</span>
                        <a href={h} target="_blank" rel="noreferrer" style={{ fontSize:12,color:'#3b82f6',fontWeight:500,textDecoration:'none',maxWidth:190,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v}</a>
                      </div>
                    ))}
                  </div>

                  {/* Order info */}
                  <div>
                    <Label>Order Info</Label>
                    <div style={{ background:'#f8f8f7',borderRadius:10,padding:'12px 14px' }}>
                      {[['Order #',selOrder.order_number],['Tarikh',fmt(selOrder.purchase_date)],['Qty',`${selOrder.quantity_ordered} kad`],['Warna',selOrder.card_color],['Submitted',fmtT(selOrder.created_at)]].map(([k,v]) => (
                        <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0' }}>
                          <span style={{ color:'#9ca3af' }}>{k}</span><span style={{ fontWeight:600,color:'#111',textTransform:'capitalize' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Social links */}
                  {(selOrder.website||selOrder.linkedin||selOrder.instagram||selOrder.facebook) && (
                    <div>
                      <Label>Links</Label>
                      {[['🌐',selOrder.website],['💼',selOrder.linkedin],['📸',selOrder.instagram],['📘',selOrder.facebook]].filter(([,v])=>v).map(([i,v]) => (
                        <a key={i} href={v!} target="_blank" rel="noreferrer" style={{ display:'flex',gap:8,alignItems:'center',background:'#f0f7ff',padding:'7px 10px',borderRadius:8,marginBottom:5,textDecoration:'none',fontSize:12,color:'#3b82f6',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{i} {v}</a>
                      ))}
                    </div>
                  )}

                  {selOrder.additional_notes && (
                    <div><Label>Notes</Label><p style={{ fontSize:13,color:'#374151',background:'#fefce8',border:'1px solid #fef08a',borderRadius:9,padding:'10px 12px',margin:0,lineHeight:1.6 }}>{selOrder.additional_notes}</p></div>
                  )}

                  {/* Tracking Number */}
                  <div>
                    <Label>Tracking Number</Label>
                    <div style={{ display:'flex', gap:8 }}>
                      <input style={{ ...inp(), flex:1 }}
                        value={trackingInputs[selOrder.id]||''}
                        onChange={e=>setTrackingInputs(p=>({...p,[selOrder.id]:e.target.value}))}
                        placeholder="e.g. EX123456789MY"
                      />
                      <button onClick={()=>{
                        const t=trackingInputs[selOrder.id];
                        if(t){navigator.clipboard?.writeText(t);toast$('✅ Tracking copied!');}
                      }} style={{ ...btn('#f3f4f6','#374151'), padding:'9px 12px', border:'1px solid #e5e7eb', fontSize:12 }}>📋</button>
                    </div>
                    {trackingInputs[selOrder.id] && (
                      <a href={`https://www.tracking.my/track?tracking_number=${trackingInputs[selOrder.id]}`} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:'#3b82f6', textDecoration:'none', display:'block', marginTop:5 }}>
                        🔍 Track parcel →
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <button onClick={() => { setEmailOId(selOrder.id); setTab('email'); }} style={{ ...btn(), padding:'10px' }}>✉ Hantar Email</button>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <a href={`tel:${selOrder.phone}`} style={{ ...btn('#f0fdf4','#15803d'), display:'block', textAlign:'center' as const, textDecoration:'none', border:'1px solid #bbf7d0' }}>📞 Call</a>
                      <a href={`https://wa.me/${selOrder.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ ...btn('#f0fdf4','#15803d'), display:'block', textAlign:'center' as const, textDecoration:'none', border:'1px solid #bbf7d0' }}>💬 WA</a>
                    </div>
                    <button onClick={() => delOrder(selOrder.id)} style={{ ...btn('#fff','#ef4444'), border:'1px solid #fecaca' }}>🗑 Delete Order</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PRODUCTS ══════════════════════════════════════════ */}
        {tab==='products' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <div><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 2px',letterSpacing:'-0.03em' }}>Products</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>{products.length} produk</p></div>
              <button onClick={() => setEditProd({ name:'', description:'', price:0, original_price:0, sku:'', image_url:'', in_stock:true, is_featured:false, colors:[], tags:[] })} style={btn()}>+ Tambah Produk</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {products.map(p => (
                <div key={p.id} style={{ ...card, padding:0, overflow:'hidden' }}>
                  <div style={{ height:160, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:40 }}>🃏</span>}
                    {p.is_featured && <div style={{ position:'absolute', top:10, left:10, background:'#fbbf24', color:'#0F0F0F', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99 }}>⭐ FEATURED</div>}
                    {!p.in_stock && <div style={{ position:'absolute', top:10, right:10, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99 }}>OUT OF STOCK</div>}
                  </div>
                  <div style={{ padding:16 }}>
                    <p style={{ fontSize:11,color:'#9ca3af',margin:'0 0 3px',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' }}>{p.sku}</p>
                    <h3 style={{ fontSize:15,fontWeight:700,color:'#0F0F0F',margin:'0 0 6px' }}>{p.name}</h3>
                    <p style={{ fontSize:13,color:'#6b7280',margin:'0 0 12px',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{p.description}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontSize:18,fontWeight:700,color:'#0F0F0F' }}>RM {Number(p.price).toFixed(2)}</span>
                        {p.original_price > p.price && <span style={{ fontSize:12,color:'#9ca3af',textDecoration:'line-through',marginLeft:6 }}>RM {Number(p.original_price).toFixed(2)}</span>}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setEditProd(p)} style={{ fontSize:11,background:'#f3f4f6',color:'#374151',border:'none',borderRadius:7,padding:'6px 10px',cursor:'pointer',fontFamily:'inherit',fontWeight:600 }}>Edit</button>
                        <button onClick={() => { if(confirm('Delete?')) deleteProduct(p.id).then(r => { if(r.success) { setProducts(pr => pr.filter(x => x.id!==p.id)); toast$('✅ Deleted'); }}); }} style={{ fontSize:11,background:'#fff0f0',color:'#ef4444',border:'1px solid #fecaca',borderRadius:7,padding:'6px 10px',cursor:'pointer',fontFamily:'inherit',fontWeight:600 }}>Del</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Edit Modal */}
            {editProd && (
              <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)',padding:20 }}>
                <div style={{ background:'#fff',borderRadius:20,maxWidth:680,width:'100%',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,.18)' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid #f0f0f0' }}>
                    <h3 style={{ fontSize:16,fontWeight:700,color:'#0F0F0F',margin:0 }}>{editProd.id ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                    <button onClick={() => setEditProd(null)} style={{ width:30,height:30,background:'#f3f4f6',border:'none',borderRadius:8,cursor:'pointer',fontSize:16,color:'#6b7280' }}>✕</button>
                  </div>
                  <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
                    <ImageUploader label="Gambar Produk" current={editProd.image_url||''} bucket="product-images" onUpload={url => setEditProd(p => ({ ...p, image_url:url }))}/>
                    <Grid2>
                      <div><Label>Nama Produk</Label><input style={inp()} value={editProd.name||''} onChange={e => setEditProd(p => ({ ...p, name:e.target.value }))} placeholder="NFC Business Card — Standard"/></div>
                      <div><Label>SKU</Label><input style={inp()} value={editProd.sku||''} onChange={e => setEditProd(p => ({ ...p, sku:e.target.value }))} placeholder="TIMC-STD-001"/></div>
                    </Grid2>
                    <div><Label>Deskripsi</Label><textarea style={{ ...inp(), resize:'vertical', height:80 }} value={editProd.description||''} onChange={e => setEditProd(p => ({ ...p, description:e.target.value }))}/></div>
                    <Grid2>
                      <div><Label>Harga (RM)</Label><input type="number" style={inp()} value={editProd.price||''} onChange={e => setEditProd(p => ({ ...p, price:parseFloat(e.target.value)||0 }))} placeholder="45.00"/></div>
                      <div><Label>Harga Asal (RM)</Label><input type="number" style={inp()} value={editProd.original_price||''} onChange={e => setEditProd(p => ({ ...p, original_price:parseFloat(e.target.value)||0 }))} placeholder="60.00"/></div>
                    </Grid2>
                    <div style={{ display:'flex', gap:20 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}><Toggle on={editProd.in_stock??true} onChange={v => setEditProd(p => ({ ...p, in_stock:v }))}/><span style={{ fontSize:13, color:'#374151' }}>Dalam Stok</span></div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}><Toggle on={editProd.is_featured??false} onChange={v => setEditProd(p => ({ ...p, is_featured:v }))}/><span style={{ fontSize:13, color:'#374151' }}>Featured</span></div>
                    </div>
                    <button onClick={async () => { const r = await saveProduct(editProd); if(r.success){ toast$('✅ Produk disimpan'); setEditProd(null); const pr = await getProducts(); if(pr.products) setProducts(pr.products); } else toast$('❌ '+r.error); }} style={{ ...btn(), padding:'12px' }}>
                      💾 Simpan Produk
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ COMPANY ══════════════════════════════════════════ */}
        {tab==='company' && (
          <div style={{ maxWidth:720 }}>
            <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>Profil Syarikat</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>Maklumat syarikat yang akan dipaparkan di laman web.</p></div>

            <Section title="Branding">
              <Grid2>
                <ImageUploader label="Logo Syarikat" current={company.logo_url||''} bucket="company-assets" onUpload={url => setCompany(c => ({ ...c, logo_url:url }))}/>
                <ImageUploader label="Hero Image" current={company.hero_image_url||''} bucket="company-assets" onUpload={url => setCompany(c => ({ ...c, hero_image_url:url }))}/>
              </Grid2>
              <div style={{ marginTop:12 }}><Label>Nama Syarikat</Label><input style={inp()} value={company.name||''} onChange={e => setCompany(c => ({ ...c, name:e.target.value }))} placeholder="ThisIsMyCard"/></div>
              <div style={{ marginTop:12 }}><Label>Tagline</Label><input style={inp()} value={company.tagline||''} onChange={e => setCompany(c => ({ ...c, tagline:e.target.value }))} placeholder="Premium NFC Digital Business Cards"/></div>
              <div style={{ marginTop:12 }}><Label>Deskripsi</Label><textarea style={{ ...inp(), resize:'vertical', height:80 }} value={company.description||''} onChange={e => setCompany(c => ({ ...c, description:e.target.value }))}/></div>
            </Section>

            <Section title="Maklumat Hubungan">
              <Grid2>
                <div><Label>Email</Label><input style={inp()} type="email" value={company.email||''} onChange={e => setCompany(c => ({ ...c, email:e.target.value }))} placeholder="hello@thisismycard.io"/></div>
                <div><Label>Telefon</Label><input style={inp()} type="tel" value={company.phone||''} onChange={e => setCompany(c => ({ ...c, phone:e.target.value }))} placeholder="+60123456789"/></div>
                <div><Label>WhatsApp Business</Label><input style={inp()} value={company.whatsapp||''} onChange={e => setCompany(c => ({ ...c, whatsapp:e.target.value }))} placeholder="+60123456789"/></div>
                <div><Label>Website</Label><input style={inp()} value={company.website||''} onChange={e => setCompany(c => ({ ...c, website:e.target.value }))} placeholder="https://thisismycard.io"/></div>
              </Grid2>
              <div style={{ marginTop:12 }}><Label>Alamat</Label><textarea style={{ ...inp(), resize:'vertical', height:60 }} value={company.address||''} onChange={e => setCompany(c => ({ ...c, address:e.target.value }))}/></div>
              <div style={{ marginTop:12 }}><Label>Waktu Operasi</Label><input style={inp()} value={company.business_hours||''} onChange={e => setCompany(c => ({ ...c, business_hours:e.target.value }))} placeholder="Isnin–Jumaat 9pagi–6petang"/></div>
            </Section>

            <Section title="Social Media">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['Instagram','instagram','https://instagram.com/'],['Facebook','facebook','https://facebook.com/'],['LinkedIn','linkedin','https://linkedin.com/'],['TikTok','tiktok','https://tiktok.com/@'],['YouTube','youtube','https://youtube.com/'],['Twitter/X','twitter','https://x.com/'],['Shopee','shopee','https://shopee.com.my/'],['Lazada','lazada','https://lazada.com.my/']].map(([l, k, ph]) => (
                  <div key={k}><Label>{l}</Label><input style={inp()} value={(company as Record<string,unknown>)[k] as string||''} onChange={e => setCompany(c => ({ ...c, [k]:e.target.value }))} placeholder={ph}/></div>
                ))}
              </div>
            </Section>

            <button onClick={() => saveAll(saveCompanyProfile, company as CompanyProfile, 'Profil syarikat disimpan')} style={{ ...btn(), padding:'13px 28px', boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
              {savedOk ? '✓ Saved!' : '💾 Simpan Profil'}
            </button>
          </div>
        )}

        {/* ══ PAYMENTS ══════════════════════════════════════════ */}
        {tab==='payments' && (
          <div style={{ maxWidth:720 }}>
            <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>Payment Gateway</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>Konfigurasi kaedah pembayaran untuk customer.</p></div>

            {/* Billplz */}
            <Section title="💳 Billplz (Malaysia)">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div><p style={{ fontSize:13,fontWeight:600,color:'#0F0F0F',margin:'0 0 2px' }}>Aktifkan Billplz</p><p style={{ fontSize:12,color:'#6b7280',margin:0 }}>Platform pembayaran popular di Malaysia — FPX, kad kredit</p></div>
                <Toggle on={payments.billplz_enabled??false} onChange={v => setPayments(p => ({ ...p, billplz_enabled:v }))}/>
              </div>
              {payments.billplz_enabled && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div><Label>API Key</Label><input type="password" style={inp()} value={payments.billplz_api_key||''} onChange={e => setPayments(p => ({ ...p, billplz_api_key:e.target.value }))} placeholder="billplz_api_key_here"/></div>
                  <div><Label>Collection ID</Label><input style={inp()} value={payments.billplz_collection_id||''} onChange={e => setPayments(p => ({ ...p, billplz_collection_id:e.target.value }))} placeholder="abc123"/></div>
                  <div><Label>X-Signature Key</Label><input type="password" style={inp()} value={payments.billplz_x_signature||''} onChange={e => setPayments(p => ({ ...p, billplz_x_signature:e.target.value }))} placeholder="signature_key"/></div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:20 }}><Toggle on={payments.billplz_sandbox??true} onChange={v => setPayments(p => ({ ...p, billplz_sandbox:v }))}/><span style={{ fontSize:13,color:'#374151' }}>Sandbox Mode</span></div>
                </div>
              )}
              {!payments.billplz_enabled && <p style={{ fontSize:12,color:'#9ca3af',margin:0 }}>Daftar di <a href="https://billplz.com" target="_blank" rel="noreferrer" style={{ color:'#3b82f6' }}>billplz.com</a> untuk API key.</p>}
            </Section>

            {/* Stripe */}
            <Section title="💳 Stripe (Antarabangsa)">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div><p style={{ fontSize:13,fontWeight:600,color:'#0F0F0F',margin:'0 0 2px' }}>Aktifkan Stripe</p><p style={{ fontSize:12,color:'#6b7280',margin:0 }}>Terima kad kredit/debit antarabangsa</p></div>
                <Toggle on={payments.stripe_enabled??false} onChange={v => setPayments(p => ({ ...p, stripe_enabled:v }))}/>
              </div>
              {payments.stripe_enabled && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div><Label>Publishable Key</Label><input style={inp()} value={payments.stripe_publishable_key||''} onChange={e => setPayments(p => ({ ...p, stripe_publishable_key:e.target.value }))} placeholder="pk_test_…"/></div>
                  <div><Label>Secret Key</Label><input type="password" style={inp()} value={payments.stripe_secret_key||''} onChange={e => setPayments(p => ({ ...p, stripe_secret_key:e.target.value }))} placeholder="sk_test_…"/></div>
                  <div><Label>Webhook Secret</Label><input type="password" style={inp()} value={payments.stripe_webhook_secret||''} onChange={e => setPayments(p => ({ ...p, stripe_webhook_secret:e.target.value }))} placeholder="whsec_…"/></div>
                  <div style={{ display:'flex',alignItems:'center',gap:10,paddingTop:20 }}><Toggle on={payments.stripe_sandbox??true} onChange={v => setPayments(p => ({ ...p, stripe_sandbox:v }))}/><span style={{ fontSize:13,color:'#374151' }}>Test Mode</span></div>
                </div>
              )}
            </Section>

            {/* Bank Transfer */}
            <Section title="🏦 Bank Transfer Manual">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div><p style={{ fontSize:13,fontWeight:600,color:'#0F0F0F',margin:'0 0 2px' }}>Aktifkan Bank Transfer</p><p style={{ fontSize:12,color:'#6b7280',margin:0 }}>Maybank, CIMB, RHB dan lain-lain</p></div>
                <Toggle on={payments.bank_transfer_enabled??true} onChange={v => setPayments(p => ({ ...p, bank_transfer_enabled:v }))}/>
              </div>
              {payments.bank_transfer_enabled && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div><Label>Nama Bank</Label><input style={inp()} value={payments.bank_name||''} onChange={e => setPayments(p => ({ ...p, bank_name:e.target.value }))} placeholder="Maybank"/></div>
                  <div><Label>Nama Akaun</Label><input style={inp()} value={payments.bank_account_name||''} onChange={e => setPayments(p => ({ ...p, bank_account_name:e.target.value }))} placeholder="ThisIsMyCard Sdn Bhd"/></div>
                  <div><Label>Nombor Akaun</Label><input style={inp()} value={payments.bank_account_number||''} onChange={e => setPayments(p => ({ ...p, bank_account_number:e.target.value }))} placeholder="1234567890"/></div>
                  <div><Label>SWIFT/BIC Code</Label><input style={inp()} value={payments.bank_swift_code||''} onChange={e => setPayments(p => ({ ...p, bank_swift_code:e.target.value }))} placeholder="MBBEMYKL"/></div>
                  <div style={{ gridColumn:'1/-1' }}><Label>Arahan Pembayaran</Label><textarea style={{ ...inp(), resize:'vertical', height:64 }} value={payments.bank_instructions||''} onChange={e => setPayments(p => ({ ...p, bank_instructions:e.target.value }))}/></div>
                </div>
              )}
            </Section>

            <button onClick={() => saveAll(savePaymentSettings, payments as PaymentSettings, 'Payment settings disimpan')} style={{ ...btn(), padding:'13px 28px', boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
              {savedOk ? '✓ Saved!' : '💾 Simpan Payment Settings'}
            </button>
          </div>
        )}

        {/* ══ EMAIL ══════════════════════════════════════════ */}
        {tab==='email' && (
          <div style={{ maxWidth:720 }}>
            <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>Email</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>Hantar email kepada customer dan uji konfigurasi.</p></div>

            <Section title="Hantar Email ke Customer">
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div><Label>Pilih Order</Label>
                  <select value={emailOId} onChange={e => setEmailOId(e.target.value)} style={inp()}>
                    <option value="">Pilih order…</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.full_name} — {o.order_number} ({o.email})</option>)}
                  </select>
                </div>
                <div><Label>Subjek</Label><input style={inp()} value={emailSubj} onChange={e => setEmailSubj(e.target.value)} placeholder="Kad NFC anda telah siap!"/></div>
                <div><Label>Mesej</Label><textarea style={{ ...inp(), resize:'vertical', height:120 }} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Tulis mesej di sini…"/></div>
                {emailMsg && <div style={{ padding:'10px 14px', borderRadius:9, background:emailMsg.includes('✅')?'#f0fdf4':'#fef2f2', color:emailMsg.includes('✅')?'#15803d':'#dc2626', fontSize:13 }}>{emailMsg}</div>}
                <button onClick={async () => { if(!emailOId||!emailSubj||!emailBody) return; setEmailBusy(true); const r = await sendManualEmail(emailOId, emailSubj, emailBody); setEmailMsg(r.success?'✅ Email berjaya dihantar!':'❌ '+r.error); setEmailBusy(false); if(r.success){ setEmailSubj(''); setEmailBody(''); }}} disabled={emailBusy||!emailOId||!emailSubj||!emailBody} style={{ ...btn(), padding:'11px', opacity:emailBusy?.7:1 }}>
                  {emailBusy ? 'Menghantar…' : '✉ Hantar Email'}
                </button>
              </div>
            </Section>

            <Section title="Auto Email">
              {[
                { label:'Pengesahan Order',       desc:'Dihantar bila customer submit form',   key:'auto_send_confirmation' as keyof AdminSettings },
                { label:'Update Status',          desc:'Dihantar bila status order berubah',   key:'auto_send_status_updates' as keyof AdminSettings },
                { label:'Notifikasi Admin',       desc:'Email admin bila order baru masuk',    key:'notify_on_new_order' as keyof AdminSettings },
              ].map(item => (
                <div key={item.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',background:'#f8f8f7',borderRadius:10,marginBottom:8 }}>
                  <div><p style={{ fontSize:13,fontWeight:600,color:'#0F0F0F',margin:'0 0 2px' }}>{item.label}</p><p style={{ fontSize:12,color:'#6b7280',margin:0 }}>{item.desc}</p></div>
                  <Toggle on={!!settings[item.key]} onChange={v => setSettings(s => ({ ...s, [item.key]:v }))}/>
                </div>
              ))}
              <button onClick={() => saveAll(saveAdminSettings, settings as AdminSettings, 'Settings disimpan')} style={{ ...btn(), marginTop:12 }}>{savedOk?'✓ Saved!':'Simpan'}</button>
            </Section>

            <Section title="Test Email">
              <div style={{ display:'flex', gap:10 }}>
                <input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="Hantar test ke email…" style={{ ...inp(), flex:1 }}/>
                <button onClick={async () => { const r = await sendTestEmail(testTo); toast$(r.success?'✅ Test email berjaya!':'❌ '+r.error); }} style={{ ...btn(), padding:'9px 18px', whiteSpace:'nowrap' }}>Hantar Test</button>
              </div>
            </Section>
          </div>
        )}

        {/* ══ PAGES ══════════════════════════════════════════ */}
        {tab==='pages' && (
          <div style={{ position:'fixed', top:0, left:220, right:0, bottom:0, display:'flex', flexDirection:'column', background:'#f0f0ef', zIndex:10 }}>

            {/* ── Top Bar ── */}
            <div style={{ height:52, background:'#fff', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button onClick={()=>setTab('dashboard')} style={{ fontSize:12,color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4 }}>← Back</button>
                <span style={{ width:1,height:18,background:'#e5e7eb' }}/>
                <span style={{ fontSize:14,fontWeight:700,color:'#0F0F0F' }}>Pages Editor</span>
              </div>

              {/* Page tabs */}
              <div style={{ display:'flex', gap:4 }}>
                {([['landing','🏠','Landing'],['our-story','📖','Our Story'],['terms','📋','Terms']] as const).map(([pg,icon,label])=>(
                  <button key={pg} onClick={()=>{setActivePageTab(pg);setPbSection('hero');}} style={{
                    fontSize:12,fontWeight:activePageTab===pg?700:500,padding:'6px 14px',borderRadius:8,border:'1px solid',
                    cursor:'pointer',fontFamily:'inherit',transition:'all .12s',display:'flex',alignItems:'center',gap:5,
                    background:activePageTab===pg?'#0F0F0F':'#fff',
                    color:activePageTab===pg?'#fff':'#6b7280',
                    borderColor:activePageTab===pg?'#0F0F0F':'#e5e7eb',
                  }}>{icon} {label}</button>
                ))}
              </div>

              {/* Device + Undo/Redo + Actions */}
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {/* Undo/Redo */}
                <button onClick={pbUndo} disabled={!pbHistory[activePageTab]?.length} title="Undo (Ctrl+Z)" style={{ width:32,height:32,borderRadius:7,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',opacity:pbHistory[activePageTab]?.length?1:.4 }}>↩</button>
                <button onClick={pbRedo} disabled={!pbFuture[activePageTab]?.length} title="Redo" style={{ width:32,height:32,borderRadius:7,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',opacity:pbFuture[activePageTab]?.length?1:.4 }}>↪</button>
                <span style={{ width:1,height:18,background:'#e5e7eb' }}/>
                {/* Device */}
                <div style={{ display:'flex',background:'#f3f4f6',borderRadius:8,padding:2 }}>
                  {([['desktop','🖥'],['mobile','📱']] as const).map(([d,ic])=>(
                    <button key={d} onClick={()=>setPbDevice(d)} style={{ padding:'5px 10px',borderRadius:6,border:'none',cursor:'pointer',background:pbDevice===d?'#fff':'transparent',fontSize:13,boxShadow:pbDevice===d?'0 1px 3px rgba(0,0,0,.1)':'none',transition:'all .15s' }}>{ic}</button>
                  ))}
                </div>
                <button onClick={()=>window.open(activePageTab==='landing'?'/':'/'+activePageTab,'_blank')} style={{ fontSize:12,color:'#6b7280',background:'#f3f4f6',border:'1px solid #e5e7eb',cursor:'pointer',padding:'6px 14px',borderRadius:8,fontFamily:'inherit' }}>👁 Preview</button>
                <button onClick={()=>setPbPublishModal(true)} style={{ fontSize:12,fontWeight:700,color:'#fff',background:'#0F0F0F',border:'none',cursor:'pointer',padding:'7px 18px',borderRadius:8,fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,0,0,.15)' }}>
                  {pbSaving?'Saving…':savedOk?'✓ Published':'🚀 Publish'}
                </button>
              </div>
            </div>

            {/* ── Publish Modal ── */}
            {pbPublishModal && (
              <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <div style={{ background:'#fff',borderRadius:16,padding:'32px',maxWidth:400,width:'90%',textAlign:'center' }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🚀</div>
                  <h3 style={{ fontSize:18,fontWeight:700,color:'#0F0F0F',margin:'0 0 8px' }}>Publish Changes?</h3>
                  <p style={{ fontSize:14,color:'#6b7280',margin:'0 0 24px',lineHeight:1.6 }}>Perubahan akan disimpan dan terus live di website. Confirm?</p>
                  <div style={{ display:'flex',gap:10 }}>
                    <button onClick={()=>setPbPublishModal(false)} style={{ flex:1,...btn('#f3f4f6','#374151'),border:'1px solid #e5e7eb' }}>Cancel</button>
                    <button onClick={pbSave} style={{ flex:1,...btn() }}>Yes, Publish!</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Main 3-Panel Layout ── */}
            <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

              {/* ── LEFT: Section List ── */}
              <div style={{ width:260, background:'#fff', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'12px 14px 8px', borderBottom:'1px solid #f3f4f6' }}>
                  <p style={{ fontSize:10,fontWeight:700,color:'#9ca3af',letterSpacing:'0.1em',textTransform:'uppercase' as const,margin:0 }}>Sections</p>
                </div>
                <div style={{ flex:1,overflowY:'auto',padding:'8px' }}>

                  {/* ── Landing Sections ── */}
                  {activePageTab==='landing' && (['hero','stats','cta'] as const).map((id,i) => {
                    const meta: Record<string,{icon:string;label:string;desc:string}> = {
                      hero:  { icon:'🌟', label:'Hero', desc:'Title · Subtitle · CTA' },
                      stats: { icon:'📊', label:'Stats', desc:'Numbers · Labels' },
                      cta:   { icon:'🎯', label:'CTA Banner', desc:'Bottom banner' },
                    };
                    const m = meta[id];
                    return (
                      <button key={id} onClick={()=>setPbSection(id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${pbSection===id?'#0F0F0F':'transparent'}`,background:pbSection===id?'#0F0F0F':'transparent',cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,transition:'all .12s',width:'100%',marginBottom:3 }}
                        onMouseOver={e=>{if(pbSection!==id)(e.currentTarget as HTMLElement).style.background='#f8f8f7';}}
                        onMouseOut={e=>{if(pbSection!==id)(e.currentTarget as HTMLElement).style.background='transparent';}}>
                        <span style={{ fontSize:18,flexShrink:0 }}>{m.icon}</span>
                        <div><p style={{ fontSize:12,fontWeight:600,color:pbSection===id?'#fff':'#0F0F0F',margin:'0 0 1px' }}>{m.label}</p><p style={{ fontSize:10,color:pbSection===id?'rgba(255,255,255,.5)':'#9ca3af',margin:0 }}>{m.desc}</p></div>
                      </button>
                    );
                  })}

                  {/* ── Our Story Sections ── */}
                  {activePageTab==='our-story' && (['hero','timeline','mission','values','cta'] as const).map(id => {
                    const meta: Record<string,{icon:string;label:string;desc:string}> = {
                      hero:     { icon:'🌟', label:'Hero', desc:'Eyebrow · Title · Subtitle' },
                      timeline: { icon:'📅', label:'Timeline', desc:'Year · Story sections' },
                      mission:  { icon:'🎯', label:'Mission & Vision', desc:'Two statement cards' },
                      values:   { icon:'💎', label:'Values', desc:'Icon · Title · Desc' },
                      cta:      { icon:'🔗', label:'CTA Section', desc:'Bottom call-to-action' },
                    };
                    const m = meta[id];
                    return (
                      <button key={id} onClick={()=>setPbSection(id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${pbSection===id?'#0F0F0F':'transparent'}`,background:pbSection===id?'#0F0F0F':'transparent',cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,transition:'all .12s',width:'100%',marginBottom:3 }}
                        onMouseOver={e=>{if(pbSection!==id)(e.currentTarget as HTMLElement).style.background='#f8f8f7';}}
                        onMouseOut={e=>{if(pbSection!==id)(e.currentTarget as HTMLElement).style.background='transparent';}}>
                        <span style={{ fontSize:18,flexShrink:0 }}>{m.icon}</span>
                        <div><p style={{ fontSize:12,fontWeight:600,color:pbSection===id?'#fff':'#0F0F0F',margin:'0 0 1px' }}>{m.label}</p><p style={{ fontSize:10,color:pbSection===id?'rgba(255,255,255,.5)':'#9ca3af',margin:0 }}>{m.desc}</p></div>
                      </button>
                    );
                  })}

                  {/* ── Terms Sections ── */}
                  {activePageTab==='terms' && (['header','sections'] as const).map(id => {
                    const meta: Record<string,{icon:string;label:string;desc:string}> = {
                      header:   { icon:'📋', label:'Header', desc:'Title · Intro text' },
                      sections: { icon:'📝', label:'T&C Sections', desc:'All numbered sections' },
                    };
                    const m = meta[id];
                    return (
                      <button key={id} onClick={()=>setPbSection(id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${pbSection===id?'#0F0F0F':'transparent'}`,background:pbSection===id?'#0F0F0F':'transparent',cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,transition:'all .12s',width:'100%',marginBottom:3 }}
                        onMouseOver={e=>{if(pbSection!==id)(e.currentTarget as HTMLElement).style.background='#f8f8f7';}}
                        onMouseOut={e=>{if(pbSection!==id)(e.currentTarget as HTMLElement).style.background='transparent';}}>
                        <span style={{ fontSize:18,flexShrink:0 }}>{m.icon}</span>
                        <div><p style={{ fontSize:12,fontWeight:600,color:pbSection===id?'#fff':'#0F0F0F',margin:'0 0 1px' }}>{m.label}</p><p style={{ fontSize:10,color:pbSection===id?'rgba(255,255,255,.5)':'#9ca3af',margin:0 }}>{m.desc}</p></div>
                      </button>
                    );
                  })}
                </div>

                {/* Add Element Panel (Hostinger-style) */}
                <div style={{ borderTop:'1px solid #f3f4f6', padding:'10px 10px 8px' }}>
                  <p style={{ fontSize:10,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase' as const,margin:'0 0 8px' }}>Add Element</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                    {[
                      { icon:'T', label:'Text',    action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'text', content:'Your text here', size:'16px', align:'left', bold:false }]})); setPbSection('_elements'); toast$('Text element added'); }},
                      { icon:'⬜', label:'Button', action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'button', label:'Click me', link:'/', style:'filled' }]})); setPbSection('_elements'); toast$('Button added'); }},
                      { icon:'🖼', label:'Image',  action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'image', url:'', alt:'', width:'100%' }]})); setPbSection('_elements'); toast$('Image block added'); }},
                      { icon:'▶', label:'Video',  action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'video', url:'', title:'' }]})); setPbSection('_elements'); toast$('Video block added'); }},
                      { icon:'—', label:'Divider', action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'divider', color:'#e5e7eb', thickness:1 }]})); toast$('Divider added'); }},
                      { icon:'↕', label:'Spacer',  action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'spacer', height:40 }]})); toast$('Spacer added'); }},
                      { icon:'@', label:'Form',    action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'form', title:'Contact Us', fields:['name','email','message'], buttonText:'Send' }]})); setPbSection('_elements'); toast$('Contact form added'); }},
                      { icon:'📧', label:'Subscribe', action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'subscribe', title:'Stay Updated', placeholder:'Enter your email', buttonText:'Subscribe' }]})); setPbSection('_elements'); toast$('Subscribe block added'); }},
                      { icon:'</>', label:'Embed', action:()=>{ pbSetContent(activePageTab, c=>({...c, _custom_blocks:[...((c._custom_blocks as unknown[])||[]), { id:Date.now(), type:'embed', html:'<!-- paste your embed code here -->' }]})); setPbSection('_elements'); toast$('Embed block added'); }},
                    ].map(el=>(
                      <button key={el.label} onClick={el.action} style={{ display:'flex',flexDirection:'column' as const,alignItems:'center',padding:'8px 4px',borderRadius:8,border:'1px solid #f3f4f6',background:'#fafaf9',cursor:'pointer',fontFamily:'inherit',transition:'all .12s',gap:3 }}
                        onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background='#f0f0ef';(e.currentTarget as HTMLElement).style.borderColor='#d1d5db';}}
                        onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background='#fafaf9';(e.currentTarget as HTMLElement).style.borderColor='#f3f4f6';}}>
                        <span style={{ fontSize:15 }}>{el.icon}</span>
                        <span style={{ fontSize:9,fontWeight:600,color:'#6b7280' }}>{el.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding:'8px 14px 10px', borderTop:'1px solid #f3f4f6' }}>
                  <a href={activePageTab==='landing'?'https://thisismycard.vercel.app':'https://thisismycard.vercel.app/'+activePageTab} target="_blank" style={{ fontSize:11,color:'#9ca3af',textDecoration:'none',display:'flex',alignItems:'center',gap:4 }}>
                    🔗 View live page
                  </a>
                </div>
              </div>

              {/* ── CENTER: Field Editor ── */}
              <div style={{ width:380,borderRight:'1px solid #e5e7eb',background:'#fafaf9',display:'flex',flexDirection:'column',overflow:'hidden' }}>
                <div style={{ padding:'14px 16px',borderBottom:'1px solid #f3f4f6',background:'#fff',flexShrink:0 }}>
                  <p style={{ fontSize:10,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase' as const,margin:'0 0 1px' }}>Editing</p>
                  <p style={{ fontSize:13,fontWeight:700,color:'#0F0F0F',margin:0 }}>
                    {{hero:'🌟 Hero',stats:'📊 Stats',cta:'🎯 CTA Banner',timeline:'📅 Timeline',mission:'🎯 Mission & Vision',values:'💎 Values',header:'📋 Header',sections:'📝 T&C Sections',_elements:'🧩 Custom Elements'}[pbSection]||'Select a section'}
                  </p>
                </div>

                <div style={{ flex:1,overflowY:'auto',padding:'16px' }}>

                  {/* ── LANDING ── */}
                  {activePageTab==='landing'&&pbSection==='hero'&&(
                    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                      <div><Label>Badge Text</Label><input style={inp()} value={(landingContent.hero_badge as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,hero_badge:e.target.value}))} placeholder="NFC Digital Business Card"/></div>
                      <div><Label>Hero Title</Label><textarea style={{...inp(),resize:'vertical' as const,height:64}} value={(landingContent.hero_title as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,hero_title:e.target.value}))}/></div>
                      <div><Label>Hero Subtitle</Label><textarea style={{...inp(),resize:'vertical' as const,height:80}} value={(landingContent.hero_subtitle as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,hero_subtitle:e.target.value}))}/></div>
                      <Grid2>
                        <div><Label>CTA Primary</Label><input style={inp()} value={(landingContent.cta_primary as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,cta_primary:e.target.value}))}/></div>
                        <div><Label>CTA Secondary</Label><input style={inp()} value={(landingContent.cta_secondary as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,cta_secondary:e.target.value}))}/></div>
                      </Grid2>
                    </div>
                  )}

                  {activePageTab==='landing'&&pbSection==='stats'&&(
                    <div>
                      {((landingContent.stats as Array<{value:string;label:string}>)||[]).map((s,i)=>(
                        <div key={i} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:10,padding:'12px',marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>Stat {i+1}</span>
                            <button onClick={()=>{const a=((landingContent.stats as Array<{value:string;label:string}>)||[]).filter((_,j)=>j!==i);pbSetContent('landing',c=>({...c,stats:a}));}} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕</button>
                          </div>
                          <Grid2>
                            <div><Label>Nilai</Label><input style={inp()} value={s.value} onChange={e=>{const a=[...((landingContent.stats as Array<{value:string;label:string}>)||[])];a[i]={...a[i],value:e.target.value};pbSetContent('landing',c=>({...c,stats:a}));}}/></div>
                            <div><Label>Label</Label><input style={inp()} value={s.label} onChange={e=>{const a=[...((landingContent.stats as Array<{value:string;label:string}>)||[])];a[i]={...a[i],label:e.target.value};pbSetContent('landing',c=>({...c,stats:a}));}}/></div>
                          </Grid2>
                        </div>
                      ))}
                      <button onClick={()=>pbSetContent('landing',c=>({...c,stats:[...((c.stats as Array<{value:string;label:string}>)||[]),{value:'',label:''}]}))} style={{...btn('#f3f4f6','#374151'),padding:'9px',border:'1px solid #e5e7eb',fontSize:12,width:'100%'}}>+ Tambah Stat</button>
                    </div>
                  )}

                  {activePageTab==='landing'&&pbSection==='cta'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      <div><Label>Banner Title</Label><input style={inp()} value={(landingContent.cta_banner_title as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,cta_banner_title:e.target.value}))}/></div>
                      <div><Label>Banner Description</Label><textarea style={{...inp(),resize:'vertical' as const,height:72}} value={(landingContent.cta_banner_desc as string)||''} onChange={e=>pbSetContent('landing',c=>({...c,cta_banner_desc:e.target.value}))}/></div>
                    </div>
                  )}

                  {/* ── OUR STORY ── */}
                  {activePageTab==='our-story'&&pbSection==='hero'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      <div><Label>Eyebrow</Label><input style={inp()} value={(storyContent.hero_eyebrow as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,hero_eyebrow:e.target.value}))}/></div>
                      <div><Label>Title</Label><textarea style={{...inp(),resize:'vertical' as const,height:64}} value={(storyContent.hero_title as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,hero_title:e.target.value}))}/></div>
                      <div><Label>Subtitle</Label><textarea style={{...inp(),resize:'vertical' as const,height:80}} value={(storyContent.hero_subtitle as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,hero_subtitle:e.target.value}))}/></div>
                    </div>
                  )}

                  {activePageTab==='our-story'&&pbSection==='timeline'&&(
                    <div>
                      {((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[]).map((s,i)=>(
                        <div key={i} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:10,padding:'12px',marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>Section {i+1}</span>
                            <div style={{display:'flex',gap:4}}>
                              <button onClick={()=>{if(i>0){const a=[...((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[])];[a[i-1],a[i]]=[a[i],a[i-1]];pbSetContent('our-story',c=>({...c,story_sections:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↑</button>
                              <button onClick={()=>{if(i<((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[]).length-1){const a=[...((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[])];[a[i],a[i+1]]=[a[i+1],a[i]];pbSetContent('our-story',c=>({...c,story_sections:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↓</button>
                              <button onClick={()=>{const a=((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[]).filter((_,j)=>j!==i);pbSetContent('our-story',c=>({...c,story_sections:a}));}} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕</button>
                            </div>
                          </div>
                          <Grid2>
                            <div><Label>Tahun</Label><input style={inp()} value={s.year} onChange={e=>{const a=[...((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[])];a[i]={...a[i],year:e.target.value};pbSetContent('our-story',c=>({...c,story_sections:a}));}}/></div>
                            <div><Label>Tajuk</Label><input style={inp()} value={s.title} onChange={e=>{const a=[...((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[])];a[i]={...a[i],title:e.target.value};pbSetContent('our-story',c=>({...c,story_sections:a}));}}/></div>
                          </Grid2>
                          <div style={{marginTop:8}}><Label>Isi</Label><textarea style={{...inp(),resize:'vertical' as const,height:64}} value={s.body} onChange={e=>{const a=[...((storyContent.story_sections as Array<{year:string;title:string;body:string}>)||[])];a[i]={...a[i],body:e.target.value};pbSetContent('our-story',c=>({...c,story_sections:a}));}}/></div>
                        </div>
                      ))}
                      <button onClick={()=>pbSetContent('our-story',c=>({...c,story_sections:[...((c.story_sections as Array<{year:string;title:string;body:string}>)||[]),{year:'',title:'',body:''}]}))} style={{...btn('#f3f4f6','#374151'),padding:'9px',border:'1px solid #e5e7eb',fontSize:12,width:'100%'}}>+ Tambah Section</button>
                    </div>
                  )}

                  {activePageTab==='our-story'&&pbSection==='mission'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      <div style={{padding:'12px',background:'#fffbeb',borderRadius:10,border:'1px solid #fde68a'}}>
                        <p style={{fontSize:11,fontWeight:700,color:'#92400e',margin:'0 0 10px'}}>🎯 Mission</p>
                        <div><Label>Title</Label><input style={inp()} value={(storyContent.mission_title as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,mission_title:e.target.value}))}/></div>
                        <div style={{marginTop:8}}><Label>Body</Label><textarea style={{...inp(),resize:'vertical' as const,height:72}} value={(storyContent.mission_body as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,mission_body:e.target.value}))}/></div>
                      </div>
                      <div style={{padding:'12px',background:'#ecfeff',borderRadius:10,border:'1px solid #a5f3fc'}}>
                        <p style={{fontSize:11,fontWeight:700,color:'#155e75',margin:'0 0 10px'}}>🔭 Vision</p>
                        <div><Label>Title</Label><input style={inp()} value={(storyContent.vision_title as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,vision_title:e.target.value}))}/></div>
                        <div style={{marginTop:8}}><Label>Body</Label><textarea style={{...inp(),resize:'vertical' as const,height:72}} value={(storyContent.vision_body as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,vision_body:e.target.value}))}/></div>
                      </div>
                    </div>
                  )}

                  {activePageTab==='our-story'&&pbSection==='values'&&(
                    <div>
                      {((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[]).map((v,i)=>(
                        <div key={i} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:10,padding:'12px',marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>Value {i+1}</span>
                            <div style={{display:'flex',gap:4}}>
                              <button onClick={()=>{if(i>0){const a=[...((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[])];[a[i-1],a[i]]=[a[i],a[i-1]];pbSetContent('our-story',c=>({...c,values:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↑</button>
                              <button onClick={()=>{if(i<((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[]).length-1){const a=[...((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[])];[a[i],a[i+1]]=[a[i+1],a[i]];pbSetContent('our-story',c=>({...c,values:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↓</button>
                              <button onClick={()=>{const a=((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[]).filter((_,j)=>j!==i);pbSetContent('our-story',c=>({...c,values:a}));}} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕</button>
                            </div>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'56px 1fr',gap:8}}>
                            <div><Label>Icon</Label><input style={{...inp(),textAlign:'center' as const,fontSize:18}} value={v.icon} onChange={e=>{const a=[...((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[])];a[i]={...a[i],icon:e.target.value};pbSetContent('our-story',c=>({...c,values:a}));}}/></div>
                            <div><Label>Title</Label><input style={inp()} value={v.title} onChange={e=>{const a=[...((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[])];a[i]={...a[i],title:e.target.value};pbSetContent('our-story',c=>({...c,values:a}));}}/></div>
                          </div>
                          <div style={{marginTop:8}}><Label>Description</Label><input style={inp()} value={v.desc} onChange={e=>{const a=[...((storyContent.values as Array<{icon:string;title:string;desc:string}>)||[])];a[i]={...a[i],desc:e.target.value};pbSetContent('our-story',c=>({...c,values:a}));}}/></div>
                        </div>
                      ))}
                      <button onClick={()=>pbSetContent('our-story',c=>({...c,values:[...((c.values as Array<{icon:string;title:string;desc:string}>)||[]),{icon:'✦',title:'',desc:''}]}))} style={{...btn('#f3f4f6','#374151'),padding:'9px',border:'1px solid #e5e7eb',fontSize:12,width:'100%'}}>+ Tambah Value</button>
                    </div>
                  )}

                  {activePageTab==='our-story'&&pbSection==='cta'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      <div><Label>Title</Label><input style={inp()} value={(storyContent.cta_title as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,cta_title:e.target.value}))}/></div>
                      <div><Label>Subtitle</Label><input style={inp()} value={(storyContent.cta_subtitle as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,cta_subtitle:e.target.value}))}/></div>
                      <div><Label>Button Text</Label><input style={inp()} value={(storyContent.cta_button as string)||''} onChange={e=>pbSetContent('our-story',c=>({...c,cta_button:e.target.value}))}/></div>
                    </div>
                  )}

                  {/* ── TERMS ── */}
                  {activePageTab==='terms'&&pbSection==='header'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      <div><Label>Last Updated</Label><input style={inp()} value={(termsContent.last_updated as string)||''} placeholder="January 2024" onChange={e=>pbSetContent('terms',c=>({...c,last_updated:e.target.value}))}/></div>
                      <div><Label>Intro Paragraph</Label><textarea style={{...inp(),resize:'vertical' as const,height:96}} value={(termsContent.intro as string)||''} onChange={e=>pbSetContent('terms',c=>({...c,intro:e.target.value}))}/></div>
                    </div>
                  )}

                  {activePageTab==='terms'&&pbSection==='sections'&&(
                    <div>
                      {((termsContent.sections as Array<{title:string;body:string}>)||[]).map((s,i)=>(
                        <div key={i} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:10,padding:'12px',marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>Section {i+1}</span>
                            <div style={{display:'flex',gap:4}}>
                              <button onClick={()=>{if(i>0){const a=[...((termsContent.sections as Array<{title:string;body:string}>)||[])];[a[i-1],a[i]]=[a[i],a[i-1]];pbSetContent('terms',c=>({...c,sections:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↑</button>
                              <button onClick={()=>{if(i<((termsContent.sections as Array<{title:string;body:string}>)||[]).length-1){const a=[...((termsContent.sections as Array<{title:string;body:string}>)||[])];[a[i],a[i+1]]=[a[i+1],a[i]];pbSetContent('terms',c=>({...c,sections:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↓</button>
                              <button onClick={()=>{const a=((termsContent.sections as Array<{title:string;body:string}>)||[]).filter((_,j)=>j!==i);pbSetContent('terms',c=>({...c,sections:a}));}} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕</button>
                            </div>
                          </div>
                          <div><Label>Heading</Label><input style={inp()} value={s.title} placeholder="1. Services" onChange={e=>{const a=[...((termsContent.sections as Array<{title:string;body:string}>)||[])];a[i]={...a[i],title:e.target.value};pbSetContent('terms',c=>({...c,sections:a}));}}/></div>
                          <div style={{marginTop:8}}><Label>Body</Label><textarea style={{...inp(),resize:'vertical' as const,height:80}} value={s.body} onChange={e=>{const a=[...((termsContent.sections as Array<{title:string;body:string}>)||[])];a[i]={...a[i],body:e.target.value};pbSetContent('terms',c=>({...c,sections:a}));}}/></div>
                        </div>
                      ))}
                      <button onClick={()=>pbSetContent('terms',c=>({...c,sections:[...((c.sections as Array<{title:string;body:string}>)||[]),{title:'',body:''}]}))} style={{...btn('#f3f4f6','#374151'),padding:'9px',border:'1px solid #e5e7eb',fontSize:12,width:'100%'}}>+ Tambah Section</button>
                    </div>
                  )}

                  {/* ── CUSTOM ELEMENTS ── */}
                  {pbSection==='_elements'&&(
                    <div>
                      <p style={{fontSize:12,color:'#6b7280',marginBottom:12}}>Custom elements untuk page ini:</p>
                      {(((activePageTab==='landing'?landingContent:activePageTab==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>)||[]).map((bl,i)=>(
                        <div key={i} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:10,padding:'12px',marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'flex',alignItems:'center',gap:5}}>
                              {bl.type==='text'?'T ':bl.type==='button'?'⬜ ':bl.type==='image'?'🖼 ':bl.type==='video'?'▶ ':bl.type==='divider'?'— ':bl.type==='spacer'?'↕ ':bl.type==='form'?'@ ':bl.type==='subscribe'?'📧 ':bl.type==='embed'?'</> ':''}{String(bl.type).charAt(0).toUpperCase()+String(bl.type).slice(1)}
                            </span>
                            <div style={{display:'flex',gap:4}}>
                              <button onClick={()=>{if(i>0){const page=activePageTab;const cur=(page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>;const a=[...cur];[a[i-1],a[i]]=[a[i],a[i-1]];pbSetContent(page,c=>({...c,_custom_blocks:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↑</button>
                              <button onClick={()=>{if(i<(((activePageTab==='landing'?landingContent:activePageTab==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>)||[]).length-1){const page=activePageTab;const cur=(page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>;const a=[...cur];[a[i],a[i+1]]=[a[i+1],a[i]];pbSetContent(page,c=>({...c,_custom_blocks:a}));}}} style={{fontSize:11,background:'#f3f4f6',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontFamily:'inherit'}}>↓</button>
                              <button onClick={()=>{const page=activePageTab;const cur=(page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>;pbSetContent(page,c=>({...c,_custom_blocks:cur.filter((_,j)=>j!==i)}));}} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>🗑</button>
                            </div>
                          </div>
                          {bl.type==='text'&&<div><Label>Content</Label><textarea style={{...inp(),resize:'vertical' as const,height:56}} value={String(bl.content||'')} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],content:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div>}
                          {bl.type==='button'&&<Grid2><div><Label>Label</Label><input style={inp()} value={String(bl.label||'')} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],label:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div><div><Label>Link</Label><input style={inp()} value={String(bl.link||'')} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],link:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div></Grid2>}
                          {bl.type==='image'&&<div><Label>Image URL</Label><input style={inp()} value={String(bl.url||'')} placeholder="https://..." onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],url:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div>}
                          {bl.type==='video'&&<div><Label>YouTube / Vimeo URL</Label><input style={inp()} value={String(bl.url||'')} placeholder="https://youtube.com/..." onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],url:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div>}
                          {bl.type==='spacer'&&<div><Label>Height (px)</Label><input type="number" style={inp()} value={Number(bl.height)||40} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],height:parseInt(e.target.value)||40};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div>}
                          {bl.type==='embed'&&<div><Label>HTML / Embed Code</Label><textarea style={{...inp(),resize:'vertical' as const,height:80,fontFamily:'monospace',fontSize:11}} value={String(bl.html||'')} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],html:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div>}
                          {bl.type==='subscribe'&&<Grid2><div><Label>Title</Label><input style={inp()} value={String(bl.title||'')} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],title:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div><div><Label>Button Text</Label><input style={inp()} value={String(bl.buttonText||'')} onChange={e=>{const page=activePageTab;const cur=[...((page==='landing'?landingContent:page==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>||[])];cur[i]={...cur[i],buttonText:e.target.value};pbSetContent(page,c=>({...c,_custom_blocks:cur}));}}/></div></Grid2>}
                        </div>
                      ))}
                      {(((activePageTab==='landing'?landingContent:activePageTab==='our-story'?storyContent:termsContent)._custom_blocks as Array<Record<string,unknown>>)||[]).length===0&&(
                        <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>
                          <p style={{marginBottom:4}}>No custom elements yet</p>
                          <p style={{fontSize:11}}>Use "Add Element" panel on the left to add elements</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!pbSection&&(
                    <div style={{textAlign:'center',padding:'48px 16px'}}>
                      <div style={{fontSize:40,marginBottom:12}}>👈</div>
                      <p style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:6}}>Pilih section untuk edit</p>
                      <p style={{fontSize:12,color:'#9ca3af'}}>Atau gunakan panel Add Element di bawah untuk tambah element baru.</p>
                    </div>
                  )}
                </div>

                {/* Save bar */}
                {pbSection&&(
                  <div style={{padding:'10px 16px',borderTop:'1px solid #f3f4f6',background:'#fff',display:'flex',gap:8,flexShrink:0}}>
                    <button onClick={pbUndo} disabled={!pbHistory[activePageTab]?.length} style={{...btn('#f3f4f6','#374151'),padding:'9px 12px',border:'1px solid #e5e7eb',opacity:pbHistory[activePageTab]?.length?1:.4}}>↩</button>
                    <button onClick={pbSave} style={{...btn(),flex:1,padding:'10px'}}>{pbSaving?'Saving…':savedOk?'✓ Saved!':'💾 Save'}</button>
                  </div>
                )}
              </div>

              {/* ── RIGHT: Live Preview ── */}
              <div style={{flex:1,background:'#e5e7eb',display:'flex',flexDirection:'column',alignItems:'center',padding:'20px',overflow:'auto'}}>
                <div style={{fontSize:10,color:'#9ca3af',marginBottom:10,letterSpacing:'0.06em',textTransform:'uppercase' as const}}>Live Preview</div>
                <div style={{background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.15)',width:pbDevice==='mobile'?390:'100%',maxWidth:pbDevice==='mobile'?390:1080,transition:'width 0.3s ease'}}>
                  <div style={{background:'#1a1a1a',padding:'8px 14px',display:'flex',alignItems:'center',gap:8}}>
                    <div style={{display:'flex',gap:5}}>
                      <div style={{width:9,height:9,borderRadius:'50%',background:'#ef4444'}}/>
                      <div style={{width:9,height:9,borderRadius:'50%',background:'#f59e0b'}}/>
                      <div style={{width:9,height:9,borderRadius:'50%',background:'#22c55e'}}/>
                    </div>
                    <div style={{flex:1,background:'rgba(255,255,255,.1)',borderRadius:5,padding:'3px 10px',fontSize:10,color:'rgba(255,255,255,.5)',textAlign:'center' as const}}>
                      thisismycard.vercel.app{activePageTab==='landing'?'':'/'+activePageTab}
                    </div>
                    <button onClick={()=>{ const iframe=document.querySelector('iframe[title="Page preview"]') as HTMLIFrameElement; if(iframe){iframe.src=iframe.src;} }} style={{fontSize:10,color:'rgba(255,255,255,.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>↻</button>
                  </div>
                  <iframe key={`${activePageTab}-${pbDevice}`} src={activePageTab==='landing'?'/':'/'+activePageTab} style={{width:'100%',height:pbDevice==='mobile'?700:580,border:'none',display:'block'}} title="Page preview"/>
                </div>
                <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Save → refresh preview ↻</p>
              </div>
            </div>
          </div>
        )}


                {/* ══ PLUGINS ══════════════════════════════════════════ */}
        {tab==='plugins' && (
          <div style={{ maxWidth:800 }}>
            <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>Plugins & Integrations</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>Sambungkan servis luar untuk perluas fungsi admin.</p></div>

            {[
              { key:'google_analytics', icon:'📊', name:'Google Analytics 4',       cat:'Analytics',   fields:[{ k:'measurement_id', label:'Measurement ID', ph:'G-XXXXXXXXXX' }] },
              { key:'facebook_pixel',   icon:'📘', name:'Facebook/Meta Pixel',      cat:'Marketing',   fields:[{ k:'pixel_id', label:'Pixel ID', ph:'123456789012345' }] },
              { key:'whatsapp_widget',  icon:'💬', name:'WhatsApp Chat Widget',     cat:'Support',     fields:[{ k:'phone', label:'Nombor WA', ph:'+60123456789' },{ k:'message', label:'Mesej Default', ph:'Hi, saya berminat…' }] },
              { key:'live_chat',        icon:'🗨',  name:'Live Chat (Tawk.to)',      cat:'Support',     fields:[{ k:'property_id', label:'Property ID', ph:'xxxxxxxx/default' }] },
              { key:'zapier',           icon:'⚡', name:'Zapier Automation',        cat:'Automation',  fields:[{ k:'webhook_url', label:'Webhook URL', ph:'https://hooks.zapier.com/…' }] },
            ].map(p => {
              const pl = plugins.find(x => x.plugin_key===p.key) || { plugin_key:p.key, enabled:false, config:{} };
              return (
                <div key={p.key} style={{ ...card, marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: pl.enabled?16:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:24 }}>{p.icon}</span>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <h3 style={{ fontSize:14,fontWeight:700,color:'#0F0F0F',margin:0 }}>{p.name}</h3>
                          <span style={{ fontSize:10,fontWeight:700,background:'#f3f4f6',color:'#6b7280',padding:'2px 8px',borderRadius:99 }}>{p.cat}</span>
                          {pl.enabled && <span style={{ fontSize:10,fontWeight:700,background:'#f0fdf4',color:'#15803d',padding:'2px 8px',borderRadius:99,border:'1px solid #bbf7d0' }}>AKTIF</span>}
                        </div>
                      </div>
                    </div>
                    <Toggle on={pl.enabled} onChange={async v => { const nc = { ...pl.config }; await savePlugin(p.key, v, nc); setPlugins(cur => { const exists = cur.find(x => x.plugin_key===p.key); if(exists) return cur.map(x => x.plugin_key===p.key ? { ...x, enabled:v } : x); return [...cur, { plugin_key:p.key, enabled:v, config:nc }]; }); toast$(v?`✅ ${p.name} diaktifkan`:`${p.name} dimatikan`); }}/>
                  </div>
                  {pl.enabled && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, borderTop:'1px solid #f3f4f6', paddingTop:14 }}>
                      {p.fields.map(f => (
                        <div key={f.k}>
                          <Label>{f.label}</Label>
                          <div style={{ display:'flex', gap:8 }}>
                            <input style={{ ...inp(), flex:1 }} value={pl.config[f.k]||''} onChange={e => setPlugins(prev => prev.map(x => x.plugin_key===p.key ? { ...x, config:{ ...x.config, [f.k]:e.target.value } } : x))} placeholder={f.ph}/>
                            <button onClick={async () => { const updated = plugins.find(x => x.plugin_key===p.key); if(updated){ await savePlugin(p.key, updated.enabled, updated.config); toast$('✅ Saved'); }}} style={{ ...btn(), padding:'9px 14px', fontSize:12, whiteSpace:'nowrap' }}>Save</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ SETTINGS ══════════════════════════════════════════ */}
        {tab==='settings' && (
          <div style={{ maxWidth:680 }}>
            <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>Settings</h1><p style={{ fontSize:13,color:'#6b7280',margin:0 }}>Konfigurasi email provider dan admin preferences.</p></div>

            <Section title="Email Provider">
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {['none','resend','smtp'].map(v => (
                  <button key={v} onClick={() => setSettings(s => ({ ...s, email_provider:v as AdminSettings['email_provider'] }))} style={{ ...btn(settings.email_provider===v?'#0F0F0F':'#f3f4f6', settings.email_provider===v?'#fff':'#374151'), padding:'8px 18px', textTransform:'capitalize' }}>{v==='none'?'Tiada':v==='resend'?'Resend':'SMTP'}</button>
                ))}
              </div>

              {settings.email_provider==='resend' && (
                <div>
                  <Label>Resend API Key</Label>
                  <input type="password" style={inp()} value={settings.resend_api_key||''} onChange={e => setSettings(s => ({ ...s, resend_api_key:e.target.value }))} placeholder="re_••••••••••••••••"/>
                  <p style={{ fontSize:11,color:'#9ca3af',margin:'6px 0 0' }}>Dapatkan API key di <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color:'#3b82f6' }}>resend.com</a></p>
                </div>
              )}

              {settings.email_provider==='smtp' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['smtp_host','SMTP Host','smtp.gmail.com'],['smtp_port','Port','587'],['smtp_user','Username','you@gmail.com'],['smtp_pass','Password','','password']].map(([k,l,ph,t]) => (
                    <div key={k}><Label>{l}</Label><input type={t||'text'} style={inp()} value={(settings as Record<string,unknown>)[k] as string||''} onChange={e => setSettings(s => ({ ...s, [k]:e.target.value }))} placeholder={ph}/></div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Admin Credentials">
              <div style={{ background:'#f8f8f7',borderRadius:10,padding:'14px 16px' }}>
                <p style={{ fontSize:13,color:'#6b7280',margin:'0 0 12px' }}>Credentials dikonfigurasi melalui environment variables Vercel.</p>
                {[['Admin Email','admin@thisismycard.io'],['Password','Diset via ADMIN_PASSWORD env var']].map(([k,v]) => (
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:13,padding:'5px 0',borderBottom:'1px solid #f0f0f0' }}>
                    <span style={{ color:'#6b7280' }}>{k}</span><span style={{ fontWeight:600,color:'#0F0F0F' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, padding:'12px 16px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a' }}>
                <p style={{ fontSize:12, color:'#92400e', margin:0 }}>⚠️ Untuk tukar password, pergi ke <strong>Vercel Dashboard → Settings → Environment Variables</strong> dan update <code>ADMIN_PASSWORD</code>.</p>
              </div>
            </Section>

            <button onClick={() => saveAll(saveAdminSettings, settings as AdminSettings, 'Settings disimpan')} style={{ ...btn(), padding:'13px 28px', boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
              {savedOk ? '✓ Saved!' : '💾 Simpan Settings'}
            </button>
          </div>
        )}

      </main>

      <Toast msg={toast}/>
    </div>
  );
}
