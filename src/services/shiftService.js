/**
 * shiftService.js - Servicio de gestión de turnos, fichajes diarios y periodos ATH.
 * 
 * Este servicio contiene la lógica de negocio para crear, leer, actualizar y eliminar (CRUD)
 * los registros de trabajo de un TES y sus tipos de turno.
 */

import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { DEFAULT_CONFIG, DEFAULT_SHIFT_TYPES, DEFAULT_PAYROLL_PERIODS } from '../models/defaultData.js';
import { isDateInPeriod, formatDateToISO } from '../utils/dateUtils.js';

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
 * Obtiene la lista de tipos de turnos (Mañana, Tarde, Noche, Guardia 24h, etc.)
 */
export function getShiftTypes() {
  initializeDefaultData();
  return getStorageItem(STORAGE_KEYS.SHIFT_TYPES, DEFAULT_SHIFT_TYPES);
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
 * @param {string} dateString 
 * @returns {object|null} El objeto periodo ATH o null si no se encuentra
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
 * @param {object} logData 
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

  // Ordenar por fecha descendente
  logs.sort((a, b) => b.fecha.localeCompare(a.fecha));

  setStorageItem(STORAGE_KEYS.TIME_LOGS, logs);
  return logs;
}

/**
 * Elimina un fichaje por fecha o id
 * @param {string} logId 
 */
export function deleteTimeLog(logId) {
  const logs = getAllTimeLogs().filter(l => l.id !== logId && l.fecha !== logId);
  setStorageItem(STORAGE_KEYS.TIME_LOGS, logs);
  return logs;
}
