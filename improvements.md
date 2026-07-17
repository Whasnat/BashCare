# 🏢 BashaCare — Improvements & Feature Roadmap

> Full project analysis performed on July 16, 2025.
> This document covers **bug fixes**, **code quality improvements**, **mobile optimization**, **security hardening**, **performance gains**, **admin features**, **account provisioning flows**, and **new feature ideas**.

---

## Table of Contents

1. [🚨 Critical Bugs & Security Issues](#-critical-bugs--security-issues)
2. [📱 Mobile Optimization (High Priority)](#-mobile-optimization-high-priority)
3. [🔧 Code Quality & Architecture Improvements](#-code-quality--architecture-improvements)
4. [⚡ Performance Improvements](#-performance-improvements)
5. [🎨 UI/UX Improvements](#-uiux-improvements)
6. [🌗 Dark / Light Theme Toggle](#-dark--light-theme-toggle)
7. [🛡️ Admin Panel — Expanded Features](#️-admin-panel--expanded-features)
8. [🔑 Account Provisioning & Invite Flows](#-account-provisioning--invite-flows)
9. [✨ New Feature Ideas](#-new-feature-ideas)
10. [🧪 Testing & DevOps](#-testing--devops)
11. [📝 Documentation](#-documentation)
12. [📊 Priority Matrix](#-priority-matrix)

---

## 🚨 Critical Bugs & Security Issues

### 1. SQL Injection via `SET LOCAL` (CRITICAL)

**File:** `backend/src/config/database.js` (Lines 36-37, 64-65)

The `landlordId` is interpolated directly into the SQL string without parameterization:

```js
await client.query(`SET LOCAL app.current_landlord_id = '${landlordId}';`);
```

If a compromised JWT contains a malicious `landlord_id`, this enables SQL injection. **Fix:** Use `format()` or a safe escaping mechanism (e.g., `pg-format`) or at least validate that `landlordId` is a valid UUID before interpolation.

---

### 2. Hardcoded JWT Secret Fallback (HIGH)

**File:** `backend/src/server.js` (Line 37)

```js
secret: process.env.JWT_SECRET || 'bashacare_dev_secret',
```

If `JWT_SECRET` is unset in production, anyone can forge tokens. **Fix:** Throw an error if `JWT_SECRET` is missing in production environments.

---

### 3. Hardcoded NID Encryption Key (HIGH)

**File:** `backend/src/routes/tenants.js` (Line 5)

```js
const ENCRYPTION_KEY = process.env.NID_ENCRYPTION_KEY || 'bashacare_nid_key_32bytes_secret!!';
```

National ID encryption uses a hardcoded fallback key. In production, this means all tenant NID data is protected by a publicly visible key. **Fix:** Same as JWT — fail loudly if `NID_ENCRYPTION_KEY` is not set in production.

---

### 4. Docker Compose Hardcoded Credentials (MEDIUM)

**File:** `docker-compose.yml` (Lines 7-9)

```yaml
POSTGRES_USER: admin
POSTGRES_PASSWORD: admin
```

Should use `.env` file references and never be committed with default credentials.

---

### 5. Missing CORS Origin Validation (MEDIUM)

**File:** `backend/src/server.js` (Line 28-33)

CORS accepts a single frontend URL, but no validation or array support for multiple environments. In production, the origin should be strictly validated and configurable per environment.

---

### 6. `App.css` Contains Dead Vite Template Code

**File:** `frontend/src/App.css`

The entire file contains leftover Vite template boilerplate CSS (`.hero`, `.counter`, `#next-steps`, etc.) that is completely unused. This adds ~185 lines of dead code to the bundle.

---

### 7. Missing `<meta>` Tags and SEO

**File:** `frontend/index.html` (Line 7)

```html
<title>frontend</title>
```

The page title is the Vite default "frontend" — not "BashaCare". No `<meta name="description">` tag either.

---

### 8. Webhook Routes Have No Authentication

**File:** `backend/src/routes/webhooks.js`

The bKash webhook handler has no signature verification, HMAC validation, or IP whitelisting. Any attacker can post fake payment confirmations to `/api/v1/webhooks/bkash` and credit arbitrary invoices.

---

## 📱 Mobile Optimization (High Priority)

The app is currently **broken on mobile browsers**. Here's a comprehensive list of what needs to change:

### Layout & Navigation

| Issue | File | Fix |
|-------|------|-----|
| **Sidebar is hidden on mobile with no way to show it** | `index.css:590` | The sidebar gets `translateX(-100%)` at `≤1024px` but there's no hamburger menu button or toggle mechanism to bring it back. Users on tablets/phones are **completely locked out of navigation**. |
| **Topbar starts at `left: var(--sidebar-width)`** | `index.css:213` | On mobile, the sidebar is hidden but the topbar still offsets itself. It should be `left: 0` on mobile. |
| **No hamburger menu component** | `Layout.jsx`, `Topbar.jsx` | A mobile hamburger icon needs to be added in the `Topbar` that toggles sidebar visibility via an overlay. |
| **Sidebar overlay** | N/A (new) | When sidebar opens on mobile, it should overlay the content with a semi-transparent backdrop that closes on tap. |

### Required CSS Changes

```css
/* ── Mobile Navigation ──────────────────────────────────────── */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 300ms ease;
    z-index: 200;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 199;
    display: none;
  }
  .sidebar-overlay.visible {
    display: block;
  }
  .topbar {
    left: 0; /* Override desktop offset */
  }
  .main-content {
    margin-left: 0;
  }
  .hamburger-btn {
    display: flex; /* Show hamburger only on mobile */
  }
}
```

### Content & Forms

| Issue | File | Fix |
|-------|------|-----|
| **Tables are not horizontally scrollable** | `index.css` | Data tables overflow on small screens. Add `overflow-x: auto` to `.table-container`. |
| **`.form-grid` collapses only at 1024px** | `index.css:594` | Two-column grids should collapse at `768px` or even `640px` for phone screens. |
| **`.form-grid-3` never collapses** | `index.css:352` | Three-column grids have no responsive rule at all. They'll be crushed on any screen under ~960px. |
| **`.page-body` padding is too wide** | `index.css:103` | `padding: 28px 32px` — should be `12px 16px` on mobile. |
| **Stat cards text overflows** | `index.css:283` | `.stat-value` at `1.75rem` can overflow on narrow cards. Add `word-break: break-word` or reduce font size on small screens. |
| **Modal padding is too wide** | `index.css:423` | `padding: 28px` is fine for desktop, but on a 360px phone it leaves almost no content width. Use `padding: 16px` on mobile. |
| **Search bar has a fixed `min-width: 260px`** | `index.css:551` | This overflows the topbar on phones. Use `min-width: unset; flex: 1;` on mobile. |
| **`.grid-2` and `.grid-3` only collapse at 640px** | `index.css:598` | The grid-2 should collapse earlier (at `768px`) since two columns are too narrow on tablets. |

### Touch & Interaction

| Issue | Description |
|-------|-------------|
| **No touch-friendly tap targets** | Many buttons and nav items have small padding (`9px 12px`). Mobile touch targets should be at least 44×44px per WCAG guidelines. |
| **Hover-dependent interactions** | Card hover effects (e.g., `translateY(-2px)`) rely on hover state which doesn't exist on mobile. Use `:active` as a mobile fallback. |
| **Topbar notification badge uses absolute positioning classes** | `Topbar.jsx:22` uses Tailwind-like classes (`absolute top-1 right-1`) that don't exist in your custom CSS. The badge dot is likely not rendering. |

### PWA Considerations (Nice-to-Have)

| Feature | Description |
|---------|-------------|
| **Add a `manifest.json`** | Enables "Add to Home Screen" on mobile browsers. |
| **Set `theme-color` meta** | `<meta name="theme-color" content="#060b14">` for native-feeling mobile address bar. Should dynamically update with theme toggle. |
| **Service Worker** | Offline caching for the tenant portal so tenants can view their invoices offline. |

---

## 🔧 Code Quality & Architecture Improvements

### Backend

| # | Issue | Files | Recommendation |
|---|-------|-------|----------------|
| 1 | **No input validation layer** | All routes | Zod is installed but never used. Add Zod schemas for all request bodies and query params. Currently, routes do manual `if (!field)` checks inconsistently. |
| 2 | **No service/repository layer** | All routes | Route handlers contain raw SQL queries directly. Extract database access into repository files (e.g., `repos/invoices.js`) and business logic into services. This improves testability and maintainability. |
| 3 | **Repeated tenant resolution in portal routes** | `portal.js` | The pattern `queryAdmin → get linked_entity_id, landlord_id → queryWithRLS` is duplicated in every portal route. Extract a `resolveTenant(userId)` helper. |
| 4 | **No rate limiting** | `server.js` | No protection against brute-force login attempts or API abuse. Add `@fastify/rate-limit`. |
| 5 | **Logger disabled in production** | `server.js:23` | `logger: process.env.NODE_ENV !== 'production'` — production should have structured logging for debugging. Use `pino` with appropriate log levels instead. |
| 6 | **No `.env.example` file** | Backend root | Makes onboarding difficult. Create a `.env.example` with all required environment variables. |
| 7 | **`payment_method` ENUM doesn't include all used methods** | `001_initial_schema.sql:16-18` | The ENUM has only 4 values (`MFS_MERCHANT`, `MFS_PERSONAL`, `BANK_TRANSFER`, `CASH`) but `payments.js:68` validates for `BKASH`, `NAGAD`, `ROCKET`. These are string-checked in JS but will fail on DB insert. |
| 8 | **`generate-all` performs N+1 queries** | `invoices.js:108-120` | The batch invoice generation loops through each lease and does an individual INSERT. Use a single `INSERT ... SELECT` statement instead. |
| 9 | **Missing pagination** | All list endpoints | `/invoices`, `/tenants`, `/payments/all` return all records. Only payments has a `LIMIT 200`. Implement cursor-based pagination across all list endpoints. |
| 10 | **`mark-overdue` is manual** | `invoices.js:131` | The landlord has to manually hit an endpoint to mark overdue invoices. This should be a scheduled cron job (pg_cron or external). |

### Frontend

| # | Issue | Files | Recommendation |
|---|-------|-------|----------------|
| 1 | **No error boundaries** | `App.jsx` | A JS error in any page crashes the entire app. Wrap routes in React Error Boundaries. |
| 2 | **No loading states for list pages** | Multiple pages | Most pages show blank while fetching. Use skeleton screens consistently (like `Dashboard.jsx` does). |
| 3 | **All pages are eagerly loaded** | `App.jsx` | All 15+ page components are imported at the top level. Use `React.lazy()` and `Suspense` for code splitting to dramatically reduce initial bundle size. |
| 4 | **Search bar in Topbar is non-functional** | `Topbar.jsx:12` | The search input exists but has no `onChange`, `value`, or any logic. Either implement global search or remove it to avoid confusing users. |
| 5 | **No data caching** | All pages | Every navigation triggers a fresh API call. Use `React Query` (TanStack Query) or SWR for intelligent caching, background refetching, and optimistic updates. |
| 6 | **Notification bell is non-functional** | `Topbar.jsx:20-23` | The bell icon renders with a hardcoded red dot but has no actual notification system behind it. |
| 7 | **Logout is via sidebar click on user name** | `Sidebar.jsx:77` | Clicking the user section logs out without confirmation. Add a confirmation dialog or move logout to a dropdown menu. |
| 8 | **No "Forgot Password" flow** | `Login.jsx` | Users have no way to reset their password without contacting the admin. |
| 9 | **`ProtectedRoute` re-checks on every render** | `App.jsx:36-51` | It should be memoized or the auth check optimized to avoid unnecessary re-renders. |
| 10 | **Inline styles used heavily** | `TenantDashboard.jsx`, others | Many components use inline `style={{}}` objects. Extract these into CSS classes for consistency and performance (inline styles create new objects on every render). |

---

## ⚡ Performance Improvements

| # | Area | Current Issue | Recommendation |
|---|------|---------------|----------------|
| 1 | **Bundle Size** | All pages imported eagerly | Implement route-level code splitting with `React.lazy()` + `Suspense`. |
| 2 | **Font Loading** | Google Fonts loaded via CSS `@import` | Use `<link rel="preconnect">` + `<link rel="preload">` in `index.html` for faster font loading. Move fonts to `<head>`. |
| 3 | **API Calls** | Multiple parallel calls without batching | Consider a BFF (Backend-For-Frontend) pattern for the dashboard that returns all needed data in one call (already partially done with `/reports/overview`). |
| 4 | **Database Connections** | Pool of 20 connections | Fine for now, but add connection pool monitoring and health checks. |
| 5 | **No CDN/Asset Optimization** | Vercel serves assets | Add cache headers, image optimization, and compression middleware. |
| 6 | **Dead CSS** | `App.css` has 185 lines of unused Vite template CSS | Delete the file entirely or replace with actual used styles. |
| 7 | **Re-renders** | No `useMemo`/`useCallback` | Pages that process large lists (Tenants, Invoices) should memoize computed values. |

---

## 🎨 UI/UX Improvements

| # | Area | Improvement |
|---|------|-------------|
| 1 | **Dashboard charts** | The dashboard has no charts/graphs despite `recharts` being installed. Add a revenue trend line chart and occupancy pie chart. |
| 2 | **Empty states** | Some pages show nothing when empty. Add illustrated empty states with calls to action (e.g., "Add your first property"). |
| 3 | **Breadcrumbs** | No breadcrumb navigation. Add breadcrumbs for nested pages (e.g., Properties → Units → Lease). |
| 4 | **Toast positioning on mobile** | `position: "top-right"` is fine on desktop but awkward on mobile. Use `"top-center"` on small screens. |
| 5 | **Date formatting** | Inconsistent date formats across pages. Create a shared `formatDate` utility. |
| 6 | **Currency formatting** | `৳` symbol is hardcoded. Create a shared currency formatter that handles locale. |
| 7 | **Confirmation dialogs** | Destructive actions (delete tenant, terminate lease, reject payment) should have confirmation modals. |
| 8 | **Keyboard navigation** | No focus management for modals or keyboard shortcut support. |
| 9 | **Skeleton consistency** | Some pages have skeletons, others show nothing while loading. Standardize across all pages. |
| 10 | **Accessibility (a11y)** | No ARIA labels on interactive elements, no focus traps in modals, insufficient color contrast in some muted text areas. |

---

## 🌗 Dark / Light Theme Toggle

The app is currently hardcoded to a dark theme. A theme toggle would improve usability — especially for landlords who work during the day and tenants viewing invoices in bright environments.

### Implementation Plan

#### 1. CSS Design Token Strategy

Restructure `:root` tokens into two sets using `data-theme` attribute on `<html>`:

```css
/* ── Base (Dark — default) ───────────────────────────────── */
:root,
[data-theme="dark"] {
  --bg-base:        #060b14;
  --bg-surface:     #0d1526;
  --bg-elevated:    #131e30;
  --bg-card:        #0f1b2d;
  --bg-hover:       #1a2740;
  --bg-input:       #0c1522;
  --text-primary:   #e8edf7;
  --text-secondary: #8b9bb4;
  --text-muted:     #4d617a;
  --text-inverse:   #060b14;
  --border:         rgba(255,255,255,0.07);
  --shadow-sm:      0 1px 3px rgba(0,0,0,0.5);
  /* ...keep all existing dark tokens... */
}

/* ── Light Theme ─────────────────────────────────────────── */
[data-theme="light"] {
  --bg-base:        #f5f7fa;
  --bg-surface:     #ffffff;
  --bg-elevated:    #f0f2f5;
  --bg-card:        #ffffff;
  --bg-hover:       #e8ecf1;
  --bg-input:       #f8f9fb;
  --text-primary:   #1a1f2e;
  --text-secondary: #5a6478;
  --text-muted:     #8b95a8;
  --text-inverse:   #ffffff;
  --border:         rgba(0,0,0,0.08);
  --shadow-sm:      0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:      0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg:      0 8px 32px rgba(0,0,0,0.1);
  --shadow-glow:    0 0 24px rgba(20,184,166,0.08);
  /* accent colors stay the same for brand consistency */
}
```

#### 2. Theme Store (Zustand)

```js
// store/themeStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light' | 'system'
      setTheme: (theme) => {
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        document.documentElement.setAttribute('data-theme', resolved);
        set({ theme });
      },
      hydrate: () => {
        const { theme } = get();
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        document.documentElement.setAttribute('data-theme', resolved);
      },
    }),
    { name: 'bashacare-theme' }
  )
);
```

#### 3. Toggle Component

Place a `Sun`/`Moon` icon toggle in the **Topbar**, next to the notification bell. Support three modes: **Dark**, **Light**, **System** (follows OS preference via `prefers-color-scheme`).

#### 4. PWA `theme-color` Sync

When the theme changes, dynamically update `<meta name="theme-color">` so the mobile browser address bar matches:
- Dark: `#060b14`
- Light: `#f5f7fa`

#### 5. Scrollbar & Third-Party Overrides

Remember to style scrollbars for both themes and ensure the toast background, modal overlays, and recharts colors all respect theme tokens.

---

## 🛡️ Admin Panel — Expanded Features

The current admin panel has only a single `AdminDashboard.jsx` page with basic stats. A full admin panel should be the **command center for the entire platform**.

### Current State

- **1 page:** `AdminDashboard.jsx` — shows landlord count, revenue, and pending approvals.
- **1 route:** `admin.js` — approve/reject landlords, list stats.
- **No granular controls** over users, tenants, system config, or operational insights.

### Proposed Admin Features

#### A. Landlord Management

| Feature | Description |
|---------|-------------|
| **Landlord Directory** | A full-page table listing all registered landlords with search, filter (active/inactive/pending), and sort. Show: company name, email, phone, plan tier, unit count, tenant count, registration date, status. |
| **Landlord Detail View** | Click into a landlord to see their complete profile: properties, units, tenants, invoices, payment volume, account health. Essentially a "god-view" into any landlord's data. |
| **Create Landlord Account** | Admin can manually create a new landlord account by filling out a form (company name, email, phone, plan tier). Two options: **(a)** Send an invite link to the landlord's email/SMS, or **(b)** Set up credentials directly (the landlord must change password on first login — see [Account Provisioning](#-account-provisioning--invite-flows) section). |
| **Activate / Deactivate Landlord** | Toggle `is_active` status. Deactivating a landlord should lock out all their managers and tenants. Show a confirmation dialog with impact summary ("This will affect X tenants, Y active leases"). |
| **Edit Landlord Profile** | Admin can edit company name, contact info, and plan tier on behalf of a landlord. |
| **Delete Landlord** | Soft-delete with cascade awareness. Show what will be affected (properties, units, tenants, invoices). Require typing the company name to confirm. |
| **Impersonate Landlord** | Admin can "log in as" a landlord to debug issues or set up their account. This generates a temporary token with the landlord's context but logged as admin action in the audit trail. |

#### B. User & Account Management

| Feature | Description |
|---------|-------------|
| **Global User Directory** | List all users across all landlords — admins, landlords, managers, tenants. Filter by role, status, last login. |
| **Force Password Reset** | Admin can force any user to change their password on next login by setting a `must_change_password` flag. |
| **Lock/Unlock Account** | Temporarily lock a user account (e.g., after suspicious activity) without deleting it. |
| **Reset Password** | Admin can generate a temporary password or send a password reset link for any user. |
| **Login History** | View login timestamps, IP addresses, and device info for any user. |
| **Session Management** | View and revoke active JWT sessions for any user. |

#### C. Platform Analytics & Dashboard

| Feature | Description |
|---------|-------------|
| **Platform KPIs** | Total landlords, total tenants, total properties/units, total revenue processed, platform-wide occupancy rate. Show month-over-month trends. |
| **Revenue Dashboard** | Total payment volume processed, broken down by method (bKash, Nagad, Rocket, Bank, Cash). Show platform growth over time. |
| **Landlord Leaderboard** | Top landlords by unit count, revenue, or tenant count. Useful for identifying power users. |
| **Churn Risk** | Identify landlords who haven't logged in for 30+ days or have declining activity. |
| **Registration Funnel** | Track how many landlords register vs. get approved vs. actually use the platform. |

#### D. System Configuration

| Feature | Description |
|---------|-------------|
| **Global Settings Page** | Configurable platform-wide settings: default plan tier for new landlords, invoice due day, late fee percentage, support contact info. |
| **Plan & Tier Management** | Define plan tiers (Starter, Pro, Enterprise) with feature limits (max properties, max units, max tenants, payment methods allowed). |
| **Payment Gateway Config** | Admin configures which payment methods are available on the platform. Enable/disable bKash, Nagad, Rocket, Bank Transfer globally. |
| **Email/SMS Templates** | Configure notification templates for invite emails, payment reminders, overdue alerts, etc. |
| **Feature Flags** | Toggle experimental features on/off per landlord or globally. |

#### E. Support & Operations

| Feature | Description |
|---------|-------------|
| **Audit Trail / Activity Log** | A searchable, filterable log of every significant action across the platform: account creations, approvals, payment verifications, lease changes, setting updates. Each entry shows: timestamp, actor, action, target, IP address. |
| **System Health Monitor** | Database connection pool status, API response times, error rates, queue depths. |
| **Announcement System** | Post platform-wide banners or announcements (e.g., "Scheduled maintenance on Friday"). Shown in the Topbar for all users. |
| **Support Ticket View** | If maintenance requests are implemented, admin sees a global view of all tickets across all landlords for quality oversight. |
| **Data Export** | Export platform-wide data for compliance or reporting: landlord list, revenue summaries, user audit logs. |

#### F. Admin Navigation Structure

```
Admin Panel
├── Dashboard (KPIs, charts, quick actions)
├── Landlords
│   ├── All Landlords (table + search + filter)
│   ├── Pending Approvals (with approve/reject actions)
│   ├── Create Landlord (form + invite link option)
│   └── Landlord Detail View (deep dive into any landlord)
├── Users
│   ├── All Users (global directory)
│   ├── Login History
│   └── Session Management
├── Platform
│   ├── Revenue Analytics
│   ├── Occupancy Analytics
│   └── Registration Funnel
├── Configuration
│   ├── General Settings
│   ├── Plan Management
│   ├── Payment Methods
│   ├── Notification Templates
│   └── Feature Flags
├── Operations
│   ├── Audit Trail
│   ├── Announcements
│   └── System Health
└── My Account (admin profile + password change)
```

---

## 🔑 Account Provisioning & Invite Flows

This is a comprehensive system for how accounts get created at every level. The key principle: **if someone else creates your credentials, you must change your password on first login**.

### Database Changes

Add to `users` table:

```sql
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN invite_token VARCHAR(64);
ALTER TABLE users ADD COLUMN invite_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
```

### Flow 1: Admin Creates Landlord Account

```
┌──────────────────────────────────────────────────────────────────┐
│                   ADMIN → LANDLORD CREATION                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option A: INVITE LINK                                           │
│  ─────────────────────                                           │
│  1. Admin fills: company_name, email, phone, plan_tier           │
│  2. System creates landlord_profile (is_active = TRUE)           │
│  3. System generates a unique invite_token (crypto.randomUUID)   │
│  4. System sends invite link via EMAIL or SMS:                   │
│     https://bashacare.com/setup?token=abc123                     │
│  5. Landlord clicks link → Registration form (pre-filled):       │
│     - Email: pre-filled, read-only                               │
│     - Full Name: editable                                        │
│     - Password: required                                         │
│     - Confirm Password: required                                 │
│  6. Landlord sets their own password                             │
│  7. Token is consumed, account is active                         │
│  8. must_change_password = FALSE (they chose their own)          │
│                                                                  │
│  Option B: ADMIN SETS UP EVERYTHING                              │
│  ──────────────────────────────────                              │
│  1. Admin fills: company_name, email, phone, plan_tier,          │
│     full_name, temporary_password                                │
│  2. System creates landlord_profile + user account               │
│  3. must_change_password = TRUE                                  │
│  4. Admin shares credentials manually (or via email)             │
│  5. Landlord logs in → FORCED to change password before          │
│     accessing any page                                           │
│  6. After password change: must_change_password = FALSE          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Flow 2: Landlord Creates Tenant Account

```
┌──────────────────────────────────────────────────────────────────┐
│                  LANDLORD → TENANT CREATION                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option A: INVITE LINK                                           │
│  ─────────────────────                                           │
│  1. Landlord adds tenant profile (name, phone, NID, etc.)       │
│  2. Landlord clicks "Send Portal Invite"                         │
│  3. System generates invite_token                                │
│  4. System sends invite link via EMAIL or SMS:                   │
│     https://bashacare.com/tenant-setup?token=xyz789              │
│  5. Tenant clicks link → Setup form:                             │
│     - Email: pre-filled if provided, else editable               │
│     - Password: required                                         │
│     - Confirm Password: required                                 │
│  6. Tenant sets their own password                               │
│  7. Token consumed, account is active                            │
│  8. must_change_password = FALSE (they chose their own)          │
│                                                                  │
│  Option B: LANDLORD CREATES CREDENTIALS                          │
│  ──────────────────────────────────────                          │
│  1. Landlord adds tenant profile                                 │
│  2. Landlord clicks "Create Login" (existing flow)               │
│  3. Landlord provides: email, temporary_password                 │
│  4. System creates user with must_change_password = TRUE         │
│  5. Landlord shares credentials with tenant (verbally, chat)     │
│  6. Tenant logs in → FORCED to change password before            │
│     accessing the portal                                         │
│  7. After password change: must_change_password = FALSE          │
│                                                                  │
│  Option C: TENANT SELF-REGISTERS (new)                           │
│  ─────────────────────────────────────                           │
│  1. Landlord generates a "Tenant Registration Link" for a unit   │
│     https://bashacare.com/join?code=PROP-UNIT-abc                │
│  2. Tenant opens link → Registration form:                       │
│     - Full Name, Phone, Email, Password                          │
│  3. System auto-links tenant to the landlord + unit              │
│  4. Landlord sees the new tenant in their list                   │
│  5. Landlord can then create a lease for them                    │
│  6. must_change_password = FALSE (they chose their own)          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Forced Password Change — Frontend Implementation

```
┌──────────────────────────────────────────────────────────────────┐
│              FORCED PASSWORD CHANGE SCREEN                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  After successful login, if user.must_change_password === true:  │
│                                                                  │
│  1. Redirect to /change-password (a dedicated full-screen page)  │
│  2. Show message:                                                │
│     "Your account was set up by [admin/landlord]. For security,  │
│      you must create your own password before continuing."       │
│  3. Form fields:                                                 │
│     - New Password (min 8 chars, 1 uppercase, 1 number)          │
│     - Confirm New Password                                       │
│  4. On submit → PATCH /api/v1/auth/force-change-password         │
│  5. Backend: updates password_hash, sets must_change_password    │
│     = FALSE, sets password_changed_at = NOW()                    │
│  6. Redirect to appropriate dashboard                            │
│                                                                  │
│  IMPORTANT: ProtectedRoute must check must_change_password       │
│  and block access to ALL other pages until it's resolved.        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Invite Link — Backend API Design

```
POST /api/v1/admin/landlords/invite
Body: { company_name, email, phone, plan_tier }
→ Creates landlord_profile + user(role=landlord, invite_token=..., is_active=FALSE)
→ Sends email/SMS with link
→ Returns { invite_token, invite_url }

POST /api/v1/admin/landlords/create
Body: { company_name, email, phone, plan_tier, full_name, password }
→ Creates landlord_profile + user(role=landlord, must_change_password=TRUE)
→ Returns { landlord_id, user_id }

POST /api/v1/auth/accept-invite
Body: { token, full_name, password }
→ Validates token, sets password, activates account
→ Returns { token (JWT), user }

POST /api/v1/tenants/:id/invite
Body: { email?, phone? }
→ Generates invite_token for existing tenant_profile
→ Sends email/SMS with tenant setup link
→ Returns { invite_url }

POST /api/v1/tenants/:id/create-login  (existing — enhanced)
Body: { email, password }
→ Creates user with must_change_password = TRUE
→ Returns { message }

POST /api/v1/auth/force-change-password
Body: { new_password }
→ Requires auth + must_change_password = TRUE
→ Updates hash, clears flag
→ Returns { message }

GET /api/v1/auth/invite-info?token=xxx
→ Returns { email, company_name, role } for pre-filling the setup form
→ Returns 404 if expired or invalid
```

### Token Security Rules

- Invite tokens expire after **72 hours**
- Tokens are single-use (deleted/consumed on acceptance)
- Tokens are cryptographically random (`crypto.randomUUID()` or `crypto.randomBytes(32)`)
- Each invite stores `invited_by` (the admin or landlord who created it) for audit trail
- Expired tokens return a friendly "This invite has expired. Please ask your administrator to send a new one."

---

## ✨ New Feature Ideas

### 🔥 High Priority (Core Business Value)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **SMS / WhatsApp Notifications** | Bangladesh runs on mobile messaging. Send invoice reminders, payment confirmations, and overdue alerts via SMS (e.g., BulkSMSBD) or WhatsApp Business API. Critical for tenant engagement. |
| 2 | **Invoice PDF Generation & Download** | Allow landlords to download/print professional PDF invoices with their company branding. Tenants should also be able to download receipts. Use `puppeteer` or `pdfkit`. |
| 3 | **Automated Invoice Scheduling** | Instead of manual "Generate All" buttons, let landlords configure auto-generation on the 1st of each month via a cron job. |
| 4 | **Overdue Auto-Escalation** | Auto-mark invoices as overdue, auto-apply late fees based on configurable rules (e.g., 5% after 7 days), and auto-send reminders. |
| 5 | **Multi-Language Support (Bangla/English)** | The app targets Bangladesh but only supports English. Add i18n with Bengali (`bn-BD`) as the primary language option. Use `react-i18next`. |
| 6 | **Maintenance Request System** | Tenants can submit maintenance/repair requests with photos. Landlords can assign, track, and resolve them. This is a standard feature in property management SaaS. |
| 7 | **Real-time Notification System** | Replace the static bell icon with a real notification center. Use WebSocket (Fastify WebSocket) or SSE for real-time payment alerts, overdue warnings, and system messages. |
| 8 | **Forgot Password / Password Reset** | Email-based password reset flow with secure time-limited tokens. Essential for any production auth system. |

### 🟡 Medium Priority (Differentiators)

| # | Feature | Description |
|---|---------|-------------|
| 9 | **Expense Tracking** | Allow landlords to log expenses (repairs, maintenance, property tax, insurance) per property/unit. Calculate net profit per property. |
| 10 | **Document Management** | Upload and store lease agreements, tenant ID copies, and receipts as files (use cloud storage like S3/GCS). |
| 11 | **Rent Receipt Generator** | Auto-generate rent receipts with serial numbers upon successful payment verification. Required by law in many jurisdictions. |
| 12 | **Multi-Property Dashboard** | A birds-eye view comparing performance across all properties — occupancy rates, revenue, overdue percentages. |
| 13 | **Tenant Communication Log** | Track all communications with tenants — notes, calls, complaints — in a timeline format. |
| 14 | **Lease Renewal Reminders** | Notify landlords 30/60/90 days before lease expiration. Auto-generate renewal proposals. |
| 15 | **Move-In / Move-Out Checklist** | A structured checklist with photo evidence for unit condition at move-in and move-out. Reduces deposit disputes. |
| 16 | **Bulk Operations** | Bulk invoice generation, bulk SMS, bulk payment verification for landlords with many tenants. |
| 17 | **Export to Excel/CSV** | Allow landlords to export invoices, payments, and reports to Excel for accounting purposes. |
| 18 | **Manager Role Expansion** | Currently managers can only access utilities. Expand to allow landlords to configure per-manager permissions (can view payments, can verify payments, can manage tenants, etc.). |
| 19 | **Rent Increase Management** | Track rent increase history, auto-update lease base_rent with notice period. Notify tenants of upcoming increases. |
| 20 | **Deposit Return Workflow** | When a lease terminates, guide the landlord through deposit return: deductions for damages → final calculation → refund record. |

### 🟢 Low Priority (Nice-to-Have / Future Vision)

| # | Feature | Description |
|---|---------|-------------|
| 21 | **Mobile App (React Native)** | A dedicated mobile app for tenants to view invoices, submit payments, and raise maintenance tickets on the go. |
| 22 | **AI-Powered Insights** | Predict which tenants are likely to default based on payment history patterns. Suggest optimal rent pricing. |
| 23 | **Property Listing/Advertising** | Allow landlords to list vacant units publicly. Prospective tenants can browse and apply. |
| 24 | **Accounting Integration** | Integrate with popular Bangladeshi accounting software or export in formats compatible with local tax reporting. |
| 25 | **Sub-Meter Support** | Track individual utility sub-meters per unit with automatic bill splitting for shared utilities. |
| 26 | **Visitor Management** | Track visitor entry/exit for security-conscious properties. |
| 27 | **Community Board** | A shared notice board for building announcements (scheduled maintenance, events, rules). |
| 28 | **Multi-Currency Support** | For landlords with properties in multiple countries or dealing with foreign tenants. |
| 29 | **Calendar View** | A visual calendar showing lease start/end dates, due dates, and scheduled events. |
| 30 | **White-Label / Branding** | Let each landlord customize the tenant portal with their own logo, colors, and domain. |
| 31 | **Referral System** | Landlords can refer other landlords. Track referrals and offer incentives (e.g., 1 month free). |
| 32 | **Tenant Rating / Feedback** | After lease termination, landlords can rate tenants (payment reliability, property care). Future landlords can request references. |
| 33 | **Shared Utility Bill Splitting** | For buildings with a single meter, auto-split bills across units by square footage, occupant count, or equal shares. |
| 34 | **Photo Gallery per Unit** | Upload photos of each unit — useful for listing, move-in/out documentation, and maintenance requests. |

---

## 🧪 Testing & DevOps

| # | Area | Current State | Recommendation |
|---|------|---------------|----------------|
| 1 | **Unit Tests** | None | Add Jest/Vitest for frontend component tests and backend route handler tests. |
| 2 | **Integration Tests** | None | Test API endpoints with `supertest` against a test database. |
| 3 | **E2E Tests** | None | Use Playwright to test critical flows: login, create tenant, generate invoice, submit payment. |
| 4 | **CI/CD Pipeline** | None | Set up GitHub Actions for linting, testing, building, and deploying on push/PR. |
| 5 | **Environment Config** | No `.env.example` | Create `.env.example` files for both backend and frontend with all required variables documented. |
| 6 | **Database Migrations** | File-based, manual | Add a proper migration runner with up/down support and version tracking (already has basic support in `migrate.js`). |
| 7 | **Health Check** | Basic `/health` endpoint | Add database connectivity check to the health endpoint. |
| 8 | **Monitoring** | None | Add error tracking (Sentry), uptime monitoring, and performance monitoring (APM). |
| 9 | **Docker** | DB only | Add `Dockerfile` for both frontend and backend. Create a full `docker-compose.yml` that runs the complete stack. |
| 10 | **Linting** | ESLint configured but no pre-commit hook | Add `husky` + `lint-staged` for pre-commit linting. |

---

## 📝 Documentation

| # | Area | Recommendation |
|---|------|----------------|
| 1 | **API Documentation** | Add Swagger/OpenAPI documentation using `@fastify/swagger`. Auto-generate from route schemas. |
| 2 | **Database ERD** | Create a visual Entity-Relationship Diagram of the schema. The `NotebookLM Mind Map` exists but a proper ERD is needed. |
| 3 | **Environment Setup Guide** | Step-by-step guide for new developers including all prereqs, environment variables, and common pitfalls. |
| 4 | **Deployment Guide** | Document how to deploy to Vercel (frontend) and a cloud provider (backend + DB). |
| 5 | **Architecture Decision Records (ADRs)** | Document key technical decisions (why Fastify over Express, why RLS, why custom CSS over Tailwind). |
| 6 | **Contributing Guide** | For open-source readiness — code style, PR process, branch strategy. |

---

## 📊 Priority Matrix

| Priority | Items | Est. Effort |
|----------|-------|-------------|
| **P0 — Fix Now** | SQL injection in RLS, JWT secret fallback, webhook auth, mobile sidebar toggle | 1–2 days |
| **P1 — This Sprint** | Full mobile responsive overhaul, Zod validation, pagination, dead code cleanup, forced password change flow, dark/light theme toggle | 3–5 days |
| **P2 — Next Sprint** | Code splitting, React Query, invite link flows (admin → landlord, landlord → tenant), admin landlord management pages, PDF invoices, SMS notifications, i18n | 1–2 weeks |
| **P3 — Backlog** | Full admin panel (analytics, config, audit trail), maintenance requests, expense tracking, document management, manager permissions, export to Excel | 2–4 weeks |
| **P4 — Future** | Mobile app, AI insights, white-label, accounting integration, property listings, tenant ratings | 1–3 months |

---

*Generated by analyzing all source files across the BashaCare full-stack application.*