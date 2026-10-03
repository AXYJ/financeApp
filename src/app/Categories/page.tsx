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
        <div key={category.id} className="relative">
          <input
            type="text"
            value={category.name}
            onChange={(e) => onRename(category.id, e.target.value)}
            style={{
              backgroundColor: category.color,
              color: category.textColor,
            }}
            className="w-full rounded-lg px-4 py-2 pr-10 font-semibold"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={category.textColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
          >
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// Palette des catégories (voir type.ts/seedCategories) — on tourne dedans pour
// qu'une catégorie ajoutée à la main n'arrive pas toujours en rouge.
const CATEGORY_PALETTE: { color: string; textColor: string }[] = [
  { color: "var(--color-cat-green)", textColor: "var(--color-cat-green-dark)" },
  { color: "var(--color-cat-yellow)", textColor: "var(--color-cat-yellow-dark)" },
  { color: "var(--color-cat-red)", textColor: "var(--color-cat-red-dark)" },
  { color: "var(--color-cat-blue)", textColor: "var(--color-cat-blue-dark)" },
  { color: "var(--color-cat-purple)", textColor: "var(--color-cat-purple-dark)" },
  { color: "var(--color-cat-orange)", textColor: "var(--color-cat-orange-dark)" },
  { color: "var(--color-cat-ice)", textColor: "var(--color-cat-ice-dark)" },
];

async function onAddCategory(
  type: "expense" | "income",
  name: string,
  existingCount: number,
): Promise<void> {
  if (!name.trim()) return;
  const { color, textColor } =
    CATEGORY_PALETTE[existingCount % CATEGORY_PALETTE.length];
  await db.categories.add({ name, color, textColor, type });
}

function CategorySection({
  title,
  type,
  categories,
  onRename,
}: {
  title: string;
  type: "expense" | "income";
  categories: Category[];
  onRename: (id: number, name: string) => void;
}) {
  return (
    <section className="flex w-full flex-col gap-4">
      <h2>{title}</h2>
      <div className="flex flex-col gap-2">
        <CategoryInputList categories={categories} onRename={onRename} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = new FormData(form).get("name") as string;
            onAddCategory(type, name, categories.length);
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
    <main className="bg-dark-blue mb-16 flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-12 sm:items-start">
      <Header />
      <h1>Liste des catégories</h1>
      {renameError && (
        <p className="text-p3r-red w-full text-center text-sm">{renameError}</p>
      )}
      <CategorySection
        title="Dépenses"
        type="expense"
        categories={expenseCategories}
        onRename={renameCategory}
      />
      <CategorySection
        title="Revenus"
        type="income"
        categories={incomeCategories}
        onRename={renameCategory}
      />
    </main>
  );
}
