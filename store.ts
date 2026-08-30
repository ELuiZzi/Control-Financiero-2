import { create } from 'zustand';
import { AppState, Transaction, TransactionType, TargetType, FixedExpense } from './types';
import { INITIAL_STATE } from './constants';
import { DB } from './db';

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

export const useStore = create<StoreState>((set, get) => ({
  ...INITIAL_STATE,

  setInitialState: (state) => set(() => state),

  toggleAutoSplit: (val) => set(() => {
    const newState = { autoSplit: val };
    DB.saveState({ ...get(), ...newState });
    return newState;
  }),

  addTransaction: (amount, type, target, description, tags = []) => set((state) => {
    let { ahorro, personales, negocio } = state;
    const value = Math.round(amount * 100) / 100;

    if (type === 'ingreso') {
      if (target === 'auto' || target === 'auto_producto') {
        const cfg = state.splitConfig?.producto || { ahorro: 12, personales: 21, negocio: 67 };
        ahorro += Math.round(value * (cfg.ahorro / 100) * 100) / 100;
        personales += Math.round(value * (cfg.personales / 100) * 100) / 100;
        negocio += Math.round(value * (cfg.negocio / 100) * 100) / 100;
      } else if (target === 'auto_servicio') {
        const cfg = state.splitConfig?.servicio || { ahorro: 10, personales: 80, negocio: 10 };
        ahorro += Math.round(value * (cfg.ahorro / 100) * 100) / 100;
        personales += Math.round(value * (cfg.personales / 100) * 100) / 100;
        negocio += Math.round(value * (cfg.negocio / 100) * 100) / 100;
      } else {
        if (target === 'ahorro') ahorro += value;
        else if (target === 'personales') personales += value;
        else if (target === 'negocio') negocio += value;
        else {
          const cfg = state.splitConfig?.producto || { ahorro: 12, personales: 21, negocio: 67 };
          ahorro += Math.round(value * (cfg.ahorro / 100) * 100) / 100;
          personales += Math.round(value * (cfg.personales / 100) * 100) / 100;
          negocio += Math.round(value * (cfg.negocio / 100) * 100) / 100;
        }
      }
    } else {
      if (target === 'ahorro') ahorro -= value;
      else if (target === 'personales') personales -= value;
      else if (target === 'negocio') negocio -= value;
      else personales -= value; 
    }

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
    const newEx: FixedExpense = { id: generateId(), name, value, day, target, tags, lastPaidMonthYear: '', isFloating };
    const newState = { fixedExpenses: [...state.fixedExpenses, newEx] };
    DB.saveState({ ...state, ...newState });
    return newState;
  }),

  editFixedExpense: (id, name, value, day, target, tags, isFloating = false) => set((state) => {
    const newState = {
      fixedExpenses: state.fixedExpenses.map(ex => 
        ex.id === id ? { ...ex, name, value, day, target, tags, isFloating } : ex
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

    let { ahorro, personales, negocio } = state;
    const value = expense.value;

    if (expense.target === 'ahorro') ahorro -= value;
    else if (expense.target === 'negocio') negocio -= value;
    else personales -= value;

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
    const currentMY = `${now.getMonth()}-${now.getFullYear()}`;
    const today = now.getDate();
    
    let hasChanges = false;
    let newAhorro = state.ahorro;
    let newPersonales = state.personales;
    let newNegocio = state.negocio;
    let newHistory = [...state.history];

    const newFixedExpenses = state.fixedExpenses.map(ex => {
      if (!ex.isFloating && today >= ex.day && ex.lastPaidMonthYear !== currentMY) {
        hasChanges = true;
        const value = ex.value;
        
        if (ex.target === 'ahorro') newAhorro -= value;
        else if (ex.target === 'negocio') newNegocio -= value;
        else newPersonales -= value;

        const newT: Transaction = {
          id: generateId(),
          date: new Date().toISOString(),
          type: 'gasto', 
          value, 
          target: ex.target,
          tags: ex.tags && ex.tags.length > 0 ? ex.tags : ['gasto_fijo'],
          description: `[FIJO] ${ex.name}`,
          balancesSnapshot: { ahorro: newAhorro, personales: newPersonales, negocio: newNegocio }
        };
        newHistory = [newT, ...newHistory];
        
        return { ...ex, lastPaidMonthYear: currentMY };
      }
      return ex;
    });

    if (hasChanges) {
      const newState = {
        ahorro: newAhorro,
        personales: newPersonales,
        negocio: newNegocio,
        history: newHistory,
        fixedExpenses: newFixedExpenses
      };
      DB.saveState({ ...state, ...newState });
      return newState;
    }
    return state;
  }),

  undoLastTransaction: () => set((state) => {
    if (state.history.length === 0) return state;

    const last = state.history[0];
    
    let newAhorro = state.ahorro;
    let newPersonales = state.personales;
    let newNegocio = state.negocio;

    if (state.history.length > 1) {
        const prevBalances = state.history[1].balancesSnapshot;
        newAhorro = prevBalances.ahorro;
        newPersonales = prevBalances.personales;
        newNegocio = prevBalances.negocio;
    } else {
        const value = last.value;
        if (last.type === 'ingreso') {
            if (last.target === 'auto' || last.target === 'auto_producto') {
                const cfg = state.splitConfig?.producto || { ahorro: 12, personales: 21, negocio: 67 };
                newAhorro -= Math.round(value * (cfg.ahorro / 100) * 100) / 100;
                newPersonales -= Math.round(value * (cfg.personales / 100) * 100) / 100;
                newNegocio -= Math.round(value * (cfg.negocio / 100) * 100) / 100;
            } else if (last.target === 'auto_servicio') {
                const cfg = state.splitConfig?.servicio || { ahorro: 10, personales: 80, negocio: 10 };
                newAhorro -= Math.round(value * (cfg.ahorro / 100) * 100) / 100;
                newPersonales -= Math.round(value * (cfg.personales / 100) * 100) / 100;
                newNegocio -= Math.round(value * (cfg.negocio / 100) * 100) / 100;
            } else {
                if (last.target === 'ahorro') newAhorro -= value;
                else if (last.target === 'personales') newPersonales -= value;
                else if (last.target === 'negocio') newNegocio -= value;
                else {
                    const cfg = state.splitConfig?.producto || { ahorro: 12, personales: 21, negocio: 67 };
                    newAhorro -= Math.round(value * (cfg.ahorro / 100) * 100) / 100;
                    newPersonales -= Math.round(value * (cfg.personales / 100) * 100) / 100;
                    newNegocio -= Math.round(value * (cfg.negocio / 100) * 100) / 100;
                }
            }
        } else {
            if (last.target === 'ahorro') newAhorro += value;
            else if (last.target === 'personales') newPersonales += value;
            else if (last.target === 'negocio') newNegocio += value;
            else newPersonales += value;
        }
    }

    const newHistory = state.history.slice(1);
    const newState = {
        ahorro: newAhorro,
        personales: newPersonales,
        negocio: newNegocio,
        history: newHistory
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
