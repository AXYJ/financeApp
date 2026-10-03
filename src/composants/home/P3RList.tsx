"use client";

import type { JSX, WheelEvent } from "react";
import type { Transaction } from "@/type/type";
import { u } from "./u";

// Les 3 emplacements visibles de la maquette (en px de la maquette, relatifs au
// haut de la liste), plus un emplacement "sorti par le haut" (-1) et un
// "pas encore entré par le bas" (3) : ils sont rendus invisibles pour que le
// passage d'un emplacement à l'autre s'anime en CSS au lieu de sauter.
const SLOTS: Record<number, { x: number; y: number }> = {
  [-1]: { x: -16, y: -85 },
  0: { x: 0, y: 0 },
  1: { x: 16.9, y: 85 },
  2: { x: 32.8, y: 168 },
  3: { x: 48.7, y: 251 },
};

// Décimales seulement si nécessaires : 15 → "15", 12.5 → "12,50".
function formatAmount(amount: number): string {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(".", ",");
}

// Réduit la taille des gros montants pour qu'ils tiennent dans la ligne.
function amountFontSize(text: string): number {
  if (text.length <= 4) return 48;
  if (text.length <= 6) return 36;
  return 28;
}

function Row({
  transaction,
  slot,
  categoryName,
}: {
  transaction: Transaction;
  slot: number;
  categoryName: string;
}): JSX.Element {
  const active = slot === 0;
  const visible = slot >= 0 && slot <= 2;
  const position = SLOTS[slot];
  const amount = formatAmount(transaction.amount);

  return (
    <div
      className="absolute transition-all duration-300 ease-out"
      style={{
        left: u(position.x),
        top: u(position.y),
        width: u(333.182),
        height: u(69),
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="absolute inset-0 -scale-x-100 transition-opacity duration-300"
        style={{
          backgroundImage: "url(/home/row-active.svg)",
          backgroundSize: "100% 100%",
          opacity: active ? 1 : 0,
        }}
      />
      <div
        className="absolute -scale-x-100 transition-opacity duration-300"
        style={{
          left: 0,
          top: u(1.5),
          width: u(328.182),
          height: u(66),
          backgroundImage: "url(/home/row-inactive.svg)",
          backgroundSize: "100% 100%",
          opacity: active ? 0 : 1,
        }}
      />
      <div
        className={`relative flex h-full items-center justify-between gap-2 transition-colors duration-300 ${
          active ? "text-black" : "text-turquoise"
        }`}
        style={{ paddingLeft: u(22), paddingRight: u(26) }}
      >
        <span
          className="font-newrodin-db min-w-0 truncate"
          style={{ fontSize: u(32), letterSpacing: u(-1.5) }}
        >
          {transaction.note || categoryName}
        </span>
        <span
          className="font-rodin-ub shrink-0"
          style={{ fontSize: u(amountFontSize(amount)) }}
        >
          {amount}
        </span>
      </div>
    </div>
  );
}

// Liste "curseur" façon P3R : `cursor` est l'index de la transaction active
// (celle du haut, en blanc). Seules 3 lignes sont visibles à la fois.
export default function P3RList({
  type,
  transactions,
  cursor,
  categoryName,
  emptyMessage,
  onWheel,
}: {
  type: "expense" | "income";
  transactions: Transaction[];
  cursor: number;
  categoryName: string;
  emptyMessage: string;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
}): JSX.Element {
  return (
    <div
      data-p3r-list={type}
      onWheel={onWheel}
      className="absolute"
      style={{
        left: "4.07%",
        top: "47.77%",
        width: u(361),
        height: u(234),
      }}
    >
      {transactions.length === 0 ? (
        <p className="text-center text-zinc-300">{emptyMessage}</p>
      ) : (
        transactions.map((transaction, index) => {
          const slot = index - cursor;
          if (slot < -1 || slot > 3) return null;
          return (
            <Row
              key={transaction.id}
              transaction={transaction}
              slot={slot}
              categoryName={categoryName}
            />
          );
        })
      )}
    </div>
  );
}
