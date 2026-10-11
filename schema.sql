-- الشق الأول: هيكل قاعدة البيانات (PostgreSQL - Neon)
-- Schema Creation Only (No Seeding)

-- جدول users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255),
    customer_name VARCHAR(255),
    project_name VARCHAR(255),
    date DATE DEFAULT CURRENT_DATE,
    invoice_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'unpaid',
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    discount DECIMAL(5, 2) DEFAULT 0.00,
    grand_total DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(20) DEFAULT 'ل.س',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT FALSE
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON invoices(client_name);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
