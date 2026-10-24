import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES, DEFAULT_PAYROLL_PERIODS } from '../src/models/defaultData.js';
import { generateGuardias24hPattern } from '../src/services/patternService.js';
import { generatedGuardiasToRepair, repairGeneratedGuardias } from '../src/services/guardiaService.js';
import { getAllTimeLogs } from '../src/services/shiftService.js';
import { calculatePayrollForPeriod } from '../src/services/payrollService.js';
import { saveRealTimeRecord, getRealTimeRecords, validateRealTimeBackup } from '../src/services/realTimeService.js';
import { liveShiftLog, changeLiveShift } from '../src/services/liveShiftService.js';
import { recordEndDate, recordDuration, recordNextDayLabel } from '../src/utils/recordTimeUtils.js';

let values;
const guardia = DEFAULT_SHIFT_TYPES.find(type => type.id === 'guardia24');
const period = { fechaInicio: '2026-10-17', fechaFin: '2026-11-19' };
const auto = { id: 'old-guardia', fecha: '2026-10-22', tipoTurnoId: 'guardia24', horaEntradaReal: '08:00', horaSalidaReal: '16:00', horasTrabajadas: 8, esPatronAuto: true, notas: 'Guardia 24h (08:00-16:00) (Patrón Rotativo)' };
beforeEach(() => {
 values = new Map([['tes_nomina_config',JSON.stringify(DEFAULT_CONFIG)],['tes_nomina_shift_types',JSON.stringify(DEFAULT_SHIFT_TYPES)],['tes_nomina_periods',JSON.stringify(DEFAULT_PAYROLL_PERIODS)],['tes_nomina_time_logs','[]']]);
 globalThis.localStorage = { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value) };
});
const sessionFor = minute => ({id:'live-real',startedAt:new Date(2026,9,22,7,53).getTime(),endedAt:new Date(2026,9,23,8,minute).getTime(),pauses:[]});
const realFor = minute => ({...liveShiftLog(sessionFor(minute),guardia,true,false,'Real'),contarEnNomina:false});

test('generar guardias desde cero siempre guarda 08–08, 24 h y tres libres sin mover la cadencia',()=>{
 generateGuardias24hPattern('2026-10-22',null,'2026-11-19');
 const logs=getAllTimeLogs();assert.equal(logs.length,29);
 const guards=logs.filter(log=>log.tipoTurnoId==='guardia24');assert.equal(guards.length,8);
 for(const log of guards) {assert.equal(log.horaEntradaReal,'08:00');assert.equal(log.horaSalidaReal,'08:00');assert.equal(log.horasTrabajadas,24);assert.equal(log.horasExtra,0);}
 assert.equal(logs.find(log=>log.fecha==='2026-10-23').tipoTurnoId,'libre');
 assert.equal(logs.find(log=>log.fecha==='2026-10-26').tipoTurnoId,'guardia24');
});
test('los horarios personalizados se conservan, calculan su duración y no se ofrecen como errores antiguos',()=>{
 generateGuardias24hPattern('2026-10-22',null,'2026-10-22','07:30','07:30');
 let log=getAllTimeLogs()[0];assert.equal(log.horaEntradaReal,'07:30');assert.equal(log.horaSalidaReal,'07:30');assert.equal(log.horasTrabajadas,24);
 assert.equal(generatedGuardiasToRepair([log]).length,0);
 generateGuardias24hPattern('2026-10-26',null,'2026-10-26','08:00','16:00');
 log=getAllTimeLogs().find(item=>item.fecha==='2026-10-26');assert.equal(log.horasTrabajadas,8);assert.equal(log.horaSalidaReal,'16:00');assert.equal(generatedGuardiasToRepair([log]).length,0);
 const before=values.get('tes_nomina_time_logs');assert.throws(()=>generateGuardias24hPattern('2026-10-30',null,'2026-10-30','25:00','08:00'));assert.equal(values.get('tes_nomina_time_logs'),before);
});
test('corrección selectiva conserva IDs, copias originales, libres, manuales y fichajes reales',()=>{
 const manual={...auto,id:'manual',fecha:'2026-10-10',horaEntradaReal:'07:30',horaSalidaReal:'07:30',horasTrabajadas:24,esPatronAuto:false};
 const free={id:'free',fecha:'2026-10-23',tipoTurnoId:'libre',horasTrabajadas:0};
 const good={...auto,id:'good',fecha:'2026-10-26',horaSalidaReal:'08:00',horasTrabajadas:24};
 const records=[auto,manual,free,good];values.set('tes_nomina_time_logs',JSON.stringify(records));
 const saved=saveRealTimeRecord(realFor(3));
 assert.equal(generatedGuardiasToRepair(records).length,1);assert.deepEqual(getAllTimeLogs(),records);
 assert.equal(repairGeneratedGuardias(),1);
 const result=getAllTimeLogs();assert.equal(result[0].horasTrabajadas,24);assert.deepEqual(result[0].guardiaGeneradaOriginal,auto);assert.equal(result[0].id,auto.id);assert.match(result[0].notas,/08:00-08:00/);
 assert.deepEqual(result.slice(1),records.slice(1));assert.deepEqual(getRealTimeRecords(),[saved]);assert.equal(repairGeneratedGuardias(),0);
});
test('un fallo de almacenamiento durante la corrección deja los datos anteriores intactos',()=>{
 values.set('tes_nomina_time_logs',JSON.stringify([auto]));const before=values.get('tes_nomina_time_logs');const error=console.error;console.error=()=>{};
 localStorage.setItem=()=>{throw new Error('Sin espacio');};
 try {assert.throws(()=>repairGeneratedGuardias());assert.equal(values.get('tes_nomina_time_logs'),before);}finally{console.error=error;}
});
test('22 oct 07:53 a 23 oct 08:03 son 24 h 10; No conserva cuadrante y Sí sustituye una sola jornada',()=>{
 values.set('tes_nomina_time_logs',JSON.stringify([{...auto,horaSalidaReal:'08:00',horasTrabajadas:24}]));
 const saved=saveRealTimeRecord(realFor(3));assert.equal(saved.fechaSalidaReal,'2026-10-23');assert.equal(saved.horasTrabajadas,24+10/60);
 assert.match(recordNextDayLabel(saved),/23\/10\/2026/);
 let payroll=calculatePayrollForPeriod(period);assert.equal(payroll.totalHorasTrabajadas,24);
 saveRealTimeRecord({...saved,contarEnNomina:true});payroll=calculatePayrollForPeriod(period);
 assert.equal(payroll.logs.length,1);assert.equal(payroll.totalHorasTrabajadas,saved.horasTrabajadas);assert.equal(payroll.totalHorasJComplement,0);assert.equal(payroll.computoGuardiasPendiente,true);
 saveRealTimeRecord({...saved,contarEnNomina:false});assert.equal(calculatePayrollForPeriod(period).totalHorasTrabajadas,24);
});
test('corregir la salida a 08:05 mantiene el día siguiente y da 24 h 12, conservando la evidencia original',()=>{
 const saved=saveRealTimeRecord(realFor(3));
 const changed=saveRealTimeRecord({...saved,horaSalidaReal:'08:05',registroEnVivoOriginal:saved.registroEnVivo,registroEnVivo:undefined});
 assert.equal(changed.horasTrabajadas,24+12/60);assert.equal(recordDuration(changed),changed.horasTrabajadas);assert.equal(changed.fechaSalidaReal,'2026-10-23');assert.equal(changed.id,saved.id);assert.equal(getRealTimeRecords().length,1);
 assert.deepEqual(changed.registroEnVivoOriginal,saved.registroEnVivo);assert.deepEqual(validateRealTimeBackup([JSON.parse(JSON.stringify(changed))]),[JSON.parse(JSON.stringify(changed))]);
});
test('copias antiguas del contador deducen la fecha de salida sin reducir 24 h a minutos',()=>{
 const legacy=realFor(3);delete legacy.fechaSalidaReal;
 assert.equal(recordEndDate(legacy),'2026-10-23');assert.equal(saveRealTimeRecord(legacy).horasTrabajadas,24+10/60);
 assert.equal(recordDuration({fecha:'2026-10-22',horaEntradaReal:'08:00',horaSalidaReal:'08:00',tipoTurnoId:'guardia24'}),24);
 assert.throws(()=>saveRealTimeRecord({...legacy,fechaSalidaReal:'2026-10-22'}));
 assert.throws(()=>saveRealTimeRecord({...legacy,registroEnVivo:undefined,fechaSalidaReal:'2026-02-30'}));
});
test('el contador completo conserva el inicio del día anterior, las pausas y la salida al terminar',()=>{
 const start=new Date(2026,9,22,7,53).getTime();
 let session=changeLiveShift(null,'start',start);
 session=changeLiveShift(session,'pause',new Date(2026,9,22,13,0).getTime());
 session=changeLiveShift(session,'resume',new Date(2026,9,22,13,30).getTime());
 session=changeLiveShift(session,'finish',new Date(2026,9,23,8,5).getTime());
 const saved=saveRealTimeRecord({...liveShiftLog(session,guardia,true,false,''),contarEnNomina:true});
 assert.equal(saved.fecha,'2026-10-22');assert.equal(saved.fechaSalidaReal,'2026-10-23');assert.equal(saved.horasTrabajadas,24.2);assert.equal(saved.horasDescansoNoPagadas,.5);
 const summary=calculatePayrollForPeriod(period);assert.equal(summary.totalHorasTrabajadas,23.7);assert.equal(summary.totalHorasJComplement,0);assert.equal(summary.logs.length,1);
});
