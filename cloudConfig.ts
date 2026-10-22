// Configuración pública del proyecto de Firebase (no es secreta: la seguridad la dan las
// reglas de Firestore). Se define con variables VITE_FIREBASE_* en .env o en el hosting.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

// Sin configuración la app funciona como antes: solo en este dispositivo
export const isCloudConfigured = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

export const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
