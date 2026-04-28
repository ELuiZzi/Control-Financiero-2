import localforage from 'localforage';
import { AppState, Snapshot } from './types';
import { STORAGE_KEY, SNAPSHOT_KEY, INITIAL_STATE } from './constants';

// Configuración de la base de datos local para la PWA
localforage.config({
    name: 'FinanceFlowDB',
    storeName: 'finance_store',
    description: 'Persistencia de transacciones y estados financieros'
});

export const DB = {
    // Carga el estado principal
    loadState: async (): Promise<AppState> => {
        try {
            const state = await localforage.getItem<AppState>(STORAGE_KEY);
            return state || INITIAL_STATE;
        } catch (error) {
            console.error("Error crítico leyendo la base de datos:", error);
            return INITIAL_STATE; // Fallback de seguridad
        }
    },

    // Guarda el estado principal
    saveState: async (state: AppState): Promise<void> => {
        try {
            await localforage.setItem(STORAGE_KEY, state);
        } catch (error) {
            console.error("Error guardando el flujo de capital:", error);
        }
    },

    // Migración de datos (De localStorage a IndexedDB)
    migrateFromLegacyStorage: async (): Promise<boolean> => {
        const legacyData = localStorage.getItem(STORAGE_KEY);
        if (legacyData) {
            try {
                // Aquí deberíamos hacer un mapeo para convertir 'inversion' a 'negocio' en el historial viejo
                const parsedData = JSON.parse(legacyData);
                // NOTA: Implementaremos la lógica de conversión en el siguiente paso
                await localforage.setItem(STORAGE_KEY, parsedData);
                localStorage.removeItem(STORAGE_KEY); // Limpiamos el rastro viejo
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }
};