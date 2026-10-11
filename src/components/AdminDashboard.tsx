import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Printer, 
  Trash2, 
  FileText, 
  TrendingUp, 
  Building2, 
  Calendar, 
  Download, 
  FileDown,
  Filter, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  MapPin, 
  Edit3,
  HardDrive,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Invoice from './Invoice';
import { getLocalInvoices, getLocalInvoiceDetail } from '../utils/storage';
import ProfileModal, { SupervisorProfile } from './ProfileModal';

export interface AdminDashboardProps {
  onEditInvoice?: (id: string) => void;
  localInvoices?: InvoiceMock[];
  cloudInvoices?: InvoiceMock[];
  isLoadingCloud?: boolean;
  cloudError?: string | null;
  onDeleteLocalInvoice?: (id: string) => void;
  onDeleteCloudInvoice?: (id: string) => void;
  onRefreshCloud?: () => void;
  onUpdateInvoice?: (invoice: InvoiceMock) => void;
  // Compatibility props
  invoices?: InvoiceMock[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export type InvoiceMock = {
  id: string | number;
  invoice_number: string;
  customer_name: string;
  project_name: string;
  invoice_date: string;
  due_date?: string;
  dueDate?: string;
  currency?: string;
  grand_total: number;
  amount_paid: number;
  notes?: string;
};

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  projectName: string;
  invoiceDate: string;
  dueDate?: string;
  currency?: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isPaid: boolean;
  }>;
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("en-US").format(num);
};

export const checkOverdueInvoice = (invoice: InvoiceMock) => {
  const grandTotal = Number(invoice.grand_total) || 0;
  const amountPaid = Number(invoice.amount_paid) || 0;
  const isFullyPaid = grandTotal > 0 && amountPaid >= grandTotal;
  
  if (isFullyPaid) {
    return { isOverdue: false, daysOverdue: 0, dueDate: null };
  }

  // Check explicit due date first
  const explicitDue = invoice.due_date || invoice.dueDate;
  if (explicitDue) {
    const dueDateObj = new Date(explicitDue);
    if (!isNaN(dueDateObj.getTime())) {
      dueDateObj.setHours(23, 59, 59, 999);
      const now = new Date();
      if (now > dueDateObj) {
        const diffTime = now.getTime() - dueDateObj.getTime();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        return { isOverdue: true, daysOverdue: diffDays, dueDate: explicitDue };
      }
      return { isOverdue: false, daysOverdue: 0, dueDate: explicitDue };
    }
  }

  // Fallback: 30 days credit grace period from invoice_date if not paid
  if (invoice.invoice_date) {
    const invDateObj = new Date(invoice.invoice_date);
    if (!isNaN(invDateObj.getTime())) {
      const graceDueDate = new Date(invDateObj);
      graceDueDate.setDate(graceDueDate.getDate() + 30);
      graceDueDate.setHours(23, 59, 59, 999);
      const now = new Date();
      if (now > graceDueDate) {
        const diffTime = now.getTime() - graceDueDate.getTime();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        return { isOverdue: true, daysOverdue: diffDays, dueDate: graceDueDate.toISOString().split('T')[0] };
      }
    }
  }

  return { isOverdue: false, daysOverdue: 0, dueDate: null };
};

export const DEFAULT_SUPERVISORS: SupervisorProfile[] = [
  {
    id: 'rola',
    name: 'م. رولا الصمادي',
    role: 'مشرفة النظام',
    email: 'rola.smadi@cardiovision.com',
    avatarLetter: 'ر',
    gradient: 'from-rose-500 to-pink-600',
    photoUrl: '',
  },
  {
    id: 'mohammed',
    name: 'م. محمد عبدالرحمن',
    role: 'مشرف النظام',
    email: 'm.abdelrahman@cardiovision.com',
    avatarLetter: 'م',
    gradient: 'from-emerald-500 to-teal-600',
    photoUrl: '',
  },
  {
    id: 'youssef',
    name: 'م. يوسف النجار',
    role: 'مدير النظام',
    email: 'y99286549@gmail.com',
    avatarLetter: 'ي',
    gradient: 'from-blue-600 to-indigo-600',
    photoUrl: '',
  },
];

export default function AdminDashboard({ 
  onEditInvoice,
  localInvoices: propLocalInvoices = [],
  cloudInvoices: propCloudInvoices = [],
  isLoadingCloud = false,
  cloudError = null,
  onDeleteLocalInvoice,
  onDeleteCloudInvoice,
  onRefreshCloud,
  onUpdateInvoice,
  invoices: fallbackInvoicesList,
  isLoading: fallbackIsLoading
}: AdminDashboardProps = {}) {
  // Separate states - NEVER merged
  const [localInvoicesState, setLocalInvoicesState] = useState<InvoiceMock[]>(() => {
    if (propLocalInvoices && propLocalInvoices.length > 0) return propLocalInvoices;
    return getLocalInvoices();
  });

  useEffect(() => {
    if (propLocalInvoices && propLocalInvoices.length > 0) {
      setLocalInvoicesState(propLocalInvoices);
    } else {
      setLocalInvoicesState(getLocalInvoices());
    }
  }, [propLocalInvoices]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setLocalInvoicesState(getLocalInvoices());
    };
    window.addEventListener('cardiovision_local_invoices_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cardiovision_local_invoices_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const localList = localInvoicesState;
  const cloudList = propCloudInvoices;

  const [activeTableView, setActiveTableView] = useState<'both' | 'local' | 'cloud'>('both');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial' | 'overdue'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [chartCurrency, setChartCurrency] = useState<'ALL' | 'SYP' | 'USD'>('ALL');

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [cloudCurrentPage, setCloudCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Reset pagination to first page when searching or changing filters
  useEffect(() => {
    setLocalCurrentPage(1);
    setCloudCurrentPage(1);
  }, [searchTerm, selectedCustomer, selectedCurrency, startDate, endDate, paymentStatus, onlyOverdue]);

  // Modal states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<{ id: string; invoiceNumber: string; source: 'local' | 'cloud' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Supervisor Profiles State & Modal (Personalization)
  const [supervisors, setSupervisors] = useState<SupervisorProfile[]>(() => {
    try {
      const saved = localStorage.getItem('cardiovision_supervisors_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return DEFAULT_SUPERVISORS.map(def => {
            const found = parsed.find((p: any) => p && p.id === def.id);
            return found ? { ...def, ...found } : def;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load supervisor profiles from localStorage', err);
    }
    return DEFAULT_SUPERVISORS;
  });

  const [selectedProfile, setSelectedProfile] = useState<SupervisorProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileToast, setProfileToast] = useState<string | null>(null);

  const handleSaveProfile = (updated: SupervisorProfile) => {
    setSupervisors(prev => {
      const nextList = prev.map(sup => sup.id === updated.id ? updated : sup);
      try {
        localStorage.setItem('cardiovision_supervisors_profiles', JSON.stringify(nextList));
      } catch (err) {
        console.error('Error saving profiles to localStorage:', err);
      }
      return nextList;
    });
    setProfileToast(`تم تحديث الملف الشخصي لـ ${updated.name} بنجاح`);
    setTimeout(() => {
      setProfileToast(null);
    }, 4000);
  };

  // Printing states
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState<string | null>(null);
  const [printData, setPrintData] = useState<(InvoiceDetail & { amountPaid: number, amountDue: number }) | null>(null);

  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handleExportPdf = async (id: string | number, invoiceNumber: string, source?: 'local' | 'cloud') => {
    const stringId = String(id);
    setIsPrinting(stringId);
    try {
      let data: any = null;

      // 1. If local invoice, load immediately from persistent local storage
      if (source === 'local') {
        const localDetail = getLocalInvoiceDetail(stringId);
        if (localDetail) {
          data = {
            id: localDetail.id || stringId,
            invoiceNumber: localDetail.invoiceNumber || invoiceNumber,
            customerName: localDetail.customerName || 'عميل محلي',
            projectName: localDetail.projectName || 'مشروع هندسي',
            invoiceDate: localDetail.invoiceDate ? localDetail.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
            currency: localDetail.currency || 'ل.س',
            subtotal: Number(localDetail.subtotal) || Number(localDetail.grandTotal) || 0,
            discount: Number(localDetail.discount) || 0,
            grandTotal: Number(localDetail.grandTotal) || 0,
            notes: localDetail.notes || '',
            items: (localDetail.items && localDetail.items.length > 0 ? localDetail.items : [
              {
                id: 1,
                description: localDetail.projectName || 'مشروع هندسي وتقني',
                quantity: 1,
                unitPrice: Number(localDetail.grandTotal) || 0,
                lineTotal: Number(localDetail.grandTotal) || 0,
                isPaid: Number(localDetail.amountPaid || 0) >= Number(localDetail.grandTotal || 0)
              }
            ]).map((i: any, idx: number) => ({
              id: i.id || idx + 1,
              description: i.description || 'خدمة تقنية',
              quantity: Number(i.quantity) || 1,
              unitPrice: Number(i.unitPrice) || 0,
              lineTotal: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
              isPaid: Boolean(i.isPaid ?? i.is_paid)
            }))
          };
        }
      }

      // 2. If not local or not found, try fetching from server API
      if (!data) {
        try {
          const res = await fetch(`/api/invoices/${id}`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (networkErr) {
          console.warn('Network error fetching invoice detail, falling back to local storage:', networkErr);
        }
      }

      // 3. Fallback to local storage if API was unreachable
      if (!data) {
        const localDetail = getLocalInvoiceDetail(stringId);
        if (localDetail) {
          data = {
            id: localDetail.id || stringId,
            invoiceNumber: localDetail.invoiceNumber || invoiceNumber,
            customerName: localDetail.customerName || 'عميل',
            projectName: localDetail.projectName || 'مشروع',
            invoiceDate: localDetail.invoiceDate ? localDetail.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
            currency: localDetail.currency || 'ل.س',
            subtotal: Number(localDetail.subtotal) || Number(localDetail.grandTotal) || 0,
            discount: Number(localDetail.discount) || 0,
            grandTotal: Number(localDetail.grandTotal) || 0,
            notes: localDetail.notes || '',
            items: (localDetail.items && localDetail.items.length > 0 ? localDetail.items : [
              {
                id: 1,
                description: localDetail.projectName || 'خدمة تقنية',
                quantity: 1,
                unitPrice: Number(localDetail.grandTotal) || 0,
                lineTotal: Number(localDetail.grandTotal) || 0,
                isPaid: Number(localDetail.amountPaid || 0) >= Number(localDetail.grandTotal || 0)
              }
            ]).map((i: any, idx: number) => ({
              id: i.id || idx + 1,
              description: i.description || 'خدمة تقنية',
              quantity: Number(i.quantity) || 1,
              unitPrice: Number(i.unitPrice) || 0,
              lineTotal: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
              isPaid: Boolean(i.isPaid ?? i.is_paid)
            }))
          };
        }
      }

      if (!data) throw new Error("لم يتم العثور على بيانات الفاتورة لتصدير ملف PDF");
      
      const amountPaid = (data.items || []).filter((i: any) => i.isPaid).reduce((sum: number, item: any) => sum + (item.lineTotal || 0), 0);
      const amountDue = Math.max(data.grandTotal - amountPaid, 0);

      setPrintData({ ...data, amountPaid, amountDue });

      await new Promise(resolve => setTimeout(resolve, 700));

      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      const htmlToImage = (window as any).htmlToImage;
      const jsPDF = (window as any).jspdf.jsPDF;
      
      const element = printRef.current;
      if (!element) throw new Error("Print template not found");

      element.style.width = '794px';
      element.style.height = 'auto';
      element.style.minHeight = 'auto';

      await new Promise(resolve => setTimeout(resolve, 400));

      const fullWidth = 794;
      const fullHeight = Math.ceil(element.scrollHeight || element.offsetHeight);

      let dataUrl = '';
      try {
        dataUrl = await htmlToImage.toPng(element, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: fullWidth,
          height: fullHeight,
          style: {
            width: '794px',
            height: `${fullHeight}px`,
            transform: 'scale(1)',
            transformOrigin: 'top left',
            margin: '0',
            overflow: 'visible',
          }
        });
      } catch (imgErr) {
        console.warn("htmlToImage fallback to html2canvas:", imgErr);
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
        const html2canvas = (window as any).html2canvas;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        dataUrl = canvas.toDataURL('image/png');
      }

      const pdfWidth = 210;
      const pdfHeight = (fullHeight * pdfWidth) / fullWidth;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, Math.max(297, pdfHeight)],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CardioVision_Invoice_${invoiceNumber || stringId}.pdf`);

    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تصدير وتحميل الفاتورة كـ PDF");
    } finally {
      setIsPrinting(null);
      setPrintData(null);
    }
  };

  const handlePrintInvoice = handleExportPdf;

  const handleEditClick = (id: string | number) => {
    const stringId = String(id);
    if (onEditInvoice) {
      onEditInvoice(stringId);
    } else {
      setSelectedInvoiceId(stringId);
      setIsViewModalOpen(true);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      if (deletingTarget.source === 'local') {
        onDeleteLocalInvoice?.(deletingTarget.id);
      } else {
        await onDeleteCloudInvoice?.(deletingTarget.id);
      }
      setDeletingTarget(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter helper applied separately to each table (Search by invoice number or customer name)
  const applyFilters = (list: InvoiceMock[]) => {
    const term = searchTerm.trim().toLowerCase();
    return list.filter(inv => {
      const invoiceNumber = (inv.invoice_number || '').toLowerCase();
      const invoiceId = String(inv.id || '').toLowerCase();
      const customerName = (inv.customer_name || '').toLowerCase();
      const projectName = (inv.project_name || '').toLowerCase();

      const matchesSearch = !term ||
        invoiceNumber.includes(term) ||
        invoiceId.includes(term) ||
        customerName.includes(term) ||
        projectName.includes(term);
      
      const matchesCustomer = selectedCustomer ? inv.customer_name === selectedCustomer : true;
      const matchesCurrency = selectedCurrency === 'all'
        ? true
        : (selectedCurrency === '$'
            ? (inv.currency === '$' || inv.currency?.trim() === '$')
            : (inv.currency !== '$' && inv.currency?.trim() !== '$'));
      const matchesStartDate = startDate ? new Date(inv.invoice_date) >= new Date(startDate) : true;
      const matchesEndDate = endDate ? new Date(inv.invoice_date) <= new Date(endDate) : true;
      
      let matchesPayment = true;
      const grandTotal = Number(inv.grand_total) || 0;
      const amountPaid = Number(inv.amount_paid) || 0;
      const overdueStatus = checkOverdueInvoice(inv);

      if (paymentStatus === 'paid') {
        matchesPayment = amountPaid >= grandTotal && grandTotal > 0;
      } else if (paymentStatus === 'unpaid') {
        matchesPayment = amountPaid <= 0;
      } else if (paymentStatus === 'partial') {
        matchesPayment = amountPaid > 0 && amountPaid < grandTotal;
      } else if (paymentStatus === 'overdue') {
        matchesPayment = overdueStatus.isOverdue;
      }

      const matchesOverdueToggle = onlyOverdue ? overdueStatus.isOverdue : true;

      return matchesSearch && matchesCustomer && matchesCurrency && matchesStartDate && matchesEndDate && matchesPayment && matchesOverdueToggle;
    });
  };

  const filteredLocalInvoices = useMemo(() => applyFilters(localList), [localList, searchTerm, selectedCustomer, selectedCurrency, startDate, endDate, paymentStatus, onlyOverdue]);
  const filteredCloudInvoices = useMemo(() => applyFilters(cloudList), [cloudList, searchTerm, selectedCustomer, selectedCurrency, startDate, endDate, paymentStatus, onlyOverdue]);

  const uniqueCustomers = useMemo(() => {
    const custSet = new Set<string>();
    localList.forEach(i => i.customer_name && custSet.add(i.customer_name));
    cloudList.forEach(i => i.customer_name && custSet.add(i.customer_name));
    return Array.from(custSet);
  }, [localList, cloudList]);

  // Combined statistics for general view
  const { totalUSD, totalSYP, totalPaidUSD, totalPaidSYP } = useMemo(() => {
    let usd = 0;
    let syp = 0;
    let paidUsd = 0;
    let paidSyp = 0;

    // Use cloud list if available, else local list to avoid duplicates in stats
    const primaryList = cloudList.length > 0 ? cloudList : localList;

    primaryList.forEach((inv) => {
      const isUSD = inv.currency === '$' || inv.currency?.trim() === '$';
      const grandTotal = Number(inv.grand_total) || 0;
      const amountPaid = Number(inv.amount_paid) || 0;

      if (isUSD) {
        usd += grandTotal;
        paidUsd += amountPaid;
      } else {
        syp += grandTotal;
        paidSyp += amountPaid;
      }
    });

    return { totalUSD: usd, totalSYP: syp, totalPaidUSD: paidUsd, totalPaidSYP: paidSyp };
  }, [cloudList, localList]);

  // Overdue Statistics across active lists
  const overdueStats = useMemo(() => {
    let overdueCount = 0;
    let overdueAmountUSD = 0;
    let overdueAmountSYP = 0;

    const primaryList = cloudList.length > 0 ? cloudList : localList;
    primaryList.forEach((inv) => {
      const { isOverdue } = checkOverdueInvoice(inv);
      if (isOverdue) {
        overdueCount++;
        const remaining = Math.max((Number(inv.grand_total) || 0) - (Number(inv.amount_paid) || 0), 0);
        if (inv.currency === '$' || inv.currency?.trim() === '$') {
          overdueAmountUSD += remaining;
        } else {
          overdueAmountSYP += remaining;
        }
      }
    });

    return { overdueCount, overdueAmountUSD, overdueAmountSYP };
  }, [cloudList, localList]);

  // Monthly revenue chart data
  const monthlyRevenueData = useMemo(() => {
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const last6Months: any[] = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const name = `${monthNames[monthIndex]} ${year}`;
      const sortKey = year * 100 + monthIndex;
      last6Months.push({ name, revenueSYP: 0, revenueUSD: 0, sortKey, year, monthIndex });
    }

    const primaryList = cloudList.length > 0 ? cloudList : localList;
    primaryList.forEach((inv) => {
      const date = new Date(inv.invoice_date);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      
      const targetMonth = last6Months.find(m => m.year === year && m.monthIndex === monthIndex);
      if (targetMonth) {
        const isUSD = inv.currency === '$' || inv.currency?.trim() === '$';
        const val = Number(inv.grand_total) || 0;
        if (isUSD) {
          targetMonth.revenueUSD += val;
        } else {
          targetMonth.revenueSYP += val;
        }
      }
    });

    return last6Months;
  }, [cloudList, localList]);

  // Export CSV helper
  const handleExportCSV = (list: InvoiceMock[], fileName: string) => {
    const bom = '\uFEFF';
    const headers = ['رقم الفاتورة', 'الجهة / العميل', 'المشروع', 'التاريخ', 'العملة', 'الإجمالي'];
    const rows = list.map(inv => [
      inv.invoice_number,
      inv.customer_name,
      inv.project_name,
      inv.invoice_date,
      inv.currency || 'ل.س',
      inv.grand_total.toString()
    ]);
    
    const csvContent = bom + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reusable Table Subcomponent
  const renderInvoiceTable = (
    title: string,
    badgeText: string,
    badgeIcon: React.ReactNode,
    badgeClass: string,
    borderAccent: string,
    invoicesList: InvoiceMock[],
    currentPage: number,
    setCurrentPage: (p: number) => void,
    source: 'local' | 'cloud',
    isLoadingTable: boolean = false,
    extraHeaderButton?: React.ReactNode
  ) => {
    const totalPages = Math.ceil(invoicesList.length / ITEMS_PER_PAGE);
    const paginated = invoicesList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
      <div className={`bg-white rounded-3xl border ${borderAccent} shadow-sm overflow-hidden mb-8 transition-all`}>
        {/* Table Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${badgeClass} shadow-sm`}>
              {badgeIcon}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">{title}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${badgeClass}`}>
                  {badgeText}
                </span>
                <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {invoicesList.length} فاتورة
                </span>
                {(() => {
                  const overdueCountInList = invoicesList.filter(inv => checkOverdueInvoice(inv).isOverdue).length;
                  if (overdueCountInList > 0) {
                    return (
                      <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-black animate-pulse">
                        <AlertTriangle size={12} className="text-rose-600" />
                        {overdueCountInList} متجاوزة الاستحقاق
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {source === 'local' 
                  ? 'مخزنة محلياً في متصفحك (Offline Local Storage) وتعمل بدون إنترنت'
                  : 'متزامنة مباشرة مع خادم قاعدة بيانات Neon PostgreSQL السحابية'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {extraHeaderButton}
            <button
              onClick={() => handleExportCSV(invoicesList, source === 'local' ? 'cardiovision_local_invoices' : 'cardiovision_neon_cloud_invoices')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              title="تصدير هذا الجدول إلى ملف CSV"
            >
              <Download size={15} />
              تصدير CSV
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-black uppercase tracking-wider">
                <th className="py-3.5 px-6">المعرف / رقم الفاتورة</th>
                <th className="py-3.5 px-6">الجهة / العميل</th>
                <th className="py-3.5 px-6">المشروع</th>
                <th className="py-3.5 px-6">التاريخ والمهلة</th>
                <th className="py-3.5 px-6 text-center">الحالة</th>
                <th className="py-3.5 px-6 text-left">الإجمالي</th>
                <th className="py-3.5 px-6 text-center whitespace-nowrap min-w-[210px]">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {isLoadingTable ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-xs font-bold">جاري تحميل البيانات من الخادم...</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length > 0 ? (
                paginated.map((inv) => {
                  const overdueInfo = checkOverdueInvoice(inv);
                  const isOverdue = overdueInfo.isOverdue;

                  return (
                    <tr 
                      key={`${source}-${inv.id}`} 
                      className={`transition-colors ${
                        isOverdue 
                          ? 'bg-rose-50/70 hover:bg-rose-100/70 border-r-4 border-r-rose-600' 
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-4 px-6 font-bold text-slate-800 font-mono text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          {isOverdue && (
                            <span 
                              className="text-rose-600 flex items-center justify-center p-1 rounded-md bg-rose-100 shrink-0" 
                              title={`تجاوزت تاريخ الاستحقاق بمقدار ${overdueInfo.daysOverdue} يوم`}
                            >
                              <AlertTriangle size={15} className="animate-pulse" />
                            </span>
                          )}
                          <span className={`${
                            isOverdue 
                              ? 'bg-rose-100/80 text-rose-900 border border-rose-300 font-black' 
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          } px-2.5 py-1 rounded-lg`}>
                            {inv.invoice_number || String(inv.id)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className={isOverdue ? "text-rose-400 shrink-0" : "text-slate-400 shrink-0"} />
                          <span className={`font-bold ${isOverdue ? 'text-rose-950 font-black' : 'text-slate-900'}`}>
                            {inv.customer_name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`${isOverdue ? 'text-rose-900 font-semibold' : 'text-slate-600'} font-medium`}>
                          {inv.project_name || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar size={13} className="shrink-0" />
                            <span>{inv.invoice_date || '—'}</span>
                          </div>
                          {isOverdue ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md w-fit border border-rose-200">
                              <AlertTriangle size={11} className="shrink-0 text-rose-600" />
                              <span>متأخرة {overdueInfo.daysOverdue} يوم</span>
                            </div>
                          ) : (inv.due_date || inv.dueDate) ? (
                            <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                              <Clock size={11} className="shrink-0" />
                              <span>استحقاق: {inv.due_date || inv.dueDate}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {inv.amount_paid >= inv.grand_total && inv.grand_total > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 shadow-2xs">
                              <CheckCircle2 size={13} /> مدفوعة
                            </span>
                          ) : inv.amount_paid > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100 shadow-2xs">
                              مدفوعة جزئياً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-100 shadow-2xs">
                              غير مدفوعة
                            </span>
                          )}

                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs tracking-tight animate-pulse">
                              <AlertTriangle size={10} /> متجاوزة الاستحقاق
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-left">
                        <span className={`font-black px-3 py-1 rounded-lg border ${
                          isOverdue 
                            ? 'bg-rose-100/80 text-rose-950 border-rose-300' 
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {formatNumber(inv.grand_total)} {inv.currency || 'ل.س'}
                        </span>
                      </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* زر تعديل الفاتورة */}
                        <button 
                          onClick={() => handleEditClick(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-xs"
                          title="عرض وتعديل الفاتورة"
                        >
                          <Edit3 size={14} />
                          <span>تعديل</span>
                        </button>

                        {/* زر تصدير كـ PDF */}
                        <button 
                          onClick={() => handleExportPdf(inv.id, inv.invoice_number, source)}
                          disabled={isPrinting === String(inv.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-xs border border-emerald-200 hover:border-emerald-600 disabled:opacity-50"
                          title="تصدير وتحميل الفاتورة كملف PDF منظم"
                        >
                          {isPrinting === String(inv.id) ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-emerald-600" />
                              <span>جاري التصدير...</span>
                            </>
                          ) : (
                            <>
                              <FileDown size={14} />
                              <span>تصدير كـ PDF</span>
                            </>
                          )}
                        </button>

                        {/* زر حذف الفاتورة */}
                        <button 
                          onClick={() => setDeletingTarget({ id: String(inv.id), invoiceNumber: inv.invoice_number, source })}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف الفاتورة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    {searchTerm.trim() ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                          <Search size={22} />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          لا توجد نتائج مطابقة للبحث عن: <span className="text-blue-600 font-black">"{searchTerm.trim()}"</span> في {source === 'local' ? 'الفواتير المحلية' : 'الفواتير السحابية'}
                        </p>
                        <p className="text-xs text-slate-400">
                          يمكنك البحث برقم الفاتورة (مثل CV-2026-001) أو اسم العميل
                        </p>
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <X size={14} /> مسح البحث وعرض كافة الفواتير
                        </button>
                      </div>
                    ) : (
                      source === 'local' 
                        ? 'لا توجد فواتير في التخزين المحلي بعد.' 
                        : 'لا توجد فواتير متزامنة في قاعدة بيانات Neon بعد.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
            <p className="text-xs text-slate-500">
              صفحة <span className="font-bold text-slate-800">{currentPage}</span> من <span className="font-bold text-slate-800">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5" dir="ltr">
              <button
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold ${
                    currentPage === i + 1 
                      ? 'bg-slate-900 text-white' 
                      : 'border border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-[#050b1a] text-white py-4 px-6 sm:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-black tracking-tight">
              <span className="text-white">Cardio</span>
              <span className="text-rose-500">Vision</span>
            </div>
            <div className="hidden md:block h-6 w-px bg-white/20 mx-2"></div>
            <div className="hidden md:block text-sm text-slate-300 font-medium">لوحة تحكم الإدارة (ERP)</div>
          </div>
          
          {/* Supervisors & System Management (Clickable Avatars to Open Profile Modal) */}
          <div className="flex items-center gap-1 sm:gap-3 text-sm">
            {supervisors.map((supervisor) => (
              <div
                key={supervisor.id}
                onClick={() => {
                  setSelectedProfile(supervisor);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-colors rounded-lg p-2 group select-none relative"
                title={`انقر لتعديل الملف الشخصي لـ ${supervisor.name}`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${supervisor.gradient} flex items-center justify-center font-bold text-white shadow-md shrink-0 relative overflow-hidden ring-2 ring-transparent group-hover:ring-white/40 transition-all`}>
                  {supervisor.photoUrl ? (
                    <img
                      src={supervisor.photoUrl}
                      alt={supervisor.name}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{supervisor.avatarLetter}</span>
                  )}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="font-bold text-slate-200 group-hover:text-white transition-colors text-xs leading-tight">
                    {supervisor.name}
                  </p>
                  <p className="text-[10px] text-slate-400 group-hover:text-blue-300 transition-colors">
                    {supervisor.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Page Title & Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">نظرة عامة على الفواتير</h1>
            <p className="text-slate-500 text-sm mt-1">إدارة وفصل الفواتير بين التخزين المحلي وقاعدة بيانات Neon السحابية</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Local Storage Indicator */}
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs">
              <HardDrive size={15} className="text-indigo-600" />
              <span>محلي: {localList.length}</span>
            </div>

            {/* Neon Cloud Indicator */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border shadow-xs ${
              cloudError 
                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <Cloud size={15} className={cloudError ? "text-amber-600" : "text-emerald-600"} />
              <span>سحابي Neon: {cloudList.length}</span>
              {isLoadingCloud && <Loader2 size={12} className="animate-spin" />}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-blue-600"></div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-slate-500">إجمالي الإيرادات</p>
                <p className="text-[11px] text-slate-400 font-medium">مفصولة بالدولار والليرة السورية</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
                  <span className="text-xs font-bold text-emerald-800">بالدولار ($)</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-950 font-mono">
                    {formatNumber(totalUSD)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 mr-1">$</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm"></span>
                  <span className="text-xs font-bold text-blue-800">بالليرة السورية</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-blue-950 font-mono">
                    {formatNumber(totalSYP)}
                  </span>
                  <span className="text-xs font-bold text-blue-700 mr-1">ل.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* Paid Amounts */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-slate-500">المبالغ المستلمة (المدفوعة)</p>
                <p className="text-[11px] text-slate-400 font-medium">تم تحصيلها بنجاح</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold text-slate-600">المستلم بالدولار</span>
                <span className="text-lg font-black text-emerald-600 font-mono">{formatNumber(totalPaidUSD)} $</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold text-slate-600">المستلم بالسوري</span>
                <span className="text-lg font-black text-blue-600 font-mono">{formatNumber(totalPaidSYP)} ل.س</span>
              </div>
            </div>
          </div>

          {/* Overdue Invoices Stat Card */}
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-rose-600"></div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-rose-950">فواتير تجاوزت الاستحقاق</p>
                <p className="text-[11px] text-rose-600 font-medium">تحتاج لمتابعة وتحصيل الإدارة</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                <AlertTriangle size={22} className="animate-pulse" />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between bg-rose-50/80 border border-rose-200 rounded-xl px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shadow-sm"></span>
                  <span className="text-xs font-bold text-rose-950">إجمالي المتأخرة</span>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xl font-black text-rose-950 font-mono">
                    {overdueStats.overdueCount}
                  </span>
                  <span className="text-xs font-bold text-rose-700">فاتورة</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold text-slate-600">المبلغ المتأخر</span>
                <span className="text-xs font-black text-rose-700 font-mono">
                  {overdueStats.overdueAmountUSD > 0 && `${formatNumber(overdueStats.overdueAmountUSD)} $`}
                  {overdueStats.overdueAmountUSD > 0 && overdueStats.overdueAmountSYP > 0 && ' | '}
                  {overdueStats.overdueAmountSYP > 0 && `${formatNumber(overdueStats.overdueAmountSYP)} ل.س`}
                  {overdueStats.overdueAmountUSD === 0 && overdueStats.overdueAmountSYP === 0 && '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Total Counts & Storage State */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-slate-500">حالة التخزين المستقل</p>
                <p className="text-[11px] text-slate-400 font-medium">Local vs. Neon Cloud</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                <Layers size={22} />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold text-indigo-900">💾 جدول التخزين المحلي</span>
                <span className="text-lg font-black text-indigo-950 font-mono">{localList.length}</span>
              </div>
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold text-emerald-900">☁️ جدول سحابي Neon</span>
                <span className="text-lg font-black text-emerald-950 font-mono">{cloudList.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">تحليل الإيرادات الشهرية</h2>
              <p className="text-xs text-slate-500 mt-1">تطور الإيرادات مقسمة حسب العملة</p>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setChartCurrency('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartCurrency === 'ALL' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setChartCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartCurrency === 'USD' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                دولار ($)
              </button>
              <button
                onClick={() => setChartCurrency('SYP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartCurrency === 'SYP' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                سوري (ل.س)
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 15, left: 15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'right', direction: 'rtl' }}
                  formatter={(value: any, name: any) => [`${formatNumber(Number(value) || 0)}`, String(name)]}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                {(chartCurrency === 'ALL' || chartCurrency === 'SYP') && (
                  <Bar dataKey="revenueSYP" name="ليرة سورية (ل.س)" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={32} />
                )}
                {(chartCurrency === 'ALL' || chartCurrency === 'USD') && (
                  <Bar dataKey="revenueUSD" name="دولار أمريكي ($)" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={32} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* شريط البحث الموحد في الفواتير المحلية والسحابية (Search Bar) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shadow-xs">
                  <Search size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900">شريط البحث في الفواتير</h3>
                {searchTerm.trim() && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    جاري البحث...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                البحث السريع في الفواتير المحلية وسحابة Neon بناءً على رقم الفاتورة أو اسم العميل
              </p>
            </div>

            {/* View Switcher between Two Distinct Tables */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full lg:w-auto overflow-x-auto">
              <button
                onClick={() => setActiveTableView('both')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTableView === 'both' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={14} />
                عرض كلا الجدولين
              </button>
              <button
                onClick={() => setActiveTableView('local')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTableView === 'local' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive size={14} />
                المحلي فقط ({localList.length})
              </button>
              <button
                onClick={() => setActiveTableView('cloud')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTableView === 'cloud' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud size={14} />
                السحابي فقط ({cloudList.length})
              </button>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="pt-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="ابحث برقم الفاتورة (مثال: CV-2026-001) أو اسم العميل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="مسح البحث"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold">
                    ✕
                  </div>
                </button>
              )}
            </div>

            {/* Live Search Status Badges */}
            {searchTerm.trim() && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-slate-500">نتائج البحث عن "{searchTerm.trim()}":</span>
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                    <HardDrive size={13} />
                    {filteredLocalInvoices.length} في التخزين المحلي
                  </span>
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                    <Cloud size={13} />
                    {filteredCloudInvoices.length} في سحابة Neon
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors"
                >
                  <X size={13} /> مسح البحث
                </button>
              </div>
            )}
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">العميل</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none"
              >
                <option value="">جميع العملاء</option>
                {uniqueCustomers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">العملة</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none"
              >
                <option value="all">جميع العملات</option>
                <option value="$">دولار ($)</option>
                <option value="ل.س">سوري (ل.س)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">حالة الدفع</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="overdue">⚠️ متجاوزة الاستحقاق</option>
                <option value="paid">مدفوعة</option>
                <option value="partial">مدفوعة جزئياً</option>
                <option value="unpaid">غير مدفوعة</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setOnlyOverdue(!onlyOverdue)}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 flex-1 ${
                  onlyOverdue 
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
                title="تصفية الفواتير المتجاوزة لتاريخ الاستحقاق فقط"
              >
                <AlertTriangle size={13} className={onlyOverdue ? "text-white" : "text-rose-600"} />
                <span>متأخرة ({overdueStats.overdueCount})</span>
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCustomer('');
                  setSelectedCurrency('all');
                  setStartDate('');
                  setEndDate('');
                  setPaymentStatus('all');
                  setOnlyOverdue(false);
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1"
                title="مسح جميع الفلاتر"
              >
                <X size={14} /> مسح
              </button>
            </div>
          </div>
        </div>

        {/* شريط تنبيه المسؤولين للفواتير المتجاوزة للاستحقاق */}
        {overdueStats.overdueCount > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border border-rose-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-rose-950">تنبيه المشرفين والمسؤولين: فواتير تجاوزت موعد استحقاقها</h4>
                  <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    {overdueStats.overdueCount} متأخرة
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5">
                  تم تمييز الفواتير المتأخرة بلون أحمر خفيف وأيقونة تحذير ⚠️ لتسهيل متابعتها وسرعة تحصيلها.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOnlyOverdue(!onlyOverdue)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  onlyOverdue
                    ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-400'
                    : 'bg-white text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300 shadow-xs'
                }`}
              >
                <AlertTriangle size={14} />
                {onlyOverdue ? 'إلغاء التصفية (عرض الكل)' : 'تصفية الفواتير المتأخرة فقط'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* الجدول الأول: الفواتير المحفوظة محلياً (Local Storage)            */}
        {/* ============================================================== */}
        {(activeTableView === 'both' || activeTableView === 'local') && (
          renderInvoiceTable(
            "الفواتير المحفوظة محلياً (Local Storage)",
            "التخزين المحلي",
            <HardDrive size={18} className="text-indigo-600" />,
            "bg-indigo-50 text-indigo-700 border border-indigo-100",
            "border-indigo-100",
            filteredLocalInvoices,
            localCurrentPage,
            setLocalCurrentPage,
            'local',
            false
          )
        )}

        {/* ============================================================== */}
        {/* الجدول الثاني: الفواتير المتزامنة سحابياً (Neon DB)             */}
        {/* ============================================================== */}
        {(activeTableView === 'both' || activeTableView === 'cloud') && (
          renderInvoiceTable(
            "الفواتير المتزامنة سحابياً (Neon DB)",
            "قاعدة بيانات Neon",
            <Cloud size={18} className="text-emerald-600" />,
            "bg-emerald-50 text-emerald-700 border border-emerald-100",
            "border-emerald-100",
            filteredCloudInvoices,
            cloudCurrentPage,
            setCloudCurrentPage,
            'cloud',
            isLoadingCloud,
            <button
              onClick={onRefreshCloud}
              disabled={isLoadingCloud}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              title="تحديث البيانات من Neon DB"
            >
              <RefreshCw size={14} className={isLoadingCloud ? "animate-spin" : ""} />
              تحديث السحابة
            </button>
          )
        )}
      </main>

      {/* Interactive Edit Modal */}
      {isViewModalOpen && selectedInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="relative w-full max-w-[220mm] my-4 bg-transparent animate-in fade-in zoom-in duration-200">
            <div className="sticky top-2 z-50 flex justify-end mb-2">
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedInvoiceId(null);
                  onRefreshCloud?.();
                }}
                className="bg-slate-900 text-white p-2.5 rounded-full hover:bg-rose-600 transition shadow-xl"
                title="إغلاق"
              >
                <X size={22} />
              </button>
            </div>
            <Invoice 
              invoiceId={selectedInvoiceId}
              onCancel={() => {
                setIsViewModalOpen(false);
                setSelectedInvoiceId(null);
              }}
              onInvoiceUpdated={(upd) => {
                onUpdateInvoice?.(upd as InvoiceMock);
                onRefreshCloud?.();
              }}
              onSaved={() => {
                setIsViewModalOpen(false);
                setSelectedInvoiceId(null);
                onRefreshCloud?.();
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4 text-rose-600">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 size={24} className="text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">تأكيد الحذف</h2>
                <p className="text-xs text-slate-500">
                  {deletingTarget.source === 'local' ? 'حذف من التخزين المحلي' : 'حذف من قاعدة بيانات Neon'}
                </p>
              </div>
            </div>
            <p className="text-slate-600 font-medium mb-6 leading-relaxed text-sm">
              هل أنت متأكد من حذف الفاتورة رقم <span className="font-bold text-slate-900">{deletingTarget.invoiceNumber}</span>؟
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteAction}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal for Supervisors */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfile(null);
        }}
        supervisor={selectedProfile}
        onSave={handleSaveProfile}
      />

      {/* Toast Notification for Profile Updates */}
      {profileToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200" dir="rtl">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{profileToast}</span>
        </div>
      )}

      {/* Hidden Print Template */}
      <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true">
        {printData && (
          <div
            ref={printRef}
            dir="rtl"
            className="print-container flex flex-col justify-between bg-white text-slate-900 w-[794px] h-fit min-h-max"
            style={{ width: '794px', height: 'fit-content', minHeight: 'max-content', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            <header className="relative overflow-hidden bg-slate-950 px-[16mm] pb-[15mm] pt-[13mm] text-white">
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 165 H120 L145 165 L165 140 L188 190 L215 70 L245 225 L272 165 H385 L410 165 L435 145 L455 185 L480 105 L505 210 L530 165 H1000" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.15" />
                <path d="M0 185 H220 L245 185 L270 155 L292 205 L318 120 L345 240 L372 185 H1000" fill="none" stroke="#ec4899" strokeWidth="2" opacity="0.15" />
              </svg>

              <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-blue-600/15 blur-3xl" />
              <div className="absolute -right-20 bottom-0 h-60 w-60 rounded-full bg-rose-600/15 blur-3xl" />

              <div className="relative z-10 flex items-start justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-rose-500/10">
                    <img src="/logo.png" alt="CardioVision" className="h-[24mm] w-[24mm] object-contain p-1" />
                  </div>
                  <div>
                    <div className="text-3xl font-black tracking-tight" dir="ltr">
                      <span className="text-white">Cardio</span><span className="text-rose-500">Vision</span>
                    </div>
                    <p className="mt-1 max-w-[90mm] text-sm leading-7 text-slate-300">
                      منصة متخصصة في المشاريع الهندسية والطبية والبرمجية وحلول الذكاء الاصطناعي
                    </p>
                  </div>
                </div>

                <div className="min-w-[42mm] text-left">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 backdrop-blur">فاتورة رسمية</div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-white">فاتورة مشروع</div>
                    <div className="mt-1 text-xs font-medium text-slate-400">PROJECT INVOICE</div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 h-[2px] w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 via-purple-500 to-rose-600" />
              <div className="absolute bottom-0 right-0 h-[8mm] w-[48%] bg-gradient-to-l from-blue-600 via-purple-500 to-rose-600" style={{ clipPath: "polygon(7% 0, 100% 0, 100% 100%, 0 100%)" }} />
            </header>

            <section className="px-[16mm] pt-[10mm]">
              <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">اسم الجهة / العميل</label>
                  <div className="text-base font-bold text-slate-900">{printData.customerName}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">اسم المشروع</label>
                  <div className="text-base font-bold leading-6 text-slate-900">{printData.projectName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-xs font-black text-slate-500">تاريخ الفاتورة</label>
                  <div className="font-semibold text-slate-800">{printData.invoiceDate}</div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black text-slate-500">رقم الفاتورة</label>
                  <div className="font-semibold text-slate-800">{printData.invoiceNumber}</div>
                </div>
              </div>
            </section>

            <section className="px-[16mm] pt-[9mm]">
              <div className="mb-4">
                <h3 className="text-xl font-black text-slate-900">تفاصيل المشروع</h3>
                <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-blue-600 to-rose-600" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-white">
                      <th className="w-[10%] px-3 py-4 text-center text-xs font-black">حالة الدفع</th>
                      <th className="w-[6%] px-3 py-4 text-center text-xs font-black">#</th>
                      <th className="w-[39%] px-4 py-4 text-right text-xs font-black">البيان</th>
                      <th className="w-[15%] px-3 py-4 text-center text-xs font-black">الكمية</th>
                      <th className="w-[15%] px-3 py-4 text-center text-xs font-black">السعر الإفرادي ({printData.currency || 'ل.س'})</th>
                      <th className="w-[15%] px-3 py-4 text-center text-xs font-black">الإجمالي ({printData.currency || 'ل.س'})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.items.map((item, index) => {
                      const isPaid = item.isPaid;
                      const paidClass = isPaid ? "line-through text-slate-400 opacity-70" : "text-slate-900";
                      
                      return (
                        <tr key={item.id} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-4 text-center text-sm font-bold text-slate-500">
                            {isPaid ? <span className="text-emerald-600 font-black">✔️ مدفوع</span> : <span className="text-slate-400">-</span>}
                          </td>
                          <td className={`px-3 py-4 text-center text-sm font-bold ${paidClass}`}>{index + 1}</td>
                          <td className={`px-4 py-4 text-sm font-semibold ${paidClass}`}>{item.description}</td>
                          <td className={`px-3 py-4 text-center text-sm font-bold ${paidClass}`}>{item.quantity}</td>
                          <td className={`px-3 py-4 text-center text-sm font-bold ${paidClass}`}>{formatNumber(item.unitPrice)}</td>
                          <td className={`px-3 py-4 text-center text-sm font-black ${paidClass}`}>{formatNumber(item.lineTotal)} {printData.currency || 'ل.س'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-auto px-[16mm] pb-[4mm] pt-[9mm]">
              <div className="flex justify-end">
                <div className="w-[85mm] overflow-hidden rounded-2xl border border-slate-200">
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-500">المجموع الفرعي</span>
                      <span className="font-black text-slate-900">{formatNumber(printData.subtotal)} {printData.currency || 'ل.س'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-sm">
                      <span className="font-semibold text-slate-500">الخصم</span>
                      <span className="font-black text-rose-600">- {formatNumber(printData.discount)} {printData.currency || 'ل.س'}</span>
                    </div>
                    <div className="rounded-xl bg-slate-950 p-5 text-white">
                      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                        <span className="text-sm font-bold text-slate-300">السعر الكامل</span>
                        <span className="text-xl font-black text-white">{formatNumber(printData.grandTotal)} <span className="text-sm text-slate-300">{printData.currency || 'ل.س'}</span></span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-emerald-400">الدفعة المستلمة</span>
                        <span className="text-lg font-black text-emerald-400">{formatNumber(printData.amountPaid)} <span className="text-sm">{printData.currency || 'ل.س'}</span></span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/20">
                        <span className="text-base font-black text-rose-400">الرصيد المطلوب</span>
                        <span className="text-2xl font-black text-rose-400">{formatNumber(printData.amountDue)} <span className="text-sm text-rose-300">{printData.currency || 'ل.س'}</span></span>
                      </div>
                      
                      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                          style={{ width: printData.grandTotal > 0 ? `${Math.min(100, (printData.amountPaid / printData.grandTotal) * 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* قسم الملاحظات أسفل قسم الإجماليات */}
              {Boolean(printData.notes && printData.notes.trim()) && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">ملاحظات:</h4>
                  <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-800">{printData.notes}</p>
                </div>
              )}
            </section>

            {/* قسم التوقيعات */}
            <section className="px-[16mm] pb-[6mm] pt-[4mm]">
              <div className="grid grid-cols-3 gap-6 items-end text-slate-800">
                {/* مشرفة النظام */}
                <div className="text-center relative">
                  <p className="font-bold text-sm mb-12 relative h-12 flex flex-col justify-end text-slate-600">
                    {supervisors.find(s => s.id === 'rola')?.role || 'مشرفة النظام'}
                  </p>
                  <div className="w-32 sm:w-36 border-t border-slate-400 mx-auto"></div>
                  <p className="font-black text-sm mt-3 text-slate-900">
                    توقيع {supervisors.find(s => s.id === 'rola')?.name || 'م. رولا الصمادي'}
                  </p>
                </div>

                {/* مشرف النظام */}
                <div className="text-center relative">
                  <p className="font-bold text-sm mb-12 relative h-12 flex flex-col justify-end text-slate-600">
                    {supervisors.find(s => s.id === 'mohammed')?.role || 'مشرف النظام'}
                  </p>
                  <div className="w-32 sm:w-36 border-t border-slate-400 mx-auto"></div>
                  <p className="font-black text-sm mt-3 text-slate-900">
                    توقيع {supervisors.find(s => s.id === 'mohammed')?.name || 'م. محمد عبدالرحمن'}
                  </p>
                </div>

                {/* مدير النظام */}
                <div className="text-center relative">
                  <p className="font-bold text-sm mb-12 relative h-12 flex flex-col justify-end text-slate-600">
                    {supervisors.find(s => s.id === 'youssef')?.role || 'مدير النظام'}
                  </p>
                  <div className="w-32 sm:w-36 border-t border-slate-400 mx-auto"></div>
                  <p className="font-black text-sm mt-3 text-slate-900">
                    توقيع {supervisors.find(s => s.id === 'youssef')?.name || 'م. يوسف النجار'}
                  </p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-8 bg-slate-950 text-white p-6 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-purple-500 to-rose-600" />
              <div className="flex items-center justify-between gap-6 px-4">
                <div>
                  <div className="text-lg font-black tracking-tight" dir="ltr">
                    <span className="text-white">Cardio</span><span className="text-rose-500">Vision</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">شكراً لثقتكم بمنصة CardioVision للمشاريع والحلول الذكية</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} className="text-blue-400" />
                      0964809575
                    </span>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <MapPin size={13} className="text-rose-400 shrink-0" />
                      <span>دمشق-الطبالة | حماة-الشريعة</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scan QR</div>
                    <div className="text-xs font-bold text-slate-300">CardioVision</div>
                  </div>
                  <img src="/QR.jpg?v=2" alt="QR" className="w-16 h-16 bg-white p-1 rounded-md object-contain shadow-md" />
                </div>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
