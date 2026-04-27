import React, { useMemo } from 'react';
import { AppState } from '../types';
import { IconTrendingUp } from './Icons'; 

interface PredictiveDashboardProps {
  state: AppState;
}

export const PredictiveDashboard: React.FC<PredictiveDashboardProps> = ({ state }) => {
  // 1. SACAMOS LAS VARIABLES AQUÍ AFUERA
  const today = new Date().getDate();
  const currentMY = `${new Date().getMonth()}-${new Date().getFullYear()}`;

  const { availableCapital, pendingExpenses, safeToInvest } = useMemo(() => {
      // Calculamos el impacto de las obligaciones (Fijas + Flotantes)
      const pending = (state.fixedExpenses || []).reduce((acc, ex) => {
          // REGLA 1: Si es un gasto flotante, se contabiliza SIEMPRE.
          if (ex.isFloating) {
              return acc + ex.value;
          }

          // REGLA 2: Si es un gasto fijo, se contabiliza por fecha.
          if (ex.day >= today && ex.lastPaidMonthYear !== currentMY) {
              return acc + ex.value;
          }
          
          return acc;
      }, 0);

      // El resto de tu lógica de capital disponible...
      const available = state.personales + state.negocio; 
      const safe = available - pending;

      return {
          availableCapital: available,
          pendingExpenses: pending,
          safeToInvest: safe
      };
  }, [state, today, currentMY]); // 2. AHORA REACT SÍ PUEDE LEER ESTAS VARIABLES

  return (
    <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl mb-8 relative overflow-hidden border border-gray-800 transition-all hover:border-gray-700">
       
       <div className="absolute -right-4 -top-4 opacity-10">
           <IconTrendingUp className="w-32 h-32 text-emerald-500" />
       </div>

       <h3 className="text-gray-300 text-xs font-bold flex items-center gap-2 mb-6 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Liquidez Operativa Real
       </h3>
       
       <div className="relative z-10">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Capital Seguro para Despliegue</p>
          <span className={`text-4xl font-black tracking-tighter ${safeToInvest >= 0 ? 'text-white' : 'text-red-500'}`}>
             ${safeToInvest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
       </div>

       <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-800 relative z-10">
          <div>
             <p className="text-gray-600 text-[10px] font-bold uppercase mb-1">Liquidez Bruta</p>
             <p className="text-gray-300 font-mono text-sm font-semibold">${availableCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
             <p className="text-gray-600 text-[10px] font-bold uppercase mb-1">Fugas Programadas</p>
             <p className="text-red-400 font-mono text-sm font-semibold">-${pendingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
       </div>
    </div>
  );
};