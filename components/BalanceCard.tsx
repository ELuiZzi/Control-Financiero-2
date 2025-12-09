import React from 'react';

interface BalanceCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  colorClass: string;
  percentage?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ title, amount, icon, colorClass, percentage }) => {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`rounded-2xl p-4 text-white shadow-lg ${colorClass} relative overflow-hidden transition-transform transform active:scale-95`}>
        <div className="absolute right-[-10px] top-[-10px] opacity-20 transform scale-150 rotate-12">
            {icon}
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center space-x-2 mb-2 opacity-90">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 text-white' })}
                </div>
                <span className="text-sm font-medium tracking-wide">{title}</span>
            </div>
            <div>
                <span className="text-2xl font-bold tracking-tight">${formatted}</span>
                {percentage && <span className="text-xs ml-2 opacity-80 font-mono">({percentage}%)</span>}
            </div>
        </div>
    </div>
  );
};
