# InvoiceChaser

A lightweight invoice desk for independent service businesses. The MVP tracks invoices, flags past-due items, prepares reminder drafts, and exports CSV.

## Run locally

Open `index.html` in a modern browser. No install or build step is required. Demo records and new entries are stored in this browser's local storage only. The reminder action copies a draft; it never sends a message.

## Checks

Run `node --test core.test.mjs` with Node.js 18 or newer.

## Scope

This prototype has no login, server, shared customer data, payment processing, or remote lead capture. The early-access link opens a prefilled GitHub issue for an inbound request.
