"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Header from "@/composants/header/Header";

type MonthTotal = {
  year: number;
  month: number;
  label: string;
  expenseTotal: number;
  incomeTotal: number;
};

// Les 6 derniers mois, du plus ancien au plus récent (pratique pour lire un
// graphique en bâtonnets de gauche à droite comme une timeline).
function getLastMonths(
  count: number,
  from: Date,
): { year: number; month: number }[] {
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(from.getFullYear(), from.getMonth() - i, 1);
    months.push({ year: date.getFullYear(), month: date.getMonth() });
  }
  return months;
}

function BarChart({ months }: { months: MonthTotal[] }) {
  const max = Math.max(
    1,
    ...months.flatMap((m) => [m.expenseTotal, m.incomeTotal]),
  );

  return (
    <div className="flex w-full items-end justify-between gap-2">
      {months.map((m) => (
        <div
          key={`${m.year}-${m.month}`}
          className="flex flex-1 flex-col items-center gap-1"
        >
          <div className="flex h-32 items-end gap-1">
            <div
              className="w-3 rounded-t bg-red-400"
              style={{ height: `${(m.expenseTotal / max) * 100}%` }}
            />
            <div
              className="w-3 rounded-t bg-green-400"
              style={{ height: `${(m.incomeTotal / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 capitalize">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function History() {
  // Une seule lecture de toutes les transactions, regroupées par mois côté
  // client — plus simple que 6 requêtes filtrées séparées pour ce volume de données.
  const transactions = useLiveQuery(() => db.transactions.toArray()) ?? [];

  const now = new Date();
  const months: MonthTotal[] = getLastMonths(6, now).map(({ year, month }) => {
    const monthTransactions = transactions.filter(
      (t) => t.date.getFullYear() === year && t.date.getMonth() === month,
    );
    const expenseTotal = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const incomeTotal = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const label = new Date(year, month, 1).toLocaleDateString("fr-FR", {
      month: "short",
    });

    return { year, month, label, expenseTotal, incomeTotal };
  });

  return (
    <main className="mb-16 flex w-full max-w-3xl flex-1 flex-col items-center gap-8 bg-white px-4 py-12 sm:items-start dark:bg-black">
      <Header />
      <h1>Historique</h1>

      <section className="flex w-full flex-col gap-4">
        <h2>Comparatif des 6 derniers mois</h2>
        <div className="flex gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />{" "}
            Dépenses
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />{" "}
            Revenus
          </span>
        </div>
        <BarChart months={months} />
      </section>

      <section className="flex w-full flex-col gap-2">
        <h2>Mois précédents</h2>
        {[...months].reverse().map((m) => (
          <div
            key={`${m.year}-${m.month}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <span className="capitalize">
              {new Date(m.year, m.month, 1).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <div className="flex gap-4 text-sm">
              <span className="text-red-500">
                -{m.expenseTotal.toFixed(2)} €
              </span>
              <span className="text-green-500">
                +{m.incomeTotal.toFixed(2)} €
              </span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
