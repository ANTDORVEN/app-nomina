import { getShiftTypes } from './shiftService.js';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { calculateWorkedHours } from '../utils/dateUtils.js';

export function validateCustomShiftTypes(items, bases = getShiftTypes()) {
  if (!Array.isArray(items)) throw new Error('Los tipos de turno personales no tienen un formato válido.');
  const ids = new Set();
  return items.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Revisa los tipos de turno personales.');
    const base = bases.find(type => type.id === item.tipoBase);
    if (!base || typeof item.id !== 'string' || !item.id.startsWith('custom_shift_') || ids.has(item.id)) throw new Error('Revisa la identificación y el tratamiento de los turnos personales.');
    if (typeof item.nombre !== 'string' || !item.nombre.trim() || typeof item.nombreCorto !== 'string' || !item.nombreCorto.trim()) throw new Error('Introduce el nombre y la abreviatura del turno. Puedes usar emojis.');
    if (!/^#[0-9a-f]{6}$/i.test(item.color ?? '')) throw new Error('Elige un color válido.');
    const free = base.id === 'libre' || base.esAusencia;
    if (!free && ![item.horaInicio, item.horaFin].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? ''))) throw new Error('Revisa las horas del turno personal.');
    const hours = free ? 0 : base.id === 'guardia24' && item.horaInicio === item.horaFin ? 24 : calculateWorkedHours(item.horaInicio, item.horaFin);
    const pause = free ? 0 : Number(item.horasDescansoNoPagadas ?? 0);
    if ((!free && hours <= 0) || !Number.isFinite(pause) || pause < 0 || pause > hours) throw new Error('Revisa la duración y la pausa no pagada del turno.');
    ids.add(item.id);
    return { ...item, nombre: item.nombre.trim(), nombreCorto: item.nombreCorto.trim(),
      horaInicio: free ? '00:00' : item.horaInicio, horaFin: free ? '00:00' : item.horaFin,
      horasTeoricas: hours, horasDescansoNoPagadas: pause };
  });
}

export const getCustomShiftTypes = () => validateCustomShiftTypes(getStorageItem(STORAGE_KEYS.CUSTOM_SHIFT_TYPES, []));

export function getSelectableShiftTypes(custom = getCustomShiftTypes(), bases = getShiftTypes()) {
  return [...bases, ...custom.map(item => {
    const base = bases.find(type => type.id === item.tipoBase);
    return { ...base, ...item, esPersonalizado: true, esAusencia: base.esAusencia, esFestivo: base.esFestivo };
  })];
}

export function baseShiftId(id, types = getSelectableShiftTypes()) {
  return types.find(type => type.id === id)?.tipoBase ?? id;
}

/** La etiqueta personal se guarda aparte; la nómina sigue recibiendo el tipo base. */
export function shiftSelectionFields(id, types = getSelectableShiftTypes()) {
  const type = types.find(item => item.id === id);
  return { tipoTurnoId: type?.tipoBase ?? id, tipoTurnoPersonalizadoId: type?.esPersonalizado ? type.id : undefined };
}

export function normalizeShiftSelection(data, types = getSelectableShiftTypes()) {
  const alias = types.find(type => type.id === data.tipoTurnoPersonalizadoId && type.tipoBase === data.tipoTurnoId);
  return shiftSelectionFields(alias?.id ?? data.tipoTurnoId, types);
}

export function getDisplayShiftType(log, types = getSelectableShiftTypes()) {
  return types.find(type => type.id === log.tipoTurnoPersonalizadoId && type.tipoBase === log.tipoTurnoId)
    ?? types.find(type => type.id === log.tipoTurnoId);
}

export function saveCustomShiftType(data, id) {
  const items = getCustomShiftTypes();
  const previous = id ? items.find(item => item.id === id) : null;
  if (id && !previous) throw new Error('El tipo de turno ya no existe.');
  if (previous && previous.tipoBase !== data.tipoBase) throw new Error('Para otro tratamiento de nómina, crea un tipo nuevo. Así se conserva el significado de los turnos anteriores.');
  const next = { ...data, id: previous?.id ?? `custom_shift_${crypto.randomUUID()}` };
  const checked = validateCustomShiftTypes(previous ? items.map(item => item.id === id ? next : item) : [...items, next]);
  if (!setStorageItem(STORAGE_KEYS.CUSTOM_SHIFT_TYPES, checked)) throw new Error('No se ha podido guardar el tipo de turno.');
  return checked;
}
