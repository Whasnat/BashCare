# BashaCare — Complete Product Guide
### Everything the App Does, Explained Simply

---

## Table of Contents

1. [What is BashaCare?](#what-is-bashacare)
2. [Who Uses BashaCare? (User Roles)](#who-uses-bashacare)
3. [Getting Started](#getting-started)
4. [Property Management](#property-management)
5. [Unit / Room Management](#unit--room-management)
6. [Occupant Management](#occupant-management)
7. [Agreements (Leases, Bookings, etc.)](#agreements)
8. [Hotel Reservations](#hotel-reservations)
9. [Billing & Invoicing](#billing--invoicing)
10. [Payments](#payments)
11. [Utility Meter Readings](#utility-meter-readings)
12. [Maintenance Requests](#maintenance-requests)
13. [Reports & Analytics](#reports--analytics)
14. [Activity Log (Audit Trail)](#activity-log)
15. [Notifications](#notifications)
16. [Settings](#settings)
17. [Tenant Portal](#tenant-portal)
18. [Admin Panel](#admin-panel)
19. [Automated Background Tasks](#automated-background-tasks)
20. [Supported Property Types](#supported-property-types)
21. [Security & Data Protection](#security--data-protection)
22. [Languages](#languages)

---

## What is BashaCare?

BashaCare is a **property management platform** built for Bangladesh. It helps property owners manage their buildings, rooms, tenants, invoices, and payments — all from one place.

It works for many types of properties:
- 🏠 **Residential** — Apartments, houses, hostels
- 🏨 **Hotels** — Hotels, motels, guest houses
- 🏥 **Hospitals** — Hospitals, clinics, nursing homes
- 🏬 **Commercial** — Plazas, shopping malls, markets
- 🏢 **Co-working** — Shared offices
- 🏭 **Warehouses** — Storage facilities

---

## Who Uses BashaCare?

BashaCare has **four types of users**, each with different abilities:

### 1. 🏢 Landlord (Property Owner)
> *"I own properties and want to manage everything."*

**What they can do:**
- Add and manage properties, units, and occupants
- Create agreements (leases, bookings)
- Generate invoices and track payments
- Approve or reject payments submitted by tenants
- Handle maintenance requests
- View reports and analytics
- Manage their payment receiving methods (bKash, Nagad, bank)
- Invite managers to help them
- Invite tenants to the self-service portal

### 2. 👨‍💼 Manager
> *"The landlord asked me to help manage their properties."*

**What they can do:**
- Everything a landlord can do **except** changing settings and payment methods
- Record utility meter readings
- They can only see data belonging to the landlord who invited them

### 3. 🏠 Tenant / Occupant
> *"I rent a unit and want to see my bills and pay online."*

**What they can do:**
- View their own dashboard with lease details
- View their invoices (current and past)
- Submit payments by entering a transaction ID (bKash, Nagad, etc.)
- Submit maintenance requests (e.g., "The tap is leaking")
- Track the status of their maintenance requests

### 4. 🛡️ Admin (Platform Administrator)
> *"I manage the entire BashaCare platform."*

**What they can do:**
- View all landlords registered on the platform
- Approve or suspend landlord accounts
- Create new landlord accounts (pre-approved)
- Invite landlords via a setup link
- View platform-wide statistics (total properties, revenue, users)
- View and activate/deactivate any user account

---

## Getting Started

### Flow 1: Landlord Self-Registration

```
Step 1 → Go to the Register page
Step 2 → Enter: Company Name, Full Name, Email, Phone, Password
Step 3 → Click "Create Account"
Step 4 → You'll see: "Please await admin approval before logging in"
Step 5 → An Admin must approve your account
Step 6 → Once approved, you can log in
```

### Flow 2: Admin Creates a Landlord

```
Step 1 → Admin logs in → Admin Dashboard → Landlords
Step 2 → Clicks "Add Landlord"
Step 3 → Enters company name, email, and a temporary password
Step 4 → The landlord account is immediately active (pre-approved)
Step 5 → The landlord logs in and is forced to change their password
```

### Flow 3: Admin Invites a Landlord (Setup Link)

```
Step 1 → Admin logs in → Landlords → "Invite Landlord"
Step 2 → Enters company name and email
Step 3 → A unique setup link is generated (valid for 7 days)
Step 4 → Admin shares the link with the landlord (email, WhatsApp, etc.)
Step 5 → Landlord opens the link → sees a "Setup Account" page
Step 6 → Landlord enters their name, company name, and creates a password
Step 7 → Account is activated → they can log in
```

### Flow 4: Logging In

```
Step 1 → Go to the Login page
Step 2 → Enter email and password
Step 3 → System checks:
           ✅ Is the email valid? 
           ✅ Is the password correct?
           ✅ Is the account active?
           ✅ Is the landlord profile approved (for landlords)?
Step 4 → If everything passes → you're redirected to your dashboard
           - Landlords/Managers → Main Dashboard
           - Tenants → Tenant Portal Dashboard
           - Admins → Admin Dashboard
```

### Flow 5: Force Password Change

```
When an Admin creates a landlord account with a temporary password:
Step 1 → Landlord logs in
Step 2 → System detects "must_change_password = true"
Step 3 → Landlord is redirected to a "Change Password" screen
Step 4 → They must set a new password (8+ characters)
Step 5 → After changing, they can use the app normally
```

### Flow 6: Forgot Password

```
Step 1 → Click "Forgot Password?" on the Login page
Step 2 → Enter your email
Step 3 → System shows: "If an account exists, instructions have been sent"
⚠️ Note: Email sending is not yet integrated. The admin must manually reset the password.
```

---

## Property Management

> **Who can do this:** Landlord, Manager

A property is a building or location. For example: "Gulshan Heights Tower A" or "Hotel Royal Inn."

### What You Can Do

| Action | How |
|---|---|
| **View all properties** | Go to Properties page → see a table with name, type, address, total units, occupancy |
| **Add a property** | Click "Add Property" → enter name, address, and **property type** |
| **Edit a property** | Click the ✏️ pencil icon on any property row |
| **Delete a property** | Click the 🗑️ trash icon → confirm deletion (all units inside are also deleted) |
| **Search** | Use the search bar to filter by name or address |

### Property Types

When creating a property, you choose its type. This affects the terminology used throughout the app:

| Type | Unit Name | Occupant Name | Agreement Name |
|---|---|---|---|
| Residential | Unit | Tenant | Lease |
| Hotel | Room | Guest | Reservation |
| Hospital | Bed | Patient | Admission |
| Commercial | Shop | Merchant | Contract |
| Co-working | Desk | Member | Membership |
| Warehouse | Bay | Client | Storage Contract |

---

## Unit / Room Management

> **Who can do this:** Landlord, Manager

A unit is a space inside a property. It could be an apartment unit, a hotel room, a hospital bed, or a shop.

### What You Can Do

| Action | How |
|---|---|
| **View all units** | Go to Units page → see a table with unit number, property, status, rent, bedrooms |
| **Add a unit** | Click "Add Unit" → select a property → enter unit number, bedrooms, monthly rent |
| **Edit a unit** | Click the ✏️ pencil icon |
| **Delete a unit** | Click the 🗑️ trash icon |
| **Filter by property** | Use the dropdown to show only units from a specific property |
| **Filter by status** | Filter by Vacant, Occupied, Maintenance, etc. |

### Unit Statuses

| Status | Meaning |
|---|---|
| **VACANT** | Available, no one is using it |
| **OCCUPIED** | Someone has an active agreement |
| **MAINTENANCE** | Under repair, not available |
| **RESERVED** | (Hotels) Booked for a future date |
| **CHECKED_IN** | (Hotels) Guest is currently staying |
| **HOUSEKEEPING** | (Hotels) Being cleaned after checkout |

---

## Occupant Management

> **Who can do this:** Landlord, Manager

An occupant is any person associated with a property — a tenant in a house, a guest in a hotel, a patient in a hospital, etc.

### What You Can Do

| Action | How |
|---|---|
| **View all occupants** | Go to Occupants page → see a table |
| **Add an occupant** | Click "Add Occupant" → fill in name, phone, email, emergency contact, NID |
| **Edit an occupant** | Click the ✏️ pencil icon |
| **Delete an occupant** | Click the 🗑️ trash icon |
| **Search** | Search by name, phone, or email |
| **Filter** | Show all, active (has an agreement), or inactive |
| **Invite to portal** | Send the occupant an email invite so they can log into the Tenant Portal |
| **Create login manually** | Create a username and password for the occupant without sending an email |

### NID Encryption

When you enter a tenant's National ID (NID) number, BashaCare **encrypts** it using military-grade AES-256 encryption. Even if someone accessed the database directly, they cannot read the NID numbers without the encryption key.

### Inviting an Occupant to the Portal

```
Step 1 → Go to an occupant's details
Step 2 → Click "Invite to Portal" or "Create Login"
Step 3 → If invite: An email is sent with a setup link (7-day expiry)
         If manual: You create a password for them
Step 4 → The occupant can now log into the Tenant Portal
Step 5 → On first login (manual), they are forced to change their password
```

---

## Agreements

> **Who can do this:** Landlord, Manager

An agreement connects an occupant to a unit. Depending on the property type, it could be called a Lease, Booking, Admission, Contract, or Membership.

### What You Can Do

| Action | How |
|---|---|
| **View all agreements** | Go to Agreements page → see a table |
| **Create an agreement** | Click "Create" → select unit, occupant, set rent, deposit, dates, utility tariff |
| **Terminate an agreement** | Click "Terminate" on an active agreement |
| **Filter** | Show active only, past only, or all |
| **Search** | Search by occupant name or unit number |

### What Happens When You Create an Agreement

```
Step 1 → You fill in: Unit, Occupant, Base Rent, Security Deposit, Start Date, End Date
Step 2 → System automatically:
           ✅ Marks the unit as "OCCUPIED"
           ✅ Deactivates any previous agreement on that unit
           ✅ Records the event in the Activity Log
```

### What Happens When You Terminate an Agreement

```
Step 1 → Click "Terminate" on an active agreement
Step 2 → System automatically:
           ✅ Marks the unit as "VACANT"
           ✅ Sets the termination date to now
           ✅ Records the event in the Activity Log
```

---

## Hotel Reservations

> **Who can do this:** Landlord, Manager (only for Hotel-type properties)

The Reservations page is a specialized view for managing guest bookings.

### What You Can Do

| Action | How |
|---|---|
| **View all reservations** | Go to Reservations page → see a table of bookings |
| **Create a booking** | Click "New Booking" → select guest, room, check-in date, check-out date |
| **Check-in a guest** | Click the ✅ "Check-In" button on a reservation |
| **Check-out a guest** | Click the 🚪 "Check-Out" button on a reservation |

### The Complete Hotel Flow

```
Step 1 → Create a Guest (Occupants page)
Step 2 → Create a Booking (Reservations page)
           → Select the guest, room, and dates
           → Room status changes to RESERVED
Step 3 → Guest Arrives → Click "Check-In"
           → Room status changes to CHECKED_IN
Step 4 → Guest Leaves → Click "Check-Out"
           → Room status changes to HOUSEKEEPING
           → An invoice is automatically generated based on:
             (Number of Days Stayed) × (Room Daily Rate)
           → The booking is marked as completed
Step 5 → Housekeeping cleans the room → Manually change status to VACANT
```

---

## Billing & Invoicing

> **Who can do this:** Landlord, Manager

The Billing page is the financial heart of BashaCare. It shows all invoices and lets you manage them.

### How Invoices Are Created

There are **two ways** invoices are generated:

#### 1. Automatic Monthly Generation (Residential & Commercial)
```
Every month on the 1st at midnight (Bangladesh time):
  → System finds all active agreements with billing_cycle = 'MONTHLY'
  → For each one, it creates an invoice with:
       Base Rent = the agreement's monthly rent
       Due Date = the 10th of the month
  → Any unbilled maintenance costs are added as adjustments
  → A notification is sent to the tenant
```

#### 2. Automatic Checkout Generation (Hotels)
```
When a guest is checked out:
  → System calculates: (checkout date - checkin date) × daily rate
  → Creates an invoice for that amount
```

### Invoice Statuses

| Status | Meaning |
|---|---|
| **UNPAID** | Freshly generated, no payment received |
| **PARTIALLY_PAID** | Some money received, but balance remains |
| **PENDING_VERIFICATION** | Tenant submitted a payment, landlord hasn't confirmed yet |
| **PAID** | Fully paid |
| **OVERDUE** | Past due date, a late fee has been applied |

### Late Fees

```
Every day at midnight:
  → System checks for UNPAID or PARTIALLY_PAID invoices past their due date
  → If a late fee hasn't been applied yet and hasn't been waived:
       → A flat ৳500 late fee is added to the invoice
       → Invoice status changes to OVERDUE
       → A warning notification is sent to the tenant
```

### Invoice Adjustments (Ledger)

Beyond the base rent, invoices can have additional line items called **adjustments**:

| Type | Example |
|---|---|
| **REPAIR_FEE** | Maintenance cost billed to tenant (e.g., ৳500 for plumbing repair) |
| **DISCOUNT** | A negative adjustment reducing the amount owed |
| **LATE_FEE** | Late payment penalty |
| **OTHER** | Any custom adjustment |

### Payment Reminders

```
Every day at midnight:
  → System finds invoices due in exactly 3 days
  → Sends a reminder notification to the tenant:
     "Your payment of ৳X is due in 3 days"
```

---

## Payments

> **Who can do this:** Landlord, Manager, Tenant

BashaCare supports multiple payment methods common in Bangladesh.

### Supported Payment Methods

| Method | Description |
|---|---|
| **bKash** | Mobile financial service |
| **Nagad** | Mobile financial service |
| **Rocket** | Mobile financial service |
| **Bank Transfer** | Traditional bank-to-bank |
| **Cash** | Physical cash (landlord records it) |

### Payment Flow 1: Tenant Submits Payment

```
Step 1 → Tenant logs into the Portal → My Invoices
Step 2 → Opens an unpaid invoice
Step 3 → Sees the landlord's payment receiving numbers (bKash, Nagad, etc.)
Step 4 → Tenant sends money through their preferred method (outside the app)
Step 5 → Comes back to BashaCare → enters:
           - Amount paid
           - Payment method (bKash, Nagad, etc.)
           - Transaction ID (TrxID) from the payment receipt
Step 6 → Clicks "Submit Payment"
Step 7 → Invoice status changes to PENDING_VERIFICATION
Step 8 → Landlord receives a notification
```

### Payment Flow 2: Landlord Verifies Payment

```
Step 1 → Landlord goes to Payments page
Step 2 → Sees a list of pending payments with TrxIDs
Step 3 → Landlord checks their bKash/Nagad/bank app to confirm the money arrived
Step 4 → Clicks ✅ "Approve" or ❌ "Reject"

If Approved:
  → Payment status changes to VERIFIED
  → Invoice balance is reduced by the payment amount
  → If fully paid → invoice status = PAID
  → Tenant receives notification: "Your payment has been approved"

If Rejected:
  → Payment status changes to REJECTED
  → Invoice reverts to its previous status (UNPAID or PARTIALLY_PAID)
  → Tenant receives notification: "Your payment was rejected"
```

### Payment Flow 3: Landlord Records Cash Payment

```
Step 1 → Landlord goes to Payments page → "Record Cash Payment"
Step 2 → Selects the invoice, enters the amount
Step 3 → Payment is instantly verified (no approval needed)
Step 4 → Invoice balance is updated immediately
```

### Payment Allocation Priority

When a partial payment is received, BashaCare applies it in this order:
1. **Late Fees** first
2. **Utility Charges** second
3. **Base Rent** last

---

## Utility Meter Readings

> **Who can do this:** Landlord, Manager

For properties with metered utilities (electricity, gas, water), you can record readings and the system will automatically calculate charges.

### How It Works

```
Step 1 → Go to Utilities page
Step 2 → Select a unit and meter type (Electricity, Gas, or Water)
Step 3 → Enter the current meter reading
Step 4 → System automatically:
           ✅ Finds the previous reading for the same meter
           ✅ Calculates: (Current - Previous) = Units Consumed
           ✅ Multiplies by the utility tariff from the agreement
           ✅ Adds the charge to the tenant's current unpaid invoice
```

**Example:**
```
Previous electricity reading: 1,200
Current electricity reading: 1,350
Units consumed: 150
Tariff (from lease): ৳8/unit
Charge added to invoice: ৳1,200
```

---

## Maintenance Requests

> **Who creates them:** Tenant
> **Who manages them:** Landlord, Manager

### Flow: Tenant Submits a Request

```
Step 1 → Tenant logs into Portal → Maintenance
Step 2 → Clicks "New Request"
Step 3 → Fills in:
           - Issue type (PLUMBING, ELECTRICAL, STRUCTURAL, APPLIANCE, PEST_CONTROL, OTHER)
           - Priority (LOW, MEDIUM, HIGH, URGENT)
           - Title (e.g., "Kitchen tap leaking badly")
           - Description (detailed explanation)
           - Photo URL (optional)
Step 4 → Clicks Submit
Step 5 → Request appears in the landlord's Maintenance page
```

### Flow: Landlord Handles a Request

```
Step 1 → Landlord goes to Maintenance page
Step 2 → Sees all requests sorted by newest first
Step 3 → Updates the status:
           OPEN → IN_PROGRESS → RESOLVED → CLOSED
Step 4 → Optionally adds a cost (e.g., ৳2,000 for plumber)
Step 5 → If cost is added and the tenant has an unpaid invoice:
           → The cost is automatically added to the invoice as a "REPAIR_FEE" adjustment
           → The maintenance request is linked to that invoice
```

### Maintenance Statuses

| Status | Meaning |
|---|---|
| **OPEN** | Just submitted, not yet looked at |
| **IN_PROGRESS** | Being worked on |
| **RESOLVED** | Fixed, awaiting tenant confirmation |
| **CLOSED** | Fully completed |

---

## Reports & Analytics

> **Who can do this:** Landlord, Manager

The Reports page provides financial insights using charts and tables.

### Dashboard Overview

The main Dashboard shows:
- **Occupancy Rate** — Percentage of units that are occupied
- **Occupied / Total Units** — e.g., "12 / 15"
- **Outstanding Amount** — Total unpaid balance across all invoices
- **Recent Transactions** — Last 10 payments with tenant name, amount, method, and status
- **Quick Actions** — One-click buttons to register a new tenant, generate invoices, or add a property

### Reports Page

| Report | What It Shows |
|---|---|
| **Revenue Trend** | A line/area chart showing total billed vs. collected over the last 6 months |
| **Payment Methods Breakdown** | A bar/pie chart showing how much was collected via bKash, Nagad, Cash, etc. |
| **Collection Report** | A detailed table of every invoice with tenant name, unit, amount due, amount paid, balance, and status |

---

## Activity Log

> **Who can do this:** Landlord, Manager

The Activity Log is a complete **audit trail** of everything that happens in the system.

### What Gets Logged

| Category | Examples |
|---|---|
| **PROPERTY** | Property created, updated, deleted |
| **UNIT** | Unit created, status changed |
| **TENANT** | Tenant created, invited, login created |
| **LEASE** | Agreement created, terminated |
| **PAYMENT** | Payment submitted, verified, rejected |
| **INVOICE** | Invoice generated, status changed |
| **MAINTENANCE** | Request created, updated, cost billed |

### Filtering

You can filter the log by:
- **Category** (e.g., show only Payment events)
- **Date range**

Each entry shows: **Who** did **what**, **when**, and **details**.

---

## Notifications

BashaCare has a **real-time notification system** using Server-Sent Events (SSE).

### How It Works

```
When you're logged in:
  → Your browser opens a persistent connection to the server
  → When something happens that affects you, you get an instant notification
  → You can see all notifications in your notification panel
  → You can mark individual notifications as read
  → You can mark all as read at once
```

### Types of Notifications

| Notification | Who Receives It | When |
|---|---|---|
| **Invoice Generated** | Tenant | When their monthly invoice is created |
| **Payment Reminder** | Tenant | 3 days before an invoice is due |
| **Overdue Warning** | Tenant | When a late fee is applied |
| **Payment Approved** | Tenant | When landlord approves their payment |
| **Payment Rejected** | Tenant | When landlord rejects their payment |

---

## Settings

> **Who can do this:** Landlord only

The Settings page has two sections:

### 1. Company Profile

| Field | Description |
|---|---|
| **Company Name** | Your business name (shown on invoices) |
| **Contact Phone** | Your phone number |

### 2. Payment Receiving Methods

Configure where tenants should send money:

| Field | Description |
|---|---|
| **bKash Number** | Your personal bKash number for receiving payments |
| **Nagad Number** | Your personal Nagad number |
| **Rocket Number** | Your personal Rocket number |
| **Bank Name** | Your bank's name |
| **Account Name** | Name on the bank account |
| **Account Number** | Bank account number |
| **Routing Number** | Bank routing number |

> These numbers are shown to tenants on their invoice detail page, so they know where to send money.

---

## Tenant Portal

> **Who uses this:** Tenants / Occupants with a login

The Tenant Portal is a separate, simpler interface designed for tenants.

### Tenant Dashboard

Shows at a glance:
- Their **property** and **unit number**
- Their **landlord's name**
- Their **monthly rent**
- Their **lease start and end dates**
- Their **landlord's payment receiving numbers** (bKash, Nagad, bank)

### My Invoices

- A list of all invoices, newest first
- Each shows: billing month, amount due, amount paid, balance, status
- Click any invoice to see full details

### Invoice Detail

- **Breakdown**: Base rent + utility charges + late fees + adjustments = total due
- **Payment history**: All past payments for this invoice with TrxID and status
- **Submit Payment**: A form to enter amount, method, and TrxID

### Maintenance

- View all their submitted maintenance requests
- Submit new requests
- Track status updates

---

## Admin Panel

> **Who uses this:** Platform Admins only

### Admin Dashboard

Shows platform-wide stats:
- Total landlords, properties, units, active agreements
- Overall occupancy rate
- Total collected revenue and outstanding balance
- Revenue trend chart (last 6 months)
- A table of all landlords with their property/unit/lease counts

### Landlord Management

| Action | Description |
|---|---|
| **View all landlords** | See a table with company name, email, properties, units, agreements, status |
| **Create landlord** | Directly create a new landlord account (pre-approved, with temp password) |
| **Invite landlord** | Generate a setup link the landlord can use to create their own account |
| **Approve** | Activate a landlord who registered themselves |
| **Suspend** | Deactivate a landlord (they can no longer log in) |
| **View details** | See detailed stats for any landlord |

### User Management

| Action | Description |
|---|---|
| **View all users** | See every user account on the platform (landlords, managers, tenants, admins) |
| **Activate / Deactivate** | Toggle any user's active status |

---

## Automated Background Tasks

BashaCare runs automatic tasks in the background — you don't need to do anything.

| Task | When It Runs | What It Does |
|---|---|---|
| **Monthly Invoice Generation** | 1st of every month, midnight | Creates invoices for all active monthly agreements |
| **Payment Reminders** | Every day, midnight | Sends reminders for invoices due in 3 days |
| **Overdue Processing** | Every day, midnight | Applies ৳500 late fee to overdue invoices and sends warnings |

All times are in **Bangladesh Standard Time (BST / Asia/Dhaka)**.

---

## Supported Property Types

| Type | Best For | Unit Term | Occupant Term | Agreement Term | Billing |
|---|---|---|---|---|---|
| 🏠 Residential | Apartments, homes | Unit | Tenant | Lease | Monthly |
| 🏨 Hotel | Hotels, guest houses | Room | Guest | Reservation | Per Stay |
| 🏥 Hospital | Clinics, hospitals | Bed | Patient | Admission | Daily |
| 🏬 Commercial | Plazas, malls | Shop | Merchant | Contract | Monthly |
| 🏢 Co-working | Shared offices | Desk | Member | Membership | Monthly |
| 🏭 Warehouse | Storage facilities | Bay | Client | Storage Contract | Monthly |

---

## Security & Data Protection

| Feature | Description |
|---|---|
| **Password Hashing** | All passwords are hashed using bcrypt with 12 rounds — impossible to reverse |
| **NID Encryption** | National ID numbers are encrypted with AES-256-CBC — the strongest standard |
| **JWT Authentication** | Every API request requires a signed JSON Web Token |
| **Row-Level Security** | Each landlord can ONLY see their own data — enforced at the database level |
| **Force Password Change** | Accounts created by admins must change their password on first login |
| **Invite Tokens** | Setup links expire after 7 days for security |
| **HTTPS** | All data transmitted over encrypted connections (in production) |

---

## Languages

BashaCare supports:
- 🇬🇧 **English**
- 🇧🇩 **বাংলা (Bengali)**

You can switch languages at any time. All buttons, labels, and messages will update instantly.

---

## Quick Reference: Complete Feature List

| # | Feature | Available To |
|---|---|---|
| 1 | Self-registration with admin approval | Landlord |
| 2 | Admin-created accounts with temp password | Admin |
| 3 | Invite-based account setup | Admin → Landlord |
| 4 | Force password change on first login | All |
| 5 | Voluntary password change | All |
| 6 | Forgot password request | All |
| 7 | Property CRUD (Create, Read, Update, Delete) | Landlord, Manager |
| 8 | Property type selection | Landlord, Manager |
| 9 | Unit CRUD | Landlord, Manager |
| 10 | Unit status tracking | Landlord, Manager |
| 11 | Occupant CRUD | Landlord, Manager |
| 12 | NID encryption | Automatic |
| 13 | Occupant portal invite (email) | Landlord, Manager |
| 14 | Occupant manual login creation | Landlord, Manager |
| 15 | Agreement CRUD | Landlord, Manager |
| 16 | Automatic unit status on agreement create | Automatic |
| 17 | Automatic unit status on agreement terminate | Automatic |
| 18 | Hotel reservation management | Landlord, Manager |
| 19 | Guest check-in flow | Landlord, Manager |
| 20 | Guest check-out with auto-invoicing | Landlord, Manager |
| 21 | Automatic monthly invoice generation | Automatic (Cron) |
| 22 | Per-stay invoice generation (Hotels) | Automatic |
| 23 | Invoice adjustments (discounts, fees) | Landlord, Manager |
| 24 | Late fee automation (৳500) | Automatic (Cron) |
| 25 | Late fee waiver | Landlord |
| 26 | Payment reminder notifications (3 days before) | Automatic (Cron) |
| 27 | Cash payment recording | Landlord, Manager |
| 28 | TrxID payment submission | Tenant |
| 29 | Payment verification (approve/reject) | Landlord, Manager |
| 30 | Payment allocation (Late → Utility → Rent) | Automatic |
| 31 | Utility meter reading & auto-charge | Landlord, Manager |
| 32 | Maintenance request creation | Tenant |
| 33 | Maintenance status management | Landlord, Manager |
| 34 | Maintenance cost → invoice billing | Automatic |
| 35 | Dashboard with KPIs | Landlord, Manager |
| 36 | Revenue trend chart (6 months) | Landlord, Manager |
| 37 | Payment methods breakdown chart | Landlord, Manager |
| 38 | Collection report (detailed table) | Landlord, Manager |
| 39 | Activity log / Audit trail | Landlord, Manager |
| 40 | Activity filtering by category | Landlord, Manager |
| 41 | Real-time SSE notifications | All |
| 42 | Notification read/unread management | All |
| 43 | Company profile settings | Landlord |
| 44 | Payment receiving method configuration | Landlord |
| 45 | Tenant portal dashboard | Tenant |
| 46 | Tenant invoice viewing | Tenant |
| 47 | Tenant payment submission | Tenant |
| 48 | Tenant maintenance requests | Tenant |
| 49 | Admin platform overview stats | Admin |
| 50 | Admin landlord management | Admin |
| 51 | Admin user directory | Admin |
| 52 | Admin approve/suspend landlords | Admin |
| 53 | Admin activate/deactivate users | Admin |
| 54 | Bilingual support (English/Bengali) | All |
| 55 | Dark mode UI | All |
| 56 | Multi-vertical property types | All |

---

> **Last updated:** July 25, 2026
> **Version:** 2.0 (Multi-Vertical Architecture)
