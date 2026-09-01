/**
 * payrollService.js - Servicio de cálculo de nómina adaptado al modelo de Doble Bloque ATH (Mes Natural + Rango Tabla ATH).
 * 
 * Estructura de Cálculo de Cada Nómina:
 * 1. BLOQUE DE CONCEPTOS FIJOS (Mes Natural: 01/MM a 31/MM):
 *    - Días Liquidables Mes Natural = Días totales del mes (28/29/30/31) - Días de Ausencia (Vacaciones, Baja, Paternidad, Moscosos).
 *    - Salario Base (Días liquidados mes natural × 41,78 €/día)
 *    - Plus Convenio (Días liquidados mes natural × 5,58 €/día)
 *    - Prorrata Paga Extra (Días liquidados mes natural × 8,24 €/día)
 *    - Antigüedad (62,66 € base mensual 5 años × [Días liquidados mes natural / 30])
 * 
 * 2. BLOQUE DE CONCEPTOS VARIABLES (Rango Tabla ATH: ej. 15/07 a 13/08):
 *    - J.Complement (excesos presenciales en días laborables/sábados × 12,36 €/hora)
 *    - Horas Extraordinarias / Festivas (horas trabajadas en festivo × 21,63 €/hora)
 *    - Plus Nocturnidad (horas nocturnas × 1,85 €/hora)
 * 
 * 3. SUMA TOTAL NÓMINA = Bloque Fijo (Mes Natural) + Bloque Variable (Tabla ATH)
 */

import { getConfig, getAllTimeLogs, getShiftTypes } from './shiftService.js';
import { isDateInPeriod, getNaturalMonthRangeForPeriod } from '../utils/dateUtils.js';

export function calculatePayrollForPeriod(period) {
  if (!period) return getEmptyPayrollSummary();

  const config = getConfig();
  const allLogs = getAllTimeLogs();
  const shiftTypes = getShiftTypes();

  // Deducción del rango del Mes Natural (ej: 2026-08-01 a 2026-08-31 para Nómina de Agosto)
  const naturalMonthInfo = getNaturalMonthRangeForPeriod(period);
  const { fechaInicioMesNatural, fechaFinMesNatural, nombreMesNatural, totalDiasMes } = naturalMonthInfo;

  // -------------------------------------------------------------
  // PASO 1: BLOQUE FIJO - Filtrado por Mes Natural (01/MM al 31/MM)
  // -------------------------------------------------------------
  const naturalMonthLogs = allLogs.filter(log => 
    isDateInPeriod(log.fecha, fechaInicioMesNatural, fechaFinMesNatural)
  );

  // Identificar días con tipo de AUSENCIA (esAusencia: true, Vacaciones, Bajas, Moscosos)
  const ausenciasMonthLogs = naturalMonthLogs.filter(log => {
    const shiftType = shiftTypes.find(t => t.id === log.tipoTurnoId);
    return log.esAusencia === true || 
           (shiftType && (shiftType.esAusencia === true || 
                          shiftType.id === 'vacaciones' || 
                          shiftType.id === 'baja_laboral' || 
                          shiftType.id === 'paternidad_maternidad' || 
                          shiftType.id === 'asuntos_propios'));
  });

  const diasAusenciaMesNatural = new Set(ausenciasMonthLogs.map(l => l.fecha)).size;

  // Días liquidables del Mes Natural = Días totales del mes (28/29/30/31) - Días de Ausencia
  const diasLiquidablesMesNatural = Math.max(0, totalDiasMes - diasAusenciaMesNatural);

  const precioSalarioBaseDia = Number(config.precioSalarioBaseDia) || 41.78;
  const precioPlusConvenioDia = Number(config.precioPlusConvenioDia) || 5.58;
  const precioProrrataPagaExtraDia = Number(config.precioProrrataPagaExtraDia) || 8.24;
  const antiguedadMensualBase = Number(config.antiguedadMensual) || 62.66; // Base mensual completa 5 años

  const importeSalarioBase = diasLiquidablesMesNatural * precioSalarioBaseDia;
  const importePlusConvenio = diasLiquidablesMesNatural * precioPlusConvenioDia;
  const importeProrrataPagas = diasLiquidablesMesNatural * precioProrrataPagaExtraDia;

  // Antigüedad prorrateada por días liquidables del mes natural (62,66€ × [días liquidables / 30])
  const importeAntiguedad = antiguedadMensualBase * (diasLiquidablesMesNatural / 30);

  const subtotalFijoMesNatural = importeSalarioBase + importePlusConvenio + importeProrrataPagas + importeAntiguedad;

  // -------------------------------------------------------------
  // PASO 2: BLOQUE VARIABLE - Filtrado por Rango Tabla ATH (ej: 15/07 al 13/08)
  // -------------------------------------------------------------
  const periodLogs = allLogs.filter(log => 
    isDateInPeriod(log.fecha, period.fechaInicio, period.fechaFin)
  );

  const diasLiquidablesATH = new Set(periodLogs.map(l => l.fecha)).size;

  let totalHorasPresenciales = 0;
  let totalHorasDescansoDescontadas = 0;
  let totalHorasJComplement = 0; // Excesos en días normales no festivos (12,36 €/h)
  let totalHorasFestivasExtra = 0; // Horas trabajadas en festivos (21,63 €/h)
  let totalHorasNocturnas = 0;
  let totalDiasFestivos = 0;

  periodLogs.forEach(log => {
    const shiftType = shiftTypes.find(t => t.id === log.tipoTurnoId);
    const descansoNoPagado = log.horasDescansoNoPagadas ?? (shiftType ? (shiftType.horasDescansoNoPagadas || 0) : 0);

    const horasPresencialesReales = Number(log.horasTrabajadas) || 0;
    totalHorasPresenciales += horasPresencialesReales;
    totalHorasDescansoDescontadas += descansoNoPagado;

    const horasLiquidadasDia = Math.max(0, horasPresencialesReales - descansoNoPagado);

    // Comprobar si el día es FESTIVO
    const isFestivoDay = log.esFestivo === true || (shiftType && (shiftType.id === 'festivo' || shiftType.id === 'domingo_alterno' || shiftType.esFestivo === true));

    if (isFestivoDay) {
      // 🟢 CASO FESTIVO: Horas Extraordinarias / Festivas (21,63 €/h)
      totalHorasFestivasExtra += horasLiquidadasDia;
      totalDiasFestivos += 1;
    } else {
      // 🔵 CASO DÍA NORMAL (No Festivo): J.Complement (12,36 €/h)
      const isSaturdayDay = shiftType && shiftType.id === 'sabado_alterno';
      const isTurno12 = log.tipoTurnoId === 'turno12';

      if (isSaturdayDay || isTurno12) {
        totalHorasJComplement += horasLiquidadasDia;
      } else {
        const excesoDia = Math.max(0, horasLiquidadasDia - 8);
        totalHorasJComplement += excesoDia;
      }
    }

    // Horas de nocturnidad
    if (log.horasNocturnas) {
      totalHorasNocturnas += Number(log.horasNocturnas);
    } else if (shiftType && shiftType.generaNocturnidad) {
      totalHorasNocturnas += (shiftType.id === 'noche' ? 8 : (shiftType.id === 'guardia24' ? 8 : 0));
    }
  });

  // Tarifas variables por hora
  const precioJComplement = Number(config.precioHoraOrdinaria) || 12.36;
  const precioHorasExtra = Number(config.precioHoraExtra) || 21.63;
  const plusNocturnidad = Number(config.plusNocturnidadHora) || 1.85;

  const importeJComplement = totalHorasJComplement * precioJComplement;
  const importeHorasExtra = totalHorasFestivasExtra * precioHorasExtra;
  const importeNocturnidad = totalHorasNocturnas * plusNocturnidad;

  const subtotalVariablePeriodoATH = importeJComplement + importeHorasExtra + importeNocturnidad;

  // -------------------------------------------------------------
  // PASO 3: SUMA TOTAL ESTIMADA DE NÓMINA BRUTA
  // -------------------------------------------------------------
  const estimacionBrutoTotal = subtotalFijoMesNatural + subtotalVariablePeriodoATH;

  return {
    periodo: period,
    mesNatural: {
      fechaInicio: fechaInicioMesNatural,
      fechaFin: fechaFinMesNatural,
      nombreMes: nombreMesNatural,
      totalDiasMes,
      diasAusencia: diasAusenciaMesNatural,
      diasLiquidables: diasLiquidablesMesNatural,
      logsCount: naturalMonthLogs.length
    },
    periodoATH: {
      fechaInicio: period.fechaInicio,
      fechaFin: period.fechaFin,
      diasLiquidables: diasLiquidablesATH,
      logsCount: periodLogs.length
    },
    fichajesContabilizados: periodLogs.length,
    diasLiquidables: diasLiquidablesMesNatural,
    diasAusenciaMesNatural,
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
      totalBaseDias: Math.round(subtotalFijoMesNatural * 100) / 100,
      precioSalarioBaseDia,
      precioPlusConvenioDia,
      precioProrrataPagaExtraDia,
      antiguedadMensualBase
    },
    tarifasAplicadas: {
      precioJComplement,
      precioHorasExtra,
      plusNocturnidad
    },
    desgloseImportes: {
      subtotalFijoMesNatural: Math.round(subtotalFijoMesNatural * 100) / 100,
      subtotalVariableATH: Math.round(subtotalVariablePeriodoATH * 100) / 100,
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
    mesNatural: { fechaInicio: '', fechaFin: '', nombreMes: '', totalDiasMes: 30, diasAusencia: 0, diasLiquidables: 0, logsCount: 0 },
    periodoATH: { fechaInicio: '', fechaFin: '', diasLiquidables: 0, logsCount: 0 },
    fichajesContabilizados: 0,
    diasLiquidables: 0,
    diasAusenciaMesNatural: 0,
    totalHorasTrabajadas: 0,
    totalHorasPresenciales: 0,
    totalHorasDescansoDescontadas: 0,
    totalHorasJComplement: 0,
    totalHorasFestivasExtra: 0,
    totalHorasNocturnas: 0,
    totalDiasFestivos: 0,
    conceptosDiarios: { salarioBase: 0, plusConvenio: 0, prorrataPagas: 0, antiguedad: 0, totalBaseDias: 0, precioSalarioBaseDia: 41.78, precioPlusConvenioDia: 5.58, precioProrrataPagaExtraDia: 8.24, antiguedadMensualBase: 62.66 },
    tarifasAplicadas: { precioJComplement: 12.36, precioHorasExtra: 21.63, plusNocturnidad: 1.85 },
    desgloseImportes: { subtotalFijoMesNatural: 0, subtotalVariableATH: 0, jornadaComplementaria: 0, horasExtraordinarias: 0, nocturnidad: 0 },
    estimacionBrutoTotal: 0,
    logs: []
  };
}
