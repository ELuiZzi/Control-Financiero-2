import localforage from 'localforage';
import CryptoJS from 'crypto-js';
import { AppState } from './types';
import { STORAGE_KEY, INITIAL_STATE } from './constants';

const SECRET_KEY = 'finance_flow_secure_key_v1'; // Clave de encriptación interna

localforage.config({
    name: 'FinanceFlowDB',
    storeName: 'finance_store',
    description: 'Persistencia de transacciones y estados financieros'
});

const encryptData = (data: any): string => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

const decryptData = (ciphertext: string): any => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedData);
    } catch (e) {
        console.error("Error descifrando los datos:", e);
        return null;
    }
};

export const DB = {
    loadState: async (): Promise<AppState> => {
        try {
            const encryptedState = await localforage.getItem<string>(STORAGE_KEY);
            if (!encryptedState) return INITIAL_STATE;
            
            // Retrocompatibilidad: Si el dato no es un string (no está encriptado todavía), lo tratamos normal
            if (typeof encryptedState !== 'string') {
                 // Si venía sin encriptar, lo guardaremos encriptado en el próximo ciclo
                 return encryptedState as unknown as AppState;
            }

            const state = decryptData(encryptedState);
            return state || INITIAL_STATE;
        } catch (error) {
            console.error("Error crítico leyendo la base de datos:", error);
            return INITIAL_STATE;
        }
    },

    saveState: async (state: AppState): Promise<void> => {
        try {
            const encryptedState = encryptData(state);
            await localforage.setItem(STORAGE_KEY, encryptedState);
        } catch (error) {
            console.error("Error guardando el flujo de capital:", error);
        }
    },

    migrateFromLegacyStorage: async (): Promise<boolean> => {
        const legacyData = localStorage.getItem(STORAGE_KEY);
        if (legacyData) {
            try {
                const parsedData = JSON.parse(legacyData);
                const encryptedState = encryptData(parsedData);
                await localforage.setItem(STORAGE_KEY, encryptedState);
                localStorage.removeItem(STORAGE_KEY);
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }
};