import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update logo and header background
target_header = """            <header className="relative overflow-hidden bg-[#050b1a] px-[16mm] pb-[15mm] pt-[13mm] text-white">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-4xl font-black tracking-tight">
                    <span className="text-white">Cardio</span>
                    <span className="text-rose-500">Vision</span>
                  </div>"""

replacement_header = """            <header className="relative overflow-hidden bg-slate-950 px-[16mm] pb-[15mm] pt-[13mm] text-slate-100">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-4xl font-black tracking-tight flex items-center" dir="ltr">
                    <span className="text-white">Cardio</span>
                    <span className="text-rose-600">Vision</span>
                  </div>"""

content = content.replace(target_header, replacement_header)

# 2. Update gradient line in header
target_gradient = """<div className="relative z-10 mt-8 h-[2px] w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 via-purple-500 to-rose-600" />"""
replacement_gradient = """<div className="relative z-10 mt-8 h-[2px] w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-rose-600" />"""
content = content.replace(target_gradient, replacement_gradient)

# 3. Update table header background
target_table_header = """                  <thead>
                    <tr className="bg-[#050b1a] text-white">"""
replacement_table_header = """                  <thead>
                    <tr className="bg-slate-950 text-slate-100">"""
content = content.replace(target_table_header, replacement_table_header)

# 4. Update "Paid" icon color
target_paid = """                            {isPaid ? <span className="text-emerald-600 font-black">✔️ مدفوع</span> : <span className="text-slate-400">-</span>}"""
replacement_paid = """                            {isPaid ? <span className="text-emerald-500 font-black">✔️ مدفوع</span> : <span className="text-slate-400">-</span>}"""
content = content.replace(target_paid, replacement_paid)


with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)

