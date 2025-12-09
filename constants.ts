import { AppState } from './types';

export const STORAGE_KEY = "finance_state_v2";
export const SNAPSHOT_KEY = "finance_snapshots_v2";

export const INITIAL_STATE: AppState = {
  ahorro: 3092.97,
  personales: 873.12,
  inversion: 948.19,
  autoSplit: true,
  history: []
};
