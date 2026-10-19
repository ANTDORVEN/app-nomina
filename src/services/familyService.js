import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { formatDateToISO } from '../utils/dateUtils.js';

export const FAMILY_TYPES = [
  { id: 'dia', name: 'Día', short: 'D', start: '08:00', end: '20:00' },
  { id: 'noche', name: 'Noche', short: 'N', start: '20:00', end: '08:00' },
  { id: 'manana', name: 'Mañana', short: 'M', start: '08:00', end: '15:00' },
  { id: 'tarde', name: 'Tarde', short: 'T', start: '15:00', end: '22:00' },
  { id: 'libre', name: 'Libre', short: 'L', start: '00:00', end: '00:00' }
];
export const familyStep = type => {
  const item = FAMILY_TYPES.find(value => value.id === type);
  if (!item) throw new Error('Tipo de turno familiar no válido.');
  return { tipo: item.id, entrada: item.start, salida: item.end };
};
const defaultData = () => ({ ownName: 'Antonio', partnerName: 'Mi mujer', shifts: [], patterns: [
  { id: 'dia-noche-11', name: 'Día, noche y descansos (11 días)', steps: ['dia', 'noche', 'libre', 'libre', 'libre', 'dia', 'noche', 'libre', 'libre', 'libre', 'libre'].map(familyStep) },
  { id: 'semana-manana', name: 'Semana de mañanas (L–V)', steps: ['manana', 'manana', 'manana', 'manana', 'manana', 'libre', 'libre'].map(familyStep) }
] });

export function validFamilyDate(value) {
  const parsed = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(parsed.getTime()) && formatDateToISO(parsed) === value;
}
function validateStep(step) {
  if (!step || !FAMILY_TYPES.some(type => type.id === step.tipo)) throw new Error('Revisa el tipo de turno.');
  if (step.tipo === 'libre') return { ...step, entrada: '00:00', salida: '00:00' };
  if (![step.entrada, step.salida].every(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? '')) || step.entrada === step.salida) throw new Error('Revisa las horas del turno familiar.');
  return { ...step };
}
export function validateFamilyData(data) {
  if (!data || typeof data.partnerName !== 'string' || !data.partnerName.trim() || !Array.isArray(data.shifts) || !Array.isArray(data.patterns)) throw new Error('El calendario familiar no tiene un formato válido.');
  const dates = new Set();
  const shifts = data.shifts.map(shift => {
    if (!validFamilyDate(shift.fecha) || dates.has(shift.fecha)) throw new Error('Hay fechas inválidas o repetidas en el calendario familiar.');
    dates.add(shift.fecha);
    return { ...validateStep(shift), notas: typeof shift.notas === 'string' ? shift.notas : '' };
  });
  const ids = new Set();
  const patterns = data.patterns.map(pattern => {
    if (typeof pattern.id !== 'string' || !pattern.id || ids.has(pattern.id) || typeof pattern.name !== 'string' || !pattern.name.trim() || !Array.isArray(pattern.steps) || !pattern.steps.length || pattern.steps.length > 366) throw new Error('Revisa las cadencias guardadas.');
    if (pattern.anchor !== undefined && !validFamilyDate(pattern.anchor)) throw new Error('Revisa la fecha inicial de la cadencia.');
    ids.add(pattern.id);
    return { ...pattern, steps: pattern.steps.map(validateStep) };
  });
  if (data.ownName !== undefined && (typeof data.ownName !== 'string' || !data.ownName.trim())) throw new Error('Introduce tu nombre para el calendario.');
  return { ...data, ownName: data.ownName?.trim() || 'Antonio', partnerName: data.partnerName.trim(), shifts, patterns };
}
export function getFamilyData() {
  return validateFamilyData(getStorageItem(STORAGE_KEYS.FAMILY_CALENDAR, defaultData()));
}
function write(data) {
  const checked = validateFamilyData(data);
  if (!setStorageItem(STORAGE_KEYS.FAMILY_CALENDAR, checked)) throw new Error('No se ha podido guardar el calendario familiar. Los datos anteriores se conservan.');
  return checked;
}
export function saveFamilyName(name, ownName = getFamilyData().ownName) { return write({ ...getFamilyData(), partnerName: name, ownName }); }
export function saveFamilyShift(shift) {
  const data = getFamilyData();
  const saved = { ...validateStep(shift), fecha: shift.fecha, notas: shift.notas ?? '', manual: true, updatedAt: new Date().toISOString() };
  return write({ ...data, shifts: [...data.shifts.filter(item => item.fecha !== shift.fecha), saved].sort((a, b) => a.fecha.localeCompare(b.fecha)) });
}
export function deleteFamilyShift(fecha) {
  const data = getFamilyData();
  return write({ ...data, shifts: data.shifts.filter(item => item.fecha !== fecha) });
}
export function saveFamilyPattern(name, steps) {
  const data = getFamilyData();
  const pattern = { id: `family_pattern_${crypto.randomUUID()}`, name: name.trim(), steps: steps.map(validateStep) };
  return write({ ...data, patterns: [...data.patterns, pattern] });
}
/** El ciclo empieza en anchor; start/end solo limitan las fechas que se rellenan. */
export function previewFamilyPattern({ patternId, anchor, start, end }) {
  const pattern = getFamilyData().patterns.find(item => item.id === patternId);
  if (!pattern) throw new Error('Selecciona una cadencia.');
  if (![anchor, start, end].every(validFamilyDate) || end < start) throw new Error('Revisa las fechas de aplicación.');
  const serial = value => { const [y, m, d] = value.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
  const count = serial(end) - serial(start) + 1;
  if (count > 732) throw new Error('Aplica como máximo dos años cada vez.');
  const shifts = [];
  const cursor = new Date(`${start}T12:00:00`);
  for (let i = 0; i < count; i++) {
    const fecha = formatDateToISO(cursor);
    const offset = serial(fecha) - serial(anchor);
    const step = pattern.steps[((offset % pattern.steps.length) + pattern.steps.length) % pattern.steps.length];
    shifts.push({ ...step, fecha, notas: '', manual: false, patternId: pattern.id });
    cursor.setDate(cursor.getDate() + 1);
  }
  return shifts;
}
export function applyFamilyPattern(options, replace = false) {
  const data = getFamilyData();
  const shifts = previewFamilyPattern(options);
  const existing = new Set(data.shifts.map(item => item.fecha));
  const applied = shifts.filter(item => replace || !existing.has(item.fecha));
  const dates = new Set(applied.map(item => item.fecha));
  return { data: write({ ...data, patterns: data.patterns.map(pattern => pattern.id === options.patternId ? { ...pattern, anchor: options.anchor } : pattern), shifts: [...data.shifts.filter(item => !dates.has(item.fecha)), ...applied].sort((a, b) => a.fecha.localeCompare(b.fecha)) }), added: applied.length, skipped: shifts.length - applied.length };
}
