import { formatDateToISO } from './dateUtils.js';

export function recordEndDate(record) {
  if (record.fechaSalidaReal) return record.fechaSalidaReal;
  if (record.registroEnVivo?.endedAt) return formatDateToISO(new Date(record.registroEnVivo.endedAt));
  const day = new Date(`${record.fecha}T12:00:00`);
  if (record.horaSalidaReal < record.horaEntradaReal
    || (record.tipoTurnoId === 'guardia24' && record.horaSalidaReal === record.horaEntradaReal)) day.setDate(day.getDate() + 1);
  return formatDateToISO(day);
}

export function recordDuration(record) {
  if (record.registroEnVivo) return (record.registroEnVivo.endedAt - record.registroEnVivo.startedAt) / 3600000;
  // Horas de reloj para el formulario; el contador conserva el tiempo transcurrido real.
  return (Date.parse(`${recordEndDate(record)}T${record.horaSalidaReal}:00Z`)
    - Date.parse(`${record.fecha}T${record.horaEntradaReal}:00Z`)) / 3600000;
}

export function recordNextDayLabel(record) {
  const end = recordEndDate(record);
  return end > record.fecha ? ` (salida ${end.split('-').reverse().join('/')})` : '';
}
