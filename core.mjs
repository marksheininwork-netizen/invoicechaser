export const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
}).format(Number(value) || 0);

export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftISODate(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

export function invoiceStatus(invoice, today = localISODate()) {
  if (invoice.status === 'paid') return 'paid';
  if (invoice.due < today) return 'overdue';
  if (invoice.due === today) return 'today';
  return 'upcoming';
}

export function totals(invoices, today = localISODate()) {
  return invoices.reduce((sum, invoice) => {
    const status = invoiceStatus(invoice, today);
    const amount = Number(invoice.amount) || 0;
    if (status !== 'paid') sum.outstanding += amount;
    if (status === 'overdue') sum.overdue += amount;
    if (status === 'today') sum.dueToday += amount;
    if (status === 'paid') sum.paid += amount;
    return sum;
  }, { outstanding: 0, overdue: 0, dueToday: 0, paid: 0 });
}

export function dueLabel(due, today = localISODate()) {
  const delta = Math.round((new Date(`${due}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000);
  if (delta < 0) return `${Math.abs(delta)} day${delta === -1 ? '' : 's'} overdue`;
  if (delta === 0) return 'Due today';
  if (delta === 1) return 'Due tomorrow';
  return `Due in ${delta} days`;
}

export function reminderText(invoice) {
  const reference = invoice.number ? ` ${invoice.number}` : '';
  return `Hi ${invoice.client}, just a friendly reminder that invoice${reference} for ${money(invoice.amount)} was due on ${invoice.due}. Please let me know if you have any questions. Thanks!`;
}
