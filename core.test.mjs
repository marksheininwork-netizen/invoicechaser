import test from 'node:test';
import assert from 'node:assert/strict';
import { dueLabel, invoiceStatus, reminderText, shiftISODate, totals, money } from './core.mjs';

test('invoice status handles overdue, due today, upcoming, and paid', () => {
  assert.equal(invoiceStatus({ due: '2026-11-15' }, '2026-11-16'), 'overdue');
  assert.equal(invoiceStatus({ due: '2026-11-16' }, '2026-11-16'), 'today');
  assert.equal(invoiceStatus({ due: '2026-11-17' }, '2026-11-16'), 'upcoming');
  assert.equal(invoiceStatus({ due: '2026-11-01', status: 'paid' }, '2026-11-16'), 'paid');
});

test('invoice totals distinguish due today and exclude paid invoices', () => {
  assert.deepEqual(totals([
    { amount: 12, due: '2026-11-15' },
    { amount: 8, due: '2026-11-16' },
    { amount: 5, due: '2026-12-01' },
    { amount: 50, due: '2026-11-01', status: 'paid' },
  ], '2026-11-16'), { outstanding: 25, overdue: 12, dueToday: 8, paid: 50 });
});

test('local date arithmetic handles month and leap-year boundaries', () => {
  assert.equal(shiftISODate('2024-02-28', 1), '2024-02-29');
  assert.equal(shiftISODate('2024-02-29', 1), '2024-03-01');
  assert.equal(shiftISODate('2026-12-31', 1), '2027-01-01');
});

test('due labels explain the next step and reminders remain drafts', () => {
  assert.equal(dueLabel('2026-11-16', '2026-11-16'), 'Due today');
  assert.equal(dueLabel('2026-11-17', '2026-11-16'), 'Due tomorrow');
  assert.equal(dueLabel('2026-11-14', '2026-11-16'), '2 days overdue');
  const text = reminderText({ client: 'Ari', number: '7', amount: 20, due: '2026-11-10' });
  assert.match(text, /Ari/);
  assert.match(text, /\$20\.00/);
  assert.match(money(20), /20\.00/);
});
