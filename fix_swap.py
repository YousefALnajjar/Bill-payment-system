import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

target = """              <div className="mt-12 flex justify-between items-end border-t border-slate-200 pt-8">
                <div className="text-center w-64">
                  <p className="text-sm font-bold text-slate-500 mb-12">مهندس النظام</p>
                  <p className="text-lg font-black text-slate-900 border-t border-slate-300 pt-3">المهندس يوسف النجار</p>
                </div>
                <div className="text-center w-64">
                  <p className="text-sm font-bold text-slate-500 mb-12">مديرة المشروع</p>
                  <p className="text-lg font-black text-slate-900 border-t border-slate-300 pt-3">المهندسة رولا بسام الصمادي</p>
                </div>
              </div>"""

replacement = """              <div className="mt-12 flex justify-between items-end border-t border-slate-200 pt-8">
                <div className="text-center w-64">
                  <p className="text-sm font-bold text-slate-500 mb-12">مديرة المشروع</p>
                  <p className="text-lg font-black text-slate-900 border-t border-slate-300 pt-3">المهندسة رولا بسام الصمادي</p>
                </div>
                <div className="text-center w-64">
                  <p className="text-sm font-bold text-slate-500 mb-12">مهندس النظام</p>
                  <p className="text-lg font-black text-slate-900 border-t border-slate-300 pt-3">المهندس يوسف النجار</p>
                </div>
              </div>"""

content = content.replace(target, replacement)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
