import React, { useMemo } from 'react';
import { AppState } from '../types';
import { IconChart } from './Icons';

interface TagAnalyzerProps {
  state: AppState;
}

export const TagAnalyzer: React.FC<TagAnalyzerProps> = ({ state }) => {
  const tagStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Diccionario para acumular salidas de capital por etiqueta
    const expensesByTag: Record<string, number> = {};
    let totalTracked = 0;

    state.history.forEach(t => {
        const d = new Date(t.date);
        // Filtramos solo gastos del mes actual que tengan etiquetas
        if (t.type === 'gasto' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            if (t.tags && t.tags.length > 0) {
                t.tags.forEach(tag => {
                    const cleanTag = tag.trim().toLowerCase();
                    if (!expensesByTag[cleanTag]) expensesByTag[cleanTag] = 0;
                    expensesByTag[cleanTag] += t.value; // Acumulamos el valor
                });
            } else {
                // Etiqueta por defecto para fugas no rastreadas
                if (!expensesByTag['sin_etiqueta']) expensesByTag['sin_etiqueta'] = 0;
                expensesByTag['sin_etiqueta'] += t.value;
            }
            totalTracked += t.value;
        }
    });

    // Ordenar de mayor a menor fuga de capital
    const sortedTags = Object.entries(expensesByTag)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6); // Mostrar el Top 6 de centros de costo

    return { sortedTags, totalTracked };
  }, [state.history]);

  if (tagStats.sortedTags.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
           <IconChart className="w-4 h-4 text-blue-600" />
           Auditoría de Fugas (Mes Actual)
        </h3>
        
        <div className="space-y-4">
            {tagStats.sortedTags.map(([tag, amount]) => {
                const percentage = tagStats.totalTracked > 0 ? Math.round((amount / tagStats.totalTracked) * 100) : 0;
                return (
                    <div key={tag} className="relative">
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="uppercase text-gray-700 tracking-wider">#{tag}</span>
                            <span className="text-gray-900">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-2 rounded-full ${tag === 'sin_etiqueta' ? 'bg-red-400' : 'bg-blue-600'}`} 
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
        <p className="text-[10px] text-gray-400 font-medium mt-4 text-center uppercase tracking-widest">
            Clasifica cada gasto para optimizar el capital
        </p>
    </div>
  );
};