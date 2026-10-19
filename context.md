# AV CONTROL — Contexto

> Sistema Integral de Gestion Audiovisual — Grupo Ortiz
> Raiz: /Users/govideo/Documents/PAGINAS WEB/VISUAL
> Owner: JUANPA (tecnico) | Ana Torres (Lider Audiovisual, owner funcional)

## Que es

App web real (no maqueta). Centraliza operacion del depto audiovisual: requisiciones, proyectos, tareas, salidas de grabacion a fabricas, equipo AV, equipo humano, calendario, postproduccion/entregables, metricas, reportes.

## Entidades clave (no confundir)

- Requisicion: solicitud de contenido, pasa por aprobacion.
- Proyecto: unidad de trabajo, nace de 1+ requisiciones aprobadas.
- Tarea: trabajo atomico dentro de un proyecto.
- Jornada/Salida de grabacion: evento de produccion en planta o locacion externa.
- Entregable: archivo final versionado, vinculado a proyecto.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui + Lucide + Recharts + TanStack Query + React Hook Form + Zod.
- Backend: Firebase (Auth, Firestore, Storage, Cloud Functions, Hosting).
- Extras: Calendario interactivo, export PDF/Excel, notificaciones por correo (Cloud Functions, sin credenciales en frontend), realtime, PWA.

## Identidad visual

Ver `DESIGN_SYSTEM.md`.

## Roles (5 + 1 permiso especial)

1. Superadministrador
2. Lider audiovisual
3. Colaborador audiovisual
4. Solicitante
5. Aprobador departamental
+ Permiso especial: "Gestor de requisiciones" (venta/gestion, ej. community manager) — scope limitado, ver `SECURITY.md`.

## Modulos (13)

1. Dashboard principal
2. Requisiciones
3. Proyectos
4. Grabaciones y salidas a fabricas (modulo critico)
5. Equipo audiovisual (inventario)
6. Equipo humano
7. Calendario general
8. Postproduccion y entregables
9. Metricas y reportes
10. Autenticacion y permisos (transversal)
11. Notificaciones (transversal, Cloud Functions)
12. Archivos/referencias
13. Configuracion

## Referencia visual recibida

Mockup dashboard: `/Users/govideo/Downloads/WhatsApp Image 2026-10-14 at 8.33.10 a. m..jpeg`
Usuario: Ana Torres, Lider Audiovisual. Sidebar: Inicio, Requisiciones, Proyectos, Calendario, Equipo, Entregables, Metricas, Archivos, Reportes, Configuracion.

## Brief original

Brief completo del usuario (13 secciones, roles, campos, estados, formulas) recibido 2026-10-14. Fuente de verdad para requerimientos — no reinventar scope, consultar antes de recortar funcionalidad.
