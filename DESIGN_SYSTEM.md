# AV CONTROL — Design System

## Identidad

- Plataforma: AV CONTROL
- Subtitulo: Grupo Ortiz | Gestion Audiovisual
- Idioma: Español, 100%

## Colores

| Token | Valor | Uso |
|---|---|---|
| bg-primary | #FFFFFF | Fondo principal |
| bg-secondary | #F6F8FB | Fondo secundario, paneles |
| text-primary | #111827 | Texto principal |
| accent | #000000 | Negro — botones, estados activos, acciones principales |
| accent-dato | #C1EB1F | Verde lima — graficas, iconos de KPI, avatares |
| border | #E5E7EB | Bordes suaves |

- No fondos oscuros en dashboard principal.
- Tarjetas blancas, sombra discreta, radius 12-16px.

## Tipografia

- Inter (toda la app).

## Iconografia

- Lucide (lucide-react).

## Graficas

- Recharts. Ver patron de color en mockup: barras duotono (negro + gris), donut multicolor para categorias.

## Layout

- Sidebar fijo izquierdo (logo + nav + storage indicator abajo).
- Header: busqueda global, notificaciones, perfil usuario (avatar + nombre + rol).
- Desktop-first, target 1920x1080. Adaptar a tablet/movil.
- Boton accion principal (ej. "Nueva requisicion"): pill negro, esquina superior derecha.

## Referencia

Mockup real: `/Users/govideo/Downloads/WhatsApp Image 2026-10-14 at 8.33.10 a. m..jpeg`
Secciones visibles: Inicio, Requisiciones, Proyectos, Calendario, Equipo, Entregables, Metricas, Archivos, Reportes, Configuracion.
Tarjetas KPI con icono + numero + variacion %. Tabla de requisiciones recientes con avatar+badge de tipo+badge de estado. Calendario mini con leyenda de colores por tipo de evento. Carga de trabajo con barra de progreso por colaborador. Feed de actividad reciente con icono por tipo de accion.
