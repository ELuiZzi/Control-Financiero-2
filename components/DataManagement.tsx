import React, { useState } from 'react';
import { AppState, Snapshot } from '../types';
import { IconSave, IconDownload, IconUpload, IconHistory, IconTrash, IconRefresh } from './Icons';

interface DataManagementProps {
  state: AppState;
  snapshots: Snapshot[];
  onSaveSnapshot: (name: string) => void;
  onImportSnapshot: (snapshot: Snapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onImportFile: (file: File) => void;
  onReset: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  state,
  snapshots,
  onSaveSnapshot,
  onImportSnapshot,
  onDeleteSnapshot,
  onImportFile,
  onReset
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [snapName, setSnapName] = useState('');

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_flow_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSnap = () => {
    if (!snapName.trim()) return;
    onSaveSnapshot(snapName);
    setSnapName('');
  };

  return (
    <div className="mt-8 mb-12">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center space-x-2 py-3 text-gray-500 hover:text-gray-800 transition-colors"
      >
        <span className="text-sm font-medium">Herramientas y Configuración</span>
        <svg className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-2 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Snapshots Section */}
          <section>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <IconHistory className="w-4 h-4" /> Capturas de Saldo
            </h4>
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={snapName}
                    onChange={e => setSnapName(e.target.value)}
                    placeholder="Nombre (ej. Corte Sept)"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <button 
                    onClick={handleSaveSnap}
                    disabled={!snapName}
                    className="bg-emerald-600 text-white p-2.5 rounded-xl disabled:opacity-50"
                >
                    <IconSave className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {snapshots.length === 0 && <p className="text-xs text-gray-400 italic">No hay capturas guardadas</p>}
                {snapshots.map(snap => (
                    <div key={snap.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{snap.name}</div>
                            <div className="text-xs text-gray-500">{new Date(snap.date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => {
                                    if(confirm(`¿Restaurar saldo a '${snap.name}'?`)) onImportSnapshot(snap);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Importar"
                            >
                                <IconUpload className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => onDeleteSnapshot(snap.id)}
                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                                title="Eliminar"
                            >
                                <IconTrash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* File Management */}
          <section>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <IconDownload className="w-4 h-4" /> Respaldo (JSON)
            </h4>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                    <IconDownload className="w-6 h-6 text-gray-700 mb-2" />
                    <span className="text-xs font-medium text-gray-600">Exportar</span>
                </button>
                <label className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                    <IconUpload className="w-6 h-6 text-gray-700 mb-2" />
                    <span className="text-xs font-medium text-gray-600">Importar</span>
                    <input type="file" accept="application/json" onChange={e => e.target.files && onImportFile(e.target.files[0])} className="hidden" />
                </label>
            </div>
          </section>

          <section>
              <button onClick={() => { if(confirm("¿Estás seguro de reiniciar todos los valores a 0?")) onReset() }} className="w-full py-3 rounded-xl border border-red-100 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                 <IconRefresh className="w-4 h-4" />
                 Reiniciar Fábrica
              </button>
          </section>

        </div>
      )}
    </div>
  );
};
