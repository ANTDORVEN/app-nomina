/**
 * dateUtils.js - Funciones auxiliares para el tratamiento de fechas y horas en la app de nómina TES.
 * 
 * Conceptos DAW aplicados:
 * - Uso de Objetos Date nativos de JavaScript.
 * - Formateo ISO 8601 (YYYY-MM-DD) para almacenamiento limpio.
 * - Cálculo de diferencia de horas considerando cambios de día (ej: turnos nocturnos de 22:00 a 06:00).
 * - Formateo visual de horas decimales a texto 'Xh Ymin' (ej: 8.833 -> "8h 50min").
 */

/**
 * Convierte un objeto Date o String a formato 'YYYY-MM-DD' para los inputs tipo <input type="date">
 * @param {Date|string} date 
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
export function formatDateToISO(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha ISO 'YYYY-MM-DD' a formato legible en español (ej: "15 Ene 2026")
 * @param {string} isoString 
 * @returns {string} Fecha formateada
 */
export function formatDateSpanish(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString + 'T00:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Comprueba si una fecha en formato 'YYYY-MM-DD' se encuentra dentro de un rango [inicio, fin]
 * @param {string} targetDate - Fecha del fichaje
 * @param {string} startDate - Fecha inicio del periodo ATH
 * @param {string} endDate - Fecha fin del periodo ATH
 * @returns {boolean}
 */
export function isDateInPeriod(targetDate, startDate, endDate) {
  if (!targetDate || !startDate || !endDate) return false;
  return targetDate >= startDate && targetDate <= endDate;
}

/**
 * Calcula las horas transcurridas entre dos franjas horarias 'HH:MM'
 * Maneja automáticamente turnos que cruzan la medianoche (ej: 22:00 a 06:00 = 8 horas).
 * @param {string} startTime - Hora inicio ('08:00')
 * @param {string} endTime - Hora fin ('16:00' o '06:00')
 * @returns {number} Horas reales trabajadas (con decimales si aplica)
 */
export function calculateWorkedHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  // Si la hora de fin es menor que la de inicio, asumimos que cruza la medianoche (+24 horas)
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const diffMinutes = endTotalMinutes - startTotalMinutes;
  return Math.round((diffMinutes / 60) * 100) / 100; // Redondeo a 2 decimales para cálculos exactos
}

/**
 * Formatea un número de horas decimales a texto legible 'Xh Ymin' (ej: 8.833 -> "8h 50min", 8.5 -> "8h 30min", 8 -> "8h")
 * @param {number|string} decimalHours 
 * @returns {string} Texto formateado
 */
export function formatHoursToHHMM(decimalHours) {
  const num = Number(decimalHours);
  if (isNaN(num) || num <= 0) return '0h';

  const totalMinutes = Math.round(num * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

/**
 * Obtiene la hora actual formateada como 'HH:MM' para el fichaje rápido.
 * @returns {string} Hora actual en formato 'HH:MM'
 */
export function getCurrentTimeFormatted() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
