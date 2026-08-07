/**
 * calendarUtils.js - Funciones de ayuda para la cuadrícula del calendario mensual.
 * 
 * Conceptos DAW:
 * - Generación de matrices para representar semanas (7 columnas: Lunes a Domingo).
 * - Navegación mensual sin librerías pesadas como Moment.js o Date-fns.
 */

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Obtiene la matriz de días para renderizar la cuadrícula del calendario de un mes determinado
 * @param {number} year - Año (ej: 2026)
 * @param {number} monthIndex - Índice del mes (0 = Enero, 11 = Diciembre)
 * @returns {Array<object>} Lista de días con metadata ({ dateIso, dayNumber, isCurrentMonth })
 */
export function getMonthDaysGrid(year, monthIndex) {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Ajustar día de la semana (en JS 0 = Domingo, queremos 0 = Lunes)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysGrid = [];

  // Días del mes anterior para rellenar la primera semana
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, monthIndex - 1, day);
    daysGrid.push({
      dateIso: formatDateISO(date),
      dayNumber: day,
      isCurrentMonth: false
    });
  }

  // Días del mes actual
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(year, monthIndex, day);
    daysGrid.push({
      dateIso: formatDateISO(date),
      dayNumber: day,
      isCurrentMonth: true
    });
  }

  // Días del mes siguiente para completar la última semana
  const remainingDays = 42 - daysGrid.length; // 6 filas x 7 días = 42
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, monthIndex + 1, day);
    daysGrid.push({
      dateIso: formatDateISO(date),
      dayNumber: day,
      isCurrentMonth: false
    });
  }

  return daysGrid;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
