// Tipos de dominio AV CONTROL — ver context.md y brief original para detalle completo.

export type Role =
  | "superadmin"
  | "lider_audiovisual"
  | "colaborador_audiovisual"
  | "solicitante"
  | "aprobador_departamental"
  | "community";

/** Permiso especial independiente del rol. Ver SECURITY.md. */
export interface GestorRequisicionesPermisos {
  activo: boolean;
  crearEnNombreDeTerceros: boolean;
  editarDespuesDeEnviar: boolean;
  adjuntarArchivos: boolean;
  verRequisicionesDeOtros: boolean;
  verInfoSolicitante: boolean;
  verInfoProyectoVinculado: boolean;
  verFechasYEstadosProduccion: boolean;
  notificacionesCorreo: boolean;
  notificacionesSistema: boolean;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Role;
  puesto?: string;
  especialidades?: string[];
  avatarUrl?: string;
  gestorRequisiciones?: GestorRequisicionesPermisos;
  activo: boolean;
  creadoEn: string;
}

export type EstadoRequisicion =
  | "borrador"
  | "enviada"
  | "en_evaluacion"
  | "aprobada"
  | "rechazada"
  | "requiere_informacion"
  | "en_planeacion";

export type CategoriaContenido =
  | "video_institucional"
  | "video_industrial"
  | "video_producto"
  | "fotografia_producto"
  | "fotografia_industrial"
  | "cobertura_evento"
  | "diseno_grafico"
  | "animacion_2d_3d"
  | "motion_graphics"
  | "contenido_redes_sociales"
  | "entrevistas"
  | "capacitacion"
  | "otros";

export type Prioridad = "baja" | "media" | "alta" | "critica";

export interface Requisicion {
  id: string;
  folio: string;
  titulo: string;
  departamentoSolicitante: string;
  nombreSolicitante: string;
  solicitanteId: string;
  responsableVentaId?: string;
  responsableVentaCorreo?: string;
  tipoContenido: CategoriaContenido;
  objetivo: string;
  descripcion: string;
  publicoObjetivo?: string;
  formatoSolicitado?: string;
  cantidadEntregables: number;
  fechaRequerida: string;
  prioridad: Prioridad;
  referenciasVisuales?: string[];
  archivosAdjuntos?: string[];
  ubicacion?: string;
  necesitaGrabacion: boolean;
  observaciones?: string;
  estado: EstadoRequisicion;
  liderAudiovisualCorreo?: string;
  aprobadoPor?: string;
  aprobadoEn?: string;
  proyectosVinculados?: string[];
  creadoEn: string;
  actualizadoEn: string;
}

export type EtapaProyecto =
  | "planeacion"
  | "preproduccion"
  | "produccion"
  | "ingesta_respaldo"
  | "edicion"
  | "animacion_acabados"
  | "revision"
  | "correcciones"
  | "aprobado"
  | "entregado"
  | "cerrado";

export interface Proyecto {
  id: string;
  folio: string;
  nombre: string;
  requisicionesVinculadas: string[];
  responsablePrincipalId: string;
  colaboradoresIds: string[];
  departamentoSolicitante: string;
  prioridad: Prioridad;
  fechaInicio: string;
  fechaCompromiso: string;
  etapaActual: EtapaProyecto;
  etapasOmitidas?: EtapaProyecto[];
  porcentajeAvance: number;
  creadoEn: string;
  actualizadoEn: string;
}

export type EstadoTarea = "pendiente" | "en_proceso" | "completada" | "bloqueada";

export interface Tarea {
  id: string;
  proyectoId: string;
  titulo: string;
  descripcion?: string;
  asignadoA: string;
  estado: EstadoTarea;
  fechaLimite?: string;
  pesoEtapa?: number;
}

export type EstadoGuion = "borrador" | "en_revision" | "correcciones" | "aprobado";

export interface Guion {
  id: string;
  folio: string;
  proyectoId: string;
  titulo: string;
  contenido: string;
  responsableId: string;
  /** Gestor de requisiciones autorizado a aprobar (heredado de la requisicion vinculada al proyecto). */
  gestorResponsableId?: string;
  estado: EstadoGuion;
  aprobadorId?: string;
  creadoEn: string;
}

export type EstadoEntregable =
  | "pendiente"
  | "en_proceso"
  | "en_revision"
  | "correcciones"
  | "aprobado"
  | "entregado";

export interface Entregable {
  id: string;
  /** Sin valor cuando el lider lo crea directo, sin requisicion/proyecto previo (ej. un cambio
   * de pagina web que le asignaron de palabra). */
  proyectoId?: string;
  nombre: string;
  tipo: CategoriaContenido;
  formato?: string;
  /** Orientacion del video — se guarda al subirlo para abrir el visor sin parpadeo. */
  orientacionVideo?: "vertical" | "horizontal";
  resolucion?: string;
  duracion?: string;
  responsableId: string;
  fechaCompromiso: string;
  version: string;
  estado: EstadoEntregable;
  urlRevision?: string;
  urlFinal?: string;
  aprobadorId?: string;
  creadoEn: string;
  /** Cuando `estado` paso a "entregado" — para agrupar entregas por mes en la grafica del lider. */
  fechaEntregado?: string;
  /** Cuando `estado` paso a "aprobado" — una vez aprobado ya cuenta como cumplido en las
   * graficas, aunque todavia no se marque "entregado" (publicado). */
  fechaAprobado?: string;
}

export type TipoActividadSalida =
  | "levantamiento_contenido"
  | "grabacion_proceso_industrial"
  | "fotografia_maquinaria"
  | "fotografia_producto"
  | "entrevista"
  | "recorrido_reconocimiento"
  | "grabacion_dron"
  | "cobertura_evento"
  | "grabacion_institucional"
  | "visita_tecnica";

export type EstadoAutorizacionSalida = "pendiente" | "autorizada" | "rechazada";

export interface SalidaGrabacion {
  id: string;
  folio: string;
  nombreJornada: string;
  proyectosRelacionados: string[];
  tipoActividad: TipoActividadSalida;
  planta: string;
  direccion?: string;
  contactoPlanta?: string;
  telefonoContacto?: string;
  fecha: string;
  horaSalida: string;
  horaEstimadaLlegada: string;
  horaInicioGrabacion?: string;
  horaEstimadaFinalizacion?: string;
  horaRegreso?: string;
  personalAsignado: string[];
  responsableProduccionId: string;
  equipoRequerido: string[];
  transporte?: string;
  estadoAutorizacion: EstadoAutorizacionSalida;
  observaciones?: string;
  creadoEn: string;
}

export type EstadoToma =
  | "pendiente"
  | "en_proceso"
  | "realizada"
  | "requiere_repeticion"
  | "cancelada";

export interface Toma {
  id: string;
  salidaId: string;
  numero: number;
  areaOMaquinaria: string;
  descripcion: string;
  tipoDePlano?: string;
  movimientoCamara?: string;
  equipoNecesario?: string;
  prioridad: Prioridad;
  responsableId?: string;
  estado: EstadoToma;
  observaciones?: string;
}

export type EstadoEquipo = "disponible" | "en_uso" | "mantenimiento" | "baja";

export interface EquipoAV {
  id: string;
  codigoInterno: string;
  nombre: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  estado: EstadoEquipo;
  responsableId?: string;
  ubicacion?: string;
  disponibilidad: boolean;
  ultimoMantenimiento?: string;
  proximoMantenimiento?: string;
}

export interface Colaborador {
  id: string;
  nombre: string;
  puesto: string;
  especialidades: string[];
  disponibilidad: "disponible" | "en_produccion" | "ausente";
  proyectosAsignados: string[];
  tareasPendientes: number;
  cargaEstimada: number;
  cargaReal: number;
}

export interface Notificacion {
  id: string;
  paraUsuarioId: string;
  texto: string;
  entregableId?: string;
  guionId?: string;
  leida: boolean;
  creadoEn: string;
}

export interface Invitacion {
  correo: string;
  nombre: string;
  rol: Role;
  gestorRequisiciones?: GestorRequisicionesPermisos;
  creadoPorId: string;
  creadoEn: string;
}

export interface KpiDashboard {
  requisicionesRecibidas: number;
  requisicionesPendientesAprobacion: number;
  proyectosActivos: number;
  proyectosEnPostproduccion: number;
  entregablesFinalizados: number;
  entregasAtrasadas: number;
  porcentajeCumplimiento: number;
  salidasProgramadas: number;
  colaboradoresDisponibles: number;
  proyectosQueRequierenAtencion: number;
}
