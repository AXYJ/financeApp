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

- `/` (`page.tsx`) — home, styled after a Figma mockup (Persona 3 Reload look). Current month as a 2-slide carousel (expense/income): each slide has a `PieChart` (pure CSS `conic-gradient`, no charting library — clicking a slice computes the click angle relative to the circle's center to pick a category, see `handleClick`) and a `P3RList` (`src/composants/home/`) showing the selected category's transactions, 3 rows at a time.
  - Layout is a fixed, non-scrolling "stage" sized in `u()` units (`--u` = stage width / 393, the Figma frame width) with vertical positions in `%`; use `u(n)` from `src/composants/home/u.ts` instead of px so it scales on any phone.
  - A single pointer-gesture controller on the slides area (`handlePointerDown/Move/End` in `page.tsx`) picks the axis: horizontal drag swipes between slides (follows the finger, snaps at 25% or on flick), vertical drag/wheel on the list moves the P3R cursor one row per step (the top row is the "active" white one). Lists don't wrap; changing slide or category resets the cursor.
  - Fonts (FOT-Rodin / FOT-NewRodin, commercial) are `@font-face`d in `globals.css` from `src/fonts/`; Figma palette tokens (`dark-blue`, `turquoise`, `p3r-gray`, `p3r-red`) live in its `@theme`. Background/row/button images are Figma exports in `public/home/`.
  - Only the home page layout has this theme so far; `PieChart`, `Header` and the other pages are still the original style.
- `/Categories` — rename categories inline; writes straight to `db.categories.update(...)`.
- `/History`, `/Setting` — route folders exist but are still empty stubs.

`Header` (`src/composants/header/Header.tsx`) is a fixed bottom nav shared across pages. It derives the active tab from `usePathname()` (`next/navigation`), not a prop — don't reintroduce a `page` prop for this.

### Conventions worth knowing before editing

- Everything is client-side: `'use client'` on every page/component that touches state or Dexie.
- No app-level state manager (Redux/Zustand/Context) — the add/rename flows write directly to Dexie and rely on `useLiveQuery` to propagate the change to every screen reading that data.
- `Category.color` is a plain CSS color keyword string (`"green"`, `"blue"`, ...) used directly in inline `style`; there's no color picker or validation.
- The recurring-transaction feature (`Recursing` type in `type.ts`, the "Répéter tous les mois" checkbox on the add-transaction form) is scaffolded but not implemented — the checkbox currently has no effect.
