export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
export function invoiceStatus(invoice, today = new Date().toISOString().slice(0,10)) {
  if (invoice.status === 'paid') return 'paid';
  return invoice.due < today ? 'overdue' : 'due';
}
export function totals(invoices, today) {
  return invoices.reduce((sum, invoice) => {
    const status = invoiceStatus(invoice, today);
    if (status !== 'paid') sum.outstanding += Number(invoice.amount)||0;
    if (status === 'overdue') sum.overdue += Number(invoice.amount)||0;
    return sum;
  }, {outstanding:0, overdue:0});
}
export function reminderText(invoice) {
  return `Hi ${invoice.client}, just a friendly reminder that invoice ${invoice.number || ''} for ${money(invoice.amount)} was due on ${invoice.due}. Please let me know if you have any questions. Thanks!`;
}
