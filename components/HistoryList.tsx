import React from 'react';
import { Transaction } from '../types';
import { IconTrendingUp } from './Icons';

interface HistoryListProps {
  history: Transaction[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
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
      <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">Historial Reciente</h3>
      <div className="space-y-3">
        {history.map((t) => (
          <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {t.target === 'auto' ? 'Split Auto' : t.target}
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
    </div>
  );
};
