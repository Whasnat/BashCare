# 🏢 BashaCare Comprehensive User Guide

Welcome to BashaCare, the ultimate multi-vertical Property Management SaaS platform designed for Bangladesh. BashaCare seamlessly manages residential apartments, commercial plazas, hotels, hospitals, co-working spaces, and warehouses.

This guide provides an exhaustive overview of the platform's features, divided by User Role.

---

## 1. Platform Overview & Terminology

BashaCare automatically adapts its terminology based on the type of property you are managing:

| Property Type | Unit Term | Occupant Term | Agreement Term | Billing Model |
|---------------|-----------|---------------|----------------|---------------|
| **Residential** | Unit | Tenant | Lease | Monthly |
| **Hotel** | Room | Guest | Reservation | Per Stay |
| **Hospital** | Bed | Patient | Admission | Daily |
| **Commercial** | Shop | Merchant | Contract | Monthly |
| **Co-working** | Desk | Member | Membership | Monthly |
| **Warehouse** | Bay | Client | Storage Contract | Monthly |

---

## 2. Global Settings & Accessibility

- **Dark/Light Mode**: Toggle the theme using the moon/sun icon in the navigation bar.
- **Bilingual Support**: Switch seamlessly between English 🇬🇧 and Bengali 🇧🇩.
- **Responsive Design**: Fully functional on mobile, tablet, and desktop screens.
- **Notifications**: Click the bell icon to view real-time Server-Sent Events (SSE). Mark them as read instantly.

---

## 3. The Landlord & Manager Experience

*Managers have the same access as Landlords, EXCEPT they cannot modify Company Settings or Payment Receiving Methods.*

### 3.1 Authentication & Onboarding
- **Interactive Tour**: Upon first login, an enforced, step-by-step wizard guides you to create your first Property, Unit, Occupant, and Agreement.
- **Security**: You can change your password anytime. If your account was created by an admin, you *must* change your password on your first login.

### 3.2 Property & Unit Management
- **Add Properties**: Create a property and assign it a type (e.g., Residential, Hotel). You can manually enter a unique **Property Code** (e.g., `GULSHAN-1`) or use the auto-generated one. *You must share this code with tenants so they can log in.*
- **Manage Units**: Add units to your properties (e.g., Apt 4B, Room 101).
- **Unit Status**: Units dynamically update their status (Vacant, Occupied, Maintenance, Reserved, Checked-In, Housekeeping). 

### 3.3 Occupants (Tenants, Guests, Patients)
- **Profile Creation**: Add occupants with their Name, Email, Phone, National ID, and Emergency Contact.
- **NID Security**: National IDs are encrypted at rest with AES-256-CBC encryption.
- **Portal Invites**: Send an email invite to an occupant. They will receive a 7-day secure link to set up their Tenant Portal account. Alternatively, create their login manually.

### 3.4 Agreements (Leases & Contracts)
- **Create Agreement**: Link an Occupant to a Unit. Define lease start/end dates, base rent, security deposit, and custom utility tariffs (e.g., Electricity rate per unit).
- **Automation**: Creating an agreement automatically marks the unit as OCCUPIED. Terminating it marks the unit as VACANT.
- **Single Active Lease**: The system strictly enforces that a single unit can only have ONE active agreement at a time.

### 3.5 Hotel Reservation Management *(Hotel Verticals Only)*
- **Check-In/Out**: Create a booking, transition the room to `CHECKED_IN`, and click Check-Out when they leave.
- **Auto-Billing**: Checking out automatically transitions the room to `HOUSEKEEPING` and generates a Per-Stay Invoice: `(Days Stayed) × (Daily Rate)`.

### 3.6 Utilities & Meter Readings
- **Log Readings**: Enter the current meter reading for Electricity, Gas, or Water.
- **Automated Calculation**: The system automatically finds the previous month's reading, calculates the consumed units, applies the agreement's tariff, and adds the total charge to the tenant's current unpaid invoice.

### 3.7 Invoicing & Billing
- **Auto-Generation**: On the 1st of every month at midnight, the system automatically generates invoices for all active agreements.
- **Adjustments**: Manually add line items such as `REPAIR_FEE`, `DISCOUNT`, or `LATE_FEE`.
- **Late Fees (Automated)**: Every midnight, the system scans for overdue invoices and automatically applies a ৳500 flat late fee.
- **Reminders**: Tenants receive automated warnings 3 days before the due date.

### 3.8 Payment Verification
- **Tenant Submissions**: When a tenant pays via bKash, Nagad, Rocket, or Bank Transfer, they submit a Transaction ID. The invoice status changes to `PENDING_VERIFICATION`.
- **Verification**: Review the TrxID. Click **Approve** (reduces the balance) or **Reject** (reverts status and notifies tenant).
- **Cash Payments**: Instantly record manual cash payments without requiring tenant submission.

### 3.9 Maintenance & Ticketing
- **Tracking**: View tickets submitted by tenants. Track them through `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
- **Cost Assignment**: Add repair costs to a ticket. This cost is automatically billed to the tenant's next invoice as a `REPAIR_FEE`.

### 3.10 Reports & Activity Logs
- **Dashboard**: View Occupancy Rate, Outstanding Amount, and Revenue Trends (6-month charts).
- **Audit Trail**: The Activity Log records every single CRUD operation (Who did What, When, and Details).

### 3.11 Company Settings
- **Receiving Methods**: Update your bKash, Nagad, Rocket, and Bank Account details. These are dynamically displayed to your tenants when they pay their rent.

---

## 4. The Tenant Experience

*The Tenant Portal is heavily focused on transparency, billing, and support.*

### 4.1 Access & Dashboard
- **Login**: You must have your email, password, and the **Property Code** provided by your landlord.
- **Overview**: Instantly view your current active lease, overall balance, and the landlord's payment numbers.

### 4.2 Invoices & Payments
- **Detailed Breakdown**: Click into an invoice to see exactly how much you are being charged for Base Rent, Utilities (with meter readings), Late Fees, and Adjustments.
- **Make a Payment**:
  1. Open an unpaid invoice.
  2. Note the landlord's bKash/Nagad/Bank number displayed on the screen.
  3. Send the money from your personal app.
  4. Enter the Amount, Payment Method, and **Transaction ID** into the BashaCare portal.
- **Notifications**: You will receive an instant notification when your landlord Approves or Rejects your payment.

### 4.3 Maintenance Requests
- **Submit Tickets**: Create a support ticket for Plumbing, Electrical, Structural, Appliance, or Pest Control issues.
- **Priority**: Mark issues as Low, Medium, High, or Urgent.
- **Tracking**: Watch the status update in real-time as your landlord resolves the issue.

---

## 5. The Admin Experience

*The Admin panel is completely isolated from Landlord data and focuses on SaaS oversight.*

### 5.1 Platform Analytics
- **Global Metrics**: Monitor total registered landlords, active properties, total units, and system-wide revenue flowing through the platform over a 6-month period.

### 5.2 Landlord & User Management
- **Approvals**: Review self-registered landlord accounts and Approve or Suspend them.
- **Direct Creation**: Create landlord accounts directly with temporary passwords (pre-approved).
- **Setup Links**: Generate secure 7-day setup links and email them to prospective landlords.
- **User Directory**: View every user in the system (Admins, Landlords, Tenants) and instantly activate/deactivate accounts to enforce security policies.

---

> [!TIP]
> **Need Technical Support?** BashaCare's architecture utilizes strict Row-Level Security (RLS) to guarantee that Landlord data is mathematically isolated at the database level. Your data is secure, encrypted, and completely private.
