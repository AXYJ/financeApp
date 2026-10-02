export type Category = {
  id: number;
  name: string;
  color: string;
  // Même couleur que `color` mais assombrie, pour le texte du nom de
  // catégorie (contraste sur le fond clair de `color`).
  textColor: string;
  type: "expense" | "income";
};

let categoryId: number = 0;

// Ces deux tableaux ne servent plus qu'à peupler IndexedDB une seule fois au
// premier lancement (voir seedCategories dans lib/db.ts) — l'app lit les
// catégories depuis la base ensuite, pas depuis ces tableaux.
export let ExpenseCategory: Category[] = [
  {
    id: categoryId++,
    name: "Courses",
    color: "var(--color-cat-green)",
    textColor: "var(--color-cat-green-dark)",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Charges",
    color: "var(--color-cat-yellow)",
    textColor: "var(--color-cat-yellow-dark)",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Loisirs",
    color: "var(--color-cat-red)",
    textColor: "var(--color-cat-red-dark)",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Transport",
    color: "var(--color-cat-blue)",
    textColor: "var(--color-cat-blue-dark)",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Restaurant",
    color: "var(--color-cat-purple)",
    textColor: "var(--color-cat-purple-dark)",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Autre",
    color: "var(--color-cat-orange)",
    textColor: "var(--color-cat-orange-dark)",
    type: "expense",
  },
];

export let IncomeCategory: Category[] = [
  {
    id: categoryId++,
    name: "Salaire",
    color: "var(--color-cat-yellow)",
    textColor: "var(--color-cat-yellow-dark)",
    type: "income",
  },
  {
    id: categoryId++,
    name: "Dons",
    color: "var(--color-cat-blue)",
    textColor: "var(--color-cat-blue-dark)",
    type: "income",
  },
  {
    id: categoryId++,
    name: "Remboursement",
    color: "var(--color-cat-green)",
    textColor: "var(--color-cat-green-dark)",
    type: "income",
  },
];

export type RecurringSeries = {
  id: number;
  type: "expense" | "income";
  amount: number;
  categoryId: number;
  note: string | null;
  dayOfMonth: number;
  active: boolean;
  startDate: Date;
  // "YYYY-MM" du mois à ne pas (re)générer, ou null. Posé par
  // skipRecurringSeriesThisMonth() dans db.ts.
  skippedMonth: string | null;
};

let transactionId: number = 0;

export type Transaction = {
  id: number;
  type: "expense" | "income";
  amount: number;
  categoryId: number;
  note: string | null;
  date: Date;
  recurringSeriesId: number | null;
};

export let Expense: Transaction[] = [];
export let Income: Transaction[] = [];
