import React, { useMemo } from 'react';
import { AppState } from '../types';
import { Account, getPendingCharges, PendingCharge, roundMoney } from '../finance';
import { IconPiggyBank, IconTrendingUp, IconUser } from './Icons';

interface PredictiveDashboardProps {
  state: AppState;
}

type IconComponent = (props: { className?: string }) => React.ReactElement;

// Una tarjeta por división, con el color de siempre
const DIVISIONS: { account: Account; title: string; colorClass: string; Icon: IconComponent }[] = [
  { account: 'negocio', title: 'Lumtech (Capital de Negocio)', colorClass: 'from-blue-600 to-blue-800', Icon: IconTrendingUp },
  { account: 'personales', title: 'Operativa Personal', colorClass: 'from-slate-500 to-slate-700', Icon: IconUser },
  { account: 'ahorro', title: 'Reserva Intocable (Ahorro)', colorClass: 'from-emerald-500 to-emerald-700', Icon: IconPiggyBank },
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
    const total = state.ahorro + state.personales + state.negocio;
    return DIVISIONS.map(d => {
      const charges = pending
        .filter(c => c.account === d.account)
        .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
      const balance = state[d.account];
      const pendingTotal = roundMoney(charges.reduce((acc, c) => acc + c.expense.value, 0));
      const share = total > 0 ? Math.round((balance / total) * 100) : 0;
      return { ...d, balance, charges, pendingTotal, share, net: roundMoney(balance - pendingTotal) };
    });
    // dayKey: recalcular al cambiar de día aunque los datos no cambien
  }, [state, dayKey]);

  return (
    <section className="mb-8" aria-label="Neto por división: saldo menos pagos programados del mes">
      <div className="grid grid-cols-1 gap-3">
        {divisions.map(({ account, title, colorClass, Icon, balance, charges, pendingTotal, share, net }) => (
          <details key={account} className={`group rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${colorClass} relative overflow-hidden`}>
            <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-20 transform scale-150 rotate-12" aria-hidden="true">
                <Icon className="w-12 h-12" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-2 text-sm font-medium tracking-wide opacity-95">
                    <span className="p-1.5 bg-white/20 rounded-lg">
                      <Icon className="w-4 h-4 text-white" />
                    </span>
                    {title}
                  </span>
                  {share > 0 && <span className="text-xs font-mono opacity-80">{share}%</span>}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-widest opacity-75">Neto</div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black tracking-tight">{money(net)}</span>
                  {net < 0 && <span className="text-[10px] font-bold uppercase bg-red-500 text-white px-2 py-0.5 rounded-full">En negativo</span>}
                </div>

                <div className="flex items-center justify-between gap-3 mt-2 text-xs">
                  <span className="font-mono opacity-90">
                    Saldo {money(balance)}
                    {pendingTotal > 0 && <> · −{money(pendingTotal)}</>}
                  </span>
                  {charges.length > 0 ? (
                    <span className="font-bold flex items-center gap-1 bg-white/15 px-2 py-1 rounded-lg">
                      {charges.length} por pagar
                      <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="opacity-80">Sin pagos programados</span>
                  )}
                </div>
              </div>
            </summary>

            {charges.length > 0 && (
              <ul className="relative z-10 mt-3 space-y-2 bg-black/20 rounded-xl p-3">
                {charges.map(c => (
                  <li key={c.expense.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium truncate">{c.expense.name}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className={c.dueDate ? 'opacity-80' : 'font-bold'}>{dueLabel(c)}</span>
                      <span className="font-mono font-semibold">−{money(c.expense.value)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </section>
  );
};
