'use server';

import { createClient } from '@supabase/supabase-js';
import type { Order, OrderInsert, OrderStatus } from '@/types';

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

// ─── Customer Actions ──────────────────────────────────────────────────────────

export async function submitOrder(data: OrderInsert): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getAnonClient();
    const { data: result, error } = await supabase
      .from('orders')
      .insert({ ...data, status: 'new' })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: result.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Submission failed';
    return { success: false, error: msg };
  }
}

export async function uploadProfilePhoto(
  base64: string,
  fileName: string,
  orderId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = getAdminClient();
    const ext = fileName.split('.').pop() || 'jpg';
    const path = `${orderId}/${Date.now()}.${ext}`;

    // Convert base64 to buffer
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, buffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(path);

    return { url: urlData.publicUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return { error: msg };
  }
}

// ─── Admin Actions ─────────────────────────────────────────────────────────────

export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (email === adminEmail && password === adminPassword) {
    return { success: true };
  }
  return { success: false, error: 'Invalid email or password.' };
}

export async function getAllOrders(): Promise<{ orders?: Order[]; error?: string }> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { orders: data as Order[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch orders';
    return { error: msg };
  }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    return { success: false, error: msg };
  }
}

export async function getOrderById(id: string): Promise<{ order?: Order; error?: string }> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { order: data as Order };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Not found';
    return { error: msg };
  }
}
