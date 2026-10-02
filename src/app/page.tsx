"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  JSX,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";

import type { Category, Transaction } from "../type/type";
import {
  addRecurringSeries,
  db,
  generateDueTransactions,
  useCategories,
} from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";

import Header from "../composants/header/Header";
import HomeBackground from "../composants/home/HomeBackground";
import P3RList from "../composants/home/P3RList";
import { u } from "../composants/home/u";

// Réglages des gestes (voir handlePointerMove / handlePointerUp)
const LIST_STEP_PX = 36; // distance verticale parcourue pour avancer d'un cran
const SWIPE_RATIO = 0.25; // part de la largeur à dépasser pour changer de slide
const FLICK_SPEED = 0.5; // vitesse (px/ms) qui vaut changement de slide même court

type ActiveGesture = {
  startX: number;
  startY: number;
  axis: "x" | "y" | null;
  listType: "expense" | "income" | null;
  lastStepY: number;
  lastX: number;
  lastTime: number;
  speed: number;
};

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
      <div className="mx-auto aspect-square w-8/10 max-w-48 rounded-full bg-zinc-200 dark:bg-zinc-800" />
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
  const [expenseCategoryId, setExpenseCategoryId] = useState<number | null>(
    null,
  );
  const [incomeCategoryId, setIncomeCategoryId] = useState<number | null>(null);
  const popupRef = useRef<HTMLFormElement>(null);

  // Curseur de chaque liste (index de la transaction active, celle du haut)
  const [cursors, setCursors] = useState({ expense: 0, income: 0 });
  // Décalage horizontal (px) du slide pendant que le doigt le tire
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const movedRef = useRef(false);
  const wheelLockRef = useRef(false);

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
    // Une checkbox non cochée est absente du FormData — .get() renvoie alors `null`.
    const isRecurring = formData.get("recurring") === "on";

    // Ajout de la transaction dans la base de données IndexedDB — si ça
    // échoue (quota dépassé, navigateur qui bloque...), on garde la pop-up
    // ouverte et on prévient plutôt que de la fermer sur une écriture ratée.
    try {
      if (isRecurring) {
        // On crée la série (le "modèle" qui se répétera chaque mois) puis la
        // toute première occurrence, reliée à cette série via recurringSeriesId.
        const seriesId = await addRecurringSeries({
          type,
          amount,
          categoryId,
          note,
          dayOfMonth: date.getDate(),
          active: true,
          startDate: date,
          skippedMonth: null,
        });
        await addTransaction({
          type,
          amount,
          categoryId,
          note,
          date,
          recurringSeriesId: seriesId,
        });
      } else {
        await addTransaction({
          type,
          amount,
          categoryId,
          note,
          date,
          recurringSeriesId: null,
        });
      }
      setSubmitError(null);
      setAddingTransaction(false);
    } catch {
      setSubmitError("Impossible d'enregistrer la transaction. Réessaie.");
    }
  }

  // Génère les transactions dues pour les séries récurrentes actives — au
  // montage de la page (donc à chaque ouverture de l'app), pas au chargement
  // du module comme seedCategories : on veut que ça se redéclenche si tu
  // reviens sur l'accueil après avoir navigué, pas juste une fois par onglet.
  useEffect(() => {
    generateDueTransactions(new Date());
  }, []);

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

  // Catégorie par défaut = la première catégorie non vide ce mois-ci (sinon la
  // première tout court) — utilisée tant que l'utilisateur n'a pas cliqué sur
  // une tranche du camembert.
  const defaultExpenseCategory =
    expenseBreakdown.find((b) => b.amount > 0)?.category ??
    expenseCategories[0];
  const defaultIncomeCategory =
    incomeBreakdown.find((b) => b.amount > 0)?.category ?? incomeCategories[0];

  const selectedExpenseCategory =
    expenseCategories.find((c) => c.id === expenseCategoryId) ??
    defaultExpenseCategory;
  const selectedIncomeCategory =
    incomeCategories.find((c) => c.id === incomeCategoryId) ??
    defaultIncomeCategory;
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

  const activeType = currentSlide === 1 ? "expense" : "income";
  const listLengths = {
    expense: expenseTransactions.length,
    income: incomeTransactions.length,
  };
  // Le curseur ne dépasse jamais la dernière transaction (la dernière peut être
  // active toute seule en haut) — utile si la liste raccourcit après coup.
  const cursorOf = (type: "expense" | "income") =>
    Math.min(cursors[type], Math.max(listLengths[type] - 1, 0));

  // Un cran de liste : +1 = transaction suivante, -1 = précédente. Arrêt aux
  // extrémités, pas de boucle.
  function stepList(delta: number): void {
    setCursors((current) => ({
      ...current,
      [activeType]: Math.min(
        Math.max(cursorOf(activeType) + delta, 0),
        Math.max(listLengths[activeType] - 1, 0),
      ),
    }));
  }

  // Changer de slide ou de catégorie ramène la liste sur la première transaction.
  function changeSlide(slide: number): void {
    setCurrentSlide(slide);
    setCursors({ expense: 0, income: 0 });
  }

  function selectCategory(type: "expense" | "income", category: Category) {
    if (type === "expense") setExpenseCategoryId(category.id);
    else setIncomeCategoryId(category.id);
    setCursors((current) => ({ ...current, [type]: 0 }));
  }

  // Un seul contrôleur de gestes pour les deux axes : l'axe dominant du
  // mouvement décide si on tire le slide (x) ou si on fait défiler la liste (y).
  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const list = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-p3r-list]",
    );
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      listType: (list?.dataset.p3rList as "expense" | "income") ?? null,
      lastStepY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      speed: 0,
    };
    movedRef.current = false;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      event.currentTarget.setPointerCapture(event.pointerId);
      movedRef.current = true;
      if (gesture.axis === "x") setDragging(true);
    }

    if (gesture.axis === "x") {
      const elapsed = event.timeStamp - gesture.lastTime;
      if (elapsed > 0)
        gesture.speed = (event.clientX - gesture.lastX) / elapsed;
      gesture.lastX = event.clientX;
      gesture.lastTime = event.timeStamp;
      // Résistance quand on tire au-delà du premier / dernier slide
      const pastEdge =
        (currentSlide === 1 && dx > 0) || (currentSlide === 2 && dx < 0);
      setDragX(pastEdge ? dx * 0.3 : dx);
    } else if (gesture.listType === activeType) {
      while (gesture.lastStepY - event.clientY >= LIST_STEP_PX) {
        stepList(1);
        gesture.lastStepY -= LIST_STEP_PX;
      }
      while (event.clientY - gesture.lastStepY >= LIST_STEP_PX) {
        stepList(-1);
        gesture.lastStepY += LIST_STEP_PX;
      }
    }
  }

  function handlePointerEnd(
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ): void {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || gesture.axis !== "x") return;

    const dx = event.clientX - gesture.startX;
    const far = Math.abs(dx) > event.currentTarget.clientWidth * SWIPE_RATIO;
    const flick =
      Math.abs(gesture.speed) > FLICK_SPEED &&
      Math.sign(gesture.speed) === Math.sign(dx);
    if (!cancelled && (far || flick)) {
      if (dx < 0 && currentSlide === 1) changeSlide(2);
      else if (dx > 0 && currentSlide === 2) changeSlide(1);
    }
    setDragX(0);
    setDragging(false);
  }

  // Molette / trackpad : un cran par impulsion (verrou court pour éviter que
  // l'inertie de la molette n'enchaîne des dizaines de crans).
  function handleWheel(event: ReactWheelEvent<HTMLDivElement>): void {
    if (wheelLockRef.current || Math.abs(event.deltaY) < 4) return;
    stepList(event.deltaY > 0 ? 1 : -1);
    wheelLockRef.current = true;
    setTimeout(() => {
      wheelLockRef.current = false;
    }, 180);
  }

  // `--u` = 1px de la maquette (393px de large), pour tout mettre à l'échelle
  // en unités relatives ; la scène garde le ratio de la maquette (jamais de
  // contenu rogné) et se centre sur les écrans qui ne matchent pas ce ratio —
  // en hauteur, elle occupe toujours 100dvh (voir `inset-y-0` sur le conteneur).
  const stageStyle = {
    "--stage-width": "min(100vw, calc(100dvh * 393 / 852))",
    "--u": "calc(var(--stage-width) / 393)",
    width: "var(--stage-width)",
  } as CSSProperties;

  // Le décor (photo + bande diagonale) vit dans son propre calque, mis à
  // l'échelle avec `max()` pour couvrir tout le viewport (100vw ET 100dvh) —
  // ça évite les bandes `bg-dark-blue` sur les écrans qui ne matchent pas le
  // ratio de la maquette. Contrairement à la scène interactive (`stageStyle`,
  // en `min()`), on accepte ici de rogner le décor : c'est un fond, pas du
  // contenu fonctionnel.
  const backdropStyle = {
    "--u": "max(calc(100vw / 393), calc(100dvh / 852))",
  } as CSSProperties;

  const slideTitle = "absolute font-rodin-ub whitespace-nowrap text-[#fefcfd]";

  return (
    <main className="bg-dark-blue fixed inset-0 overflow-clip">
      <div className="absolute inset-0 overflow-clip" style={backdropStyle}>
        <HomeBackground
          monthName={monthName.toUpperCase()}
          monthNumber={String(now.getMonth() + 1).padStart(2, "0")}
        />
      </div>
      <div
        className="absolute inset-y-0 right-0 left-0 mx-auto"
        style={stageStyle}
      >
        {/* Slides : suivent le doigt (axe x), la liste défile sur l'axe y */}
        <div
          className="absolute inset-0 touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => handlePointerEnd(event, false)}
          onPointerCancel={(event) => handlePointerEnd(event, true)}
          onClickCapture={(event) => {
            // Après un glissement, on ne veut pas d'un clic parasite sur le donut
            if (movedRef.current) {
              event.stopPropagation();
              movedRef.current = false;
            }
          }}
        >
          <div
            className="flex h-screen w-[200%]"
            style={{
              transform: `translateX(calc(${-(currentSlide - 1) * 50}% + ${dragX}px))`,
              transition: dragging
                ? "none"
                : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <section className="relative h-screen w-1/2 shrink-0">
              <h1
                className={slideTitle}
                style={{ left: "6.11%", top: "2.35%", fontSize: u(40) }}
              >
                DÉPENSES
              </h1>
              <div className="absolute w-full" style={{ top: "10.56%" }}>
                <PieChart
                  breakdown={expenseBreakdown}
                  center={selectedExpense}
                  onSelect={(category) => selectCategory("expense", category)}
                />
              </div>
              <P3RList
                type="expense"
                transactions={expenseTransactions}
                cursor={cursorOf("expense")}
                categoryName={selectedExpenseCategory.name}
                emptyMessage="Aucune dépense ce mois-ci"
                onWheel={handleWheel}
              />
            </section>
            <section className="relative h-screen w-1/2 shrink-0">
              <h1
                className={slideTitle}
                style={{ left: "6.11%", top: "2.35%", fontSize: u(40) }}
              >
                REVENUS
              </h1>
              <div className="absolute w-full" style={{ top: "10.56%" }}>
                <PieChart
                  breakdown={incomeBreakdown}
                  center={selectedIncome}
                  onSelect={(category) => selectCategory("income", category)}
                />
              </div>
              <P3RList
                type="income"
                transactions={incomeTransactions}
                cursor={cursorOf("income")}
                categoryName={selectedIncomeCategory.name}
                emptyMessage="Aucun revenu ce mois-ci"
                onWheel={handleWheel}
              />
            </section>
          </div>
        </div>

        {/* Bouton d'ajout : fixe, dans le prolongement de la liste */}
        <button
          className="absolute"
          style={{
            left: "16.79%",
            top: "77.7%",
            width: u(323),
            height: u(44),
          }}
          onClick={() => {
            setSubmitError(null);
            setAddingTransaction(true);
          }}
        >
          <span
            className="absolute -scale-x-100"
            style={{
              inset: "-2.27% -0.38%",
              backgroundImage: "url(/home/button.svg)",
              backgroundSize: "100% 100%",
            }}
          />
          <span
            className="font-rodin-m relative text-white"
            style={{ fontSize: u(24), letterSpacing: u(-2.4) }}
          >
            Ajouter {currentSlide === 1 ? "une dépense" : "un revenu"}
          </span>
        </button>
      </div>

      {/* Menu bottom */}
      <Header />

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
