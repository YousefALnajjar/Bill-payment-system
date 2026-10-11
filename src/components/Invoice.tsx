import React, { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Users,
  Edit2,
  Edit3,
  X,
  Printer,
  Phone,
  MapPin,
  ReceiptText,
  Loader2,
  Save,
  Check,
  ArrowRight,
} from "lucide-react";
import { 
  getLocalInvoiceDetail, 
  saveLocalInvoice, 
  saveLocalInvoiceDetail,
  generateNextInvoiceNumber 
} from "../utils/storage";

export interface InvoiceSummary {
  id: string;
  invoice_number: string;
  customer_name: string;
  project_name: string;
  invoice_date: string;
  due_date?: string;
  currency?: string;
  grand_total: number;
  amount_paid: number;
  notes?: string;
}

export interface InvoiceProps {
  invoiceId?: string | null;
  onCancel?: () => void;
  onSaved?: () => void;
  onInvoiceCreated?: (invoice: InvoiceSummary) => void;
  onInvoiceUpdated?: (invoice: InvoiceSummary) => void;
  onClose?: () => void;
}

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  is_paid: boolean;
};

const createItem = (): InvoiceItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitPrice: 0,
  is_paid: false,
});

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);


type Client = {
  id: string;
  name: string;
};

export default function ProjectInvoice(props: InvoiceProps = {}) {
  const [savedClients, setSavedClients] = useState<Client[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClientName, setNewClientName] = useState("");

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(props.invoiceId || null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const clients = localStorage.getItem("saved_clients");
    if (clients) {
      setSavedClients(JSON.parse(clients));
    }
  }, []);

  const handleSaveClient = () => {
    if (!newClientName.trim()) return;
    
    let updatedClients: Client[];
    if (editingClient) {
      updatedClients = savedClients.map(c => 
        c.id === editingClient.id ? { ...c, name: newClientName } : c
      );
    } else {
      updatedClients = [...savedClients, { id: crypto.randomUUID(), name: newClientName }];
    }
    
    setSavedClients(updatedClients);
    localStorage.setItem("saved_clients", JSON.stringify(updatedClients));
    setNewClientName("");
    setEditingClient(null);
  };

  const handleDeleteClient = (id: string) => {
    if(confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      const updatedClients = savedClients.filter(c => c.id !== id);
      setSavedClients(updatedClients);
      localStorage.setItem("saved_clients", JSON.stringify(updatedClients));
    }
  };

  const selectClient = (name: string) => {
    setCustomerName(name);
    setIsClientModalOpen(false);
  };

  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currency, setCurrency] = useState("ل.س");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [signRola, setSignRola] = useState(false);
  const [signMohammed, setSignMohammed] = useState(false);
  const [signYoussef, setSignYoussef] = useState(false);

  const [supervisorProfiles] = useState<{ id: string; name: string; role: string }[]>(() => {
    try {
      const saved = localStorage.getItem('cardiovision_supervisors_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'rola', name: 'م. رولا الصمادي', role: 'مشرفة النظام' },
      { id: 'mohammed', name: 'م. محمد عبدالرحمن', role: 'مشرف النظام' },
      { id: 'youssef', name: 'م. يوسف النجار', role: 'مدير النظام' },
    ];
  });

  useEffect(() => {
    if (props.invoiceId) {
      setActiveInvoiceId(props.invoiceId);
      loadInvoiceData(props.invoiceId);
    } else {
      setActiveInvoiceId(null);
      fetchNextInvoiceNumber();
    }
  }, [props.invoiceId]);

  const loadInvoiceData = async (id: string) => {
    setIsLoadingInvoice(true);
    setSaveSuccessMessage(null);

    // 1. Load from local persistence immediately (0ms instant display)
    const localDetail = getLocalInvoiceDetail(id);
    if (localDetail) {
      setCustomerName(localDetail.customerName || "");
      setProjectName(localDetail.projectName || "");
      setInvoiceDate(localDetail.invoiceDate ? localDetail.invoiceDate.split("T")[0] : new Date().toISOString().split("T")[0]);
      setDueDate(localDetail.dueDate ? localDetail.dueDate.split("T")[0] : "");
      setInvoiceNumber(localDetail.invoiceNumber || "");
      setCurrency(localDetail.currency || "ل.س");
      setNotes(localDetail.notes || "");

      const subtotalVal = Number(localDetail.subtotal) || 0;
      const discountVal = Number(localDetail.discount) || 0;
      if (subtotalVal > 0 && discountVal > 0) {
        setDiscount(Math.round((discountVal / subtotalVal) * 100 * 10) / 10);
      } else {
        setDiscount(0);
      }

      if (localDetail.items && Array.isArray(localDetail.items) && localDetail.items.length > 0) {
        setItems(localDetail.items.map((item: any) => ({
          id: item.id ? String(item.id) : crypto.randomUUID(),
          description: item.description ?? "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          is_paid: Boolean(item.is_paid ?? item.isPaid)
        })));
      }
    }

    // 2. Fetch fresh updates from server in background if available
    try {
      const response = await fetch(`/api/invoices/${id}`);
      if (response.ok) {
        const data = await response.json();

        setCustomerName(data.customerName || "");
        setProjectName(data.projectName || "");
        setInvoiceDate(data.invoiceDate ? data.invoiceDate.split("T")[0] : new Date().toISOString().split("T")[0]);
        setDueDate(data.dueDate || data.due_date ? (data.dueDate || data.due_date).split("T")[0] : "");
        setInvoiceNumber(data.invoiceNumber || "");
        setCurrency(data.currency || "ل.س");
        setNotes(data.notes || "");

        const subtotalVal = Number(data.subtotal) || 0;
        const discountVal = Number(data.discount) || 0;
        if (subtotalVal > 0 && discountVal > 0) {
          setDiscount(Math.round((discountVal / subtotalVal) * 100 * 10) / 10);
        } else {
          setDiscount(0);
        }

        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          const loadedItems = data.items.map((item: any) => ({
            id: item.id ? String(item.id) : crypto.randomUUID(),
            description: item.description ?? "",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            is_paid: Boolean(item.is_paid ?? item.isPaid)
          }));
          setItems(loadedItems);

          // Update local detail cache with fresh server data
          saveLocalInvoiceDetail(String(id), {
            id: String(id),
            invoiceNumber: data.invoiceNumber || "",
            customerName: data.customerName || "",
            projectName: data.projectName || "",
            invoiceDate: data.invoiceDate || "",
            dueDate: data.dueDate || data.due_date || "",
            currency: data.currency || "ل.س",
            subtotal: subtotalVal,
            discount: discountVal,
            grandTotal: Number(data.grandTotal) || 0,
            amountPaid: loadedItems.filter(i => i.is_paid).reduce((s, it) => s + (it.quantity * it.unitPrice), 0),
            notes: data.notes || localDetail?.notes || "",
            items: loadedItems
          });
        }
      }
    } catch (error) {
      // Smart Fallback: If network or Neon is unavailable, continue seamlessly with locally loaded data
      console.warn('Could not sync invoice detail from server, using local persistent copy:', error);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const resetToNewInvoice = async () => {
    setActiveInvoiceId(null);
    setSaveSuccessMessage(null);
    setCustomerName("");
    setProjectName("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setCurrency("ل.س");
    setDiscount(0);
    setNotes("");
    setSignRola(false);
    setSignMohammed(false);
    setSignYoussef(false);
    setItems([
      {
        id: crypto.randomUUID(),
        description: "تنفيذ مشروع تخرج هندسي",
        quantity: 1,
        unitPrice: 0,
        is_paid: false,
      },
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        is_paid: false,
      },
    ]);
    await fetchNextInvoiceNumber();
  };

  const fetchNextInvoiceNumber = async () => {
    const localNext = generateNextInvoiceNumber();
    try {
      const response = await fetch('/api/invoices/next-number');
      if (response.ok) {
        const data = await response.json();
        setInvoiceNumber(data.nextInvoiceNumber || localNext);
        return;
      }
    } catch (error) {
      console.warn('Transient error fetching next invoice number:', error);
    }
    setInvoiceNumber(localNext);
  };

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      description: "تنفيذ مشروع تخرج هندسي",
      quantity: 1,
      unitPrice: 0,
      is_paid: false,
    },
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      is_paid: false,
    },
  ]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), 100);
    return subtotal * (safeDiscount / 100);
  }, [subtotal, discount]);

  const grandTotal = useMemo(
    () => Math.max(subtotal - discountAmount, 0),
    [subtotal, discountAmount]
  );

  const amountPaid = useMemo(
    () => items.filter(i => i.is_paid).reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0),
    [items]
  );
  
  const amountDue = useMemo(
    () => Math.max(grandTotal - amountPaid, 0),
    [grandTotal, amountPaid]
  );

  const handleSaveToDatabase = async (saveAsNew = false) => {
    if (!customerName || !projectName) {
      alert("الرجاء إدخال اسم العميل واسم المشروع قبل الحفظ.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage(null);

    const isUpdating = Boolean(activeInvoiceId && !saveAsNew);
    const chosenNumber = (invoiceNumber || generateNextInvoiceNumber()).trim();
    const assignedLocalId = isUpdating ? String(activeInvoiceId) : chosenNumber;

    // Step 1: Prepare payload & persistent models
    const formattedItems = items.map(item => ({
      id: item.id,
      description: item.description.trim() || 'بند خدمة',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      isPaid: Boolean(item.is_paid),
      is_paid: Boolean(item.is_paid)
    }));

    const initialSummary: InvoiceSummary = {
      id: assignedLocalId,
      invoice_number: chosenNumber,
      customer_name: customerName,
      project_name: projectName,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      currency: currency,
      grand_total: grandTotal,
      amount_paid: amountPaid,
      notes: notes
    };

    const initialDetail = {
      id: assignedLocalId,
      invoiceNumber: initialSummary.invoice_number,
      customerName: customerName,
      projectName: projectName,
      invoiceDate: invoiceDate,
      dueDate: dueDate || undefined,
      currency: currency,
      subtotal: subtotal,
      discount: discountAmount,
      grandTotal: grandTotal,
      amountPaid: amountPaid,
      amountDue: amountDue,
      notes: notes,
      items: formattedItems
    };

    // Step 2: DUAL SAVE - Save to local persistent storage FIRST (Guaranteed Zero Data Loss)
    saveLocalInvoice(initialSummary as any, initialDetail as any);

    if (isUpdating) {
      props.onInvoiceUpdated?.(initialSummary);
    } else {
      props.onInvoiceCreated?.(initialSummary);
    }

    const payload = {
      invoice_number: chosenNumber,
      customer_name: customerName,
      project_name: projectName,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      dueDate: dueDate || null,
      currency: currency,
      subtotal: subtotal,
      discount: discountAmount,
      grand_total: grandTotal,
      notes: notes,
      items: formattedItems.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        is_paid: i.is_paid
      }))
    };

    // Step 3: Attempt to sync to Neon DB in the background
    try {
      if (isUpdating) {
        const response = await fetch(`/api/invoices/${activeInvoiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setSaveSuccessMessage("تم حفظ وتحديث الفاتورة بنجاح في قاعدة البيانات والتخزين المحلي!");
          alert("تم تحديث الفاتورة بنجاح في قاعدة البيانات!");
          props.onSaved?.();
        } else {
          console.warn('Neon update failed with status:', response.status);
          alert("تم حفظ الفاتورة محلياً بأمان! سيتم مزامنتها مع قاعدة البيانات عند توفر الاتصال.");
          props.onSaved?.();
        }
      } else {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          const serverId = String(resData.invoiceId || assignedLocalId);
          
          const finalSummary: InvoiceSummary = {
            ...initialSummary,
            id: serverId
          };

          // Update local persistence with final server ID
          saveLocalInvoice(finalSummary as any, { ...initialDetail, id: serverId } as any);
          props.onInvoiceCreated?.(finalSummary);

          alert("تم حفظ الفاتورة بنجاح في قاعدة البيانات والتخزين المحلي!");
          props.onSaved?.();
          if (!activeInvoiceId) {
            await resetToNewInvoice();
          }
        } else {
          console.warn('Neon POST failed with status:', response.status);
          // CRITICAL: NEVER DELETE local invoice!
          alert("تم حفظ الفاتورة محلياً بنجاح وحمايتها من الضياع! (محفوظة في Local Storage)");
          props.onSaved?.();
        }
      }
    } catch (error) {
      // CRITICAL REQUIREMENT: If POST / PUT fails due to network/Neon error, NEVER delete the invoice from local persistence or UI
      console.warn("Network / Neon DB error while saving invoice, preserved in local storage:", error);
      alert("تم حفظ الفاتورة محلياً بنجاح وحمايتها من الضياع! (محفوظة في Local Storage)");
      props.onSaved?.();
    } finally {
      setIsSaving(false);
    }
  };

  const updateItem = (
    id: string,
    field: keyof Omit<InvoiceItem, "id">,
    value: string | number | boolean
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "quantity" || field === "unitPrice"
                  ? Number(value) || 0
                  : value,
            }
          : item
      )
    );
  };

  const toggleItemPaidStatus = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_paid: !item.is_paid } : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [...current, createItem()]);
  };

  const removeItem = (id: string) => {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.id !== id) : current
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    setter(e.target.value);
    e.target.setAttribute("value", e.target.value);
    if (e.target.tagName.toLowerCase() === "textarea") {
      e.target.innerHTML = e.target.value;
    }
  };

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

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById("invoice-sheet");
    if (!element) {
      setIsGenerating(false);
      return;
    }

    const noPrintElements = document.querySelectorAll(".no-print");
    noPrintElements.forEach(
      (el) => ((el as HTMLElement).style.display = "none")
    );

    const originalWidth = element.style.width;
    const originalMinHeight = element.style.minHeight;

    try {
      element.classList.add("is-generating-pdf");
      element.style.width = "794px";
      element.style.minHeight = "1123px";

      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      const htmlToImage = (window as any).htmlToImage;
      const jsPDF = (window as any).jspdf.jsPDF;

      // Allow fonts, images, and layout to settle
      await new Promise((resolve) => setTimeout(resolve, 400));

      const fullWidth = 794;
      const fullHeight = Math.ceil(element.scrollHeight || element.offsetHeight);

      const dataUrl = await htmlToImage.toPng(element, {
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

      const pdfWidth = 210;
      const pdfHeight = (fullHeight * pdfWidth) / fullWidth;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, Math.max(297, pdfHeight)],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CardioVision_Invoice_${invoiceNumber}.pdf`);

    } catch (err) {
      console.error("حدث خطأ في توليد الـ PDF:", err);
      alert("عذراً، حدث خطأ تقني، يرجى المحاولة مرة أخرى.");
    } finally {
      element.classList.remove("is-generating-pdf");
      element.style.width = originalWidth;
      element.style.minHeight = originalMinHeight;
      noPrintElements.forEach(
        (el) => ((el as HTMLElement).style.display = "")
      );
      setIsGenerating(false);
    }
  };

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: #e5e7eb; }
        * { box-sizing: border-box; }
        .invoice-print-root { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .ecg-line { opacity: 0.1; }
        @media print {
          html, body { width: 210mm; min-width: 210mm; background: white !important; }
          body { margin: 0 !important; }
          .no-print { display: none !important; }
          .invoice-sheet {
            width: 210mm !important; min-height: 297mm !important; height: 297mm !important;
            margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: hidden !important;
          }
          input, textarea, select {
            border: none !important; outline: none !important; background: transparent !important;
            box-shadow: none !important; appearance: none !important; -webkit-appearance: none !important;
            resize: none !important; padding-left: 0 !important; padding-right: 0 !important;
          }
          input::placeholder, textarea::placeholder { color: transparent !important; }
          input[type="date"] { color: inherit !important; }
          .print-text { border: none !important; background: transparent !important; }
        }
        .is-generating-pdf input, .is-generating-pdf textarea, .is-generating-pdf select {
          border: none !important; outline: none !important; background: transparent !important;
          box-shadow: none !important; appearance: none !important; -webkit-appearance: none !important;
          resize: none !important; padding-left: 0 !important; padding-right: 0 !important;
        }
        .is-generating-pdf input::placeholder, .is-generating-pdf textarea::placeholder { color: transparent !important; }
        .is-generating-pdf .print-text { border: none !important; background: transparent !important; }
        .is-generating-pdf { border-radius: 0 !important; box-shadow: none !important; }
      `}</style>

      <div dir="rtl" className="invoice-print-root min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
        {/* Full Edit Mode Banner */}
        {activeInvoiceId && (
          <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                <Edit3 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-600 px-2.5 py-0.5 text-xs font-black text-white">وضع التعديل التفاعلي</span>
                  <h3 className="font-black text-slate-900">تعديل الفاتورة رقم: <span className="text-blue-700 font-mono text-base">{invoiceNumber}</span></h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">يمكنك إضافة بنود أو تعديل الأسعار والكميات وحالة الدفع ثم الضغط على "حفظ التعديلات"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToNewInvoice}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <Plus size={15} /> فاتورة جديدة فارغة
              </button>
              {(props.onCancel || props.onClose) && (
                <button
                  type="button"
                  onClick={props.onCancel || props.onClose}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <ArrowRight size={15} /> العودة للوحة التحكم
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success notification */}
        {saveSuccessMessage && (
          <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 shadow-sm animate-in fade-in">
            <span className="font-black text-sm flex items-center gap-2">
              <Check size={18} className="text-emerald-600" /> {saveSuccessMessage}
            </span>
            {(props.onCancel || props.onClose) && (
              <button 
                type="button" 
                onClick={props.onCancel || props.onClose}
                className="text-xs font-bold bg-emerald-600 text-white px-3.5 py-2 rounded-xl hover:bg-emerald-700 transition"
              >
                الرجوع إلى لوحة التحكم
              </button>
            )}
          </div>
        )}

        {/* Loading overlay for invoice */}
        {isLoadingInvoice && (
          <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="font-bold text-slate-700 text-sm">جاري تحميل وتعبئة بيانات الفاتورة بالكامل...</span>
          </div>
        )}

        <div className="no-print mx-auto mb-6 flex w-full max-w-[210mm] items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-rose-600 text-white">
              <ReceiptText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                {activeInvoiceId ? `تعديل الفاتورة (${invoiceNumber})` : 'فاتورة مشاريع هندسية'}
              </h2>
              <p className="text-xs text-slate-500">CardioVision — نظام الفواتير</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeInvoiceId ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveToDatabase(false)}
                  disabled={isSaving}
                  className={`inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition ${
                    isSaving ? "cursor-not-allowed opacity-75" : "hover:bg-emerald-700 hover:-translate-y-0.5"
                  }`}
                >
                  {isSaving ? (
                    <><Loader2 size={18} className="animate-spin" /> جاري التحديث...</>
                  ) : (
                    <><Check size={18} /> حفظ التعديلات (تحديث الفاتورة)</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveToDatabase(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  title="حفظ التعديلات كفاتورة جديدة في قاعدة البيانات"
                >
                  <Save size={18} /> حفظ كنسخة جديدة
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveToDatabase(false)}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition ${
                  isSaving ? "cursor-not-allowed opacity-75" : "hover:bg-slate-800 hover:-translate-y-0.5"
                }`}
              >
                {isSaving ? (
                  <><Loader2 size={18} className="animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><Save size={18} /> حفظ الفاتورة</>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition ${
                isGenerating ? "cursor-not-allowed opacity-75" : "hover:-translate-y-0.5 hover:shadow-xl"
              }`}
            >
              {isGenerating ? (
                <><Loader2 size={18} className="animate-spin" /> جاري المعالجة...</>
              ) : (
                <><Printer size={18} /> تحميل PDF</>
              )}
            </button>
          </div>
        </div>

        <main id="invoice-sheet" className="invoice-sheet mx-auto flex min-h-[297mm] w-[210mm] flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl">
          <header className="relative overflow-hidden bg-slate-950 px-[16mm] pb-[15mm] pt-[13mm] text-white">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
              <path className="ecg-line" d="M0 165 H120 L145 165 L165 140 L188 190 L215 70 L245 225 L272 165 H385 L410 165 L435 145 L455 185 L480 105 L505 210 L530 165 H1000" fill="none" stroke="#38bdf8" strokeWidth="3" />
              <path className="ecg-line" d="M0 185 H220 L245 185 L270 155 L292 205 L318 120 L345 240 L372 185 H1000" fill="none" stroke="#ec4899" strokeWidth="2" />
            </svg>

            <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-blue-600/15 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-60 w-60 rounded-full bg-rose-600/15 blur-3xl" />

            <div className="relative z-10 flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-rose-500/10">
                  <img src="/logo.png" alt="CardioVision" className="h-[28mm] w-[28mm] object-contain" />
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight">
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
                  <div className="text-2xl font-black">فاتورة مشروع</div>
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
                
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-500">اسم الجهة / العميل</label>
                  <button 
                    type="button"
                    onClick={() => setIsClientModalOpen(true)}
                    className="no-print text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Users size={14} />
                    إدارة العملاء
                  </button>
                </div>

                <input type="text" value={customerName || ""} onChange={(e) => handleInputChange(e, setCustomerName)} placeholder="أدخل اسم العميل" className="print-text w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">اسم المشروع</label>
                <textarea value={projectName || ""} onChange={(e) => handleInputChange(e, setProjectName)} placeholder="أدخل اسم المشروع" rows={2} className="print-text w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <label className="mb-2 block text-xs font-black text-slate-500">تاريخ الفاتورة</label>
                <input type="date" value={invoiceDate || ""} onChange={(e) => handleInputChange(e, setInvoiceDate)} className="print-text w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black text-rose-500 flex items-center justify-between">
                  <span>تاريخ الاستحقاق (اختياري)</span>
                  {Boolean(dueDate) && (
                    <button 
                      type="button" 
                      onClick={() => setDueDate("")} 
                      className="text-[10px] text-slate-400 hover:text-rose-600 no-print"
                      title="إلغاء تاريخ الاستحقاق"
                    >
                      إلغاء
                    </button>
                  )}
                </label>
                <input 
                  type="date" 
                  value={dueDate || ""} 
                  onChange={(e) => handleInputChange(e, setDueDate)} 
                  className={`print-text w-full rounded-xl border ${dueDate ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white'} px-4 py-3 font-semibold text-slate-800 outline-none focus:border-rose-500 transition-colors`}
                  placeholder="حدد تاريخ الاستحقاق" 
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black text-slate-500">رقم الفاتورة</label>
                <input type="text" value={invoiceNumber || ""} onChange={(e) => handleInputChange(e, setInvoiceNumber)} className="print-text w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black text-slate-500">العملة</label>
                <select
                  value={currency || "ل.س"}
                  onChange={(e) => handleInputChange(e, setCurrency)}
                  className="print-text w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ل.س">ليرة سورية (ل.س)</option>
                  <option value="$">دولار أمريكي ($)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="px-[16mm] pt-[9mm]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">تفاصيل المشروع</h3>
                <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-blue-600 to-rose-600" />
              </div>
              <button type="button" onClick={addItem} className="no-print inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
                <Plus size={17} /> إضافة بند
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-white">
                    <th className="no-print w-[5%] px-2 py-4 text-center text-xs font-black">مدفوع</th>
                    <th className="w-[8%] px-3 py-4 text-center text-xs font-black">#</th>
                    <th className="w-[37%] px-4 py-4 text-right text-xs font-black">البيان</th>
                    <th className="w-[15%] px-3 py-4 text-center text-xs font-black">الكمية</th>
                    <th className="w-[15%] px-3 py-4 text-center text-xs font-black">السعر الإفرادي ({currency})</th>
                    <th className="w-[15%] px-3 py-4 text-center text-xs font-black">الإجمالي ({currency})</th>
                    <th className="no-print w-[5%] px-2 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    const paidClass = item.is_paid ? "line-through text-slate-400 opacity-50" : "";
                    return (
                      <tr key={item.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="no-print px-2 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={Boolean(item.is_paid)} 
                            onChange={() => toggleItemPaidStatus(item.id)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          />
                        </td>
                        <td className={`px-3 py-4 text-center text-sm font-bold text-slate-500 ${paidClass}`}>{index + 1}</td>
                        <td className="px-4 py-3">
                          <input type="text" value={item.description ?? ""} onChange={(e) => { updateItem(item.id, "description", e.target.value); e.target.setAttribute("value", e.target.value); }} placeholder="وصف الخدمة أو البند" className={`print-text w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white ${paidClass}`} />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min={0} step="1" value={item.quantity ?? ""} onChange={(e) => { updateItem(item.id, "quantity", e.target.value); e.target.setAttribute("value", e.target.value); }} className={`print-text w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm font-bold outline-none focus:border-blue-500 focus:bg-white ${paidClass}`} />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min={0} step="0.01" value={item.unitPrice ?? ""} onChange={(e) => { updateItem(item.id, "unitPrice", e.target.value); e.target.setAttribute("value", e.target.value); }} className={`print-text w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm font-bold outline-none focus:border-blue-500 focus:bg-white ${paidClass}`} />
                        </td>
                        <td className={`px-3 py-3 text-center ${paidClass}`}>
                          <span className="font-black text-slate-900">{formatNumber(lineTotal)} {currency}</span>
                        </td>
                        <td className="no-print px-2 py-3 text-center">
                          <button type="button" onClick={() => removeItem(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50" title="حذف البند"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-auto px-[16mm] pb-[4mm] pt-[9mm]">
            <div className="grid grid-cols-[1fr_75mm] gap-8">
              <div className="flex flex-col justify-end">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="mb-3 font-black text-slate-900">ملاحظات</h4>
                  <textarea 
                    value={notes || ""} 
                    onChange={(e) => handleInputChange(e, setNotes)} 
                    placeholder="أضف أي ملاحظات خاصة بالمشروع أو الفاتورة..." 
                    rows={3} 
                    className="print-text w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-500">المجموع الفرعي</span>
                    <span className="font-black text-slate-900">{formatNumber(subtotal)} {currency}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-500">الخصم</span>
                      <div className="no-print flex items-center gap-1">
                        <input type="number" min={0} max={100} step="0.5" value={discount ?? 0} onChange={(e) => { setDiscount(Number(e.target.value)); e.target.setAttribute("value", e.target.value); }} className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-bold outline-none focus:border-blue-500" />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                      <span className="hidden text-sm font-bold text-slate-700 print:inline">{formatNumber(discount)}%</span>
                    </div>
                    <span className="font-black text-rose-600">- {formatNumber(discountAmount)} {currency}</span>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-5 text-white">
                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                      <span className="text-sm font-bold text-slate-300">السعر الكامل</span>
                      <span className="text-xl font-black">{formatNumber(grandTotal)} <span className="text-sm text-slate-300">{currency}</span></span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-emerald-400">الدفعة المستلمة</span>
                      <span className="text-lg font-black text-emerald-400">{formatNumber(amountPaid)} <span className="text-sm">{currency}</span></span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <span className="text-base font-black text-rose-400">الرصيد المطلوب (المتبقي)</span>
                      <span className="text-2xl font-black text-rose-400">{formatNumber(amountDue)} <span className="text-sm text-rose-300">{currency}</span></span>
                    </div>
                    
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                        style={{ width: grandTotal > 0 ? `${Math.min(100, (amountPaid / grandTotal) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* قسم الملاحظات أسفل قسم الإجماليات */}
            {Boolean(notes && notes.trim()) && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">ملاحظات:</h4>
                <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-800">{notes}</p>
              </div>
            )}
          </section>

          <section className="px-[16mm] pb-[6mm] pt-[4mm]">
            <div className="grid grid-cols-3 gap-4 sm:gap-6 items-end text-slate-800 px-[6mm]">
              {/* Right in RTL: مشرفة النظام */}
              <div className="text-center relative">
                <div className="no-print absolute -top-8 right-0 left-0 flex justify-center">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition">
                    <input 
                      type="checkbox" 
                      checked={Boolean(signRola)} 
                      onChange={(e) => setSignRola(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    توقيع رقمي
                  </label>
                </div>
                <p className="font-bold text-sm mb-12 relative h-12 flex flex-col justify-end text-slate-600">
                  {supervisorProfiles.find(s => s.id === 'rola')?.role || 'مشرفة النظام'}
                  {signRola && (
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-80 pointer-events-none text-3xl text-rose-600" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                      Rola.S
                    </span>
                  )}
                </p>
                <div className="w-32 sm:w-36 border-t border-slate-400 mx-auto"></div>
                <p className="font-black text-sm mt-3 text-slate-900">
                  توقيع {supervisorProfiles.find(s => s.id === 'rola')?.name || 'م. رولا الصمادي'}
                </p>
              </div>

              {/* Middle in RTL: مشرف النظام */}
              <div className="text-center relative">
                <div className="no-print absolute -top-8 right-0 left-0 flex justify-center">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition">
                    <input 
                      type="checkbox" 
                      checked={Boolean(signMohammed)} 
                      onChange={(e) => setSignMohammed(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    توقيع رقمي
                  </label>
                </div>
                <p className="font-bold text-sm mb-12 relative h-12 flex flex-col justify-end text-slate-600">
                  {supervisorProfiles.find(s => s.id === 'mohammed')?.role || 'مشرف النظام'}
                  {signMohammed && (
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-80 pointer-events-none text-2xl text-emerald-600" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                      M.Abdelrahman
                    </span>
                  )}
                </p>
                <div className="w-32 sm:w-36 border-t border-slate-400 mx-auto"></div>
                <p className="font-black text-sm mt-3 text-slate-900">
                  توقيع {supervisorProfiles.find(s => s.id === 'mohammed')?.name || 'م. محمد عبدالرحمن'}
                </p>
              </div>

              {/* Left in RTL: مدير النظام */}
              <div className="text-center relative">
                <div className="no-print absolute -top-8 right-0 left-0 flex justify-center">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition">
                    <input 
                      type="checkbox" 
                      checked={Boolean(signYoussef)} 
                      onChange={(e) => setSignYoussef(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    توقيع رقمي
                  </label>
                </div>
                <p className="font-bold text-sm mb-12 relative h-12 flex flex-col justify-end text-slate-600">
                  {supervisorProfiles.find(s => s.id === 'youssef')?.role || 'مدير النظام'}
                  {signYoussef && (
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-80 pointer-events-none text-2xl text-blue-600" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                      Youssef
                    </span>
                  )}
                </p>
                <div className="w-32 sm:w-36 border-t border-slate-400 mx-auto"></div>
                <p className="font-black text-sm mt-3 text-slate-900">
                  توقيع {supervisorProfiles.find(s => s.id === 'youssef')?.name || 'م. يوسف النجار'}
                </p>
              </div>
            </div>
          </section>

          <footer className="relative mt-auto overflow-hidden bg-slate-950 px-[16mm] py-[8mm] text-white">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-purple-500 to-rose-600" />
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div>
                <div className="text-lg font-black" dir="ltr">
                  <span className="text-white">Cardio</span><span className="text-rose-500">Vision</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-400">شكراً لثقتكم بمنصة CardioVision</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-blue-400" />0964809575</span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><MapPin size={14} className="text-rose-400 shrink-0" /><span>دمشق-الطبالة | حماة-الشريعة</span></span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Scan</div>
                  <div className="text-xs font-bold text-slate-300">CardioVision Platform</div>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-xl">
                  <img src="/QR.jpg?v=2" alt="CardioVision QR Code" className="h-[24mm] w-[24mm] object-contain" />
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Client Management Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                إدارة قائمة العملاء
              </h3>
              <button 
                onClick={() => {
                  setIsClientModalOpen(false);
                  setEditingClient(null);
                  setNewClientName("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="اسم العميل الجديد..."
                  value={newClientName || ""}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleSaveClient}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  {editingClient ? "تحديث" : "إضافة"}
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {savedClients.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">لا يوجد عملاء محفوظين حالياً</p>
              ) : (
                savedClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                    <span 
                      onClick={() => selectClient(client.name)}
                      className="font-bold text-sm text-slate-800 cursor-pointer hover:text-blue-600 flex-1"
                    >
                      {client.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(client);
                          setNewClientName(client.name);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-blue-600 px-2 py-1 rounded"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 px-2 py-1 rounded"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsClientModalOpen(false);
                  setEditingClient(null);
                  setNewClientName("");
                }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}