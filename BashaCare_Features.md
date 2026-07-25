# BashaCare — Features Document

> **Version:** 2.0 (Multi-Vertical Architecture)  
> **Last Updated:** July 26, 2026  
> **Source:** Synthesized from `context.md` & `BashaCare_Product_Guide.md`

---

## 1. Platform Overview

**BashaCare** is a multi-vertical Property Management SaaS platform built for Bangladesh. It manages residential, commercial, hotel, hospital, co-working, and warehouse properties through three portals:

| Portal | Users | Purpose |
|--------|-------|---------|
| **Landlord Portal** | Landlords, Managers | Full property, billing, and occupant management |
| **Tenant Portal** | Tenants / Occupants | Self-service invoices, payments, and maintenance |
| **Admin Portal** | Platform Super-Admins | SaaS oversight, landlord approvals, user management |

---

## 2. User Roles & Permissions

### 2.1 Landlord (Property Owner)
| Capability | Details |
|-----------|---------|
| Property Management | Full CRUD on properties, units, and occupants |
| Agreements | Create, view, terminate leases/bookings/contracts |
| Billing | Generate invoices, add adjustments, waive late fees |
| Payments | Approve/reject tenant payments, record cash payments |
| Maintenance | Manage requests, assign costs to invoices |
| Reports | View dashboard KPIs, revenue trends, collection reports |
| Settings | Configure company profile and payment receiving methods |
| Team | Invite managers |
| Tenants | Invite occupants to the self-service portal |

### 2.2 Manager
| Capability | Details |
|-----------|---------|
| Scope | Everything a Landlord can do **except** changing Settings & payment methods |
| Data Isolation | Can only see data belonging to the landlord who invited them |
| Utilities | Record utility meter readings |

### 2.3 Tenant / Occupant
| Capability | Details |
|-----------|---------|
| Dashboard | View lease details, rent, landlord payment info |
| Invoices | View current and past invoices with full breakdown |
| Payments | Submit payments with TrxID (bKash, Nagad, etc.) |
| Maintenance | Submit new requests, track status |

### 2.4 Admin (Platform Administrator)
| Capability | Details |
|-----------|---------|
| Landlord Management | View, create, invite, approve, suspend landlord accounts |
| User Directory | View and activate/deactivate any user account |
| Platform Stats | Total properties, revenue, users, occupancy |

---

## 3. Multi-Vertical Property Types

BashaCare dynamically adapts its terminology and workflows based on property type:

| Type | Icon | Unit Term | Occupant Term | Agreement Term | Billing Model |
|------|------|-----------|---------------|----------------|---------------|
| Residential | 🏠 | Unit | Tenant | Lease | Monthly |
| Hotel | 🏨 | Room | Guest | Reservation | Per Stay |
| Hospital | 🏥 | Bed | Patient | Admission | Daily |
| Commercial | 🏬 | Shop | Merchant | Contract | Monthly |
| Co-working | 🏢 | Desk | Member | Membership | Monthly |
| Warehouse | 🏭 | Bay | Client | Storage Contract | Monthly |

---

## 4. Feature Catalog

### 4.1 Authentication & Onboarding

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-01 | Self-Registration | Landlord | Register with company name, email, phone, password → await admin approval |
| F-02 | Admin-Created Accounts | Admin | Create landlord accounts with temporary passwords (pre-approved) |
| F-03 | Invite-Based Setup | Admin → Landlord | Generate a unique setup link (7-day expiry) for landlord self-onboarding |
| F-04 | Force Password Change | All | Accounts created by admins must change password on first login |
| F-05 | Voluntary Password Change | All | Users can change their password at any time |
| F-06 | Forgot Password | All | Request password reset (currently admin-manual; email integration pending) |
| F-07 | JWT Authentication | All | Every API request requires a signed JSON Web Token |
| F-08 | Role-Based Login Routing | All | Redirects to appropriate dashboard (Landlord → Main, Tenant → Portal, Admin → Admin) |
| F-09 | Interactive Onboarding Wizard | Landlord | State-machine-driven tour forcing demo data creation: Properties → Units → Occupants → Agreements |

---

### 4.2 Property Management

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-10 | Property CRUD | Landlord, Manager | Create, view, edit, delete properties |
| F-11 | Property Type Selection | Landlord, Manager | Choose from 6 verticals; changes terminology app-wide |
| F-12 | Property Search | Landlord, Manager | Filter properties by name or address |
| F-13 | Cascade Delete | Landlord, Manager | Deleting a property removes all units inside |
| F-14 | Property Stats | Landlord, Manager | View total units and occupancy per property |

---

### 4.3 Unit / Room Management

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-15 | Unit CRUD | Landlord, Manager | Create, view, edit, delete units within properties |
| F-16 | Unit Status Tracking | Landlord, Manager | Track status: VACANT, OCCUPIED, MAINTENANCE, RESERVED, CHECKED_IN, HOUSEKEEPING |
| F-17 | Filter by Property | Landlord, Manager | Dropdown filter to show units from a specific property |
| F-18 | Filter by Status | Landlord, Manager | Filter units by their current status |
| F-19 | Auto Status on Agreement | Automatic | Unit status auto-updates to OCCUPIED on agreement creation |
| F-20 | Auto Status on Termination | Automatic | Unit status auto-updates to VACANT on agreement termination |

---

### 4.4 Occupant Management

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-21 | Occupant CRUD | Landlord, Manager | Create, view, edit, delete occupant profiles |
| F-22 | Occupant Search | Landlord, Manager | Search by name, phone, or email |
| F-23 | Occupant Filter | Landlord, Manager | Filter by all, active (has agreement), or inactive |
| F-24 | NID Encryption | Automatic | National ID encrypted with AES-256-CBC at rest |
| F-25 | Portal Invite (Email) | Landlord, Manager | Send email invite with 7-day setup link for tenant portal access |
| F-26 | Manual Login Creation | Landlord, Manager | Create username/password for occupant without sending email |
| F-27 | First-Login Password Change | Automatic | Manually-created logins force password change on first use |

---

### 4.5 Agreements (Leases, Bookings, Contracts)

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-28 | Agreement CRUD | Landlord, Manager | Create and terminate agreements linking occupants to units |
| F-29 | Agreement Filtering | Landlord, Manager | Filter by active, past, or all agreements |
| F-30 | Agreement Search | Landlord, Manager | Search by occupant name or unit number |
| F-31 | Single Active Enforcement | Automatic | DB trigger ensures only one active agreement per unit |
| F-32 | Auto Unit Status (Create) | Automatic | Creating an agreement marks unit as OCCUPIED and deactivates previous agreements |
| F-33 | Auto Unit Status (Terminate) | Automatic | Terminating an agreement marks unit as VACANT via DB trigger |
| F-34 | Utility Tariff Configuration | Landlord, Manager | Set per-unit utility tariff rates within agreements |
| F-35 | Activity Log Recording | Automatic | Agreement creation/termination events are logged automatically |

---

### 4.6 Hotel Reservation Management

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-36 | Reservation List | Landlord, Manager | View all guest bookings for hotel-type properties |
| F-37 | Create Booking | Landlord, Manager | Select guest, room, check-in/out dates → room status → RESERVED |
| F-38 | Guest Check-In | Landlord, Manager | Check-in button → room status → CHECKED_IN |
| F-39 | Guest Check-Out | Landlord, Manager | Check-out button → room → HOUSEKEEPING, auto-generate stay invoice |
| F-40 | Auto Invoice on Checkout | Automatic | Invoice = (Days Stayed) × (Daily Rate), booking marked as completed |

---

### 4.7 Billing & Invoicing

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-41 | Auto Monthly Invoice Generation | Automatic (Cron) | 1st of every month at midnight BST for all active monthly agreements |
| F-42 | Per-Stay Invoice Generation | Automatic | Auto-generated on hotel guest checkout |
| F-43 | Invoice Status Tracking | All | Statuses: UNPAID → PARTIALLY_PAID → PENDING_VERIFICATION → PAID / OVERDUE |
| F-44 | Invoice Adjustments | Landlord, Manager | Add line items: REPAIR_FEE, DISCOUNT, LATE_FEE, OTHER |
| F-45 | Late Fee Automation | Automatic (Cron) | Daily midnight check → ৳500 flat fee on overdue invoices |
| F-46 | Late Fee Waiver | Landlord | Option to waive late fees for specific invoices |
| F-47 | Payment Reminders | Automatic (Cron) | Daily midnight → notify tenants with invoices due in 3 days |
| F-48 | Unbilled Maintenance Costs | Automatic | Maintenance repair costs auto-added as adjustments to next invoice |
| F-49 | Invoice Breakdown View | Tenant | Detailed view: Base Rent + Utility + Late Fees + Adjustments = Total |

---

### 4.8 Payments

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-50 | Supported Methods | All | bKash, Nagad, Rocket, Bank Transfer, Cash |
| F-51 | Tenant Payment Submission | Tenant | Enter amount, method, and TrxID → invoice status → PENDING_VERIFICATION |
| F-52 | Payment Verification | Landlord, Manager | Approve (→ VERIFIED, balance reduced) or Reject (→ REJECTED, status reverts) |
| F-53 | Cash Payment Recording | Landlord, Manager | Record cash payments → instantly verified, no approval needed |
| F-54 | Payment Allocation Priority | Automatic | Partial payments applied: Late Fees → Utility Charges → Base Rent |
| F-55 | Landlord Payment Info Display | Tenant | Tenant sees landlord's bKash/Nagad/Bank numbers on invoice detail |
| F-56 | Payment Notification (Approved) | Automatic | Tenant notified when payment is approved |
| F-57 | Payment Notification (Rejected) | Automatic | Tenant notified when payment is rejected |

---

### 4.9 Utility Meter Readings

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-58 | Record Meter Readings | Landlord, Manager | Enter current reading for Electricity, Gas, or Water meters |
| F-59 | Auto Delta Calculation | Automatic | System finds previous reading, calculates units consumed |
| F-60 | Auto Charge Calculation | Automatic | DB trigger multiplies consumption × tariff rate from agreement |
| F-61 | Auto Invoice Update | Automatic | Charge auto-added to tenant's current unpaid invoice |

---

### 4.10 Maintenance Requests

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-62 | Submit Request | Tenant | Create requests with issue type, priority, title, description, optional photo |
| F-63 | Issue Types | All | PLUMBING, ELECTRICAL, STRUCTURAL, APPLIANCE, PEST_CONTROL, OTHER |
| F-64 | Priority Levels | All | LOW, MEDIUM, HIGH, URGENT |
| F-65 | Status Management | Landlord, Manager | Track through: OPEN → IN_PROGRESS → RESOLVED → CLOSED |
| F-66 | Cost Assignment | Landlord, Manager | Add repair cost → auto-billed to tenant's invoice as REPAIR_FEE adjustment |
| F-67 | Tenant Status Tracking | Tenant | View status updates on submitted requests |

---

### 4.11 Reports & Analytics

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-68 | Dashboard KPIs | Landlord, Manager | Occupancy rate, occupied/total units, outstanding amount |
| F-69 | Recent Transactions | Landlord, Manager | Last 10 payments with tenant name, amount, method, status |
| F-70 | Quick Actions | Landlord, Manager | One-click buttons: register tenant, generate invoices, add property |
| F-71 | Revenue Trend Chart | Landlord, Manager | Line/area chart of billed vs. collected over 6 months |
| F-72 | Payment Methods Breakdown | Landlord, Manager | Bar/pie chart of collections by method (bKash, Nagad, Cash, etc.) |
| F-73 | Collection Report | Landlord, Manager | Detailed table: tenant, unit, amount due, paid, balance, status |

---

### 4.12 Activity Log (Audit Trail)

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-74 | Comprehensive Audit Trail | Landlord, Manager | Logs all CRUD operations across the platform |
| F-75 | Log Categories | Landlord, Manager | PROPERTY, UNIT, TENANT, LEASE, PAYMENT, INVOICE, MAINTENANCE |
| F-76 | Category Filtering | Landlord, Manager | Filter logs by specific event category |
| F-77 | Date Range Filtering | Landlord, Manager | Filter logs by date range |
| F-78 | Detailed Entries | Landlord, Manager | Each entry: Who did What, When, and Details |

---

### 4.13 Notifications

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-79 | Real-Time SSE Notifications | All | Server-Sent Events for instant push notifications |
| F-80 | Notification Panel | All | View all notifications in a centralized panel |
| F-81 | Mark as Read | All | Mark individual or all notifications as read |
| F-82 | Invoice Generated Notification | Tenant | Triggered when monthly invoice is created |
| F-83 | Payment Reminder Notification | Tenant | Triggered 3 days before invoice due date |
| F-84 | Overdue Warning Notification | Tenant | Triggered when late fee is applied |
| F-85 | Payment Approved Notification | Tenant | Triggered when landlord approves payment |
| F-86 | Payment Rejected Notification | Tenant | Triggered when landlord rejects payment |

---

### 4.14 Settings

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-87 | Company Profile | Landlord | Update company name and contact phone |
| F-88 | Payment Receiving Methods | Landlord | Configure bKash, Nagad, Rocket numbers and bank details |

---

### 4.15 Tenant Portal

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-89 | Tenant Dashboard | Tenant | Property, unit, landlord, rent, lease dates, payment info at a glance |
| F-90 | Invoice List | Tenant | All invoices with billing month, due, paid, balance, status |
| F-91 | Invoice Detail & Breakdown | Tenant | Full breakdown with payment history and TrxIDs |
| F-92 | Payment Submission | Tenant | Submit payment with amount, method, and TrxID |
| F-93 | Maintenance Portal | Tenant | View, create, and track maintenance requests |

---

### 4.16 Admin Panel

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-94 | Platform Stats Dashboard | Admin | Total landlords, properties, units, agreements, occupancy, revenue |
| F-95 | Revenue Trend Chart | Admin | Platform-wide revenue over last 6 months |
| F-96 | Landlord Overview Table | Admin | All landlords with property/unit/lease counts |
| F-97 | Create Landlord | Admin | Direct account creation (pre-approved, temp password) |
| F-98 | Invite Landlord | Admin | Generate 7-day setup link |
| F-99 | Approve / Suspend Landlord | Admin | Toggle landlord account status |
| F-100 | User Directory | Admin | View and activate/deactivate any user |

---

### 4.17 UI & Localization

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| F-101 | Dark Mode | All | Toggle light/dark theme (managed by Zustand themeStore) |
| F-102 | Bilingual Support | All | English 🇬🇧 and Bengali 🇧🇩 via react-i18next |
| F-103 | Responsive Design | All | CSS-variable-based design system with vanilla CSS |

---

## 5. Automated Background Tasks

| Task | Schedule | Action |
|------|----------|--------|
| Monthly Invoice Generation | 1st of every month, midnight BST | Creates invoices for all active monthly agreements |
| Payment Reminders | Daily, midnight BST | Sends notifications for invoices due in 3 days |
| Overdue Processing | Daily, midnight BST | Applies ৳500 late fee to overdue invoices, sends warnings |

---

## 6. Security & Data Protection

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with 12 salt rounds |
| NID Encryption | AES-256-CBC encryption at rest |
| JWT Authentication | Signed tokens required for every API call |
| Row-Level Security (RLS) | PostgreSQL RLS policies enforce landlord data isolation at the DB level |
| Force Password Change | Admin-created accounts require immediate password reset |
| Invite Token Expiry | Setup links expire after 7 days |
| HTTPS | Encrypted transport in production |
| Multi-Tenancy Isolation | `queryWithRLS()` and `transactionWithRLS()` wrappers enforce scoped queries |

---

## 7. Technical Architecture Summary

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Fastify |
| Frontend | React 18 + Vite |
| Database | PostgreSQL with RLS |
| State Management | Zustand |
| Data Fetching | Axios + TanStack React Query |
| Routing | react-router-dom with PrivateRoute guards |
| Styling | Vanilla CSS with CSS Variables (no Tailwind) |
| Localization | react-i18next |
| Notifications | Server-Sent Events (SSE) |

---

## 8. Data Models

| Model | Purpose |
|-------|---------|
| `landlords` | SaaS tenants (the property owners) |
| `users` | Login credentials for all roles |
| `properties` | Buildings, campuses, hotels, hospitals |
| `units` | Rooms, apartments, beds, shops, desks, bays |
| `occupant_profiles` | Residents, guests, patients, merchants |
| `agreements` | Leases, reservations, admissions, contracts |
| `ledger_invoices` | Monthly/per-stay billing records |
| `ledger_adjustments` | Invoice line items (fees, discounts) |
| `payment_transactions` | All payment records with TrxIDs |
| `utility_meter_logs` | Electricity, gas, water readings |
| `maintenance_requests` | Repair and service tickets |
| `activity_logs` | Full audit trail |

---

> **Total Features: 103** | **User Roles: 4** | **Property Verticals: 6**
