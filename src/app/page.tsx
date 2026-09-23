"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, JSX, MouseEvent as ReactMouseEvent } from "react";

import type { Category, Transaction } from "../type/type";
import { db, useCategories } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";

import Header from "../composants/header/Header";

type CategoryBreakdown = {
  category: Category;
  amount: number;
  percent: number;
};

function getCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  monthDate: Date,
): CategoryBreakdown[] {
  const monthTransactions = transactions.filter(
    (t) =>
      t.date.getMonth() === monthDate.getMonth() &&
      t.date.getFullYear() === monthDate.getFullYear(),
  );
  const total: number = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

  return categories.map((category) => {
    const amount = monthTransactions
      .filter((t) => t.categoryId === category.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const percent = total === 0 ? 0 : (amount / total) * 100;
    return { category, amount, percent };
  });
}

function getMonthTransactions(
  transactions: Transaction[],
  monthDate: Date,
): Transaction[] {
  return transactions
    .filter(
      (t) =>
        t.date.getMonth() === monthDate.getMonth() &&
        t.date.getFullYear() === monthDate.getFullYear(),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function TransactionList({
  transactions,
  emptyMessage,
  categoryName,
}: {
  transactions: Transaction[];
  emptyMessage: string;
  categoryName: string;
}): JSX.Element {
  if (transactions.length === 0) {
    return <p className="text-center text-zinc-400">{emptyMessage}</p>;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {transactions.map((t) => (
        <div key={t.id} className="grid grid-cols-4 items-center gap-2 px-4">
          <div className="text-sm text-zinc-500">
            {t.date.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "numeric",
            })}
          </div>
          <div className="col-span-2 flex-1">{t.note || categoryName}</div>
          <div>{t.amount.toFixed(2)} €</div>
        </div>
      ))}
    </div>
  );
}

function PieChart({
  breakdown,
  center,
  onSelect,
}: {
  breakdown: CategoryBreakdown[];
  center: CategoryBreakdown | null;
  onSelect: (category: Category) => void;
}): JSX.Element {
  const segments = breakdown.filter((b) => b.percent > 0);

  if (segments.length === 0) {
    return (
      <div className="mx-auto aspect-square w-full max-w-64 rounded-full bg-zinc-200 dark:bg-zinc-800" />
    );
  }

  let cumulative = 0;
  const ranges = segments.map((b) => {
    const start = cumulative;
    cumulative += b.percent;
    return { category: b.category, start, end: cumulative };
  });
  const stops = ranges
    .map((r) => `${r.category.color} ${r.start}% ${r.end}%`)
    .join(", ");

  // Détermine la tranche cliquée à partir de l'angle du clic par rapport au centre du cercle
  function handleClick(event: ReactMouseEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);

    const outerRadius = rect.width / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < outerRadius * 0.8) return; // clic dans le trou central, on ignore

    // 0deg = haut du cercle, sens horaire (comme conic-gradient par défaut)
    const angleDeg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const percent = (angleDeg / 360) * 100;

    const hit = ranges.find((r) => percent >= r.start && percent < r.end);
    if (hit) onSelect(hit.category);
  }

  return (
    <div
      onClick={handleClick}
      className="relative mx-auto aspect-square w-full max-w-64 cursor-pointer rounded-full"
      style={{ background: `conic-gradient(${stops})` }}
    >
      <div className="pointer-events-none absolute inset-8 flex flex-col items-center justify-center gap-1 rounded-full bg-white px-2 text-center dark:bg-black">
        {center && (
          <>
            <p className="flex items-center gap-1 text-sm">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: center.category.color }}
              />
              {center.category.name} ({center.percent.toFixed(0)}%)
            </p>
            <p className="font-semibold">{center.amount.toFixed(2)} €</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [addingTransaction, setAddingTransaction] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expense, setExpense] = useState<string>("Courses");
  const [income, setIncome] = useState<string>("Salaire");
  const popupRef = useRef<HTMLFormElement>(null);

  // Ajout de transaction — pas de champ `id` : Dexie le génère lui-même (++id du schéma)
  async function addTransaction(
    transaction: Omit<Transaction, "id">,
  ): Promise<number> {
    return await db.transactions.add(transaction);
  }

  // Gestion du formulaire
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.checkValidity()) return;

    const formData = new FormData(form);

    // Récupérer les données du formulaire
    const type: "expense" | "income" =
      currentSlide === 1 ? "expense" : "income";
    const amount: number = Number(formData.get("amount"));
    const categoryId: number = Number(formData.get("category"));
    const note: string = formData.get("name") as string;
    const date: Date = new Date();

    // Ajout de la transaction dans la base de données IndexedDB — si ça
    // échoue (quota dépassé, navigateur qui bloque...), on garde la pop-up
    // ouverte et on prévient plutôt que de la fermer sur une écriture ratée.
    try {
      await addTransaction({
        type,
        amount,
        categoryId,
        note,
        date,
        recurringSeriesId: null,
      });
      setSubmitError(null);
      setAddingTransaction(false);
    } catch {
      setSubmitError("Impossible d'enregistrer la transaction. Réessaie.");
    }
  }

  // Fermer la pop-up en cliquant à l'extérieur
  useEffect(() => {
    if (!addingTransaction) return;

    const handleClickOutside = (event: MouseEvent): void => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setAddingTransaction(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addingTransaction]);

  // Changement de slide + retour en haut de page
  function goToSlide(slide: number): void {
    setCurrentSlide(slide);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // useLiveQuery relit automatiquement la base et re-render dès qu'une transaction
  // ou une catégorie est ajoutée/modifiée/supprimée — plus besoin de forcer un
  // re-render à la main. Reste `undefined` le temps de la première lecture
  // (asynchrone) : on retombe sur [].
  const allExpenses =
    useLiveQuery(() =>
      db.transactions.where("type").equals("expense").toArray(),
    ) ?? [];
  const allIncomes =
    useLiveQuery(() =>
      db.transactions.where("type").equals("income").toArray(),
    ) ?? [];
  const expenseCategories = useCategories("expense");
  const incomeCategories = useCategories("income");

  // Tant que le seed initial de la base n'est pas terminé, il n'y a aucune
  // catégorie à afficher — attendre plutôt que de planter sur un `.find()` vide.
  if (expenseCategories.length === 0 || incomeCategories.length === 0) {
    return <p className="py-12 text-center">Chargement...</p>;
  }

  const now = new Date();
  const monthName = now.toLocaleDateString("fr-FR", { month: "long" });
  const expenseBreakdown = getCategoryBreakdown(
    allExpenses,
    expenseCategories,
    now,
  );
  const incomeBreakdown = getCategoryBreakdown(
    allIncomes,
    incomeCategories,
    now,
  );

  const selectedExpenseCategory =
    expenseCategories.find((c) => c.name === expense) ?? expenseCategories[0];
  const selectedIncomeCategory =
    incomeCategories.find((c) => c.name === income) ?? incomeCategories[0];
  const selectedExpense =
    expenseBreakdown.find(
      (b) => b.category.id === selectedExpenseCategory.id,
    ) ?? null;
  const selectedIncome =
    incomeBreakdown.find((b) => b.category.id === selectedIncomeCategory.id) ??
    null;

  const expenseTransactions = getMonthTransactions(allExpenses, now).filter(
    (t) => t.categoryId === selectedExpenseCategory.id,
  );
  const incomeTransactions = getMonthTransactions(allIncomes, now).filter(
    (t) => t.categoryId === selectedIncomeCategory.id,
  );

  return (
    <main className="mb-28 flex w-full max-w-3xl flex-1 flex-col items-center gap-8 overflow-x-hidden bg-white px-4 py-12 sm:items-start dark:bg-black">
      {/* Menu bottom */}
      <Header />

      {/* Contenu principal */}
      <div
        className="flex w-full transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${(currentSlide - 1) * 100}%)`,
        }}
      >
        <section className="relative flex w-full shrink-0 flex-col items-center gap-4">
          <h1 className="text-center">Dépenses de {monthName}</h1>
          <div className="w-full">
            <PieChart
              breakdown={expenseBreakdown}
              center={selectedExpense}
              onSelect={(category) => setExpense(category.name)}
            />
          </div>
          <TransactionList
            transactions={expenseTransactions}
            emptyMessage="Aucune dépense ce mois-ci"
            categoryName={selectedExpenseCategory.name}
          />
        </section>
        <section className="relative flex w-full shrink-0 flex-col items-center gap-4">
          <h1 className="text-center">Revenus de {monthName}</h1>
          <div className="w-full">
            <PieChart
              breakdown={incomeBreakdown}
              center={selectedIncome}
              onSelect={(category) => setIncome(category.name)}
            />
          </div>
          <TransactionList
            transactions={incomeTransactions}
            emptyMessage="Aucun revenu ce mois-ci"
            categoryName={selectedIncomeCategory.name}
          />
        </section>
      </div>

      {/* Boutons de changement de carousel */}
      <div className="flex gap-2">
        <button
          className={`h-4 w-4 rounded-full ${currentSlide === 1 ? "bg-amber-500" : "bg-white"}`}
          onClick={() => goToSlide(1)}
        ></button>
        <button
          className={`h-4 w-4 rounded-full ${currentSlide === 2 ? "bg-amber-500" : "bg-white"}`}
          onClick={() => goToSlide(2)}
        ></button>
      </div>

      {/* Bouton d'ajout de transaction */}
      <div className="fixed bottom-3/20 w-8/10">
        <button
          className="w-full rounded-full bg-white py-2 text-black"
          onClick={() => {
            setSubmitError(null);
            setAddingTransaction(true);
          }}
        >
          Ajouter {currentSlide === 1 ? "une dépense" : "un revenu"}
        </button>
      </div>

      {/* Pop-up d'ajout de transaction */}
      {addingTransaction && (
        <div className="fixed top-0 left-0 z-10 h-screen w-screen bg-black/50">
          <form
            ref={popupRef}
            className="absolute top-1/2 left-1/2 flex w-9/10 -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl bg-white px-4 py-4 text-black"
            onSubmit={handleSubmit}
            noValidate
          >
            <h2 className="mb-2 text-center">
              Ajout {currentSlide === 1 ? "d'une dépense" : "d'un revenu"}
            </h2>
            <div className="flex flex-col gap-2">
              <label htmlFor="name">Nom</label>
              <input
                type="text"
                name="name"
                id="name"
                className="rounded border border-transparent px-2 invalid:border-red-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="category">Catégorie</label>
              <select
                name="category"
                id="category"
                className="rounded border border-transparent invalid:border-red-500"
              >
                {currentSlide === 1
                  ? expenseCategories.map((category: Category): JSX.Element => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  : incomeCategories.map((category: Category): JSX.Element => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="amount">Montant</label>
              <input
                type="number"
                name="amount"
                id="amount"
                className="rounded border border-transparent px-2 invalid:border-red-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <input type="checkbox" name="recurring" />
              <label htmlFor="recurring">Répéter tous les mois</label>
            </div>
            {submitError && (
              <p className="text-center text-sm text-red-500">{submitError}</p>
            )}
            <button
              className="mt-2 rounded-full bg-black py-2 text-white"
              type="submit"
            >
              Ajouter la transaction
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
