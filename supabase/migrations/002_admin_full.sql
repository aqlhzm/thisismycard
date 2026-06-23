-- ═══════════════════════════════════════════════
-- Migration 002: Full Admin Panel Tables
-- ═══════════════════════════════════════════════

-- Company Profile
CREATE TABLE IF NOT EXISTS company_profile (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT DEFAULT 'ThisIsMyCard',
  tagline         TEXT DEFAULT 'Premium NFC Digital Business Cards',
  description     TEXT DEFAULT '',
  logo_url        TEXT DEFAULT '',
  hero_image_url  TEXT DEFAULT '',
  email           TEXT DEFAULT 'hello@thisismycard.io',
  phone           TEXT DEFAULT '',
  whatsapp        TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  website         TEXT DEFAULT 'https://thisismycard.io',
  instagram       TEXT DEFAULT '',
  facebook        TEXT DEFAULT '',
  linkedin        TEXT DEFAULT '',
  tiktok          TEXT DEFAULT '',
  youtube         TEXT DEFAULT '',
  twitter         TEXT DEFAULT '',
  shopee          TEXT DEFAULT '',
  lazada          TEXT DEFAULT '',
  business_hours  TEXT DEFAULT 'Mon-Fri 9am-6pm',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_company" ON company_profile FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_company" ON company_profile FOR SELECT TO anon USING (true);
INSERT INTO company_profile (name) VALUES ('ThisIsMyCard') ON CONFLICT DO NOTHING;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  sku             TEXT DEFAULT '',
  price           DECIMAL(10,2) DEFAULT 0,
  original_price  DECIMAL(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'MYR',
  image_url       TEXT DEFAULT '',
  images          JSONB DEFAULT '[]',
  colors          JSONB DEFAULT '[]',
  in_stock        BOOLEAN DEFAULT true,
  stock_count     INTEGER DEFAULT 999,
  is_featured     BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  tags            JSONB DEFAULT '[]',
  specifications  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_products" ON products FOR SELECT TO anon USING (true);

-- Insert sample products
INSERT INTO products (name, description, price, original_price, sku, colors, is_featured) VALUES
  ('NFC Business Card — Standard', 'Premium PVC NFC business card with tap-to-share technology. Compatible with all NFC-enabled smartphones.', 45.00, 60.00, 'TIMC-STD-001', '["black","white","blue","turquoise"]', true),
  ('NFC Business Card — Premium', 'Metal finish NFC business card. Brushed aluminum with laser engraving. Ultra premium feel.', 89.00, 120.00, 'TIMC-PRM-001', '["black","silver","gold"]', true),
  ('NFC Business Card — Bundle 5', 'Pack of 5 standard NFC cards. Great for teams and departments.', 200.00, 250.00, 'TIMC-BDL-005', '["black","white","blue"]', false)
ON CONFLICT DO NOTHING;

-- Payment Settings
CREATE TABLE IF NOT EXISTS payment_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Billplz
  billplz_enabled       BOOLEAN DEFAULT false,
  billplz_api_key       TEXT DEFAULT '',
  billplz_collection_id TEXT DEFAULT '',
  billplz_x_signature   TEXT DEFAULT '',
  billplz_sandbox       BOOLEAN DEFAULT true,
  -- Stripe
  stripe_enabled        BOOLEAN DEFAULT false,
  stripe_publishable_key TEXT DEFAULT '',
  stripe_secret_key     TEXT DEFAULT '',
  stripe_webhook_secret TEXT DEFAULT '',
  stripe_sandbox        BOOLEAN DEFAULT true,
  -- Bank Transfer
  bank_transfer_enabled BOOLEAN DEFAULT true,
  bank_name             TEXT DEFAULT 'Maybank',
  bank_account_name     TEXT DEFAULT 'ThisIsMyCard Sdn Bhd',
  bank_account_number   TEXT DEFAULT '',
  bank_swift_code       TEXT DEFAULT 'MBBEMYKL',
  bank_instructions     TEXT DEFAULT 'Sila transfer dan hantar resit ke WhatsApp kami.',
  -- General
  currency              TEXT DEFAULT 'MYR',
  tax_enabled           BOOLEAN DEFAULT false,
  tax_rate              DECIMAL(5,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_payments" ON payment_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO payment_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Page Content (for Pages Editor)
CREATE TABLE IF NOT EXISTS page_content (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page         TEXT NOT NULL UNIQUE,
  content      JSONB NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_pages" ON page_content FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_pages" ON page_content FOR SELECT TO anon USING (true);

INSERT INTO page_content (page, content) VALUES
  ('landing', '{
    "hero_title": "Your network, one tap away.",
    "hero_subtitle": "Premium NFC business cards that share your complete digital profile instantly. No apps, no friction — just connection.",
    "hero_badge": "NFC Digital Business Cards",
    "cta_primary": "Setup My Card",
    "cta_secondary": "See how it works",
    "features": [
      {"icon": "⚡", "title": "One Tap Sharing", "desc": "Share your full profile instantly with any smartphone. No app download needed."},
      {"icon": "✦", "title": "Always Up to Date", "desc": "Update your details anytime. Every tap shows your latest information."},
      {"icon": "◈", "title": "Premium Build", "desc": "High-quality PVC with metallic finish. Looks and feels like a premium card."}
    ],
    "stats": [
      {"value": "2,400+", "label": "Cards Shipped"},
      {"value": "98%", "label": "Satisfaction Rate"},
      {"value": "48h", "label": "Avg. Setup Time"}
    ],
    "cta_banner_title": "Already have a card? Set it up now.",
    "cta_banner_desc": "Fill in your details and our team will configure your card within 48 hours."
  }')
ON CONFLICT (page) DO NOTHING;

-- Plugins Config
CREATE TABLE IF NOT EXISTS plugins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plugin_key  TEXT NOT NULL UNIQUE,
  enabled     BOOLEAN DEFAULT false,
  config      JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_plugins" ON plugins FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO plugins (plugin_key, enabled, config) VALUES
  ('google_analytics', false, '{"measurement_id": ""}'),
  ('facebook_pixel',   false, '{"pixel_id": ""}'),
  ('whatsapp_widget',  false, '{"phone": "", "message": "Hi, I am interested in your NFC card!"}'),
  ('live_chat',        false, '{"provider": "tawk", "property_id": ""}'),
  ('zapier',           false, '{"webhook_url": ""}')
ON CONFLICT (plugin_key) DO NOTHING;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('company-assets', 'company-assets', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  CREATE POLICY "admin_upload_company" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id IN ('company-assets','product-images'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "public_read_assets" ON storage.objects FOR SELECT TO anon USING (bucket_id IN ('company-assets','product-images'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admin_delete_assets" ON storage.objects FOR DELETE TO service_role USING (bucket_id IN ('company-assets','product-images'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
