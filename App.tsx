import React, { useState, useEffect, useRef } from 'react';
import { AppState, Snapshot } from './types';
import { INITIAL_STATE } from './constants';
import { DB } from './db';
import { useStore } from './store';
import { normalizeState, NormalizeResult } from './normalize';
import { generateId } from './utils';
import { emptyLedger, Ledger, LedgerOp, ledgerFromState } from './ledger';
import { LocalRepo } from './repo';
import { isCloudConfigured } from './cloudConfig';
import type { CloudUser } from './cloud';
import { BalanceCard } from './components/BalanceCard';
import { TransactionForm } from './components/TransactionForm';
import { HistoryList } from './components/HistoryList';
import { DataManagement } from './components/DataManagement';
import { MonthlyStats } from './components/MonthlyStats';
import { IconPiggyBank, IconTrendingUp, IconUser } from './components/Icons';
import { PredictiveDashboard } from './components/PredictiveDashboard';
import { SettingsModal } from './components/SettingsModal';
import { PortfolioChart } from './components/PortfolioChart';
import { LoadingScreen, OfflineScreen, SetupScreen, SignInScreen } from './components/CloudGate';

type CloudModule = typeof import('./cloud');

const currentSplit = () => useStore.getState().splitConfig || INITIAL_STATE.splitConfig!;

// Lee y valida un archivo de respaldo exportado por la app (cualquier versión)
const readBackupFile = (file: File): Promise<NormalizeResult | null> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(normalizeState(JSON.parse(e.target?.result as string), currentSplit()));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const confirmBackup = (result: NormalizeResult | null, question: string): AppState | null => {
  if (!result) {
    alert("Archivo corrupto o formato no válido para el sistema.");
    return null;
  }
  const warning = result.skipped > 0 ? `\n\n⚠️ Se descartarán ${result.skipped} registros inválidos del respaldo.` : '';
  return window.confirm(`${question}${warning}`) ? result.state : null;
};

export default function App() {
  return isCloudConfigured() ? <CloudApp /> : <LocalApp />;
}

// Sin Firebase configurado: los datos viven solo en este dispositivo (como siempre)
function LocalApp() {
  const connect = useStore(s => s.connect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let disconnect: (() => void) | undefined;
    (async () => {
      const loaded = normalizeState(await DB.loadState(), INITIAL_STATE.splitConfig!);
      if (loaded && loaded.skipped > 0) console.warn(`Se descartaron ${loaded.skipped} registros inválidos al cargar`);
      if (cancelled) return;
      disconnect = connect(new LocalRepo(ledgerFromState(loaded ? loaded.state : INITIAL_STATE)));
      setReady(true);
    })();
    return () => { cancelled = true; disconnect?.(); };
  }, [connect]);

  return ready ? <MainApp /> : <LoadingScreen />;
}

type CloudPhase =
  | { name: 'loading' }
  | { name: 'signedOut' }
  | { name: 'checking' }
  | { name: 'offline'; message?: string }
  | { name: 'setup'; cloud: Ledger | null; local: AppState | null }
  | { name: 'ready' };

// Con Firebase: inicio de sesión → (primera vez en el dispositivo) migración → app
function CloudApp() {
  const connect = useStore(s => s.connect);
  const [cloud, setCloud] = useState<CloudModule | null>(null);
  const [user, setUser] = useState<CloudUser | null | undefined>(undefined);
  const [phase, setPhase] = useState<CloudPhase>({ name: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import('./cloud').then(mod => {
      setCloud(mod);
      mod.redirectResult().catch(e => alert(`No se pudo iniciar sesión: ${e?.code || e?.message}`));
      unsubscribe = mod.watchAuth(u => setUser(u ? { uid: u.uid, email: u.email } : null));
    }).catch(() => setPhase({ name: 'offline', message: 'No se pudo cargar el módulo de la nube. Revisa tu conexión.' }));
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!cloud || user === undefined) return;
    if (!user) { setPhase({ name: 'signedOut' }); return; }

    let cancelled = false;
    (async () => {
      const linked = await DB.getCloudLink();
      // Dispositivo ya vinculado a esta cuenta: se usa la nube directamente (funciona sin conexión)
      if (linked === user.uid) { if (!cancelled) start(null, []); return; }

      setPhase({ name: 'checking' });
      let cloudLedger: Ledger | null;
      try {
        cloudLedger = await cloud.readCloudLedger(user.uid);
      } catch (e: any) {
        if (!cancelled) setPhase({ name: 'offline', message: e?.code === 'permission-denied' ? 'La cuenta no tiene permiso para leer los datos. Revisa las reglas de Firestore.' : undefined });
        return;
      }
      // Los datos locales solo se ofrecen si este dispositivo nunca se vinculó a una cuenta
      const local = linked === null && await DB.hasState()
        ? normalizeState(await DB.loadState(), INITIAL_STATE.splitConfig!)?.state ?? null
        : null;
      if (cancelled) return;
      if (cloudLedger && !local) start(cloudLedger, []);
      else setPhase({ name: 'setup', cloud: cloudLedger, local });
    })();
    return () => { cancelled = true; };
  }, [cloud, user, attempt]);

  useEffect(() => () => disconnectRef.current?.(), []);

  const start = (known: Ledger | null, ops: LedgerOp[]) => {
    if (!cloud || !user) return;
    disconnectRef.current?.();
    const repo = new cloud.FirestoreRepo(user.uid, user.email, known);
    if (ops.length) repo.apply(ops); // se encola antes de escuchar: la primera lectura ya los incluye
    disconnectRef.current = connect(repo);
    DB.setCloudLink(user.uid);
    setPhase({ name: 'ready' });
  };

  const signOut = async (pendingWrites = false) => {
    if (!cloud) return;
    if (pendingWrites && !window.confirm('Hay cambios que todavía no se suben a la nube (sin conexión). Si cierras sesión se perderán. ¿Continuar?')) return;
    disconnectRef.current?.();
    disconnectRef.current = null;
    await cloud.signOutAndClear();
    window.location.reload();
  };

  if (phase.name === 'loading' || phase.name === 'checking' || !cloud) {
    return <LoadingScreen text={phase.name === 'checking' ? 'Revisando tu cuenta...' : undefined} />;
  }
  if (phase.name === 'signedOut') return <SignInScreen onSignIn={cloud.signInWithGoogle} />;
  if (phase.name === 'offline') return <OfflineScreen message={phase.message} onRetry={() => setAttempt(a => a + 1)} />;
  if (phase.name === 'setup') {
    const { cloud: cloudLedger, local } = phase;
    return (
      <SetupScreen
        email={user?.email}
        local={local}
        cloud={cloudLedger}
        onUseLocal={() => local && start(cloudLedger, [{ kind: 'replace', ledger: ledgerFromState(local) }])}
        onUseCloud={() => start(cloudLedger, [])}
        onStartFresh={() => start(cloudLedger, [{ kind: 'replace', ledger: emptyLedger() }])}
        onImportFile={async file => {
          try {
            const state = confirmBackup(await readBackupFile(file), cloudLedger ? '¿Reemplazar los datos de tu cuenta con este respaldo?' : '¿Subir este respaldo a tu cuenta?');
            if (state) start(cloudLedger, [{ kind: 'replace', ledger: ledgerFromState(state) }]);
          } catch (err: any) { alert("Fallo crítico en la lectura: " + err.message); }
        }}
        onSignOut={() => signOut()}
      />
    );
  }
  return <MainApp onSignOut={signOut} />;
}

function MainApp({ onSignOut }: { onSignOut?: (pendingWrites: boolean) => void }) {
  const store = useStore();
  const { 
    ahorro, personales, negocio, history, fixedExpenses, splitConfig, sync,
    replaceState, addTransaction, processFixedExpensesForToday, undoLastTransaction, resetState 
  } = store;

  // Derive state for components that need the AppState object (incluye splitConfig para respaldos)
  const state: AppState = { ahorro, personales, negocio, history, fixedExpenses, splitConfig };

  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Los puntos de restauración se guardan solo en este dispositivo
  useEffect(() => {
    DB.loadSnapshots().then(setSnapshots);
  }, []);

  useEffect(() => {
    if (snapshots) DB.saveSnapshots(snapshots);
  }, [snapshots]);

  // Cobra los gastos fijos vencidos al cargar, al cambiar la lista, al volver a la app y cada minuto
  useEffect(() => {
    processFixedExpensesForToday();
    const onVisible = () => { if (document.visibilityState === 'visible') processFixedExpensesForToday(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(processFixedExpensesForToday, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [fixedExpenses, processFixedExpensesForToday]);

  const total = ahorro + personales + negocio;

  const saveSnapshot = (name: string) => {
    const newSnap: Snapshot = { id: generateId(), name, date: new Date().toISOString(), state: JSON.parse(JSON.stringify(state)) };
    setSnapshots(prev => [newSnap, ...(prev || [])].slice(0, 50));
  };
  
  const importSnapshot = (snap: Snapshot) => {
    const restored = normalizeState(snap.state, currentSplit());
    if (!restored) return alert("El punto de restauración está dañado y no se puede aplicar.");
    replaceState(restored.state);
  };
  
  const deleteSnapshot = (id: string) => setSnapshots(prev => (prev || []).filter(s => s.id !== id));

  const handleImportFile = async (file: File) => {
    try {
      const next = confirmBackup(await readBackupFile(file), "¿Migrar y sobrescribir los datos actuales con el respaldo?");
      if (next) replaceState(next);
    } catch (err: any) { alert("Fallo crítico en la lectura: " + err.message); }
  };

  return (
    <div className="min-h-screen pb-10 bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        
        {/* NIVEL 1: ALTA PRIORIDAD OPERATIVA (Decisiones Inmediatas) */}
        <PredictiveDashboard state={state} />

        <div className="mb-8">
            <TransactionForm 
                onAdd={addTransaction}
                history={history} 
            />
        </div>

        {/* NIVEL 2: PATRIMONIO Y DISTRIBUCIÓN (Auditoría Secundaria) */}
        <div className="mb-6 flex flex-row items-center gap-5 sm:gap-6 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <PortfolioChart ahorro={ahorro} personales={personales} negocio={negocio} />
            <div className="flex flex-col flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Patrimonio Total</span>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight break-all leading-none">
                    ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-8">
             <BalanceCard 
                title="Lumtech (Capital de Negocio)" 
                amount={negocio} 
                icon={<IconTrendingUp />} 
                colorClass="bg-gradient-to-br from-blue-600 to-blue-800"
                percentage={total > 0 ? Math.round((negocio / total) * 100) : 0}
            />
             <BalanceCard 
                title="Operativa Personal" 
                amount={personales} 
                icon={<IconUser />} 
                colorClass="bg-gradient-to-br from-slate-500 to-slate-700"
                percentage={total > 0 ? Math.round((personales / total) * 100) : 0}
            />
            <BalanceCard 
                title="Reserva Intocable (Ahorro)" 
                amount={ahorro} 
                icon={<IconPiggyBank />} 
                colorClass="bg-gradient-to-br from-emerald-500 to-emerald-700" 
                percentage={total > 0 ? Math.round((ahorro / total) * 100) : 0}
            />
        </div>

        {/* NIVEL 3: ANÁLISIS TÁCTICO (Control de Fugas y Rendimiento) */}
        <div className="mt-6 mb-8">
           <MonthlyStats history={history} />
        </div>

        <div className="mt-8">
            <HistoryList history={history} onUndo={undoLastTransaction} />
        </div>

        <div className="mt-8">
            <DataManagement 
                state={state} 
                snapshots={snapshots || []}
                onSaveSnapshot={saveSnapshot}
                onImportSnapshot={importSnapshot}
                onDeleteSnapshot={deleteSnapshot}
                onImportFile={handleImportFile}
                onReset={resetState}
                sync={sync}
                onSignOut={onSignOut && (() => onSignOut(!!sync?.pendingWrites))}
            />
        </div>
        
        <footer className="flex flex-col items-center text-xs text-gray-400 pb-4 mt-8 space-y-3">
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors bg-white rounded-full shadow-sm hover:shadow" title="Configurar porcentajes de split">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                 </svg>
             </button>
             <SyncLabel />
        </footer>

      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

// Dónde están guardados los datos y si ya se sincronizaron
function SyncLabel() {
  const sync = useStore(s => s.sync);
  if (!sync) return null;
  if (sync.mode === 'local') return <p>Datos guardados solo en este dispositivo.</p>;
  if (sync.error) return <p className="text-red-500 font-bold text-center">{sync.error}</p>;
  if (sync.pendingWrites) return <p className="text-amber-600 font-bold">Cambios pendientes de subir (se enviarán al reconectar).</p>;
  if (sync.fromCache) return <p>Sin conexión: mostrando la copia de este dispositivo.</p>;
  return <p className="text-emerald-600 font-bold">✓ Sincronizado con tu cuenta</p>;
}