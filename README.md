# Finances

Tracker de finances personnelles, PWA solo/mobile. Next.js (App Router) + TypeScript + Tailwind v4. Pas de backend, pas d'auth : toutes les données vivent dans IndexedDB via Dexie.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Autres commandes :

- `npm run build` — build de production
- `npm run start` — lance le build de production
- `npm run lint` — ESLint
- `npm run format` — Prettier (tri des classes Tailwind inclus)

Pas de suite de tests pour l'instant.

## Architecture

- `src/type/type.ts` — types du domaine (`Category`, `Transaction`) et données par défaut servant uniquement à seeder IndexedDB au premier lancement.
- `src/lib/db.ts` — wrapper Dexie (`FinanceDB`), tables `categories` et `transactions`, hook `useCategories`, et les helpers de transactions récurrentes (`addRecurringSeries`, `generateDueTransactions`, etc.).
- `src/app/` — pages (App Router) : `/` (accueil, carousel dépenses/revenus), `/Categories`, `/History`, `/Setting`.
- `src/composants/` — composants partagés (`Header`, composants de la page d'accueil).

Voir [CLAUDE.md](CLAUDE.md) pour le détail des conventions.
