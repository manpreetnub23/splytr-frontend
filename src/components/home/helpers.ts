import type { Expense } from "../../api/api";
import type { DashboardBill } from "./types";

export const fmt = (value: number) => `Rs ${value.toFixed(2)}`;

export const getEntityId = (entity: string | { _id: string } | undefined) =>
  typeof entity === "string" ? entity : entity?._id ?? "";

export const getBill = (
  expense: Expense,
  meId: string,
  groupName: string
): DashboardBill | null => {
  const paidById = getEntityId(expense.paidBy);
  const myShare = expense.splits.find((split) => getEntityId(split.user) === meId)?.amount ?? 0;

  if (paidById === meId) {
    const amount = Math.max(expense.amount - myShare, 0);
    if (amount <= 0) {
      return null;
    }

    return {
      id: expense._id,
      title: expense.description?.trim() || "Shared expense",
      group: groupName,
      amount,
      type: "you_get",
      createdAt: expense.createdAt,
    };
  }

  const amount = Math.max(myShare, 0);
  if (amount <= 0) {
    return null;
  }

  return {
    id: expense._id,
    title: expense.description?.trim() || "Shared expense",
    group: groupName,
    amount,
    type: "you_owe",
    createdAt: expense.createdAt,
  };
};
