'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAllOrders, getOrderStats, updateOrderStatus, deleteOrder,
  getAdminSettings, saveAdminSettings, sendTestEmail, sendManualEmail, adminLogin
} from '@/lib/actions';
import type { Order, OrderStatus, AdminSettings } from '@/types';

/* ─────────── helpers ─────────── */
const fmt = (d: string) => new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (d: string) => new Date(d).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATUS_CFG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string; next?: OrderStatus }> = {
  new:                   { label: 'New Order',             bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', next: 'pending_verification' },
  pending_verification:  { label: 'Pending Verification',  bg: '#fefce8', text: '#a16207', dot: '#eab308', next: 'in_production' },
  in_production:         { label: 'In Production',         bg: '#fff7ed', text: '#9a3412', dot: '#f97316', next: 'ready_for_programming' },
  ready_for_programming: { label: 'Ready for Programming', bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7', next: 'shipped' },
  shipped:               { label: 'Shipped',               bg: '#eef2ff', text: '#4338ca', dot: '#6366f1', next: 'completed' },
  completed:             { label: 'Completed',             bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
};
const STATUS_OPTS = Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k as OrderStatus, label: v.label }));

const SWATCH: Record<string, string> = {
  black: '#0F0F0F', white: '#e5e7eb', orange: '#f97316', green: '#22c55e',
  red: '#ef4444', pink: '#ec4899', blue: '#3b82f6', turquoise: '#06b6d4',
};

function Pill({ status }: { status: OrderStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.text, padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />
      {c.label}
    </span>
  );
}

/* ─────────── Login Screen ─────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!email || !pass) return;
    setLoading(true); setErr('');
    const r = await adminLogin(email, pass);
    if (r.success) onLogin();
    else setErr(r.error || 'Invalid credentials');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width: 400, padding: 40, background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 38, height: 38, background: '#00D4FF', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,212,255,0.4)' }}>
            <span style={{ color: '#0A0A0A', fontSize: 15, fontWeight: 800 }}>N</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>ThisIsMyCard</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500 }}>Admin Portal</div>
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Sign in</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: '0 0 28px' }}>Access your admin dashboard</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()}
              placeholder="admin@thisismycard.io" autoComplete="email"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, padding: '12px 14px', borderRadius: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()}
                placeholder="••••••••••••" autoComplete="current-password"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, padding: '12px 44px 12px 14px', borderRadius: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13, padding: '10px 14px', borderRadius: 9 }}>{err}</div>}
          <button onClick={go} disabled={loading} style={{
            background: '#00D4FF', color: '#0A0A0A', border: 'none', cursor: 'pointer',
            padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', marginTop: 4,
            boxShadow: '0 4px 20px rgba(0,212,255,0.35)', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Main Admin App ─────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'email' | 'settings' | 'plugins'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, pending: 0, production: 0, shipped: 0, completed: 0, todayCount: 0, weekCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Partial<AdminSettings>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [emailOrderId, setEmailOrderId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, statsRes, settingsRes] = await Promise.all([getAllOrders(), getOrderStats(), getAdminSettings()]);
    if (ordersRes.orders) setOrders(ordersRes.orders);
    setStats(statsRes);
    if (settingsRes) setSettings(settingsRes);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    showToast(`Status updated to ${STATUS_CFG[status].label}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    await deleteOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
    setSelectedOrder(null);
    showToast('Order deleted');
  };

  const handleSaveSettings = async () => {
    const r = await saveAdminSettings(settings);
    if (r.success) { setSettingsSaved(true); showToast('Settings saved'); setTimeout(() => setSettingsSaved(false), 2000); }
    else showToast('Error: ' + r.error);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo) return;
    const r = await sendTestEmail(testEmailTo);
    showToast(r.success ? '✅ Test email sent!' : '❌ ' + r.error);
  };

  const handleSendManualEmail = async () => {
    if (!emailOrderId || !emailSubject || !emailBody) return;
    setEmailSending(true);
    const r = await sendManualEmail(emailOrderId, emailSubject, emailBody);
    setEmailStatus(r.success ? '✅ Email sent successfully!' : '❌ ' + r.error);
    setEmailSending(false);
    if (r.success) { setEmailSubject(''); setEmailBody(''); setEmailOrderId(''); }
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const ms = !q || o.full_name.toLowerCase().includes(q) || o.company_name.toLowerCase().includes(q) || o.order_number.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
    return ms && (statusFilter === 'all' || o.status === statusFilter);
  });

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const F = { fontFamily: "'DM Sans',system-ui,sans-serif" };
  const card = { background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' } as React.CSSProperties;

  /* ── Nav items ── */
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'orders',    label: 'Orders',    icon: '≡', badge: stats.new > 0 ? stats.new : undefined },
    { id: 'email',     label: 'Email',     icon: '✉' },
    { id: 'plugins',   label: 'Plugins',   icon: '⬡' },
    { id: 'settings',  label: 'Settings',  icon: '⚙' },
  ] as Array<{ id: typeof tab; label: string; icon: string; badge?: number }>;

  return (
    <div style={{ ...F, display: 'flex', minHeight: '100vh', background: '#f7f7f6' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: '#0F0F0F', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#00D4FF', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(0,212,255,0.35)', flexShrink: 0 }}>
              <span style={{ color: '#0F0F0F', fontSize: 13, fontWeight: 800 }}>N</span>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em' }}>ThisIsMyCard</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 500 }}>Admin Portal</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: tab === n.id ? 'rgba(0,212,255,0.12)' : 'none',
              color: tab === n.id ? '#00D4FF' : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontWeight: tab === n.id ? 600 : 400, width: '100%', textAlign: 'left',
              transition: 'all .15s',
            }}
            onMouseOver={e => { if (tab !== n.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={e => { if (tab !== n.id) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{n.icon}</span>
              {n.label}
              {n.badge && <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{process.env.ADMIN_EMAIL || 'admin@thisismycard.io'}</span>
          </div>
          <button onClick={() => setAuthed(false)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>

        {/* ════════ DASHBOARD ════════ */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Dashboard</h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Welcome back. Here's what's happening today.</p>
            </div>

            {/* Top stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Orders',    value: stats.total,      bg: '#0F0F0F', vc: '#fff',     sc: 'rgba(255,255,255,0.35)', dot: '#00D4FF' },
                { label: 'New Orders',      value: stats.new,        bg: '#fff',    vc: '#0F0F0F',  sc: '#6b7280',               dot: '#3b82f6' },
                { label: 'Today',           value: stats.todayCount, bg: '#fff',    vc: '#0F0F0F',  sc: '#6b7280',               dot: '#22c55e' },
                { label: 'This Week',       value: stats.weekCount,  bg: '#fff',    vc: '#0F0F0F',  sc: '#6b7280',               dot: '#a855f7' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '20px 22px', border: '1px solid #f0f0f0', boxShadow: s.bg === '#0F0F0F' ? '0 4px 20px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: s.vc, letterSpacing: '-0.04em', lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: s.sc }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { title: 'Pending',     value: stats.pending,    bg: STATUS_CFG.pending_verification.bg,  text: STATUS_CFG.pending_verification.text,  dot: STATUS_CFG.pending_verification.dot },
                { title: 'Production',  value: stats.production, bg: STATUS_CFG.in_production.bg,         text: STATUS_CFG.in_production.text,         dot: STATUS_CFG.in_production.dot },
                { title: 'Shipped',     value: stats.shipped,    bg: STATUS_CFG.shipped.bg,               text: STATUS_CFG.shipped.text,               dot: STATUS_CFG.shipped.dot },
                { title: 'Completed',   value: stats.completed,  bg: STATUS_CFG.completed.bg,             text: STATUS_CFG.completed.text,             dot: STATUS_CFG.completed.dot },
              ].map(s => (
                <div key={s.title} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${s.dot}22` }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.text, letterSpacing: '-0.04em' }}>{loading ? '—' : s.value}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.text }}>{s.title}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F0F0F', margin: 0 }}>Recent Orders</h3>
                <button onClick={() => setTab('orders')} style={{ fontSize: 13, color: '#00D4FF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>View all →</button>
              </div>
              {loading ? <div style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</div> : (
                <div>
                  {orders.slice(0, 8).map((o, i) => (
                    <div key={o.id} onClick={() => { setSelectedOrder(o); setTab('orders'); }} style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr 140px 140px 120px',
                      gap: 14, alignItems: 'center', padding: '10px 0',
                      borderBottom: i < 7 ? '1px solid #f8f8f8' : 'none',
                      cursor: 'pointer',
                    }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <div style={{ width: 34, height: 34, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280', fontSize: 13 }}>{o.full_name.charAt(0)}</div>
                      <div><p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.full_name}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.company_name}</p></div>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{o.order_number}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtTime(o.created_at)}</span>
                      <Pill status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ ORDERS ════════ */}
        {tab === 'orders' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 380px' : '1fr', gap: 20 }}>
            {/* Left: list */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Orders</h1>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{filtered.length} orders found</p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af' }}>🔍</span>
                  <input type="search" placeholder="Search name, company, order…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: 32, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')} style={{ fontSize: 13, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', cursor: 'pointer' }}>
                  <option value="all">All Statuses</option>
                  {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={load} style={{ fontSize: 13, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 14px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>↻ Refresh</button>
              </div>

              {/* Table */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 130px 120px 150px 100px', gap: 12, padding: '10px 18px', background: '#f8f8f7', borderBottom: '1px solid #f0f0f0' }}>
                  {['', 'Customer', 'Order', 'Date', 'Status', 'Action'].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af' }}>{h}</div>
                  ))}
                </div>
                {loading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading orders…</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No orders match your search.</div>
                ) : filtered.map((o, i) => (
                  <div key={o.id} onClick={() => setSelectedOrder(o === selectedOrder ? null : o)} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 130px 120px 150px 100px', gap: 12,
                    padding: '12px 18px', alignItems: 'center', cursor: 'pointer',
                    background: selectedOrder?.id === o.id ? '#f0fdf4' : 'transparent',
                    borderBottom: i < filtered.length - 1 ? '1px solid #fafafa' : 'none',
                    transition: 'background .1s',
                  }}
                  onMouseOver={e => { if (selectedOrder?.id !== o.id) (e.currentTarget as HTMLElement).style.background = '#fafafa'; }}
                  onMouseOut={e => { if (selectedOrder?.id !== o.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <div style={{ width: 34, height: 34, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280', fontSize: 12 }}>{o.full_name.charAt(0)}</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.full_name}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.company_name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>{o.order_number}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: SWATCH[o.card_color] }} />
                        <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{o.card_color}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(o.created_at)}</span>
                    <Pill status={o.status} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      {STATUS_CFG[o.status].next && (
                        <button onClick={e => { e.stopPropagation(); handleStatusChange(o.id, STATUS_CFG[o.status].next!); }} style={{
                          fontSize: 10, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          → Next
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: detail panel */}
            {selectedOrder && (
              <div>
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', position: 'sticky', top: 0 }}>
                  {/* Panel header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280', fontSize: 15 }}>{selectedOrder.full_name.charAt(0)}</div>
                      <div><p style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', margin: '0 0 1px' }}>{selectedOrder.full_name}</p><p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{selectedOrder.company_name}</p></div>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} style={{ width: 28, height: 28, background: '#f3f4f6', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: '#6b7280' }}>✕</button>
                  </div>

                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                    {/* Status */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 10px' }}>Status</p>
                      <div style={{ marginBottom: 10 }}><Pill status={selectedOrder.status} /></div>
                      <select value={selectedOrder.status} onChange={e => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                        style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', cursor: 'pointer' }}>
                        {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>

                      {/* Status pipeline */}
                      <div style={{ display: 'flex', gap: 3, marginTop: 12 }}>
                        {STATUS_OPTS.map(s => {
                          const idx = STATUS_OPTS.findIndex(x => x.value === s.value);
                          const curIdx = STATUS_OPTS.findIndex(x => x.value === selectedOrder.status);
                          return (
                            <div key={s.value} title={s.label} style={{
                              flex: 1, height: 4, borderRadius: 99,
                              background: idx <= curIdx ? STATUS_CFG[s.value].dot : '#e5e7eb',
                              cursor: 'pointer', transition: 'background .2s',
                            }} onClick={() => handleStatusChange(selectedOrder.id, s.value)} />
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: '#9ca3af' }}>New</span>
                        <span style={{ fontSize: 9, color: '#9ca3af' }}>Completed</span>
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 10px' }}>Contact</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { k: 'Email', v: selectedOrder.email, href: `mailto:${selectedOrder.email}` },
                          { k: 'Phone', v: selectedOrder.phone, href: `tel:${selectedOrder.phone}` },
                          { k: 'WhatsApp', v: selectedOrder.whatsapp, href: `https://wa.me/${selectedOrder.whatsapp.replace(/\D/g, '')}` },
                        ].map(({ k, v, href }) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f8f7', borderRadius: 8, padding: '8px 12px' }}>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{k}</span>
                            <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500, textDecoration: 'none', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order info */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 10px' }}>Order</p>
                      <div style={{ background: '#f8f8f7', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {[
                          ['Order #', selectedOrder.order_number],
                          ['Date', fmt(selectedOrder.purchase_date)],
                          ['Qty', `${selectedOrder.quantity_ordered} card${selectedOrder.quantity_ordered > 1 ? 's' : ''}`],
                          ['Color', selectedOrder.card_color],
                          ['Submitted', fmtTime(selectedOrder.created_at)],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>{k}</span>
                            <span style={{ fontWeight: 600, color: '#111', textTransform: k === 'Color' ? 'capitalize' : 'none' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Social links */}
                    {(selectedOrder.website || selectedOrder.linkedin || selectedOrder.instagram || selectedOrder.facebook) && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 10px' }}>Links</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[['🌐 Website', selectedOrder.website], ['💼 LinkedIn', selectedOrder.linkedin], ['📸 Instagram', selectedOrder.instagram], ['📘 Facebook', selectedOrder.facebook]].filter(([, v]) => v).map(([k, v]) => (
                            <a key={k} href={v!} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center', background: '#f0f7ff', padding: '7px 10px', borderRadius: 8 }}>
                              <span style={{ color: '#6b7280', minWidth: 80 }}>{k}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOrder.additional_notes && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px' }}>Notes</p>
                        <p style={{ fontSize: 13, color: '#374151', background: '#fefce8', border: '1px solid #fef08a', borderRadius: 9, padding: '10px 12px', margin: 0, lineHeight: 1.6 }}>{selectedOrder.additional_notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                      <button onClick={() => { setEmailOrderId(selectedOrder.id); setTab('email'); }} style={{ background: '#0F0F0F', color: '#fff', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                        ✉ Send Email
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <a href={`tel:${selectedOrder.phone}`} style={{ display: 'block', textAlign: 'center', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>📞 Call</a>
                        <a href={`https://wa.me/${selectedOrder.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>💬 WhatsApp</a>
                      </div>
                      <button onClick={() => handleDelete(selectedOrder.id)} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer', padding: '9px', borderRadius: 9, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                        🗑 Delete Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ EMAIL ════════ */}
        {tab === 'email' && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Email</h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Send emails to customers and test your configuration.</p>
            </div>

            {/* Manual email */}
            <div style={{ ...card, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F0F0F', margin: '0 0 18px' }}>Send Email to Customer</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Order</label>
                  <select value={emailOrderId} onChange={e => setEmailOrderId(e.target.value)}
                    style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151' }}>
                    <option value="">Select an order…</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.full_name} — {o.order_number} ({o.email})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Subject</label>
                  <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Your NFC card is ready!"
                    style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Message</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} placeholder="Write your message here…"
                    style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                {emailStatus && <div style={{ padding: '10px 14px', borderRadius: 9, background: emailStatus.includes('✅') ? '#f0fdf4' : '#fef2f2', color: emailStatus.includes('✅') ? '#15803d' : '#dc2626', fontSize: 13 }}>{emailStatus}</div>}
                <button onClick={handleSendManualEmail} disabled={emailSending || !emailOrderId || !emailSubject || !emailBody}
                  style={{ background: '#0F0F0F', color: '#fff', border: 'none', cursor: 'pointer', padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: emailSending ? 0.7 : 1 }}>
                  {emailSending ? 'Sending…' : '✉ Send Email'}
                </button>
              </div>
            </div>

            {/* Auto email status */}
            <div style={{ ...card }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F0F0F', margin: '0 0 16px' }}>Automatic Emails</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Order Confirmation', desc: 'Sent when customer submits setup form', key: 'auto_send_confirmation' as keyof AdminSettings },
                  { label: 'Status Updates', desc: 'Sent when you change an order status', key: 'auto_send_status_updates' as keyof AdminSettings },
                  { label: 'Notify Admin on New Order', desc: 'Email you when a new order comes in', key: 'notify_on_new_order' as keyof AdminSettings },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8f8f7', borderRadius: 10 }}>
                    <div><p style={{ fontSize: 13, fontWeight: 600, color: '#0F0F0F', margin: '0 0 2px' }}>{item.label}</p><p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{item.desc}</p></div>
                    <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AdminSettings] }))}
                      style={{
                        width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                        background: settings[item.key as keyof AdminSettings] ? '#00D4FF' : '#e5e7eb',
                        position: 'relative', flexShrink: 0, transition: 'background .2s',
                      }}>
                      <div style={{
                        position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .2s',
                        left: settings[item.key as keyof AdminSettings] ? 23 : 3,
                      }} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveSettings} style={{ marginTop: 16, background: settingsSaved ? '#22c55e' : '#0F0F0F', color: '#fff', border: 'none', cursor: 'pointer', padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                {settingsSaved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ════════ PLUGINS ════════ */}
        {tab === 'plugins' && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Plugins</h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Connect external services to extend your admin capabilities.</p>
            </div>

            {/* Test email */}
            <div style={{ ...card, marginBottom: 16, borderLeft: '3px solid #00D4FF' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', margin: '0 0 12px' }}>🧪 Test Email Connection</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="email" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} placeholder="Send test to email address…"
                  style={{ flex: 1, fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                <button onClick={handleSendTestEmail} style={{ background: '#0F0F0F', color: '#fff', border: 'none', cursor: 'pointer', padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Send Test</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { icon: '📧', name: 'Resend', cat: 'Email', desc: 'Send transactional emails via Resend API. Recommended for production.', status: settings.email_provider === 'resend' ? 'connected' : 'available', key: 'resend' },
                { icon: '📮', name: 'SMTP',   cat: 'Email', desc: 'Use any SMTP provider (Gmail, Mailgun, SendGrid, etc.)', status: settings.email_provider === 'smtp' ? 'connected' : 'available', key: 'smtp' },
                { icon: '💬', name: 'WhatsApp Business', cat: 'Messaging', desc: 'Send order updates via WhatsApp. Coming soon.', status: 'soon', key: 'whatsapp' },
                { icon: '📊', name: 'Google Analytics', cat: 'Analytics', desc: 'Track form submissions and customer journeys.', status: 'soon', key: 'ga' },
                { icon: '🔗', name: 'Zapier', cat: 'Automation', desc: 'Automate workflows when orders are created or updated.', status: 'soon', key: 'zapier' },
                { icon: '📦', name: 'Shopify', cat: 'eCommerce', desc: 'Sync orders from your Shopify store automatically.', status: 'soon', key: 'shopify' },
              ].map(p => (
                <div key={p.key} style={{ ...card, position: 'relative', opacity: p.status === 'soon' ? 0.6 : 1 }}>
                  {p.status === 'connected' && <div style={{ position: 'absolute', top: 14, right: 14, background: '#f0fdf4', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, border: '1px solid #bbf7d0' }}>CONNECTED</div>}
                  {p.status === 'soon' && <div style={{ position: 'absolute', top: 14, right: 14, background: '#f8f8f7', color: '#9ca3af', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99 }}>COMING SOON</div>}
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{p.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>{p.cat}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', margin: '0 0 6px' }}>{p.name}</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px', lineHeight: 1.5 }}>{p.desc}</p>
                  {p.status !== 'soon' && (
                    <button onClick={() => setTab('settings')} style={{ fontSize: 12, background: p.status === 'connected' ? '#f0fdf4' : '#0F0F0F', color: p.status === 'connected' ? '#15803d' : '#fff', border: p.status === 'connected' ? '1px solid #bbf7d0' : 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 600 }}>
                      {p.status === 'connected' ? '⚙ Configure' : '+ Connect'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ SETTINGS ════════ */}
        {tab === 'settings' && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Settings</h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Configure your email provider and admin preferences.</p>
            </div>

            {/* Company */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', margin: '0 0 16px' }}>Company Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { k: 'company_name' as keyof AdminSettings, label: 'Company Name', placeholder: 'ThisIsMyCard' },
                  { k: 'company_email' as keyof AdminSettings, label: 'Company Email', placeholder: 'hello@thisismycard.io' },
                ].map(({ k, label, placeholder }) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
                    <input type="text" value={(settings[k] as string) || ''} onChange={e => setSettings(prev => ({ ...prev, [k]: e.target.value }))} placeholder={placeholder}
                      style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Email provider */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', margin: '0 0 16px' }}>Email Provider</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { v: 'none', label: 'None' },
                  { v: 'resend', label: 'Resend' },
                  { v: 'smtp', label: 'SMTP' },
                ].map(p => (
                  <button key={p.v} onClick={() => setSettings(prev => ({ ...prev, email_provider: p.v as AdminSettings['email_provider'] }))}
                    style={{
                      padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 600,
                      background: settings.email_provider === p.v ? '#0F0F0F' : '#f3f4f6',
                      color: settings.email_provider === p.v ? '#fff' : '#374151',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>

              {settings.email_provider === 'resend' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Resend API Key</label>
                  <input type="password" value={settings.resend_api_key || ''} onChange={e => setSettings(prev => ({ ...prev, resend_api_key: e.target.value }))} placeholder="re_••••••••••••••••••••••"
                    style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box' }} />
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>Get your API key at <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>resend.com</a></p>
                </div>
              )}

              {settings.email_provider === 'smtp' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { k: 'smtp_host' as keyof AdminSettings, label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
                    { k: 'smtp_port' as keyof AdminSettings, label: 'SMTP Port', placeholder: '587' },
                    { k: 'smtp_user' as keyof AdminSettings, label: 'Username / Email', placeholder: 'you@gmail.com' },
                    { k: 'smtp_pass' as keyof AdminSettings, label: 'Password / App Password', placeholder: '••••••••' },
                  ].map(({ k, label, placeholder }) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
                      <input type={k.includes('pass') ? 'password' : 'text'} value={(settings[k] as string) || ''} onChange={e => setSettings(prev => ({ ...prev, [k]: e.target.value }))} placeholder={placeholder}
                        style={{ width: '100%', fontSize: 13, background: '#f8f8f7', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin credentials */}
            <div style={{ ...card, marginBottom: 16, borderLeft: '3px solid #0F0F0F' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', margin: '0 0 8px' }}>Admin Credentials</h3>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>These are set via environment variables on Vercel. To change, update your env vars.</p>
              <div style={{ background: '#f8f8f7', borderRadius: 9, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#6b7280' }}>Admin Email</span><span style={{ fontWeight: 600, color: '#0F0F0F' }}>admin@thisismycard.io</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#6b7280' }}>Password</span><span style={{ fontWeight: 600, color: '#0F0F0F' }}>Set via ADMIN_PASSWORD env var</span></div>
              </div>
            </div>

            <button onClick={handleSaveSettings} style={{
              background: settingsSaved ? '#22c55e' : '#0F0F0F', color: '#fff', border: 'none',
              cursor: 'pointer', padding: '13px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'background .2s',
            }}>
              {settingsSaved ? '✓ Saved Successfully' : 'Save All Settings'}
            </button>
          </div>
        )}

      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: '#0F0F0F', color: '#fff',
          padding: '12px 20px', borderRadius: 11, fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
          animation: 'fade-in-up .25s ease-out',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
