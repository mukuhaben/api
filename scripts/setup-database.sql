-- Create database and user
CREATE DATABASE firstcraft_db;
CREATE USER firstcraft_user WITH ENCRYPTED PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE firstcraft_db TO firstcraft_user;

-- Connect to the database
\c firstcraft_db;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO firstcraft_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO firstcraft_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO firstcraft_user;


-- FirstCraft E-commerce Database Setup Script
-- Run this script to create the database and initial setup

-- Create database (run this as postgres superuser)
-- CREATE DATABASE firstcraft_ecommerce;
-- \c firstcraft_ecommerce;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_type_enum AS ENUM ('customer', 'sales_agent', 'admin');
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method_enum AS ENUM ('mpesa', 'kcb', 'cash', 'bank_transfer');
CREATE TYPE transaction_type_enum AS ENUM ('commission', 'cashback', 'withdrawal', 'refund');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    user_type user_type_enum DEFAULT 'customer',
    company_name VARCHAR(255),
    contact_person VARCHAR(255),
    kra_pin VARCHAR(50),
    cashback_phone VARCHAR(20),
    agent_code VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    longer_description TEXT,
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES categories(id),
    cost_price DECIMAL(12,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 16.00,
    stock_units INTEGER DEFAULT 0,
    alert_quantity INTEGER DEFAULT 10,
    unit_of_measure VARCHAR(20) DEFAULT 'PC',
    pack_size INTEGER DEFAULT 1,
    product_barcode VARCHAR(100),
    etims_ref_code VARCHAR(100),
    expiry_date DATE,
    preferred_vendor_1 VARCHAR(255),
    preferred_vendor_2 VARCHAR(255),
    vendor_item_code VARCHAR(100),
    cashback_rate DECIMAL(5,2) DEFAULT 0.00,
    sa_cashback_1st_purchase DECIMAL(5,2) DEFAULT 6.00,
    sa_cashback_2nd_purchase DECIMAL(5,2) DEFAULT 4.00,
    sa_cashback_3rd_purchase DECIMAL(5,2) DEFAULT 3.00,
    sa_cashback_4th_purchase DECIMAL(5,2) DEFAULT 2.00,
    reorder_level INTEGER DEFAULT 0,
    order_level INTEGER DEFAULT 0,
    reorder_active BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product pricing tiers table
CREATE TABLE product_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tier_name VARCHAR(100) NOT NULL,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    selling_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product images table
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    kra_pin VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    sales_agent_id UUID REFERENCES users(id),
    order_status order_status_enum DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    shipping_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    shipping_address JSONB,
    billing_address JSONB,
    payment_method payment_method_enum,
    payment_status payment_status_enum DEFAULT 'pending',
    notes TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    cashback_rate DECIMAL(5,2) DEFAULT 0.00,
    cashback_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    total_earned DECIMAL(12,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet transactions table
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    transaction_type transaction_type_enum NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    order_id UUID REFERENCES orders(id),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    payment_method payment_method_enum NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status payment_status_enum DEFAULT 'pending',
    transaction_id VARCHAR(255),
    external_reference VARCHAR(255),
    phone_number VARCHAR(20),
    response_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    po_status VARCHAR(20) DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase order items table
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory movements table
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'order', 'purchase', 'adjustment', 'initial_stock'
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    invoice_status VARCHAR(20) DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    due_date DATE,
    payment_terms VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote requests table
CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    required_date DATE,
    budget_range VARCHAR(50),
    response TEXT,
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CMS CONTENT MANAGEMENT TABLES (NEW)
-- ========================================

-- CMS Content Types
CREATE TYPE content_type_enum AS ENUM ('page', 'banner', 'menu', 'widget', 'product_feature');
CREATE TYPE content_status_enum AS ENUM ('draft', 'published', 'archived');

-- CMS Content table
CREATE TABLE cms_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type content_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content JSONB NOT NULL,
    meta_data JSONB,
    status content_status_enum DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMS Navigation Menus
CREATE TABLE cms_navigation_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_name VARCHAR(100) NOT NULL,
    menu_location VARCHAR(50) NOT NULL, -- 'header', 'footer', 'sidebar'
    menu_items JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMS Banners
CREATE TABLE cms_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    banner_name VARCHAR(255) NOT NULL,
    banner_type VARCHAR(50) NOT NULL, -- 'hero', 'promotional', 'category'
    title VARCHAR(255),
    subtitle TEXT,
    description TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    cta_text VARCHAR(100),
    background_color VARCHAR(20),
    text_color VARCHAR(20),
    position VARCHAR(50), -- 'top', 'middle', 'bottom'
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMS Featured Products
CREATE TABLE cms_featured_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name VARCHAR(100) NOT NULL, -- 'homepage', 'category_page', 'deals'
    product_id UUID REFERENCES products(id),
    featured_order INTEGER DEFAULT 0,
    custom_title VARCHAR(255),
    custom_description TEXT,
    custom_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMS Media Library
CREATE TABLE cms_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    is_active BOOLEAN DEFAULT true,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMS Settings
CREATE TABLE cms_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_group VARCHAR(100) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'text', -- 'text', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(setting_group, setting_key)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_agent ON orders(sales_agent_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);

-- CMS Indexes
CREATE INDEX idx_cms_content_type ON cms_content(content_type);
CREATE INDEX idx_cms_content_status ON cms_content(status);
CREATE INDEX idx_cms_content_slug ON cms_content(slug);
CREATE INDEX idx_cms_banners_type ON cms_banners(banner_type);
CREATE INDEX idx_cms_banners_active ON cms_banners(is_active);
CREATE INDEX idx_cms_featured_section ON cms_featured_products(section_name);
CREATE INDEX idx_cms_media_type ON cms_media(file_type);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$
language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON quote_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CMS Triggers
CREATE TRIGGER update_cms_content_updated_at BEFORE UPDATE ON cms_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cms_navigation_menus_updated_at BEFORE UPDATE ON cms_navigation_menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cms_banners_updated_at BEFORE UPDATE ON cms_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cms_featured_products_updated_at BEFORE UPDATE ON cms_featured_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cms_settings_updated_at BEFORE UPDATE ON cms_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('tax_rate', '16', 'VAT tax rate percentage'),
('currency', 'KES', 'Default currency'),
('commission_rate', '5', 'Sales agent commission percentage'),
('min_order_amount', '500', 'Minimum order amount'),
('free_shipping_threshold', '5000', 'Free shipping threshold amount'),
('company_name', 'FirstCraft Ltd', 'Company name'),
('company_email', 'info@firstcraft.com', 'Company email'),
('company_phone', '+254700000000', 'Company phone'),
('mpesa_shortcode', '174379', 'M-Pesa business shortcode'),
('default_cashback_rate', '2', 'Default cashback rate for customers');

-- Insert default CMS settings
INSERT INTO cms_settings (setting_group, setting_key, setting_value, setting_type, description, is_public) VALUES
('site', 'site_name', 'FirstCraft E-commerce', 'text', 'Website name', true),
('site', 'site_description', 'Your trusted e-commerce partner', 'text', 'Website description', true),
('site', 'contact_email', 'info@firstcraft.com', 'text', 'Contact email', true),
('site', 'contact_phone', '+254700000000', 'text', 'Contact phone', true),
('homepage', 'hero_title', 'Welcome to FirstCraft', 'text', 'Homepage hero title', true),
('homepage', 'hero_subtitle', 'Your trusted e-commerce partner', 'text', 'Homepage hero subtitle', true),
('homepage', 'featured_products_count', '8', 'number', 'Number of featured products to show', false),
('cache', 'content_cache_duration', '300', 'number', 'Content cache duration in seconds', false);

-- Insert default navigation menu
INSERT INTO cms_navigation_menus (menu_name, menu_location, menu_items) VALUES
('Main Navigation', 'header', '[
  {"label": "Home", "url": "/", "order": 1},
  {"label": "Products", "url": "/products", "order": 2},
  {"label": "Categories", "url": "/categories", "order": 3},
  {"label": "About", "url": "/about", "order": 4},
  {"label": "Contact", "url": "/contact", "order": 5}
]');

COMMIT;
