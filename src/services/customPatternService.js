import { getSelectableShiftTypes, shiftSelectionFields } from './customShiftService.js';
import { getAllTimeLogs } from './shiftService.js';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { calculateWorkedHours, formatDateToISO } from '../utils/dateUtils.js';

function validDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(date.getTime()) && formatDateToISO(date) === value;
}
const serial = value => Date.parse(`${value}T00:00:00Z`) / 86400000;

export function validateCustomSteps(steps, types = getSelectableShiftTypes()) {
  if (!Array.isArray(steps) || !steps.length) throw new Error('Añade al menos un turno o un descanso.');
  let days = 0;
  return steps.map(step => {
    const type = types.find(item => item.id === step.tipoTurnoId);
    if (!type) throw new Error('Elige el tipo de cada día.');
    const repeat = Number(step.repeticiones);
    if (!Number.isInteger(repeat) || repeat < 1 || (days += repeat) > 366) throw new Error('Cada paso necesita días enteros. El ciclo admite hasta 366 días.');
    const free = (type.tipoBase ?? type.id) === 'libre' || type.esAusencia;
    if (!free && ![step.entrada, step.salida].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? ''))) throw new Error('Introduce la entrada y salida de cada turno.');
    const hours = free ? 0 : (type.tipoBase ?? type.id) === 'guardia24' && step.entrada === step.salida ? 24 : calculateWorkedHours(step.entrada, step.salida);
    if (!free && hours <= 0) throw new Error('Revisa la duración. Para 24 h, elige Guardia 24h y la misma hora de entrada y salida.');
    const pause = free ? 0 : Number(step.descansoMinutos ?? 0);
    if (!Number.isFinite(pause) || pause < 0 || pause > hours * 60) throw new Error('Revisa la pausa no pagada de cada turno.');
    return { tipoTurnoId: type.id, entrada: free ? '00:00' : step.entrada,
      salida: free ? '00:00' : step.salida, repeticiones: repeat, descansoMinutos: pause };
  });
}

export function validateCustomPatterns(patterns, types = getSelectableShiftTypes()) {
  if (!Array.isArray(patterns)) throw new Error('Las cadencias personales no tienen un formato válido.');
  const ids = new Set();
  return patterns.map(pattern => {
    if (typeof pattern.id !== 'string' || !pattern.id || ids.has(pattern.id) || typeof pattern.name !== 'string' || !pattern.name.trim()) throw new Error('Revisa los nombres de las cadencias personales.');
    if (pattern.anchor && !validDate(pattern.anchor)) throw new Error('Revisa el inicio de la cadencia.');
    if (pattern.category !== undefined && typeof pattern.category !== 'string') throw new Error('Revisa la categoría de la cadencia.');
    ids.add(pattern.id);
    return { ...pattern, steps: validateCustomSteps(pattern.steps, types) };
  });
}

export const getCustomPatterns = () => validateCustomPatterns(getStorageItem(STORAGE_KEYS.CUSTOM_PATTERNS, []));

export function saveCustomPattern(name, steps, anchor, category = '') {
  if (!name.trim()) throw new Error('Ponle un nombre a tu cadencia.');
  const patterns = getCustomPatterns();
  const pattern = { id: `custom_${crypto.randomUUID()}`, name: name.trim(), category: category.trim(), steps, ...(anchor ? { anchor } : {}) };
  const checked = validateCustomPatterns([...patterns, pattern]);
  if (!setStorageItem(STORAGE_KEYS.CUSTOM_PATTERNS, checked)) throw new Error('No se ha podido guardar la cadencia.');
  return checked;
}

export function updateCustomPattern(id, changes) {
  const patterns = getCustomPatterns();
  if (!patterns.some(pattern => pattern.id === id)) throw new Error('La cadencia ya no existe. Vuelve a cargarla.');
  const checked = validateCustomPatterns(patterns.map(pattern => pattern.id === id
    ? { ...pattern, ...changes, id: pattern.id, name: changes.name.trim(), category: changes.category?.trim() ?? pattern.category ?? '' }
    : pattern));
  if (!setStorageItem(STORAGE_KEYS.CUSTOM_PATTERNS, checked)) throw new Error('No se han podido guardar los cambios de la cadencia.');
  return checked;
}

export function deleteCustomPattern(id) {
  const patterns = getCustomPatterns().filter(pattern => pattern.id !== id);
  if (!setStorageItem(STORAGE_KEYS.CUSTOM_PATTERNS, patterns)) throw new Error('No se ha podido eliminar la cadencia.');
  return patterns;
}

export function previewCustomPattern({ steps, start, end, anchor = start }) {
  const checked = validateCustomSteps(steps);
  if (![start, end, anchor].every(validDate) || end < start || serial(end) - serial(start) > 731) throw new Error('Elige un rango válido de hasta dos años.');
  const cycle = checked.flatMap(step => Array.from({ length: step.repeticiones }, () => step));
  const types = getSelectableShiftTypes();
  const logs = [];
  const date = new Date(`${start}T12:00:00`);
  while (formatDateToISO(date) <= end) {
    const fecha = formatDateToISO(date);
    const step = cycle[((serial(fecha) - serial(anchor)) % cycle.length + cycle.length) % cycle.length];
    const type = types.find(item => item.id === step.tipoTurnoId);
    const free = (type.tipoBase ?? type.id) === 'libre' || type.esAusencia;
    const hours = free ? 0 : (type.tipoBase ?? type.id) === 'guardia24' && step.entrada === step.salida ? 24 : calculateWorkedHours(step.entrada, step.salida);
    logs.push({ fecha, ...shiftSelectionFields(type.id, types), horaEntradaReal: step.entrada, horaSalidaReal: step.salida,
      horasTrabajadas: hours, horasDescansoNoPagadas: step.descansoMinutos / 60,
      horasExtra: (type.tipoBase ?? type.id) === 'guardia24' || free ? 0 : (type.tipoBase ?? type.id) === 'jornada_adicional' ? Math.max(0, hours - step.descansoMinutos / 60) : Math.max(0, hours - step.descansoMinutos / 60 - 8),
      esFestivo: type.esFestivo === true, esAusencia: type.esAusencia === true,
      esPatronAuto: true, horarioPersonalizado: true, notas: 'Cadencia personal (Patrón Rotativo)' });
    date.setDate(date.getDate() + 1);
  }
  return logs;
}

export function applyCustomPattern(options, replace = false) {
  const preview = previewCustomPattern(options);
  const logs = getAllTimeLogs();
  let added = 0;
  for (const day of preview) {
    const index = logs.findIndex(item => item.fecha === day.fecha);
    if (index >= 0 && !replace) continue;
    const previous = index >= 0 ? logs[index] : null;
    const next = { ...day, id: previous?.id ?? `log_${crypto.randomUUID()}`, createdAt: previous?.createdAt ?? new Date().toISOString(),
      ...(previous ? { fichajeSustituido: previous } : {}) };
    if (index >= 0) logs[index] = next;
    else logs.push(next);
    added++;
  }
  if (added && !setStorageItem(STORAGE_KEYS.TIME_LOGS, logs.sort((a, b) => b.fecha.localeCompare(a.fecha)))) throw new Error('No se ha podido aplicar el cuadrante. Los registros anteriores se conservan.');
  return { added, skipped: preview.length - added };
}
