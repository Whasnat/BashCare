# 📲 BashaCare — SMS / WhatsApp Notification System

> Feature plan for automated tenant and landlord notifications via SMS and WhatsApp.

---

## 🎯 Goal

Enable BashaCare to send **automated notifications** to tenants and landlords at key moments in the billing lifecycle. Bangladesh is a mobile-first market — tenants are far more likely to see an SMS or WhatsApp message than an email.

---

## 📋 Notification Events

These are the **trigger points** where a notification should be sent:

| # | Event | Recipient | Channel | Trigger |
|---|-------|-----------|---------|---------|
| 1 | **Invoice Generated** | Tenant | SMS | When `POST /invoices/generate-all` creates invoices |
| 2 | **Payment Reminder** | Tenant | SMS | 3 days before `due_date`, if invoice is still `UNPAID` |
| 3 | **Payment Submitted** | Landlord | SMS | When tenant calls `POST /payments/submit-trxid` |
| 4 | **Payment Confirmed** | Tenant | SMS | When landlord approves via `PATCH /payments/:id/verify` |
| 5 | **Payment Rejected** | Tenant | SMS | When landlord rejects via `PATCH /payments/:id/verify` |
| 6 | **Invoice Overdue** | Tenant | SMS | When `POST /invoices/mark-overdue` flips status to `OVERDUE` |
| 7 | **Manual Message** | Tenant | SMS | Landlord sends a custom message from the dashboard (future) |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     BashaCare Backend                        │
│                                                              │
│  Route Handler (invoices.js, payments.js)                    │
│       │                                                      │
│       ▼                                                      │
│  notificationService.send({                                  │
│    to: '+8801712345678',                                     │
│    template: 'invoice_generated',                            │
│    data: { tenant_name, amount, month, due_date }            │
│  })                                                          │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────┐                                │
│  │   Notification Service   │   ← abstraction layer          │
│  │   (services/notify.js)   │                                │
│  └──────────┬───────────────┘                                │
│             │                                                │
│      ┌──────┴──────┐                                         │
│      ▼             ▼                                         │
│  SMS Provider   WhatsApp API                                 │
│  (BulkSMSBD,   (Meta Business                               │
│   SSLWireless,  API — future)                                │
│   or Twilio)                                                 │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** The notification service is a thin abstraction so we can swap providers without touching route logic.

---

## 🔌 SMS Provider Options (Bangladesh)

| Provider | Pricing | API | Notes |
|----------|---------|-----|-------|
| **BulkSMSBD** | ~৳0.25/SMS | REST API | Popular in BD, local support |
| **SSLWireless** | ~৳0.20/SMS | REST API | Enterprise-grade, widely used |
| **Twilio** | ~৳1.50/SMS | REST API | Global, reliable, more expensive |
| **Meta WhatsApp Business API** | Free for 1000/mo | REST API | Requires business verification |

> **Recommendation:** Start with **BulkSMSBD or SSLWireless** for SMS (cheapest for BD numbers). Add WhatsApp as a second channel later.

---

## 🗂️ Implementation Steps

### Phase 1: Core Infrastructure

#### Step 1 — Database: `notification_log` table

Create a migration to track every notification sent. This provides:
- Audit trail (who was notified, when, what)
- Retry logic for failed sends
- Analytics (how many SMS sent per month)

```sql
CREATE TABLE notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenant_profiles(id),
  recipient     VARCHAR(20) NOT NULL,           -- phone number
  channel       VARCHAR(10) NOT NULL DEFAULT 'SMS', -- 'SMS' | 'WHATSAPP'
  event_type    VARCHAR(50) NOT NULL,           -- 'invoice_generated', 'payment_confirmed', etc.
  template_key  VARCHAR(50) NOT NULL,           -- maps to message template
  message_body  TEXT NOT NULL,                  -- the actual sent message
  reference_id  UUID,                           -- invoice_id or payment_id
  status        VARCHAR(20) DEFAULT 'QUEUED',   -- 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED'
  provider_id   TEXT,                           -- external ID from SMS provider
  error_message TEXT,                           -- error details if failed
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_log_landlord ON notification_log(landlord_id);
CREATE INDEX idx_notification_log_tenant ON notification_log(tenant_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);
```

#### Step 2 — Notification Service (`services/notify.js`)

A service module with:
- `send(options)` — sends a single notification
- `sendBulk(options[])` — sends multiple (for generate-all)
- Message templates with variable interpolation
- Provider abstraction (swap BulkSMSBD → Twilio without changing callers)
- Graceful degradation (if SMS fails, log the error but don't crash the route)

```
backend/src/services/
  └── notify.js         ← main service
  └── smsProviders/
      ├── bulksmsbd.js  ← BulkSMSBD adapter
      ├── sslwireless.js ← SSLWireless adapter (alternative)
      └── mock.js       ← Console logger for dev/test
```

#### Step 3 — Message Templates

Define templates with placeholders. All messages should be **bilingual** (Bangla + English) and under 160 characters (1 SMS segment).

| Template Key | Message (EN) | Message (BN) |
|-------------|-------------|-------------|
| `invoice_generated` | `BashaCare: Your rent invoice for {month} is ৳{amount}. Due by {due_date}. Pay now via your tenant portal.` | `BashaCare: {month} মাসের ভাড়ার বিল ৳{amount}। শেষ তারিখ {due_date}।` |
| `payment_reminder` | `BashaCare Reminder: Your rent of ৳{amount} for {month} is due in 3 days ({due_date}). Please pay to avoid late fees.` | `BashaCare: আপনার ৳{amount} ভাড়া {due_date} তারিখের মধ্যে পরিশোধ করুন।` |
| `payment_submitted` | `BashaCare: {tenant_name} submitted ৳{amount} via {method} (TrxID: {trx_id}). Please verify.` | (landlord-facing, English only) |
| `payment_confirmed` | `BashaCare: Your payment of ৳{amount} for {month} has been confirmed. Thank you!` | `BashaCare: আপনার ৳{amount} পরিশোধ নিশ্চিত হয়েছে। ধন্যবাদ!` |
| `payment_rejected` | `BashaCare: Your payment of ৳{amount} (TrxID: {trx_id}) was rejected. Reason: {reason}. Please resubmit.` | `BashaCare: আপনার পেমেন্ট প্রত্যাখ্যাত হয়েছে। পুনরায় জমা দিন।` |
| `invoice_overdue` | `BashaCare: Your rent of ৳{amount} for {month} is OVERDUE. Please pay immediately to avoid penalties.` | `BashaCare: আপনার ৳{amount} ভাড়া মেয়াদোত্তীর্ণ। অবিলম্বে পরিশোধ করুন।` |

#### Step 4 — Landlord Settings (DB + API + UI)

Add per-landlord notification preferences to the `landlord_profiles` table or a new `notification_settings` table:

```sql
CREATE TABLE notification_settings (
  landlord_id         UUID PRIMARY KEY REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  sms_enabled         BOOLEAN DEFAULT FALSE,
  sms_provider        VARCHAR(20) DEFAULT 'BULKSMSBD',  -- 'BULKSMSBD' | 'SSLWIRELESS' | 'TWILIO'
  sms_api_key         TEXT,                              -- encrypted
  sms_sender_id       VARCHAR(11),                       -- e.g. 'BashaCare'
  notify_invoice_generated   BOOLEAN DEFAULT TRUE,
  notify_payment_reminder    BOOLEAN DEFAULT TRUE,
  notify_payment_submitted   BOOLEAN DEFAULT TRUE,
  notify_payment_confirmed   BOOLEAN DEFAULT TRUE,
  notify_payment_rejected    BOOLEAN DEFAULT TRUE,
  notify_overdue             BOOLEAN DEFAULT TRUE,
  reminder_days_before       INTEGER DEFAULT 3,          -- how many days before due date
  language                   VARCHAR(5) DEFAULT 'en',    -- 'en' | 'bn'
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Phase 2: Hook into Existing Routes

#### Step 5 — Invoice Generation Notification

**File:** `routes/invoices.js` → `POST /generate-all`

After successful bulk generation, query the generated invoices with tenant phone numbers and send bulk SMS:

```js
// After RETURNING ids from generate-all...
if (generated > 0 && notifyService.isEnabled(landlordId)) {
  const invoices = await getGeneratedInvoiceDetails(landlordId, generatedIds);
  for (const inv of invoices) {
    await notifyService.send({
      landlordId, tenantId: inv.tenant_id,
      to: inv.tenant_phone,
      template: 'invoice_generated',
      data: { month: inv.billing_month, amount: inv.amount_due, due_date: inv.due_date },
      referenceId: inv.id
    });
  }
}
```

#### Step 6 — Payment Submitted Notification (to Landlord)

**File:** `routes/payments.js` → `POST /submit-trxid`

After a tenant submits a TrxID, notify the landlord:

```js
// After successful payment INSERT...
const landlord = await getLandlordContact(landlordId);
await notifyService.send({
  landlordId, to: landlord.phone_number,
  template: 'payment_submitted',
  data: { tenant_name, amount, method, trx_id },
  referenceId: payment.id
});
```

#### Step 7 — Payment Verified Notification (to Tenant)

**File:** `routes/payments.js` → `PATCH /:id/verify`

After approve/reject, notify the tenant:

```js
// After approval...
await notifyService.send({
  landlordId, tenantId: payment.tenant_id,
  to: tenantPhone,
  template: action === 'approve' ? 'payment_confirmed' : 'payment_rejected',
  data: { amount, month, trx_id, reason: notes },
  referenceId: payment.id
});
```

#### Step 8 — Overdue Notification

**File:** `routes/invoices.js` → `POST /mark-overdue`

After marking invoices overdue, notify affected tenants:

```js
// After UPDATE ... RETURNING id, tenant_id
if (result.rowCount > 0) {
  const overdueInvoices = await getOverdueInvoiceDetails(landlordId, result.rows);
  for (const inv of overdueInvoices) {
    await notifyService.send({
      landlordId, tenantId: inv.tenant_id,
      to: inv.tenant_phone,
      template: 'invoice_overdue',
      data: { amount: inv.balance_remaining, month: inv.billing_month },
      referenceId: inv.id
    });
  }
}
```

---

### Phase 3: Frontend — Settings UI

#### Step 9 — Notification Settings Page

Add a new section in the landlord **Settings** page (or a new tab):

- **Enable/Disable SMS** — master toggle
- **SMS Provider** — dropdown (BulkSMSBD / SSLWireless / Twilio)
- **API Key** — input field (stored encrypted)
- **Sender ID** — short code like "BashaCare" (max 11 chars)
- **Per-event toggles** — checkboxes for each notification type
- **Language preference** — English / Bangla
- **Reminder timing** — days before due date (default 3)

#### Step 10 — Notification Log Viewer

Add a **Notification History** tab in Settings or as a standalone page:

- Table showing: date, recipient, event type, message, status (Sent/Failed)
- Filter by: event type, status, date range
- Helps landlords audit what messages were sent

---

### Phase 4: Automated Reminders (Cron)

#### Step 11 — Payment Reminder Cron Job

A scheduled job that runs daily (e.g., at 9 AM BST) and checks:
1. Find all `UNPAID` invoices where `due_date - reminder_days_before = TODAY`
2. For each, send a reminder SMS to the tenant
3. Log in `notification_log`

**Options for scheduling:**
- **node-cron** — simple in-process scheduler (good for single instance)
- **pg_cron** — PostgreSQL extension (runs even if server restarts)
- **External cron** — Render Cron Jobs or a simple GitHub Action

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `backend/src/db/migrations/005_notification_system.sql` | `notification_log` + `notification_settings` tables |
| `backend/src/services/notify.js` | Main notification service |
| `backend/src/services/smsProviders/bulksmsbd.js` | BulkSMSBD adapter |
| `backend/src/services/smsProviders/mock.js` | Dev/test mock (console.log) |
| `backend/src/services/templates.js` | Message templates (EN + BN) |
| `backend/src/routes/notifications.js` | API for settings CRUD + log viewer |

### Modified Files
| File | Change |
|------|--------|
| `backend/src/routes/invoices.js` | Add notify calls after generate-all and mark-overdue |
| `backend/src/routes/payments.js` | Add notify calls after submit-trxid and verify |
| `backend/src/server.js` | Register notification routes, init cron job |
| `backend/.env.example` | Add SMS provider env vars |
| `frontend/src/pages/landlord/Settings.jsx` | Add notification settings section |

---

## ⚙️ Environment Variables

```env
# ── SMS Notifications ───────────────────────────────────────
SMS_ENABLED=false                    # Global kill switch
SMS_DEFAULT_PROVIDER=MOCK            # MOCK | BULKSMSBD | SSLWIRELESS | TWILIO

# BulkSMSBD
BULKSMSBD_API_KEY=your_api_key
BULKSMSBD_SENDER_ID=BashaCare

# SSLWireless (alternative)
SSLWIRELESS_API_TOKEN=your_token
SSLWIRELESS_SID=your_sid

# Twilio (alternative)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

---

## ✅ Execution Order

| Order | Task | Est. Time |
|-------|------|-----------|
| 1 | Create `005_notification_system.sql` migration | 20 min |
| 2 | Build `services/notify.js` + mock provider | 1 hr |
| 3 | Build `services/templates.js` | 30 min |
| 4 | Build `services/smsProviders/bulksmsbd.js` | 30 min |
| 5 | Create `routes/notifications.js` (settings + log API) | 1 hr |
| 6 | Hook into `invoices.js` (generate-all + mark-overdue) | 45 min |
| 7 | Hook into `payments.js` (submit-trxid + verify) | 45 min |
| 8 | Frontend: Notification Settings UI in Settings page | 1.5 hr |
| 9 | Frontend: Notification Log viewer | 1 hr |
| 10 | Add cron job for payment reminders | 45 min |
| 11 | Test end-to-end with mock provider | 30 min |
| 12 | Update `.env.example` + documentation | 15 min |

**Total estimated time: ~8–9 hours**

---

## 🚧 Open Questions

1. **Which SMS provider do you want to start with?** BulkSMSBD is the cheapest for BD numbers. Or should we start with a mock/console logger and plug in a real provider later?
2. **Per-landlord API keys vs. platform-wide?** Should each landlord bring their own SMS API key, or does BashaCare provide SMS as a platform feature (and potentially charge for it)?
3. **WhatsApp now or later?** Meta's WhatsApp Business API requires a verified business account. Should we plan the architecture for it but implement only SMS for now?
4. **Language preference** — should this tie into the broader multi-language (i18n) feature, or keep it simple with just template-level `en`/`bn` toggling?

---

*This plan covers the full lifecycle from infrastructure to UI. Let's discuss the open questions before we start coding.*
