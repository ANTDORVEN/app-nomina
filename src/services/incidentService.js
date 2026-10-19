import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageService.js';
import { formatDateToISO } from '../utils/dateUtils.js';

export function currentIncidentDateTime(date = new Date()) {
  return `${formatDateToISO(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function incidentFields(data) {
  if (!data || typeof data !== 'object') throw new Error('Revisa los datos de la incidencia.');
  const { fechaHora, matricula, numeroCoche, motivo } = data;
  if (typeof fechaHora !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fechaHora)
    || !Number.isFinite(new Date(fechaHora).getTime()) || currentIncidentDateTime(new Date(fechaHora)) !== fechaHora) {
    throw new Error('Introduce una fecha y hora válidas.');
  }
  if ([matricula, numeroCoche, motivo].some(value => typeof value !== 'string' || !value.trim())) {
    throw new Error('Completa la matrícula, el número de coche y el motivo.');
  }
  return { fechaHora, matricula: matricula.trim().toUpperCase(), numeroCoche: numeroCoche.trim(), motivo: motivo.trim() };
}

export function validateIncidentBackup(incidents) {
  if (!Array.isArray(incidents)) throw new Error('Las incidencias de la copia no tienen un formato válido.');
  const ids = new Set();
  return incidents.map(item => {
    const fields = incidentFields(item);
    if (typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('La copia contiene incidencias sin identificador o repetidas.');
    ids.add(item.id);
    return { ...item, ...fields };
  });
}

export function getIncidents() {
  return validateIncidentBackup(getStorageItem(STORAGE_KEYS.INCIDENTS, []))
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export function saveIncident(data, id = null) {
  const fields = incidentFields(data);
  const incidents = getIncidents();
  const index = incidents.findIndex(item => item.id === id);
  if (id && index < 0) throw new Error('Esta incidencia ya no existe. Vuelve al listado.');
  const now = new Date().toISOString();
  const incident = index >= 0
    ? { ...incidents[index], ...fields, updatedAt: now }
    : { ...fields, id: `incident_${crypto.randomUUID()}`, createdAt: now, updatedAt: now };
  if (index >= 0) incidents[index] = incident;
  else incidents.push(incident);
  if (!setStorageItem(STORAGE_KEYS.INCIDENTS, incidents)) throw new Error('No se ha podido guardar. Conserva el texto y vuelve a intentarlo.');
  return incident;
}

export function deleteIncident(id) {
  const incidents = getIncidents();
  if (!setStorageItem(STORAGE_KEYS.INCIDENTS, incidents.filter(item => item.id !== id))) {
    throw new Error('No se ha podido eliminar. La incidencia se conserva.');
  }
}

export function searchIncidents(incidents, query) {
  const search = query.trim().toLowerCase();
  const compact = value => value.replace(/[\s-]/g, '');
  return incidents.filter(item => {
    const [year, month, day] = item.fechaHora.slice(0, 10).split('-');
    return item.fechaHora.toLowerCase().includes(search) || `${day}/${month}/${year}`.includes(search)
      || compact(item.matricula.toLowerCase()).includes(compact(search));
  });
}

export function incidentText(incident) {
  const [year, month, day] = incident.fechaHora.slice(0, 10).split('-');
  return `INCIDENCIA\nFecha: ${day}/${month}/${year} ${incident.fechaHora.slice(11)}\nMatrícula: ${incident.matricula}\nCoche / ambulancia: ${incident.numeroCoche}\n\n${incident.motivo}`;
}
