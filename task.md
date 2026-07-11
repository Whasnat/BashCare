# BashaCare — Task Tracker

## Phase 1 — Foundation
- [x] Initialize Vite + React frontend
- [x] Initialize Fastify backend
- [x] PostgreSQL connection pool + RLS context injector
- [x] DB migration files (all tables, ENUMs, FKs)
- [x] RLS policies SQL
- [x] DB triggers (utility meter, lease constraint)
- [x] DB view: invoice_calculated_totals
- [x] JWT auth (register, login, role guards)
- [x] Global CSS design system (dark theme, typography, tokens)

## Phase 2 — Core Property Management
- [x] Properties CRUD (API + UI)
- [x] Units CRUD with status management (API + UI)
- [x] Tenant profile management (API + UI)
- [x] Lease creation + constraint trigger (API + UI)
- [x] Lease termination & history UI (TerminateModal in Leases.jsx)

## Phase 3 — Ledger & Billing Engine
- [x] Invoice generation (POST /invoices/generate + GenerateModal UI)
- [x] Utility meter log entry (POST /utilities/log, delta trigger in SQL)
- [x] Manual balance adjustments (POST /invoices/:id/adjustments + AdjustModal UI)
- [x] Billing dashboard UI (Billing.jsx — generate, cash pay, adjust)

## Phase 4 — Payment System
- [x] Payment settings page (Settings.jsx — MFS, bank, bKash, Nagad, Rocket keys)
- [x] Manual TrxID submission (POST /payments/submit-trxid)
- [x] Pending verification queue (Payments.jsx — approve/reject)
- [x] Cash payment logging (POST /payments/cash)
- [x] Double-entry allocation logic (allocatePayment in payments.js)
- [ ] MFS Merchant checkout (bKash/Nagad/Rocket Web Checkout — needs live credentials)
- [ ] Webhook endpoints (stub in webhooks.js — needs live API keys)

## Phase 5 — Notifications, Portals & Admin
- [x] Tenant Portal — Dashboard (lease info, outstanding balance, payment instructions)
- [x] Tenant Portal — Invoice list (filterable/searchable)
- [x] Tenant Portal — Invoice detail + TrxID submission modal
- [x] Tenant Portal backend routes (/api/v1/portal/*)
- [x] System Admin portal (AdminDashboard.jsx — landlord approval/suspend, stats)
- [x] Reports & analytics (Reports.jsx — revenue area chart, pie, occupancy bars)
- [ ] WhatsApp API + SMS fallback (needs Meta API credentials)

## Phase 6 — Polish & Deploy
- [x] Bug fix: Login.jsx hardcoded credentials (fixed to use form state)
- [x] Bug fix: tenants.js GET /:id missing `reply` param (fixed)
- [x] Role-aware sidebar (landlord / manager / tenant / admin separate nav)
- [x] Role-aware ProtectedRoute redirects
- [ ] RLS security audit
- [ ] Mobile responsive layouts
- [ ] Framer Motion animations (skeleton loaders partially done on tables)
- [ ] Docker Compose setup

