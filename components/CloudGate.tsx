import React, { useRef, useState } from 'react';
import { AppState } from '../types';
import { Ledger, stateFromLedger } from '../ledger';

const money = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-5">{children}</div>
  </div>
);

export const LoadingScreen: React.FC<{ text?: string }> = ({ text = 'Inicializando Bóveda...' }) => (
  <div className="min-h-screen flex items-center justify-center font-black text-brand-600 px-6 text-center">{text}</div>
);

export const SignInScreen: React.FC<{ onSignIn: () => Promise<void> }> = ({ onSignIn }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSignIn();
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setError(`No se pudo iniciar sesión (${e?.code || e?.message || 'error desconocido'}).`);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell>
      <div>
        <h1 className="text-xl font-black text-gray-900">Finance Flow</h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Inicia sesión con tu cuenta de Google para guardar tus finanzas en la nube. Si pierdes o cambias de
          celular, tus datos seguirán ahí. Solo tu cuenta puede verlos.
        </p>
      </div>
      <button
        onClick={handle}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-900 text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-all active:scale-[0.98] disabled:opacity-60"
      >
        <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        {busy ? 'Conectando...' : 'Continuar con Google'}
      </button>
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </Shell>
  );
};

export const OfflineScreen: React.FC<{ onRetry: () => void; message?: string }> = ({ onRetry, message }) => (
  <Shell>
    <h2 className="text-lg font-black text-gray-900">Se necesita conexión</h2>
    <p className="text-sm text-gray-600 leading-relaxed">
      {message || 'La primera vez que vinculas tu cuenta en este dispositivo hace falta internet para revisar los datos de la nube. Después la app funciona sin conexión.'}
    </p>
    <button onClick={onRetry} className="w-full py-3 bg-gray-900 text-white font-bold rounded-2xl">Reintentar</button>
  </Shell>
);

interface Summary { total: number; movements: number; scheduled: number; last?: string }

const summarize = (s: AppState): Summary => ({
  total: s.ahorro + s.personales + s.negocio,
  movements: s.history.length,
  scheduled: s.fixedExpenses.length,
  last: s.history[0]?.date,
});

const SummaryCard: React.FC<{ title: string; summary: Summary }> = ({ title, summary }) => (
  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</div>
    <div className="text-2xl font-black text-gray-900">{money(summary.total)}</div>
    <div className="text-xs text-gray-600 mt-1">
      {summary.movements} movimientos · {summary.scheduled} programados
      {summary.last && <> · último {new Date(summary.last).toLocaleDateString()}</>}
    </div>
  </div>
);

interface SetupScreenProps {
  email?: string | null;
  local: AppState | null; // datos de este dispositivo (aún sin vincular)
  cloud: Ledger | null;   // datos que ya tiene la cuenta
  onUseLocal: () => void;
  onUseCloud: () => void;
  onImportFile: (file: File) => void;
  onStartFresh: () => void;
  onSignOut: () => void;
}

// Primera vez que se vincula la cuenta en este dispositivo: decidir qué datos usar
export const SetupScreen: React.FC<SetupScreenProps> = ({ email, local, cloud, onUseLocal, onUseCloud, onImportFile, onStartFresh, onSignOut }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cloudState = cloud ? stateFromLedger(cloud) : null;

  return (
    <Shell>
      <div>
        <h2 className="text-lg font-black text-gray-900">Vincular tus datos</h2>
        {email && <p className="text-xs text-gray-500 mt-1">Cuenta: {email}</p>}
      </div>

      {local && !cloudState && (
        <>
          <p className="text-sm text-gray-600 leading-relaxed">
            Tu cuenta aún no tiene datos. Encontramos estos en este dispositivo; se copiarán completos a tu
            cuenta (la copia del dispositivo no se borra).
          </p>
          <SummaryCard title="En este dispositivo" summary={summarize(local)} />
          <button onClick={onUseLocal} className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-2xl shadow-lg">
            Subir a mi cuenta y continuar
          </button>
        </>
      )}

      {local && cloudState && (
        <>
          <p className="text-sm text-gray-600 leading-relaxed">
            Tu cuenta ya tiene datos y este dispositivo también. Elige cuáles conservar.
          </p>
          <SummaryCard title="En tu cuenta" summary={summarize(cloudState)} />
          <SummaryCard title="En este dispositivo" summary={summarize(local)} />
          <button onClick={onUseCloud} className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-2xl shadow-lg">
            Usar los datos de mi cuenta
          </button>
          <button
            onClick={() => { if (window.confirm('Los datos de tu cuenta se reemplazarán por los de este dispositivo. ¿Continuar?')) onUseLocal(); }}
            className="w-full py-3 bg-white border border-gray-200 text-gray-800 font-bold rounded-2xl"
          >
            Reemplazar la cuenta con los de este dispositivo
          </button>
        </>
      )}

      {!local && !cloudState && (
        <p className="text-sm text-gray-600 leading-relaxed">
          Tu cuenta aún no tiene datos. Puedes restaurar un archivo de respaldo exportado desde la app o
          empezar desde cero.
        </p>
      )}

      <div className="pt-2 border-t border-gray-100 space-y-2">
        <button onClick={() => fileRef.current?.click()} className="w-full py-3 bg-white border border-gray-200 text-gray-800 font-bold rounded-2xl">
          Restaurar desde archivo de respaldo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = '';
          }}
        />
        {!local && !cloudState && (
          <button onClick={onStartFresh} className="w-full py-3 text-gray-600 text-sm font-bold rounded-2xl hover:bg-gray-50">
            Empezar desde cero
          </button>
        )}
        <button onClick={onSignOut} className="w-full py-2 text-gray-500 text-xs font-medium">
          Usar otra cuenta
        </button>
      </div>
    </Shell>
  );
};
