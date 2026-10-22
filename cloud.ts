// Todo lo que depende de Firebase. Se carga con import() solo cuando está configurado.
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged,
  signInWithCredential, signInWithPopup, signInWithRedirect, signOut, User,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence, collection, connectFirestoreEmulator, doc, DocumentData, DocumentSnapshot,
  getDocFromServer, getDocsFromServer, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, QuerySnapshot, serverTimestamp, terminate, writeBatch, WriteBatch,
} from 'firebase/firestore';
import { firebaseConfig, useEmulators } from './cloudConfig';
import { INITIAL_STATE } from './constants';
import { getDelta, ZERO_BALANCES } from './finance';
import { Ledger, LedgerOp, LedgerTransaction } from './ledger';
import { Repo, SyncStatus } from './repo';
import { FixedExpense } from './types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Copia local persistente: la app funciona sin conexión y sincroniza al reconectar
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // Solo en compilaciones para emuladores (pruebas automáticas): iniciar sesión sin la ventana de Google
  (window as any).__emulatorSignIn = (sub: string, email: string) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true })));
}

// ---------- Autenticación ----------

export type CloudUser = Pick<User, 'uid' | 'email'>;

export const watchAuth = (cb: (user: CloudUser | null) => void) => onAuthStateChanged(auth, cb);

// Errores del inicio de sesión por redirección (si se usó en la visita anterior)
export const redirectResult = () => getRedirectResult(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e: any) {
    // Algunos navegadores/PWAs instaladas bloquean ventanas emergentes: se usa redirección
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
};

// Cierra sesión y borra la copia local de la nube de este dispositivo
export const signOutAndClear = async () => {
  await signOut(auth);
  await terminate(db);
  await clearIndexedDbPersistence(db);
};

// ---------- Datos ----------
// users/{uid}                    → { base, splitConfig, schemaVersion, updatedAt }
// users/{uid}/transactions/{id}  → movimiento (con 'applied' y 'order')
// users/{uid}/fixedExpenses/{id} → gasto fijo o flotante

const userRef = (uid: string) => doc(db, 'users', uid);
const txCol = (uid: string) => collection(db, 'users', uid, 'transactions');
const fixedCol = (uid: string) => collection(db, 'users', uid, 'fixedExpenses');

const toLedgerTx = (id: string, data: DocumentData, ledger: Pick<Ledger, 'splitConfig'>): LedgerTransaction => ({
  ...(data as LedgerTransaction),
  id,
  applied: data.applied ?? getDelta(data.type, data.target, data.value, ledger.splitConfig),
  order: typeof data.order === 'number' ? data.order : Date.parse(data.date) || 0,
});

const buildLedger = (
  user: DocumentSnapshot | undefined,
  txs: QuerySnapshot | { docs: { id: string; data(): DocumentData }[] },
  fixed: QuerySnapshot | { docs: { id: string; data(): DocumentData }[] },
): Ledger => {
  const u = user?.data();
  const splitConfig = u?.splitConfig ?? INITIAL_STATE.splitConfig!;
  return {
    base: u?.base ?? { ...ZERO_BALANCES },
    splitConfig,
    transactions: txs.docs.map(d => toLedgerTx(d.id, d.data(), { splitConfig })),
    fixedExpenses: fixed.docs.map(d => ({ ...(d.data() as FixedExpense), id: d.id })),
  };
};

// Lee directamente del servidor (no de la copia local) para decidir la migración.
// Devuelve null si la cuenta aún no tiene datos. Lanza error si no hay conexión.
export const readCloudLedger = async (uid: string): Promise<Ledger | null> => {
  const user = await getDocFromServer(userRef(uid));
  if (!user.exists()) return null;
  const [txs, fixed] = await Promise.all([getDocsFromServer(txCol(uid)), getDocsFromServer(fixedCol(uid))]);
  return buildLedger(user, txs, fixed);
};

const BATCH_LIMIT = 400; // Firestore admite hasta 500 escrituras por lote

export class FirestoreRepo implements Repo {
  private known: Ledger | null;
  private onStatus: (status: SyncStatus) => void = () => {};
  private lastStatus: SyncStatus;

  constructor(private uid: string, private email: string | null, knownLedger: Ledger | null = null) {
    this.known = knownLedger;
    this.lastStatus = { mode: 'cloud', email: email ?? undefined, pendingWrites: false, fromCache: true };
  }

  subscribe(onLedger: (ledger: Ledger) => void, onStatus: (status: SyncStatus) => void) {
    this.onStatus = onStatus;
    onStatus(this.lastStatus);
    let user: DocumentSnapshot | undefined;
    let txs: QuerySnapshot | undefined;
    let fixed: QuerySnapshot | undefined;
    let userData = '';

    const emit = (dataChanged: boolean) => {
      if (!user || !txs || !fixed) return;
      if (dataChanged) {
        this.known = buildLedger(user, txs, fixed);
        onLedger(this.known);
      }
      this.setStatus({
        pendingWrites: user.metadata.hasPendingWrites || txs.metadata.hasPendingWrites || fixed.metadata.hasPendingWrites,
        fromCache: user.metadata.fromCache || txs.metadata.fromCache || fixed.metadata.fromCache,
      });
    };
    const onError = (e: Error) => this.setStatus({ error: `No se pudo leer la nube: ${e.message}` });
    const opts = { includeMetadataChanges: true };

    const unsubs = [
      onSnapshot(userRef(this.uid), opts, s => {
        const first = !user;
        const data = JSON.stringify(s.data() ?? null);
        user = s;
        emit(first || data !== userData);
        userData = data;
      }, onError),
      onSnapshot(txCol(this.uid), opts, s => {
        const first = !txs;
        txs = s;
        emit(first || s.docChanges().length > 0);
      }, onError),
      onSnapshot(fixedCol(this.uid), opts, s => {
        const first = !fixed;
        fixed = s;
        emit(first || s.docChanges().length > 0);
      }, onError),
    ];
    return () => unsubs.forEach(u => u());
  }

  apply(ops: LedgerOp[]) {
    const writes: ((b: WriteBatch) => void)[] = [];
    const uid = this.uid;

    for (const op of ops) {
      switch (op.kind) {
        case 'putTx': writes.push(b => b.set(doc(txCol(uid), op.tx.id), op.tx)); break;
        case 'deleteTx': writes.push(b => b.delete(doc(txCol(uid), op.id))); break;
        case 'putFixed': writes.push(b => b.set(doc(fixedCol(uid), op.expense.id), op.expense)); break;
        case 'deleteFixed': writes.push(b => b.delete(doc(fixedCol(uid), op.id))); break;
        case 'setSplit':
          writes.push(b => b.set(userRef(uid), { splitConfig: op.splitConfig, updatedAt: serverTimestamp() }, { merge: true }));
          break;
        case 'replace': {
          const { ledger } = op;
          const keepTx = new Set(ledger.transactions.map(t => t.id));
          const keepFixed = new Set(ledger.fixedExpenses.map(e => e.id));
          for (const t of this.known?.transactions ?? []) if (!keepTx.has(t.id)) writes.push(b => b.delete(doc(txCol(uid), t.id)));
          for (const e of this.known?.fixedExpenses ?? []) if (!keepFixed.has(e.id)) writes.push(b => b.delete(doc(fixedCol(uid), e.id)));
          for (const t of ledger.transactions) writes.push(b => b.set(doc(txCol(uid), t.id), t));
          for (const e of ledger.fixedExpenses) writes.push(b => b.set(doc(fixedCol(uid), e.id), e));
          writes.push(b => b.set(userRef(uid), {
            schemaVersion: 1, base: ledger.base, splitConfig: ledger.splitConfig, updatedAt: serverTimestamp(),
          }));
          this.known = ledger;
          break;
        }
      }
    }

    // Todos los lotes se encolan de inmediato (también sin conexión); la promesa solo
    // se resuelve cuando el servidor los confirma.
    const commits: Promise<void>[] = [];
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      writes.slice(i, i + BATCH_LIMIT).forEach(w => w(batch));
      commits.push(batch.commit());
    }
    Promise.all(commits)
      .then(() => { if (this.lastStatus.error) this.setStatus({ error: undefined }); })
      .catch(e => this.setStatus({ error: `No se pudieron guardar cambios en la nube: ${e.message}` }));
  }

  private setStatus(patch: Partial<SyncStatus>) {
    const next = { ...this.lastStatus, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.lastStatus)) return;
    this.lastStatus = next;
    this.onStatus(next);
  }
}
