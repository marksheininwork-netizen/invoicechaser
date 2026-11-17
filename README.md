# InvoiceChaser

A lightweight invoice desk for independent service businesses. Search, filter, and edit invoices; track due dates and balances; prepare reminder drafts; and export a CSV backup.

## Run locally

Open `index.html` in a modern browser. No install or build step is required. Demo records and new entries are stored in this browser's local storage only. Reminder actions copy a draft or open a prefilled email if you choose; they never send a message.

## Checks

Run `node --test core.test.mjs` with Node.js 18 or newer.

## Scope

This prototype has no login, server, shared customer data, or payment processing. The early-access link opens a prefilled GitHub issue for an inbound request.
