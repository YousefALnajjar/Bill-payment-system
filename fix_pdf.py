import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

target_header = """            <header className="relative overflow-hidden bg-slate-950 px-[16mm] pb-[15mm] pt-[13mm] text-slate-100">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-4xl font-black tracking-tight flex items-center" dir="ltr">
                    <span className="text-white">Cardio</span>
                    <span className="text-rose-600">Vision</span>
                  </div>
                  <p className="mt-1 max-w-[90mm] text-sm leading-7 text-slate-300">
                    منصة متخصصة في المشاريع الهندسية والطبية والبرمجية وحلول الذكاء الاصطناعي
                  </p>
                </div>
                <div className="min-w-[42mm] text-left">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 backdrop-blur">فاتورة رسمية</div>
                  <div className="mt-4">
                    <div className="text-2xl font-black">فاتورة مشروع</div>
                    <div className="mt-1 text-xs font-medium text-slate-400">PROJECT INVOICE</div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 h-[2px] w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-rose-600" />
            </header>"""

replacement_header = """            <header className="relative overflow-hidden bg-slate-950 px-[16mm] pb-[15mm] pt-[13mm] text-slate-100">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <img src="/logo.png" alt="CardioVision Logo" className="h-16 object-contain" />
                  <p className="mt-4 max-w-[90mm] text-sm leading-7 text-slate-300">
                    منصة متخصصة في المشاريع الهندسية والطبية والبرمجية وحلول الذكاء الاصطناعي
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 min-w-[42mm] text-left">
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-black">فاتورة مشروع</div>
                      <div className="mt-1 text-xs font-medium text-slate-400">PROJECT INVOICE</div>
                      <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-bold text-slate-300 backdrop-blur">فاتورة رسمية</div>
                    </div>
                    <img src="/QR.jpg" alt="QR Code" className="h-20 w-20 object-contain rounded-md shadow-sm bg-white p-1" />
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 h-[2px] w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-rose-600" />
            </header>"""

content = content.replace(target_header, replacement_header)


target_footer = """                  </div>
                </div>
              </div>
            </section>
          </div>
        )}"""

replacement_footer = """                  </div>
                </div>
              </div>
              
              <div className="mt-12 flex justify-between items-end border-t border-slate-200 pt-8">
                <div className="text-center w-64">
                  <p className="text-sm font-bold text-slate-500 mb-12">مهندس النظام</p>
                  <p className="text-lg font-black text-slate-900 border-t border-slate-300 pt-3">المهندس يوسف النجار</p>
                </div>
                <div className="text-center w-64">
                  <p className="text-sm font-bold text-slate-500 mb-12">مديرة المشروع</p>
                  <p className="text-lg font-black text-slate-900 border-t border-slate-300 pt-3">المهندسة رولا بسام الصمادي</p>
                </div>
              </div>
            </section>
          </div>
        )}"""

content = content.replace(target_footer, replacement_footer)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
