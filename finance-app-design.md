# App de gestion de finances perso — Design

## Contexte

- Usage : **solo**, sur **mobile uniquement**, pas de synchronisation multi-appareils.
- Devise : **EUR** uniquement.

## Stack technique

- **Next.js + TypeScript**
- **PWA** (manifest.json + service worker) plutôt qu'app native :
  - Pas de compte développeur, pas de review de store, mises à jour instantanées.
  - Installation via "Ajouter à l'écran d'accueil" sur mobile.
  - Déploiement sur Vercel (ou équivalent) pour pouvoir l'installer sur le tel.
- Pas de backend : toute la logique tourne côté client.

## Stockage des données

- **IndexedDB** via **Dexie.js** (wrapper simple, gère les objets structurés, pas de limite pratique).
- Pas effacé par un "vider le cache" classique — seulement par une suppression explicite des données du site.
- **Export / Import JSON** : bouton pour télécharger toute la base en `.json`, et un import pour la restaurer (filet de sécurité en cas de changement de tel ou suppression accidentelle).

## Modèle de données

### `ExpenseCategory`

```ts
{ id: string, name: string, color: string, isCustom: boolean }
```

Liste prédéfinie (Alimentation, Transport, Logement, Loisirs, Santé, Autres...) + ajout de catégories perso.

### `IncomeCategory`

```ts
{ id: string, name: string, color: string, isCustom: boolean }
```

Liste séparée de celle des dépenses (Salaire, Freelance, Cadeau, Remboursement...) + ajout perso.
Deux listes distinctes car les catégories de dépenses n'ont pas de sens pour des revenus (et inversement).

### `RecurringSeries`

```ts
{
  id: string,
  type: 'expense' | 'income',
  amount: number,
  categoryId: string,
  note: string,
  dayOfMonth: number,
  active: boolean,
  startDate: string
}
```

- Modifier le montant → n'affecte que les prochaines générations (l'historique déjà généré reste figé).
- "Arrêter" → passe `active` à `false`, ne supprime pas les occurrences déjà générées.

### `Transaction`

```ts
{
  id: string,
  type: 'expense' | 'income',
  amount: number,
  categoryId: string,
  note: string,          // texte libre, ex: "Loisirs (abonnement de sport)"
  date: string,
  recurringSeriesId: string | null
}
```

- À l'ouverture de l'app, si le mois courant n'a pas encore d'occurrence générée pour une `RecurringSeries` active dont `startDate` est passée, une nouvelle `Transaction` est créée automatiquement.

## Fonctionnalités

1. **Ajout de dépense** : montant, catégorie (liste prédéfinie + perso), note libre, date, case "mensuel" (crée une `RecurringSeries`).
2. **Ajout de revenu** : identique, avec la liste de catégories revenus.
3. **Gestion des catégories** : ajouter/renommer/supprimer une catégorie perso (dépenses et revenus séparément).
4. **Gestion des récurrences** : voir les séries actives, arrêter une série ("à partir de maintenant"), modifier le montant futur.
5. **Résumé du mois courant** : carrousel à 2 slides —
   - Slide dépenses : total + camembert par catégorie (couleur par catégorie).
   - Slide revenus : total + camembert par catégorie.
6. **Historique des mois précédents** : liste des mois passés, cliquable pour revoir leur résumé (même carrousel, figé sur les données de ce mois-là).
7. **Comparatif mensuel** : graphique en bâtonnets, dépenses totales + revenus totaux, sur les 6 derniers mois.
8. **Export / Import JSON** : sauvegarde et restauration manuelle des données.

## Écrans (proposition)

- **Accueil** : résumé du mois en cours (carrousel) + bouton flottant "Ajouter" (dépense/revenu).
- **Historique** : liste des mois précédents + graphique comparatif 6 mois.
- **Catégories** : gestion des catégories dépenses/revenus.
- **Réglages** : export/import JSON, gestion des récurrences actives.
