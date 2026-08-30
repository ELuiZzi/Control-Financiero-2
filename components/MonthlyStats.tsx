import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { IconChart } from './Icons';

interface MonthlyStatsProps {
  history: Transaction[];
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MonthlyStats: React.FC<MonthlyStatsProps> = ({ history }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    history.forEach(t => years.add(new Date(t.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    history.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        if (t.type === 'ingreso') income += t.value;
        else expense += t.value;
      }
    });

    return { income, expense, balance: income - expense };
  }, [history, selectedMonth, selectedYear]);

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) handleNextMonth();
      if (isRightSwipe) handlePrevMonth();

      setTouchStart(0);
      setTouchEnd(0);
  };

  const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
           <IconChart className="w-4 h-4 text-brand-600" />
           Resumen Mensual
        </h3>
      </div>

      <div 
        className="flex items-center justify-between bg-gray-50 rounded-2xl p-2 mb-5 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
          <button onClick={handlePrevMonth} className="p-3 text-gray-400 hover:text-gray-900 transition-colors bg-white rounded-xl shadow-sm hover:shadow active:scale-95">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
             </svg>
          </button>
          
          <div className="flex flex-col items-center z-10">
             <select 
                 value={selectedMonth} 
                 onChange={(e) => setSelectedMonth(Number(e.target.value))}
                 className="text-sm font-black text-gray-900 uppercase tracking-widest bg-transparent border-none outline-none appearance-none cursor-pointer text-center hover:opacity-70 transition-opacity"
             >
                 {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
             <select 
                 value={selectedYear} 
                 onChange={(e) => setSelectedYear(Number(e.target.value))}
                 className="text-[10px] text-gray-400 font-bold bg-transparent border-none outline-none appearance-none cursor-pointer text-center -mt-1 hover:opacity-70 transition-opacity"
             >
                 {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>

          <button onClick={handleNextMonth} className="p-3 text-gray-400 hover:text-gray-900 transition-colors bg-white rounded-xl shadow-sm hover:shadow active:scale-95">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
             </svg>
          </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center divide-x divide-gray-100">
          <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Ingresos</div>
              <div className="text-sm font-bold text-emerald-600 truncate">
                  +${formatMoney(stats.income)}
              </div>
          </div>
          <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Gastos</div>
              <div className="text-sm font-bold text-red-500 truncate">
                  -${formatMoney(stats.expense)}
              </div>
          </div>
          <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Neto</div>
              <div className={`text-sm font-bold truncate ${stats.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {stats.balance >= 0 ? '$' : '-$'}{formatMoney(Math.abs(stats.balance))}
              </div>
          </div>
      </div>
    </div>
  );
};