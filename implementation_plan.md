# BashaCare — Enterprise Tenant Management SaaS Platform
## Implementation Plan

> **Document Source Analysis**: Derived from `BashaCare.docx` (PRD), `NotebookLM Mind Map.png` (architecture overview), and `Secure_Property_Management_Ecosystem.png` (ecosystem diagram).

---

## 1. Project Overview

**BashaCare** is a multi-tenant SaaS platform for property management in Bangladesh. It enables landlords to manage properties, units, tenants, leases, utility billing, and rent collection through an omni-channel payment ecosystem — all powered by a local PostgreSQL database engine with enterprise-grade Row-Level Security (RLS).

### Strategic Goals
| Goal | Description |
|------|-------------|
| **Flawless Data Isolation** | PostgreSQL RLS enforces per-landlord data boundaries at the DB level |
| **Accounting Rigor** | Append-only double-entry ledger for all transactions |
| **Automated Utility Workflows** | Delta-meter calculations via native DB triggers |
| **Omni-Channel Payments** | bKash/Nagad/Rocket (automated) + MFS P2P / Bank / Cash (manual) |

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React.js (Vite SPA) | Fast SPA architecture; component-based dashboards |
| **Backend** | Node.js (Fastify) | High-performance REST API; native PostgreSQL pool support |
| **Database** | PostgreSQL (Local) | RLS, triggers, views, `NUMERIC` precision; local execution speed |
| **Auth** | JWT + bcrypt | Custom auth without third-party cloud dependency |
| **Messaging** | Meta WhatsApp API → SSL Wireless SMS fallback | High-deliverability notifications |
| **Payments** | bKash / Nagad / Rocket Web Checkout APIs | Automated MFS gateway integration |
| **Styling** | Vanilla CSS + CSS Variables | Premium dark-mode glassmorphism design |
| **State** | Zustand | Lightweight, scalable state management |

---

## 3. User Roles & Access Matrix

| Role | RLS Scope | CRUD | Key Restrictions |
|------|-----------|------|-----------------|
| **System Admin** (SaaS Operator) | Bypasses all RLS | Full platform | Approves landlords, flags fraud |
| **Landlord / Building Owner** | Own `landlord_id` only | Full CRUD | Configures payment credentials, views analytics |
| **Property Manager** (Staff) | Landlord's `landlord_id` | Limited R/W | Can log meters & cash; no financial analytics |
| **Tenant** | Own rows only | Read-only | Views invoices, leases, receipts; triggers checkout |

---

## 4. Database Architecture

### 4.1 Multi-Tenancy via RLS

Every table carries a `landlord_id` FK. On every DB transaction, the backend executes:
```sql
SET LOCAL app.current_landlord_id = '<uuid>';
```
PostgreSQL evaluates RLS policies using this session variable before returning any row.

### 4.2 Core Tables

```
landlord_profiles
  id (uuid PK), company_name, email, password_hash,
  bkash_merchant_key, nagad_personal_number, nagad_merchant_key,
  rocket_merchant_key, bank_routing_number, bank_account_number,
  mfs_personal_number, plan_tier, is_active, created_at

properties
  id, landlord_id (FK → landlord_profiles, ON DELETE CASCADE),
  name, address, created_at

units
  id, property_id (FK → properties, ON DELETE CASCADE),
  landlord_id, unit_number,
  status ENUM('VACANT', 'OCCUPIED', 'MAINTENANCE'), created_at

tenant_profiles
  id, landlord_id, full_name, phone_number (UNIQUE),
  encrypted_national_id, emergency_contact, created_at

leases
  id, landlord_id, unit_id (FK → units), tenant_id (FK → tenant_profiles),
  base_rent NUMERIC(12,2), security_deposit NUMERIC(12,2),
  start_date DATE, end_date DATE, is_active BOOLEAN,
  terminated_at TIMESTAMP, created_at

ledger_invoices
  id, landlord_id, lease_id, tenant_id,
  billing_month DATE, base_rent NUMERIC(12,2),
  utility_charges NUMERIC(12,2), manual_adjustments NUMERIC(12,2),
  late_fees NUMERIC(12,2), amount_due NUMERIC(12,2),
  amount_paid NUMERIC(12,2),
  status ENUM('UNPAID','PENDING_VERIFICATION','PARTIALLY_PAID','PAID','OVERDUE'),
  created_at, updated_at

payment_transactions
  id, landlord_id, invoice_id, tenant_id,
  amount NUMERIC(12,2),
  method ENUM('MFS_MERCHANT','MFS_PERSONAL','BANK_TRANSFER','CASH'),
  trx_id VARCHAR, gateway_response JSONB,
  status ENUM('PENDING','VERIFIED','REJECTED'),
  verified_by UUID, verified_at, created_at

utility_meter_logs
  id, landlord_id, unit_id, lease_id,
  meter_type ENUM('ELECTRICITY','GAS','WATER'),
  meter_reading NUMERIC(10,2), reading_date DATE,
  logged_by UUID, created_at

ledger_adjustments
  id, landlord_id, invoice_id,
  adjustment_type ENUM('DISCOUNT','SURCHARGE','REPAIR_FEE','OTHER'),
  amount NUMERIC(12,2), note TEXT,
  created_by UUID, created_at

users (app-level auth)
  id (uuid PK), landlord_id, role ENUM('admin','landlord','manager','tenant'),
  email, password_hash, phone_number,
  linked_entity_id (maps to tenant_profile or landlord_profile),
  is_active, last_login, created_at
```

### 4.3 Key DB Objects

- **VIEW**: `invoice_calculated_totals`
  ```sql
  SELECT (base_rent + utility_charges + manual_adjustments + late_fees)
    AS total_calculated_due FROM ledger_invoices JOIN ledger_adjustments ...
  ```
- **TRIGGER**: `after_insert_utility_meter_log` — auto-calculates delta and appends utility charge to the current open `ledger_invoice`
- **TRIGGER**: `before_insert_lease` — enforces only one active lease per unit per date range; sets `is_active = FALSE` on prior lease
- **RLS POLICIES**: Applied to all tables using `current_setting('app.current_landlord_id')`

---

## 5. Payment Architecture

### 5.1 Payment Tiers

```
┌──────────────────────────────────────────────────────────┐
│  TIER 1: MFS MERCHANT (AUTOMATED)                        │
│  bKash / Nagad / Rocket Web-Checkout APIs                │
│  → Tenant clicks "Pay Now" → Gateway popup               │
│  → Webhook fires → Backend clears ledger instantly       │
├──────────────────────────────────────────────────────────┤
│  TIER 2: MFS PERSONAL / BANK TRANSFER (MANUAL)           │
│  Tenant sends via app → Submits TrxID in portal          │
│  → Invoice status = PENDING_VERIFICATION                 │
│  → Landlord reviews → Approves → Ledger cleared          │
├──────────────────────────────────────────────────────────┤
│  TIER 3: CASH (MANUAL / INSTANT)                         │
│  Staff enters cash amount → Ledger cleared immediately   │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Payment Allocation Priority (Double-Entry Logic)
```
Payment Amount → 1. Late Fees & Penalties
               → 2. Outstanding Utility Debts
               → 3. Base Rental Fees
```
All allocation runs inside a single `BEGIN TRANSACTION ... COMMIT` block with full rollback on failure.

### 5.3 Messaging Pipeline
```
Invoice Generated → 1. WhatsApp Business API (Meta template message)
                  →    [Success] → Exit
                  →    [Failure] → 2. SSL Wireless SMS API
```

---

## 6. Frontend Architecture

### 6.1 Pages & Modules

| Module | Routes | Roles |
|--------|--------|-------|
| **Auth** | `/login`, `/register` | All |
| **Admin Portal** | `/admin/dashboard`, `/admin/landlords`, `/admin/transactions` | System Admin |
| **Landlord Dashboard** | `/dashboard` | Landlord |
| **Properties** | `/properties`, `/properties/:id`, `/properties/:id/units` | Landlord, Manager |
| **Tenants** | `/tenants`, `/tenants/:id` | Landlord, Manager |
| **Leases** | `/leases`, `/leases/:id` | Landlord, Manager |
| **Billing / Ledger** | `/billing`, `/billing/:invoiceId` | Landlord, Manager |
| **Utility Meters** | `/utilities/log` | Manager |
| **Payments** | `/payments`, `/payments/verify` | Landlord |
| **Tenant Portal** | `/portal/dashboard`, `/portal/invoice/:id`, `/portal/pay/:id` | Tenant |
| **Settings** | `/settings/payment`, `/settings/profile` | Landlord |
| **Reports** | `/reports` | Landlord |

### 6.2 Design System
- **Theme**: Premium dark mode with glassmorphism cards
- **Palette**: Deep slate `#0f172a` background, electric teal accent `#14b8a6`, emerald green for paid/success
- **Typography**: Google Fonts — `Outfit` (headings), `Inter` (body)
- **Animations**: Framer Motion micro-interactions, skeleton loaders, smooth page transitions
- **Charts**: Recharts — revenue graphs, occupancy rate donut, payment method distribution

---

## 7. Backend API Architecture (Node.js / Fastify)

### 7.1 Route Groups
```
/api/v1/auth          → login, logout, refresh
/api/v1/admin         → landlord management (admin only)
/api/v1/properties    → CRUD properties
/api/v1/units         → CRUD units
/api/v1/tenants       → CRUD tenant profiles
/api/v1/leases        → CRUD leases, activate/terminate
/api/v1/invoices      → generate, list, view invoices
/api/v1/payments      → initiate checkout, submit TrxID, verify, log cash
/api/v1/utilities     → log meter readings
/api/v1/webhooks      → bKash/Nagad/Rocket payment webhook receivers
/api/v1/settings      → payment credentials, profile config
/api/v1/reports       → analytics, ledger summaries
/api/v1/messages      → trigger WhatsApp/SMS sends
```

### 7.2 Middleware Stack
1. JWT Authentication & Role Guard
2. RLS Context Injector (`SET LOCAL app.current_landlord_id`)
3. Request Validation (Zod schemas)
4. Rate Limiter
5. Error Handler with structured responses

---

## 8. Project Structure

```
bashacare/
├── backend/
│   ├── src/
│   │   ├── config/          # DB pool, env config
│   │   ├── middleware/       # auth, rls-injector, validator
│   │   ├── routes/          # per-module route files
│   │   ├── controllers/     # business logic handlers
│   │   ├── services/        # payment gateways, messaging
│   │   ├── db/
│   │   │   ├── migrations/  # SQL migration files
│   │   │   ├── triggers/    # DB trigger SQL
│   │   │   ├── policies/    # RLS policy SQL
│   │   │   └── views/       # SQL view definitions
│   │   └── utils/
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/      # shared UI components
│   │   ├── pages/           # route-level pages
│   │   │   ├── admin/
│   │   │   ├── landlord/
│   │   │   ├── manager/
│   │   │   └── tenant/
│   │   ├── store/           # Zustand stores
│   │   ├── hooks/           # custom React hooks
│   │   ├── services/        # API client (axios)
│   │   ├── styles/          # global CSS design tokens
│   │   └── utils/
│   ├── index.html
│   └── package.json
└── docker-compose.yml       # PostgreSQL local container (optional)
```

---

## 9. Development Phases (6-Sprint Roadmap)

### Phase 1 — Foundation (Sprint 1)
- [ ] Initialize Vite + React frontend project
- [ ] Initialize Fastify backend project
- [ ] Configure local PostgreSQL connection pool with `pg`
- [ ] Create all DB migration files (tables, ENUMs, FKs)
- [ ] Implement RLS policies and session variable pattern
- [ ] Build JWT auth (register, login, role guards)
- [ ] Design token system and global CSS (dark theme, typography)

### Phase 2 — Core Property Management (Sprint 2)
- [ ] Properties CRUD (API + UI)
- [ ] Units CRUD with status management
- [ ] Tenant profile management (encrypted NID storage)
- [ ] Lease creation with constraint trigger (single active lease per unit)
- [ ] Lease termination & historical logging
- [ ] Property Manager role restrictions

### Phase 3 — Ledger & Billing Engine (Sprint 3)
- [ ] Invoice generation (monthly batch / on-demand)
- [ ] Utility meter log entry form (Property Manager)
- [ ] DB trigger for delta-meter calculation → auto-appends utility charge
- [ ] Manual balance adjustments (discount / surcharge)
- [ ] `invoice_calculated_totals` VIEW implementation
- [ ] Landlord billing dashboard with payment status indicators

### Phase 4 — Payment System (Sprint 4)
- [ ] Payment settings page (configure bKash/Nagad/Rocket/bank credentials)
- [ ] MFS Merchant Tier: bKash web-checkout integration + webhook endpoint
- [ ] MFS Merchant Tier: Nagad + Rocket checkout integration
- [ ] Manual TrxID submission form (tenant side)
- [ ] Pending verification queue (landlord review & approve)
- [ ] Cash payment logging (Property Manager)
- [ ] Double-entry payment allocation logic (late fees → utilities → base rent)

### Phase 5 — Notifications, Tenant Portal & Admin (Sprint 5)
- [ ] WhatsApp Business API integration (Meta template messages)
- [ ] SSL Wireless SMS fallback integration
- [ ] Messaging pipeline with failure-fallback logic
- [ ] Tenant Portal: invoice view, payment history, checkout trigger, TrxID submission
- [ ] System Admin portal: landlord approval, fraud flagging, cross-platform analytics
- [ ] Reports & analytics: occupancy rates, revenue charts, payment method breakdown

### Phase 6 — Polish, Security & Deployment (Sprint 6)
- [ ] Full RLS audit (verify no data leaks between landlord contexts)
- [ ] Input sanitization, rate limiting, CORS hardening
- [ ] Encrypted NID storage review (AES-256)
- [ ] Framer Motion micro-animations & skeleton loaders
- [ ] Mobile-responsive layouts
- [ ] End-to-end testing (key payment flows + lease transitions)
- [ ] Docker Compose setup for PostgreSQL + backend
- [ ] Environment configuration & deployment documentation

---

## 10. Open Questions

> [!IMPORTANT]
> The following require your decisions before full execution begins.

1. **Hosting**: Will BashaCare run on a single local machine/server (LAN-only), or will it be deployed to a cloud VM (e.g., DigitalOcean, AWS EC2)? This affects reverse-proxy setup and SSL certificate needs.

2. **MFS API Access**: Do you already have registered bKash, Nagad, and Rocket merchant API credentials (Sandbox or Production)? Or should the initial build use simulated/mock webhook flows?

3. **Initial Scope**: Should the Tenant Portal (self-service payment checkout) be part of the MVP, or is the MVP focused on the landlord/manager workflows first?

4. **NID Encryption**: What encryption approach should be used for `encrypted_national_id`? Options: (a) AES-256 at the application layer in Node.js, or (b) PostgreSQL `pgcrypto` extension.

5. **Multi-Property Scale**: Should the initial build support unlimited properties per landlord, or is there a tiered plan limit (e.g., Free: 1 property, Pro: unlimited)?

6. **Currency & Locale**: Primary currency is BDT (Bangladeshi Taka, ৳). Should the UI also support English + Bengali bilingual display?

---

## 11. Verification Plan

### Automated Tests
- Unit tests for payment allocation logic (late fees → utilities → rent priority)
- API integration tests for all CRUD endpoints with RLS context switching
- Webhook handler tests (bKash/Nagad simulate success/failure payloads)
- Lease constraint trigger tests (overlapping lease detection)
- Utility delta-meter trigger tests

### Manual Verification
- Switch between landlord accounts → confirm RLS prevents data leakage
- Full payment flow: Merchant checkout → webhook fires → invoice cleared
- Partial payment: Verify correct allocation across fee types and ledger update
- Meter log entry → confirm invoice utility charge auto-updates
- Property Manager role: confirm analytics pages are blocked
- Tenant portal: invoice view, TrxID submission, pending status tracking
