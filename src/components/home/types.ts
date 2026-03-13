export type BillType = "you_get" | "you_owe";

export type DashboardBill = {
  id: string;
  title: string;
  group: string;
  amount: number;
  type: BillType;
  createdAt: string;
};

export type DashboardTotals = {
  totalGet: number;
  totalOwe: number;
};
