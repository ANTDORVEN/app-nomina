/**
 * payrollService.js - Servicio de cálculo de nómina ajustado al modelo real del Convenio de Sevilla 2025.
 * 
 * Modelo Económico:
 * 1. Salario Base Fijo Mensual (1.730,68 € / mes) cubre la jornada estándar contratada.
 * 2. Excesos sobre la jornada diaria (ej. 9h en vez de 8h) o sábados presenciales se pagan a precio de HORA PRESENCIAL (~12,36 €/h).
 * 3. Horas trabajadas en Días Festivos se pagan a precio de HORA FESTIVA (~21,00 €/h).
 * 4. Horas Extra puras marcadas explícitamente se pagan a PRECIO HORA EXTRA (~21,63 €/h).
 * 5. Plus Nocturnidad por horas de noche (~1,85 €/h).
 */

import { getConfig, getAllTimeLogs, getShiftTypes } from './shiftService.js';
import { isDateInPeriod } from '../utils/dateUtils.js';

export function calculatePayrollForPeriod(period) {
  if (!period) return getEmptyPayrollSummary();

  const config = getConfig();
  const allLogs = getAllTimeLogs();
  const shiftTypes = getShiftTypes();

  const periodLogs = allLogs.filter(log => 
    isDateInPeriod(log.fecha, period.fechaInicio, period.fechaFin)
  );

  let totalHorasPresenciales = 0;
  let totalHorasDescansoDescontadas = 0;
  let totalHorasPresencialesExceso = 0;
  let totalHorasFestivas = 0;
  let totalHorasExtra = 0;
  let totalHorasNocturnas = 0;
  let totalDiasFestivos = 0;

  periodLogs.forEach(log => {
    const shiftType = shiftTypes.find(t => t.id === log.tipoTurnoId);
    const descansoNoPagado = log.horasDescansoNoPagadas ?? (shiftType ? (shiftType.horasDescansoNoPagadas || 0) : 0);

    const horasPresencialesReales = Number(log.horasTrabajadas) || 0;
    totalHorasPresenciales += horasPresencialesReales;
    totalHorasDescansoDescontadas += descansoNoPagado;

    // Horas liquidadas reales descontando el descanso no retribuido
    const horasLiquidadasDia = Math.max(0, horasPresencialesReales - descansoNoPagado);

    const isFestivoDay = log.esFestivo || (shiftType && (shiftType.id === 'festivo' || shiftType.id === 'domingo_alterno'));
    const isSaturdayDay = shiftType && shiftType.id === 'sabado_alterno';

    if (isFestivoDay) {
      // Festivos trabajados: se pagan a tarifa festiva (21,00 €/h)
      totalHorasFestivas += horasLiquidadasDia;
      totalDiasFestivos += 1;
    } else if (isSaturdayDay || log.tipoTurnoId === 'turno12') {
      // Sábados / Turnos 12h: horas presenciales adicionales a tarifa presencial (12,36 €/h)
      totalHorasPresencialesExceso += horasLiquidadasDia;
    } else {
      // Turno regular (L-V): las primeras 8h están cubiertas por los 1.730,68€ fijos.
      // Si trabaja 9h en vez de 8h, esa 1h de exceso se paga a tarifa presencial (12,36 €/h).
      const excesoDia = Math.max(0, horasLiquidadasDia - 8);
      totalHorasPresencialesExceso += excesoDia;
    }

    // Horas extra puras registradas explícitamente
    if (log.horasExtra && Number(log.horasExtra) > 0) {
      totalHorasExtra += Number(log.horasExtra);
    }

    // Horas de nocturnidad
    if (log.horasNocturnas) {
      totalHorasNocturnas += Number(log.horasNocturnas);
    } else if (shiftType && shiftType.generaNocturnidad) {
      totalHorasNocturnas += (shiftType.id === 'noche' ? 8 : (shiftType.id === 'guardia24' ? 8 : 0));
    }
  });

  // Conceptos fijos mensuales del convenio
  const salarioBase = Number(config.salarioBaseMensual) || 1253.26;
  const plusConvenio = Number(config.plusConvenio) || 167.52;
  const antiguedad = Number(config.antiguedadMensual) || 62.66;
  const prorrateoPagas = Number(config.prorrateoPagasExtra) || 247.24;
  const totalFijoMensual = salarioBase + plusConvenio + antiguedad + prorrateoPagas;

  // Tarifas por hora configurables
  const precioHoraPresencial = Number(config.precioHoraOrdinaria) || 12.36;
  const precioHoraFestiva = Number(config.precioHoraFestiva) || 21.00;
  const precioHoraExtra = Number(config.precioHoraExtra) || 21.63;
  const plusNocturnidad = Number(config.plusNocturnidadHora) || 1.85;

  // Cálculo de importes variables
  const importePresencialExceso = totalHorasPresencialesExceso * precioHoraPresencial;
  const importeFestivos = totalHorasFestivas * precioHoraFestiva;
  const importeExtra = totalHorasExtra * precioHoraExtra;
  const importeNocturnidad = totalHorasNocturnas * plusNocturnidad;

  const estimacionBrutoTotal = totalFijoMensual + importePresencialExceso + importeFestivos + importeExtra + importeNocturnidad;

  return {
    periodo: period,
    fichajesContabilizados: periodLogs.length,
    totalHorasTrabajadas: totalHorasPresenciales - totalHorasDescansoDescontadas,
    totalHorasPresenciales,
    totalHorasDescansoDescontadas,
    totalHorasPresencialesExceso,
    totalHorasFestivas,
    totalHorasExtra,
    totalHorasNocturnas,
    totalDiasFestivos,
    conceptosFijos: {
      salarioBase: Math.round(salarioBase * 100) / 100,
      plusConvenio: Math.round(plusConvenio * 100) / 100,
      antiguedad: Math.round(antiguedad * 100) / 100,
      prorrateoPagas: Math.round(prorrateoPagas * 100) / 100,
      totalFijoMensual: Math.round(totalFijoMensual * 100) / 100
    },
    tarifasAplicadas: {
      precioHoraPresencial,
      precioHoraFestiva,
      precioHoraExtra,
      plusNocturnidad
    },
    desgloseImportes: {
      presencialExceso: Math.round(importePresencialExceso * 100) / 100,
      festivos: Math.round(importeFestivos * 100) / 100,
      extra: Math.round(importeExtra * 100) / 100,
      nocturnidad: Math.round(importeNocturnidad * 100) / 100
    },
    estimacionBrutoTotal: Math.round(estimacionBrutoTotal * 100) / 100,
    logs: periodLogs
  };
}

function getEmptyPayrollSummary() {
  return {
    periodo: null,
    fichajesContabilizados: 0,
    totalHorasTrabajadas: 0,
    totalHorasPresenciales: 0,
    totalHorasDescansoDescontadas: 0,
    totalHorasPresencialesExceso: 0,
    totalHorasFestivas: 0,
    totalHorasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    conceptosFijos: { salarioBase: 0, plusConvenio: 0, antiguedad: 0, prorrateoPagas: 0, totalFijoMensual: 0 },
    tarifasAplicadas: { precioHoraPresencial: 12.36, precioHoraFestiva: 21.00, precioHoraExtra: 21.63, plusNocturnidad: 1.85 },
    desgloseImportes: { presencialExceso: 0, festivos: 0, extra: 0, nocturnidad: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
