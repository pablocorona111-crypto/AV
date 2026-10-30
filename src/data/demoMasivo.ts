// DATOS DE DEMOSTRACION MASIVOS — ~3 meses de proyectos, entregas y requisiciones generados
// con fechas RELATIVAS a hoy (la semana actual siempre tiene movimiento) y un generador con
// semilla fija (siempre salen los mismos datos, no cambian en cada recarga). Cada colaborador
// tiene un perfil distinto de cumplimiento para que Rendimiento/Reportes se vean variados.
import type { CategoriaContenido, Entregable, EtapaProyecto, Prioridad, Proyecto, Requisicion, SalidaGrabacion, Usuario } from "@/types";

export const DEMO_USUARIOS_EXTRA: Usuario[] = [
  {
    id: "u-valeria",
    nombre: "Valeria Cruz",
    correo: "valeria.cruz@demo.grupo-ortiz.com",
    rol: "colaborador_audiovisual",
    puesto: "Web y contenido",
    especialidades: ["Paginas web", "Levantamiento de contenido", "Redes sociales"],
    activo: true,
    creadoEn: "2026-02-01",
  },
];

/** Perfil por persona: que hace, cuanto carga por semana y que tan cumplido es. */
const PERFILES: { id: string; tipos: CategoriaContenido[]; porSemana: [number, number]; cumple: number; tarde: number }[] = [
  // Equipo demo de 3 colaboradores + la lider, para simular un departamento chico.
  { id: "u-luis", tipos: ["video_institucional", "contenido_redes_sociales", "video_producto"], porSemana: [2, 4], cumple: 0.95, tarde: 0.1 },
  { id: "u-mariana", tipos: ["fotografia_producto", "fotografia_industrial", "fotografia"], porSemana: [2, 3], cumple: 0.9, tarde: 0.15 },
  { id: "u-valeria", tipos: ["otros", "contenido_redes_sociales", "diseno_grafico"], porSemana: [2, 3], cumple: 0.7, tarde: 0.4 },
  // La lider tambien produce: cambios de pagina web y diseño (sus "mis avances").
  { id: "u-ana", tipos: ["otros", "diseno_grafico", "otros"], porSemana: [1, 2], cumple: 0.9, tarde: 0.15 },
];

const TEMAS: Record<CategoriaContenido, string[]> = {
  video_institucional: ["Video institucional planta", "Mensaje direccion", "Aniversario Grupo Ortiz", "Video valores"],
  video_industrial: ["Proceso de extrusion", "Linea de corte", "Toma aerea planta", "Recorrido almacen"],
  video_producto: ["Video Stretch Film", "Demo playo industrial", "Video bolsa reciclada"],
  fotografia: ["Fotos equipo comercial", "Retratos gerencia", "Fotos oficinas"],
  fotografia_producto: ["Catalogo SKUs nuevos", "Fotos producto Stretch", "Fotos empaque"],
  fotografia_industrial: ["Fotos maquinaria", "Fotos linea produccion", "Fotos seguridad planta"],
  cobertura_evento: ["Cobertura Expo PACK", "Evento fin de mes", "Visita de clientes"],
  diseno_grafico: ["Banner promocion", "Infografia sustentabilidad", "Flyer feria"],
  animacion_2d_3d: ["Animacion 3D maquina", "Animacion proceso reciclaje"],
  motion_graphics: ["Intro corporativa", "Motion KPIs", "Lower thirds"],
  contenido_redes_sociales: ["Reel semanal", "Carrusel tips", "Historia producto", "Reel detras de camaras"],
  entrevistas: ["Entrevista gerente planta", "Testimonio cliente"],
  capacitacion: ["Video capacitacion seguridad", "Tutorial montacargas", "Induccion nuevo ingreso"],
  otros: ["Actualizacion pagina web", "Landing producto", "Levantamiento de contenido planta", "Seccion web sustentabilidad"],
};

const PROYECTOS_BASE: { nombre: string; depto: string; prioridad: Prioridad; etapa: EtapaProyecto }[] = [
  { nombre: "Campaña Stretch Film 2026", depto: "Marketing", prioridad: "alta", etapa: "edicion" },
  { nombre: "Redes sociales semanales", depto: "Marketing", prioridad: "media", etapa: "produccion" },
  { nombre: "Catalogo digital Q4", depto: "Ventas", prioridad: "alta", etapa: "revision" },
  { nombre: "Capacitacion seguridad planta", depto: "Recursos Humanos", prioridad: "media", etapa: "edicion" },
  { nombre: "Expo PACK 2026", depto: "Ventas", prioridad: "critica", etapa: "correcciones" },
  { nombre: "Nueva pagina web corporativa", depto: "Direccion", prioridad: "alta", etapa: "produccion" },
  { nombre: "Video sustentabilidad", depto: "Direccion", prioridad: "media", etapa: "preproduccion" },
  { nombre: "Fotos linea extrusion", depto: "Operaciones", prioridad: "baja", etapa: "entregado" },
  { nombre: "Animacion proceso reciclaje", depto: "Marketing", prioridad: "media", etapa: "animacion_acabados" },
  { nombre: "Testimoniales clientes", depto: "Ventas", prioridad: "media", etapa: "planeacion" },
  { nombre: "Induccion nuevo ingreso", depto: "Recursos Humanos", prioridad: "baja", etapa: "cerrado" },
  { nombre: "Aniversario 40 años", depto: "Direccion", prioridad: "alta", etapa: "produccion" },
];

/** PRNG con semilla (mulberry32) — datos estables entre recargas. */
function crearAzar(semilla: number) {
  let a = semilla;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    r,
    entero: (min: number, max: number) => min + Math.floor(r() * (max - min + 1)),
    uno: <T,>(lista: readonly T[]) => lista[Math.floor(r() * lista.length)],
  };
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function masDias(base: Date, dias: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Dia habil (Lun-Sab) desplazado desde el lunes `lunes`. */
function diaDeSemana(lunes: Date, azar: ReturnType<typeof crearAzar>) {
  return masDias(lunes, azar.entero(0, 5));
}

export function generarDemoMasivo(ahora: Date = new Date()) {
  const azar = crearAzar(20261029);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const lunesActual = masDias(hoy, -((hoy.getDay() + 6) % 7));

  const proyectos: Proyecto[] = PROYECTOS_BASE.map((p, i) => ({
    id: `p-m${i + 1}`,
    folio: `PRY-${310 + i}`,
    nombre: p.nombre,
    requisicionesVinculadas: [],
    responsablePrincipalId: azar.uno(PERFILES.slice(0, 3)).id,
    colaboradoresIds: [azar.uno(PERFILES).id, azar.uno(PERFILES).id],
    departamentoSolicitante: p.depto,
    prioridad: p.prioridad,
    fechaInicio: iso(masDias(hoy, -azar.entero(20, 80))),
    fechaCompromiso: iso(masDias(hoy, azar.entero(-10, 40))),
    etapaActual: p.etapa,
    porcentajeAvance: ["entregado", "cerrado"].includes(p.etapa) ? 100 : azar.entero(10, 90),
    creadoEn: iso(masDias(hoy, -azar.entero(20, 80))),
    actualizadoEn: iso(masDias(hoy, -azar.entero(0, 5))),
  }));

  const entregables: Entregable[] = [];
  let n = 0;
  // 12 semanas atras hasta 2 adelante.
  for (let semana = -12; semana <= 2; semana++) {
    const lunes = masDias(lunesActual, semana * 7);
    for (const perfil of PERFILES) {
      const cantidad = azar.entero(...perfil.porSemana);
      for (let k = 0; k < cantidad; k++) {
        n++;
        const tipo = azar.uno(perfil.tipos);
        const compromiso = diaDeSemana(lunes, azar);
        const creado = masDias(compromiso, -azar.entero(3, 10));
        const proyecto = azar.r() < 0.8 ? azar.uno(proyectos) : undefined;
        const base: Entregable = {
          id: `en-m${n}`,
          ...(proyecto ? { proyectoId: proyecto.id } : {}),
          nombre: `${azar.uno(TEMAS[tipo])} ${n}`,
          tipo,
          responsableId: perfil.id,
          fechaCompromiso: iso(compromiso),
          version: "V01",
          estado: "pendiente",
          creadoEn: `${iso(creado)}T10:00:00`,
        };

        const yaVencio = compromiso < hoy;
        const entrega = yaVencio || azar.r() < 0.3; // a futuro: algunos ya se adelantaron
        if (!entrega || azar.r() > perfil.cumple) {
          // Sin material: en futuro es normal; en pasado cuenta como atrasada.
          base.estado = azar.r() < 0.5 ? "en_proceso" : "pendiente";
          // Avance real reportado por la persona (multiplos de 5), como si moviera su barra.
          base.porcentajeAvance = base.estado === "en_proceso" ? azar.entero(4, 16) * 5 : azar.entero(0, 3) * 5;
          entregables.push(base);
          continue;
        }

        const tarde = azar.r() < perfil.tarde;
        let fecha = masDias(compromiso, tarde ? azar.entero(1, 4) : -azar.entero(0, 2));
        if (fecha > hoy) fecha = hoy;
        if (fecha < creado) fecha = masDias(creado, 1);
        const fechaIso = `${iso(fecha)}T${String(azar.entero(9, 18)).padStart(2, "0")}:30:00`;
        const antiguedad = (hoy.getTime() - fecha.getTime()) / 86_400_000;
        const url = `https://drive.example.com/${base.id}`;
        base.fechaEnviado = fechaIso;

        if (antiguedad > 6 && azar.r() < 0.8) {
          Object.assign(base, { estado: "entregado", version: "FINAL", urlFinal: url, aprobadorId: "u-diana", fechaAprobado: fechaIso, fechaEntregado: fechaIso });
        } else if (antiguedad >= 1 && azar.r() < 0.55) {
          Object.assign(base, { estado: "aprobado", version: "FINAL", urlFinal: url, aprobadorId: "u-diana", fechaAprobado: fechaIso });
        } else {
          // En revision/correcciones: la fecha de entrega se aproxima con creadoEn (ver metricas.ts),
          // asi que se mueve creadoEn al dia real en que subio el material.
          Object.assign(base, {
            estado: azar.r() < 0.7 ? "en_revision" : "correcciones",
            version: azar.r() < 0.5 ? "V01" : "V02",
            urlRevision: url,
            creadoEn: fechaIso,
          });
        }
        entregables.push(base);
      }
    }
  }

  const estadosReq: Requisicion["estado"][] = ["enviada", "en_evaluacion", "aprobada", "aprobada", "aprobada", "requiere_informacion", "en_planeacion"];
  const requisiciones: Requisicion[] = [];
  for (let i = 0; i < 45; i++) {
    const tipo = azar.uno(Object.keys(TEMAS) as CategoriaContenido[]);
    const creado = masDias(hoy, -azar.entero(0, 84));
    const p = azar.uno(PROYECTOS_BASE);
    requisiciones.push({
      id: `r-m${i + 1}`,
      folio: `AV-${1100 + i}`,
      titulo: azar.uno(TEMAS[tipo]),
      departamentoSolicitante: p.depto,
      nombreSolicitante: "Diana Solis",
      solicitanteId: "u-diana",
      tipoContenido: tipo,
      objetivo: "Contenido para difusion interna y comercial",
      descripcion: `Solicitud de ${azar.uno(TEMAS[tipo]).toLowerCase()} para ${p.depto}.`,
      cantidadEntregables: azar.entero(1, 4),
      fechaRequerida: iso(masDias(creado, azar.entero(7, 21))),
      prioridad: azar.uno<Prioridad>(["baja", "media", "media", "alta", "critica"]),
      necesitaGrabacion: azar.r() < 0.6,
      estado: azar.uno(estadosReq),
      creadoEn: iso(creado),
      actualizadoEn: iso(masDias(creado, azar.entero(0, 5))),
    });
  }

  // ~2-3 salidas por mes: la mitad en Morelia, el resto foraneas (otras plantas/ciudades).
  const LUGARES = [
    { planta: "Planta Stretch Film", direccion: "Parque Industrial, Morelia" },
    { planta: "Oficinas corporativas", direccion: "Centro, Morelia" },
    { planta: "Planta Uruapan", direccion: "Zona industrial, Uruapan, Mich." },
    { planta: "Cliente Guadalajara", direccion: "Zapopan, Jal." },
    { planta: "Expo CDMX", direccion: "Centro Citibanamex, CDMX" },
    { planta: "Planta Querétaro", direccion: "Parque Industrial, Querétaro" },
  ];
  const salidas: SalidaGrabacion[] = [];
  for (let i = 0; i < 9; i++) {
    const fecha = masDias(hoy, -azar.entero(0, 84));
    const lugar = azar.uno(LUGARES);
    salidas.push({
      id: `sal-m${i + 1}`,
      folio: `SAL-${100 + i}`,
      nombreJornada: `Grabación ${lugar.planta}`,
      proyectosRelacionados: [],
      tipoActividad: azar.uno(["grabacion_proceso_industrial", "cobertura_evento", "fotografia_producto", "entrevista"] as const),
      planta: lugar.planta,
      direccion: lugar.direccion,
      fecha: iso(fecha),
      horaSalida: "07:00",
      horaEstimadaLlegada: "09:00",
      personalAsignado: [azar.uno(["u-luis", "u-mariana", "u-valeria"])],
      responsableProduccionId: "u-ana",
      equipoRequerido: [],
      estadoAutorizacion: fecha < hoy ? "autorizada" : "pendiente",
      creadoEn: iso(masDias(fecha, -7)),
    });
  }

  return { proyectos, entregables, requisiciones, salidas };
}
