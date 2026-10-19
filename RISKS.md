# AV CONTROL — Riesgos

| Riesgo | Severidad | Mitigacion |
|---|---|---|
| Scope muy grande para build directo (13 modulos) | Alto | Fasear en v1/v2, ver MVP_BREAKDOWN.md |
| Permisos complejos (gestor de requisiciones con scope parcial) solo en frontend | Critico | Validar TODO en Firestore rules + Cloud Functions, nunca confiar en ocultar boton |
| Checklist de seguridad en planta sustituyendo procedimientos oficiales | Critico (seguridad fisica) | Dejar explicito en UI que no reemplaza permisos oficiales de la instalacion |
| Notificaciones por correo con credenciales expuestas | Alto | Enviar solo desde Cloud Functions, nunca desde frontend |
| Calculo de avance de proyecto solo por conteo de tareas | Medio | Implementar pesos por etapa/entregable desde el inicio del modelo de datos |
| Datos de demo confundidos con datos reales | Medio | Marcar explicitamente cualquier dato de ejemplo, reemplazable |
| Brief seccion 13 incompleta (mensaje cortado) | Bajo | Confirmar con usuario antes de cerrar modulo de metricas |
