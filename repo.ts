import { DB } from './db';
import { applyOps, Ledger, LedgerOp, stateFromLedger } from './ledger';

export interface SyncStatus {
  mode: 'local' | 'cloud';
  email?: string;
  pendingWrites: boolean; // hay cambios que aún no llegan a la nube
  fromCache: boolean;     // los datos mostrados vienen de la copia local (sin conexión)
  error?: string;
}

// Dónde viven los datos: solo en este dispositivo (LocalRepo) o en Firestore (cloud.ts)
export interface Repo {
  subscribe(onLedger: (ledger: Ledger) => void, onStatus: (status: SyncStatus) => void): () => void;
  apply(ops: LedgerOp[]): void;
}

// Modo sin cuenta: guarda en IndexedDB con el mismo formato de siempre (saldos + historial)
export class LocalRepo implements Repo {
  private listeners = new Set<(ledger: Ledger) => void>();

  constructor(private ledger: Ledger) {}

  subscribe(onLedger: (ledger: Ledger) => void, onStatus: (status: SyncStatus) => void) {
    this.listeners.add(onLedger);
    onStatus({ mode: 'local', pendingWrites: false, fromCache: false });
    onLedger(this.ledger);
    return () => { this.listeners.delete(onLedger); };
  }

  apply(ops: LedgerOp[]) {
    this.ledger = applyOps(this.ledger, ops);
    this.listeners.forEach(l => l(this.ledger));
    DB.saveState(stateFromLedger(this.ledger));
  }
}
