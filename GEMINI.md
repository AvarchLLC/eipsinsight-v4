# EIPsInsight Project Guide

Welcome to the **EIPsInsight** codebase. This project is a comprehensive observability, context, and coordination platform for Ethereum standards (EIPs, ERCs, RIPs).

## 🚀 Quick Start

- **Install Dependencies:** `bun install`
- **Start Development:** `bun run dev`
- **Build for Production:** `bun run build`
- **Database Setup:** 
  - `npx prisma generate` (Generate client)
  - `npx prisma migrate dev` (Development migrations)
  - `npx prisma db seed` (Seed initial data)

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand
- **Backend/API:** oRPC (Procedures-based API)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Better Auth (GitHub & Google OAuth)
- **Styling:** Tailwind CSS 4, Framer Motion, Motion
- **Visualizations:** Three.js (React Three Fiber), Recharts, Visx, Echarts
- **Payments:** Stripe Integration
- **Package Manager:** Bun

## 📂 Project Structure

- `src/app/`: Next.js App Router pages and layouts. Organized by feature (e.g., `analytics`, `standards`, `upgrade`).
- `src/components/`: Reusable UI components. `src/components/ui/` contains low-level shadcn-like primitives.
- `src/lib/`: Core utilities, including auth configuration (`auth.ts`), persona logic (`persona.ts`), and API clients.
- `src/server/orpc/`: Backend procedures and middleware. Use `protectedProcedure` for authenticated actions.
- `src/hooks/`: Custom React hooks (e.g., `usePersonaSync`, `useSession`).
- `prisma/`: Database schema and migrations.
- `docs/`: Extensive project documentation including architecture, personas, and tasks.

## 🎭 Persona System

The application uses a **Persona System** to tailor the UX based on the user's role (e.g., Developer, Editor, Researcher).
- Personas affect navigation order, default landing pages, and highlighted content.
- Configuration is located in `src/lib/persona.ts`.
- The `usePersonaSync` hook manages persona state across the application.

## 🔐 Development Conventions

- **Environment Variables:** Managed via `src/env.ts` using `@t3-oss/env-core`. Always add new variables there.
- **API Procedures:** Define backend logic in `src/server/orpc/procedures/`. Ensure proper auth middleware is used.
- **Type Safety:** Leverage Prisma-generated types and Zod schemas for end-to-end type safety.
- **Styling:** Use Tailwind CSS 4 utility classes. Prefer CSS variables for persona-based accent colors (e.g., `var(--persona-accent)`).
- **Icons:** Use `lucide-react` or `@tabler/icons-react`.

## 📝 Documentation Pointers

- **Architecture Details:** See `docs/architecture.md`.
- **Active Tasks:** Check `docs/TASKS.md` for the current roadmap and pending items.
- **API Reference:** See `docs/API.md`.
- **Persona Context:** See `docs/personas.md` and `docs/persona-preferences-context.md`.

---

*Note: This file is intended for AI agents and developers to quickly understand the project landscape. For detailed feature documentation, refer to the `docs/` directory.*
