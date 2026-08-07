/**
 * payrollService.js - Servicio de cálculo de nómina y acumulación por período de cobro.
 * 
 * Contiene el algoritmo de cálculo de horas ordinarias, horas extra, pluses
 * y la estimación del importe bruto para la nómina del periodo seleccionado.
 */

import { getConfig, getAllTimeLogs, getShiftTypes } from './shiftService.js';
import { isDateInPeriod } from '../utils/dateUtils.js';

/**
 * Calcula el resumen económico y de horas para un período de cobro ATH específico.
 * 
 * @param {object} period - Objeto con { fechaInicio, fechaFin, nombreNomina }
 * @returns {object} Resumen detallado de horas e importes
 */
export function calculatePayrollForPeriod(period) {
  if (!period) return getEmptyPayrollSummary();

  const config = getConfig();
  const allLogs = getAllTimeLogs();
  const shiftTypes = getShiftTypes();

  // Filtrar solo los fichajes que caen en las fechas del periodo ATH
  const periodLogs = allLogs.filter(log => 
    isDateInPeriod(log.fecha, period.fechaInicio, period.fechaFin)
  );

  let totalHorasOrdinarias = 0;
  let totalHorasExtra = 0;
  let totalHorasNocturnas = 0;
  let totalDiasFestivos = 0;

  periodLogs.forEach(log => {
    const shiftType = shiftTypes.find(t => t.id === log.tipoTurnoId);
    const horasTeoricas = shiftType ? shiftType.horasTeoricas : 8;

    const horasReales = Number(log.horasTrabajadas) || 0;

    // Horas extra: Lo que exceda de las horas teóricas del turno (o si se marca explícitamente en el log)
    let extraLog = Number(log.horasExtra) || 0;
    if (horasReales > horasTeoricas && extraLog === 0) {
      extraLog = horasReales - horasTeoricas;
    }

    const ordinariasLog = Math.max(0, horasReales - extraLog);

    totalHorasOrdinarias += ordinariasLog;
    totalHorasExtra += extraLog;

    if (log.horasNocturnas) {
      totalHorasNocturnas += Number(log.horasNocturnas);
    } else if (shiftType && shiftType.generaNocturnidad) {
      // Por defecto en turnos de noche o guardias se estiman horas nocturnas si no se especifica
      totalHorasNocturnas += (shiftType.id === 'noche' ? 8 : (shiftType.id === 'guardia24' ? 8 : 0));
    }

    if (log.esFestivo || (shiftType && shiftType.id === 'festivo')) {
      totalDiasFestivos += 1;
    }
  });

  // Cálculo de importes monetarios
  const importeOrdinario = totalHorasOrdinarias * config.precioHoraOrdinaria;
  const importeExtra = totalHorasExtra * config.precioHoraExtra;
  const importeNocturnidad = totalHorasNocturnas * config.plusNocturnidadHora;
  const importeFestivos = totalDiasFestivos * config.plusFestivoDia;

  const estimacionBrutoTotal = importeOrdinario + importeExtra + importeNocturnidad + importeFestivos;

  return {
    periodo: period,
    fichajesContabilizados: periodLogs.length,
    totalHorasTrabajadas: totalHorasOrdinarias + totalHorasExtra,
    totalHorasOrdinarias,
    totalHorasExtra,
    totalHorasNocturnas,
    totalDiasFestivos,
    desgloseImportes: {
      ordinario: Math.round(importeOrdinario * 100) / 100,
      extra: Math.round(importeExtra * 100) / 100,
      nocturnidad: Math.round(importeNocturnidad * 100) / 100,
      festivos: Math.round(importeFestivos * 100) / 100
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
    totalHorasOrdinarias: 0,
    totalHorasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    desgloseImportes: { ordinario: 0, extra: 0, nocturnidad: 0, festivos: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
