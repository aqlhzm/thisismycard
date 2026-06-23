export type CardColor = 'black' | 'white' | 'orange' | 'green' | 'red' | 'pink' | 'blue' | 'turquoise';

export type OrderStatus =
  | 'new'
  | 'pending_verification'
  | 'in_production'
  | 'ready_for_programming'
  | 'shipped'
  | 'completed';

export interface Order {
  id: string;
  full_name: string;
  job_title: string;
  company_name: string;
  phone: string;
  email: string;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  whatsapp: string;
  profile_photo_url?: string | null;
  profile_photo_name?: string | null;
  card_color: CardColor;
  order_number: string;
  purchase_date: string;
  quantity_ordered: number;
  additional_notes?: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'status'>;

export type AppView = 'landing' | 'customer_form' | 'success' | 'admin_login' | 'admin_dashboard';

export interface AdminPlugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
  icon: string;
  category: 'email' | 'notification' | 'crm' | 'analytics' | 'shipping';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  trigger: OrderStatus | 'new_order';
  enabled: boolean;
  body: string;
}

export interface AdminSettings {
  company_name: string;
  company_email: string;
  admin_email: string;
  email_provider: 'resend' | 'smtp' | 'none';
  resend_api_key: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  auto_send_confirmation: boolean;
  auto_send_status_updates: boolean;
  whatsapp_notify: boolean;
  notify_on_new_order: boolean;
}
