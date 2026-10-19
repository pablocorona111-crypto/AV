# AV CONTROL — MVP Breakdown

> % MVP = (peso completado / peso total) * 100
> Actualizado: 2026-10-14 — primer build generado (scaffold + 11 modulos UI en modo demo).

| Modulo | Peso | % avance | Nota |
|---|---|---|---|
| Auth + Roles + permisos backend | 15 | 60% | Login + guia de roles + reglas Firestore (`firestore.rules`) escritas. Falta: proyecto Firebase real, probar reglas con emulator, Cloud Functions de validacion. |
| Dashboard principal | 10 | 100% | KPIs, graficas (Recharts), tabla reciente, carga de equipo, actividad — calculado desde datos (demo o Firestore). |
| Requisiciones | 15 | 90% | Tabla, Kanban, Mis solicitudes, Pendientes aprobacion, Asignadas a gestor, formulario nueva requisicion, aprobar/rechazar. Falta: edicion post-envio, adjuntar archivos, notificaciones correo. |
| Proyectos | 15 | 55% | Listado + detalle con etapas y colaboradores. Falta: crear/editar proyecto desde UI, tareas, pesos de avance configurables. |
| Grabaciones y salidas a fabricas | 15 | 40% | Listado + formulario nueva salida. Falta: call sheet PDF, shot list, checklist seguridad en planta, bitacora de grabacion. |
| Equipo audiovisual + humano | 8 | 50% | Tablas de inventario y carga de trabajo. Falta: reservas, check-in/check-out, deteccion de conflictos. |
| Calendario general | 8 | 50% | Vista mensual con eventos de requisiciones/salidas/entregas. Falta: vistas semana/dia/agenda, deteccion de conflictos, reprogramar. |
| Postproduccion y entregables | 10 | 30% | Listado con estado y version. Falta: crear/subir version, workflow de aprobacion. |
| Metricas y reportes | 7 | 40% | KPIs calculados + 1 grafica. Falta: tiempos promedio (requiere timestamps reales), export PDF/Excel real. |
| Notificaciones por correo (Cloud Functions) | 5 | 0% | No implementado — requiere Firebase project real + proveedor de correo. |
| **Total ponderado** | **115** | **~53%** | — |

## Como correr lo que existe

```bash
cd VISUAL
npm install
npm run dev
```

Sin `.env.local` con credenciales Firebase, la app corre en **modo demo**: datos de ejemplo
marcados con badge "Demo", login acepta cualquier usuario de la lista demo, y el menu del
perfil permite previsualizar los 5 roles + el permiso de gestor de requisiciones.

Con `.env.local` (copiar `.env.example`) y un proyecto Firebase real, la app usa
Firestore/Auth reales automaticamente — mismo codigo, sin cambios.

## Siguiente sprint sugerido

1. Crear proyecto Firebase real, desplegar `firestore.rules`, probar con emulator.
2. Conectar Cloud Functions de notificaciones por correo.
3. CRUD completo de Proyectos y Entregables (hoy son de solo lectura + creacion via Requisiciones/Salidas).
4. Call sheet PDF + shot list + bitacora de grabacion (modulo de salidas).
