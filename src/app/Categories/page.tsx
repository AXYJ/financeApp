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
          style={{
            backgroundColor: category.color,
            color: category.textColor,
          }}
          className="w-full rounded-lg px-4 py-2 font-semibold"
        />
      ))}
    </div>
  );
}

async function onAddCategory(
  type: "expense" | "income",
  name: string,
): Promise<void> {
  if (!name.trim()) return;
  await db.categories.add({
    name,
    color: "var(--color-cat-red)",
    textColor: "var(--color-cat-red-dark)",
    type,
  });
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
    <main className="bg-dark-blue mb-16 flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-12 sm:items-start">
      <Header />
      <h1>Liste des catégories</h1>
      {renameError && (
        <p className="text-p3r-red w-full text-center text-sm">{renameError}</p>
      )}
      <section className="flex w-full flex-col gap-4">
        <h2>Dépenses</h2>
        <div className="flex flex-col gap-2">
          <CategoryInputList
            categories={expenseCategories}
            onRename={renameCategory}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = new FormData(form).get("name") as string;
              onAddCategory("expense", name);
              form.reset();
            }}
          >
            <input
              type="text"
              name="name"
              className="border-turquoise placeholder-p3r-gray w-full rounded-lg border px-4 py-2 text-white"
              placeholder="Ajouter une catégorie"
            />
          </form>
        </div>
      </section>
      <section className="flex w-full flex-col gap-4">
        <h2>Revenus</h2>
        <div className="flex flex-col gap-2">
          <CategoryInputList
            categories={incomeCategories}
            onRename={renameCategory}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = new FormData(form).get("name") as string;
              onAddCategory("income", name);
              form.reset();
            }}
          >
            <input
              type="text"
              name="name"
              className="border-turquoise placeholder-p3r-gray w-full rounded-lg border px-4 py-2 text-white"
              placeholder="Ajouter une catégorie"
            />
          </form>
        </div>
      </section>
    </main>
  );
}
