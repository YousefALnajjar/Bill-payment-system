import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

target = """      let matchesPayment = true;
      if (paymentStatus === 'paid') {
        matchesPayment = inv.amount_paid >= inv.grand_total && inv.grand_total > 0;
      } else if (paymentStatus === 'unpaid') {
        matchesPayment = inv.amount_paid < inv.grand_total || inv.grand_total === 0;
      }"""

replacement = """      let matchesPayment = true;
      if (paymentStatus === 'paid') {
        matchesPayment = inv.amount_paid >= inv.grand_total && inv.grand_total > 0;
      } else if (paymentStatus === 'unpaid') {
        matchesPayment = inv.amount_paid <= 0;
      } else if (paymentStatus === 'partial') {
        matchesPayment = inv.amount_paid > 0 && inv.amount_paid < inv.grand_total;
      }"""

content = content.replace(target, replacement)

target_html = """                <option value="unpaid">غير مدفوعة</option>"""

replacement_html = """                <option value="partial">مدفوعة جزئياً</option>
                <option value="unpaid">غير مدفوعة</option>"""

content = content.replace(target_html, replacement_html)

# also change text-amber-600 to text-blue-600 or orange for partial, and rose for unpaid
# Wait, let's keep amber for partial and use rose for unpaid
target_badge = """                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                            {inv.amount_paid > 0 ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
                          </span>"""

replacement_badge = """                          {inv.amount_paid > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                              مدفوعة جزئياً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                              غير مدفوعة
                            </span>
                          )}"""

content = content.replace(target_badge, replacement_badge)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)

