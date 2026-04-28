import React, { useState, useMemo } from 'react';
import { TargetType, TransactionType, Transaction } from '../types';

interface TransactionFormProps {
  onAdd: (amount: number, type: TransactionType, target: TargetType, description: string, tags: string[]) => void;
  autoSplit: boolean;
  onToggleAutoSplit: (val: boolean) => void;
  history: Transaction[];
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, autoSplit, onToggleAutoSplit, history }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('ingreso');
  const [target, setTarget] = useState<TargetType>('auto');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Algoritmo de Minería de Etiquetas y Frecuencia (Deep Scan 2.0)
  const dynamicQuickTags = useMemo(() => {
    const freq: Record<string, number> = {};

    // Lista negra ampliada: Basura gramatical y fallbacks del sistema
    const stopWords = new Set(['con', 'del', 'los', 'las', 'por', 'que', 'una', 'para', 'mas', 'movimiento', 'operativo', 'compra', 'pago', 'el', 'la', 'de', 'un']);

    (history || []).forEach(t => {
        if (t.type === type && t.target === target) {
            // 1. Contabilizamos las etiquetas formales
            if (t.tags && t.tags.length > 0) {
                t.tags.forEach(tag => freq[tag] = (freq[tag] || 0) + 1);
            } 
            
            // 2. Escaneo profundo de TODA la descripción (tenga etiquetas o no)
            if (t.description) {
                // Eliminamos caracteres especiales y separamos por espacios
                const words = t.description.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, ' ').split(' ');
                
                words.forEach(word => {
                    // Solo aprendemos palabras clave reales
                    if (word.length >= 3 && !stopWords.has(word)) {
                        freq[word] = (freq[word] || 0) + 1;
                    }
                });
            }
        }
    });

    // 3. Ordenamos las palabras por frecuencia de uso (de mayor a menor)
    const sortedLearned = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word);

    // 4. Base predeterminada según el contexto operativo
    const defaults = type === 'ingreso' ? ['venta', 'reparacion', 'servicio'] :
                     target === 'negocio' ? ['refacciones', 'licencias', 'ads', 'herramientas'] :
                     target === 'personales' ? ['dieta', 'suscripciones', 'transporte', 'mascotas'] :
                     ['gym', 'emergencia'];

    // 5. Retornamos el Top 6 limpio y sin duplicados
    return Array.from(new Set([...sortedLearned, ...defaults])).slice(0, 6);

  }, [type, target, history]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
    if (!isFinite(raw) || raw === 0) return;

    const finalDescription = description.trim() || selectedTags.join(', ') || 'Movimiento Operativo';

    onAdd(raw, type, target, finalDescription, selectedTags);

    setAmount('');
    setDescription('');
    setSelectedTags([]);
    if(type === 'ingreso') setTarget('auto');
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setSelectedTags([]);
    if (newType === 'gasto' && target === 'auto') setTarget('personales');
    else if (newType === 'ingreso') setTarget('auto');
  };

  const handleTargetChange = (newTarget: TargetType) => {
      setTarget(newTarget);
      setSelectedTags([]);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        <button type="button" onClick={() => handleTypeChange('ingreso')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === 'ingreso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Ingreso (+)</button>
        <button type="button" onClick={() => handleTypeChange('gasto')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === 'gasto' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Gasto (-)</button>
      </div>

      <div className="mb-5 relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
        <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-4xl font-black rounded-2xl py-4 pl-10 pr-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-300 tracking-tighter" />
      </div>

      <div className="mb-5">
        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Centro de Costos</label>
        <div className="grid grid-cols-2 gap-2">
            {type === 'ingreso' && (
                <button type="button" onClick={() => handleTargetChange('auto')} className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${target === 'auto' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-600'}`}>Auto Split</button>
            )}
             <button type="button" onClick={() => handleTargetChange('ahorro')} className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${target === 'ahorro' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>Reserva</button>
            <button type="button" onClick={() => handleTargetChange('personales')} className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${target === 'personales' ? 'bg-slate-50 border-slate-500 text-slate-700' : 'bg-white border-gray-200 text-gray-600'}`}>Personales</button>
            <button type="button" onClick={() => handleTargetChange('negocio')} className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${target === 'negocio' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}>Lumtech</button>
        </div>
      </div>

      {dynamicQuickTags.length > 0 && (
         <div className="mb-5">
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Frecuentes (Autoclasificación)</label>
            <div className="flex flex-wrap gap-2">
               {dynamicQuickTags.map(tag => (
                  <button 
                     key={tag} 
                     type="button" 
                     onClick={() => toggleTag(tag)}
                     className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${selectedTags.includes(tag) ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  >
                     #{tag}
                  </button>
               ))}
            </div>
         </div>
      )}

      <div className="mb-6">
         <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nota libre o nueva etiqueta (Ej. Mantenimiento)" className="w-full bg-transparent border-b-2 border-gray-100 text-gray-700 text-sm py-2 px-1 focus:border-gray-900 outline-none transition-colors" />
      </div>

      <button type="submit" disabled={!amount} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-wide">
        {type === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Gasto'}
      </button>
    </form>
  );
};