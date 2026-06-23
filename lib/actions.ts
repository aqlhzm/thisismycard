'use server';

import { createClient } from '@supabase/supabase-js';
import type {
  Order, OrderInsert, OrderStatus,
  CompanyProfile, Product, PaymentSettings,
  PageContent, Plugin, AdminSettings
} from '@/types';

const SB_URL  = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_ANON = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SB_SVC  = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    if (error) throw error;
    return { orders: data as Order[] };
  } catch (e: unknown) { return { error: (e as Error).message }; }
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
  } catch { return { total:0,new:0,pending:0,production:0,shipped:0,completed:0,todayCount:0,weekCount:0,monthCount:0,revenue:0,chartData:{} }; }
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
    return data as CompanyProfile;
  } catch { return null; }
}

export async function saveCompanyProfile(p: Partial<CompanyProfile>) {
  try {
    const { data: ex } = await admin().from('company_profile').select('id').single();
    if (ex) { const { error } = await admin().from('company_profile').update(p).eq('id', (ex as {id:string}).id); if (error) throw error; }
    else     { const { error } = await admin().from('company_profile').insert(p); if (error) throw error; }
    return { success: true };
  } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
}

export async function uploadAsset(base64: string, filename: string, bucket: string): Promise<{ url?: string; error?: string }> {
  try {
    const ext  = filename.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buf  = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const mime = base64.startsWith('data:') ? base64.split(';')[0].split(':')[1] : `image/${ext}`;
    const { error } = await admin().storage.from(bucket).upload(path, buf, { contentType: mime, upsert: true });
    if (error) throw error;
    const { data } = admin().storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e: unknown) { return { error: (e as Error).message }; }
}

// ── Products ──────────────────────────────────────────────────────────────
export async function getProducts(): Promise<{ products?: Product[]; error?: string }> {
  try {
    const { data, error } = await admin().from('products').select('*').order('sort_order');
    if (error) throw error;
    return { products: data as Product[] };
  } catch (e: unknown) { return { error: (e as Error).message }; }
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
    return data as PaymentSettings;
  } catch { return null; }
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
export async function getPageContent(page: string): Promise<PageContent | null> {
  try {
    const { data } = await admin().from('page_content').select('*').eq('page', page).single();
    return data as PageContent;
  } catch { return null; }
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
