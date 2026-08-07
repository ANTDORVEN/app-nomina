/**
 * payrollService.js - Servicio de cálculo de nómina y acumulación por período de cobro.
 * 
 * Integra conceptos fijos mensuales del Convenio de Sevilla (Salario Base, Plus Convenio,
 * Antigüedad, Prorrateo Pagas Extra) más la parte variable (horas presencia, extras, nocturnidad, festivos).
 */

import { getConfig, getAllTimeLogs, getShiftTypes } from './shiftService.js';
import { isDateInPeriod } from '../utils/dateUtils.js';

/**
 * Calcula el resumen económico y de horas para un período de cobro ATH específico.
 * 
 * @param {object} period 
 * @returns {object}
 */
export function calculatePayrollForPeriod(period) {
  if (!period) return getEmptyPayrollSummary();

  const config = getConfig();
  const allLogs = getAllTimeLogs();
  const shiftTypes = getShiftTypes();

  const periodLogs = allLogs.filter(log => 
    isDateInPeriod(log.fecha, period.fechaInicio, period.fechaFin)
  );

  let totalHorasOrdinarias = 0;
  let totalHorasExtra = 0;
  let totalHorasNocturnas = 0;
  let totalDiasFestivos = 0;
  let totalHorasPresenciales = 0;
  let totalHorasDescansoDescontadas = 0;

  periodLogs.forEach(log => {
    const shiftType = shiftTypes.find(t => t.id === log.tipoTurnoId);
    const horasTeoricas = shiftType ? shiftType.horasTeoricas : 8;
    const descansoNoPagado = log.horasDescansoNoPagadas ?? (shiftType ? (shiftType.horasDescansoNoPagadas || 0) : 0);

    const horasReales = Number(log.horasTrabajadas) || 0;
    totalHorasPresenciales += horasReales;
    totalHorasDescansoDescontadas += descansoNoPagado;

    // Horas extra
    let extraLog = Number(log.horasExtra) || 0;
    if (horasReales > horasTeoricas && extraLog === 0) {
      extraLog = horasReales - horasTeoricas;
    }

    // Horas remunerables tras restar descanso no pagado
    const horasPagablesBrutas = Math.max(0, horasReales - descansoNoPagado);
    const ordinariasLog = Math.max(0, horasPagablesBrutas - extraLog);

    totalHorasOrdinarias += ordinariasLog;
    totalHorasExtra += extraLog;

    if (log.horasNocturnas) {
      totalHorasNocturnas += Number(log.horasNocturnas);
    } else if (shiftType && shiftType.generaNocturnidad) {
      totalHorasNocturnas += (shiftType.id === 'noche' ? 8 : (shiftType.id === 'guardia24' ? 8 : 0));
    }

    if (log.esFestivo || (shiftType && shiftType.id === 'festivo')) {
      totalDiasFestivos += 1;
    }
  });

  // Conceptos fijos mensuales del convenio
  const salarioBase = Number(config.salarioBaseMensual) || 0;
  const plusConvenio = Number(config.plusConvenio) || 0;
  const antiguedad = Number(config.antiguedadMensual) || 0;
  const prorrateoPagas = Number(config.prorrateoPagasExtra) || 0;
  const totalFijoMensual = salarioBase + plusConvenio + antiguedad + prorrateoPagas;

  // Variables horarias
  const importeOrdinario = totalHorasOrdinarias * config.precioHoraOrdinaria;
  const importeExtra = totalHorasExtra * config.precioHoraExtra;
  const importeNocturnidad = totalHorasNocturnas * config.plusNocturnidadHora;
  const importeFestivos = totalDiasFestivos * config.plusFestivoDia;

  const estimacionBrutoTotal = totalFijoMensual + importeOrdinario + importeExtra + importeNocturnidad + importeFestivos;

  return {
    periodo: period,
    fichajesContabilizados: periodLogs.length,
    totalHorasTrabajadas: totalHorasOrdinarias + totalHorasExtra,
    totalHorasPresenciales,
    totalHorasDescansoDescontadas,
    totalHorasOrdinarias,
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
    totalHorasPresenciales: 0,
    totalHorasDescansoDescontadas: 0,
    totalHorasOrdinarias: 0,
    totalHorasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    conceptosFijos: { salarioBase: 0, plusConvenio: 0, antiguedad: 0, prorrateoPagas: 0, totalFijoMensual: 0 },
    desgloseImportes: { ordinario: 0, extra: 0, nocturnidad: 0, festivos: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
