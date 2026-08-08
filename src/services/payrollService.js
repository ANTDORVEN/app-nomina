/**
 * payrollService.js - Servicio de cálculo de nómina adaptado al desglose oficial de Ambulancias Tenorio (ATH).
 * 
 * Reglas de Exclusividad Estricta:
 * 1. Días NORMALES (no festivos): Las horas de más que excedan la jornada estándar de 8h (o turnos de 12h/sábados)
 *    van EXCLUSIVAMENTE a 'J.Complement / Excesos Presenciales' a 12,47 €/hora. NUNCA a Horas Extraordinarias.
 * 2. Días FESTIVOS: TODAS las horas trabajadas en festivo van EXCLUSIVAMENTE a 'Horas Extraordinarias' a 21,82 €/hora.
 *    NUNCA se cuentan también en J.Complement.
 * 3. Ambas categorías son estrictamente mutuamente excluyentes (jamás se duplican ni solapan).
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
  let totalHorasJComplement = 0; // Excesos en días normales no festivos (12,47 €/h)
  let totalHorasFestivasExtra = 0; // Horas trabajadas en festivos (21,82 €/h)
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

    // Comprobar si el día es FESTIVO
    const isFestivoDay = log.esFestivo === true || (shiftType && (shiftType.id === 'festivo' || shiftType.id === 'domingo_alterno' || shiftType.esFestivo === true));

    if (isFestivoDay) {
      // 🟢 CASO FESTIVO: TODAS las horas del festivo se pagan a Horas Extraordinarias (21,82 €/h)
      // NUNCA se suman a J.Complement
      totalHorasFestivasExtra += horasLiquidadasDia;
      totalDiasFestivos += 1;
    } else {
      // 🔵 CASO DÍA NORMAL (No Festivo): Las horas que exceden la jornada van SOLO a J.Complement (12,47 €/h)
      // NUNCA se suman a Horas Extraordinarias
      const isSaturdayDay = shiftType && shiftType.id === 'sabado_alterno';
      const isTurno12 = log.tipoTurnoId === 'turno12';

      if (isSaturdayDay || isTurno12) {
        totalHorasJComplement += horasLiquidadasDia;
      } else {
        const excesoDia = Math.max(0, horasLiquidadasDia - 8);
        totalHorasJComplement += excesoDia;
      }
    }

    // Horas de nocturnidad (acumulación de noche)
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

  // Tarifas por hora corregidas
  const precioJComplement = Number(config.precioHoraOrdinaria) || 12.47;
  const precioHorasExtra = Number(config.precioHoraExtra) || 21.82;
  const plusNocturnidad = Number(config.plusNocturnidadHora) || 1.85;

  // Cálculo proporcional por días trabajados en el periodo
  const importeSalarioBase = diasLiquidables * precioSalarioBaseDia;
  const importePlusConvenio = diasLiquidables * precioPlusConvenioDia;
  const importeProrrataPagas = diasLiquidables * precioProrrataPagaExtraDia;
  const importeAntiguedad = antiguedadMensual;

  const totalBaseDias = importeSalarioBase + importePlusConvenio + importeProrrataPagas + importeAntiguedad;

  // Importes variables por horas excluyentes
  const importeJComplement = totalHorasJComplement * precioJComplement;
  const importeHorasExtra = totalHorasFestivasExtra * precioHorasExtra;
  const importeNocturnidad = totalHorasNocturnas * plusNocturnidad;

  const estimacionBrutoTotal = totalBaseDias + importeJComplement + importeHorasExtra + importeNocturnidad;

  return {
    periodo: period,
    fichajesContabilizados: periodLogs.length,
    diasLiquidables,
    totalHorasTrabajadas: totalHorasPresenciales - totalHorasDescansoDescontadas,
    totalHorasPresenciales,
    totalHorasDescansoDescontadas,
    totalHorasJComplement,
    totalHorasFestivasExtra,
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
      precioJComplement,
      precioHorasExtra,
      plusNocturnidad
    },
    desgloseImportes: {
      jornadaComplementaria: Math.round(importeJComplement * 100) / 100,
      horasExtraordinarias: Math.round(importeHorasExtra * 100) / 100,
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
    totalHorasJComplement: 0,
    totalHorasFestivasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    conceptosDiarios: { salarioBase: 0, plusConvenio: 0, prorrataPagas: 0, antiguedad: 0, totalBaseDias: 0, precioSalarioBaseDia: 41.78, precioPlusConvenioDia: 5.58, precioProrrataPagaExtraDia: 8.24 },
    tarifasAplicadas: { precioJComplement: 12.47, precioHorasExtra: 21.82, plusNocturnidad: 1.85 },
    desgloseImportes: { jornadaComplementaria: 0, horasExtraordinarias: 0, nocturnidad: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
