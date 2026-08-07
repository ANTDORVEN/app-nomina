/**
 * patternService.js - Servicio avanzado para generación y borrado de patrones de turnos TES.
 */

import { saveTimeLog, getShiftTypes, getAllTimeLogs } from './shiftService.js';
import { setStorageItem, STORAGE_KEYS } from './storageService.js';
import { formatDateToISO, calculateWorkedHours } from '../utils/dateUtils.js';

/**
 * Genera el patrón de Guardias de 24h (1 día guardia + 3 días descanso)
 */
export function generateGuardias24hPattern(fechaInicioGuardia, numeroMeses = 6, fechaFinCustom = null) {
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
  const guardiaShift = shiftTypes.find(s => s.id === 'guardia24') || { id: 'guardia24', horaInicio: '08:00', horaFin: '08:00', horasTeoricas: 24 };
  const libreShift = shiftTypes.find(s => s.id === 'libre') || { id: 'libre', horaInicio: '00:00', horaFin: '00:00', horasTeoricas: 0 };

  let currDate = new Date(startDate);
  let dayCounter = 0;

  while (currDate <= endDate) {
    const isoDate = formatDateToISO(currDate);

    if (dayCounter % 4 === 0) {
      saveTimeLog({
        fecha: isoDate,
        tipoTurnoId: 'guardia24',
        horaEntradaReal: guardiaShift.horaInicio,
        horaSalidaReal: guardiaShift.horaFin,
        horasTrabajadas: 24,
        horasExtra: 0,
        esFestivo: false,
        esPatronAuto: true,
        notas: 'Guardia 24h (Patrón Rotativo)'
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
 * Genera patrón de Lunes a Viernes con el tipo de turno seleccionado (Mañana, Tarde, Noche)
 */
export function generateLunesViernesPattern(fechaInicio, numeroMeses = 6, fechaFinCustom = null, tipoTurnoId = 'manana') {
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

  let currDate = new Date(startDate);

  while (currDate <= endDate) {
    const dayOfWeek = currDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const isoDate = formatDateToISO(currDate);
      saveTimeLog({
        fecha: isoDate,
        tipoTurnoId,
        horaEntradaReal: shiftObj.horaInicio,
        horaSalidaReal: shiftObj.horaFin,
        horasTrabajadas: shiftObj.horasTeoricas,
        horasExtra: 0,
        esFestivo: false,
        esPatronAuto: true,
        notas: `${shiftObj.nombre} L-V (Patrón Rotativo)`
      });
    }

    currDate.setDate(currDate.getDate() + 1);
  }
}

/**
 * Genera patrón de Fin de Semana Alterno (Sábado o Domingo) con HORARIO PERSONALIZADO
 * 
 * @param {string} primerDiaFecha - Fecha 'YYYY-MM-DD' del primer sábado o domingo
 * @param {number|null} numeroMeses 
 * @param {string|null} fechaFinCustom 
 * @param {string} diaSemanaElegido - 'sabado' o 'domingo'
 * @param {string} horaInicio - Ej: '07:30'
 * @param {string} horaSalida - Ej: '19:30'
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
      horasExtra: Math.max(0, horasCalc - 8),
      esFestivo: diaSemanaElegido === 'domingo',
      esPatronAuto: true,
      notas: `${nombreEtiqueta} (${horaInicio}-${horaSalida}) (Patrón Rotativo)`
    });

    // Sumar 14 días (2 semanas)
    currDate.setDate(currDate.getDate() + 14);
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
    if (n.includes('patrón rotativo') || n.includes('patron rotativo') || n.includes('post-guardia') || n.includes('sábado alterno') || n.includes('domingo alterno') || n.includes('l-v')) {
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
