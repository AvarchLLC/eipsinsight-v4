# Persona Preferences & Accent Context

This doc explains the persona preference system: what it is, what data we store, and why.

---

## What It Is

EIPsInsight uses a **persona preference** to adapt the user experience:

- navigation ordering
- default landing route
- page-level defaults (where supported)
- global accent theme (color tokens)

Persona is a UX preference, not content authorization. It does not gate data access.

---

## How Accent Swapping Works

1. User selects a persona (e.g. `developer`, `editor`, `researcher`).
2. Client state updates in Zustand (`usePersonaStore`).
3. `PersonaProvider` sets `data-persona="<persona>"` on the root HTML element.
4. `globals.css` maps that persona to `--persona-*` CSS variables.
5. Theme tokens (`--primary`, `--accent`, `--ring`, `--sidebar-*`) read from those variables.
6. Components using `text-primary`, `border-primary/*`, `bg-primary/*`, `persona-gradient`, `persona-title` automatically update.

No separate “accent color” value is persisted; accent is derived from persona.

---

## Data We Store

### Client (localStorage)

Storage key: `eipsinsight-persona`

Stored fields (persisted subset from Zustand):

- `persona`: selected persona ID or `null`
- `defaultView`: optional per-page view defaults
  - `upgradesView`
  - `analyticsView`
  - `standardsView`
- `isOnboarded`: whether persona onboarding/selection is completed

Not persisted:

- transient hydration/sync flags (`isHydrated`, `hasSyncedFromServer`)
- any computed theme/accent values

### Server (authenticated users)

Table: `user_preferences` (Prisma model `user_preferences`)

- `user_id` (PK)
- `persona` (nullable string)
- `default_view` (JSON, nullable)
- timestamps (`created_at`, `updated_at`)

Synced through ORPC `preferences` procedures:

- `get`
- `update`
- `setPersona`
- `reset`

---

## Why We Store It

- **Continuity**: keeps the same UX mode between sessions.
- **Personalization**: preserves preferred navigation and defaults.
- **Cross-device consistency** (when authenticated): server sync restores preferences on new devices.
- **Low-risk footprint**: stores only lightweight UI preferences, not sensitive personal data.

---

## Data Minimization Notes

- Persona preference is intentionally coarse and optional.
- Accent/theme state is computed from persona at render time, not stored as extra persisted data.
- If no persona is selected, the app uses default/fallback behavior until selection.

