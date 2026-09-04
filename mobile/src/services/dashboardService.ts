import { supabase } from "../lib/supabase";

type ReceivableRow = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pending" | "partial" | "paid" | "cancelled";
  client:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type PaymentRow = {
  id: string;
  receivable_id: string;
  amount: number;
  paid_at: string;
};

export type MonthlyRevenue = {
  value: number;
  label: string;
  frontColor: string;
};

export type UpcomingReceivable = {
  id: string;
  description: string;
  clientName: string;
  dueDate: string;
  remaining: number;
  overdue: boolean;
  partial: boolean;
};

export type DashboardData = {
  receivedThisMonth: number;
  receivableAmount: number;
  overdueAmount: number;
  averageTicket: number;
  openCount: number;
  overdueCount: number;
  paymentCountThisMonth: number;
  monthlyRevenue: MonthlyRevenue[];
  upcomingReceivables: UpcomingReceivable[];
};

const MONTH_NAMES = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

function getClientName(client: ReceivableRow["client"]) {
  if (Array.isArray(client)) {
    return client[0]?.name ?? "Cliente";
  }

  return client?.name ?? "Cliente";
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createLastSixMonths() {
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const monthsAgo = 5 - index;

    const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: MONTH_NAMES[date.getMonth()],
      value: 0,
    };
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const [receivablesResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("receivables")
      .select(
        `
          id,
          description,
          amount,
          due_date,
          status,
          client:clients!receivables_client_id_fkey (
            name
          )
        `,
      )
      .neq("status", "cancelled")
      .order("due_date", { ascending: true }),

    supabase
      .from("payments")
      .select(
        `
          id,
          receivable_id,
          amount,
          paid_at
        `,
      )
      .order("paid_at", { ascending: false }),
  ]);

  if (receivablesResponse.error) {
    throw receivablesResponse.error;
  }

  if (paymentsResponse.error) {
    throw paymentsResponse.error;
  }

  const receivables = (receivablesResponse.data ??
    []) as unknown as ReceivableRow[];

  const payments = (paymentsResponse.data ?? []) as PaymentRow[];

  const today = new Date();
  const todayKey = getLocalDateKey(today);

  const paymentsThisMonth = payments.filter((payment) => {
    const paidAt = new Date(payment.paid_at);

    return (
      paidAt.getFullYear() === today.getFullYear() &&
      paidAt.getMonth() === today.getMonth()
    );
  });

  const receivedThisMonth = paymentsThisMonth.reduce(
    (total, payment) => total + Number(payment.amount),
    0,
  );

  const averageTicket =
    paymentsThisMonth.length > 0
      ? receivedThisMonth / paymentsThisMonth.length
      : 0;

  const paidByReceivable = new Map<string, number>();

  payments.forEach((payment) => {
    const currentValue = paidByReceivable.get(payment.receivable_id) ?? 0;

    paidByReceivable.set(
      payment.receivable_id,
      currentValue + Number(payment.amount),
    );
  });

  const calculatedReceivables = receivables.map((receivable) => {
    const amount = Number(receivable.amount);
    const paid = paidByReceivable.get(receivable.id) ?? 0;
    const remaining = Math.max(amount - paid, 0);

    return {
      id: receivable.id,
      description: receivable.description,
      clientName: getClientName(receivable.client),
      dueDate: receivable.due_date,
      remaining,
      overdue: remaining > 0 && receivable.due_date < todayKey,
      partial: paid > 0 && remaining > 0,
    };
  });

  const openReceivables = calculatedReceivables.filter(
    (receivable) => receivable.remaining > 0,
  );

  const overdueReceivables = openReceivables.filter(
    (receivable) => receivable.overdue,
  );

  const receivableAmount = openReceivables.reduce(
    (total, receivable) => total + receivable.remaining,
    0,
  );

  const overdueAmount = overdueReceivables.reduce(
    (total, receivable) => total + receivable.remaining,
    0,
  );

  const months = createLastSixMonths();

  payments.forEach((payment) => {
    const paidAt = new Date(payment.paid_at);

    const month = months.find(
      (item) =>
        item.year === paidAt.getFullYear() && item.month === paidAt.getMonth(),
    );

    if (month) {
      month.value += Number(payment.amount);
    }
  });

  const monthlyRevenue: MonthlyRevenue[] = months.map((month) => ({
    value: month.value,
    label: month.label,
    frontColor: "#17a398",
  }));

  const upcomingReceivables = [...openReceivables]
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, 4);

  return {
    receivedThisMonth,
    receivableAmount,
    overdueAmount,
    averageTicket,
    openCount: openReceivables.length,
    overdueCount: overdueReceivables.length,
    paymentCountThisMonth: paymentsThisMonth.length,
    monthlyRevenue,
    upcomingReceivables,
  };
}
