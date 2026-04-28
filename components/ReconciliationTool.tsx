import React, { useState } from 'react';
import { AppState, TargetType, TransactionType } from '../types';
import { IconRefresh } from './Icons';

interface ReconciliationToolProps {
  state: AppState;
  onAdd: (amount: number, type: TransactionType, target: TargetType, description: string, tags: string[]) => void;
}

export const ReconciliationTool: React.FC<ReconciliationToolProps> = ({ state, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetVault, setTargetVault] = useState<TargetType>('negocio');
  const [actualBalance, setActualBalance] = useState('');

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    const real = parseFloat(actualBalance.replace(/[^0-9.-]+/g, ""));
    if (!isFinite(real)) return;

    // Extraer el saldo actual del sistema para la bóveda seleccionada
    let current = 0;
    if (targetVault === 'ahorro') current = state.ahorro;
    else if (targetVault === 'personales') current = state.personales;
    else if (targetVault === 'negocio') current = state.negocio;

    const diff = real - current;

    if (Math.abs(diff) < 0.01) {
      alert("La bóveda seleccionada ya coincide perfectamente con la realidad.");
      setIsOpen(false);
      setActualBalance('');
      return;
    }

    // Determinar si es una fuga o un excedente no registrado
    const type: TransactionType = diff > 0 ? 'ingreso' : 'gasto';
    const absDiff = Math.round(Math.abs(diff) * 100) / 100;

    // Inyectar transacción de cuadre automático
    onAdd(
      absDiff,
      type,
      targetVault,
      `Conciliación de Bóveda (${type === 'ingreso' ? 'Sobrante' : 'Faltante no rastreado'})`,
      ['ajuste_auditoria']
    );

    setActualBalance('');
    setIsOpen(false);
  };

  return (
    <div className="mt-8">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center space-x-2 py-4 bg-gray-900 text-white rounded-2xl shadow-md hover:bg-black transition-all active:scale-[0.98]"
      >
        <IconRefresh className={`w-4 h-4 ${isOpen ? 'animate-spin' : ''}`} />
        <span className="text-sm font-bold uppercase tracking-wider">Cuadrar Caja (Auditoría)</span>
      </button>

      {isOpen && (
        <form onSubmit={handleReconcile} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-2 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-gray-500 mb-4 font-medium">
                Ingresa el saldo <b className="text-gray-900">REAL</b> que tienes actualmente en tus cuentas o efectivo. El sistema creará un ajuste automático para sincronizarse.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <button type="button" onClick={() => setTargetVault('ahorro')} className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-colors ${targetVault === 'ahorro' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}>Reserva</button>
                <button type="button" onClick={() => setTargetVault('personales')} className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-colors ${targetVault === 'personales' ? 'bg-slate-50 border-slate-500 text-slate-700' : 'bg-white border-gray-200 text-gray-500'}`}>Personales</button>
                <button type="button" onClick={() => setTargetVault('negocio')} className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-colors ${targetVault === 'negocio' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>Lumtech</button>
            </div>

            <div className="mb-4 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                <input 
                    type="text" 
                    inputMode="decimal" 
                    value={actualBalance} 
                    onChange={(e) => setActualBalance(e.target.value)} 
                    placeholder="Saldo real exacto" 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-2xl font-black rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-brand-500 outline-none" 
                />
            </div>

            <button type="submit" disabled={!actualBalance} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                Sincronizar Bóveda
            </button>
        </form>
      )}
    </div>
  );
};