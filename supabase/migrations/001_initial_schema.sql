-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Card color enum
DO $$ BEGIN
  CREATE TYPE card_color AS ENUM ('black','white','orange','green','red','pink','blue','turquoise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new',
    'pending_verification',
    'in_production',
    'ready_for_programming',
    'shipped',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main orders table
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name          TEXT NOT NULL,
  job_title          TEXT NOT NULL,
  company_name       TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT NOT NULL,
  website            TEXT,
  facebook           TEXT,
  instagram          TEXT,
  linkedin           TEXT,
  whatsapp           TEXT NOT NULL,
  profile_photo_url  TEXT,
  profile_photo_name TEXT,
  card_color         card_color NOT NULL DEFAULT 'black',
  order_number       TEXT NOT NULL UNIQUE,
  purchase_date      DATE NOT NULL,
  quantity_ordered   INTEGER NOT NULL DEFAULT 1,
  additional_notes   TEXT,
  status             order_status NOT NULL DEFAULT 'new',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

-- Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
DROP POLICY IF EXISTS "service_role_all" ON orders;
DROP POLICY IF EXISTS "anon_read_own" ON orders;

-- Anon can insert new orders (customer form)
CREATE POLICY "public_insert_orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role (admin backend) can do everything
CREATE POLICY "service_role_all"
  ON orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "public_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_photos" ON storage.objects;

CREATE POLICY "public_upload_photos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "public_read_photos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'profile-photos');

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name             TEXT DEFAULT 'ThisIsMyCard',
  company_email            TEXT DEFAULT 'hello@thisismycard.io',
  admin_email              TEXT DEFAULT 'admin@thisismycard.io',
  email_provider           TEXT DEFAULT 'none',
  resend_api_key           TEXT DEFAULT '',
  smtp_host                TEXT DEFAULT '',
  smtp_port                TEXT DEFAULT '587',
  smtp_user                TEXT DEFAULT '',
  smtp_pass                TEXT DEFAULT '',
  auto_send_confirmation   BOOLEAN DEFAULT false,
  auto_send_status_updates BOOLEAN DEFAULT false,
  whatsapp_notify          BOOLEAN DEFAULT false,
  notify_on_new_order      BOOLEAN DEFAULT false,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_admin_settings"
  ON admin_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO admin_settings (company_name, email_provider)
VALUES ('ThisIsMyCard', 'none')
ON CONFLICT DO NOTHING;
