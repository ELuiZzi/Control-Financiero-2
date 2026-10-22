import { AppState, Balances, FixedExpense, SplitConfig, Transaction } from './types';
import { INITIAL_STATE } from './constants';
import { getDelta, sumBalances, ZERO_BALANCES } from './finance';

// Modelo de almacenamiento: los saldos no se guardan sueltos, se derivan de
//   saldos = base + Σ efecto (applied) de cada movimiento
// Así varios dispositivos pueden registrar movimientos sin conexión y, al sincronizar,
// nada se pisa ni se duplica (un mismo movimiento tiene siempre el mismo id).

export type LedgerTransaction = Transaction & { applied: Balances; order: number };

export interface Ledger {
  base: Balances; // saldos que no explica el historial (saldo inicial, ajustes antiguos)
  transactions: LedgerTransaction[];
  fixedExpenses: FixedExpense[];
  splitConfig: SplitConfig;
}

export type LedgerOp =
  | { kind: 'putTx'; tx: LedgerTransaction }
  | { kind: 'deleteTx'; id: string }
  | { kind: 'putFixed'; expense: FixedExpense }
  | { kind: 'deleteFixed'; id: string }
  | { kind: 'setSplit'; splitConfig: SplitConfig }
  | { kind: 'replace'; ledger: Ledger };

const diff = (a: Balances, b: Balances): Balances => {
  const neg = { ahorro: -b.ahorro, personales: -b.personales, negocio: -b.negocio };
  return sumBalances([a, neg]);
};

const totalCents = (b: Balances) =>
  Math.round(b.ahorro * 100) + Math.round(b.personales * 100) + Math.round(b.negocio * 100);

// Efecto de un movimiento antiguo que no guardó 'applied': se toma de la diferencia entre
// sus saldos y los del movimiento anterior si cuadra con el monto; si no, se recalcula.
// Tolerancia de 3 centavos: versiones anteriores redondeaban cada parte del split por separado.
const SNAPSHOT_TOLERANCE_CENTS = 3;
const inferApplied = (tx: Transaction, previous: Transaction | undefined, splitConfig: SplitConfig): Balances => {
  if (tx.balancesSnapshot && previous?.balancesSnapshot) {
    const d = diff(tx.balancesSnapshot, previous.balancesSnapshot);
    const expected = Math.round((tx.type === 'ingreso' ? tx.value : -tx.value) * 100);
    if (Math.abs(totalCents(d) - expected) <= SNAPSHOT_TOLERANCE_CENTS) return d;
  }
  return getDelta(tx.type, tx.target, tx.value, splitConfig);
};

// Convierte el formato de la app/exportaciones (saldos + historial, más reciente primero) a un
// libro contable. La base se calcula para que los saldos queden EXACTAMENTE iguales.
export const ledgerFromState = (state: AppState, now: number = Date.now()): Ledger => {
  const splitConfig = state.splitConfig || INITIAL_STATE.splitConfig!;
  const transactions: LedgerTransaction[] = state.history.map((tx, i) => ({
    ...tx,
    applied: tx.applied ?? inferApplied(tx, state.history[i + 1], splitConfig),
    order: now - i, // conserva el orden del historial
  }));
  const balances = { ahorro: state.ahorro, personales: state.personales, negocio: state.negocio };
  return {
    base: diff(balances, sumBalances(transactions.map(t => t.applied))),
    transactions,
    fixedExpenses: state.fixedExpenses,
    splitConfig,
  };
};

export const sortTransactions = (txs: LedgerTransaction[]) =>
  [...txs].sort((a, b) => b.order - a.order);

export const ledgerBalances = (ledger: Ledger): Balances =>
  sumBalances([ledger.base, ...ledger.transactions.map(t => t.applied)]);

// Formato de la app/exportaciones a partir del libro contable
export const stateFromLedger = (ledger: Ledger): AppState => ({
  ...ledgerBalances(ledger),
  history: sortTransactions(ledger.transactions),
  fixedExpenses: ledger.fixedExpenses,
  splitConfig: ledger.splitConfig,
});

export const emptyLedger = (): Ledger => ({
  base: { ...ZERO_BALANCES },
  transactions: [],
  fixedExpenses: [],
  splitConfig: INITIAL_STATE.splitConfig!,
});

const upsert = <T extends { id: string }>(list: T[], item: T) => {
  const i = list.findIndex(x => x.id === item.id);
  return i === -1 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
};

export const applyOps = (ledger: Ledger, ops: LedgerOp[]): Ledger =>
  ops.reduce<Ledger>((l, op) => {
    switch (op.kind) {
      case 'putTx': return { ...l, transactions: upsert(l.transactions, op.tx) };
      case 'deleteTx': return { ...l, transactions: l.transactions.filter(t => t.id !== op.id) };
      case 'putFixed': return { ...l, fixedExpenses: upsert(l.fixedExpenses, op.expense) };
      case 'deleteFixed': return { ...l, fixedExpenses: l.fixedExpenses.filter(e => e.id !== op.id) };
      case 'setSplit': return { ...l, splitConfig: op.splitConfig };
      case 'replace': return op.ledger;
    }
  }, ledger);
