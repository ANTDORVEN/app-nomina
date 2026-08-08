/**
 * defaultData.js - Valores por defecto ajustados al Convenio de Sevilla 2025 (Categoría TES, 5 años antigüedad).
 */

export const DEFAULT_CONFIG = {
  // Conceptos calculados por día trabajado/liquidable
  precioSalarioBaseDia: 41.78,       // Salario Base (€/día)
  precioPlusConvenioDia: 5.58,       // Plus Convenio (€/día)
  precioProrrataPagaExtraDia: 8.24,  // Prorrata Paga Extra (€/día)

  // Concepto fijo mensual
  antiguedadMensual: 37.60,          // Antigüedad (37,60 €/mes para 5 años)

  // Conceptos por hora excluyentes
  precioHoraOrdinaria: 12.47,        // J.Complement (€/h exceso en día normal)
  precioHoraExtra: 21.82,            // Horas Extraordinarias (€/h trabajadas en festivo)
  precioHoraFestiva: 21.82,          // Horas Festivas (€/h)
  plusNocturnidadHora: 1.85,         // Plus Nocturnidad (€/h noche)
  
  fechaIngresoEmpresa: '2021-11-01', // Fecha de ingreso para recálculo de antigüedad
  mesesPagasExtra: [6, 12]
};

export const DEFAULT_SHIFT_TYPES = [
  {
    id: 'manana',
    nombre: 'Mañana (M)',
    nombreCorto: 'M',
    horaInicio: '07:00',
    horaFin: '15:00',
    horasTeoricas: 8,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: false,
    color: '#3b82f6'
  },
  {
    id: 'tarde',
    nombre: 'Tarde (T)',
    nombreCorto: 'T',
    horaInicio: '15:00',
    horaFin: '23:00',
    horasTeoricas: 8,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: false,
    color: '#f59e0b'
  },
  {
    id: 'noche',
    nombre: 'Noche (N)',
    nombreCorto: 'N',
    horaInicio: '23:00',
    horaFin: '07:00',
    horasTeoricas: 8,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: true,
    color: '#8b5cf6'
  },
  {
    id: 'turno12',
    nombre: 'Turno 12h (11h Pagadas)',
    nombreCorto: '12h',
    horaInicio: '08:00',
    horaFin: '20:00',
    horasTeoricas: 12,
    horasDescansoNoPagadas: 1,
    generaNocturnidad: false,
    color: '#0284c7'
  },
  {
    id: 'guardia24',
    nombre: 'Guardia 24h (G24)',
    nombreCorto: 'G24',
    horaInicio: '08:00',
    horaFin: '08:00',
    horasTeoricas: 24,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: true,
    color: '#10b981'
  },
  {
    id: 'patron_5x2',
    nombre: 'Patrón 5x2 / 2x5',
    nombreCorto: '5x2',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: false,
    color: '#06b6d4'
  },
  {
    id: 'sabado_alterno',
    nombre: 'Sábado Alterno',
    nombreCorto: 'S. Alt',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: false,
    color: '#eab308'
  },
  {
    id: 'festivo',
    nombre: 'Festivo Trabajado',
    nombreCorto: 'Fest.',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    horasDescansoNoPagadas: 0,
    esFestivo: true,
    generaNocturnidad: false,
    color: '#ec4899'
  },
  {
    id: 'vacaciones',
    nombre: 'Vacaciones',
    nombreCorto: 'Vac.',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    horasDescansoNoPagadas: 0,
    esAusencia: true,
    generaNocturnidad: false,
    color: '#14b8a6'
  },
  {
    id: 'baja_laboral',
    nombre: 'Baja Laboral / Médica',
    nombreCorto: 'B. Méd',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    horasDescansoNoPagadas: 0,
    esAusencia: true,
    generaNocturnidad: false,
    color: '#ef4444'
  },
  {
    id: 'paternidad_maternidad',
    nombre: 'Baja Paternidad / Maternidad',
    nombreCorto: 'B. Pat',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    horasDescansoNoPagadas: 0,
    esAusencia: true,
    generaNocturnidad: false,
    color: '#805ad5'
  },
  {
    id: 'asuntos_propios',
    nombre: 'Asuntos Propios / Moscoso',
    nombreCorto: 'A.P.',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    horasDescansoNoPagadas: 0,
    esAusencia: true,
    generaNocturnidad: false,
    color: '#d97706'
  },
  {
    id: 'libre',
    nombre: 'Descanso / Libre',
    nombreCorto: 'Libre',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    horasDescansoNoPagadas: 0,
    generaNocturnidad: false,
    color: '#64748b'
  }
];

export const DEFAULT_PAYROLL_PERIODS = [
  {
    id: 'ath_2026_01',
    nombreNomina: 'Nómina Enero 2026',
    fechaInicio: '2025-12-15',
    fechaFin: '2026-01-18',
    estaCerrado: false
  },
  {
    id: 'ath_2026_02',
    nombreNomina: 'Nómina Febrero 2026',
    fechaInicio: '2026-01-19',
    fechaFin: '2026-02-19',
    estaCerrado: false
  },
  {
    id: 'ath_2026_03',
    nombreNomina: 'Nómina Marzo 2026',
    fechaInicio: '2026-02-20',
    fechaFin: '2026-03-22',
    estaCerrado: false
  },
  {
    id: 'ath_2026_04',
    nombreNomina: 'Nómina Abril 2026',
    fechaInicio: '2026-03-23',
    fechaFin: '2026-04-19',
    estaCerrado: false
  },
  {
    id: 'ath_2026_05',
    nombreNomina: 'Nómina Mayo 2026',
    fechaInicio: '2026-04-20',
    fechaFin: '2026-05-17',
    estaCerrado: false
  },
  {
    id: 'ath_2026_06',
    nombreNomina: 'Nómina Junio 2026',
    fechaInicio: '2026-05-18',
    fechaFin: '2026-06-21',
    estaCerrado: false
  },
  {
    id: 'ath_2026_07',
    nombreNomina: 'Nómina Julio 2026',
    fechaInicio: '2026-06-22',
    fechaFin: '2026-07-19',
    estaCerrado: false
  },
  {
    id: 'ath_2026_08',
    nombreNomina: 'Nómina Agosto 2026',
    fechaInicio: '2026-07-20',
    fechaFin: '2026-08-23',
    estaCerrado: false
  }
];
