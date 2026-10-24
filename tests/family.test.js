import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getFamilyData, familyStep, saveFamilyShift, deleteFamilyShift, saveFamilyPattern, previewFamilyPattern, applyFamilyPattern, validateFamilyData } from '../src/services/familyService.js';

let values;
const options = { patternId: 'dia-noche-11', anchor: '2026-11-26', start: '2026-11-26', end: '2026-12-07' };
beforeEach(() => {
  values = new Map([['tes_nomina_time_logs', '[{"fecha":"2026-11-26","tipoTurnoId":"manana"}]']]);
  values.set('tes_nomina_family_calendar', JSON.stringify({ ownName: 'Antonio', partnerName: 'Ana', shifts: [], patterns: [{ id: 'dia-noche-11', name: 'Cadencia antigua conservada', steps: ['dia', 'noche', 'libre', 'libre', 'libre', 'dia', 'noche', 'libre', 'libre', 'libre', 'libre'].map(familyStep) }] }));
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
});

test('un calendario familiar nuevo empieza sin cadencias predefinidas ni fechas rellenadas', () => {
  values.delete('tes_nomina_family_calendar');
  const data = getFamilyData();
  assert.equal(data.shifts.length, 0);
  assert.deepEqual(data.patterns, []);
  assert.equal(values.has('tes_nomina_family_calendar'), false);
});

test('vista previa cruza de mes, cuenta los libres y reinicia el ciclo en el día 12', () => {
  const preview = previewFamilyPattern(options);
  assert.equal(preview.length, 12);
  assert.equal(preview[0].fecha, '2026-11-26');
  assert.equal(preview[1].tipo, 'noche');
  assert.equal(preview[1].salida, '08:00');
  assert.equal(preview[5].fecha, '2026-12-01');
  assert.equal(preview[5].tipo, 'dia');
  assert.equal(preview[11].tipo, 'dia');
  assert.equal(getFamilyData().shifts.length, 0);
});

test('rellenar mes a mes conserva la fase usando la fecha inicial del ciclo', () => {
  const both = previewFamilyPattern({ ...options, end: '2027-01-31' });
  const december = previewFamilyPattern({ ...options, start: '2026-12-01', end: '2026-12-31' });
  assert.deepEqual(december, both.filter(shift => shift.fecha >= '2026-12-01' && shift.fecha <= '2026-12-31'));
});

test('la generación conserva cambios manuales por defecto; sustituir requiere elección expresa', () => {
  saveFamilyShift({ ...familyStep('dia'), fecha: '2026-11-26', salida: '14:00', notas: 'Reducción' });
  const result = applyFamilyPattern(options);
  assert.equal(getFamilyData().patterns[0].anchor, options.anchor);
  assert.equal(result.added, 11);
  assert.equal(result.skipped, 1);
  assert.equal(getFamilyData().shifts[0].salida, '14:00');
  assert.equal(getFamilyData().shifts[0].notas, 'Reducción');
  applyFamilyPattern(options, true);
  assert.equal(getFamilyData().shifts[0].salida, '20:00');
});

test('editar un día y quitarlo no modifica ni el resto ni el cuadrante propio', () => {
  applyFamilyPattern(options);
  const before = getFamilyData().shifts.filter(shift => shift.fecha !== '2026-11-27');
  saveFamilyShift({ ...familyStep('libre'), fecha: '2026-11-27', notas: 'Cambio' });
  assert.deepEqual(getFamilyData().shifts.filter(shift => shift.fecha !== '2026-11-27'), before);
  deleteFamilyShift('2026-11-27');
  assert.deepEqual(getFamilyData().shifts, before);
  assert.equal(values.get('tes_nomina_time_logs'), '[{"fecha":"2026-11-26","tipoTurnoId":"manana"}]');
});

test('cadencias personalizadas admiten horarios reducidos y se recuperan en la copia', () => {
  const updated = saveFamilyPattern('Mi semana reducida', [{ ...familyStep('manana'), salida: '13:00' }, familyStep('libre')]);
  const custom = updated.patterns.at(-1);
  assert.equal(custom.steps[0].salida, '13:00');
  assert.equal(previewFamilyPattern({ ...options, patternId: custom.id })[0].salida, '13:00');
  assert.deepEqual(validateFamilyData(JSON.parse(JSON.stringify(getFamilyData()))), getFamilyData());
});

test('fechas, ciclos vacíos y horas inválidas no escriben datos', () => {
  assert.throws(() => previewFamilyPattern({ ...options, end: '2026-02-30' }));
  assert.throws(() => previewFamilyPattern({ ...options, start: '2026-12-10' }));
  assert.throws(() => saveFamilyPattern('Vacía', []));
  assert.throws(() => saveFamilyShift({ ...familyStep('dia'), fecha: '2026-11-26', entrada: '25:00' }));
  assert.equal(getFamilyData().shifts.length, 0);
});

test('la secuencia no pierde días cuando se cruza el cambio de hora', () => {
  const shifts = previewFamilyPattern({ ...options, anchor: '2026-10-23', start: '2026-10-23', end: '2026-10-28' });
  assert.deepEqual(shifts.map(shift => shift.fecha), ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
  assert.equal(shifts[5].tipo, 'dia');
});

test('fallo de guardado no borra los turnos familiares existentes', () => {
  applyFamilyPattern(options);
  const before = values.get('tes_nomina_family_calendar');
  const original = console.error;
  console.error = () => {};
  localStorage.setItem = () => { throw new Error('Lleno'); };
  try {
    assert.throws(() => saveFamilyShift({ ...familyStep('libre'), fecha: '2026-11-26' }));
    assert.throws(() => applyFamilyPattern(options, true));
    assert.throws(() => deleteFamilyShift('2026-11-26'));
    assert.equal(values.get('tes_nomina_family_calendar'), before);
  } finally { console.error = original; }
});
