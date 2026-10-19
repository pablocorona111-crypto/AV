# AV CONTROL — Seguridad y permisos

## Regla de oro

Ocultar un boton en UI NO es autorizacion. Todo permiso se valida en Firestore Security Rules y/o Cloud Functions.

## Roles

1. Superadministrador — acceso total.
2. Lider audiovisual — aprueba/rechaza requisiciones, crea proyectos, asigna personal, autoriza salidas, gestiona recursos, revisa entregables, metricas globales, asigna/retira al gestor de requisiciones, recibe notificaciones por correo de eventos clave.
3. Colaborador audiovisual — sus tareas, avances, horas, jornadas asignadas, evidencias, enviar entregables a revision.
4. Solicitante — crea requisiciones, consulta las suyas, comentarios, referencias, revisa entregables si autorizado.
5. Aprobador departamental — valida solicitudes de su depto, aprueba contenido cuando corresponda.

## Permiso especial: Gestor de requisiciones (venta/gestion)

Asignable a cualquier usuario (ej. community manager) por el Lider audiovisual. Config granular por el lider:

Puede (si habilitado):
- Crear requisiciones en nombre de terceros
- Editar requisiciones despues de enviadas
- Adjuntar archivos
- Ver requisiciones de otros usuarios
- Ver info del solicitante / proyecto vinculado
- Ver fechas y estados de produccion
- Notificaciones por correo / dentro del sistema

Nunca puede (hard rule, sin excepcion de config):
- Aprobar o rechazar sus propias requisiciones
- Modificar decisiones del lider audiovisual o aprobador departamental
- Ver metricas globales, reportes financieros, config general, gestion de usuarios
- Auto-asignarse o auto-reasignarse requisiciones
- Modificar campos restringidos, fechas autorizadas, prioridades criticas, responsables sin autorizacion

## Asignacion de responsable de requisicion

Solo el Lider audiovisual asigna/cambia/retira al gestor de requisiciones. Debe quedar en historial de auditoria (coleccion `audit_log`, inmutable, con quien/cuando/que cambio).

## Firestore Security Rules — checklist

- [ ] Reglas por coleccion validan rol + ownership (uid == responsable_id o uid en colaboradores)
- [ ] Reglas de gestor de requisiciones filtran por `assignedTo == request.auth.uid` o `createdBy == request.auth.uid`
- [ ] Campos restringidos protegidos con `request.resource.data.diff(resource.data).affectedKeys()` para rechazar cambios no autorizados
- [ ] Ninguna Cloud Function expone API key de correo al cliente
- [ ] Reglas probadas con Firebase Emulator antes de deploy

## Notificaciones

- Enviar solo desde Cloud Functions (trigger onCreate/onUpdate en Firestore).
- Registrar en `notification_log`: estado (enviado/entregado/fallido/reintentado), destinatario, evento origen.
- No exponer credenciales SMTP/API en frontend ni en repo (usar Firebase Functions config / Secret Manager).

## Datos de demo

Cualquier dato de ejemplo debe marcarse explicitamente como demo y ser reemplazable — nunca presentarse como informacion real.
