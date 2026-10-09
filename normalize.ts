import { AppState, Balances, FixedExpense, SplitConfig, SplitPercentages, TargetType, Transaction } from './types';
import { roundMoney } from './finance';
import { generateId } from './utils';

// Valida y repara datos que vienen de fuera de la app (respaldos, puntos de restauración,
// versiones anteriores de la BD) antes de que lleguen al store.

const TARGETS: TargetType[] = ['auto', 'auto_producto', 'auto_servicio', 'ahorro', 'personales', 'negocio'];

const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const toTarget = (v: unknown): TargetType | null => {
  if (v === 'inversion') return 'negocio';
  return TARGETS.includes(v as TargetType) ? (v as TargetType) : null;
};

const toTags = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : [];

const toId = (v: unknown) => (typeof v === 'string' && v ? v : generateId());

const toBalances = (v: any): Balances | null => {
  if (!v || typeof v !== 'object') return null;
  const ahorro = toNumber(v.ahorro);
  const personales = toNumber(v.personales);
  const negocio = toNumber(v.negocio ?? v.inversion);
  if (ahorro === null || personales === null || negocio === null) return null;
  return { ahorro: roundMoney(ahorro), personales: roundMoney(personales), negocio: roundMoney(negocio) };
};

const toPercentages = (v: any): SplitPercentages | null => {
  const p = toBalances(v);
  if (!p || p.ahorro < 0 || p.personales < 0 || p.negocio < 0) return null;
  return p.ahorro + p.personales + p.negocio === 100 ? p : null;
};

const toSplitConfig = (v: any): SplitConfig | null => {
  const producto = toPercentages(v?.producto);
  const servicio = toPercentages(v?.servicio);
  return producto && servicio ? { producto, servicio } : null;
};

const toTransaction = (t: any): Transaction | null => {
  if (!t || typeof t !== 'object') return null;
  const value = toNumber(t.value);
  const target = toTarget(t.target);
  const date = typeof t.date === 'string' && !isNaN(Date.parse(t.date)) ? t.date : null;
  if (value === null || !target || !date || (t.type !== 'ingreso' && t.type !== 'gasto')) return null;

  const balancesSnapshot = toBalances(t.balancesSnapshot);
  const applied = toBalances(t.applied);
  return {
    id: toId(t.id),
    date,
    type: t.type,
    value: roundMoney(value),
    target,
    tags: toTags(t.tags),
    description: typeof t.description === 'string' ? t.description : undefined,
    ...(balancesSnapshot && { balancesSnapshot }),
    ...(applied && { applied }),
  };
};

const toFixedExpense = (e: any): FixedExpense | null => {
  if (!e || typeof e !== 'object') return null;
  const value = toNumber(e.value);
  const day = toNumber(e.day);
  const target = toTarget(e.target);
  const isFloating = e.isFloating === true;
  if (typeof e.name !== 'string' || !e.name.trim() || value === null || value <= 0 || !target) return null;
  if (!isFloating && day === null) return null;

  return {
    id: toId(e.id),
    name: e.name,
    value: roundMoney(value),
    day: Math.min(31, Math.max(1, Math.round(day ?? 1))),
    target,
    tags: toTags(e.tags),
    lastPaidMonthYear: typeof e.lastPaidMonthYear === 'string' ? e.lastPaidMonthYear : '',
    isFloating,
  };
};

export interface NormalizeResult {
  state: AppState;
  skipped: number; // registros inválidos descartados
}

// Devuelve null si el objeto no tiene saldos numéricos (no es un estado de la app).
export const normalizeState = (raw: unknown, fallbackSplit: SplitConfig): NormalizeResult | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as any;
  const balances = toBalances(r);
  if (!balances) return null;

  let skipped = 0;
  const keepValid = <T,>(list: unknown, parse: (item: any) => T | null): T[] => {
    if (!Array.isArray(list)) return [];
    return list.reduce<T[]>((acc, item) => {
      const parsed = parse(item);
      if (parsed) acc.push(parsed); else skipped++;
      return acc;
    }, []);
  };

  const history = keepValid(r.history, toTransaction);
  const fixedExpenses = keepValid(r.fixedExpenses, toFixedExpense);
  return {
    state: { ...balances, history, fixedExpenses, splitConfig: toSplitConfig(r.splitConfig) ?? fallbackSplit },
    skipped,
  };
};
