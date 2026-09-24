# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (`eslint-config-next` core-web-vitals + TypeScript rules)
- `npm run format` — Prettier, with `prettier-plugin-tailwindcss` sorting Tailwind class names

There is no test suite in this repo yet.

## Architecture

Personal finance tracker (Next.js App Router + TypeScript + Tailwind v4). Built as a PWA for solo/mobile use — no backend, no auth; all data lives in the browser via IndexedDB.

### Data layer (`src/lib/db.ts`, `src/type/type.ts`)

- `src/type/type.ts` defines the domain types (`Category`, `Transaction`) and the _default_ category data (`ExpenseCategory`/`IncomeCategory` arrays). These arrays are only used to **seed** IndexedDB on first launch — the UI never reads them directly.
- `src/lib/db.ts` wraps IndexedDB with Dexie: `FinanceDB extends Dexie` exposes two tables, `categories` (`++id, name, type`) and `transactions` (`++id, type, categoryId, date`). `seedCategories()` runs once at module load and populates `categories` from `type.ts`'s arrays only if the table is empty (guarded by `.count()`).
- `Category.type` and `Transaction.type` are both `'expense' | 'income'` — this is how the app splits expense vs. income everywhere (breakdowns, transaction lists, category pickers), not separate tables or files.
- `Transaction.categoryId` references `Category.id` by number.
- `db.ts` exports `useCategories(type)`, the shared hook every page uses to read categories reactively (wraps `dexie-react-hooks`'s `useLiveQuery`).
- Any read that must update live when data changes goes through `useLiveQuery`, not React state — this is the pattern for both transactions and categories throughout the app. It returns `undefined` during the first async read; the convention here is `useLiveQuery(...) ?? []`.

### Pages (`src/app/`)

App Router, folder-per-route:

- `/` (`page.tsx`) — home: current month as a 2-slide carousel (expense/income). Each slide has a `PieChart` (pure CSS `conic-gradient`, no charting library — clicking a slice computes the click angle relative to the circle's center to pick a category, see `handleClick`) and a `TransactionList` filtered to whichever category is currently selected.
- `/Categories` — rename categories inline; writes straight to `db.categories.update(...)`.
- `/History`, `/Setting` — route folders exist but are still empty stubs.

`Header` (`src/composants/header/Header.tsx`) is a fixed bottom nav shared across pages. It derives the active tab from `usePathname()` (`next/navigation`), not a prop — don't reintroduce a `page` prop for this.

### Conventions worth knowing before editing

- Everything is client-side: `'use client'` on every page/component that touches state or Dexie.
- No app-level state manager (Redux/Zustand/Context) — the add/rename flows write directly to Dexie and rely on `useLiveQuery` to propagate the change to every screen reading that data.
- `Category.color` is a plain CSS color keyword string (`"green"`, `"blue"`, ...) used directly in inline `style`; there's no color picker or validation.
- The recurring-transaction feature (`Recursing` type in `type.ts`, the "Répéter tous les mois" checkbox on the add-transaction form) is scaffolded but not implemented — the checkbox currently has no effect.
