# EIPsInsight — Documentation

> **Observe, Understand, Coordinate Ethereum Standards**

---

## Quick Links

| Doc | Description |
|-----|-------------|
| [Site Map](./sitemap.md) | Information architecture, navigation tree |
| [Personas](./personas.md) | Persona alignment, wireframes, default landing pages |
| [Persona Preferences Context](./persona-preferences-context.md) | What persona/accent personalization is, what preference data is stored, and why |
| [Architecture](./architecture.md) | Routing, URLs, implementation status |
| [Branding](./branding.md) | Tone, design cues, naming |
| [UI Reference](./ui-reference.md) | Colors, fonts, spacing, component patterns |
| [News + Ghost](./news-ghost-integration.md) | How to power News from Ghost CMS |
| [Tasks](./TASKS.md) | Remaining work, estimates |

---

## Overview

EIPsInsight provides **observability + context + coordination** for Ethereum standards (EIPs, ERCs, RIPs). It is persona-aware: navigation order, defaults, and highlights adapt to whether you're a developer, editor, researcher, builder, enterprise, or newcomer.

**Core principle:** Canonical URLs live at feature paths (e.g. `/upgrade/fusaka`). Persona URLs (`/p/developer`, etc.) are opinionated entry points that redirect to canonical views with preconfigured defaults.
