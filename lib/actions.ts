'use server';

import { createClient } from '@supabase/supabase-js';
import { SEED_ORDERS, SEED_PRODUCTS, SEED_COMPANY, SEED_PAYMENTS } from './seed';
import type {
  Order, OrderInsert, OrderStatus,
  CompanyProfile, Product, PaymentSettings,
  PageContent, Plugin, AdminSettings
} from '@/types';

// Hardcoded fallbacks for Vercel (env vars must also be set in Vercel dashboard)
const SB_URL  = () => process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://zqaxufcfappmlqldjryb.supabase.co';
const SB_ANON = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxYXh1ZmNmYXBwbWxxbGRqcnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDAwODIsImV4cCI6MjA5Nzc3NjA4Mn0.9DIQgqr56nqzx32B6HDelWJUnCXBg7CFXLJqs5-8QZk';
const SB_SVC  = () => process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxYXh1ZmNmYXBwbWxxbGRqcnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIwMDA4MiwiZXhwIjoyMDk3Nzc2MDgyfQ.w9GP0HuwnWe306HRhoztHXo0eukcl2qVjFCA6ADSxWI';

const admin = () => createClient(SB_URL(), SB_SVC());
const anon  = () => createClient(SB_URL(), SB_ANON());

// ── Auth ─────────────────────────────────────────────────────────────────
export async function adminLogin(email: string, password: string) {
  const E = process.env.ADMIN_EMAIL    || 'admin@thisismycard.io';
  const P = process.env.ADMIN_PASSWORD || 'Admin@TIMC2024!';
  if (email.trim().toLowerCase() === E.toLowerCase() && password === P)
    return { success: true };
  return { success: false, error: 'Invalid email or password.' };
}

// ── Orders ────────────────────────────────────────────────────────────────
export async function submitOrder(data: OrderInsert) {
  try {
    const { data: r, error } = await anon().from('orders').insert({ ...data, status: 'new' }).select('id').single();
    if (error) throw error;
    try { await sendConfirmationEmail(r.id); } catch {}
    return { success: true, id: r.id as string };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function getAllOrders(): Promise<{ orders?: Order[]; error?: string }> {
  try {
    const { data, error } = await admin().from('orders').select('*').order('created_at', { ascending: false });
    // If error, table doesn't exist — use seed
    if (error) return { orders: SEED_ORDERS };
    // Table exists — return real data (even if empty array)
    return { orders: data as Order[] };
  } catch {
    return { orders: SEED_ORDERS };
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  try {
    const { error } = await admin().from('orders').update({ status }).eq('id', id);
    if (error) throw error;
    try { await sendStatusEmail(id, status); } catch {}
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function deleteOrder(id: string) {
  try {
    const { error } = await admin().from('orders').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function getOrderStats() {
  try {
    const { data } = await admin().from('orders').select('status, created_at');
    const rows = data || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7*24*3600*1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30*24*3600*1000).toISOString();
    // Build daily chart for last 14 days
    const chartData: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i*24*3600*1000);
      chartData[d.toISOString().slice(0,10)] = 0;
    }
    rows.forEach(r => { const d = r.created_at.slice(0,10); if (chartData[d] !== undefined) chartData[d]++; });
    return {
      total: rows.length,
      new:        rows.filter(o => o.status === 'new').length,
      pending:    rows.filter(o => o.status === 'pending_verification').length,
      production: rows.filter(o => o.status === 'in_production').length,
      shipped:    rows.filter(o => o.status === 'shipped').length,
      completed:  rows.filter(o => o.status === 'completed').length,
      todayCount: rows.filter(o => o.created_at >= today).length,
      weekCount:  rows.filter(o => o.created_at >= weekAgo).length,
      monthCount: rows.filter(o => o.created_at >= monthAgo).length,
      revenue:    rows.filter(o => o.status === 'completed').length * 45,
      chartData,
    };
  } catch {
    // Supabase table doesn't exist — compute from seed
    const rows = SEED_ORDERS;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7*24*3600*1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30*24*3600*1000).toISOString();
    const chartData: Record<string,number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i*24*3600*1000);
      chartData[d.toISOString().slice(0,10)] = 0;
    }
    rows.forEach(r => { const d = r.created_at.slice(0,10); if (chartData[d] !== undefined) chartData[d]++; });
    return {
      total: rows.length,
      new:        rows.filter(o => o.status === 'new').length,
      pending:    rows.filter(o => o.status === 'pending_verification').length,
      production: rows.filter(o => o.status === 'in_production').length,
      shipped:    rows.filter(o => o.status === 'shipped').length,
      completed:  rows.filter(o => o.status === 'completed').length,
      todayCount: rows.filter(o => o.created_at >= today).length,
      weekCount:  rows.filter(o => o.created_at >= weekAgo).length,
      monthCount: rows.filter(o => o.created_at >= monthAgo).length,
      revenue:    rows.filter(o => o.status === 'completed').length * 45,
      chartData,
    };
  }
}

export async function exportOrdersCSV(): Promise<string> {
  const { orders } = await getAllOrders();
  if (!orders?.length) return '';
  const header = ['Order No','Name','Job Title','Company','Email','Phone','WhatsApp','Card Color','Qty','Status','Date'];
  const rows = orders.map(o => [
    o.order_number, o.full_name, o.job_title, o.company_name,
    o.email, o.phone, o.whatsapp, o.card_color,
    o.quantity_ordered, o.status, o.created_at.slice(0,10)
  ]);
  return [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
}

// ── Company Profile ───────────────────────────────────────────────────────
export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  try {
    const { data } = await admin().from('company_profile').select('*').single();
    return data ? (data as CompanyProfile) : SEED_COMPANY;
  } catch { return SEED_COMPANY; }
}

export async function saveCompanyProfile(p: Partial<CompanyProfile>) {
  try {
    const sb = admin();
    // Allow base64 for small images (logos etc) — they work fine in TEXT columns
    // Strip only if extremely large (>2MB base64 = ~1.5MB file)
    const clean = { ...p };
    if (clean.logo_url && clean.logo_url.startsWith('data:') && clean.logo_url.length > 2000000) {
      console.warn('Logo too large for DB, stripping');
      delete clean.logo_url;
    }
    if (clean.hero_image_url && clean.hero_image_url.startsWith('data:') && clean.hero_image_url.length > 2000000) {
      delete clean.hero_image_url;
    }

    const { data: ex } = await sb.from('company_profile').select('id').single();
    if (ex) {
      const { error } = await sb.from('company_profile').update(clean).eq('id', (ex as {id:string}).id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('company_profile').insert(clean);
      if (error) throw error;
    }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function uploadAsset(base64: string, filename: string, bucket: string): Promise<{ url?: string; error?: string }> {
  try {
    const sb   = admin();
    const ext  = (filename.split('.').pop() || 'jpg').toLowerCase().replace('jpeg','jpg');
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const mime = base64.startsWith('data:') ? base64.split(';')[0].split(':')[1] : `image/${ext}`;
    const buf  = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');

    // Ensure bucket exists
    const { data: buckets } = await sb.storage.listBuckets();
    const exists = buckets?.some((b: { name: string }) => b.name === bucket);
    if (!exists) {
      const { error: createErr } = await sb.storage.createBucket(bucket, { public: true, fileSizeLimit: 5242880 });
      if (createErr && !createErr.message.includes('already exists')) {
        console.error('Bucket create error:', createErr.message);
      }
    }

    // Upload
    const { error: upErr } = await sb.storage.from(bucket).upload(path, buf, { contentType: mime, upsert: true });
    if (upErr) {
      // Try update if already exists
      const { error: updErr } = await sb.storage.from(bucket).update(path, buf, { contentType: mime });
      if (updErr) throw new Error(`Upload failed: ${upErr.message}`);
    }

    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e: unknown) {
    const msg = (e as Error).message;
    console.error('uploadAsset error:', msg);
    return { error: msg };
  }
}

// ── Products ──────────────────────────────────────────────────────────────
export async function getProducts(): Promise<{ products?: Product[]; error?: string }> {
  try {
    const { data, error } = await admin().from('products').select('*').order('sort_order');
    if (error) return { products: SEED_PRODUCTS };
    // Table exists — if empty, still show seed for UI demo
    if (!data || data.length === 0) return { products: SEED_PRODUCTS };
    return { products: data as Product[] };
  } catch {
    return { products: SEED_PRODUCTS };
  }
}

export async function saveProduct(p: Partial<Product> & { id?: string }) {
  try {
    if (p.id) {
      const { id, ...rest } = p;
      const { error } = await admin().from('products').update(rest).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await admin().from('products').insert(p);
      if (error) throw error;
    }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function deleteProduct(id: string) {
  try {
    const { error } = await admin().from('products').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

// ── Payment Settings ──────────────────────────────────────────────────────
export async function getPaymentSettings(): Promise<PaymentSettings | null> {
  try {
    const { data } = await admin().from('payment_settings').select('*').single();
    return data ? (data as PaymentSettings) : SEED_PAYMENTS;
  } catch { return SEED_PAYMENTS; }
}

export async function savePaymentSettings(p: Partial<PaymentSettings>) {
  try {
    const { data: ex } = await admin().from('payment_settings').select('id').single();
    if (ex) { await admin().from('payment_settings').update(p).eq('id', (ex as {id:string}).id); }
    else     { await admin().from('payment_settings').insert(p); }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

// ── Page Content ──────────────────────────────────────────────────────────
const PAGE_DEFAULTS: Record<string, Record<string, unknown>> = {
  'our-story': {
    hero_eyebrow: 'Our Story',
    hero_title: 'We built the card we always wanted.',
    hero_subtitle: 'ThisIsMyCard was born from a simple frustration — business cards that go straight into the bin.',
    story_sections: [
      { year:'2022', title:'The Problem', body:'Every networking event ended the same way — exchanging physical cards that would never be seen again.' },
      { year:'2023', title:'The Idea', body:'NFC technology had been in phones for years, but no one had made it truly seamless for professionals in Malaysia.' },
      { year:'2024', title:'The Launch', body:'ThisIsMyCard launched with one mission: make professional networking as simple as a tap.' },
    ],
    mission_title:'Our Mission', mission_body:'To make every professional connection count — instantly and beautifully.',
    vision_title:'Our Vision', vision_body:'A world where your identity is always just one tap away.',
    values:[
      { icon:'⚡', title:'Simplicity', desc:'If it needs an instruction manual, we did it wrong.' },
      { icon:'💎', title:'Premium Quality', desc:'Every card we ship represents you. It has to be perfect.' },
      { icon:'🇲🇾', title:'Made for Malaysia', desc:'Built for Malaysian professionals, priced for Malaysian budgets.' },
      { icon:'🔄', title:'Always Evolving', desc:'Your card grows with your career. Update anytime, forever.' },
    ],
    cta_title:'Ready to tap into the future?',
    cta_subtitle:'Join thousands of professionals who have already made the switch.',
    cta_button:'Get Your Card →',
  },
  'terms': {
    last_updated:'January 2024',
    intro:'Please read these Terms and Conditions carefully before using ThisIsMyCard services.',
    sections:[
      { title:'1. Services', body:'ThisIsMyCard provides NFC-enabled digital business cards that allow users to share their professional contact information via NFC technology.' },
      { title:'2. Orders & Payment', body:'All orders are subject to availability. Payment must be completed before processing begins. We accept FPX and bank transfer.' },
      { title:'3. Delivery', body:'Standard delivery takes 5-7 business days within Peninsular Malaysia. Express delivery available at additional cost.' },
      { title:'4. Profile Setup', body:'Customers are responsible for providing accurate information. Profile updates can be made at any time through our portal.' },
      { title:'5. Refunds & Returns', body:'Due to the personalized nature, refunds are only for defective cards. Requests within 7 days of receiving the card.' },
      { title:'6. Privacy & Data', body:'We collect personal information necessary to provide our services. Your data is stored securely and never sold.' },
      { title:'7. Governing Law', body:'These Terms are governed by the laws of Malaysia. Any disputes shall be resolved in Malaysian courts.' },
    ],
  },
};

export async function getPageContent(page: string): Promise<PageContent | null> {
  try {
    const { data } = await admin().from('page_content').select('*').eq('page', page).single();
    if (data) return data as PageContent;
    // Return defaults if page not in DB yet
    if (PAGE_DEFAULTS[page]) return { page, content: PAGE_DEFAULTS[page] };
    return null;
  } catch {
    if (PAGE_DEFAULTS[page]) return { page, content: PAGE_DEFAULTS[page] };
    return null;
  }
}

export async function savePageContent(page: string, content: Record<string, unknown>) {
  try {
    const { data: ex } = await admin().from('page_content').select('id').eq('page', page).single();
    if (ex) { await admin().from('page_content').update({ content }).eq('page', page); }
    else     { await admin().from('page_content').insert({ page, content }); }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

// ── Plugins ───────────────────────────────────────────────────────────────
export async function getPlugins(): Promise<Plugin[]> {
  try {
    const { data } = await admin().from('plugins').select('*');
    return (data || []) as Plugin[];
  } catch { return []; }
}

export async function savePlugin(plugin_key: string, enabled: boolean, config: Record<string, string>) {
  try {
    const { data: ex } = await admin().from('plugins').select('id').eq('plugin_key', plugin_key).single();
    if (ex) { await admin().from('plugins').update({ enabled, config }).eq('plugin_key', plugin_key); }
    else     { await admin().from('plugins').insert({ plugin_key, enabled, config }); }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

// ── Admin Settings ────────────────────────────────────────────────────────
export async function getAdminSettings(): Promise<AdminSettings | null> {
  try {
    const { data } = await admin().from('admin_settings').select('*').single();
    return data as AdminSettings;
  } catch { return null; }
}

export async function saveAdminSettings(s: Partial<AdminSettings>) {
  try {
    const { data: ex } = await admin().from('admin_settings').select('id').single();
    if (ex) { await admin().from('admin_settings').update(s).eq('id', (ex as {id:string}).id); }
    else     { await admin().from('admin_settings').insert(s); }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

// ── Email Helpers ─────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const s = await getAdminSettings();
  if (!s || s.email_provider === 'none') return;
  if (s.email_provider === 'resend' && s.resend_api_key) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${s.resend_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${s.company_name || 'ThisIsMyCard'} <noreply@thisismycard.io>`, to, subject, html }),
    });
  } else if (s.email_provider === 'smtp') {
    const nm = await import('nodemailer');
    const t = nm.createTransport({ host: s.smtp_host, port: parseInt(s.smtp_port||'587'), secure: s.smtp_port==='465', auth: { user: s.smtp_user, pass: s.smtp_pass } });
    await t.sendMail({ from: `"${s.company_name}" <${s.smtp_user}>`, to, subject, html });
  }
}

export async function sendTestEmail(to: string) {
  try {
    await sendEmail(to, 'Test — ThisIsMyCard', '<h2>✅ Email berfungsi!</h2><p>Konfigurasi email anda betul.</p>');
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function sendManualEmail(orderId: string, subject: string, message: string) {
  try {
    const { data } = await admin().from('orders').select('email,full_name,order_number').eq('id', orderId).single();
    if (!data) return { success: false, error: 'Order not found' };
    const o = data as { email: string; full_name: string; order_number: string };
    await sendEmail(o.email, subject, `<div style="font-family:Arial;padding:24px"><h3>${subject}</h3><p style="white-space:pre-wrap">${message}</p><hr><p style="color:#999;font-size:12px">Order: ${o.order_number} · ThisIsMyCard</p></div>`);
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

async function sendConfirmationEmail(orderId: string) {
  const s = await getAdminSettings();
  if (!s?.auto_send_confirmation) return;
  const { data } = await admin().from('orders').select('*').eq('id', orderId).single();
  if (!data) return;
  const o = data as Order;
  await sendEmail(o.email, `Setup request received — ${o.order_number}`,
    `<div style="font-family:Arial;max-width:560px;margin:0 auto;padding:24px"><h2>Terima kasih, ${o.full_name}!</h2><p>Request setup kad NFC anda telah diterima. Order No: <strong>${o.order_number}</strong></p><p>Kami akan proses dalam 24–48 jam. Nantikan update daripada kami.</p><p style="color:#999;font-size:12px">© ThisIsMyCard</p></div>`
  );
}

// ── DB Health Check ──────────────────────────────────────────────────────
export async function checkDbConnected(): Promise<boolean> {
  try {
    // Check both products AND admin_settings — both created in migration 002
    const [p, a] = await Promise.all([
      admin().from('products').select('id').limit(1),
      admin().from('admin_settings').select('id').limit(1),
    ]);
    // If either returns without error, DB is set up
    return !p.error || !a.error;
  } catch { return false; }
}

async function sendStatusEmail(orderId: string, status: OrderStatus) {
  const s = await getAdminSettings();
  if (!s?.auto_send_status_updates) return;
  const { data } = await admin().from('orders').select('*').eq('id', orderId).single();
  if (!data) return;
  const o = data as Order;
  const labels: Record<OrderStatus, string> = { new:'New Order', pending_verification:'Pending Verification', in_production:'In Production', ready_for_programming:'Ready for Programming', shipped:'Shipped', completed:'Completed' };
  await sendEmail(o.email, `Order Update: ${labels[status]} — ${o.order_number}`,
    `<div style="font-family:Arial;max-width:560px;margin:0 auto;padding:24px"><h2>Status Update</h2><p>Hi ${o.full_name},</p><p>Order <strong>${o.order_number}</strong> anda kini: <strong>${labels[status]}</strong></p><p style="color:#999;font-size:12px">© ThisIsMyCard</p></div>`
  );
}
