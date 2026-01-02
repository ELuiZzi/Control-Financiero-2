import React, { useState, useEffect } from 'react';
import { AppState, Snapshot, TargetType, TransactionType, Transaction } from './types';
import { STORAGE_KEY, SNAPSHOT_KEY, INITIAL_STATE } from './constants';
import { BalanceCard } from './components/BalanceCard';
import { TransactionForm } from './components/TransactionForm';
import { HistoryList } from './components/HistoryList';
import { DataManagement } from './components/DataManagement';
import { MonthlyStats } from './components/MonthlyStats';
import { IconPiggyBank, IconTrendingUp, IconUser } from './components/Icons';

function App() {
  // Load State
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_STATE;
    } catch (e) {
      console.error("Error reading storage", e);
      return INITIAL_STATE;
    }
  });

  // Load Snapshots
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving state", e);
    }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
    } catch (e) {
      console.error("Error saving snapshots", e);
    }
  }, [snapshots]);

  // Main Logic
  const handleAddTransaction = (amount: number, type: TransactionType, target: TargetType, description: string) => {
    const value = Math.round(amount * 100) / 100;
    
    setState(prev => {
      let { ahorro, personales, inversion } = prev;

      if (type === 'ingreso') {
        if (prev.autoSplit && target === 'auto') {
          // NUEVOS PORCENTAJES: 12% Ahorro, 21% Gastos (Personales), 67% Inversión
          ahorro += Math.round(value * 0.12 * 100) / 100;
          personales += Math.round(value * 0.21 * 100) / 100;
          inversion += Math.round(value * 0.67 * 100) / 100;
        } else {
          // Manual target
          if (target === 'ahorro') ahorro += value;
          else if (target === 'personales') personales += value;
          else if (target === 'inversion') inversion += value;
          else {
             // Fallback logic
             ahorro += Math.round(value * 0.12 * 100) / 100;
             personales += Math.round(value * 0.21 * 100) / 100;
             inversion += Math.round(value * 0.67 * 100) / 100;
          }
        }
      } else {
        // Gasto
        if (target === 'ahorro') ahorro -= value;
        else if (target === 'personales') personales -= value;
        else if (target === 'inversion') inversion -= value;
        else personales -= value; // Default fallback
      }

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        type,
        value,
        target,
        description: description.trim() || undefined,
        balancesSnapshot: { ahorro, personales, inversion }
      };

      const newHistory = [newTransaction, ...prev.history].slice(0, 200);

      return {
        ...prev,
        ahorro,
        personales,
        inversion,
        history: newHistory
      };
    });
  };

  // Helpers
  const total = state.ahorro + state.personales + state.inversion;

  const saveSnapshot = (name: string) => {
    const newSnap: Snapshot = {
        id: crypto.randomUUID(),
        name,
        date: new Date().toISOString(),
        state: JSON.parse(JSON.stringify(state)) // Deep copy
    };
    setSnapshots(prev => [newSnap, ...prev].slice(0, 50));
  };

  const importSnapshot = (snap: Snapshot) => {
      setState(snap.state);
  };

  const deleteSnapshot = (id: string) => {
      setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === "object" && 'ahorro' in parsed) {
          if (window.confirm("¿Reemplazar los saldos actuales con los datos importados?")) setState(parsed);
        } else alert("Archivo inválido o formato incorrecto");
      } catch (err: any) {
        alert("Error leyendo archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-md mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Finance Flow</h1>
            <p className="text-gray-500 text-sm mt-1">Control total de tus finanzas</p>
        </header>

        {/* Total Display */}
        <div className="mb-6 text-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Patrimonio Total</span>
            <div className="text-4xl font-black text-gray-900 mt-1">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
            <BalanceCard 
                title="Ahorro / Emergencias" 
                amount={state.ahorro} 
                icon={<IconPiggyBank />} 
                colorClass="bg-gradient-to-br from-emerald-500 to-emerald-700" 
                percentage={total > 0 ? Math.round((state.ahorro / total) * 100) : 0}
            />
             <BalanceCard 
                title="Gastos Personales" 
                amount={state.personales} 
                icon={<IconUser />} 
                colorClass="bg-gradient-to-br from-slate-500 to-slate-700"
                percentage={total > 0 ? Math.round((state.personales / total) * 100) : 0}
            />
             <BalanceCard 
                title="Inversión" 
                amount={state.inversion} 
                icon={<IconTrendingUp />} 
                colorClass="bg-gradient-to-br from-indigo-500 to-indigo-700"
                percentage={total > 0 ? Math.round((state.inversion / total) * 100) : 0}
            />
        </div>

        {/* Action Area */}
        <TransactionForm 
            onAdd={handleAddTransaction} 
            autoSplit={state.autoSplit}
            onToggleAutoSplit={(val) => setState(s => ({...s, autoSplit: val}))}
        />
        
        {/* Statistics */}
        <div className="mt-6">
           <MonthlyStats history={state.history} />
        </div>

        {/* History */}
        <HistoryList history={state.history} />

        {/* Tools */}
        <DataManagement 
            state={state} 
            snapshots={snapshots}
            onSaveSnapshot={saveSnapshot}
            onImportSnapshot={importSnapshot}
            onDeleteSnapshot={deleteSnapshot}
            onImportFile={handleImportFile}
            onReset={() => setState(INITIAL_STATE)}
        />
        
        <footer className="text-center text-xs text-gray-400 pb-4">
             <p>Datos almacenados localmente en tu dispositivo.</p>
        </footer>

      </div>
    </div>
  );
}

export default App;