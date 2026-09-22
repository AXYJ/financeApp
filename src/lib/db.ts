// ============================================================================
// COURS EXPRESS : IndexedDB + Dexie
// ============================================================================
//
// 1) C'est quoi IndexedDB ?
// --------------------------
// Une vraie base de données intégrée au navigateur (pas juste une string comme
// localStorage). Elle stocke des objets JS structurés (pas seulement du texte),
// elle est ASYNCHRONE (toute opération renvoie une Promise, jamais de blocage),
// et surtout : les données survivent aux rechargements de page, à la fermeture
// du navigateur, à la réouverture de la PWA — c'est exactement ce qu'il te
// fallait pour remplacer les `let Expense = []` qui se vident à chaque refresh.
//
// 2) Pourquoi Dexie et pas l'API IndexedDB brute ?
// --------------------------------------------------
// L'API native IndexedDB existe depuis longtemps et est notoirement pénible :
// callbacks imbriqués, transactions à gérer à la main, pas de types. Dexie est
// une couche par-dessus qui expose la même chose avec une API basée sur des
// Promises/async-await et un typage TypeScript propre. Tu perds zéro
// fonctionnalité, tu gagnes en lisibilité.
//
// 3) Le concept central : le schéma versionné
// ----------------------------------------------
// Une base Dexie a des "tables" (l'équivalent d'une table SQL, ou d'une
// collection MongoDB). Chaque table a un SCHÉMA défini via `.stores({...})`,
// qui liste : la clé primaire (préfixée `++` si elle doit s'auto-incrémenter),
// puis les champs que tu veux pouvoir interroger rapidement (les "index").
//
// Important : tu n'as PAS besoin de lister tous les champs de tes objets dans
// le schéma — seulement ceux sur lesquels tu veux faire des recherches
// (`.where("champ")`). Les autres champs existent quand même dans les objets
// stockés, juste sans index dédié pour les requêtes rapides dessus.
//
// La base est VERSIONNÉE : si tu changes le schéma plus tard (ajouter un
// champ indexé, une nouvelle table...), tu ajoutes un nouveau `.version(2)`
// au lieu de modifier `.version(1)` — ça permet à Dexie de migrer
// automatiquement les données existantes des utilisateurs qui ont déjà la
// version 1 installée dans leur navigateur.

import Dexie, { type EntityTable } from "dexie"
import type { Category, Transaction } from "../type/type"

// ----------------------------------------------------------------------------
// Étape 1 : décrire les tables
// ----------------------------------------------------------------------------
// On réutilise les types déjà définis dans type.ts plutôt que d'en recréer.
// `EntityTable<Type, "nomDeLaCléPrimaire">` donne à Dexie la connaissance du
// type stocké ET du nom du champ qui sert de clé primaire, pour un typage
// complet sur toutes les opérations (db.transactions.add(...), .get(...), etc.)

class FinanceDB extends Dexie {
  // Chaque propriété = une table. Le "!" dit à TypeScript "cette propriété
  // sera bien assignée, même si ce n'est pas visible dans le constructeur"
  // (Dexie l'assigne lui-même via `this.version(...).stores(...)` plus bas).
  categories!: EntityTable<Category, "id">
  transactions!: EntityTable<Transaction, "id">

  constructor() {
    // Le nom passé à super() est le nom de la base dans le navigateur —
    // visible dans les DevTools sous Application > IndexedDB.
    super("FinanceDB")

    this.version(1).stores({
      // "++id" = clé primaire auto-incrémentée (Dexie génère l'id tout seul,
      // plus besoin du `let transactionId = 0` fait à la main).
      // Les champs suivants sont les INDEX : ils permettent d'écrire
      // `db.transactions.where("type").equals("expense")` efficacement.
      // Pas besoin d'indexer `note`, `amount` ou `date` si tu ne comptes pas
      // filtrer/trier dessus directement en base (tu peux toujours le faire
      // en JS après une lecture, comme actuellement avec `.filter()`/`.sort()`).
      categories: "++id, name",
      transactions: "++id, type, categoryId, date",
    })
  }
}

// Une seule instance, partagée par toute l'app (comme un singleton).
export const db = new FinanceDB()

// ----------------------------------------------------------------------------
// Étape 2 : exemples d'utilisation (CRUD)
// ----------------------------------------------------------------------------
// Tout est async — toujours `await` (ou `.then()`) ces appels.

// CREATE — ajouter une transaction. Pas besoin de fournir `id`, Dexie s'en
// charge grâce au `++id` du schéma.
async function exampleAdd() {
  const newId = await db.transactions.add({
    type: "expense",
    amount: 12.5,
    categoryId: 0,
    note: "Courses",
    date: new Date(),
    recurringSeriesId: null,
  } as Transaction)
  return newId
}

// READ — récupérer une seule ligne par sa clé primaire.
async function exampleGet(id: number) {
  return await db.transactions.get(id)
}

// READ — requête filtrée. `.where(champIndexé)` est rapide (utilise l'index) ;
// enchaîner avec `.toArray()` pour récupérer un vrai tableau JS exploitable.
async function exampleQuery() {
  return await db.transactions
    .where("type")
    .equals("expense")
    .toArray()
}

// UPDATE — modifier un champ précis sans réécrire tout l'objet.
async function exampleUpdate(id: number, newAmount: number) {
  await db.transactions.update(id, { amount: newAmount })
}

// DELETE
async function exampleDelete(id: number) {
  await db.transactions.delete(id)
}

// ----------------------------------------------------------------------------
// Étape 3 : brancher React dessus avec useLiveQuery
// ----------------------------------------------------------------------------
// C'est LE point qui remplace le bricolage actuel (`setTransactionId` pour
// forcer un re-render après un `Expense.push(...)`). `useLiveQuery` de
// `dexie-react-hooks` exécute ta requête, s'abonne aux changements de la
// base, et RE-RENDER AUTOMATIQUEMENT ton composant dès qu'une donnée dont
// dépend la requête change (ajout, update, suppression) — où que ce
// changement ait lieu dans l'app. Plus besoin de state manuel pour "forcer"
// un refresh.
//
// Exemple d'utilisation dans un composant (juste pour référence — pas encore
// branché dans page.tsx) :
//
//   import { useLiveQuery } from "dexie-react-hooks"
//   import { db } from "@/lib/db"
//
//   function ExpenseList() {
//     // `undefined` tant que la première lecture n'est pas terminée (la base
//     // est async, il y a toujours un court instant avant d'avoir la donnée).
//     const expenses = useLiveQuery(() => db.transactions.where("type").equals("expense").toArray())
//
//     if (!expenses) return <p>Chargement...</p>
//     return <ul>{expenses.map((t) => <li key={t.id}>{t.note}</li>)}</ul>
//   }

// ----------------------------------------------------------------------------
// Récap des concepts clés à retenir
// ----------------------------------------------------------------------------
// - Tout est async (Promises) → toujours `await`.
// - Le schéma ne liste que les champs à indexer, pas tous les champs.
// - `++id` = clé auto-générée, fini la gestion manuelle des compteurs.
// - Nouvelle version du schéma = nouveau `.version(N)`, jamais modifier une
//   version existante une fois publiée (ça casserait la migration des
//   utilisateurs qui ont déjà des données en v1).
// - `useLiveQuery` = la pièce qui connecte Dexie à React de façon réactive.
