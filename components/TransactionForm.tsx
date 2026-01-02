import React, { useState } from 'react';
import { TargetType, TransactionType } from '../types';

interface TransactionFormProps {
  onAdd: (amount: number, type: TransactionType, target: TargetType, description: string) => void;
  autoSplit: boolean;
  onToggleAutoSplit: (val: boolean) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, autoSplit, onToggleAutoSplit }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('ingreso');
  const [target, setTarget] = useState<TargetType>('auto');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
    if (!isFinite(raw) || raw === 0) return;
    
    onAdd(raw, type, target, description);
    
    // Reset fields
    setAmount('');
    setDescription('');
    if(type === 'ingreso') {
        setTarget('auto');
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'gasto' && target === 'auto') {
      setTarget('personales');
    } else if (newType === 'ingreso') {
        setTarget('auto');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      
      {/* Type Toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          type="button"
          onClick={() => handleTypeChange('ingreso')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            type === 'ingreso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Ingreso (+)
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('gasto')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            type === 'gasto' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Gasto (-)
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
            <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-3xl font-bold rounded-2xl py-4 pl-10 pr-4 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
            />
        </div>
      </div>

      {/* Description */}
      <div className={`overflow-hidden transition-all duration-300 ${type === 'gasto' ? 'max-h-20 mb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
         <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (ej. Supermercado)"
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 outline-none"
        />
      </div>

      {/* Target Selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider ml-1">Destino / Origen</label>
        <div className="grid grid-cols-2 gap-2">
            {type === 'ingreso' && (
                <button
                    type="button"
                    onClick={() => setTarget('auto')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                        target === 'auto' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-600'
                    }`}
                >
                    Auto Split (12/21/67)
                </button>
            )}
             <button
                type="button"
                onClick={() => setTarget('ahorro')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    target === 'ahorro' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'
                }`}
            >
                Ahorro
            </button>
            <button
                type="button"
                onClick={() => setTarget('personales')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    target === 'personales' ? 'bg-slate-50 border-slate-500 text-slate-700' : 'bg-white border-gray-200 text-gray-600'
                }`}
            >
                Personales
            </button>
            <button
                type="button"
                onClick={() => setTarget('inversion')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    target === 'inversion' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'
                }`}
            >
                Inversión
            </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!amount}
        className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg shadow-gray-300 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
      >
        {type === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Gasto'}
      </button>

      {/* Auto Split Checkbox */}
      <div className="mt-4 flex items-center justify-center">
         <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoSplit ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`}>
                {autoSplit && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <input
                type="checkbox"
                checked={autoSplit}
                onChange={(e) => onToggleAutoSplit(e.target.checked)}
                className="hidden"
            />
            <span className="text-xs text-gray-500">Mantener "Auto Split" activo para futuros ingresos</span>
         </label>
      </div>

    </form>
  );
};