import React, { useState } from 'react';
import { currentIncidentDateTime, saveIncident } from '../../services/incidentService.js';

const blank = fechaHora => ({ fechaHora: fechaHora || currentIncidentDateTime(), matricula: '', numeroCoche: '', motivo: '' });

/** Formulario compartido por el fichaje y el registro de incidencias. */
export default function IncidentForm({ incident, initialDateTime, onSaved, onCancel, formRef }) {
  const [form, setForm] = useState(() => incident ? { ...incident } : blank(initialDateTime));
  const [error, setError] = useState('');
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  function save(event) {
    event.preventDefault();
    try {
      const saved = saveIncident(form, incident?.id);
      if (!incident) setForm(blank());
      setError('');
      onSaved?.(saved);
    } catch (err) { setError(err.message); }
  }
  return <form ref={formRef} className="incident-panel incident-form" onSubmit={save}>
    <h3>{incident ? 'Editar incidencia' : 'Nueva incidencia'}</h3>
    <label htmlFor="incident-date">Fecha y hora</label><input id="incident-date" name="fechaHora" type="datetime-local" value={form.fechaHora} onChange={change} required />
    <label htmlFor="incident-plate">Matrícula</label><input id="incident-plate" name="matricula" value={form.matricula} onChange={change} placeholder="Ej. 1234 ABC" required />
    <label htmlFor="incident-car">Número de coche / ambulancia</label><input id="incident-car" name="numeroCoche" value={form.numeroCoche} onChange={change} placeholder="Ej. 42" required />
    <label htmlFor="incident-reason">Motivo de la incidencia</label><textarea id="incident-reason" name="motivo" rows={6} value={form.motivo} onChange={change} placeholder="Describe qué ha ocurrido…" required />
    {error && <p role="alert" className="incident-error">{error}</p>}
    <div className="incident-actions"><button type="submit" className="incident-primary">{incident ? 'Guardar cambios' : 'Guardar incidencia'}</button>{onCancel && <button type="button" onClick={onCancel}>{incident ? 'Cancelar edición' : 'Cerrar'}</button>}</div>
  </form>;
}
