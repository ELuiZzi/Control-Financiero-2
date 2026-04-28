import React, { useState } from 'react';
import { FixedExpense, TargetType } from '../types';
import { IconCalendar, IconTrash, IconEdit } from './Icons';

interface FixedExpensesManagerProps {
  expenses: FixedExpense[];
  onAdd: (name: string, value: number, day: number, target: TargetType, tags: string[]) => void;
  onEdit: (id: string, name: string, value: number, day: number, target: TargetType, tags: string[]) => void;
  onDelete: (id: string) => void;
}

export const FixedExpensesManager: React.FC<FixedExpensesManagerProps> = ({ expenses, onAdd, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [val, setVal] = useState('');
  const [day, setDay] = useState('1');
  const [target, setTarget] = useState<TargetType>('personales');
  const [tagsInput, setTagsInput] = useState('');
  
  // Nuevo estado para rastrear si estamos editando
  const [editingId, setEditingId] = useState<string | null>(null);

  const now = new Date();
  const today = now.getDate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = parseFloat(val.toString().replace(/[^0-9.-]+/g, ""));
    if (!name || isNaN(numericVal) || numericVal === 0) return;
    
    const tagsArray = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');
    
    // Si hay un ID activo, editamos. Si no, agregamos uno nuevo.
    if (editingId) {
        onEdit(editingId, name, numericVal, parseInt(day), target, tagsArray);
    } else {
        onAdd(name, numericVal, parseInt(day), target, tagsArray);
    }
    
    cancelEdit();
  };

  // Función para inyectar los datos en el formulario
  const handleEditClick = (ex: FixedExpense) => {
      setEditingId(ex.id);
      setName(ex.name);
      setVal(ex.value.toString());
      setDay(ex.day.toString());
      setTarget(ex.target);
      setTagsInput(ex.tags ? ex.tags.join(', ') : '');
      
      // Si el panel estaba cerrado, lo abrimos y hacemos scroll hacia él (UX fluida)
      if (!isOpen) setIsOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingId(null);
      setName(''); 
      setVal(''); 
      setDay('1');
      setTarget('personales');
      setTagsInput('');
  };

  return (
    <div className="mt-8 mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-5 bg-white rounded-3xl shadow-sm border border-gray-100 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 font-extrabold text-gray-900 tracking-tight">
            <div className={`p-2 rounded-xl transition-colors ${editingId ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <IconCalendar className={`w-5 h-5 ${editingId ? 'text-orange-600' : 'text-gray-700'}`} /> 
            </div>
            Gestión de Fugas Programadas
        </div>
        <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">{isOpen ? 'Ocultar' : 'Administrar'}</span>
      </button>

      {isOpen && (
        <div className="bg-white p-6 rounded-b-3xl border-x border-b border-gray-100 -mt-4 pt-8 animate-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleSubmit} className={`space-y-4 mb-8 p-4 rounded-2xl transition-all ${editingId ? 'bg-orange-50 border border-orange-200' : ''}`}>
                {editingId && <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2"><IconEdit className="w-3 h-3"/> Editando Obligación</div>}
                <input type="text" placeholder="Nombre (ej. Internet Lumtech)" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input type="text" inputMode="decimal" placeholder="0.00" value={val} onChange={e => setVal(e.target.value)} className="w-full p-3 pl-7 bg-white rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                    </div>
                    <select value={day} onChange={e => setDay(e.target.value)} className="w-28 p-3 bg-white rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>Día {i+1}</option>)}
                    </select>
                </div>
                
                <input type="text" placeholder="Etiquetas (ej. servicios, suscripciones)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-gray-200 text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500" />

                <div className="grid grid-cols-3 gap-2 pt-2">
                    {['ahorro', 'personales', 'negocio'].map(t => (
                        <button key={t} type="button" onClick={() => setTarget(t as TargetType)} className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all ${target === t ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                            {t === 'ahorro' ? 'Reserva' : t === 'negocio' ? 'Lumtech' : t}
                        </button>
                    ))}
                </div>
                
                <div className="flex gap-2 mt-2">
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="w-1/3 bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition-all uppercase tracking-wide text-xs">
                            Cancelar
                        </button>
                    )}
                    <button type="submit" disabled={!name || !val} className={`flex-1 font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-wide text-xs ${editingId ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}>
                        {editingId ? 'Guardar Cambios' : 'Programar Gasto'}
                    </button>
                </div>
            </form>

            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tus Obligaciones</h4>
                {expenses.map(ex => {
                    const daysLeft = ex.day - today;
                    let alertClass = "text-emerald-500 bg-emerald-50";
                    let statusText = `Faltan ${daysLeft} días`;
                    
                    if (daysLeft < 0) {
                        alertClass = "text-gray-500 bg-gray-100";
                        statusText = "Ya procesado";
                    } else if (daysLeft >= 0 && daysLeft <= 3) {
                        alertClass = "text-red-600 bg-red-50 animate-alert font-bold";
                    } else if (daysLeft > 3 && daysLeft <= 7) {
                        alertClass = "text-orange-600 bg-orange-50 font-bold";
                    }

                    return (
                        <div key={ex.id} className={`flex items-center justify-between p-4 bg-white rounded-2xl border shadow-sm transition-all ${editingId === ex.id ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-100'}`}>
                            <div className="flex-1">
                                <div className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                    {ex.name}
                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{ex.target === 'negocio' ? 'Lumtech' : ex.target === 'ahorro' ? 'Reserva' : ex.target}</span>
                                </div>
                                <div className="text-xs mt-1 flex items-center gap-2">
                                    <span className="text-gray-500">Día {ex.day}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${alertClass}`}>{statusText}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base font-black text-gray-900 mr-2">${ex.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                
                                <button onClick={() => handleEditClick(ex)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <IconEdit className="w-4 h-4" />
                                </button>
                                <button onClick={() => { if(confirm(`¿Eliminar ${ex.name}?`)) onDelete(ex.id) }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {expenses.length === 0 && <p className="text-center text-xs text-gray-400 py-6 italic border-2 border-dashed border-gray-100 rounded-2xl">No hay fugas programadas</p>}
            </div>
        </div>
      )}
    </div>
  );
};