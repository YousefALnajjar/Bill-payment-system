import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

target = """                        ) : (
                          {inv.amount_paid > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                              مدفوعة جزئياً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                              غير مدفوعة
                            </span>
                          )}
                        )}"""

replacement = """                        ) : inv.amount_paid > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                            مدفوعة جزئياً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                            غير مدفوعة
                          </span>
                        )}"""

content = content.replace(target, replacement)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
