# Finance Flow (Lumtech)

PWA de control financiero personal y de negocio. Todo se guarda en el navegador (IndexedDB vía localforage); no hay servidor.

## Funciones

- Tres cuentas: **Reserva (ahorro)**, **Personales** y **Lumtech (negocio)**.
- Ingresos con reparto automático configurable para productos y servicios (se reparte en centavos exactos).
- Gastos fijos mensuales, que se cobran solos (incluidos los meses atrasados), y gastos flotantes, que se pagan a mano.
- Resumen mensual, auditoría por etiquetas e historial con opción de deshacer.
- Respaldos en archivo JSON y puntos de restauración dentro del navegador.
- Funciona sin conexión una vez cargada (service worker solo en producción).

## Desarrollo

Requisitos: Node.js 20+

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:3000
npm run typecheck  # revisión de tipos
npm run build      # revisión de tipos + build de producción en dist/
npm run preview    # sirve dist/ (para probar la PWA y el modo offline)
```

## Estructura

| Archivo | Contenido |
| --- | --- |
| `store.ts` | Estado global (zustand) y todas las operaciones sobre saldos |
| `finance.ts` | Reparto en centavos y cálculo de gastos fijos vencidos |
| `normalize.ts` | Validación de respaldos, puntos de restauración y datos antiguos |
| `db.ts` | Persistencia en IndexedDB |
| `public/sw.js` | Service worker (caché offline) |
| `components/` | Interfaz |
