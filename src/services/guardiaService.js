import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';

// Solo registros del generador; los fichajes y cambios manuales quedan intactos.
export function generatedGuardiasToRepair(logs) {
  return logs.filter(log => log.tipoTurnoId === 'guardia24' && log.esPatronAuto === true
    && !log.registroEnVivo && !log.registroReal && !log.horarioPersonalizado
    && (log.horaEntradaReal !== log.horaSalidaReal || log.horasTrabajadas !== 24));
}

export function repairGeneratedGuardias() {
  const logs = getStorageItem(STORAGE_KEYS.TIME_LOGS, []);
  const candidates = new Set(generatedGuardiasToRepair(logs));
  const updated = logs.map(log => candidates.has(log) ? {
    ...log, horaSalidaReal: log.horaEntradaReal, horasTrabajadas: 24, horasExtra: 0,
    guardiaGeneradaOriginal: log.guardiaGeneradaOriginal ?? { ...log },
    notas: (log.notas ?? '').replace(/Guardia 24h \(\d{2}:\d{2}-\d{2}:\d{2}\)/, `Guardia 24h (${log.horaEntradaReal}-${log.horaEntradaReal})`),
    updatedAt: new Date().toISOString()
  } : log);
  if (candidates.size && !setStorageItem(STORAGE_KEYS.TIME_LOGS, updated)) {
    throw new Error('No se han podido corregir las guardias. Los registros anteriores se conservan.');
  }
  return candidates.size;
}
