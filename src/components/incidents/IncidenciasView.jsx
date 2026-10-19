import React, { useEffect, useRef, useState } from 'react';
import { getIncidents, deleteIncident, searchIncidents, incidentText } from '../../services/incidentService.js';
import IncidentForm from './IncidentForm.jsx';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import { STORAGE_KEYS } from '../../services/storageService.js';
import './IncidenciasView.css';

const dateLabel = incident => `${formatDateSpanish(incident.fechaHora.slice(0, 10))} · ${incident.fechaHora.slice(11)}`;

function IncidentDialog({ incident, mode, onClose, onDelete }) {
  const ref = useRef(null);
  const [feedback, setFeedback] = useState('');
  const deleting = mode === 'delete';
  useEffect(() => { ref.current.showModal(); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(incidentText(incident)); setFeedback('Texto copiado.'); }
    catch { setFeedback('No se ha podido copiar. Puedes seleccionar el texto de esta pantalla.'); }
  }
  return <dialog ref={ref} className={`incident-dialog ${deleting ? 'incident-delete-dialog' : 'incident-show-dialog'}`} onCancel={onClose} onClose={onClose} aria-labelledby="incident-dialog-title">
    <div className="incident-dialog-toolbar"><h2 id="incident-dialog-title">{deleting ? '¿Eliminar esta incidencia?' : 'Incidencia'}</h2><button type="button" onClick={onClose} autoFocus>{deleting ? 'Cancelar' : 'Volver'}</button></div>
    <dl className="incident-details"><div><dt>Fecha y hora</dt><dd>{dateLabel(incident)}</dd></div><div><dt>Matrícula</dt><dd>{incident.matricula}</dd></div><div><dt>Coche / ambulancia</dt><dd>{incident.numeroCoche}</dd></div></dl>
    <p className="incident-reason">{incident.motivo}</p>
    {deleting ? <><p>Se eliminará del registro de este navegador.</p><button type="button" className="incident-danger" onClick={() => { try { onDelete(incident.id); } catch (err) { setFeedback(err.message); } }}>Confirmar eliminación</button></>
      : <button type="button" onClick={copy}>Copiar texto</button>}
    {feedback && <p role="status">{feedback}</p>}
  </dialog>;
}

export default function IncidenciasView() {
  const [incidents, setIncidents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef(null);
  useEffect(() => {
    const refresh = () => { try { setIncidents(getIncidents()); } catch (err) { setError(err.message); } };
    refresh();
    const sync = event => { if (event.key === STORAGE_KEYS.INCIDENTS || event.key === null) refresh(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const filtered = searchIncidents(incidents, query);
  function reset() { setEditing(null); setError(''); }
  function saved() {
    setIncidents(getIncidents());
    setMessage(editing ? 'Cambios guardados.' : 'Incidencia guardada.');
    reset();
  }
  function edit(incident) {
    setEditing(incident); setError(''); setMessage('');
    formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current.querySelector('input').focus({ preventScroll: true });
  }
  function remove(id) {
    deleteIncident(id);
    setIncidents(getIncidents()); setDialog(null);
    if (editing?.id === id) reset();
    setMessage('Incidencia eliminada.');
  }

  return <section className="incidents-view" aria-labelledby="incidents-title">
    <h2 id="incidents-title">Incidencias</h2>
    <p className="incidents-intro">Anota lo ocurrido y consúltalo cuando lo necesites. Se guarda en este navegador y en tus copias de seguridad.</p>
    <div className="incidents-layout">
      <IncidentForm key={editing?.id ?? 'new'} incident={editing} formRef={formRef} onSaved={saved} onCancel={editing ? reset : undefined} />
      <div className="incident-panel">
        <h3>Registro de incidencias <span className="incident-count">{incidents.length}</span></h3>
        <label htmlFor="incident-search">Buscar por fecha o matrícula</label><input id="incident-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="19/10/2026 o 1234 ABC" />
        {message && <p role="status" className="incident-success">{message}</p>}
        {error && <p role="alert" className="incident-error">{error}</p>}
        {filtered.length === 0 && <p className="incidents-empty">{incidents.length ? 'No hay incidencias con esa fecha o matrícula.' : 'Todavía no hay incidencias guardadas.'}</p>}
        <div className="incidents-list">{filtered.map(incident => <article className="incident-entry" key={incident.id}>
          <time dateTime={incident.fechaHora}>{dateLabel(incident)}</time>
          <h4>{incident.matricula} <span>· Coche {incident.numeroCoche}</span></h4>
          <p className="incident-excerpt">{incident.motivo}</p>
          <div className="incident-actions"><button type="button" onClick={() => setDialog({ incident, mode: 'show' })}>Ver incidencia</button><button type="button" onClick={() => edit(incident)}>Editar</button><button type="button" className="incident-danger" onClick={() => setDialog({ incident, mode: 'delete' })}>Eliminar</button></div>
        </article>)}</div>
      </div>
    </div>
    {dialog && <IncidentDialog incident={dialog.incident} mode={dialog.mode} onClose={() => setDialog(null)} onDelete={remove} />}
  </section>;
}
