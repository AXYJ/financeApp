export type Category = {
  id: number;
  name: string;
  color: string;
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
    color: "green",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Charges",
    color: "yellow",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Loisirs",
    color: "red",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Transport",
    color: "blue",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Restaurant",
    color: "purple",
    type: "expense",
  },
  {
    id: categoryId++,
    name: "Autre",
    color: "grey",
    type: "expense",
  },
];

export let IncomeCategory: Category[] = [
  {
    id: categoryId++,
    name: "Salaire",
    color: "yellow",
    type: "income",
  },
  {
    id: categoryId++,
    name: "Dons",
    color: "blue",
    type: "income",
  },
  {
    id: categoryId++,
    name: "Remboursement",
    color: "green",
    type: "income",
  },
];

let RecursingId: number = 0;

export type Recursing = {
  id: string;
  type: "expense" | "income";
  amount: number;
  categoryId: string;
  note: string;
  dayOfMonth: number;
  active: boolean;
  startDate: Date;
};

let transactionId: number = 0;

export type Transaction = {
  id: number;
  type: "expense" | "income";
  amount: number;
  categoryId: number;
  note: string | null;
  date: Date;
  recurringSeriesId: string | null;
};

export let Expense: Transaction[] = [];
export let Income: Transaction[] = [];
