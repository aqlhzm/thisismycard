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
