"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, skipRecurringSeriesThisMonth, stopRecurringSeries } from "@/lib/db";
import Header from "@/composants/header/Header";

async function exportData(): Promise<void> {
  const [categories, transactions, recurringSeries] = await Promise.all([
    db.categories.toArray(),
    db.transactions.toArray(),
    db.recurringSeries.toArray(),
  ]);
  const blob = new Blob(
    [JSON.stringify({ categories, transactions, recurringSeries }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finances-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Remplace entièrement les 3 tables par le contenu du fichier importé — un
// import est une restauration de sauvegarde, pas une fusion.
async function importData(file: File): Promise<void> {
  const data = JSON.parse(await file.text());
  await db.transaction(
    "rw",
    db.categories,
    db.transactions,
    db.recurringSeries,
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.transactions.clear(),
        db.recurringSeries.clear(),
      ]);
      await db.categories.bulkAdd(data.categories ?? []);
      await db.transactions.bulkAdd(
        (data.transactions ?? []).map(
          (t: { date: string; [key: string]: unknown }) => ({
            ...t,
            date: new Date(t.date),
          }),
        ),
      );
      await db.recurringSeries.bulkAdd(
        (data.recurringSeries ?? []).map(
          (s: { startDate: string; [key: string]: unknown }) => ({
            ...s,
            startDate: new Date(s.startDate),
          }),
        ),
      );
    },
  );
}

export default function Setting() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pas indexé (booléen) : lecture complète + filtre JS, comme ailleurs dans
  // ce fichier pour `active`.
  const recurringSeries =
    useLiveQuery(() => db.recurringSeries.toArray()) ?? [];
  const activeSeries = recurringSeries.filter((s) => s.active);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Remplacer toutes les données actuelles par ce fichier ?")) {
      return;
    }
    try {
      await importData(file);
      setError(null);
    } catch {
      setError("Fichier invalide, import annulé.");
    }
  }

  async function renameSeries(id: number, note: string): Promise<void> {
    try {
      await db.recurringSeries.update(id, { note });
      setError(null);
    } catch {
      setError("Impossible d'enregistrer ce nom. Réessaie.");
    }
  }

  function openDialog(id: number) {
    setSelectedId(id);
    dialogRef.current?.showModal();
  }

  async function handleDeleteThisMonth() {
    if (selectedId !== null) await skipRecurringSeriesThisMonth(selectedId, new Date());
    dialogRef.current?.close();
  }

  async function handleDeleteForever() {
    if (selectedId !== null) await stopRecurringSeries(selectedId);
    dialogRef.current?.close();
  }

  return (
    <main className="mb-16 flex w-full max-w-3xl flex-1 flex-col items-center gap-8 bg-white px-4 py-12 sm:items-start dark:bg-black">
      <Header />
      <h1>Réglages</h1>
      {error && (
        <p className="w-full text-center text-sm text-red-500">{error}</p>
      )}

      <section className="flex w-full gap-4">
        <button
          type="button"
          onClick={exportData}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          Exporter les données
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          Importer les données
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleImport}
          className="hidden"
        />
      </section>

      <section className="flex w-full flex-col gap-2">
        <h2>Transactions récurrentes</h2>
        {activeSeries.length === 0 && (
          <p className="text-sm text-zinc-500">Aucune transaction récurrente.</p>
        )}
        {activeSeries.map((series) => (
          <div key={series.id} className="flex w-full gap-2">
            <input
              type="text"
              value={series.note ?? ""}
              onChange={(e) => renameSeries(series.id, e.target.value)}
              placeholder="Nom de la transaction"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
            />
            <button
              type="button"
              onClick={() => openDialog(series.id)}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            >
              Gérer
            </button>
          </div>
        ))}
      </section>

      <dialog
        ref={dialogRef}
        className="w-11/12 fixed top-1/2 left-1/2 -translate-1/2 max-w-sm rounded-lg p-6 backdrop:bg-black/50 dark:bg-zinc-900 dark:text-white"
      >
        <div className="flex flex-col gap-3">
          <p>Que faire de cette transaction récurrente ?</p>
          <button
            type="button"
            onClick={handleDeleteThisMonth}
            className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
           Désactiver pour le mois
          </button>
          <button
            type="button"
            onClick={handleDeleteForever}
            className="rounded-lg bg-red-500 px-4 py-2 text-white"
          >
            Supprimer définitivement
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-sm text-zinc-500"
          >
            Annuler
          </button>
        </div>
      </dialog>
    </main>
  );
}
