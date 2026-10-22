# AV CONTROL — Backlog

## Sprint 0 — Fundacion

- [x] Setup Vite + React + TS + Tailwind + shadcn/ui (primitivos propios estilo shadcn)
- [ ] Setup Firebase project real (Auth, Firestore, Storage, Hosting) — codigo listo, falta crear el proyecto en consola Firebase
- [x] Definir modelo de datos Firestore (colecciones + relaciones) — ver `src/types/index.ts`
- [x] Reglas de seguridad Firestore por rol (no solo UI) — borrador en `firestore.rules`, falta probar con emulator
- [x] Layout base: sidebar + header (ver mockup en context.md)
- [x] Auth: login, roles, permiso especial "gestor de requisiciones" (modo demo + modo Firebase real)

## Modulo: Requisiciones

- [x] Formulario nueva requisicion (campos clave de seccion 06 del brief)
- [x] Folio automatico
- [x] Estados: Borrador → Enviada → En evaluacion → Aprobada/Rechazada/Requiere info → En planeacion
- [x] Vistas: Kanban, Tabla, Mis solicitudes, Pendientes aprobacion, Asignadas a gestor
- [ ] Vista Calendario de requisiciones dedicada (hoy integrada en Calendario general)
- [ ] Generar proyecto(s) desde requisicion aprobada (boton explicito)
- [ ] Historial de version de brief (sin perder anteriores)
- [ ] Editar requisicion despues de enviada (gestor con permiso)
- [ ] Adjuntar archivos (Firebase Storage)
- [ ] Notificaciones por correo (Cloud Functions) por evento

## Modulo: Proyectos

- [ ] Crear/editar proyecto desde UI (hoy solo lectura, nace de datos demo/Firestore)
- [x] Etapas con progreso visual: Planeacion → ... → Cerrado
- [ ] Tareas por proyecto (CRUD)
- [ ] Avance ponderado configurable por etapa/entregable (hoy es un campo fijo)
- [x] Permisos de solo-lectura filtrados para gestor de requisiciones (via roles)

## Modulo: Grabaciones y salidas a fabricas (critico)

- [x] Nueva salida (campos clave de seccion 08-A)
- [ ] Call sheet / hoja de llamado, export PDF
- [ ] Shot list editable con estados de toma
- [ ] Checklist operacion en planta (no sustituye permisos oficiales) — hoy solo el aviso de texto
- [ ] Bitacora de grabacion + boton finalizar jornada
- [ ] Levantamiento de contenido (material capturado vs respaldado)
- [x] Soporte multi-proyecto por salida (campo `proyectosRelacionados`)

## Modulo: Equipo audiovisual

- [x] Inventario con campos clave de seccion 09
- [ ] Reserva por jornada, deteccion de conflictos
- [ ] Check-out / check-in con responsable y estado fisico

## Modulo: Equipo humano

- [x] Perfiles colaborador (seccion 10)
- [x] Carga de trabajo estimada vs real (tabla con barra de progreso)

## Modulo: Calendario general

- [x] Vista mensual con eventos de requisiciones/salidas/entregas
- [ ] Vistas semanal/diaria/agenda/por colaborador/por planta
- [ ] Deteccion de conflictos horario/recursos
- [ ] Reprogramar con drag + confirmacion
- [ ] Integracion correo lider audiovisual (notificacion + evento opcional)

## Modulo: Postproduccion y entregables

- [x] Listado con version y estado
- [ ] Crear/subir nueva version desde UI (sin sobrescribir anteriores)
- [ ] Workflow de aprobacion (comentarios, aprobador)
- [ ] Config pendiente: crear cuenta de servicio de Google (Drive API) y compartirle la carpeta
      "AV Control" de Drive (rol Lector), luego agregar `GOOGLE_SERVICE_ACCOUNT_EMAIL` y
      `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` en Vercel (Project Settings > Environment Variables) —
      sin esto `api/drive-video.ts` (reproductor propio) no puede traer los videos

## Modulo: Metricas y reportes

- [x] KPIs basicos calculados desde datos reales (requisiciones/proyectos/entregables)
- [ ] Tiempos promedio (proyecto, revision) — requiere timestamps reales en tareas/jornadas
- [ ] Export PDF/Excel real (hoy botones son placeholder, requiere Cloud Function)

## Transversal

- [ ] Cloud Functions de notificaciones por correo (ningun evento dispara correo aun)
- [ ] Firebase Storage para archivos reales (hoy solo URLs de referencia)
- [ ] Calendario corporativo via OAuth

## Pendiente de aclarar con usuario

- [ ] Brief seccion 13 (Metricas) parecia cortada en el mensaje original — confirmar lista completa de indicadores 13-en adelante.
