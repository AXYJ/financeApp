export type Category = {
  id: number,
  name: string,
  color: string,
}

let categoryId: number = 0

export let ExpenseCategory: Category[] = [
  {
    id: categoryId++,
    name: "Courses",
    color: "green"
  },
  {
    id: categoryId++,
    name: "Charges",
    color: "yellow"
  },
  {
    id: categoryId++,
    name: "Loisirs",
    color: "red"
  },
  {
    id: categoryId++,
    name: "Transport",
    color: "blue"
  },
  {
    id: categoryId++,
    name: "Restaurant",
    color: "purple"
  },
  {
    id: categoryId++,
    name: "Autre",
    color: "grey"
  },
]

export let IncomeCategory: Category[] = [
  {
    id: categoryId++,
    name: "Salaire",
    color: "yellow"
  },
  {
    id: categoryId++,
    name: "Dons",
    color: "blue"
  },
  {
    id: categoryId++,
    name: "Remboursement",
    color: "green"
  }
]

let RecursingId: number = 0

export type Recursing = {
  id: string,
  type: 'expense' | 'income',
  amount: number,
  categoryId: string,
  note: string,
  dayOfMonth: number,
  active: boolean,
  startDate: Date
}

let transactionId: number = 0

export type Transaction = {
  id: number,
  type: 'expense' | 'income',
  amount: number,
  categoryId: number,
  note: string,
  date: Date,
  recurringSeriesId: string | null
}

export let Expense: Transaction[] = []
export let Income: Transaction[] = []