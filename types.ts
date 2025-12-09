export type TransactionType = 'ingreso' | 'gasto';

export type TargetType = 'auto' | 'ahorro' | 'personales' | 'inversion';

export interface Balances {
  ahorro: number;
  personales: number;
  inversion: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  value: number;
  target: TargetType;
  description?: string;
  balancesSnapshot: Balances; // The balances *after* this transaction
}

export interface AppState extends Balances {
  autoSplit: boolean;
  history: Transaction[];
}

export interface Snapshot {
  id: string;
  name: string;
  date: string;
  state: AppState;
}
