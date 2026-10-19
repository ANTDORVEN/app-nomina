import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { currentIncidentDateTime, getIncidents, saveIncident, deleteIncident, searchIncidents, validateIncidentBackup, incidentText } from '../src/services/incidentService.js';

let values;
const sample = { fechaHora: '2026-10-19T09:30', matricula: ' 1234 abc ', numeroCoche: '042', motivo: 'Puerta lateral bloqueada.\nSe informa a coordinación.' };
beforeEach(() => {
  values = new Map([['tes_nomina_time_logs', '[{"id":"original"}]']]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
});

test('guarda, recupera y ordena incidencias sin modificar los fichajes', () => {
  saveIncident(sample);
  saveIncident({ ...sample, fechaHora: '2026-10-18T22:00' });
  saveIncident({ ...sample, fechaHora: '2026-10-19T11:00' });
  const restored = getIncidents();
  assert.deepEqual(restored.map(item => item.fechaHora), ['2026-10-19T11:00', '2026-10-19T09:30', '2026-10-18T22:00']);
  assert.equal(restored[0].matricula, '1234 ABC');
  assert.equal(restored[0].numeroCoche, '042');
  assert.equal(values.get('tes_nomina_time_logs'), '[{"id":"original"}]');
});

test('editar conserva identidad y creación; borrar afecta solo a esa incidencia', () => {
  const first = saveIncident(sample);
  const second = saveIncident(sample);
  saveIncident({ ...sample, motivo: 'Solucionado.' }, first.id);
  const edited = getIncidents().find(item => item.id === first.id);
  assert.equal(edited.createdAt, first.createdAt);
  assert.equal(edited.motivo, 'Solucionado.');
  assert.equal(getIncidents().length, 2);
  deleteIncident(first.id);
  assert.deepEqual(getIncidents().map(item => item.id), [second.id]);
  assert.throws(() => saveIncident(sample, first.id));
});

test('busca por matrícula con espacios o guiones y por fecha española o ISO', () => {
  saveIncident(sample);
  const all = getIncidents();
  for (const query of ['1234abc', '1234-ABC', '19/10/2026', '2026-10-19']) assert.equal(searchIncidents(all, query).length, 1);
  assert.equal(searchIncidents(all, '9999ZZZ').length, 0);
  assert.ok(incidentText(all[0]).includes(sample.motivo));
});

test('fecha local editable, campos obligatorios y validación de copias', () => {
  assert.equal(currentIncidentDateTime(new Date(2026, 9, 19, 9, 5)), '2026-10-19T09:05');
  assert.throws(() => saveIncident({ ...sample, motivo: '  ' }));
  assert.throws(() => saveIncident({ ...sample, fechaHora: '2026-02-30T10:00' }));
  assert.throws(() => validateIncidentBackup({}));
  const saved = saveIncident(sample);
  assert.deepEqual(validateIncidentBackup(JSON.parse(JSON.stringify(getIncidents()))), getIncidents());
  assert.throws(() => validateIncidentBackup([saved, saved]));
});

test('un fallo de escritura al guardar, editar o borrar conserva los datos previos', () => {
  const saved = saveIncident(sample);
  const stored = values.get('tes_nomina_incidents');
  const logError = console.error;
  console.error = () => {};
  localStorage.setItem = () => { throw new Error('Sin espacio'); };
  try {
    assert.throws(() => saveIncident(sample));
    assert.throws(() => saveIncident({ ...sample, motivo: 'Otro' }, saved.id));
    assert.throws(() => deleteIncident(saved.id));
    assert.equal(values.get('tes_nomina_incidents'), stored);
  } finally { console.error = logError; }
});
