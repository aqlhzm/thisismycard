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

export interface CompanyProfile {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  logo_url: string;
  hero_image_url: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  shopee: string;
  lazada: string;
  business_hours: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  original_price: number;
  currency: string;
  image_url: string;
  images: string[];
  colors: string[];
  in_stock: boolean;
  stock_count: number;
  is_featured: boolean;
  sort_order: number;
  tags: string[];
  specifications: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface PaymentSettings {
  id?: string;
  billplz_enabled: boolean;
  billplz_api_key: string;
  billplz_collection_id: string;
  billplz_x_signature: string;
  billplz_sandbox: boolean;
  stripe_enabled: boolean;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_sandbox: boolean;
  bank_transfer_enabled: boolean;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_swift_code: string;
  bank_instructions: string;
  currency: string;
  tax_enabled: boolean;
  tax_rate: number;
}

export interface PageContent {
  id?: string;
  page: string;
  content: Record<string, unknown>;
}

export interface Plugin {
  id?: string;
  plugin_key: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface AdminSettings {
  id?: string;
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
