/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Invoice, { InvoiceSummary } from './components/Invoice';
import AdminDashboard, { InvoiceMock } from './components/AdminDashboard';
import { LayoutDashboard, Receipt } from 'lucide-react';
import { 
  getLocalInvoices, 
  saveLocalInvoice, 
  removeLocalInvoice 
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'invoice' | 'dashboard'>('dashboard');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // 1. Separate State for Local Storage Invoices (Strictly Local)
  const [localInvoices, setLocalInvoices] = useState<InvoiceMock[]>(() => {
    return getLocalInvoices();
  });

  // 2. Separate State for Neon DB Cloud Invoices (Strictly Cloud - NEVER merged with local)
  const [cloudInvoices, setCloudInvoices] = useState<InvoiceMock[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Listen to local storage updates across all components
  useEffect(() => {
    const reloadLocal = () => {
      setLocalInvoices(getLocalInvoices());
    };
    window.addEventListener('cardiovision_local_invoices_updated', reloadLocal);
    window.addEventListener('storage', reloadLocal);
    return () => {
      window.removeEventListener('cardiovision_local_invoices_updated', reloadLocal);
      window.removeEventListener('storage', reloadLocal);
    };
  }, []);

  // Fetch Cloud Invoices exclusively from Neon DB via GET /api/invoices
  const fetchCloudInvoices = useCallback(async () => {
    try {
      setIsLoadingCloud(true);
      setCloudError(null);
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Cloud state strictly updated without touching local storage
          setCloudInvoices(data);
        }
      } else {
        setCloudError('تعذر الاتصال بقاعدة بيانات Neon سحابياً');
      }
    } catch (err: any) {
      console.warn('Neon DB cloud fetch error:', err);
      setCloudError('انقطاع في الاتصال بالسيرفر السحابي');
    } finally {
      setIsLoadingCloud(false);
    }
  }, []);

  useEffect(() => {
    fetchCloudInvoices();
  }, [fetchCloudInvoices]);

  // When a new invoice is created (Save Local First)
  const handleInvoiceCreated = (newInvoice: InvoiceSummary) => {
    const summary: InvoiceMock = newInvoice as InvoiceMock;
    
    // 1. Save to local storage synchronously
    saveLocalInvoice(summary);
    
    // 2. Refresh local state immediately
    setLocalInvoices(getLocalInvoices());
    
    // 3. Refresh cloud state to reflect the new invoice from Neon DB
    fetchCloudInvoices();
  };

  const handleInvoiceUpdated = (updatedInvoice: InvoiceSummary) => {
    const summary: InvoiceMock = updatedInvoice as InvoiceMock;
    
    // 1. Update local storage
    saveLocalInvoice(summary);
    setLocalInvoices(getLocalInvoices());
    
    // 2. Refresh cloud state
    fetchCloudInvoices();
  };

  const handleDeleteLocalInvoice = (id: string) => {
    removeLocalInvoice(id);
    setLocalInvoices(getLocalInvoices());
  };

  const handleDeleteCloudInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCloudInvoices(prev => prev.filter(inv => String(inv.id) !== String(id) && inv.invoice_number !== id));
      }
    } catch (err) {
      console.error('Error deleting cloud invoice:', err);
    }
  };

  const handleEditInvoice = (id: string) => {
    setEditingInvoiceId(id);
    setActiveTab('invoice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateNewInvoice = () => {
    setEditingInvoiceId(null);
    setActiveTab('invoice');
  };

  const handleReturnToDashboard = () => {
    setLocalInvoices(getLocalInvoices());
    setEditingInvoiceId(null);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans print:bg-white">
      {/* Navigation - Hidden when printing */}
      <nav className="no-print bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-8 h-16">
            <button
              onClick={() => {
                setLocalInvoices(getLocalInvoices());
                setActiveTab('dashboard');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard size={18} />
              لوحة التحكم
            </button>
            <button
              onClick={handleCreateNewInvoice}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'invoice' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Receipt size={18} />
              منشئ الفواتير
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={activeTab === 'invoice' ? 'py-6 print:py-0' : ''}>
        {activeTab === 'dashboard' ? (
          <AdminDashboard 
            onEditInvoice={handleEditInvoice}
            localInvoices={localInvoices}
            cloudInvoices={cloudInvoices}
            isLoadingCloud={isLoadingCloud}
            cloudError={cloudError}
            onRefreshCloud={fetchCloudInvoices}
            onDeleteLocalInvoice={handleDeleteLocalInvoice}
            onDeleteCloudInvoice={handleDeleteCloudInvoice}
          />
        ) : (
          <Invoice 
            invoiceId={editingInvoiceId} 
            onCancel={handleReturnToDashboard}
            onInvoiceCreated={handleInvoiceCreated}
            onInvoiceUpdated={handleInvoiceUpdated}
            onSaved={() => {
              handleReturnToDashboard();
            }}
          />
        )}
      </div>
    </div>
  );
}
