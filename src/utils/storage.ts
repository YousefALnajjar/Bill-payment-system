/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceMock } from '../components/AdminDashboard';

export const LOCAL_INVOICES_KEY = 'cardiovision_local_invoices';
export const LEGACY_INVOICES_KEY = 'cardiovision_invoices_cache';
export const LOCAL_DETAILS_KEY = 'cardiovision_local_invoice_details';

export interface LocalInvoiceDetail {
  id: string;
  invoiceNumber: string;
  customerName: string;
  projectName: string;
  invoiceDate: string;
  currency?: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  amountPaid?: number;
  amountDue?: number;
  notes?: string;
  items: Array<{
    id: string | number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal?: number;
    isPaid?: boolean;
    is_paid?: boolean;
  }>;
}

export const DEFAULT_SEED_INVOICES: InvoiceMock[] = [
  {
    id: 'local-1',
    invoice_number: 'CV-2026-001',
    customer_name: 'مستشفى الأمل التخصصي',
    project_name: 'صيانة ومعايرة أجهزة القسطرة القلبية',
    invoice_date: '2026-02-15',
    due_date: '2026-03-15',
    currency: '$',
    grand_total: 4500,
    amount_paid: 0,
    notes: 'تنبيه: تجاوزت الفاتورة تاريخ الاستحقاق بمقدار أكثر من 20 يوماً - يرجى المتابعة والتحصيل الفوري',
  },
  {
    id: 'local-2',
    invoice_number: 'CV-2026-002',
    customer_name: 'مجمع الكندي الطبي',
    project_name: 'تطوير برمجيات أرشفة تخطيط القلب ومزامنة التقارير',
    invoice_date: '2026-02-28',
    due_date: '2026-03-25',
    currency: 'ل.س',
    grand_total: 8500000,
    amount_paid: 2000000,
    notes: 'دفعة أولى مسددة 2,000,000 ل.س - المتبقي تجاوز تاريخ الاستحقاق',
  },
  {
    id: 'local-3',
    invoice_number: 'CV-2026-003',
    customer_name: 'مركز الشفاء لجراحة القلب',
    project_name: 'توريد مجسات ومستشعرات تشخيصية دقيقة',
    invoice_date: '2026-04-01',
    due_date: '2026-05-15',
    currency: '$',
    grand_total: 3200,
    amount_paid: 1600,
    notes: 'تاريخ الاستحقاق ساري المفعول حتى 15 مايو 2026',
  },
  {
    id: 'local-4',
    invoice_number: 'CV-2026-004',
    customer_name: 'عيادات النور الاستشارية',
    project_name: 'نظام إدارة بيانات المرضى والفواتير',
    invoice_date: '2026-03-10',
    due_date: '2026-04-10',
    currency: '$',
    grand_total: 2500,
    amount_paid: 2500,
    notes: 'تم سداد كامل قيمة الفاتورة بنجاح',
  },
];

/**
 * Get all invoices stored exclusively in Local Storage.
 */
export function getLocalInvoices(): InvoiceMock[] {
  try {
    const raw = localStorage.getItem(LOCAL_INVOICES_KEY) || localStorage.getItem(LEGACY_INVOICES_KEY);
    if (!raw) {
      // Seed with initial realistic invoices so the user immediately sees the system features
      saveLocalInvoices(DEFAULT_SEED_INVOICES);
      return DEFAULT_SEED_INVOICES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    if (Array.isArray(parsed) && parsed.length === 0) {
      // If empty array explicitly stored, return it
      return [];
    }
    return [];
  } catch (err) {
    console.warn('Failed to read local invoices from localStorage:', err);
    return [];
  }
}

/**
 * Save the entire local invoices list to Local Storage.
 */
export function saveLocalInvoices(invoices: InvoiceMock[]): void {
  try {
    const serialized = JSON.stringify(invoices);
    localStorage.setItem(LOCAL_INVOICES_KEY, serialized);
    localStorage.setItem(LEGACY_INVOICES_KEY, serialized);
    // Dispatch custom event to notify all components
    window.dispatchEvent(new Event('cardiovision_local_invoices_updated'));
  } catch (err) {
    console.warn('Failed to save local invoices to localStorage:', err);
  }
}

/**
 * Save or update a single invoice in Local Storage (Local First).
 */
export function saveLocalInvoice(summary: InvoiceMock, detail?: LocalInvoiceDetail): void {
  try {
    const current = getLocalInvoices();
    const existingIndex = current.findIndex(inv => 
      String(inv.id) === String(summary.id) || 
      (inv.invoice_number && summary.invoice_number && inv.invoice_number === summary.invoice_number)
    );

    let updated: InvoiceMock[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...summary };
    } else {
      updated = [summary, ...current];
    }

    saveLocalInvoices(updated);

    if (detail) {
      saveLocalInvoiceDetail(String(summary.id || summary.invoice_number), detail);
      if (summary.invoice_number) {
        saveLocalInvoiceDetail(summary.invoice_number, detail);
      }
    }
  } catch (err) {
    console.warn('Failed to save local invoice:', err);
  }
}

/**
 * Remove an invoice from Local Storage.
 */
export function removeLocalInvoice(id: string): void {
  try {
    const current = getLocalInvoices();
    const updated = current.filter(inv => 
      String(inv.id) !== String(id) && 
      inv.invoice_number !== id
    );
    saveLocalInvoices(updated);

    const details = getAllLocalInvoiceDetails();
    delete details[String(id)];
    localStorage.setItem(LOCAL_DETAILS_KEY, JSON.stringify(details));
    window.dispatchEvent(new Event('cardiovision_local_invoices_updated'));
  } catch (err) {
    console.warn('Failed to remove local invoice:', err);
  }
}

/**
 * Get all stored local invoice details map.
 */
function getAllLocalInvoiceDetails(): Record<string, LocalInvoiceDetail> {
  try {
    const raw = localStorage.getItem(LOCAL_DETAILS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (err) {
    console.warn('Failed to read invoice details from localStorage:', err);
    return {};
  }
}

/**
 * Get full detail for a local invoice.
 */
export function getLocalInvoiceDetail(id: string): LocalInvoiceDetail | null {
  try {
    const all = getAllLocalInvoiceDetails();
    if (all[String(id)]) {
      return all[String(id)];
    }

    // Fallback by looking in summary list
    const summaries = getLocalInvoices();
    const summary = summaries.find(inv => String(inv.id) === String(id) || inv.invoice_number === id);
    if (summary) {
      return {
        id: String(summary.id || summary.invoice_number),
        invoiceNumber: summary.invoice_number,
        customerName: summary.customer_name,
        projectName: summary.project_name,
        invoiceDate: summary.invoice_date,
        currency: summary.currency || 'ل.س',
        subtotal: Number(summary.grand_total) || 0,
        discount: 0,
        grandTotal: Number(summary.grand_total) || 0,
        amountPaid: Number(summary.amount_paid) || 0,
        amountDue: Math.max((Number(summary.grand_total) || 0) - (Number(summary.amount_paid) || 0), 0),
        notes: summary.notes || '',
        items: [
          {
            id: 1,
            description: summary.project_name || 'خدمة تقنية',
            quantity: 1,
            unitPrice: Number(summary.grand_total) || 0,
            lineTotal: Number(summary.grand_total) || 0,
            isPaid: Number(summary.amount_paid) >= Number(summary.grand_total)
          }
        ]
      };
    }
    return null;
  } catch (err) {
    console.warn('Failed to get local invoice detail:', err);
    return null;
  }
}

/**
 * Save full detail for a local invoice.
 */
export function saveLocalInvoiceDetail(id: string, detail: LocalInvoiceDetail): void {
  try {
    const all = getAllLocalInvoiceDetails();
    all[String(id)] = detail;
    localStorage.setItem(LOCAL_DETAILS_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Failed to save local invoice detail:', err);
  }
}

/**
 * Generates the next sequential invoice number consistently on frontend.
 */
export function generateNextInvoiceNumber(): string {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `CV-${currentYear}-`;
    const localInvoices = getLocalInvoices();
    
    let maxSequence = 0;
    localInvoices.forEach(inv => {
      if (inv.invoice_number && inv.invoice_number.startsWith(prefix)) {
        const parts = inv.invoice_number.split('-');
        const seqStr = parts[parts.length - 1];
        const num = parseInt(seqStr, 10);
        if (!isNaN(num) && num > maxSequence) {
          maxSequence = num;
        }
      }
    });

    const nextSeq = maxSequence + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  } catch (err) {
    return `CV-${new Date().getFullYear()}-001`;
  }
}
