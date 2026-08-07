/**
 * shiftService.js - Servicio de gestión de turnos, fichajes diarios y periodos ATH.
 */

import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES, DEFAULT_PAYROLL_PERIODS } from '../models/defaultData.js';
import { isDateInPeriod } from '../utils/dateUtils.js';

/**
 * Inicializa el almacenamiento con datos por defecto si es la primera vez que se abre la app
 */
export function initializeDefaultData() {
  if (!getStorageItem(STORAGE_KEYS.CONFIG, null)) {
    setStorageItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  }
  if (!getStorageItem(STORAGE_KEYS.SHIFT_TYPES, null)) {
    setStorageItem(STORAGE_KEYS.SHIFT_TYPES, DEFAULT_SHIFT_TYPES);
  }
  if (!getStorageItem(STORAGE_KEYS.PERIODS, null)) {
    setStorageItem(STORAGE_KEYS.PERIODS, DEFAULT_PAYROLL_PERIODS);
  }
  if (!getStorageItem(STORAGE_KEYS.TIME_LOGS, null)) {
    setStorageItem(STORAGE_KEYS.TIME_LOGS, []);
  }
}

/**
 * Obtiene la configuración de precios y pluses
 */
export function getConfig() {
  initializeDefaultData();
  return getStorageItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
}

/**
 * Guarda una nueva configuración de precios
 */
export function saveConfig(newConfig) {
  return setStorageItem(STORAGE_KEYS.CONFIG, newConfig);
}

/**
 * Obtiene la lista de tipos de turnos (Mañana, Tarde, Noche, Guardia 24h, Bajas, etc.)
 * Fusiona automáticamente nuevos tipos añadidos al sistema si no existen aún en localStorage.
 */
export function getShiftTypes() {
  initializeDefaultData();
  const stored = getStorageItem(STORAGE_KEYS.SHIFT_TYPES, DEFAULT_SHIFT_TYPES);

  let needsUpdate = false;
  const merged = [...stored];

  DEFAULT_SHIFT_TYPES.forEach(defType => {
    if (!merged.some(st => st.id === defType.id)) {
      merged.push(defType);
      needsUpdate = true;
    }
  });

  if (needsUpdate) {
    setStorageItem(STORAGE_KEYS.SHIFT_TYPES, merged);
  }

  return merged;
}

/**
 * Obtiene la lista de periodos de cobro de ATH configurados
 */
export function getPayrollPeriods() {
  initializeDefaultData();
  return getStorageItem(STORAGE_KEYS.PERIODS, DEFAULT_PAYROLL_PERIODS);
}

/**
 * Encuentra el periodo de cobro correspondiente para una fecha dada (YYYY-MM-DD)
 */
export function getPeriodForDate(dateString) {
  const periods = getPayrollPeriods();
  return periods.find(p => isDateInPeriod(dateString, p.fechaInicio, p.fechaFin)) || null;
}

/**
 * Obtiene todos los fichajes guardados
 */
export function getAllTimeLogs() {
  initializeDefaultData();
  return getStorageItem(STORAGE_KEYS.TIME_LOGS, []);
}

/**
 * Guarda o actualiza un fichaje diario
 */
export function saveTimeLog(logData) {
  const logs = getAllTimeLogs();
  const existingIndex = logs.findIndex(l => l.fecha === logData.fecha);

  if (existingIndex >= 0) {
    logs[existingIndex] = { ...logs[existingIndex], ...logData, updatedAt: new Date().toISOString() };
  } else {
    logs.push({
      id: 'log_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...logData
    });
  }

  logs.sort((a, b) => b.fecha.localeCompare(a.fecha));
  setStorageItem(STORAGE_KEYS.TIME_LOGS, logs);
  return logs;
}

/**
 * Elimina un fichaje por fecha o id
 */
export function deleteTimeLog(logId) {
  const logs = getAllTimeLogs().filter(l => l.id !== logId && l.fecha !== logId);
  setStorageItem(STORAGE_KEYS.TIME_LOGS, logs);
  return logs;
}
