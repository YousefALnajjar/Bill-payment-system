import re

with open('src/components/Invoice.tsx', 'r') as f:
    content = f.read()

# Add Users, Edit2 icons
content = content.replace('Trash2,', 'Trash2,\n  Users,\n  Edit2,\n  X,')

# Add Client type and state
state_injection = """
type Client = {
  id: string;
  name: string;
};

export default function ProjectInvoice() {
  const [savedClients, setSavedClients] = useState<Client[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClientName, setNewClientName] = useState("");

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
"""
content = content.replace('export default function ProjectInvoice() {', state_injection)

# Add Client Management Modal
modal_code = """
      {/* Client Management Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="text-blue-600" />
                إدارة العملاء
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="اسم العميل الجديد..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveClient();
                  }
                }}
              />
              <button 
                onClick={handleSaveClient}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                {editingClient ? "تحديث" : "إضافة"}
              </button>
              {editingClient && (
                <button 
                  onClick={() => {
                    setEditingClient(null);
                    setNewClientName("");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                >
                  إلغاء
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {savedClients.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm font-medium py-8">لا يوجد عملاء محفوظين بعد.</p>
                ) : (
                  savedClients.map(client => (
                    <div key={client.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <span className="font-bold text-slate-800 text-sm">{client.name}</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => selectClient(client.name)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          اختيار
                        </button>
                        <button 
                          onClick={() => {
                            setEditingClient(client);
                            setNewClientName(client.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(client.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace('{/* Client Management Modal */}', '') # clear if exists
content = content.replace('export default function ProjectInvoice() {', '{/* Client Management Modal */}\nexport default function ProjectInvoice() {')
content = content.replace('{/* Client Management Modal */}\nexport default function ProjectInvoice() {', 'export default function ProjectInvoice() {')
content = content.replace('return (\n    <div className="min-h-screen', modal_code + '\n    return (\n    <div className="min-h-screen')

# Add the button in the UI
customer_label_html = """
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
"""
content = content.replace('<label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">اسم الجهة / العميل</label>', customer_label_html)


with open('src/components/Invoice.tsx', 'w') as f:
    f.write(content)

