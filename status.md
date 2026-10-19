# AV CONTROL — Status

> Actualizado: 2026-10-14

## Fase actual

Fase 5 — Build. Primer build generado: scaffold completo + 11 modulos funcionando en modo demo.

## % MVP

~53% ponderado. Ver `MVP_BREAKDOWN.md` para detalle por modulo.

## Semaforo

Verde — app corre, compila sin errores, probada en navegador (Playwright) sin errores de consola en las 11 rutas. Pendiente conectar Firebase real.

## Que existe ahora

- Scaffold Vite + React 18 + TypeScript + Tailwind + Firebase SDK, sin errores de tipos (`npx tsc -b` limpio) y build de produccion exitoso.
- Auth con modo demo (sin Firebase configurado, usuarios de ejemplo) y modo real (Firebase Auth) usando el mismo codigo.
- Layout (sidebar + header) fiel al mockup recibido, colores/tipografia segun `DESIGN_SYSTEM.md`.
- Roles y permisos de UI (`lib/roles.ts`) + reglas Firestore borrador (`firestore.rules`) segun `SECURITY.md`.
- 11 paginas: Dashboard, Requisiciones (tabla/kanban/mis solicitudes/pendientes/gestor), Proyectos, Salidas, Calendario, Equipo, Entregables, Metricas, Archivos, Reportes, Configuracion.
- Probado con Playwright headless: todas las rutas cargan, 0 errores de consola. Se encontraron y corrigieron 2 bugs reales durante la verificacion (ver abajo).

## Bugs encontrados y corregidos hoy

1. `formatFecha` interpretaba fechas "YYYY-MM-DD" como UTC, mostrando un dia menos en zonas horarias detras de UTC (afecta Mexico). Corregido parseando como fecha local.
2. `ConfiguracionPage`: el panel de permisos del gestor de requisiciones nunca aparecia porque el estado se inicializaba antes de que cargaran los datos async. Corregido con `useEffect` de sincronizacion.

## Siguiente paso

1. Crear proyecto Firebase real (Auth + Firestore + Storage), copiar `.env.example` a `.env.local`.
2. Desplegar `firestore.rules`, probar con Firebase Emulator.
3. Cloud Functions de notificaciones por correo.
4. CRUD completo de Proyectos y Entregables (hoy son de lectura + alta basica).
5. Call sheet PDF / shot list / bitacora en modulo de Salidas.

## Bloqueos

Ninguno tecnico. Pendiente que el usuario decida: proyecto Firebase a usar, proveedor de correo, y prioridad del siguiente sprint (ver arriba).
