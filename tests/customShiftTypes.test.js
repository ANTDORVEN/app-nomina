import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES } from '../src/models/defaultData.js';
import { getCustomShiftTypes, saveCustomShiftType, validateCustomShiftTypes, getSelectableShiftTypes, getDisplayShiftType, shiftSelectionFields } from '../src/services/customShiftService.js';
import { previewCustomPattern, saveCustomPattern, getCustomPatterns, validateCustomPatterns } from '../src/services/customPatternService.js';
import { validateRealTimeRecord, saveRealTimeRecord, deleteRealTimeRecord } from '../src/services/realTimeService.js';
import { liveShiftLog } from '../src/services/liveShiftService.js';
import { calculatePayrollForPeriod } from '../src/services/payrollService.js';
import { getFamilyData, saveFamilyName, validateFamilyData, saveFamilyShift, familyStep } from '../src/services/familyService.js';
let values;
const definition = (tipoBase = 'manana') => ({ nombre: '🚑 Ruta especial', nombreCorto: '🚑', tipoBase, color: '#38bdf8', horaInicio: '07:00', horaFin: '19:00', horasDescansoNoPagadas: 1 });
const period = { fechaInicio: '2026-08-14', fechaFin: '2026-09-14' };
beforeEach(() => {
 values = new Map([['tes_nomina_config', JSON.stringify(DEFAULT_CONFIG)], ['tes_nomina_shift_types', JSON.stringify(DEFAULT_SHIFT_TYPES)], ['tes_nomina_time_logs', '[]']]);
 globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
});
test('turnos personales vacíos al empezar; nombre y emoji se guardan sin alterar turnos base', () => {
 assert.deepEqual(getCustomShiftTypes(), []);
 const item = saveCustomShiftType(definition())[0];
 assert.equal(item.horasTeoricas, 12); assert.equal(getCustomShiftTypes()[0].nombre, '🚑 Ruta especial');
 assert.equal(getSelectableShiftTypes().find(type => type.id === item.id).tipoBase, 'manana');
 assert.deepEqual(JSON.parse(values.get('tes_nomina_shift_types')), DEFAULT_SHIFT_TYPES);
 const snapshot = values.get('tes_nomina_custom_shift_types');
 assert.throws(() => saveCustomShiftType({ ...item, tipoBase: 'noche' }, item.id));
 assert.equal(values.get('tes_nomina_custom_shift_types'), snapshot);
});
test('renombrar y cambiar el horario habitual conserva la identidad y las jornadas anteriores', () => {
 const item = saveCustomShiftType(definition())[0];
 const log = { fecha: '2026-08-20', ...shiftSelectionFields(item.id), horasTrabajadas: 12, horasDescansoNoPagadas: 1 };
 values.set('tes_nomina_time_logs', JSON.stringify([log]));
 const before = calculatePayrollForPeriod(period);
 saveCustomShiftType({ ...item, nombre: '🏥 Otra ruta', horaFin: '15:00', color: '#f97316' }, item.id);
 assert.equal(getCustomShiftTypes()[0].id, item.id); assert.equal(getDisplayShiftType(log).nombre, '🏥 Otra ruta');
 assert.equal(JSON.parse(values.get('tes_nomina_time_logs'))[0].horasTrabajadas, 12);
 assert.deepEqual(calculatePayrollForPeriod(period).desgloseImportes, before.desgloseImportes);
});
test('ciclo con guardia personal genera 24 horas y descansos conservando la regla base', () => {
 const item = saveCustomShiftType({ ...definition('guardia24'), horaInicio: '08:00', horaFin: '08:00', horasDescansoNoPagadas: 0 })[0];
 const steps = [{ tipoTurnoId: item.id, entrada: '08:00', salida: '08:00', repeticiones: 1 }, { tipoTurnoId: 'libre', repeticiones: 3 }];
 const preview = previewCustomPattern({ steps, start: '2026-08-20', end: '2026-08-24' });
 assert.equal(preview[0].tipoTurnoId, 'guardia24'); assert.equal(preview[0].tipoTurnoPersonalizadoId, item.id);
 assert.equal(preview[0].horasTrabajadas, 24); assert.equal(preview[0].horasExtra, 0); assert.equal(preview[4].horasTrabajadas, 24);
 saveCustomPattern('🚑 Mi ciclo', steps, undefined, 'Mi base');
 assert.deepEqual(validateCustomPatterns(getCustomPatterns(), getSelectableShiftTypes(validateCustomShiftTypes(getCustomShiftTypes()))), getCustomPatterns());
});
test('turnos personales aplican exactamente el mismo cálculo que su regla base, sin duplicar festivos', () => {
 for (const base of ['manana', 'jornada_adicional', 'noche', 'guardia24', 'festivo']) {
  const item = saveCustomShiftType(definition(base)).at(-1);
  const custom = previewCustomPattern({ steps: [{ tipoTurnoId: item.id, entrada: '07:00', salida: '19:00', repeticiones: 1, descansoMinutos: 60 }], start: '2026-08-20', end: '2026-08-20' })[0];
  values.set('tes_nomina_time_logs', JSON.stringify([custom])); const actual = calculatePayrollForPeriod(period);
  const plain = { ...custom }; delete plain.tipoTurnoPersonalizadoId;
  values.set('tes_nomina_time_logs', JSON.stringify([plain])); const expected = calculatePayrollForPeriod(period);
  assert.deepEqual(actual.desgloseImportes, expected.desgloseImportes);
  assert.equal(actual.totalHorasJComplement, expected.totalHorasJComplement);
 }
});
test('contador y horas reales normalizan el tipo personal; cambiar Sí/No conserva un solo día', () => {
 const item = saveCustomShiftType({ ...definition('guardia24'), horaInicio: '08:00', horaFin: '08:00' })[0];
 const type = getSelectableShiftTypes().find(type => type.id === item.id);
 const session = { id: 'test', startedAt: new Date(2026,7,20,8).getTime(), endedAt: new Date(2026,7,21,8).getTime(), pauses: [] };
 const live = liveShiftLog(session, type, true, false, '');
 assert.equal(live.tipoTurnoId, 'guardia24'); assert.equal(live.tipoTurnoPersonalizadoId, item.id); assert.equal(live.horasExtra, 0);
 const record = saveRealTimeRecord({ ...live, tipoTurnoId: item.id, contarEnNomina: true });
 assert.equal(record.horasTrabajadas, 24); assert.equal(record.tipoTurnoId, 'guardia24');
 assert.equal(calculatePayrollForPeriod(period).logs.length, 1);
 saveRealTimeRecord({ ...record, contarEnNomina: false }); assert.equal(calculatePayrollForPeriod(period).logs.length, 0);
 deleteRealTimeRecord(record.fecha); assert.equal(calculatePayrollForPeriod(period).logs.length, 0);
 const plain = validateRealTimeRecord({ ...record, tipoTurnoPersonalizadoId: undefined, tipoTurnoId: 'manana' });
 assert.equal(plain.tipoTurnoPersonalizadoId, undefined);
});
test('datos inválidos y fallo de guardado no sobrescriben los tipos personales', () => {
 const item = saveCustomShiftType(definition())[0]; const snapshot = values.get('tes_nomina_custom_shift_types');
 for (const changes of [{ nombre: '' }, { tipoBase: 'inexistente' }, { horaInicio: '' }, { horasDescansoNoPagadas: 20 }, { color: 'red' }]) assert.throws(() => saveCustomShiftType({ ...definition(), ...changes }));
 assert.throws(() => validateCustomShiftTypes([item, item])); assert.throws(() => validateCustomShiftTypes([null]));
 globalThis.localStorage.setItem = () => { throw new Error('sin espacio'); };
 const previous = console.error; console.error = () => {}; try { assert.throws(() => saveCustomShiftType(definition())); } finally { console.error = previous; }
 assert.equal(values.get('tes_nomina_custom_shift_types'), snapshot);
});
test('iconos familiares admiten emojis y copias antiguas; guardar conserva turnos y cadencias', () => {
 const old = { ownName: 'Antonio', partnerName: 'Ana', shifts: [], patterns: [] };
 assert.equal(validateFamilyData(old).ownIcon, '🚑'); assert.equal(validateFamilyData(old).partnerIcon, '🏥');
 saveFamilyShift({ ...familyStep('dia'), fecha: '2026-11-26', notas: 'Reducción' });
 const before = getFamilyData(); saveFamilyName('Ana 🏥', 'Antonio 🚑', '🚒', '👩‍⚕️'); const data = getFamilyData();
 assert.equal(data.partnerIcon, '👩‍⚕️'); assert.equal(data.ownIcon, '🚒'); assert.equal(data.partnerName, 'Ana 🏥');
 assert.deepEqual(data.shifts, before.shifts); assert.deepEqual(data.patterns, before.patterns);
 assert.deepEqual(validateFamilyData(JSON.parse(JSON.stringify(data))), data);
 saveFamilyName('Ana', 'Antonio', '', ''); assert.equal(getFamilyData().ownIcon, '');
 assert.throws(() => validateFamilyData({ ...data, ownIcon: 123 }));
});
