import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { changeLiveShift, getLiveShift, liveDurations, liveShiftLog, saveLiveShift, suggestShift, LIVE_SHIFT_KEY } from '../src/services/liveShiftService.js';
import { DEFAULT_SHIFT_TYPES } from '../src/models/defaultData.js';

let values;
const start = new Date(2026, 9, 8, 23, 0).getTime();
const hour = 3600000;
beforeEach(() => {
  values = new Map([['tes_nomina_time_logs', '[]']]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
});
function finish() {
  let session = changeLiveShift(null, 'start', start);
  session = changeLiveShift(session, 'pause', start + 3 * hour);
  session = changeLiveShift(session, 'resume', start + 4 * hour);
  return changeLiveShift(session, 'finish', start + 8 * hour);
}
test('restaura un turno nocturno y calcula la pausa a partir de sus fechas', () => {
  const session = finish();
  assert.deepEqual(getLiveShift(), session);
  assert.deepEqual(liveDurations(session), { total: 8 * hour, pause: hour, active: 7 * hour });
  assert.equal(suggestShift(session, DEFAULT_SHIFT_TYPES), 'noche');
  assert.equal(suggestShift({ startedAt: new Date(2026, 9, 8, 11, 38).getTime() }, DEFAULT_SHIFT_TYPES), 'manana');
  assert.equal(suggestShift({ startedAt: new Date(2026, 9, 8, 6, 0).getTime() }, DEFAULT_SHIFT_TYPES), 'manana');
  const log = liveShiftLog(session, DEFAULT_SHIFT_TYPES.find(t => t.id === 'noche'), true, false, 'Prueba');
  assert.equal(log.fecha, '2026-10-08');
  assert.equal(log.horaEntradaReal, '23:00');
  assert.equal(log.horaSalidaReal, '07:00');
  assert.equal(log.horasTrabajadas, 8);
  assert.equal(log.horasDescansoNoPagadas, 1);
  assert.equal(liveShiftLog(session, DEFAULT_SHIFT_TYPES[0], false, false, '').horasDescansoNoPagadas, 0);
});
test('terminar estando en pausa cierra la pausa sin reanudar', () => {
  let session = changeLiveShift(null, 'start', start);
  session = changeLiveShift(session, 'pause', start + hour);
  session = changeLiveShift(session, 'finish', start + 2 * hour);
  assert.equal(liveDurations(session).pause, hour);
  assert.equal(session.pauses[0].end, session.endedAt);
});
test('impide un segundo inicio y cambios desde una ventana desactualizada', () => {
  const session = changeLiveShift(null, 'start', start);
  assert.throws(() => changeLiveShift(null, 'start', start + 1));
  changeLiveShift(session, 'pause', start + hour);
  assert.throws(() => changeLiveShift(session, 'finish', start + 2 * hour));
});
test('conserva un fichaje existente hasta confirmar y guarda su contenido al sustituirlo', () => {
  const old = { id: 'anterior', fecha: '2026-10-08', notas: 'Conservar' };
  values.set('tes_nomina_time_logs', JSON.stringify([old]));
  const session = finish();
  const log = liveShiftLog(session, DEFAULT_SHIFT_TYPES[0], true, false, '');
  assert.throws(() => saveLiveShift(session, log));
  assert.deepEqual(JSON.parse(values.get('tes_nomina_time_logs')), [old]);
  saveLiveShift(session, log, true);
  assert.equal(getLiveShift(), null);
  assert.deepEqual(JSON.parse(values.get('tes_nomina_time_logs'))[0].fichajeSustituido, old);
});
test('un fallo al guardar conserva el contador y permite reintentar sin duplicados', () => {
  const session = finish();
  const log = liveShiftLog(session, DEFAULT_SHIFT_TYPES[0], true, false, '');
  const setter = localStorage.setItem;
  const originalError = console.error;
  console.error = () => {};
  try {
    localStorage.setItem = (key, value) => { if (key === 'tes_nomina_time_logs') throw new Error('Lleno'); setter(key, value); };
    assert.throws(() => saveLiveShift(session, log));
    assert.deepEqual(getLiveShift(), session);
    assert.equal(JSON.parse(values.get('tes_nomina_time_logs')).length, 0);
    localStorage.setItem = (key, value) => { if (key === LIVE_SHIFT_KEY) throw new Error('Lleno'); setter(key, value); };
    assert.throws(() => saveLiveShift(session, log));
    assert.equal(JSON.parse(values.get('tes_nomina_time_logs')).length, 1);
    localStorage.setItem = setter;
    saveLiveShift(session, log);
    assert.equal(JSON.parse(values.get('tes_nomina_time_logs')).length, 1);
    assert.equal(getLiveShift(), null);
  } finally { console.error = originalError; }
});
