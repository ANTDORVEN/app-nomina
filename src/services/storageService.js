/**
 * storageService.js - Servicio de abstracción del almacenamiento local (localStorage).
 * 
 * Conceptos DAW:
 * - Patrón Capa de Servicios: Aísla la persistencia de la interfaz de usuario (UI).
 * - Manejo defensivo de errores con try/catch en caso de privacidad de navegador o cuotas de almacenamiento.
 * - JSON Serialization / Deserialization.
 */

const STORAGE_KEYS = {
  CONFIG: 'tes_nomina_config',
  SHIFT_TYPES: 'tes_nomina_shift_types',
  PERIODS: 'tes_nomina_periods',
  TIME_LOGS: 'tes_nomina_time_logs',
  INCIDENTS: 'tes_nomina_incidents',
  REAL_TIME_RECORDS: 'tes_nomina_real_time_records',
  FAMILY_CALENDAR: 'tes_nomina_family_calendar',
  CUSTOM_PATTERNS: 'tes_nomina_custom_patterns',
  CUSTOM_SHIFT_TYPES: 'tes_nomina_custom_shift_types'
};

/**
 * Lee un elemento del almacenamiento local
 * @param {string} key - Clave del elemento
 * @param {any} defaultValue - Valor a retornar si no existe la clave
 */
export function getStorageItem(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error leyendo de localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Guarda un elemento en el almacenamiento local
 * @param {string} key - Clave del elemento
 * @param {any} value - Objeto o valor a guardar
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error escribiendo en localStorage (${key}):`, error);
    return false;
  }
}

export { STORAGE_KEYS };
