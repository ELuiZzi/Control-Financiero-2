import React, { useState, useEffect } from 'react';
import { Snapshot, TransactionType, TargetType } from './types';
import { SNAPSHOT_KEY, INITIAL_STATE } from './constants';
import { DB } from './db';
import { useStore } from './store';
import { BalanceCard } from './components/BalanceCard';
import { TransactionForm } from './components/TransactionForm';
import { HistoryList } from './components/HistoryList';
import { DataManagement } from './components/DataManagement';
import { MonthlyStats } from './components/MonthlyStats';
import { IconPiggyBank, IconTrendingUp, IconUser } from './components/Icons';
import { PredictiveDashboard } from './components/PredictiveDashboard';
import { SettingsModal } from './components/SettingsModal';
import { PortfolioChart } from './components/PortfolioChart';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

function App() {
  const store = useStore();
  const { 
    ahorro, personales, negocio, autoSplit, history, fixedExpenses,
    setInitialState, toggleAutoSplit, addTransaction, addFixedExpense, editFixedExpense, 
    deleteFixedExpense, processFloatingExpense, processFixedExpensesForToday, undoLastTransaction, resetState 
  } = store;

  // Derive state for components that need the AppState object
  const state = { ahorro, personales, negocio, autoSplit, history, fixedExpenses };

  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const initData = async () => {
      let loadedState = await DB.loadState();
      
      if (loadedState.inversion !== undefined && loadedState.negocio === undefined) {
         loadedState.negocio = loadedState.inversion;
         delete loadedState.inversion;
      }
      
      loadedState.ahorro = Number(loadedState.ahorro) || 0;
      loadedState.personales = Number(loadedState.personales) || 0;
      loadedState.negocio = Number(loadedState.negocio) || 0;
      loadedState.history = loadedState.history || [];
      loadedState.fixedExpenses = loadedState.fixedExpenses || [];
      
      setInitialState(loadedState);
      setIsLoading(false);
    };
    initData();
  }, [setInitialState]);

  useEffect(() => {
    if (!isLoading) {
      processFixedExpensesForToday();
    }
  }, [isLoading, processFixedExpensesForToday]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-brand-600">Inicializando Bóveda...</div>;
  }

  const total = ahorro + personales + negocio;

  const saveSnapshot = (name: string) => {
    const newSnap: Snapshot = { id: generateId(), name, date: new Date().toISOString(), state: JSON.parse(JSON.stringify(state)) };
    setSnapshots(prev => [newSnap, ...prev].slice(0, 50));
  };
  
  const importSnapshot = (snap: Snapshot) => setInitialState(snap.state);
  
  const deleteSnapshot = (id: string) => setSnapshots(prev => prev.filter(s => s.id !== id));

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === "object" && 'ahorro' in parsed) {
          if ('inversion' in parsed) {
             parsed.negocio = parsed.inversion;
             delete parsed.inversion;
          }
          if (Array.isArray(parsed.history)) {
             parsed.history = parsed.history.map((t: any) => ({
                 ...t, target: t.target === 'inversion' ? 'negocio' : t.target, tags: t.tags || []
             }));
          }
          if (Array.isArray(parsed.fixedExpenses)) {
             parsed.fixedExpenses = parsed.fixedExpenses.map((ex: any) => ({
                 ...ex, target: ex.target === 'inversion' ? 'negocio' : ex.target, tags: ex.tags || []
             }));
          }
          if (window.confirm("¿Migrar y sobrescribir los datos locales con el respaldo?")) {
              setInitialState(parsed);
              DB.saveState(parsed);
          }
        } else alert("Archivo corrupto o formato no válido para el sistema.");
      } catch (err: any) { alert("Fallo crítico en la lectura: " + err.message); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen pb-10 bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        
        {/* NIVEL 1: ALTA PRIORIDAD OPERATIVA (Decisiones Inmediatas) */}
        <PredictiveDashboard state={state} />

        <div className="mb-8">
            <TransactionForm 
                onAdd={addTransaction}
                autoSplit={autoSplit}
                onToggleAutoSplit={toggleAutoSplit}
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
                snapshots={snapshots}
                onSaveSnapshot={saveSnapshot}
                onImportSnapshot={importSnapshot}
                onDeleteSnapshot={deleteSnapshot}
                onImportFile={handleImportFile}
                onReset={resetState}
            />
        </div>
        
        <footer className="flex flex-col items-center text-xs text-gray-400 pb-4 mt-8 space-y-3">
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors bg-white rounded-full shadow-sm hover:shadow" title="Configurar porcentajes de split">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                 </svg>
             </button>
             <p>Motor de datos PWA activo (Lumtech OS).</p>
        </footer>

      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;