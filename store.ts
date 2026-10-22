import { create } from 'zustand';
import { AppState, Balances, TransactionType, TargetType, FixedExpense, SplitConfig } from './types';
import { INITIAL_STATE } from './constants';
import { addBalances, getDelta, getDueCharges, monthKey, previousMonthKey, roundMoney } from './finance';
import { applyOps, emptyLedger, Ledger, LedgerOp, LedgerTransaction, ledgerFromState, stateFromLedger } from './ledger';
import { Repo, SyncStatus } from './repo';
import { generateId } from './utils';

interface Actions {
  connect: (repo: Repo) => () => void;
  replaceState: (state: AppState) => void;
  addTransaction: (amount: number, type: TransactionType, target: TargetType, description: string, tags?: string[]) => void;
  addFixedExpense: (name: string, value: number, day: number, target: TargetType, tags: string[], isFloating?: boolean) => void;
  editFixedExpense: (id: string, name: string, value: number, day: number, target: TargetType, tags: string[], isFloating?: boolean) => void;
  deleteFixedExpense: (id: string) => void;
  processFloatingExpense: (id: string) => void;
  processFixedExpensesForToday: () => void;
  undoLastTransaction: () => void;
  updateSplitConfig: (config: AppState['splitConfig']) => void;
  resetState: () => void;
}

type StoreState = AppState & Actions & {
  ledger: Ledger;
  sync: SyncStatus | null;
};

let repo: Repo | null = null;

const initialLedger = ledgerFromState(INITIAL_STATE);

export const useStore = create<StoreState>((set, get) => {
  const setLedger = (ledger: Ledger) => set({ ledger, ...stateFromLedger(ledger) });

  // Aplica los cambios al instante en pantalla y los manda al almacenamiento activo
  const commit = (ops: LedgerOp[]) => {
    if (ops.length === 0) return;
    setLedger(applyOps(get().ledger, ops));
    repo?.apply(ops);
  };

  const newTx = (fields: Omit<LedgerTransaction, 'balancesSnapshot' | 'order'>, balancesAfter: Balances, order = Date.now()): LedgerTransaction => ({
    ...fields,
    balancesSnapshot: balancesAfter,
    order,
  });

  const splitConfig = () => get().ledger.splitConfig;

  return {
    ...stateFromLedger(initialLedger),
    ledger: initialLedger,
    sync: null,

    connect: (r) => {
      repo = r;
      const unsubscribe = r.subscribe(setLedger, sync => set({ sync }));
      return () => {
        unsubscribe();
        if (repo === r) repo = null;
      };
    },

    // Importar respaldo, restaurar un punto o migrar: reemplaza todo conservando los saldos exactos
    replaceState: (state) => commit([{ kind: 'replace', ledger: ledgerFromState(state) }]),

    addTransaction: (amount, type, target, description, tags = []) => {
      const value = roundMoney(amount);
      if (!(value > 0)) return;
      const applied = getDelta(type, target, value, splitConfig());
      const tx = newTx({
        id: generateId(),
        date: new Date().toISOString(),
        type,
        value,
        target,
        tags,
        description: description.trim() || undefined,
        applied,
      }, addBalances(get(), applied));
      commit([{ kind: 'putTx', tx }]);
    },

    addFixedExpense: (name, value, day, target, tags, isFloating = false) => {
      if (!(value > 0)) return;
      // El primer mes cobrable es el actual: se marca el anterior como pagado.
      const lastPaidMonthYear = isFloating ? '' : previousMonthKey(new Date());
      const expense: FixedExpense = { id: generateId(), name, value, day, target, tags, lastPaidMonthYear, isFloating };
      commit([{ kind: 'putFixed', expense }]);
    },

    editFixedExpense: (id, name, value, day, target, tags, isFloating = false) => {
      if (!(value > 0)) return;
      const ex = get().fixedExpenses.find(e => e.id === id);
      if (!ex) return;
      commit([{
        kind: 'putFixed',
        expense: {
          ...ex, name, value, day, target, tags, isFloating,
          // Un flotante convertido en fijo empieza a cobrarse este mes, sin meses atrasados.
          lastPaidMonthYear: ex.isFloating && !isFloating ? previousMonthKey(new Date()) : ex.lastPaidMonthYear
        }
      }]);
    },

    deleteFixedExpense: (id) => commit([{ kind: 'deleteFixed', id }]),

    processFloatingExpense: (id) => {
      const expense = get().fixedExpenses.find(e => e.id === id);
      if (!expense) return;
      const applied = getDelta('gasto', expense.target, expense.value, splitConfig());
      const tx = newTx({
        // id fijo: si dos dispositivos lo pagan a la vez, cuenta una sola vez
        id: `float_${expense.id}`,
        date: new Date().toISOString(),
        type: 'gasto',
        value: expense.value,
        target: expense.target,
        tags: expense.tags && expense.tags.length > 0 ? expense.tags : ['flotante'],
        description: `[EJECUTADO] ${expense.name}`,
        applied,
      }, addBalances(get(), applied));
      commit([{ kind: 'putTx', tx }, { kind: 'deleteFixed', id }]);
    },

    processFixedExpensesForToday: () => {
      const { fixedExpenses } = get();
      if (!fixedExpenses || fixedExpenses.length === 0) return;

      const now = new Date();
      const charges = getDueCharges(fixedExpenses, now);
      if (charges.length === 0) return;

      const currentMY = monthKey(now.getFullYear(), now.getMonth());
      let balances: Balances = { ahorro: get().ahorro, personales: get().personales, negocio: get().negocio };
      const ops: LedgerOp[] = [];
      const paidMonths: Record<string, string> = {};
      const baseOrder = Date.now();

      // Se aplican en orden cronológico para que cada balancesSnapshot sea consistente.
      charges.forEach(({ expense: ex, year, month, date }, i) => {
        const paidMY = monthKey(year, month);
        const applied = getDelta('gasto', ex.target, ex.value, splitConfig());
        balances = addBalances(balances, applied);
        ops.push({
          kind: 'putTx',
          tx: newTx({
            // id fijo por gasto y mes: el mismo cargo nunca se registra dos veces
            id: `fixed_${ex.id}_${year}_${month + 1}`,
            date: date.toISOString(),
            type: 'gasto',
            value: ex.value,
            target: ex.target,
            tags: ex.tags && ex.tags.length > 0 ? ex.tags : ['gasto_fijo'],
            description: paidMY === currentMY ? `[FIJO] ${ex.name}` : `[FIJO] ${ex.name} (atrasado ${month + 1}/${year})`,
            applied,
          }, balances, baseOrder + i),
        });
        paidMonths[ex.id] = paidMY;
      });

      fixedExpenses.forEach(ex => {
        if (paidMonths[ex.id]) ops.push({ kind: 'putFixed', expense: { ...ex, lastPaidMonthYear: paidMonths[ex.id] } });
      });
      commit(ops);
    },

    // Como los saldos se derivan del historial, deshacer es simplemente quitar el último movimiento
    undoLastTransaction: () => {
      const last = get().history[0];
      if (last) commit([{ kind: 'deleteTx', id: last.id }]);
    },

    updateSplitConfig: (config) => {
      if (config) commit([{ kind: 'setSplit', splitConfig: config as SplitConfig }]);
    },

    resetState: () => commit([{ kind: 'replace', ledger: emptyLedger() }]),
  };
});
