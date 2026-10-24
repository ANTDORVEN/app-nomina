import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES, DEFAULT_PAYROLL_PERIODS } from '../src/models/defaultData.js';
import { getCustomPatterns, saveCustomPattern, updateCustomPattern, deleteCustomPattern, validateCustomPatterns, previewCustomPattern, applyCustomPattern } from '../src/services/customPatternService.js';
import { getAllTimeLogs } from '../src/services/shiftService.js';
import { generatedGuardiasToRepair } from '../src/services/guardiaService.js';
let values;
const steps=[{tipoTurnoId:'guardia24',entrada:'07:30',salida:'07:30',repeticiones:1,descansoMinutos:0},{tipoTurnoId:'libre',repeticiones:3}];
const options={steps,start:'2026-10-22',end:'2026-11-30'};
beforeEach(()=>{
 values=new Map([['tes_nomina_config',JSON.stringify(DEFAULT_CONFIG)],['tes_nomina_shift_types',JSON.stringify(DEFAULT_SHIFT_TYPES)],['tes_nomina_periods',JSON.stringify(DEFAULT_PAYROLL_PERIODS)],['tes_nomina_time_logs','[]']]);
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
});
test('el creador no trae cadencias propias por defecto y rechaza una secuencia vacía',()=>{
 assert.deepEqual(getCustomPatterns(),[]);assert.equal(values.has('tes_nomina_custom_patterns'),false);
 assert.throws(()=>previewCustomPattern({...options,steps:[]}));assert.equal(getAllTimeLogs().length,0);
});
test('24 horas y tres libres se repiten por fecha civil sin saltos al cambiar la hora',()=>{
 const preview=previewCustomPattern(options);
 assert.equal(preview.length,40);assert.equal(preview[0].horasTrabajadas,24);assert.equal(preview[0].horaEntradaReal,'07:30');assert.equal(preview[0].horaSalidaReal,'07:30');
 assert.deepEqual(preview.slice(0,5).map(x=>x.tipoTurnoId),['guardia24','libre','libre','libre','guardia24']);
 assert.equal(preview[4].fecha,'2026-10-26');assert.equal(preview.filter(x=>x.tipoTurnoId==='guardia24').length,10);assert.equal(getAllTimeLogs().length,0);
});
test('mañanas, noches y ausencias respetan horas, pausas y repeticiones elegidas',()=>{
 const sequence=[{tipoTurnoId:'manana',entrada:'06:45',salida:'15:15',repeticiones:2,descansoMinutos:30},{tipoTurnoId:'noche',entrada:'20:00',salida:'08:00',repeticiones:1,descansoMinutos:45},{tipoTurnoId:'vacaciones',repeticiones:2,descansoMinutos:30}];
 const preview=previewCustomPattern({...options,steps:sequence,end:'2026-10-26'});
 assert.equal(preview[0].horasTrabajadas,8.5);assert.equal(preview[0].horasDescansoNoPagadas,.5);assert.equal(preview[0].horasExtra,0);assert.equal(preview[2].horasTrabajadas,12);assert.equal(preview[2].horasDescansoNoPagadas,.75);assert.equal(preview[3].horasTrabajadas,0);assert.equal(preview[3].horasDescansoNoPagadas,0);
});
test('continuar en otro mes conserva la fase de la cadencia sin modificar fechas anteriores',()=>{
 const all=previewCustomPattern(options);const november=previewCustomPattern({...options,start:'2026-11-01',anchor:'2026-10-22'});
 assert.deepEqual(november,all.filter(item=>item.fecha>='2026-11-01'));
});
test('aplicar conserva días existentes por defecto y solo sustituye si se elige expresamente',()=>{
 const manual={id:'manual',fecha:'2026-10-22',tipoTurnoId:'manana',horasTrabajadas:9,notas:'Conservar'};values.set('tes_nomina_time_logs',JSON.stringify([manual]));values.set('tes_nomina_real_time_records','[{"id":"real"}]');
 const result=applyCustomPattern({...options,end:'2026-10-26'});assert.equal(result.added,4);assert.equal(result.skipped,1);assert.deepEqual(getAllTimeLogs().find(x=>x.fecha===manual.fecha),manual);
 assert.equal(applyCustomPattern({...options,end:'2026-10-26'},true).added,5);
 const changed=getAllTimeLogs().find(x=>x.fecha===manual.fecha);assert.equal(changed.id,manual.id);assert.deepEqual(changed.fichajeSustituido,manual);assert.equal(changed.horasTrabajadas,24);assert.equal(values.get('tes_nomina_real_time_records'),'[{"id":"real"}]');assert.deepEqual(generatedGuardiasToRepair(getAllTimeLogs()),[]);
});
test('las cadencias guardadas se recuperan y validan en las copias sin generar turnos',()=>{
 saveCustomPattern('Mi guardia',steps,'2026-10-22');const saved=getCustomPatterns();assert.equal(saved.length,1);assert.equal(saved[0].steps[1].repeticiones,3);assert.deepEqual(validateCustomPatterns(JSON.parse(JSON.stringify(saved))),saved);assert.equal(getAllTimeLogs().length,0);
 assert.throws(()=>validateCustomPatterns([...saved,...saved]));
});
test('fechas, horas y días inválidos no escriben el cuadrante',()=>{
 for(const invalid of [{...options,start:'2026-02-30'},{...options,end:'2026-10-01'},{...options,steps:[{...steps[0],entrada:''}]},{...options,steps:[{...steps[0],repeticiones:0}]},{...options,steps:[{...steps[0],repeticiones:1.5}]},{...options,steps:[{...steps[0],descansoMinutos:2000}]}]) assert.throws(()=>applyCustomPattern(invalid));
 assert.equal(getAllTimeLogs().length,0);
});
test('un fallo de escritura conserva cuadrante y cadencias previas',()=>{
 const old=values.get('tes_nomina_time_logs');const original=console.error;console.error=()=>{};localStorage.setItem=()=>{throw new Error('Sin espacio');};
 try {assert.throws(()=>applyCustomPattern(options));assert.equal(values.get('tes_nomina_time_logs'),old);assert.throws(()=>saveCustomPattern('Prueba',steps));assert.deepEqual(getCustomPatterns(),[]);}finally{console.error=original;}
});


test('categorías propias se guardan y editar una cadencia mantiene su identidad sin cambiar turnos aplicados',()=>{
 applyCustomPattern({...options,end:'2026-10-26'});const logs=values.get('tes_nomina_time_logs');
 const patterns=saveCustomPattern('Mi ciclo',steps,'2026-10-22','Guardias de mi base');const id=patterns[0].id;
 const changed=updateCustomPattern(id,{name:'Mi ciclo revisado',category:'Turnos especiales',steps:[{...steps[0],entrada:'08:00',salida:'08:00'},steps[1]],anchor:'2026-10-22'});
 assert.equal(changed.length,1);assert.equal(changed[0].id,id);assert.equal(changed[0].category,'Turnos especiales');assert.equal(changed[0].steps[0].entrada,'08:00');assert.equal(values.get('tes_nomina_time_logs'),logs);
 assert.deepEqual(validateCustomPatterns(JSON.parse(JSON.stringify(changed))),changed);
});
test('eliminar una cadencia conserva el calendario y las otras categorías',()=>{
 applyCustomPattern({...options,end:'2026-10-26'});const logs=values.get('tes_nomina_time_logs');saveCustomPattern('Primera',steps,undefined,'Una');const all=saveCustomPattern('Segunda',steps,undefined,'Otra');
 const remaining=deleteCustomPattern(all[0].id);assert.equal(remaining.length,1);assert.deepEqual(remaining[0],all[1]);assert.equal(values.get('tes_nomina_time_logs'),logs);
});
test('editar rechaza nombres vacíos, categorías inválidas y cadencias inexistentes sin modificar datos',()=>{
 const id=saveCustomPattern('Mi ciclo',steps)[0].id;const before=values.get('tes_nomina_custom_patterns');
 assert.throws(()=>updateCustomPattern(id,{name:' ',steps}));assert.throws(()=>updateCustomPattern('no-existe',{name:'Otra',steps}));assert.throws(()=>validateCustomPatterns([{id:'bad',name:'Ciclo',steps,category:{}}]));assert.equal(values.get('tes_nomina_custom_patterns'),before);
});
test('un fallo al editar o eliminar conserva la cadencia anterior',()=>{
 const id=saveCustomPattern('Mi ciclo',steps)[0].id;const before=values.get('tes_nomina_custom_patterns');const original=console.error;console.error=()=>{};localStorage.setItem=()=>{throw new Error('Sin espacio');};
 try {assert.throws(()=>updateCustomPattern(id,{name:'Cambio',category:'Grupo',steps}));assert.throws(()=>deleteCustomPattern(id));assert.equal(values.get('tes_nomina_custom_patterns'),before);}finally{console.error=original;}
});
