import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Add ChevronLeft and ChevronRight imports from lucide-react if not present
if "ChevronLeft" not in content:
    content = content.replace("Loader2\n} from 'lucide-react';", "Loader2,\n  ChevronLeft,\n  ChevronRight\n} from 'lucide-react';")
elif "ChevronLeft" not in content and "Loader2} from 'lucide-react';" in content:
    content = content.replace("Loader2} from 'lucide-react';", "Loader2, ChevronLeft, ChevronRight} from 'lucide-react';")
else:
    # try another replace
    content = content.replace("Loader2", "Loader2,\n  ChevronLeft,\n  ChevronRight")

# 2. Add state for currentPage
state_target = """  const [isLoading, setIsLoading] = useState(true);

  // حالة النافذة المنبثقة"""

state_replacement = """  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // حالة النافذة المنبثقة"""
content = content.replace(state_target, state_replacement)

# 3. Add useEffect to reset currentPage on filter changes
filter_target = """  const filteredInvoices = useMemo(() => {"""
filter_replacement = """  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCustomer, startDate, endDate, paymentStatus]);

  // الفلترة والبحث
  const filteredInvoices = useMemo(() => {"""
content = content.replace(filter_target, filter_replacement)

# 4. Calculate pagination
pag_target = """  const confirmDelete = async () => {"""
pag_replacement = """  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const confirmDelete = async () => {"""
content = content.replace(pag_target, pag_replacement)

# 5. Replace filteredInvoices.map with paginatedInvoices.map in the table
#    Also need to change filteredInvoices.length > 0
table_target = """                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv) => ("""
table_replacement = """                ) : paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((inv) => ("""
content = content.replace(table_target, table_replacement)

# 6. Add pagination UI below the table
end_table_target = """            </table>
          </div>
        </div>
      </main>"""

end_table_replacement = """            </table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      عرض <span className="font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> إلى <span className="font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)}</span> من <span className="font-bold">{filteredInvoices.length}</span> فاتورة
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination" dir="ltr">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                            currentPage === i + 1
                              ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                              : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-offset-0'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>"""

content = content.replace(end_table_target, end_table_replacement)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)

