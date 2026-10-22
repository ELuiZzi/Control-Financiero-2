# Configurar la nube (Firebase)

Mientras no se configure Firebase, la app funciona igual que antes: los datos viven solo en el dispositivo.
Al configurarla, la app pide iniciar sesión con Google y guarda todo en tu cuenta.

## 1. Crear el proyecto (gratis)

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google y pulsa **Crear un proyecto**.
   Puedes desactivar Google Analytics; no se usa.
2. El plan gratuito (**Spark**) es suficiente para uso personal. No hace falta tarjeta.

## 2. Activar el inicio de sesión con Google

1. Menú **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso → Google → Habilitar**, elige tu correo de asistencia y **Guardar**.
3. Pestaña **Configuración → Dominios autorizados**: agrega el dominio donde publicas la app
   (por ejemplo `mi-app.netlify.app`). `localhost` ya viene incluido.

## 3. Crear la base de datos

1. Menú **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: la más cercana (por ejemplo `nam5` o `us-central1`). No se puede cambiar después.
3. Elige **modo de producción**.
4. Pestaña **Reglas**: reemplaza todo por el contenido del archivo [`firestore.rules`](firestore.rules)
   de este repositorio y pulsa **Publicar**. Con esas reglas, solo tu cuenta puede leer y escribir tus datos.

## 4. Registrar la app web y copiar su configuración

1. **Configuración del proyecto** (engrane) → **Tus apps** → ícono **`</>`** (Web). Ponle un nombre;
   no actives Firebase Hosting.
2. Copia estos 4 valores del bloque `firebaseConfig`:

   | Valor en Firebase | Variable |
   | --- | --- |
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |
   | `appId` | `VITE_FIREBASE_APP_ID` |

   Estos valores **no son secretos** (viajan dentro de la app); la protección la dan las reglas del paso 3.

## 5. Poner la configuración en la app

- **En el hosting** (recomendado): agrega las 4 variables en la configuración de variables de entorno del
  sitio (en Netlify: *Site configuration → Environment variables*) y vuelve a desplegar.
- **En local**: copia `.env.example` como `.env`, llena los valores y ejecuta `npm run dev`.

## 6. Migrar tus datos

1. Abre la app publicada **en el celular que tiene tus datos** e inicia sesión con Google.
2. La app detecta los datos del dispositivo y muestra un resumen (saldo total, movimientos y programados).
   Pulsa **Subir a mi cuenta y continuar**. Los saldos quedan exactamente iguales y la copia del celular
   no se borra.
3. También puedes restaurar cualquier archivo exportado (de cualquier versión de la app) con
   **Restaurar desde archivo de respaldo**, ya sea en esa pantalla o después en *Gestión de Archivos y Copias*.
4. En otro dispositivo, solo inicia sesión: los datos aparecen solos.

## Cómo funciona

- Cada cambio se guarda primero en el dispositivo y se sube en segundo plano; sin conexión la app sigue
  funcionando y sincroniza al reconectar. El pie de página indica el estado.
- Puedes usar la app en varios dispositivos a la vez; los cambios se combinan sin pisarse, y un cargo
  automático o un pago flotante registrado en dos dispositivos cuenta una sola vez.
- Los puntos de restauración rápida se siguen guardando solo en cada dispositivo.
- Estructura en Firestore: `users/{uid}` (saldos base y reparto), `users/{uid}/transactions` y
  `users/{uid}/fixedExpenses`.

## Si el inicio de sesión falla en el celular

Algunos navegadores (sobre todo Safari y la app instalada en la pantalla de inicio del iPhone) bloquean la
ventana de Google. La app intenta entonces por redirección. Si aun así no funciona, en Netlify:

1. Agrega al inicio de `public/_redirects` (cambia `TU-PROYECTO` por tu `projectId`):

   ```
   /__/auth/*  https://TU-PROYECTO.firebaseapp.com/__/auth/:splat  200
   ```

2. Cambia `VITE_FIREBASE_AUTH_DOMAIN` por tu propio dominio (por ejemplo `mi-app.netlify.app`).
3. En Google Cloud Console → *APIs y servicios → Credenciales → cliente OAuth web*, agrega
   `https://mi-app.netlify.app/__/auth/handler` a los URI de redireccionamiento autorizados.

## Desarrollo con emuladores

```bash
npm i -g firebase-tools
firebase emulators:start --only auth,firestore --project demo-finance
# en otra terminal:
VITE_FIREBASE_API_KEY=demo VITE_FIREBASE_AUTH_DOMAIN=demo-finance.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=demo-finance VITE_FIREBASE_APP_ID=demo VITE_FIREBASE_EMULATORS=true npm run dev
```
