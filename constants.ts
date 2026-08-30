import { AppState } from './types';

export const STORAGE_KEY = "finance_state_v4_db"; // Forzamos una nueva instancia limpia
export const SNAPSHOT_KEY = "finance_snapshots_v4";

export const INITIAL_STATE: AppState = {
  ahorro: 3092.97,
  personales: 873.12,
  negocio: 948.19, // <- Eliminamos 'inversion'
  autoSplit: true,
  history: [],
  fixedExpenses: [],
  splitConfig: {
    producto: { ahorro: 12, personales: 21, negocio: 67 },
    servicio: { ahorro: 10, personales: 80, negocio: 10 }
  }
};