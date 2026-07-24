# 🐾 PawMart — Full-Stack Pet Marketplace & Service Platform

![PawMart Header](https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1200)

**PawMart** is a full-stack, enterprise-grade pet marketplace and service-booking ecosystem designed to seamlessly connect pet buyers, sellers, service providers (veterinarians, groomers, trainers), and administrators within a unified platform. 

The application features a modern responsive UI, server-side Razorpay test mode payment verification, automated escrow and wallet release systems, session-based appointment scheduling, multi-role access control, and complete platform moderation tools.

---

## 🌟 Key Features & Role Capabilities

### 🛒 1. Buyer Module
- **Product Marketplace**: Browse, filter, and search pet food, toys, grooming supplies, and accessories.
- **Cart & Wishlist**: Persistent shopping cart and wishlist synchronization for registered buyers.
- **Direct Razorpay Checkout**: Frictionless one-step payment collection supporting UPI, Credit/Debit Cards, Net Banking, and Wallets via Razorpay Test Mode.
- **Order Tracking & History**: Track order lifecycle (`PENDING` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`).
- **Pet Service Booking**: Discover nearby veterinary clinics, pet grooming, and training centers.
- **Session-Based Appointments**: Select morning or afternoon time slots with real-time session capacity tracking and IST timezone-safe session expiration validation.
- **Pet Adoption Center**: Submit formal adoption applications for pets in need of homes.
- **Dispute Resolution**: Raise dispute claims for product orders or service appointments with dedicated provider response workflows.

### 🏪 2. Seller Hub
- **Product Management**: List, update, and manage product inventory, categories, pricing, stock levels, and media.
- **Order Fulfillment**: Review incoming orders, update shipping status, and view customer shipping details.
- **Automated Seller Wallet**: Real-time balance tracking divided into Available Balance, Pending Escrow, and Lifetime Earnings.
- **Payout System**: Automated withdrawal request submission directly to seller bank accounts (`PENDING` ➔ `PROCESSING` ➔ `PAID`).
- **Store Profile & Analytics**: Customize seller store details and monitor revenue performance metrics.

### 🩺 3. Service Provider Hub
- **Clinic & Profile Management**: Configure clinic details, professional qualifications, addresses, and media.
- **Service Configuration**: Offer custom veterinary, grooming, training, or boarding services with tailored pricing.
- **Session Capacity & Expiry Controls**: Define morning and afternoon session operating hours and maximum booking capacities per slot.
- **Appointment Management**: Confirm, fulfill, or manage buyer appointment requests with automated notification triggers.
- **Automated Provider Wallet**: Automated escrow releasing after service completion or 72-hour confirmation window.

### 🛡️ 4. Admin Management Panel
- **Executive Analytics Dashboard**: Platform-wide metrics including Gross Merchandise Value (GMV), active user counts, total revenue, commission earned, and pending disputes.
- **Verification & Moderation**: Approve or reject new seller and service provider applications.
- **User & Content Supervision**: Manage buyers, sellers, providers, products, and service listings.
- **Escrow & Dispute Governance**: Review open buyer disputes, hold/release funds, or issue server-side Razorpay refunds.
- **Payout Operations & Monitoring**: Track automated payout flows and manually inspect flagged or held payouts (`ON_HOLD` / `ADMIN_REVIEW`).
- **Platform Coefficients**: Configure system-wide commission rates (default 10%), listing fees, escrow auto-release periods, and minimum withdrawal thresholds.
- **Audit Logs**: Immutable log tracking for administrative system actions.

---

## 💳 Payment & Financial Architecture

PawMart implements a multi-layer financial workflow to ensure security, transparency, and automated seller/provider payouts:

```
[ Buyer ] ──(Razorpay Checkout)──> [ Razorpay Gateway ]
                                         │
                                   (Webhooks / Verification)
                                         │
                                         ▼
                                 [ PawMart API ]
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
            [ Order Created ]                      [ Service Escrow ]
                     │                                       │
            (Shipping & Delivery)                   (Appointment Completed)
                     │                                       │
                     └───────────────────┬───────────────────┘
                                         │
                                (10% Commission + Net Balance)
                                         │
                                         ▼
                             [ Seller / Provider Wallet ]
                                         │
                             (Auto-Payout Processing)
                                         │
                                         ▼
                            [ Bank Account Settlement ]
```

- **Server-Side Verification**: Payment signatures (`razorpay_signature`) are verified using HMAC-SHA256 crypto validation on the backend prior to finalizing orders or bookings.
- **Automated Escrow**: Funds are held in escrow and released automatically to seller/provider wallets upon order delivery or buyer/provider service completion.
- **Wallet Engine**: Deducts platform commission (10%) and records transaction ledger entries for all credits, debits, and withdrawals.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Glassmorphism & Custom Design Tokens
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) + [React Query](https://tanstack.com/query/latest)
- **UI & Icons**: [Lucide React](https://lucide.dev/), [Radix UI](https://www.radix-ui.com/), [Framer Motion](https://www.framer.com/motion/)
- **HTTP Client**: [Axios](https://axios-http.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express.js](https://expressjs.com/)
- **ORM & Database**: [Prisma ORM](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: JSON Web Tokens (JWT) + Google OAuth 2.0 (`@react-oauth/google` / `google-auth-library`)
- **Validation**: [Zod](https://zod.dev/)
- **Email Service**: [Brevo API](https://www.brevo.com/)
- **Payments**: [Razorpay Node SDK](https://razorpay.com/)

---

## 📂 Project Structure

```
PawMart/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # PostgreSQL database migrations
│   │   └── schema.prisma        # Database schema definitions
│   ├── src/
│   │   ├── config/              # Prisma, Razorpay & Google OAuth clients
│   │   ├── controllers/         # API business logic handlers
│   │   ├── middleware/          # Authentication & error handling middleware
│   │   ├── routes/              # Express API route modules
│   │   ├── services/            # Brevo email & payment services
│   │   ├── utils/               # Timezone, date & formatting utilities
│   │   └── server.js            # Express application entrypoint
│   ├── .env.example             # Backend environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI cards, modals & navbars
│   │   │   ├── provider/        # Service provider dashboard sub-views
│   │   │   ├── seller/          # Seller hub sub-views
│   │   │   └── ui/              # Buttons, inputs & glassmorphic containers
│   │   ├── layouts/             # AppLayout, FloatingNavbar & Footer
│   │   ├── pages/               # Main pages (Landing, Shop, Dashboards, Admin)
│   │   ├── redux/               # Redux slices (auth, cart, wishlist)
│   │   └── utils/               # Currency & timezone helpers
│   ├── .env.example             # Frontend environment template
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Local Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/) database running locally or hosted on Cloud (Supabase, Aiven, RDS)

### 1. Clone the Repository
```bash
git clone https://github.com/Dushyanth3034/PawMart.git
cd PawMart
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in both `backend` and `frontend` directories:

```bash
# Backend Setup
cp backend/.env.example backend/.env

# Frontend Setup
cp frontend/.env.example frontend/.env
```

Update `backend/.env` with your PostgreSQL database URL, JWT secret keys, and Razorpay Test Mode credentials.

### 3. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 4. Database Setup & Migration
Run Prisma migrations to construct the PostgreSQL database tables:

```bash
cd ../backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start Development Servers

**Start Backend API (Port 5000):**
```bash
cd backend
npm run dev
```

**Start Frontend Development Server (Port 5173):**
```bash
cd frontend
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 🛡️ Security & Best Practices

- **Zero Secret Exposure**: All sensitive credentials (`RAZORPAY_KEY_SECRET`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `BREVO_API_KEY`) are managed via `.env` and strictly excluded from version control via `.gitignore`.
- **HMAC Verification**: Razorpay payment verification uses cryptographic signature checking on the backend before order or appointment state transition.
- **Timezone Safety**: Appointment session availability and expiration checks utilize IST (`Asia/Kolkata`) server-side time checks to prevent expired slot bookings.
- **Access Control**: Role-Based Access Control (`BUYER`, `SELLER`, `SERVICE_PROVIDER`, `ADMIN`) enforced via JWT middleware.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
