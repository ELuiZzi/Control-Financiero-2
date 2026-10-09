import { Balances, FixedExpense, SplitPercentages } from './types';

export const roundMoney = (v: number) => Math.round(v * 100) / 100;

const ACCOUNTS = ['ahorro', 'personales', 'negocio'] as const;

// Reparte un monto en centavos enteros (método del mayor residuo) para que
// las tres partes sumen exactamente el monto original, sin crear ni perder centavos.
export const splitAmount = (value: number, cfg: SplitPercentages): Balances => {
  const cents = Math.round(value * 100);
  const totalPct = ACCOUNTS.reduce((acc, k) => acc + cfg[k], 0);
  if (!(totalPct > 0)) return { ahorro: 0, personales: roundMoney(value), negocio: 0 };

  const raw = ACCOUNTS.map(k => (cents * cfg[k]) / totalPct);
  const parts = raw.map(Math.floor);
  let leftover = cents - parts.reduce((a, b) => a + b, 0);
  const byRemainder = raw
    .map((r, i) => ({ i, frac: r - parts[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let j = 0; leftover > 0; j++, leftover--) parts[byRemainder[j % parts.length].i]++;

  return { ahorro: parts[0] / 100, personales: parts[1] / 100, negocio: parts[2] / 100 };
};

export const addBalances = (a: Balances, b: Balances, sign: 1 | -1 = 1): Balances => ({
  ahorro: roundMoney(a.ahorro + sign * b.ahorro),
  personales: roundMoney(a.personales + sign * b.personales),
  negocio: roundMoney(a.negocio + sign * b.negocio),
});

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// Un gasto programado para el día 29-31 se cobra el último día en meses más cortos.
export const effectiveDueDay = (day: number, year: number, month: number) =>
  Math.min(day, daysInMonth(year, month));

// Formato histórico de lastPaidMonthYear: "<mes 0-11>-<año>".
export const monthKey = (year: number, month: number) => `${month}-${year}`;

export const previousMonthKey = (now: Date) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return monthKey(d.getFullYear(), d.getMonth());
};

const parseMonthKey = (key: string | undefined) => {
  const m = /^(\d{1,2})-(\d{4})$/.exec(key || '');
  return m ? { month: Number(m[1]), year: Number(m[2]) } : null;
};

export interface DueCharge {
  expense: FixedExpense;
  year: number;
  month: number;
  date: Date;
}

// Cargos pendientes de gastos fijos, incluyendo meses atrasados en los que no se abrió la app,
// ordenados del más antiguo al más reciente.
export const getDueCharges = (expenses: FixedExpense[], now: Date = new Date()): DueCharge[] => {
  const currentIdx = now.getFullYear() * 12 + now.getMonth();
  const charges: DueCharge[] = [];

  for (const expense of expenses) {
    if (expense.isFloating) continue;
    const last = parseMonthKey(expense.lastPaidMonthYear);
    // Sin pago registrado (datos anteriores): solo se evalúa el mes en curso.
    const startIdx = last ? last.year * 12 + last.month + 1 : currentIdx;

    for (let idx = startIdx; idx <= currentIdx; idx++) {
      const year = Math.floor(idx / 12);
      const month = idx % 12;
      const dueDay = effectiveDueDay(expense.day, year, month);
      if (idx === currentIdx && now.getDate() < dueDay) break;
      charges.push({ expense, year, month, date: new Date(year, month, dueDay, 12) });
    }
  }

  return charges.sort((a, b) => a.date.getTime() - b.date.getTime());
};
