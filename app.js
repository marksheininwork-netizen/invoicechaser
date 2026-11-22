import { dueLabel, invoiceStatus, localISODate, money, reminderText, shiftISODate, totals } from './core.mjs';

const storageKey = 'invoicechaser.invoices.v1';
const sampleInvoices = () => [
  { id: crypto.randomUUID(), client: 'Northstar Studio', number: 'INV-104', amount: 1400, paidAmount: 0, due: shiftISODate(localISODate(), -8), email: '', status: 'open' },
  { id: crypto.randomUUID(), client: 'Morrow & Co.', number: 'INV-108', amount: 2880, paidAmount: 0, due: shiftISODate(localISODate(), 11), email: '', status: 'open' },
];

function readInvoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return Array.isArray(saved) ? saved.map(invoice => ({ ...invoice, paidAmount: invoice.paidAmount == null ? (invoice.status === 'paid' ? Number(invoice.amount) || 0 : 0) : Math.max(0, Number(invoice.paidAmount) || 0), status: 'open' })) : sampleInvoices();
  } catch {
    return sampleInvoices();
  }
}

let invoices = readInvoices();
// Persist first-run sample records so the dashboard and analytics pages share the same data.
if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(invoices));
window.dispatchEvent(new Event('app-data-updated'));
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
  window.dispatchEvent(new Event('app-data-updated'));
  render();
}


function setupDataBackup(appName, readRecords, replaceRecords, isValidRecord) {
  $('#backup-export').onclick = () => {
    const payload = { app: appName, version: 1, exportedAt: new Date().toISOString(), records: readRecords() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${appName}-backup-${localISODate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded');
  };
  $('#backup-import').onclick = () => $('#backup-file').click();
  $('#backup-file').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup.app !== appName || backup.version !== 1 || !Array.isArray(backup.records) || !backup.records.every(isValidRecord)) {
        throw new Error('This file is not a valid backup for this app.');
      }
      if (!confirm(`Replace this device’s current data with ${backup.records.length} records from this backup? This cannot be undone.`)) return;
      replaceRecords(backup.records);
      persist();
      toast(`Imported ${backup.records.length} records`);
    } catch (error) {
      toast(error instanceof SyntaxError ? 'Could not read that backup file' : error.message || 'Could not import backup');
    } finally {
      event.target.value = '';
    }
  };
}
setupDataBackup('invoicechaser', () => invoices, records => { invoices = records; }, invoice => invoice && typeof invoice.client === 'string' && Number.isFinite(Number(invoice.amount)) && typeof invoice.due === 'string');

function editInvoice(invoice) {
  for (const field of ['id', 'client', 'number', 'amount', 'paidAmount', 'due', 'email']) {
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
      <td><b class="amount"></b><small class="amount-note"></small></td>
      <td><span class="pill"></span></td>
      <td><div class="row-actions"></div></td>`;
    row.querySelector('.client-name').textContent = invoice.client;
    row.querySelector('.invoice-number').textContent = invoice.number || 'Invoice';
    row.querySelector('time').dateTime = invoice.due;
    row.querySelector('time').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${invoice.due}T12:00:00`));
    row.querySelector('.due-note').textContent = dueLabel(invoice.due, today);
    const balance = Math.max(0, Number(invoice.amount) - (Number(invoice.paidAmount) || 0));
    row.querySelector('.amount').textContent = money(balance);
    row.querySelector('.amount-note').textContent = (Number(invoice.paidAmount) || 0) > 0 && balance > 0 ? `of ${money(invoice.amount)} total` : balance === 0 ? 'Paid in full' : '';
    const badge = row.querySelector('.pill');
    const partial = balance > 0 && (Number(invoice.paidAmount) || 0) > 0;
    badge.className = `pill ${partial ? 'partial' : status}`;
    badge.textContent = partial ? `Partially paid · ${({ today: 'Due today', upcoming: 'Upcoming', overdue: 'Past due' })[status]}` : ({ today: 'Due today', upcoming: 'Upcoming', overdue: 'Past due', paid: 'Paid' })[status];

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
        invoice.paidAmount = Number(invoice.amount) || 0;
        invoice.status = 'open';
        persist();
        toast('Invoice marked paid');
      };
      actions.append(paid);
      const recordPayment = document.createElement('button');
      recordPayment.type = 'button';
      recordPayment.textContent = 'Record payment';
      recordPayment.onclick = () => {
        const balance = Math.max(0, Number(invoice.amount) - (Number(invoice.paidAmount) || 0));
        const entered = prompt(`Record a payment for ${invoice.client}. Remaining balance: ${money(balance)}`, String(balance));
        if (entered === null) return;
        const amount = Number(entered);
        if (!Number.isFinite(amount) || amount <= 0) { toast('Enter a payment greater than zero'); return; }
        if (amount > balance) { toast('Payment cannot exceed the remaining balance'); return; }
        invoice.paidAmount = (Number(invoice.paidAmount) || 0) + amount;
        invoice.payments = [...(invoice.payments || []), { amount, date: localISODate() }];
        persist();
        toast(`Payment of ${money(amount)} recorded`);
      };
      actions.append(recordPayment);
    } else {
      const reopen = document.createElement('button');
      reopen.type = 'button';
      reopen.textContent = 'Reopen';
      reopen.onclick = () => { invoice.paidAmount = 0; invoice.status = 'open'; persist(); toast('Invoice reopened with full balance'); };
      actions.append(reopen);
    }
    const duplicate = document.createElement('button');
    duplicate.type = 'button';
    duplicate.textContent = 'Duplicate';
    duplicate.setAttribute('aria-label', `Duplicate invoice for ${invoice.client}`);
    duplicate.onclick = () => {
      const copy = { ...invoice, id: crypto.randomUUID(), number: `INV-${String(Date.now()).slice(-6)}`, paidAmount: 0, status: 'open' };
      invoices.unshift(copy);
      persist();
      toast('Invoice duplicated as open');
    };
    actions.append(duplicate);
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
  const amount = Number(values.amount);
  const paidAmount = Number(values.paidAmount) || 0;
  if (paidAmount > amount) { toast('Amount paid cannot exceed the invoice total'); form.elements.namedItem('paidAmount').focus(); return; }
  const invoice = { ...existing, ...values, id: existing?.id || crypto.randomUUID(), number, client: values.client.trim(), amount, paidAmount, status: 'open' };
  if (existing) invoices = invoices.map(item => item.id === existing.id ? invoice : item);
  else invoices.unshift(invoice);
  form.reset();
  form.classList.add('hidden');
  persist();
  toast(existing ? 'Invoice updated on this device' : 'Invoice saved on this device');
};

$('#export').onclick = () => {
  const rows = [['Client', 'Invoice', 'Total', 'Paid', 'Balance', 'Due date', 'Status'], ...invoices.map(invoice => [invoice.client, invoice.number, invoice.amount, invoice.paidAmount || 0, Math.max(0, Number(invoice.amount) - (Number(invoice.paidAmount) || 0)), invoice.due, invoiceStatus(invoice)])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invoices.csv';
  link.click();
  URL.revokeObjectURL(url);
};

render();

import './feature-pages.js';
