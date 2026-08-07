/**
 * payrollService.js - Servicio de cálculo de nómina adaptado al desglose real de Ambulancias Tenorio (ATH).
 * 
 * Conceptos del Desglose ATH:
 * - Salario Base: días liquidados del periodo × precio/día (ej: 18 días × 41,78€/día)
 * - Plus Convenio: días liquidados del periodo × precio/día (ej: 18 días × 5,58€/día)
 * - Prorrata Paga Extra: días liquidados del periodo × precio/día (ej: 18 días × 8,24€/día)
 * - Antigüedad: importe fijo del tramo actual (37,60€ para 5 años)
 * - J.Complement (Jornada Complementaria): horas presenciales de exceso × 12,36€/hora
 * - Plus Festivo: horas en días festivos × 21,00€/hora
 * - Plus Nocturnidad: horas nocturnas × 1,85€/hora
 * - Horas Extraordinarias: horas extra puras × 21,63€/hora
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

  // Días únicos contabilizados en el periodo
  const diasLiquidables = new Set(periodLogs.map(l => l.fecha)).size;

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
      // Sábados / Turnos 12h: horas presenciales adicionales a tarifa J.Complement (12,36 €/h)
      totalHorasPresencialesExceso += horasLiquidadasDia;
    } else {
      // Turno regular (L-V): las primeras 8h están cubiertas por los conceptos por día.
      // Si trabaja 9h en vez de 8h, esa 1h de exceso es J.Complement (12,36 €/h).
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

  // Precios por día
  const precioSalarioBaseDia = Number(config.precioSalarioBaseDia) || 41.78;
  const precioPlusConvenioDia = Number(config.precioPlusConvenioDia) || 5.58;
  const precioProrrataPagaExtraDia = Number(config.precioProrrataPagaExtraDia) || 8.24;

  // Antigüedad fija por tramo
  const antiguedadMensual = Number(config.antiguedadMensual) || 37.60;

  // Tarifas por hora
  const precioHoraOrdinaria = Number(config.precioHoraOrdinaria) || 12.36; // J.Complement
  const precioHoraFestiva = Number(config.precioHoraFestiva) || 21.00;
  const precioHoraExtra = Number(config.precioHoraExtra) || 21.63;
  const plusNocturnidad = Number(config.plusNocturnidadHora) || 1.85;

  // Cálculo proporcional por días trabajados en el periodo
  const importeSalarioBase = diasLiquidables * precioSalarioBaseDia;
  const importePlusConvenio = diasLiquidables * precioPlusConvenioDia;
  const importeProrrataPagas = diasLiquidables * precioProrrataPagaExtraDia;
  const importeAntiguedad = antiguedadMensual;

  const totalBaseDias = importeSalarioBase + importePlusConvenio + importeProrrataPagas + importeAntiguedad;

  // Importes variables por horas
  const importeJornadaComplementaria = totalHorasPresencialesExceso * precioHoraOrdinaria;
  const importeFestivos = totalHorasFestivas * precioHoraFestiva;
  const importeExtra = totalHorasExtra * precioHoraExtra;
  const importeNocturnidad = totalHorasNocturnas * plusNocturnidad;

  const estimacionBrutoTotal = totalBaseDias + importeJornadaComplementaria + importeFestivos + importeExtra + importeNocturnidad;

  return {
    periodo: period,
    fichajesContabilizados: periodLogs.length,
    diasLiquidables,
    totalHorasTrabajadas: totalHorasPresenciales - totalHorasDescansoDescontadas,
    totalHorasPresenciales,
    totalHorasDescansoDescontadas,
    totalHorasPresencialesExceso,
    totalHorasFestivas,
    totalHorasExtra,
    totalHorasNocturnas,
    totalDiasFestivos,
    conceptosDiarios: {
      salarioBase: Math.round(importeSalarioBase * 100) / 100,
      plusConvenio: Math.round(importePlusConvenio * 100) / 100,
      prorrataPagas: Math.round(importeProrrataPagas * 100) / 100,
      antiguedad: Math.round(importeAntiguedad * 100) / 100,
      totalBaseDias: Math.round(totalBaseDias * 100) / 100,
      precioSalarioBaseDia,
      precioPlusConvenioDia,
      precioProrrataPagaExtraDia
    },
    tarifasAplicadas: {
      precioHoraOrdinaria,
      precioHoraFestiva,
      precioHoraExtra,
      plusNocturnidad
    },
    desgloseImportes: {
      jornadaComplementaria: Math.round(importeJornadaComplementaria * 100) / 100,
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
    diasLiquidables: 0,
    totalHorasTrabajadas: 0,
    totalHorasPresenciales: 0,
    totalHorasDescansoDescontadas: 0,
    totalHorasPresencialesExceso: 0,
    totalHorasFestivas: 0,
    totalHorasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    conceptosDiarios: { salarioBase: 0, plusConvenio: 0, prorrataPagas: 0, antiguedad: 0, totalBaseDias: 0, precioSalarioBaseDia: 41.78, precioPlusConvenioDia: 5.58, precioProrrataPagaExtraDia: 8.24 },
    tarifasAplicadas: { precioHoraOrdinaria: 12.36, precioHoraFestiva: 21.00, precioHoraExtra: 21.63, plusNocturnidad: 1.85 },
    desgloseImportes: { jornadaComplementaria: 0, festivos: 0, extra: 0, nocturnidad: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
