import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES } from '../src/models/defaultData.js';
import { getAllTimeLogs } from '../src/services/shiftService.js';
import { calculatePayrollForPeriod } from '../src/services/payrollService.js';
import { saveRealTimeRecord, getRealTimeRecords, deleteRealTimeRecord, scheduledWorkForDate, validateRealTimeBackup } from '../src/services/realTimeService.js';

let values;
const period = { fechaInicio: '2026-08-14', fechaFin: '2026-09-14' };
const record = { fecha: '2026-08-29', horaEntradaReal: '08:00', horaSalidaReal: '16:00', tipoTurnoId: 'jornada_adicional', contarEnNomina: true, horasDescansoNoPagadas: 0 };
beforeEach(() => {
  values = new Map([
    ['tes_nomina_config', JSON.stringify(DEFAULT_CONFIG)],
    ['tes_nomina_shift_types', JSON.stringify(DEFAULT_SHIFT_TYPES)],
    ['tes_nomina_time_logs', '[]']
  ]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
});
const payroll = () => calculatePayrollForPeriod(period);

test('día libre: Sí añade la jornada completa con el cálculo y tarifas existentes', () => {
  assert.equal(scheduledWorkForDate(record.fecha), null);
  saveRealTimeRecord(record);
  assert.equal(payroll().totalHorasJComplement, 8);
  assert.equal(payroll().desgloseImportes.jornadaComplementaria, 98.88);
  assert.equal(payroll().logs[0].anadidoManualmente, true);
  assert.equal(getAllTimeLogs().length, 0);
});

test('registro informativo conserva la nómina del cuadrante, incluso con pausas distintas', () => {
  const scheduled = { id: 'cuadrante', fecha: record.fecha, tipoTurnoId: 'manana', horasTrabajadas: 9 };
  values.set('tes_nomina_time_logs', JSON.stringify([scheduled]));
  const before = payroll();
  assert.equal(scheduledWorkForDate(record.fecha).id, 'cuadrante');
  saveRealTimeRecord({ ...record, contarEnNomina: false, horaSalidaReal: '20:00', horasDescansoNoPagadas: 1 });
  assert.equal(payroll().estimacionBrutoTotal, before.estimacionBrutoTotal);
  assert.deepEqual(getAllTimeLogs(), [scheduled]);
});

test('Sí con cuadrante sustituye las horas para calcular sin sumar dos jornadas', () => {
  const scheduled = { id: 'cuadrante', fecha: record.fecha, tipoTurnoId: 'manana', horasTrabajadas: 9 };
  values.set('tes_nomina_time_logs', JSON.stringify([scheduled]));
  saveRealTimeRecord({ ...record, tipoTurnoId: 'manana', horaSalidaReal: '18:00' });
  assert.equal(payroll().totalHorasJComplement, 2);
  assert.equal(payroll().totalHorasTrabajadas, 10);
  assert.equal(payroll().logs.length, 1);
  assert.deepEqual(getAllTimeLogs(), [scheduled]);
});

test('Sí a No y borrado devuelven el cálculo al cuadrante original', () => {
  const scheduled = { id: 'cuadrante', fecha: record.fecha, tipoTurnoId: 'manana', horasTrabajadas: 9 };
  values.set('tes_nomina_time_logs', JSON.stringify([scheduled]));
  saveRealTimeRecord(record);
  assert.equal(payroll().totalHorasJComplement, 8);
  saveRealTimeRecord({ ...record, contarEnNomina: false });
  assert.equal(payroll().totalHorasJComplement, 1);
  saveRealTimeRecord(record);
  assert.equal(getRealTimeRecords().length, 1);
  deleteRealTimeRecord(record.fecha);
  assert.equal(payroll().totalHorasJComplement, 1);
  assert.deepEqual(getAllTimeLogs(), [scheduled]);
});

test('No a Sí y borrado en un día libre añaden y retiran el importe', () => {
  const before = payroll().estimacionBrutoTotal;
  saveRealTimeRecord({ ...record, contarEnNomina: false });
  assert.equal(payroll().estimacionBrutoTotal, before);
  saveRealTimeRecord(record);
  assert.equal(payroll().estimacionBrutoTotal, Math.round((before + 98.88) * 100) / 100);
  deleteRealTimeRecord(record.fecha);
  assert.equal(payroll().estimacionBrutoTotal, before);
});

test('medianoche 20:00 a 08:00 son 12 horas y se descuenta la pausa una sola vez', () => {
  saveRealTimeRecord({ ...record, horaEntradaReal: '20:00', horaSalidaReal: '08:00', horasDescansoNoPagadas: 1 });
  assert.equal(getRealTimeRecords()[0].horasTrabajadas, 12);
  assert.equal(payroll().totalHorasTrabajadas, 11);
  assert.equal(payroll().totalHorasJComplement, 11);
  assert.equal(payroll().totalHorasDescansoDescontadas, 1);
});

test('libre no se considera cuadrante trabajado; los festivos no se duplican como complemento', () => {
  values.set('tes_nomina_time_logs', JSON.stringify([{ fecha: record.fecha, tipoTurnoId: 'libre', horasTrabajadas: 0 }]));
  assert.equal(scheduledWorkForDate(record.fecha), null);
  saveRealTimeRecord({ ...record, esFestivo: true });
  assert.equal(payroll().totalHorasJComplement, 0);
  assert.equal(payroll().totalHorasFestivasExtra, 8);
});

test('validación, identidad por día y copia de seguridad de horas reales', () => {
  const first = saveRealTimeRecord(record);
  const second = saveRealTimeRecord({ ...record, horaSalidaReal: '17:00' });
  assert.equal(first.id, second.id);
  assert.equal(first.createdAt, second.createdAt);
  assert.equal(getRealTimeRecords().length, 1);
  assert.deepEqual(validateRealTimeBackup(JSON.parse(JSON.stringify(getRealTimeRecords()))), getRealTimeRecords());
  assert.throws(() => validateRealTimeBackup([first, second]));
  assert.throws(() => saveRealTimeRecord({ ...record, fecha: '2026-02-30' }));
  assert.throws(() => saveRealTimeRecord({ ...record, horaEntradaReal: '25:00' }));
  assert.throws(() => saveRealTimeRecord({ ...record, horasDescansoNoPagadas: 9 }));
});

test('fallos de escritura conservan la decisión anterior y la nómina', () => {
  saveRealTimeRecord(record);
  const before = payroll().estimacionBrutoTotal;
  const originalError = console.error;
  console.error = () => {};
  localStorage.setItem = () => { throw new Error('Sin espacio'); };
  try {
    assert.throws(() => saveRealTimeRecord({ ...record, contarEnNomina: false }));
    assert.throws(() => deleteRealTimeRecord(record.fecha));
    assert.equal(payroll().estimacionBrutoTotal, before);
    assert.equal(getRealTimeRecords()[0].contarEnNomina, true);
  } finally { console.error = originalError; }
});

test('el contador conserva los segundos aunque entrada y salida estén en el mismo minuto', () => {
  const start = new Date(2026, 7, 29, 8, 0, 0).getTime();
  saveRealTimeRecord({ ...record, horaSalidaReal: '08:00', registroEnVivo: { startedAt: start, endedAt: start + 30000, pauses: [] } });
  assert.equal(getRealTimeRecords()[0].horasTrabajadas, 1 / 120);
});
