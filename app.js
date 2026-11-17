import { dueLabel, invoiceStatus, localISODate, money, reminderText, shiftISODate, totals } from './core.mjs';

const storageKey = 'invoicechaser.invoices.v1';
const sampleInvoices = () => [
  { id: crypto.randomUUID(), client: 'Northstar Studio', number: 'INV-104', amount: 1400, due: shiftISODate(localISODate(), -8), email: '', status: 'open' },
  { id: crypto.randomUUID(), client: 'Morrow & Co.', number: 'INV-108', amount: 2880, due: shiftISODate(localISODate(), 11), email: '', status: 'open' },
];

function readInvoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return Array.isArray(saved) ? saved : sampleInvoices();
  } catch {
    return sampleInvoices();
  }
}

let invoices = readInvoices();
let filter = 'all';
const $ = selector => document.querySelector(selector);
const form = $('#invoice-form');

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2200);
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(invoices));
  render();
}

function editInvoice(invoice) {
  for (const field of ['id', 'client', 'number', 'amount', 'due', 'email']) {
    form.elements.namedItem(field).value = invoice[field] ?? '';
  }
  form.querySelector('[type="submit"]').textContent = 'Save changes';
  form.classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.elements.namedItem('client').focus();
}

function render() {
  const summary = totals(invoices);
  const today = localISODate();
  $('#stats').innerHTML = `
    <div class="stat"><label>Outstanding</label><strong>${money(summary.outstanding)}</strong></div>
    <div class="stat"><label>Past due</label><strong>${money(summary.overdue)}</strong></div>
    <div class="stat"><label>Due today</label><strong>${money(summary.dueToday)}</strong></div>`;

  const query = $('#invoice-search').value.trim().toLowerCase();
  const visible = invoices.filter(invoice => {
    const status = invoiceStatus(invoice, today);
    const matchesFilter = filter === 'all' || status === filter;
    const matchesQuery = `${invoice.client} ${invoice.number || ''}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  const body = $('#invoices');
  body.replaceChildren();

  for (const invoice of visible) {
    const status = invoiceStatus(invoice, today);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><div class="client-name"></div><div class="invoice-number"></div></td>
      <td><time></time><small class="due-note"></small></td>
      <td><b class="amount"></b></td>
      <td><span class="pill"></span></td>
      <td><div class="row-actions"></div></td>`;
    row.querySelector('.client-name').textContent = invoice.client;
    row.querySelector('.invoice-number').textContent = invoice.number || 'Invoice';
    row.querySelector('time').dateTime = invoice.due;
    row.querySelector('time').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${invoice.due}T12:00:00`));
    row.querySelector('.due-note').textContent = dueLabel(invoice.due, today);
    row.querySelector('.amount').textContent = money(invoice.amount);
    const badge = row.querySelector('.pill');
    badge.className = `pill ${status}`;
    badge.textContent = ({ today: 'Due today', upcoming: 'Upcoming', overdue: 'Past due', paid: 'Paid' })[status];

    const actions = row.querySelector('.row-actions');
    if (status !== 'paid') {
      const draft = document.createElement('button');
      draft.type = 'button';
      draft.textContent = invoice.email ? 'Draft email' : 'Copy reminder';
      draft.setAttribute('aria-label', `${invoice.email ? 'Open email draft for' : 'Copy reminder for'} ${invoice.client}`);
      draft.onclick = async () => {
        const message = reminderText(invoice);
        if (invoice.email) {
          const subject = `Payment reminder: ${invoice.number || 'invoice'}`;
          window.location.href = `mailto:${encodeURIComponent(invoice.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
          toast('Email draft opened. Review it before sending.');
          return;
        }
        try {
          await navigator.clipboard.writeText(message);
          toast('Reminder copied. Review and send it yourself.');
        } catch {
          prompt('Copy this reminder draft:', message);
        }
      };
      actions.append(draft);
      const paid = document.createElement('button');
      paid.type = 'button';
      paid.textContent = 'Mark paid';
      paid.onclick = () => {
        invoice.status = 'paid';
        persist();
        toast('Invoice marked paid');
      };
      actions.append(paid);
    } else {
      const reopen = document.createElement('button');
      reopen.type = 'button';
      reopen.textContent = 'Reopen';
      reopen.onclick = () => { invoice.status = 'open'; persist(); };
      actions.append(reopen);
    }
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.onclick = () => editInvoice(invoice);
    actions.append(edit);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete invoice for ${invoice.client}`);
    remove.onclick = () => {
      if (!confirm(`Delete invoice ${invoice.number || ''} for ${invoice.client}?`)) return;
      invoices = invoices.filter(item => item.id !== invoice.id);
      persist();
      toast('Invoice deleted');
    };
    actions.append(remove);
    body.append(row);
  }

  const noMatches = visible.length === 0;
  $('#empty').classList.toggle('hidden', !noMatches);
  $('#empty').textContent = invoices.length === 0
    ? 'Your invoice list is clear. Add an invoice to start tracking.'
    : 'No invoices match this search. Try another name or filter.';
  $('.table-wrap').classList.toggle('hidden', noMatches);
}

$('#add-toggle').onclick = () => {
  form.reset();
  form.elements.namedItem('id').value = '';
  form.querySelector('[type="submit"]').textContent = 'Save invoice';
  form.classList.remove('hidden');
  form.querySelector('[name="client"]').focus();
};
$('#cancel').onclick = () => { form.reset(); form.classList.add('hidden'); };
$('#invoice-search').addEventListener('input', render);
$('#invoice-filter').addEventListener('change', event => { filter = event.target.value; render(); });

form.onsubmit = event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const number = values.number.trim();
  if (number && invoices.some(invoice => invoice.id !== values.id && invoice.number?.toLowerCase() === number.toLowerCase())) {
    toast('That invoice number is already in your list');
    form.querySelector('[name="number"]').focus();
    return;
  }
  const existing = invoices.find(invoice => invoice.id === values.id);
  const invoice = { ...existing, ...values, id: existing?.id || crypto.randomUUID(), number, client: values.client.trim(), amount: Number(values.amount), status: existing?.status || 'open' };
  if (existing) invoices = invoices.map(item => item.id === existing.id ? invoice : item);
  else invoices.unshift(invoice);
  form.reset();
  form.classList.add('hidden');
  persist();
  toast(existing ? 'Invoice updated on this device' : 'Invoice saved on this device');
};

$('#export').onclick = () => {
  const rows = [['Client', 'Invoice', 'Amount', 'Due date', 'Status'], ...invoices.map(invoice => [invoice.client, invoice.number, invoice.amount, invoice.due, invoiceStatus(invoice)])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invoices.csv';
  link.click();
  URL.revokeObjectURL(url);
};

render();
