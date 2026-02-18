# EIPsInsight

Observability + context + coordination for Ethereum standards. Explore EIPs, ERCs, RIPs, analytics, network upgrades, and governance insights.

## Features

- **Explore** — Browse proposals by year, status, category, and role (Editors, Reviewers, Contributors)
- **Search** — EIPs, PRs, issues, authors
- **Analytics** — EIPs, PRs, Editors, Reviewers, Authors, Contributors
- **Insights** — Year-month analysis, governance, upgrade insights, editorial commentary
- **Tools** — EIP Builder, Board, Dependencies, Timeline
- **Resources** — FAQ, Blogs, Videos, News, Documentation
- **Network Upgrades** — Pectra, Fusaka, Glamsterdam, Hegotá

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_URL` — App URL (e.g. `http://localhost:3000`)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth
- `CLOUDINARY_URL` — Image uploads (blogs)
- Other vars as required

## Database

```bash
npx prisma generate
npx prisma migrate deploy   # or: npx prisma db execute --file <migration.sql>
```

## Docs

- [Site Map & Personas](docs/README.md)
- [Remaining Tasks](docs/TASKS.md)

## Deploy

Vercel, Railway, or any Node.js host. Ensure `DATABASE_URL` and auth env vars are set.
