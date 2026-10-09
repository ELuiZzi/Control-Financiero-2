import { create } from 'zustand';
import { AppState, Balances, Transaction, TransactionType, TargetType, FixedExpense } from './types';
import { INITIAL_STATE } from './constants';
import { DB } from './db';
import { addBalances, getDueCharges, monthKey, previousMonthKey, roundMoney, splitAmount } from './finance';

interface Actions {
  setInitialState: (state: AppState) => void;
  toggleAutoSplit: (val: boolean) => void;
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

type StoreState = AppState & Actions;

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Efecto (con signo) de un movimiento sobre cada cuenta.
const getDelta = (type: TransactionType, target: TargetType, value: number, splitConfig: AppState['splitConfig']): Balances => {
  if (type === 'ingreso' && (target === 'ahorro' || target === 'personales' || target === 'negocio')) {
    return { ahorro: 0, personales: 0, negocio: 0, [target]: value };
  }
  if (type === 'ingreso') {
    const cfg = target === 'auto_servicio'
      ? splitConfig?.servicio || INITIAL_STATE.splitConfig!.servicio
      : splitConfig?.producto || INITIAL_STATE.splitConfig!.producto;
    return splitAmount(value, cfg);
  }
  const account = target === 'ahorro' || target === 'negocio' ? target : 'personales';
  return { ahorro: 0, personales: 0, negocio: 0, [account]: -value };
};

export const useStore = create<StoreState>((set, get) => ({
  ...INITIAL_STATE,

  setInitialState: (state) => set(() => state),

  toggleAutoSplit: (val) => set(() => {
    const newState = { autoSplit: val };
    DB.saveState({ ...get(), ...newState });
    return newState;
  }),

  addTransaction: (amount, type, target, description, tags = []) => set((state) => {
    const value = roundMoney(amount);
    const { ahorro, personales, negocio } = addBalances(state, getDelta(type, target, value, state.splitConfig));

    const newTransaction: Transaction = {
      id: generateId(),
      date: new Date().toISOString(),
      type,
      value,
      target,
      tags,
      description: description.trim() || undefined,
      balancesSnapshot: { ahorro, personales, negocio }
    };

    const newState = { 
      ahorro, 
      personales, 
      negocio, 
      history: [newTransaction, ...state.history] 
    };
    
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  addFixedExpense: (name, value, day, target, tags, isFloating = false) => set((state) => {
    // El primer mes cobrable es el actual: se marca el anterior como pagado.
    const lastPaidMonthYear = isFloating ? '' : previousMonthKey(new Date());
    const newEx: FixedExpense = { id: generateId(), name, value, day, target, tags, lastPaidMonthYear, isFloating };
    const newState = { fixedExpenses: [...state.fixedExpenses, newEx] };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  editFixedExpense: (id, name, value, day, target, tags, isFloating = false) => set((state) => {
    const newState = {
      fixedExpenses: state.fixedExpenses.map(ex => 
        ex.id !== id ? ex : {
          ...ex, name, value, day, target, tags, isFloating,
          // Un flotante convertido en fijo empieza a cobrarse este mes, sin meses atrasados.
          lastPaidMonthYear: ex.isFloating && !isFloating ? previousMonthKey(new Date()) : ex.lastPaidMonthYear
        }
      )
    };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  deleteFixedExpense: (id) => set((state) => {
    const newState = { fixedExpenses: state.fixedExpenses.filter(e => e.id !== id) };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  processFloatingExpense: (id) => set((state) => {
    const expense = state.fixedExpenses.find(e => e.id === id);
    if (!expense) return state;

    const value = expense.value;
    const { ahorro, personales, negocio } = addBalances(state, getDelta('gasto', expense.target, value, state.splitConfig));

    const newT: Transaction = {
      id: generateId(),
      date: new Date().toISOString(),
      type: 'gasto', 
      value, 
      target: expense.target,
      tags: expense.tags && expense.tags.length > 0 ? expense.tags : ['flotante'],
      description: `[EJECUTADO] ${expense.name}`,
      balancesSnapshot: { ahorro, personales, negocio }
    };

    const newState = {
      ahorro,
      personales,
      negocio,
      history: [newT, ...state.history],
      fixedExpenses: state.fixedExpenses.filter(e => e.id !== id)
    };
    
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  processFixedExpensesForToday: () => set((state) => {
    if (!state.fixedExpenses || state.fixedExpenses.length === 0) return state;

    const now = new Date();
    const charges = getDueCharges(state.fixedExpenses, now);
    if (charges.length === 0) return state;

    const currentMY = monthKey(now.getFullYear(), now.getMonth());
    let balances: Balances = { ahorro: state.ahorro, personales: state.personales, negocio: state.negocio };
    let newHistory = [...state.history];
    const paidMonths: Record<string, string> = {};

    // Se aplican en orden cronológico para que cada balancesSnapshot sea consistente.
    for (const { expense: ex, year, month, date } of charges) {
      const paidMY = monthKey(year, month);
      balances = addBalances(balances, getDelta('gasto', ex.target, ex.value, state.splitConfig));

      const newT: Transaction = {
        id: generateId(),
        date: date.toISOString(),
        type: 'gasto',
        value: ex.value,
        target: ex.target,
        tags: ex.tags && ex.tags.length > 0 ? ex.tags : ['gasto_fijo'],
        description: paidMY === currentMY ? `[FIJO] ${ex.name}` : `[FIJO] ${ex.name} (atrasado ${month + 1}/${year})`,
        balancesSnapshot: balances
      };
      newHistory = [newT, ...newHistory];
      paidMonths[ex.id] = paidMY;
    }

    const newState = {
      ...balances,
      history: newHistory,
      fixedExpenses: state.fixedExpenses.map(ex =>
        paidMonths[ex.id] ? { ...ex, lastPaidMonthYear: paidMonths[ex.id] } : ex
      )
    };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  undoLastTransaction: () => set((state) => {
    if (state.history.length === 0) return state;

    const last = state.history[0];
    const prevSnapshot = state.history[1]?.balancesSnapshot;
    const balances = prevSnapshot
      ? { ahorro: prevSnapshot.ahorro, personales: prevSnapshot.personales, negocio: prevSnapshot.negocio }
      : addBalances(state, getDelta(last.type, last.target, last.value, state.splitConfig), -1);

    const newState = {
        ...balances,
        history: state.history.slice(1)
    };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  updateSplitConfig: (config) => set((state) => {
    const newState = { splitConfig: config };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  resetState: () => {
    DB.saveState(INITIAL_STATE);
    set(() => INITIAL_STATE);
  }
}));
