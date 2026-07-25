# BashaCare - Comprehensive Technical Context & Developer Guide

This document is the definitive guide to BashaCare's architecture, database design, and coding patterns. It is written specifically for AI agents (and human developers) to instantly understand the state of the project and begin contributing without breaking established patterns.

## 1. Domain & Product Vision
**BashaCare** is a multi-vertical Property Management SaaS platform. It handles residential, commercial, hotel, and hospital properties.
- **Landlord Portal**: Property managers log in to manage properties, units, occupants, agreements, billing, and maintenance.
- **Tenant Portal**: Occupants log in to view invoices, make payments, submit support tickets, and view their lease terms.
- **Admin Portal**: Platform super-admins monitor the SaaS system and approve new landlord registrations.

## 2. Project Architecture
The project is a standard Monorepo separated into two standalone services:
- `/backend`: Node.js API server powered by **Fastify**.
- `/frontend`: Single Page Application powered by **React 18** and **Vite**.

---

## 3. Database & Security Model (CRITICAL)

BashaCare uses **PostgreSQL**. To achieve strict multi-tenancy and data isolation, we utilize **Row-Level Security (RLS)** at the database level. 

### The RLS Implementation
Instead of manually adding `WHERE landlord_id = $1` to every single query (which is error-prone), the backend relies entirely on a dedicated PostgreSQL role (`bashacare_rls_user`) and local session variables.

**Rule for Agents:** You **MUST NEVER** use `pool.query()` directly in authenticated landlord routes. You **MUST** use the wrappers exported from `backend/src/config/database.js`:

1. `queryWithRLS(landlordId, query, params)`
2. `transactionWithRLS(landlordId, operations)`

**How it works under the hood:**
```javascript
// Inside database.js
await client.query('SET LOCAL ROLE bashacare_rls_user;');
await client.query(`SET LOCAL app.current_landlord_id = '${landlordId}';`);
const result = await client.query(query, params);
```
This forces Postgres to evaluate the RLS policies (e.g., `landlord_isolation_occupants`) and automatically filters out any rows that do not belong to `app.current_landlord_id`.

### Database Triggers (Business Logic)
A lot of business logic is pushed down to the database level via Triggers and Functions:
- `fn_enforce_single_active_agreement`: Ensures a unit only has one active agreement. Deactivates previous ones automatically.
- `fn_calculate_utility_charge`: Automatically calculates `charge_amount` based on tariff and delta when a `utility_meter_logs` row is inserted, and updates the corresponding invoice automatically.
- `fn_agreement_termination_update_unit`: Sets a unit's status to `VACANT` when a lease is terminated.

### Custom Enums (Type Casting Rule)
The database uses strict Custom Enums (`property_type`, `unit_status`).
**Rule for Agents:** When using parameterized queries to insert/update enum columns, Postgres will throw a type error unless you explicitly cast the parameter.
```sql
-- BAD
UPDATE properties SET property_type = COALESCE($1, property_type)

-- GOOD (Required)
UPDATE properties SET property_type = COALESCE($1::text, property_type::text)::property_type
```

---

## 4. Backend Patterns (/backend)

- **Framework**: `fastify`. Routes are registered as plugins inside `backend/src/routes/`.
- **Authentication**: JWT verification is handled by the `auth` hook (`backend/src/plugins/auth.js`). It decodes the token and attaches `req.user`.
- **API Structure**: 
  - `GET /api/v1/:entity` (List with pagination)
  - `POST /api/v1/:entity` (Create)
  - `PATCH /api/v1/:entity/:id` (Update)
  - `DELETE /api/v1/:entity/:id` (Delete)
- **Data Models**:
  - `landlords` (The SaaS tenants)
  - `users` (Login credentials for landlords, tenants, and admins)
  - `properties` (Buildings, campuses)
  - `units` (Rooms, apartments, hospital beds)
  - `occupant_profiles` (The residents/tenants)
  - `agreements` (Leases, hotel reservations)
  - `ledger_invoices`, `ledger_adjustments`, `payment_transactions` (Billing core)
  - `utility_meter_logs` (Tracks electricity/water readings)
  - `maintenance_requests` (Tickets)
  - `activity_logs` (Audit trails)

---

## 5. Frontend Patterns (/frontend)

- **Framework**: React 18 (Vite).
- **State Management**: **Zustand** is used for global state. Avoid React Context or Redux.
  - `authStore.js`: Manages JWT, User Session, and Onboarding State.
  - `themeStore.js`: Manages Light/Dark mode.
- **Routing**: `react-router-dom`. Routes are protected by `<PrivateRoute>` which checks `authStore`.
- **Data Fetching**: We use a mix of `Axios` and `@tanstack/react-query`. 
  - The API instance (`services/api.js`) automatically attaches the Bearer token via interceptors.
- **Localization**: UI text should use `react-i18next` (`const { t } = useTranslation()`).

### Styling Rules (CRITICAL)
- **NO TAILWINDCSS.** Do not generate Tailwind classes (`className="flex items-center"`).
- We use **Vanilla CSS** located in `index.css`.
- Rely on existing CSS Variables for colors (`var(--bg-base)`, `var(--text-primary)`, `var(--accent-primary)`) to ensure dark-mode compatibility.
- Use the established component classes:
  - `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-icon`
  - `.form-input`, `.form-select`, `.form-label`, `.form-group`, `.form-grid`
  - `.modal-overlay`, `.modal`, `.modal-header`, `.modal-footer`
  - `.data-table`, `.badge`, `.badge-success`, `.badge-warning`

### Interactive Onboarding Wizard
The onboarding tour (`components/OnboardingTour.jsx`) is a strictly enforced, state-machine-driven interactive wizard. 
- It forces new landlords to create demo data (Properties -> Units -> Occupants -> Agreements).
- It relies on a CSS trick with 4 `.tour-blocker` divs to intercept clicks outside the target area.
- Components like `Properties.jsx` call `useAuthStore.getState().advanceOnboarding()` upon a successful API `POST` to move the tour to the next step.

## 6. How to Contribute as an AI
1. **Read `context.md` (You are here).**
2. When creating a new endpoint, add the route to `/backend/src/routes/` and ensure you use `queryWithRLS`. Register it in `server.js`.
3. When creating a new frontend feature, build the page in `/frontend/src/pages/`, add the route to `App.jsx`, and fetch data via `react-query`.
4. Style new UI elements strictly with existing `index.css` classes.
5. If modifying database schemas, write a new `.sql` migration file in `backend/src/db/migrations/` and verify the RLS policies remain intact.
