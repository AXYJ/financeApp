"use client";

import { useState } from "react";
import type { Category } from "@/type/type";

import { db, useCategories } from "@/lib/db";

import Header from "@/composants/header/Header";

function CategoryInputList({
  categories,
  onRename,
}: {
  categories: Category[];
  onRename: (id: number, name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {categories.map((category) => (
        <input
          type="text"
          key={category.id}
          value={category.name}
          onChange={(e) => onRename(category.id, e.target.value)}
          style={{ backgroundColor: category.color }}
          className="w-full rounded-lg px-4 py-2"
        />
      ))}
    </div>
  );
}

export default function Categories() {
  // useLiveQuery (dans useCategories) lit la base et re-render automatiquement
  // à chaque update — rien à faire de plus pour que le champ reflète le nouveau nom.
  const expenseCategories = useCategories("expense");
  const incomeCategories = useCategories("income");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Un seul renommage suffit pour les deux : la mise à jour se fait par id,
  // pas besoin de savoir si c'est une catégorie de dépense ou de revenu.
  async function renameCategory(id: number, name: string): Promise<void> {
    try {
      await db.categories.update(id, { name });
      setRenameError(null);
    } catch {
      setRenameError("Impossible d'enregistrer ce nom. Réessaie.");
    }
  }

  return (
    <main className="mb-16 flex w-full max-w-3xl flex-1 flex-col items-center gap-8 bg-white px-4 py-12 sm:items-start dark:bg-black">
      <Header />
      <h1>Liste des catégories</h1>
      {renameError && (
        <p className="w-full text-center text-sm text-red-500">{renameError}</p>
      )}
      <section className="flex w-full flex-col gap-4">
        <h2>Dépenses</h2>
        <CategoryInputList
          categories={expenseCategories}
          onRename={renameCategory}
        />
      </section>
      <section className="flex w-full flex-col gap-4">
        <h2>Revenus</h2>
        <CategoryInputList
          categories={incomeCategories}
          onRename={renameCategory}
        />
      </section>
    </main>
  );
}
