import { getStorageItem, setStorageItem } from './storageService.js';
import { getAllTimeLogs } from './shiftService.js';
import { formatDateToISO } from '../utils/dateUtils.js';

export const LIVE_SHIFT_KEY = 'tes_nomina_live_shift';
export const getLiveShift = () => getStorageItem(LIVE_SHIFT_KEY, null);

export function changeLiveShift(previous, action, now = Date.now()) {
  const current = getLiveShift();
  if (JSON.stringify(current) !== JSON.stringify(previous)) {
    throw new Error('El turno ha cambiado en otra ventana. Revisa su estado y vuelve a intentarlo.');
  }
  let next;
  if (action === 'start' && !current) {
    next = { id: `live_${now}`, startedAt: now, pauses: [], endedAt: null };
  } else if (current && !current.endedAt && now >= current.startedAt) {
    const pauses = current.pauses.map(pause => ({ ...pause }));
    const lastPause = pauses.at(-1);
    if (lastPause && now < (lastPause.end ?? lastPause.start)) throw new Error('La hora del dispositivo ha retrocedido. Revisa el reloj antes de continuar.');
    const open = pauses.at(-1)?.end == null && pauses.length > 0;
    if (action === 'pause' && !open) pauses.push({ start: now, end: null });
    else if (action === 'resume' && open) pauses.at(-1).end = now;
    else if (action === 'finish') { if (open) pauses.at(-1).end = now; }
    else throw new Error('Esta acción no corresponde al estado del turno.');
    next = { ...current, pauses, endedAt: action === 'finish' ? now : null };
  } else throw new Error('No se puede cambiar este turno.');
  if (!setStorageItem(LIVE_SHIFT_KEY, next)) throw new Error('No se ha podido guardar. Vuelve a intentarlo.');
  return next;
}

export function liveDurations(session, now = Date.now()) {
  if (!session) return { total: 0, pause: 0, active: 0 };
  const end = session.endedAt ?? now;
  const total = Math.max(0, end - session.startedAt);
  const pause = session.pauses.reduce((sum, p) => sum + Math.max(0, (p.end ?? end) - p.start), 0);
  return { total, pause, active: Math.max(0, total - pause) };
}

export function suggestShift(session, types) {
  const start = new Date(session.startedAt);
  const minutes = start.getHours() * 60 + start.getMinutes();
  return types.filter(type => ['manana', 'tarde', 'noche'].includes(type.id))
    .map(type => {
      const [hour, minute] = type.horaInicio.split(':').map(Number);
      // Sugiere el turno ya iniciado, con 90 minutos de margen para entradas anticipadas.
      const distance = (minutes - hour * 60 - minute + 90 + 1440) % 1440;
      return { id: type.id, distance };
    }).sort((a, b) => a.distance - b.distance)[0]?.id ?? 'manana';
}

export function liveShiftLog(session, type, deductPause, festive, notes) {
  if (!session?.endedAt || session.endedAt < session.startedAt) throw new Error('Termina el turno antes de guardarlo.');
  const duration = liveDurations(session);
  const hours = ms => ms / 3600000;
  const time = timestamp => new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  const worked = hours(duration.total);
  const unpaid = deductPause ? hours(duration.pause) : 0;
  return {
    id: session.id, fecha: formatDateToISO(new Date(session.startedAt)),
    tipoTurnoId: type.id, horaEntradaReal: time(session.startedAt), horaSalidaReal: time(session.endedAt),
    horasTrabajadas: worked, horasDescansoNoPagadas: unpaid,
    horasExtra: type.id === 'guardia24' ? 0 : type.id === 'jornada_adicional' ? Math.max(0, worked - unpaid) : Math.max(0, worked - unpaid - 8),
    esFestivo: festive || type.esFestivo === true, esAusencia: false, esPatronAuto: false,
    notas: notes, registroEnVivo: session, createdAt: new Date().toISOString()
  };
}

export function saveLiveShift(session, log, replace = false) {
  if (JSON.stringify(getLiveShift()) !== JSON.stringify(session)) throw new Error('El turno ha cambiado. Revisa su estado.');
  const logs = getAllTimeLogs();
  const existing = logs.findIndex(item => item.fecha === log.fecha);
  if (existing >= 0 && logs[existing].id !== session.id && !replace) {
    throw new Error('Ya hay un fichaje en esa fecha. Revisa el registro existente antes de sustituirlo.');
  }
  if (existing >= 0) logs[existing] = {
    ...log,
    fichajeSustituido: logs[existing].id !== session.id ? logs[existing] : logs[existing].fichajeSustituido
  };
  else logs.push(log);
  logs.sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!setStorageItem('tes_nomina_time_logs', logs)) throw new Error('No se ha podido guardar el fichaje. El turno sigue pendiente.');
  if (!setStorageItem(LIVE_SHIFT_KEY, null)) throw new Error('Fichaje guardado. Pulsa guardar otra vez para cerrar el contador pendiente.');
}
