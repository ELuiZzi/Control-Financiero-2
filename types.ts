export type TransactionType = 'ingreso' | 'gasto';

// Reestructuración de destinos de capital
export type TargetType = 'auto' | 'ahorro' | 'personales' | 'negocio';

export interface Balances {
  ahorro: number;
  personales: number;
  negocio: number; // Reemplaza a 'inversion'
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  value: number;
  target: TargetType;
  tags: string[]; // Nuevo: Vector para sub-categorías (ej. ['suscripcion', 'software'])
  description?: string;
  balancesSnapshot: Balances; 
}

export interface FixedExpense {
  id: string;
  name: string;
  value: number;
  day: number;
  target: TargetType;
  tags: string[];
  lastPaidMonthYear: string;
  isFloating?: boolean;
}

export interface AppState extends Balances {
  autoSplit: boolean;
  history: Transaction[];
  fixedExpenses: FixedExpense[]; // Formalizamos los gastos fijos en la interfaz principal
}

export interface Snapshot {
  id: string;
  name: string;
  date: string;
  state: AppState;
}