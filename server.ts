import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ override: true });

let isDbConnected = false;

let pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
});

// Avoid unhandled errors on idle clients crashing the process
pool.on('error', (err) => {
  console.warn('PostgreSQL pool client error (safe handled):', err.message);
  isDbConnected = false;
});

async function getDbClient() {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    return client;
  } catch (err: any) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && dbUrl.includes('-pooler.')) {
      try {
        const directUrl = dbUrl.replace('-pooler.', '.');
        const fallbackPool = new Pool({ 
          connectionString: directUrl, 
          max: 5,
          idleTimeoutMillis: 20000,
          connectionTimeoutMillis: 5000,
          allowExitOnIdle: true,
        });
        fallbackPool.on('error', (e) => {
          console.warn('Fallback pool error:', e.message);
          isDbConnected = false;
        });
        const client = await fallbackPool.connect();
        pool = fallbackPool;
        isDbConnected = true;
        return client;
      } catch (directErr) {
        // failed direct as well
      }
    }
    isDbConnected = false;
    throw err;
  }
}

// Fallback in-memory store for high availability & when Neon quota is exceeded
interface MemoryInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPaid: boolean;
}

interface MemoryInvoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  project_name: string;
  invoice_date: string;
  due_date?: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  notes?: string;
  items: MemoryInvoiceItem[];
}

let nextInvoiceId = 3;
let nextItemId = 3;

const fallbackInvoices: MemoryInvoice[] = [
  {
    id: 1,
    invoice_number: 'CV-2026-101',
    customer_name: 'مستشفى الشفاء الجراحي',
    project_name: 'صيانة وتوريد مجسات أجهزة القسطرة',
    invoice_date: '2026-02-10',
    due_date: '2026-03-10',
    currency: '$',
    subtotal: 5200,
    discount: 0,
    grand_total: 5200,
    notes: 'تنبيه: تجاوزت الفاتورة تاريخ الاستحقاق المحدد',
    items: [
      { id: 1, description: 'مجسات متقدمة لأجهزة القلب', quantity: 2, unitPrice: 2600, lineTotal: 5200, isPaid: false }
    ]
  },
  {
    id: 2,
    invoice_number: 'CV-2026-102',
    customer_name: 'مركز النور التخصصي للقلب',
    project_name: 'نظام إدارة وأرشفة التخطيط القلبي',
    invoice_date: '2026-03-01',
    due_date: '2026-05-01',
    currency: '$',
    subtotal: 3800,
    discount: 0,
    grand_total: 3800,
    notes: 'تاريخ الاستحقاق ساري المفعول',
    items: [
      { id: 2, description: 'رخصة برمجيات الربط الطبي', quantity: 1, unitPrice: 3800, lineTotal: 3800, isPaid: true }
    ]
  }
];

async function initializeDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set. Running with built-in resilient storage.');
    return;
  }
  let client;
  const originalUrl = process.env.DATABASE_URL;
  try {
    client = await pool.connect();
  } catch (initialErr: any) {
    if (originalUrl.includes('-pooler.')) {
      const directUrl = originalUrl.replace('-pooler.', '.');
      try {
        await pool.end().catch(() => {});
        pool = new Pool({
          connectionString: directUrl,
          connectionTimeoutMillis: 5000,
        });
        pool.on('error', (err) => {
          console.warn('PostgreSQL pool client error (safe handled):', err.message);
          isDbConnected = false;
        });
        client = await pool.connect();
      } catch (directErr) {
        // failed both
      }
    }
  }

  if (!client) {
    isDbConnected = false;
    console.warn('Could not establish connection to Neon DB.');
    console.log('Running with resilient storage mode.');
    return;
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          client_name VARCHAR(255),
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          line_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          is_paid BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices(customer_name);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON invoices(client_name);
      CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Ensure notes column exists
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    isDbConnected = true;
    console.log('CONNECTED TO NEON: Database connected and tables verified.');
  } catch (error: any) {
    isDbConnected = false;
    console.warn('PostgreSQL database initialization error:', error?.message || error);
    console.log('Running with resilient storage mode.');
  } finally {
    if (client) {
      try {
        client.release();
      } catch {
        // ignore release errors
      }
    }
  }
}

async function startServer() {
  try {
    await initializeDB();
  } catch (err) {
    console.warn('DB initialization bypassed smoothly:', err);
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // POST /api/invoices
  // يحفظ الفاتورة مع بنودها في قاعدة البيانات
  app.post('/api/invoices', async (req, res) => {
    const { 
      invoice_number, 
      customer_name, 
      project_name, 
      invoice_date, 
      currency = 'ل.س',
      subtotal, 
      discount, 
      grand_total,
      notes = '',
      items 
    } = req.body;

    let client;
    try {
      client = await getDbClient();
      await client.query('BEGIN');

      const clientName = (req.body.client_name || customer_name || '').trim();
      const dateVal = invoice_date || req.body.date || new Date().toISOString().split('T')[0];
      const totalVal = grand_total ?? req.body.total_amount ?? 0;
      const statusVal = req.body.status || 'unpaid';
      const notesVal = (notes || req.body.notes || '').trim();

      const invoiceInsertQuery = `
        INSERT INTO invoices 
        (invoice_number, client_name, customer_name, project_name, date, invoice_date, status, total_amount, currency, subtotal, discount, grand_total, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id;
      `;
      const invoiceValues = [
        invoice_number, 
        clientName, 
        clientName, 
        project_name, 
        dateVal, 
        dateVal, 
        statusVal, 
        totalVal, 
        currency || 'ل.س', 
        subtotal || 0, 
        discount || 0, 
        grand_total || 0,
        notesVal
      ];
      
      const invoiceResult = await client.query(invoiceInsertQuery, invoiceValues);
      const invoiceId = invoiceResult.rows[0].id;

      if (items && items.length > 0) {
        const itemInsertQuery = `
          INSERT INTO invoice_items 
          (invoice_id, description, quantity, unit_price, line_total, is_paid)
          VALUES ($1, $2, $3, $4, $5, $6);
        `;
        
        for (const item of items) {
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const lineTotal = qty * unitPrice;
          const isPaid = Boolean(item.is_paid ?? item.isPaid);
          const description = item.description || 'بند خدمة';
          const itemValues = [invoiceId, description, qty, unitPrice, lineTotal, isPaid];
          await client.query(itemInsertQuery, itemValues);
        }
      }

      await client.query('COMMIT');
      return res.json({ success: true, invoiceId });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.warn('Database save error:', error);
    } finally {
      if (client) client.release();
    }

    // Resilient fallback storage
    const newId = nextInvoiceId++;
    const parsedItems: MemoryInvoiceItem[] = (items || []).map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      return {
        id: nextItemId++,
        description: item.description || 'بند خدمة',
        quantity: qty,
        unitPrice: unitPrice,
        lineTotal: qty * unitPrice,
        isPaid: Boolean(item.is_paid ?? item.isPaid)
      };
    });

    const newInvoice: MemoryInvoice = {
      id: newId,
      invoice_number: invoice_number || `CV-${new Date().getFullYear()}-${String(newId).padStart(3, '0')}`,
      customer_name: customer_name || '',
      project_name: project_name || '',
      invoice_date: invoice_date || new Date().toISOString().split('T')[0],
      currency: currency || 'ل.س',
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      grand_total: Number(grand_total) || 0,
      notes: notes || '',
      items: parsedItems
    };

    fallbackInvoices.unshift(newInvoice);
    res.json({ success: true, invoiceId: newId });
  });

  // GET /api/invoices
  // يجلب جميع الفواتير من قاعدة البيانات لعرضها في لوحة التحكم
  app.get('/api/invoices', async (req, res) => {
    let client;
    try {
      client = await getDbClient();
      const query = `
        SELECT i.id, i.invoice_number, 
               COALESCE(i.customer_name, i.client_name, '') as customer_name, 
               COALESCE(i.project_name, '') as project_name, 
               TO_CHAR(COALESCE(i.invoice_date, i.date), 'YYYY-MM-DD') as invoice_date, 
               COALESCE(i.currency, 'ل.س') as currency,
               COALESCE(i.grand_total, i.total_amount, 0) as grand_total,
               COALESCE(i.notes, '') as notes,
               COALESCE(SUM(CASE WHEN ii.is_paid THEN ii.line_total ELSE 0 END), 0) as amount_paid
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        GROUP BY i.id
        ORDER BY i.id DESC;
      `;
      const result = await client.query(query);
      
      const invoices = result.rows.map(row => ({
        id: row.id,
        invoice_number: row.invoice_number,
        customer_name: row.customer_name,
        project_name: row.project_name,
        invoice_date: row.invoice_date,
        currency: row.currency || 'ل.س',
        grand_total: parseFloat(row.grand_total),
        notes: row.notes || '',
        amount_paid: parseFloat(row.amount_paid)
      }));
      
      return res.json(invoices);
    } catch (error) {
      console.warn('Database query error:', error);
    } finally {
      if (client) client.release();
    }

    // Fallback store
    const summaryList = fallbackInvoices.map(inv => {
      const amountPaid = inv.items
        .filter(item => item.isPaid)
        .reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        project_name: inv.project_name,
        invoice_date: inv.invoice_date,
        currency: inv.currency || 'ل.س',
        grand_total: inv.grand_total,
        notes: inv.notes || '',
        amount_paid: amountPaid
      };
    });

    res.json(summaryList);
  });

  // GET /api/invoices/next-number
  app.get('/api/invoices/next-number', async (req, res) => {
    const currentYear = new Date().getFullYear();
    const prefix = `CV-${currentYear}-`;

    let client;
    try {
      client = await getDbClient();
      const query = `
        SELECT invoice_number 
        FROM invoices 
        WHERE invoice_number LIKE $1 
        ORDER BY id DESC 
        LIMIT 1;
      `;
      const result = await client.query(query, [`${prefix}%`]);
      
      let nextNumberStr = '001';
      if (result.rows.length > 0) {
        const lastInvoiceNumber = result.rows[0].invoice_number;
        const parts = lastInvoiceNumber.split('-');
        if (parts.length === 3) {
          const lastSeq = parseInt(parts[2], 10);
          if (!isNaN(lastSeq)) {
            nextNumberStr = (lastSeq + 1).toString().padStart(3, '0');
          }
        }
      }
      return res.json({ nextInvoiceNumber: `${prefix}${nextNumberStr}` });
    } catch (error) {
      console.warn('Database next-number error:', error);
    } finally {
      if (client) client.release();
    }

    // Fallback next number calculation
    let maxSeq = 0;
    fallbackInvoices.forEach(inv => {
      if (inv.invoice_number && inv.invoice_number.startsWith(prefix)) {
        const parts = inv.invoice_number.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    const nextSeqStr = (maxSeq + 1).toString().padStart(3, '0');
    res.json({ nextInvoiceNumber: `${prefix}${nextSeqStr}` });
  });

  // GET /api/invoices/:id
  // يجلب تفاصيل الفاتورة مع بنودها
  app.get('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;

    let client;
    try {
      client = await getDbClient();
      const invoiceQuery = `SELECT * FROM invoices WHERE id::text = $1 OR invoice_number = $1 LIMIT 1;`;
      const invoiceResult = await client.query(invoiceQuery, [id]);
      
      if (invoiceResult.rows.length > 0) {
        const invoice = invoiceResult.rows[0];
        const itemsQuery = `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC;`;
        const itemsResult = await client.query(itemsQuery, [invoice.id]);
        
        const parsedInvoice = {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          customerName: invoice.customer_name || invoice.client_name || '',
          projectName: invoice.project_name || '',
          currency: invoice.currency || 'ل.س',
          invoiceDate: new Date(invoice.invoice_date || invoice.date).toISOString().split('T')[0],
          subtotal: parseFloat(invoice.subtotal || 0),
          discount: parseFloat(invoice.discount || 0),
          grandTotal: parseFloat(invoice.grand_total || invoice.total_amount || 0),
          notes: invoice.notes || '',
          items: itemsResult.rows.map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: parseInt(item.quantity, 10),
            unitPrice: parseFloat(item.unit_price),
            lineTotal: parseFloat(item.line_total),
            isPaid: !!item.is_paid
          }))
        };
        return res.json(parsedInvoice);
      }
    } catch (error) {
      console.warn('Database fetch invoice error:', error);
    } finally {
      if (client) client.release();
    }

    // Fallback store lookup
    const found = fallbackInvoices.find(inv => String(inv.id) === String(id));
    if (!found) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      id: found.id,
      invoiceNumber: found.invoice_number,
      customerName: found.customer_name,
      projectName: found.project_name,
      currency: found.currency || 'ل.س',
      invoiceDate: found.invoice_date,
      subtotal: found.subtotal,
      discount: found.discount,
      grandTotal: found.grand_total,
      notes: found.notes || '',
      items: found.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        isPaid: item.isPaid
      }))
    });
  });

  // PUT /api/invoices/:id
  // تحديث الفاتورة وبنودها بالكامل
  app.put('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;
    const { 
      invoice_number, 
      customer_name, 
      project_name, 
      invoice_date, 
      currency = 'ل.س',
      subtotal, 
      discount, 
      grand_total,
      notes = '',
      items 
    } = req.body;

    let client;
    try {
      client = await getDbClient();
      await client.query('BEGIN');

      const clientName = (req.body.client_name || customer_name || '').trim();
      const dateVal = invoice_date || req.body.date || new Date().toISOString().split('T')[0];
      const totalVal = grand_total ?? req.body.total_amount ?? 0;
      const statusVal = req.body.status || 'unpaid';
      const notesVal = (notes || req.body.notes || '').trim();

      const invoiceUpdateQuery = `
        UPDATE invoices 
        SET invoice_number = $1,
            client_name = $2,
            customer_name = $2,
            project_name = $3,
            date = $4,
            invoice_date = $4,
            status = $5,
            currency = $6,
            subtotal = $7,
            discount = $8,
            grand_total = $9,
            total_amount = $9,
            notes = $10
        WHERE id::text = $11 OR invoice_number = $11
        RETURNING id;
      `;
      const invoiceValues = [
        invoice_number,
        clientName,
        project_name,
        dateVal,
        statusVal,
        currency || 'ل.س',
        subtotal || 0,
        discount || 0,
        totalVal,
        notesVal,
        id
      ];
      
      const invoiceResult = await client.query(invoiceUpdateQuery, invoiceValues);
      if (invoiceResult.rowCount !== 0) {
        const returnedId = invoiceResult.rows[0].id;
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1;', [returnedId]);

        if (items && items.length > 0) {
          const itemInsertQuery = `
            INSERT INTO invoice_items 
            (invoice_id, description, quantity, unit_price, line_total, is_paid)
            VALUES ($1, $2, $3, $4, $5, $6);
          `;
          
          for (const item of items) {
            const qty = Number(item.quantity) || 1;
            const unitPrice = Number(item.unitPrice) || 0;
            const lineTotal = qty * unitPrice;
            const isPaid = Boolean(item.is_paid ?? item.isPaid);
            const description = item.description || 'بند خدمة';
            const itemValues = [returnedId, description, qty, unitPrice, lineTotal, isPaid];
            await client.query(itemInsertQuery, itemValues);
          }
        }

        await client.query('COMMIT');
        return res.json({ success: true, message: 'Invoice updated successfully', invoiceId: returnedId });
      }
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.warn('Database update error:', error);
    } finally {
      if (client) client.release();
    }

    // Fallback store update
    const invoiceIndex = fallbackInvoices.findIndex(inv => String(inv.id) === String(id) || inv.invoice_number === id);
    if (invoiceIndex !== -1) {
      const updatedItems: MemoryInvoiceItem[] = (items || []).map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          id: item.id ? Number(item.id) : nextItemId++,
          description: item.description || 'بند خدمة',
          quantity: qty,
          unitPrice: unitPrice,
          lineTotal: qty * unitPrice,
          isPaid: Boolean(item.is_paid ?? item.isPaid)
        };
      });

      fallbackInvoices[invoiceIndex] = {
        id: fallbackInvoices[invoiceIndex].id,
        invoice_number: invoice_number || fallbackInvoices[invoiceIndex].invoice_number,
        customer_name: customer_name ?? fallbackInvoices[invoiceIndex].customer_name,
        project_name: project_name ?? fallbackInvoices[invoiceIndex].project_name,
        invoice_date: invoice_date ?? fallbackInvoices[invoiceIndex].invoice_date,
        currency: currency || fallbackInvoices[invoiceIndex].currency || 'ل.س',
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        grand_total: Number(grand_total) || 0,
        notes: notes || '',
        items: updatedItems
      };

      return res.json({ success: true, message: 'Invoice updated successfully', invoiceId: fallbackInvoices[invoiceIndex].id });
    }

    res.status(404).json({ error: 'Invoice not found' });
  });

  // PATCH /api/invoice-items/:id/toggle-paid
  // تحديث حالة الدفع لبند معين من لوحة التحكم
  app.patch('/api/invoice-items/:id/toggle-paid', async (req, res) => {
    const { id } = req.params;
    const { is_paid } = req.body;

    let client;
    try {
      client = await getDbClient();
      const updateQuery = `
        UPDATE invoice_items 
        SET is_paid = $1 
        WHERE id = $2 
        RETURNING id;
      `;
      const result = await client.query(updateQuery, [is_paid, id]);
      if (result.rowCount !== 0) {
        return res.json({ success: true });
      }
    } catch (error) {
      console.warn('Database toggle-paid error:', error);
    } finally {
      if (client) client.release();
    }

    // Fallback store update
    for (const inv of fallbackInvoices) {
      const item = inv.items.find(i => String(i.id) === String(id));
      if (item) {
        item.isPaid = Boolean(is_paid);
        return res.json({ success: true });
      }
    }

    res.json({ success: true });
  });

  // DELETE /api/invoices/:id
  app.delete('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;

    let client;
    try {
      client = await getDbClient();
      const deleteQuery = 'DELETE FROM invoices WHERE id::text = $1 OR invoice_number = $1 RETURNING id;';
      const result = await client.query(deleteQuery, [id]);
      if (result.rowCount !== 0) {
        return res.json({ success: true, message: 'Invoice deleted successfully' });
      }
    } catch (error) {
      console.warn('Database delete error:', error);
    } finally {
      if (client) client.release();
    }

    const index = fallbackInvoices.findIndex(inv => String(inv.id) === String(id) || inv.invoice_number === id);
    if (index !== -1) {
      fallbackInvoices.splice(index, 1);
      return res.json({ success: true, message: 'Invoice deleted successfully' });
    }

    res.json({ success: true, message: 'Invoice deleted successfully' });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbConnected: isDbConnected });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
