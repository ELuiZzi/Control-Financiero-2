import React, { useEffect, useState } from 'react';

interface PortfolioChartProps {
  ahorro: number;
  personales: number;
  negocio: number;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ ahorro, personales, negocio }) => {
  const [mounted, setMounted] = useState(false);
  const total = ahorro + personales + negocio;

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setMounted(true), 100);
  }, []);

  const pNegocio = total > 0 ? (negocio / total) * 100 : 0;
  const pPersonales = total > 0 ? (personales / total) * 100 : 0;
  const pAhorro = total > 0 ? (ahorro / total) * 100 : 0;

  // Radio mágico donde la circunferencia es exactamente 100
  const radius = 15.91549430918954;

  const renderInnerTotal = () => {
    if (total === 0) return '$0.00';
    if (total >= 1000000) return `$${(total / 1000000).toFixed(2)}M`;
    if (total >= 1000) return `$${(total / 1000).toFixed(1)}k`;
    return `$${Math.round(total)}`;
  };

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90 drop-shadow-sm">
        {/* Fondo (gris) cuando no hay capital */}
        <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="3" />
        
        {/* Negocio (Blue-600) */}
        <circle 
            cx="20" cy="20" r={radius} 
            fill="transparent" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${mounted ? pNegocio : 0} ${100}`} 
            strokeDashoffset={0} 
            className="transition-all duration-1000 ease-out" 
        />
        
        {/* Personales (Slate-500) */}
        <circle 
            cx="20" cy="20" r={radius} 
            fill="transparent" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${mounted ? pPersonales : 0} ${100}`} 
            strokeDashoffset={mounted ? -pNegocio : 0} 
            className="transition-all duration-1000 ease-out" 
        />
        
        {/* Ahorro (Emerald-500) */}
        <circle 
            cx="20" cy="20" r={radius} 
            fill="transparent" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${mounted ? pAhorro : 0} ${100}`} 
            strokeDashoffset={mounted ? -(pNegocio + pPersonales) : 0} 
            className="transition-all duration-1000 ease-out" 
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
         <span className="text-[7px] sm:text-[8px] text-gray-400 font-bold uppercase tracking-widest">Total</span>
         <span className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">{renderInnerTotal()}</span>
      </div>
    </div>
  );
};
