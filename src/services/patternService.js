/**
 * patternService.js - Servicio avanzado para generación y borrado de patrones de turnos y ausencias TES.
 */

import { saveTimeLog, getShiftTypes, getAllTimeLogs } from './shiftService.js';
import { setStorageItem, STORAGE_KEYS } from './storageService.js';
import { formatDateToISO, calculateWorkedHours } from '../utils/dateUtils.js';

/**
 * Genera el patrón de Guardias de 24h (1 día guardia + 3 días descanso)
 */
export function generateGuardias24hPattern(fechaInicioGuardia, numeroMeses = 6, fechaFinCustom = null, horaInicio = '08:00', horaSalida = '08:00') {
  if (!fechaInicioGuardia) return;

  const startDate = new Date(fechaInicioGuardia + 'T00:00:00');
  let endDate;

  if (fechaFinCustom) {
    endDate = new Date(fechaFinCustom + 'T00:00:00');
  } else {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (numeroMeses || 6));
  }

  const shiftTypes = getShiftTypes();
  const libreShift = shiftTypes.find(s => s.id === 'libre') || { id: 'libre', horaInicio: '00:00', horaFin: '00:00', horasTeoricas: 0 };

  const horasGuardia = calculateWorkedHours(horaInicio, horaSalida) || 24;

  let currDate = new Date(startDate);
  let dayCounter = 0;

  while (currDate <= endDate) {
    const isoDate = formatDateToISO(currDate);

    if (dayCounter % 4 === 0) {
      saveTimeLog({
        fecha: isoDate,
        tipoTurnoId: 'guardia24',
        horaEntradaReal: horaInicio,
        horaSalidaReal: horaSalida,
        horasTrabajadas: horasGuardia,
        horasExtra: 0,
        esFestivo: false,
        esPatronAuto: true,
        notas: `Guardia 24h (${horaInicio}-${horaSalida}) (Patrón Rotativo)`
      });
    } else {
      saveTimeLog({
        fecha: isoDate,
        tipoTurnoId: 'libre',
        horaEntradaReal: libreShift.horaInicio,
        horaSalidaReal: libreShift.horaFin,
        horasTrabajadas: 0,
        horasExtra: 0,
        esFestivo: false,
        esPatronAuto: true,
        notas: `Descanso Post-Guardia (${dayCounter % 4}/3) (Patrón Rotativo)`
      });
    }

    currDate.setDate(currDate.getDate() + 1);
    dayCounter++;
  }
}

/**
 * Genera patrón de Lunes a Viernes con el tipo de turno seleccionado
 */
export function generateLunesViernesPattern(fechaInicio, numeroMeses = 6, fechaFinCustom = null, tipoTurnoId = 'manana', horaInicio = '07:00', horaSalida = '15:00') {
  if (!fechaInicio) return;

  const startDate = new Date(fechaInicio + 'T00:00:00');
  let endDate;

  if (fechaFinCustom) {
    endDate = new Date(fechaFinCustom + 'T00:00:00');
  } else {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (numeroMeses || 6));
  }

  const shiftTypes = getShiftTypes();
  const shiftObj = shiftTypes.find(s => s.id === tipoTurnoId) || shiftTypes[0];

  const horasCalc = calculateWorkedHours(horaInicio, horaSalida);

  let currDate = new Date(startDate);

  while (currDate <= endDate) {
    const dayOfWeek = currDate.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const isoDate = formatDateToISO(currDate);
      saveTimeLog({
        fecha: isoDate,
        tipoTurnoId,
        horaEntradaReal: horaInicio,
        horaSalidaReal: horaSalida,
        horasTrabajadas: horasCalc,
        horasExtra: 0,
        esFestivo: false,
        esPatronAuto: true,
        notas: `${shiftObj.nombre} (${horaInicio}-${horaSalida}) L-V (Patrón Rotativo)`
      });
    }

    currDate.setDate(currDate.getDate() + 1);
  }
}

/**
 * Genera patrón de Fin de Semana Alterno (Sábado o Domingo)
 */
export function generateFinDeSemanaAlternoPattern(primerDiaFecha, numeroMeses = 6, fechaFinCustom = null, diaSemanaElegido = 'sabado', horaInicio = '08:00', horaSalida = '16:00') {
  if (!primerDiaFecha) return;

  let currDate = new Date(primerDiaFecha + 'T00:00:00');
  let endDate;

  if (fechaFinCustom) {
    endDate = new Date(fechaFinCustom + 'T00:00:00');
  } else {
    endDate = new Date(currDate);
    endDate.setMonth(endDate.getMonth() + (numeroMeses || 6));
  }

  const targetDayOfWeek = diaSemanaElegido === 'sabado' ? 6 : 0;
  while (currDate.getDay() !== targetDayOfWeek) {
    currDate.setDate(currDate.getDate() + 1);
  }

  const horasCalc = calculateWorkedHours(horaInicio, horaSalida);
  const nombreEtiqueta = diaSemanaElegido === 'sabado' ? 'Sábado Alterno' : 'Domingo Alterno';
  const shiftTypeId = diaSemanaElegido === 'sabado' ? 'sabado_alterno' : 'festivo';

  while (currDate <= endDate) {
    const isoDate = formatDateToISO(currDate);

    saveTimeLog({
      fecha: isoDate,
      tipoTurnoId: shiftTypeId,
      horaEntradaReal: horaInicio,
      horaSalidaReal: horaSalida,
      horasTrabajadas: horasCalc,
      horasExtra: 0,
      esFestivo: diaSemanaElegido === 'domingo',
      esPatronAuto: true,
      notas: `${nombreEtiqueta} (${horaInicio}-${horaSalida}) (Patrón Rotativo)`
    });

    currDate.setDate(currDate.getDate() + 14);
  }
}

/**
 * Genera patrón de Ausencias (Vacaciones, Baja Laboral, Paternidad/Maternidad, Asuntos Propios) por rango de fechas
 */
export function generateAusenciaPattern(fechaInicio, numeroMeses = 1, fechaFinCustom = null, tipoTurnoId = 'vacaciones') {
  if (!fechaInicio) return;

  const startDate = new Date(fechaInicio + 'T00:00:00');
  let endDate;

  if (fechaFinCustom) {
    endDate = new Date(fechaFinCustom + 'T00:00:00');
  } else {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (numeroMeses || 1));
  }

  const shiftTypes = getShiftTypes();
  const shiftObj = shiftTypes.find(s => s.id === tipoTurnoId) || { nombre: 'Ausencia' };

  let currDate = new Date(startDate);

  while (currDate <= endDate) {
    const isoDate = formatDateToISO(currDate);

    saveTimeLog({
      fecha: isoDate,
      tipoTurnoId,
      horaEntradaReal: '00:00',
      horaSalidaReal: '00:00',
      horasTrabajadas: 0,
      horasExtra: 0,
      esFestivo: false,
      esPatronAuto: true,
      notas: `${shiftObj.nombre} (Patrón Rotativo)`
    });

    currDate.setDate(currDate.getDate() + 1);
  }
}

/**
 * Comprueba si un registro se considera generado por un patrón automático
 */
export function isLogAutoGenerated(log) {
  if (!log) return false;
  if (log.esPatronAuto === true) return true;
  if (log.notas) {
    const n = log.notas.toLowerCase();
    if (n.includes('patrón rotativo') || n.includes('patron rotativo') || n.includes('post-guardia') || n.includes('sábado alterno') || n.includes('domingo alterno') || n.includes('l-v') || n.includes('vacaciones') || n.includes('baja') || n.includes('asuntos propios')) {
      return true;
    }
  }
  return false;
}

/**
 * Cuenta los turnos que coinciden en el rango para la vista previa de borrado.
 */
export function previewDeletePatternInRange(startDateIso, endDateIso, onlyAutoGenerated = true) {
  const logs = getAllTimeLogs();

  const matchingLogs = logs.filter(log => {
    const inRange = log.fecha >= startDateIso && log.fecha <= endDateIso;
    if (!inRange) return false;

    if (onlyAutoGenerated) {
      return isLogAutoGenerated(log);
    }
    return true;
  });

  return {
    totalEncontrados: matchingLogs.length,
    autoGenerados: matchingLogs.filter(l => isLogAutoGenerated(l)).length,
    manuales: matchingLogs.filter(l => !isLogAutoGenerated(l)).length,
    matchingLogs
  };
}

/**
 * Borra los turnos dentro del rango especificado
 */
export function deletePatternInRange(startDateIso, endDateIso, onlyAutoGenerated = true) {
  const logs = getAllTimeLogs();

  const remainingLogs = logs.filter(log => {
    const inRange = log.fecha >= startDateIso && log.fecha <= endDateIso;
    if (!inRange) return true;

    if (onlyAutoGenerated) {
      const isAuto = isLogAutoGenerated(log);
      return !isAuto;
    } else {
      return false;
    }
  });

  setStorageItem(STORAGE_KEYS.TIME_LOGS, remainingLogs);
  return remainingLogs;
}
