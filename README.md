# CRM-project (LOOP CRM Dashboard)

CRM-project is a single-page web application (SPA) — a multi-tenant CRM dashboard built with React and Vite. It supports lead and deal management, activities, real estate (properties and owners), services and products, integrations (Meta, WhatsApp, TikTok, Twilio), subscriptions and payments, and comprehensive settings. The interface supports Arabic and English and offers light/dark theme. It connects to a backend API (e.g. CRM-api-1).

## Key Features

*   **Authentication & Security**: Registration, login, password reset, email verification, two-factor authentication (2FA), OAuth, and Impersonate mode for support.
*   **Dashboard**: Metrics and charts (Recharts) for an overview of key data.
*   **Leads**: View all leads (All/Fresh/Cold/My/Rotated), create and edit leads, view lead details; configurable lead statuses, stages, supervisors, and call methods.
*   **Deals**: Manage and create deals.
*   **Activities & Tasks**: Activities and Todos management.
*   **Real Estate**: Properties and Owners (developers, projects, units).
*   **Services & Products**: Services, service packages, and service providers; products, product categories, and suppliers; inventory views (ServicesInventory, ProductsInventory).
*   **Users & Teams**: User/employee management; team and employee reports.
*   **Marketing & Reports**: Campaigns; team, employee, and marketing reports.
*   **Integrations**: Meta, TikTok, WhatsApp, Twilio — connect accounts and configure from the UI.
*   **Subscriptions & Payments**: Billing, ChangePlan, Payment, PaymentSuccess.
*   **Export**: Excel export via ExcelJS.
*   **Multi-tenant & Localization**: Company-scoped routes (`/{companySlug}/...`); Arabic/English and light/dark theme.

## Technology Stack & Architecture

The frontend is built with React and Vite in a modular structure.

*   **Framework**: React 19, Vite 6
*   **Language**: TypeScript 5.8
*   **State Management**: React Context (`context/AppContext.tsx`) for theme, language, current user, current page, and UI state (modals, drawers).
*   **Data & API**: TanStack React Query 5 (`hooks/useQueries.ts`); REST calls from `services/api.ts` (JWT Bearer, optional X-API-Key header).
*   **UI**: Tailwind CSS (via CDN in index.html), Recharts for charts, ExcelJS for Excel export.
*   **Routing**: Pathname-based routing via `utils/routing.ts` (no React Router); company slug and subdomain support via `VITE_BASE_DOMAIN`.

## Project Structure

The codebase uses the project root as the source (no `src/` folder).

```
CRM-project/
├── components/     # UI components (Sidebar, Header, Card, modals, drawers)
├── context/        # AppContext — global state and routing
├── hooks/          # useQueries — TanStack Query hooks
├── pages/          # App pages (Dashboard, Leads, Deals, Settings, ...)
├── pages/settings/ # Settings sub-pages (Leads, Statuses, Stages, ...)
├── services/       # api.ts — API client
├── utils/          # routing, dateUtils, colors, exportToExcel, ...
├── docs/           # DEPLOYMENT.md — VPS deployment guide
├── App.tsx         # Main component and routing logic
├── index.html      # HTML entry point
├── index.tsx       # React entry (QueryClientProvider + App)
├── types.ts        # TypeScript types
├── constants.ts    # Constants and translations (en/ar)
└── vite.config.ts # Vite config (port 3000, alias @, env)
```

## Setup and Installation

To run the project locally:

1.  **Prerequisites**: Node.js 20.x or 22.x, npm or yarn.

2.  **Clone the repository:**
    ```sh
    git clone <repository-url> crm-project
    cd crm-project
    ```

3.  **Install dependencies:**
    ```sh
    npm install
    ```

4.  **Create `.env` file:**
    Create a file named `.env` in the project root with:
    ```env
    VITE_API_URL=https://your-api.example.com/api
    VITE_API_KEY=your-api-key-if-required
    GEMINI_API_KEY=your-gemini-key-if-needed
    VITE_BASE_DOMAIN=dashboard.loop-crm.app
    ```
    *   `VITE_API_URL` (required): Backend API base URL.
    *   `VITE_API_KEY` (optional): API key for `X-API-Key` header.
    *   `GEMINI_API_KEY` (optional): Used at build time if Gemini features are enabled.
    *   `VITE_BASE_DOMAIN` (optional): For subdomain-based multi-tenant routing.

5.  **Run the application:**
    ```sh
    npm run dev
    ```
    The app will be available at `http://localhost:3000` (or the port shown in the terminal).

6.  **Build for production:**
    ```sh
    npm run build
    npm run preview
    ```

## Deployment

For deploying to a VPS (Nginx, SSL, PM2, production env), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Backend API

This frontend is designed to work with the CRM backend API (e.g. CRM-api-1). Ensure `VITE_API_URL` points to your running API instance. For API documentation and setup, refer to the backend repository (e.g. CRM-api-1 README and `/api/docs/` Swagger/ReDoc).
