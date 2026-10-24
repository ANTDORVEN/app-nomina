import { getSelectableShiftTypes, normalizeShiftSelection } from './customShiftService.js';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { getAllTimeLogs, getShiftTypes } from './shiftService.js';
import { recordDuration, recordEndDate } from '../utils/recordTimeUtils.js';

export function getRealTimeRecords() {
  const records = getStorageItem(STORAGE_KEYS.REAL_TIME_RECORDS, []);
  if (!Array.isArray(records)) throw new Error('No se pueden leer los registros de horas reales.');
  return records.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function scheduledWorkForDate(fecha) {
  const types = getShiftTypes();
  return getAllTimeLogs().find(log => {
    const type = types.find(item => item.id === log.tipoTurnoId);
    return log.fecha === fecha && log.tipoTurnoId !== 'libre' && !log.esAusencia && !type?.esAusencia
      && Number(log.horasTrabajadas) > 0;
  }) ?? null;
}

export function validateRealTimeRecord(data, shiftTypes = getSelectableShiftTypes()) {
  data = { ...data, ...normalizeShiftSelection(data, shiftTypes) };
  if (data.tipoTurnoPersonalizadoId === undefined) delete data.tipoTurnoPersonalizadoId;
  const date = new Date(`${data?.fecha}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data?.fecha ?? '') || !Number.isFinite(date.getTime())
    || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== data.fecha) throw new Error('Revisa la fecha.');
  for (const field of ['horaEntradaReal', 'horaSalidaReal']) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data[field] ?? '')) throw new Error('Revisa las horas de entrada y salida.');
  }
  if (typeof data.contarEnNomina !== 'boolean') throw new Error('Elige Sí o No para la nómina.');
  const type = shiftTypes.find(item => item.id === data.tipoTurnoId && !item.esAusencia && item.id !== 'libre');
  if (!type) throw new Error('Selecciona un tipo de turno de trabajo.');
  const endDate = recordEndDate(data);
  const endDay = new Date(`${endDate}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isFinite(endDay.getTime())
    || `${endDay.getFullYear()}-${String(endDay.getMonth() + 1).padStart(2, '0')}-${String(endDay.getDate()).padStart(2, '0')}` !== endDate) throw new Error('Revisa la fecha de salida.');
  let hours = recordDuration(data);
  if (data.registroEnVivo) {
    const { startedAt, endedAt } = data.registroEnVivo;
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const time = value => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt <= startedAt
      || `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` !== data.fecha
      || `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` !== endDate
      || time(start) !== data.horaEntradaReal || time(end) !== data.horaSalidaReal) throw new Error('Los tiempos del contador no coinciden con el registro.');
    hours = (endedAt - startedAt) / 3600000;
  }
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('La salida debe ser posterior a la entrada. Revisa también el día de salida.');
  const pause = Number(data.horasDescansoNoPagadas ?? 0);
  if (!Number.isFinite(pause) || pause < 0 || pause > hours) throw new Error('La pausa debe estar entre cero y la duración del turno.');
  return { ...data, fechaSalidaReal: endDate, horasTrabajadas: hours, horasDescansoNoPagadas: pause, esFestivo: data.esFestivo === true };
}

export function validateRealTimeBackup(data, shiftTypes) {
  if (!Array.isArray(data)) throw new Error('La copia de horas reales no es válida.');
  const dates = new Set();
  return data.map(item => {
    if (dates.has(item.fecha)) throw new Error('La copia repite un registro de horas reales en el mismo día.');
    dates.add(item.fecha);
    return validateRealTimeRecord(item, shiftTypes);
  });
}

export function saveRealTimeRecord(data) {
  const record = validateRealTimeRecord(data);
  const records = getRealTimeRecords();
  const index = records.findIndex(item => item.fecha === record.fecha);
  const now = new Date().toISOString();
  const saved = { ...(index >= 0 ? records[index] : {}), ...record, id: `real_${record.fecha}`,
    createdAt: index >= 0 ? records[index].createdAt : now, updatedAt: now };
  if (index >= 0) records[index] = saved;
  else records.push(saved);
  if (!setStorageItem(STORAGE_KEYS.REAL_TIME_RECORDS, records)) throw new Error('No se ha podido guardar. Los datos anteriores se conservan.');
  return saved;
}

export function deleteRealTimeRecord(fecha) {
  const records = getRealTimeRecords().filter(item => item.fecha !== fecha);
  if (!setStorageItem(STORAGE_KEYS.REAL_TIME_RECORDS, records)) throw new Error('No se ha podido borrar el registro.');
}

/** Solo cambia la fuente de horas del bloque variable. El cuadrante permanece intacto. */
export function payrollLogsWithRealTime(scheduledLogs) {
  const logs = scheduledLogs.slice();
  const types = getShiftTypes();
  for (const record of getRealTimeRecords().filter(item => item.contarEnNomina)) {
    const type = types.find(item => item.id === record.tipoTurnoId);
    const paid = Math.max(0, record.horasTrabajadas - record.horasDescansoNoPagadas);
    const log = { ...record, registroReal: true, anadidoManualmente: true, esAusencia: false,
      esPatronAuto: false, horasExtra: type?.id === 'guardia24' ? 0 : type?.id === 'jornada_adicional' ? paid : Math.max(0, paid - 8) };
    const index = logs.findIndex(item => item.fecha === record.fecha);
    if (index >= 0) logs[index] = log;
    else logs.push(log);
  }
  return logs.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
