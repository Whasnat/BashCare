# 🏢 BashaCare

BashaCare is a comprehensive full-stack property management application built to simplify the rental experience for landlords, property managers, and tenants. It provides tools for tracking properties, units, leases, invoicing, utility meter readings, and payments.

## ✨ Features

### For Landlords & Property Managers
- **Property & Unit Management**: Add properties and manage individual units. Track occupancy status (Vacant, Occupied, Maintenance).
- **Tenant Management**: Securely register tenant profiles, including national ID and emergency contact details.
- **Lease Administration**: Create and manage active leases. Specify base rent, security deposits, and utility tariffs.
- **Invoicing & Billing**: Generate monthly invoices automatically. Add custom adjustments (discounts, surcharges, repair fees).
- **Payment Processing**: Approve or reject tenant payments submitted via Mobile Financial Services (bKash, Nagad, Rocket) or Bank Transfer. Record manual cash payments.
- **Utility Tracking**: Log monthly meter readings for Electricity, Gas, and Water, seamlessly integrated into tenant invoices.
- **Reporting & Dashboard**: View real-time analytics, revenue collections, overdue balances, and occupancy rates.

### For Tenants
- **Tenant Portal**: Dedicated dashboard to view active leases and upcoming dues.
- **Invoice Management**: View detailed breakdown of monthly bills, including rent, utilities, and adjustments.
- **Seamless Payments**: Easily submit payment information via MFS (bKash, Nagad, Rocket) or Bank Transfer by inputting the Transaction ID directly into the portal.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, React Router, Tailwind-inspired custom CSS framework, Lucide React (Icons), React Hot Toast.
- **Backend**: Node.js, Fastify, PostgreSQL (pg).
- **Security**: JWT-based authentication, Role-Based Access Control (RBAC), password hashing via bcrypt.
- **Database Architecture**: PostgreSQL with robust schemas, constraints, and custom SQL migration scripts for easy setup.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Whasnat/BashCare.git
   cd BashCare
   ```

2. **Database Setup:**
   - Ensure PostgreSQL is running.
   - Create a database for BashaCare (e.g., `bashacare_db`).
   - Copy `.env.example` to `.env` in the `backend` folder and update your database credentials.
   - Run the initialization scripts to migrate and seed the database.

3. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Default Credentials (for testing if seeded)
- **Admin/Landlord**: `admin@bashacare.com` / `admin123`
- *Note: You can register new landlord and tenant accounts via the application.*

## 🔒 Security & Architecture
- Landlord settings and personal numbers (bKash, Nagad, Rocket, Bank) are securely managed and displayed dynamically to tenants.
- Dirty-state management ensures users do not accidentally lose unsaved changes in modals.

## 📄 License
This project is proprietary and confidential.
