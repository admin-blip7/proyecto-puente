# Project Context

## Purpose
**Storefront Swift** is a comprehensive Point of Sale (POS) and business management system for retail operations. It provides end-to-end functionality for inventory management, sales processing, financial tracking, customer relationship management (CRM), repair services, and AI-powered business insights. The system is designed to handle complex retail scenarios including consignment inventory, multi-account financial management, credit sales, and warranty tracking.

## Tech Stack

### Core Framework
- **Next.js 15.3.3** with React 18.3.1 (App Router)
- **TypeScript 5** with strict mode enabled
- **Turbopack** for development builds
- **Node.js >=18.0.0**

### UI & Styling
- **Tailwind CSS 3.4.1** with custom design system
- **Radix UI** components (comprehensive component library)
- **shadcn/ui** component system
- **Lucide React** icons
- Custom CSS variables for theming with dark mode support

### Backend & Database
- **Supabase** (PostgreSQL) as primary database
- **@supabase/supabase-js 2.45.0** for database operations
- **PostgreSQL direct connections** via `pg` library
- Row Level Security (RLS) implemented

### Authentication & Authorization
- Supabase Auth for user management
- Role-based access control (Admin/Cajero)
- Session persistence with auto-refresh

### AI Integration
- **Google Genkit 1.14.1** with Google AI plugin
- **Gemini 2.5 Flash** model for AI features
- Custom AI flows for demand forecasting, product analysis, and debt strategies

### Additional Libraries
- **React Hook Form 7.54.2** with Zod validation
- **Recharts** for data visualization
- **jsPDF** for document generation
- **JsBarcode** for barcode generation
- **Date-fns** and **Moment.js** for date handling
- **XLSX** for Excel export functionality

## Project Conventions

### Code Style
- **TypeScript First**: All code uses strict TypeScript with comprehensive type definitions
- **Functional Components**: Only functional components with hooks (no class components)
- **Server Actions**: Database operations use `'use server'` directive
- **Zod Validation**: Runtime validation for all forms and API inputs
- **ESLint + Prettier**: Consistent code formatting (configured in project)

### Naming Conventions
- **Files**: kebab-case for all files (e.g., `sales-service.ts`)
- **Components**: PascalCase for components (e.g., `SalesReport.tsx`)
- **Variables**: camelCase for variables and functions
- **Constants**: UPPER_SNAKE_CASE for constants
- **Types**: PascalCase with descriptive prefixes (e.g., `SalesOrderType`)

### Architecture Patterns
1. **Service Layer Pattern**: Business logic encapsulated in `/lib/services/`
2. **Server Components**: Data fetching using Next.js Server Components
3. **Client Components**: Interactive UI with `'use client'` directive
4. **Custom Hooks**: Complex state logic extracted to reusable hooks
5. **Component Composition**: Reizable UI components with consistent props
6. **Error Boundaries**: Structured error handling with logging

### File Organization
```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard routes
│   └── (pos)/             # Main POS interface routes
├── components/
│   ├── admin/             # Admin-specific components
│   ├── pos/               # Point of Sale components
│   ├── shared/            # Shared UI components
│   └── ui/                # Base UI components (shadcn/ui)
├── lib/
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
├── ai/
│   └── flows/             # AI-powered workflows
└── types/                 # TypeScript type definitions
```

### Testing Strategy
- Currently implementing test coverage
- Focus on service layer unit tests
- Component integration tests for UI
- Database transaction testing
- AI flow validation

### Git Workflow
- **Main Branch**: `main` for production-ready code
- **Feature Branches**: Descriptive names (e.g., `feat/crm-module`)
- **Commit Format**:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `refactor:` for code improvements
  - `chore:` for maintenance tasks
- **PR Reviews**: Required for all changes

## Domain Context

### Business Model
- Multi-location retail with consignment inventory
- Credit sales and financing management
- Repair and warranty services
- Supplier and consignor relationships
- Cash and electronic payment processing

### Key Entities
- **Products**: Inventory with variants, attributes, and tracking
- **Clients**: Customer management with credit accounts
- **Suppliers**: Purchase orders and consignment tracking
- **Sales Orders**: Transaction processing with multiple payments
- **Repairs**: Service orders with parts and labor tracking
- **Financial Accounts**: Multi-account money movement tracking

### Business Rules
- Low stock alerts trigger reorder suggestions
- Credit limits enforced per client
- Commission calculations for consignors
- Warranty period validation for claims
- Cash drawer must be opened for sales

## Important Constraints

### Technical Constraints
- Supabase row limit considerations (1,000 rows per request)
- Real-time subscription management
- Barcode scanner compatibility across devices
- Thermal printer integration for receipts

### Business Constraints
- Financial audit trail requirements
- Tax calculation compliance
- Inventory valuation methods
- Credit risk assessment rules

### Performance Constraints
- POS operations must complete < 2 seconds
- Real-time updates for concurrent users
- Large data export capabilities (10,000+ records)
- Mobile responsiveness for tablets

## External Dependencies

### Supabase Services
- **Database**: Primary data store with PostgreSQL
- **Auth**: User authentication and authorization
- **Storage**: File uploads for documents and images
- **Realtime**: Live updates for concurrent operations

### Google AI Services
- **Gemini 2.5 Flash**: AI model for business intelligence
- Custom flows for demand forecasting and analysis

### Hardware Integration
- **Thermal Printers**: Receipt and label printing
- **Barcode Scanners**: Inventory and sales processing
- **Cash Drawers**: POS cash management

### API Integrations
- Backup printer endpoints
- Document generation services
- External reporting systems (future)

## Environment Requirements

### Development
- Node.js 18+
- Supabase CLI for local development
- Environment variables for all services

### Production
- **Netlify** deployment platform
- Supabase hosting
- Environment-specific configurations
- SSL certificates required
