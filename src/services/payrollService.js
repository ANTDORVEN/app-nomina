/**
 * payrollService.js - Servicio de cálculo de nómina y acumulación por período de cobro.
 * 
 * Descuenta automáticamente la hora de descanso no pagada (ej. Turno 12h con 11h pagadas)
 * sin alterar la presencia real en el calendario.
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

  const importeOrdinario = totalHorasOrdinarias * config.precioHoraOrdinaria;
  const importeExtra = totalHorasExtra * config.precioHoraExtra;
  const importeNocturnidad = totalHorasNocturnas * config.plusNocturnidadHora;
  const importeFestivos = totalDiasFestivos * config.plusFestivoDia;

  const estimacionBrutoTotal = importeOrdinario + importeExtra + importeNocturnidad + importeFestivos;

  return {
    periodo: period,
    fichajesContabilizados: periodLogs.length,
    totalHorasTrabajadas: totalHorasOrdinarias + totalHorasExtra, // Horas abonadas
    totalHorasPresenciales, // Horas en reloj / presencia real
    totalHorasDescansoDescontadas,
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
    totalHorasPresenciales: 0,
    totalHorasDescansoDescontadas: 0,
    totalHorasOrdinarias: 0,
    totalHorasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    desgloseImportes: { ordinario: 0, extra: 0, nocturnidad: 0, festivos: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
