# Project Knowledge

## Overview
Next.js application with Supabase backend, previously migrated from Firebase. The app includes POS (Point of Sale), inventory management, financial tracking, repairs, warranties, and credit management features.

## Tech Stack
- **Framework**: Next.js 15.3.3 with Turbopack
- **Backend**: Supabase
- **AI**: Genkit with Google AI
- **UI**: Radix UI components with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Database**: Previously Firebase, now Supabase

## Development Workflow

### Running the App
- Dev server: `npm run dev` (port 9002)
- Genkit dev: `npm run genkit:dev` or `npm run genkit:watch`
- Type checking: `npm run typecheck`

### Code Style
- Use TypeScript for all new code
- Follow existing patterns for services in `src/lib/services/`
- UI components use shadcn/ui patterns
- Keep logging statements clean (avoid "Firestore" references since we migrated to Supabase)

## Key Directories

### `/src/app`
- Next.js app router pages
- `/admin` - Admin features (inventory, sales, repairs, finance, etc.)
- `/api` - API routes

### `/src/components`
- `/ui` - Reusable UI components (shadcn/ui)
- `/admin` - Admin-specific components
- `/pos` - Point of Sale components
- `/auth` - Authentication components

### `/src/lib`
- `/services` - Business logic and Supabase interactions
- `/printing` - Label and ticket printing functionality
- `/validation` - Zod schemas and validation

## Common Tasks

### Adding a New Feature
1. Create service in `src/lib/services/` if needed
2. Add types to `src/types/index.ts`
3. Create UI components in appropriate directory
4. Add page in `src/app/`

### Database Operations
- Use Supabase client from `src/lib/supabaseClient.ts`
- Server-side: use `src/lib/supabaseServerClient.ts`

## Migration Notes
- Project was migrated from Firebase to Supabase
- Migration tools in `firebase-to-supabase/` directory
- Avoid "Firestore" references in logs and comments

## Important Patterns

### React Hooks
- Avoid infinite loops by carefully managing dependency arrays
- Use `useCallback` and `useMemo` appropriately
- Check for null/undefined before accessing Supabase client

### Error Handling
- Use custom logger from `src/lib/logger.ts`
- Provide user-friendly error messages via toast notifications

## AI Features
- Genkit flows in `src/ai/flows/`
- Image generation and optimization
- Sales summaries and demand forecasting
- Product quality analysis
