import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES } from '../src/models/defaultData.js';
import { calculatePayrollForPeriod } from '../src/services/payrollService.js';
import { getConfig, getAllTimeLogs, saveTimeLog } from '../src/services/shiftService.js';

const period = { fechaInicio: '2026-08-14', fechaFin: '2026-09-14' };
let values;

function seed(config = DEFAULT_CONFIG, logs = []) {
  values.set('tes_nomina_config', JSON.stringify(config));
  values.set('tes_nomina_shift_types', JSON.stringify(DEFAULT_SHIFT_TYPES));
  values.set('tes_nomina_time_logs', JSON.stringify(logs));
}

beforeEach(() => {
  values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  seed();
});

test('septiembre completo de vacaciones conserva los cuatro conceptos de la nómina', () => {
  const logs = Array.from({ length: 30 }, (_, index) => ({
    fecha: `2026-09-${String(index + 1).padStart(2, '0')}`,
    tipoTurnoId: 'vacaciones', esAusencia: true, horasTrabajadas: 0
  }));
  seed(DEFAULT_CONFIG, logs);
  const result = calculatePayrollForPeriod(period);
  assert.equal(result.diasLiquidables, 30);
  assert.equal(result.conceptosDiarios.salarioBase, 1253.26);
  assert.equal(result.conceptosDiarios.plusConvenio, 167.52);
  assert.equal(result.conceptosDiarios.prorrataPagas, 247.24);
  assert.equal(result.conceptosDiarios.antiguedad, 62.66);
  assert.equal(result.desgloseImportes.subtotalFijoMesNatural, 1730.68);
});

test('una jornada adicional paga 8,5 horas donde la ordinaria paga 0,5', () => {
  const log = { fecha: '2026-08-29', tipoTurnoId: 'manana', horasTrabajadas: 8.5 };
  seed(DEFAULT_CONFIG, [log]);
  assert.equal(calculatePayrollForPeriod(period).totalHorasJComplement, 0.5);
  seed(DEFAULT_CONFIG, [{ ...log, tipoTurnoId: 'jornada_adicional' }]);
  assert.equal(calculatePayrollForPeriod(period).totalHorasJComplement, 8.5);
});

test('el festivo adicional solo se paga como festivo y descuenta el descanso', () => {
  seed(DEFAULT_CONFIG, [{ fecha: '2026-08-29', tipoTurnoId: 'jornada_adicional',
    horasTrabajadas: 8.5, horasDescansoNoPagadas: 0.5, esFestivo: true }]);
  const result = calculatePayrollForPeriod(period);
  assert.equal(result.totalHorasJComplement, 0);
  assert.equal(result.totalHorasFestivasExtra, 8);
});

test('el total coincide con la suma de conceptos redondeados', () => {
  seed(DEFAULT_CONFIG, [
    { fecha: '2026-08-15', tipoTurnoId: 'festivo', horasTrabajadas: 8.5 },
    { fecha: '2026-08-22', tipoTurnoId: 'jornada_adicional', horasTrabajadas: 26.32 }
  ]);
  const result = calculatePayrollForPeriod(period);
  const amounts = result.desgloseImportes;
  const expectedCents = Math.round(amounts.subtotalFijoMesNatural * 100)
    + Math.round(amounts.jornadaComplementaria * 100)
    + Math.round(amounts.horasExtraordinarias * 100)
    + Math.round(amounts.nocturnidad * 100);
  assert.equal(Math.round(result.estimacionBrutoTotal * 100), expectedCents);
});

test('se conservan las tarifas de otros tramos y una antigüedad de cero', () => {
  seed({ ...DEFAULT_CONFIG, precioHoraOrdinaria: 12.47, precioHoraExtra: 21.82,
    precioHoraFestiva: 21.82, antiguedadMensual: 0 });
  const config = getConfig();
  assert.equal(config.precioHoraOrdinaria, 12.47);
  assert.equal(config.precioHoraExtra, 21.82);
  assert.equal(calculatePayrollForPeriod(period).conceptosDiarios.antiguedad, 0);
});

test('las tarifas a cero se respetan también en el cálculo', () => {
  seed({ ...DEFAULT_CONFIG, salarioBaseMensual: 0, plusConvenio: 0,
    prorrateoPagasExtra: 0, antiguedadMensual: 0, precioHoraOrdinaria: 0,
    precioHoraExtra: 0, plusNocturnidadHora: 0 }, [
    { fecha: '2026-08-15', tipoTurnoId: 'festivo', horasTrabajadas: 8.5 },
    { fecha: '2026-08-22', tipoTurnoId: 'jornada_adicional', horasTrabajadas: 8.5 }
  ]);
  assert.equal(calculatePayrollForPeriod(period).estimacionBrutoTotal, 0);
});

test('las copias diarias antiguas conservan sus precios personalizados', () => {
  seed({ precioSalarioBaseDia: 50, precioPlusConvenioDia: 0,
    precioProrrataPagaExtraDia: 10, fechaIngresoEmpresa: '2021-11-01' });
  const config = getConfig();
  assert.equal(config.salarioBaseMensual, 1500);
  assert.equal(config.plusConvenio, 0);
  assert.equal(config.prorrateoPagasExtra, 300);
  assert.equal(config.fechaIngresoEmpresa, '2020-11-11');
});

test('reclasificar un fichaje conserva su identidad, notas y el resto de jornadas', () => {
  seed(DEFAULT_CONFIG, [
    { id: 'dani', fecha: '2026-08-29', tipoTurnoId: 'manana', horasTrabajadas: 8.5,
      notas: 'Cambio guardia Dani', companeroIntercambio: 'Dani' },
    { id: 'otro', fecha: '2026-08-28', tipoTurnoId: 'manana', horasTrabajadas: 9 }
  ]);
  saveTimeLog({ fecha: '2026-08-29', tipoTurnoId: 'jornada_adicional' });
  const logs = getAllTimeLogs();
  assert.equal(logs.length, 2);
  const log = logs.find(item => item.id === 'dani');
  assert.equal(log.notas, 'Cambio guardia Dani');
  assert.equal(log.companeroIntercambio, 'Dani');
  assert.equal(log.horasTrabajadas, 8.5);
});
