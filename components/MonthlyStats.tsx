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

  // Calculate available years based on history + current year
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    history.forEach(t => {
      years.add(new Date(t.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  // Filter and Calculate
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    history.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        if (t.type === 'ingreso') {
          income += t.value;
        } else {
          expense += t.value;
        }
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [history, selectedMonth, selectedYear]);

  const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
           <IconChart className="w-4 h-4 text-brand-600" />
           Resumen Mensual
        </h3>
        
        <div className="flex gap-2">
            <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-1.5 outline-none focus:border-brand-500"
            >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-1.5 outline-none focus:border-brand-500"
            >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
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