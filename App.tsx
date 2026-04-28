import React, { useState, useEffect } from 'react';
import { AppState, Snapshot, TargetType, TransactionType, Transaction, FixedExpense } from './types';
import { STORAGE_KEY, SNAPSHOT_KEY, INITIAL_STATE } from './constants';
import { DB } from './db';
import { BalanceCard } from './components/BalanceCard';
import { TransactionForm } from './components/TransactionForm';
import { HistoryList } from './components/HistoryList';
import { DataManagement } from './components/DataManagement';
import { MonthlyStats } from './components/MonthlyStats';
import { IconPiggyBank, IconTrendingUp, IconUser } from './components/Icons';
import { PredictiveDashboard } from './components/PredictiveDashboard';
import { TagAnalyzer } from './components/TagAnalyzer';
import { ReconciliationTool } from './components/ReconciliationTool';
import { FixedExpensesManager } from './components/FixedExpensesManager';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });
  const [isLoading, setIsLoading] = useState(true);

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
      
      setState(loadedState);
      setIsLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (isLoading || !state.fixedExpenses || state.fixedExpenses.length === 0) return;

    const now = new Date();
    const currentMY = `${now.getMonth()}-${now.getFullYear()}`;
    const today = now.getDate();
    
    let hasChanges = false;
    
    setState(prev => {
        let newState = { ...prev };
        newState.fixedExpenses = prev.fixedExpenses.map(ex => {
            if (today >= ex.day && ex.lastPaidMonthYear !== currentMY) {
                hasChanges = true;
                const value = ex.value;
                
                if (ex.target === 'ahorro') newState.ahorro -= value;
                else if (ex.target === 'negocio') newState.negocio -= value;
                else newState.personales -= value;

                const newT: Transaction = {
                    id: generateId(),
                    date: new Date().toISOString(),
                    type: 'gasto', 
                    value, 
                    target: ex.target,
                    tags: ex.tags && ex.tags.length > 0 ? ex.tags : ['gasto_fijo'],
                    description: `[FIJO] ${ex.name}`,
                    balancesSnapshot: { ahorro: newState.ahorro, personales: newState.personales, negocio: newState.negocio }
                };
                newState.history = [newT, ...newState.history].slice(0, 200);
                
                return { ...ex, lastPaidMonthYear: currentMY };
            }
            return ex;
        });
        return hasChanges ? newState : prev;
    });
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) DB.saveState(state);
  }, [state, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-brand-600">Inicializando Bóveda...</div>;
  }

  const handleAddTransaction = (amount: number, type: TransactionType, target: TargetType, description: string, tags: string[] = []) => {
    const value = Math.round(amount * 100) / 100;
    
    setState(prev => {
      let { ahorro, personales, negocio } = prev;

      if (type === 'ingreso') {
        if (prev.autoSplit && target === 'auto') {
          ahorro += Math.round(value * 0.12 * 100) / 100;
          personales += Math.round(value * 0.21 * 100) / 100;
          negocio += Math.round(value * 0.67 * 100) / 100;
        } else {
          if (target === 'ahorro') ahorro += value;
          else if (target === 'personales') personales += value;
          else if (target === 'negocio') negocio += value;
          else {
             ahorro += Math.round(value * 0.12 * 100) / 100;
             personales += Math.round(value * 0.21 * 100) / 100;
             negocio += Math.round(value * 0.67 * 100) / 100;
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

      return { ...prev, ahorro, personales, negocio, history: [newTransaction, ...prev.history].slice(0, 200) };
    });
  };

  const handleAddFixedExpense = (name: string, value: number, day: number, target: TargetType, tags: string[]) => {
      const newEx: FixedExpense = { id: generateId(), name, value, day, target, tags, lastPaidMonthYear: '' };
      setState(s => ({ ...s, fixedExpenses: [...s.fixedExpenses, newEx] }));
  };

  const handleDeleteFixedExpense = (id: string) => {
      setState(s => ({ ...s, fixedExpenses: s.fixedExpenses.filter(e => e.id !== id) }));
  };

  const handleEditFixedExpense = (id: string, name: string, value: number, day: number, target: TargetType, tags: string[]) => {
      setState(s => ({
          ...s,
          fixedExpenses: s.fixedExpenses.map(ex => 
              // Actualizamos los datos, pero mantenemos intacto 'lastPaidMonthYear' para no cobrarle doble
              ex.id === id ? { ...ex, name, value, day, target, tags } : ex
          )
      }));
  };

  const total = state.ahorro + state.personales + state.negocio;

  const saveSnapshot = (name: string) => {
    const newSnap: Snapshot = { id: generateId(), name, date: new Date().toISOString(), state: JSON.parse(JSON.stringify(state)) };
    setSnapshots(prev => [newSnap, ...prev].slice(0, 50));
  };
  const importSnapshot = (snap: Snapshot) => setState(snap.state);
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
          if (window.confirm("¿Migrar y sobrescribir los datos locales con el respaldo?")) setState(parsed);
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
                onAdd={handleAddTransaction}
                autoSplit={state.autoSplit}
                onToggleAutoSplit={(val) => setState(s => ({...s, autoSplit: val}))}
                history={state.history} 
            />
        </div>

        {/* NIVEL 2: PATRIMONIO Y DISTRIBUCIÓN (Auditoría Secundaria) */}
        <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Patrimonio Total</span>
            <div className="text-xl font-black text-gray-900">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-8">
             <BalanceCard 
                title="Lumtech (Capital de Negocio)" 
                amount={state.negocio} 
                icon={<IconTrendingUp />} 
                colorClass="bg-gradient-to-br from-blue-600 to-blue-800"
                percentage={total > 0 ? Math.round((state.negocio / total) * 100) : 0}
            />
             <BalanceCard 
                title="Operativa Personal" 
                amount={state.personales} 
                icon={<IconUser />} 
                colorClass="bg-gradient-to-br from-slate-500 to-slate-700"
                percentage={total > 0 ? Math.round((state.personales / total) * 100) : 0}
            />
            <BalanceCard 
                title="Reserva Intocable (Ahorro)" 
                amount={state.ahorro} 
                icon={<IconPiggyBank />} 
                colorClass="bg-gradient-to-br from-emerald-500 to-emerald-700" 
                percentage={total > 0 ? Math.round((state.ahorro / total) * 100) : 0}
            />
        </div>

        {/* NIVEL 3: ANÁLISIS TÁCTICO (Control de Fugas y Rendimiento) */}
        <TagAnalyzer state={state} />
        
        <div className="mt-6 mb-8">
           <MonthlyStats history={state.history} />
        </div>

        {/* NIVEL 4: ADMINISTRACIÓN DE SISTEMA (Mantenimiento) */}
        <FixedExpensesManager 
            expenses={state.fixedExpenses}
            onAdd={handleAddFixedExpense}
            onEdit={handleEditFixedExpense} 
            onDelete={handleDeleteFixedExpense}
        />

        <ReconciliationTool state={state} onAdd={handleAddTransaction} />

        <div className="mt-8">
            <HistoryList history={state.history} />
        </div>

        <div className="mt-8">
            <DataManagement 
                state={state} 
                snapshots={snapshots}
                onSaveSnapshot={saveSnapshot}
                onImportSnapshot={importSnapshot}
                onDeleteSnapshot={deleteSnapshot}
                onImportFile={handleImportFile}
                onReset={() => setState(INITIAL_STATE)}
            />
        </div>
        
        <footer className="text-center text-xs text-gray-400 pb-4 mt-8">
             <p>Motor de datos PWA activo (Lumtech OS).</p>
        </footer>

      </div>
    </div>
  );
}

export default App;