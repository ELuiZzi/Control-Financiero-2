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
    // Generar nombre de archivo con fecha y hora para fácil organización en carpetas
    const date = new Date();
    const fileName = `finanzas_backup_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.json`;
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    alert('Archivo guardado en la carpeta de Descargas');
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
        <span className="text-sm font-medium">Gestión de Archivos y Copias</span>
        <svg className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-2 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* File Management (Moved to Top for Priority) */}
          <section>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <IconDownload className="w-4 h-4" /> Respaldo en Dispositivo
            </h4>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Los navegadores no pueden guardar automáticamente en carpetas específicas por seguridad. 
                Usa este botón para guardar manualmente una copia en tu carpeta de <b>Descargas</b>.
            </p>
            <div className="flex flex-col gap-3">
                <button 
                    onClick={handleExport} 
                    className="flex items-center justify-center gap-2 p-4 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-black transition-all active:scale-[0.98]"
                >
                    <IconDownload className="w-5 h-5 text-white" />
                    <span className="text-sm font-bold">Guardar Copia en Archivos</span>
                </button>
                
                <label className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer text-gray-700">
                    <IconUpload className="w-5 h-5" />
                    <span className="text-sm font-medium">Restaurar desde Archivo</span>
                    <input type="file" accept="application/json" onChange={e => e.target.files && onImportFile(e.target.files[0])} className="hidden" />
                </label>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Snapshots Section */}
          <section>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <IconHistory className="w-4 h-4" /> Puntos de Restauración Rápida
            </h4>
            <p className="text-xs text-gray-500 mb-3">Guarda el estado actual en la memoria del navegador para volver atrás rápidamente.</p>
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={snapName}
                    onChange={e => setSnapName(e.target.value)}
                    placeholder="Nombre (ej. Antes de vacaciones)"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <button 
                    onClick={handleSaveSnap}
                    disabled={!snapName}
                    className="bg-brand-600 text-white p-2.5 rounded-xl disabled:opacity-50"
                >
                    <IconSave className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {snapshots.length === 0 && <p className="text-xs text-gray-400 italic">No hay puntos guardados</p>}
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

          <section className="pt-4 border-t border-gray-100">
              <button onClick={() => { if(confirm("¿Estás seguro de reiniciar todos los valores a 0?")) onReset() }} className="w-full py-3 rounded-xl text-red-500 text-xs font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                 <IconRefresh className="w-3 h-3" />
                 Reiniciar Fábrica
              </button>
          </section>

        </div>
      )}
    </div>
  );
};