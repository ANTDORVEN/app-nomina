/**
 * defaultData.js - Valores por defecto y datos semilla para la aplicación de Nómina TES.
 * 
 * Todo en la app es editable desde la sección de Configuración, pero estos datos
 * sirven como plantilla inicial al arrancar la app por primera vez.
 */

export const DEFAULT_CONFIG = {
  precioHoraOrdinaria: 10.50,  // Euros/hora presencial
  precioHoraExtra: 14.00,      // Euros/hora extra
  plusNocturnidadHora: 1.85,   // Euros/hora de noche (entre 22:00 y 06:00)
  plusFestivoDia: 35.00,       // Importe adicional por jornada festiva
  mesesPagasExtra: [6, 12]     // Junio (Verano) y Diciembre (Navidad)
};

export const DEFAULT_SHIFT_TYPES = [
  {
    id: 'manana',
    nombre: 'Mañana (M)',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    generaNocturnidad: false,
    color: '#3b82f6'
  },
  {
    id: 'tarde',
    nombre: 'Tarde (T)',
    horaInicio: '16:00',
    horaFin: '00:00',
    horasTeoricas: 8,
    generaNocturnidad: false,
    color: '#f59e0b'
  },
  {
    id: 'noche',
    nombre: 'Noche (N)',
    horaInicio: '00:00',
    horaFin: '08:00',
    horasTeoricas: 8,
    generaNocturnidad: true,
    color: '#8b5cf6'
  },
  {
    id: 'guardia24',
    nombre: 'Guardia 24h (G24)',
    horaInicio: '08:00',
    horaFin: '08:00',
    horasTeoricas: 24,
    generaNocturnidad: true,
    color: '#10b981'
  },
  {
    id: 'patron_5x2',
    nombre: 'Patrón 5x2 / 2x5',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    generaNocturnidad: false,
    color: '#06b6d4'
  },
  {
    id: 'sabado_alterno',
    nombre: 'Sábado Alterno',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    generaNocturnidad: false,
    color: '#eab308'
  },
  {
    id: 'festivo',
    nombre: 'Festivo Trabalhado',
    horaInicio: '08:00',
    horaFin: '16:00',
    horasTeoricas: 8,
    generaNocturnidad: false,
    color: '#ec4899'
  },
  {
    id: 'vacaciones',
    nombre: 'Vacaciones',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    generaNocturnidad: false,
    color: '#14b8a6'
  },
  {
    id: 'libre',
    nombre: 'Descanso / Libre',
    horaInicio: '00:00',
    horaFin: '00:00',
    horasTeoricas: 0,
    generaNocturnidad: false,
    color: '#64748b'
  }
];

/**
 * Tabla de periodos de cobro de ATH (Ambulancias Tenorio) de ejemplo para 2026.
 * El usuario puede añadir, modificar o borrar periodos desde la app.
 */
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
