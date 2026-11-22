# InvoiceChaser

A lightweight invoice desk for independent service businesses. Search, filter, edit, and duplicate invoices; track due dates, partial payments, and remaining balances; prepare reminder drafts; export CSV; and download or restore a versioned JSON backup.

## Live PWA

Install InvoiceChaser from [its public web app](https://marksheininwork-netizen.github.io/invoicechaser/). The app shell works offline after the first visit; invoice data is stored in the current browser only. See the [privacy policy](https://marksheininwork-netizen.github.io/invoicechaser/privacy.html) and [support page](https://marksheininwork-netizen.github.io/invoicechaser/support.html).

## Run locally

Open `index.html` in a modern browser. No install or build step is required. Demo records and new entries are stored in this browser's local storage only. Reminder actions copy a draft or open a prefilled email if you choose; they never send a message.

## Checks

Run `node --test` with Node.js 18 or newer to check core workflows, PWA assets, manifest wiring, and offline fallback.

## Scope

This prototype has no login, server, shared customer data, or payment processing. The early-access link opens a prefilled GitHub issue for an inbound request.
