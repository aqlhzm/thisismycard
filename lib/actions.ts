'use server';

import { createClient } from '@supabase/supabase-js';
import type { Order, OrderInsert, OrderStatus, AdminSettings } from '@/types';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Customer ───────────────────────────────────────────────────────────
export async function submitOrder(data: OrderInsert): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const sb = getAnonClient();
    const { data: result, error } = await sb.from('orders').insert({ ...data, status: 'new' }).select('id').single();
    if (error) throw error;
    // Auto send confirmation email if configured
    try { await sendOrderConfirmationEmail(result.id); } catch {}
    return { success: true, id: result.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Submission failed' };
  }
}

// ── Admin Auth ─────────────────────────────────────────────────────────
export async function adminLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return { success: true };
  }
  return { success: false, error: 'Invalid email or password.' };
}

// ── Orders ─────────────────────────────────────────────────────────────
export async function getAllOrders(): Promise<{ orders?: Order[]; error?: string }> {
  try {
    const { data, error } = await getAdminClient().from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { orders: data as Order[] };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function getOrderById(id: string): Promise<{ order?: Order; error?: string }> {
  try {
    const { data, error } = await getAdminClient().from('orders').select('*').eq('id', id).single();
    if (error) throw error;
    return { order: data as Order };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Not found' };
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getAdminClient().from('orders').update({ status }).eq('id', id);
    if (error) throw error;
    // Send status update email
    try { await sendStatusUpdateEmail(id, status); } catch {}
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteOrder(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getAdminClient().from('orders').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function getOrderStats(): Promise<{
  total: number; new: number; pending: number; production: number;
  shipped: number; completed: number; todayCount: number; weekCount: number;
  error?: string;
}> {
  try {
    const { data, error } = await getAdminClient().from('orders').select('status, created_at');
    if (error) throw error;
    const orders = data || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      total: orders.length,
      new: orders.filter(o => o.status === 'new').length,
      pending: orders.filter(o => o.status === 'pending_verification').length,
      production: orders.filter(o => o.status === 'in_production').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      completed: orders.filter(o => o.status === 'completed').length,
      todayCount: orders.filter(o => o.created_at >= today).length,
      weekCount: orders.filter(o => o.created_at >= weekAgo).length,
    };
  } catch {
    return { total:0,new:0,pending:0,production:0,shipped:0,completed:0,todayCount:0,weekCount:0 };
  }
}

// ── Email ──────────────────────────────────────────────────────────────
async function sendOrderConfirmationEmail(orderId: string) {
  const settings = await getAdminSettings();
  if (!settings || !settings.auto_send_confirmation) return;
  if (settings.email_provider === 'none') return;
  const { order } = await getOrderById(orderId);
  if (!order) return;
  await sendEmail({
    to: order.email,
    subject: `Your NFC card setup request has been received — ${order.order_number}`,
    html: buildConfirmationEmail(order),
    settings,
  });
}

async function sendStatusUpdateEmail(orderId: string, status: OrderStatus) {
  const settings = await getAdminSettings();
  if (!settings || !settings.auto_send_status_updates) return;
  if (settings.email_provider === 'none') return;
  const { order } = await getOrderById(orderId);
  if (!order) return;
  const statusLabels: Record<OrderStatus, string> = {
    new: 'New Order',
    pending_verification: 'Pending Verification',
    in_production: 'In Production',
    ready_for_programming: 'Ready for Programming',
    shipped: 'Shipped',
    completed: 'Completed',
  };
  await sendEmail({
    to: order.email,
    subject: `Order Update: ${statusLabels[status]} — ${order.order_number}`,
    html: buildStatusEmail(order, status),
    settings,
  });
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getAdminSettings();
    if (!settings || settings.email_provider === 'none') return { success: false, error: 'No email provider configured' };
    await sendEmail({
      to,
      subject: 'Test Email from ThisIsMyCard',
      html: `<div style="font-family:sans-serif;padding:24px"><h2>✅ Email Working!</h2><p>Your email integration is configured correctly.</p></div>`,
      settings,
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

async function sendEmail({ to, subject, html, settings }: { to: string; subject: string; html: string; settings: AdminSettings }) {
  if (settings.email_provider === 'resend' && settings.resend_api_key) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.resend_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${settings.company_name} <noreply@thisismycard.io>`, to, subject, html }),
    });
    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
  } else if (settings.email_provider === 'smtp') {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || '587'),
      secure: parseInt(settings.smtp_port || '587') === 465,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    });
    await transporter.sendMail({ from: `"${settings.company_name}" <${settings.smtp_user}>`, to, subject, html });
  }
}

function buildConfirmationEmail(order: Order): string {
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#f8f8f7;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
<div style="background:#0F0F0F;padding:28px 32px;display:flex;align-items:center;gap:12px">
  <div style="width:32px;height:32px;background:#00D4FF;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#0F0F0F">N</div>
  <span style="color:#fff;font-weight:600;font-size:16px">ThisIsMyCard</span>
</div>
<div style="padding:32px">
  <h2 style="color:#0F0F0F;font-size:22px;margin:0 0 8px">We've received your setup request!</h2>
  <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px">Hi ${order.full_name}, your NFC card setup is now in our queue. Here's your summary:</p>
  <div style="background:#f8f8f7;border-radius:12px;padding:20px;margin-bottom:24px">
    <table style="width:100%;font-size:14px">
      <tr><td style="color:#6b7280;padding:6px 0">Order Number</td><td style="font-weight:600;color:#111;text-align:right">${order.order_number}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Card Color</td><td style="font-weight:600;color:#111;text-align:right;text-transform:capitalize">${order.card_color}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Quantity</td><td style="font-weight:600;color:#111;text-align:right">${order.quantity_ordered} card${order.quantity_ordered > 1 ? 's' : ''}</td></tr>
    </table>
  </div>
  <p style="color:#6b7280;font-size:14px;line-height:1.6">Our team will verify your details and begin production within 24-48 hours. You'll receive updates at each stage.</p>
</div>
<div style="padding:16px 32px;background:#f8f8f7;border-top:1px solid #e5e7eb;text-align:center">
  <p style="color:#9ca3af;font-size:12px;margin:0">© 2024 ThisIsMyCard · Premium NFC Business Cards</p>
</div>
</div></body></html>`;
}

function buildStatusEmail(order: Order, status: OrderStatus): string {
  const msgs: Record<OrderStatus, { icon: string; msg: string }> = {
    new:                   { icon:'📥', msg:'Your order has been received.' },
    pending_verification:  { icon:'🔍', msg:'We are verifying your details.' },
    in_production:         { icon:'⚙️', msg:'Your card is now in production!' },
    ready_for_programming: { icon:'💾', msg:'Your card is ready to be programmed.' },
    shipped:               { icon:'🚚', msg:'Your card is on its way!' },
    completed:             { icon:'✅', msg:'Your order is complete. Enjoy your card!' },
  };
  const { icon, msg } = msgs[status];
  const label = status.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#f8f8f7;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
<div style="background:#0F0F0F;padding:28px 32px"><span style="color:#fff;font-weight:600;font-size:16px">ThisIsMyCard</span></div>
<div style="padding:32px;text-align:center">
  <div style="font-size:40px;margin-bottom:16px">${icon}</div>
  <h2 style="color:#0F0F0F;font-size:20px;margin:0 0 8px">${label}</h2>
  <p style="color:#6b7280;font-size:15px">${msg}</p>
  <p style="color:#9ca3af;font-size:13px">Order: <strong>${order.order_number}</strong> · ${order.full_name}</p>
</div>
<div style="padding:16px 32px;background:#f8f8f7;border-top:1px solid #e5e7eb;text-align:center">
  <p style="color:#9ca3af;font-size:12px;margin:0">© 2024 ThisIsMyCard</p>
</div>
</div></body></html>`;
}

// ── Admin Settings (stored in Supabase) ────────────────────────────────
export async function getAdminSettings(): Promise<AdminSettings | null> {
  try {
    const sb = getAdminClient();
    const { data } = await sb.from('admin_settings').select('*').single();
    return data as AdminSettings | null;
  } catch { return null; }
}

export async function saveAdminSettings(settings: Partial<AdminSettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const sb = getAdminClient();
    const { data: existing } = await sb.from('admin_settings').select('id').single();
    if (existing) {
      const { error } = await sb.from('admin_settings').update(settings).eq('id', (existing as {id:string}).id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('admin_settings').insert(settings);
      if (error) throw error;
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function sendManualEmail(orderId: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getAdminSettings();
    if (!settings || settings.email_provider === 'none') return { success: false, error: 'Email not configured' };
    const { order } = await getOrderById(orderId);
    if (!order) return { success: false, error: 'Order not found' };
    await sendEmail({
      to: order.email,
      subject,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;background:#f8f8f7">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
  <h3 style="color:#0F0F0F;margin:0 0 16px">${subject}</h3>
  <p style="color:#374151;line-height:1.7;white-space:pre-wrap">${message}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px">Order: ${order.order_number} · ThisIsMyCard</p>
</div></body></html>`,
      settings,
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}
