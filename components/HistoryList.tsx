import React, { useState } from 'react';
import { Transaction } from '../types';
import { IconTrendingUp } from './Icons';

interface HistoryListProps {
  history: Transaction[];
  onUndo: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onUndo }) => {
  const [visibleCount, setVisibleCount] = useState(10);

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 mt-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
          <IconTrendingUp className="text-gray-400 w-6 h-6" />
        </div>
        <p className="text-gray-500 text-sm">No hay movimientos recientes</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-lg font-bold text-gray-900">Historial Reciente</h3>
        <button 
          onClick={() => { if(window.confirm("¿Seguro que deseas deshacer la última transacción?")) onUndo() }} 
          className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          Deshacer última
        </button>
      </div>
      <div className="space-y-3">
        {history.slice(0, visibleCount).map((t) => (
          <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {t.target === 'auto' || t.target === 'auto_producto' ? 'Split (Prod)' : 
                         t.target === 'auto_servicio' ? 'Split (Serv)' : 
                         t.target}
                    </span>
                </div>
                {t.description && (
                    <div className="text-gray-800 text-sm mt-0.5 font-medium">{t.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">{new Date(t.date).toLocaleString()}</div>
            </div>
            <div className={`text-lg font-bold ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-gray-900'}`}>
                {t.type === 'ingreso' ? '+' : '-'}${t.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
      
      {visibleCount < history.length && (
          <button 
              onClick={() => setVisibleCount(v => v + 10)}
              className="w-full mt-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all text-sm shadow-sm active:scale-[0.98]"
          >
              Ver movimientos más antiguos ({history.length - visibleCount} restantes)
          </button>
      )}
    </div>
  );
};
