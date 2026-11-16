import React, { useMemo } from 'react';
import { AppState } from '../types';
import { Account, getPendingCharges, PendingCharge, roundMoney } from '../finance';

interface PredictiveDashboardProps {
  state: AppState;
}

// Mismo orden y colores que las tarjetas de saldo
const DIVISIONS: { account: Account; title: string; dot: string }[] = [
  { account: 'negocio', title: 'Lumtech (Negocio)', dot: 'bg-blue-500' },
  { account: 'personales', title: 'Operativa Personal', dot: 'bg-slate-400' },
  { account: 'ahorro', title: 'Reserva (Ahorro)', dot: 'bg-emerald-500' },
];

const money = (v: number) =>
  `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dueLabel = (charge: PendingCharge) =>
  charge.dueDate
    ? charge.dueDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : 'Flotante';

// Neto de cada división: su saldo menos los pagos programados que aún no se descuentan
export const PredictiveDashboard: React.FC<PredictiveDashboardProps> = ({ state }) => {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const divisions = useMemo(() => {
    const pending = getPendingCharges(state.fixedExpenses || [], new Date());
    return DIVISIONS.map(d => {
      const charges = pending
        .filter(c => c.account === d.account)
        .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
      const balance = state[d.account];
      const pendingTotal = roundMoney(charges.reduce((acc, c) => acc + c.expense.value, 0));
      return { ...d, balance, charges, pendingTotal, net: roundMoney(balance - pendingTotal) };
    });
    // dayKey: recalcular al cambiar de día aunque los datos no cambien
  }, [state, dayKey]);

  return (
    <div className="bg-gray-900 rounded-3xl p-5 shadow-2xl mb-8 border border-gray-800">
      <h3 className="text-gray-300 text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Neto por división
      </h3>
      <p className="text-gray-400 text-xs mt-1 mb-4">Saldo menos los pagos programados de este mes.</p>

      <div className="divide-y divide-gray-800">
        {divisions.map(d => (
          <details key={d.account} className="group py-3 first:pt-0 last:pb-0">
            <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-gray-200 text-sm font-bold">
                  <span className={`w-2.5 h-2.5 rounded-full ${d.dot}`} aria-hidden="true"></span>
                  {d.title}
                </span>
                <span className={`text-2xl font-black tracking-tight ${d.net >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {money(d.net)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1 text-xs">
                <span className="text-gray-400 font-mono">
                  Saldo {money(d.balance)}
                  {d.pendingTotal > 0 && <span className="text-red-400"> · −{money(d.pendingTotal)}</span>}
                </span>
                {d.charges.length > 0 ? (
                  <span className="text-gray-300 font-bold flex items-center gap-1">
                    {d.charges.length} por pagar
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                ) : (
                  <span className="text-gray-500">Sin pagos programados</span>
                )}
              </div>
            </summary>

            {d.charges.length > 0 && (
              <ul className="mt-3 space-y-2 bg-gray-800/60 rounded-2xl p-3">
                {d.charges.map(c => (
                  <li key={c.expense.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-gray-200 font-medium truncate">{c.expense.name}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className={c.dueDate ? 'text-gray-400' : 'text-indigo-300 font-bold'}>{dueLabel(c)}</span>
                      <span className="text-red-400 font-mono font-semibold">−{money(c.expense.value)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </div>
  );
};
