import React, { useState, useEffect } from 'react';
import { AppState, SplitConfig } from '../types';
import { useStore } from '../store';
import { INITIAL_STATE } from '../constants';
import { TagAnalyzer } from './TagAnalyzer';
import { FixedExpensesManager } from './FixedExpensesManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const store = useStore();
  
  // Use INITIAL_STATE.splitConfig! as fallback if somehow undefined
  const currentConfig = store.splitConfig || INITIAL_STATE.splitConfig!;
  const [config, setConfig] = useState<SplitConfig>(currentConfig);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gastos' | 'splits' | 'auditoria'>('gastos');

  useEffect(() => {
    if (isOpen) {
      setConfig(store.splitConfig || INITIAL_STATE.splitConfig!);
      setError(null);
    }
  }, [isOpen, store.splitConfig]);

  if (!isOpen) return null;

  const handleChange = (type: 'producto' | 'servicio', field: keyof SplitConfig['producto'], value: string) => {
    const num = parseInt(value, 10);
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: isNaN(num) ? 0 : num
      }
    }));
  };

  const handleSave = () => {
    const prodSum = config.producto.ahorro + config.producto.personales + config.producto.negocio;
    const servSum = config.servicio.ahorro + config.servicio.personales + config.servicio.negocio;

    if (prodSum !== 100) {
      setError(`La suma de Productos debe ser 100% (actual: ${prodSum}%)`);
      return;
    }
    if (servSum !== 100) {
      setError(`La suma de Servicios debe ser 100% (actual: ${servSum}%)`);
      return;
    }

    store.updateSplitConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
          <h2 className="font-bold text-lg">Configuraciones</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50 text-[11px] font-bold text-gray-500 overflow-x-auto">
           <button onClick={() => setActiveTab('gastos')} className={`px-4 py-3 whitespace-nowrap text-center ${activeTab === 'gastos' ? 'text-gray-900 border-b-2 border-gray-900 bg-white' : 'hover:bg-gray-100 transition-colors'}`}>
              Gastos Fijos
           </button>
           <button onClick={() => setActiveTab('splits')} className={`px-4 py-3 whitespace-nowrap text-center ${activeTab === 'splits' ? 'text-gray-900 border-b-2 border-gray-900 bg-white' : 'hover:bg-gray-100 transition-colors'}`}>
              Splits
           </button>
           <button onClick={() => setActiveTab('auditoria')} className={`px-4 py-3 whitespace-nowrap text-center ${activeTab === 'auditoria' ? 'text-gray-900 border-b-2 border-gray-900 bg-white' : 'hover:bg-gray-100 transition-colors'}`}>
              Auditoría
           </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-white">
          {activeTab === 'gastos' && (
             <div className="-m-6 p-4">
                <FixedExpensesManager 
                    expenses={store.fixedExpenses}
                    onAdd={store.addFixedExpense}
                    onEdit={store.editFixedExpense} 
                    onDelete={store.deleteFixedExpense}
                    onProcess={store.processFloatingExpense}
                />
             </div>
          )}

          {activeTab === 'splits' && (
              <div className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 font-medium">
              {error}
            </div>
          )}

          {/* Split Productos */}
          <div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-3">Venta de Productos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-600">Reserva (Ahorro) %</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.producto.ahorro} 
                  onChange={e => handleChange('producto', 'ahorro', e.target.value)}
                  className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">Personales %</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.producto.personales} 
                  onChange={e => handleChange('producto', 'personales', e.target.value)}
                  className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-600">Lumtech (Negocio) %</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.producto.negocio} 
                  onChange={e => handleChange('producto', 'negocio', e.target.value)}
                  className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Split Servicios */}
          <div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-3">Servicios</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-600">Reserva (Ahorro) %</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.servicio.ahorro} 
                  onChange={e => handleChange('servicio', 'ahorro', e.target.value)}
                  className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">Personales %</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.servicio.personales} 
                  onChange={e => handleChange('servicio', 'personales', e.target.value)}
                  className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-600">Lumtech (Negocio) %</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.servicio.negocio} 
                  onChange={e => handleChange('servicio', 'negocio', e.target.value)}
                  className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-brand-500"
                />
              </div>
              </div>
            </div>
          </div>
          )}
          {activeTab === 'auditoria' && (
             <div className="-m-6">
                <TagAnalyzer state={store as any} />
             </div>
          )}
        </div>

        {activeTab === 'splits' && (
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl text-sm shadow-md hover:bg-black transition-colors">
                Guardar
              </button>
            </div>
        )}
      </div>
    </div>
  );
};
