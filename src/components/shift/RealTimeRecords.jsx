import React, { useEffect, useRef, useState } from 'react';
import { getRealTimeRecords, saveRealTimeRecord, deleteRealTimeRecord, scheduledWorkForDate } from '../../services/realTimeService.js';
import { getShiftTypes } from '../../services/shiftService.js';
import { STORAGE_KEYS } from '../../services/storageService.js';
import { calculateWorkedHours, formatDateSpanish, formatDateToISO, formatHoursToHHMM } from '../../utils/dateUtils.js';
import PayrollChoice from './PayrollChoice.jsx';
import './RealTimeRecords.css';

function formForDate(fecha) {
  const existing = getRealTimeRecords().find(item => item.fecha === fecha);
  const scheduled = scheduledWorkForDate(fecha);
  return existing ?? { fecha, horaEntradaReal: scheduled?.horaEntradaReal ?? '08:00', horaSalidaReal: scheduled?.horaSalidaReal ?? '16:00',
    tipoTurnoId: scheduled?.tipoTurnoId ?? 'jornada_adicional', contarEnNomina: !scheduled, horasDescansoNoPagadas: 0, esFestivo: scheduled?.esFestivo === true };
}

export default function RealTimeRecords({ onUpdated, refreshKey, editDate }) {
  const [records, setRecords] = useState(getRealTimeRecords);
  const [form, setForm] = useState(() => formForDate(editDate?.fecha || formatDateToISO(new Date())));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const types = getShiftTypes().filter(type => !type.esAusencia && type.id !== 'libre');
  useEffect(() => {
    setRecords(getRealTimeRecords());
    const sync = event => { if (event.key === STORAGE_KEYS.REAL_TIME_RECORDS || event.key === null) setRecords(getRealTimeRecords()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [refreshKey]);
  useEffect(() => { if (editDate) { setForm(formForDate(editDate.fecha)); ref.current.scrollIntoView({ block: 'start' }); } }, [editDate]);
  const scheduled = scheduledWorkForDate(form.fecha);
  const duration = form.tipoTurnoId === 'guardia24' && form.horaEntradaReal === form.horaSalidaReal ? 24 : calculateWorkedHours(form.horaEntradaReal, form.horaSalidaReal);
  const change = event => {
    const { name, value } = event.target;
    if (name === 'fecha') { if (value) setForm(formForDate(value)); }
    else setForm({ ...form, [name]: value, registroEnVivo: undefined });
    setMessage(''); setError('');
  };
  function save(event) {
    event.preventDefault();
    try {
      saveRealTimeRecord(form); setRecords(getRealTimeRecords()); setError('');
      setMessage(form.contarEnNomina ? 'Registro guardado: cuenta en nómina, añadido manualmente.' : 'Registro guardado como informativo.');
      onUpdated?.();
    } catch (err) { setError(err.message); }
  }
  function remove(fecha) {
    if (!window.confirm('¿Borrar este registro de horas reales? Dejará de contar en nómina y se mantendrá el cuadrante original.')) return;
    try {
      deleteRealTimeRecord(fecha); setRecords(getRealTimeRecords());
      if (form.fecha === fecha) setForm(formForDate(fecha));
      setError(''); setMessage('Registro borrado. Nómina actualizada.'); onUpdated?.();
    } catch (err) { setError(err.message); }
  }
  return <section className="real-time-card" ref={ref} aria-labelledby="real-time-title">
    <h2 id="real-time-title">Horas reales de entrada y salida</h2>
    <p>Un registro por día. El cuadrante se conserva y puedes decidir si estas horas cuentan en nómina.</p>
    <form onSubmit={save} className="real-time-form">
      <label>Fecha<input name="fecha" type="date" required value={form.fecha} onChange={change} /></label>
      <div className="real-time-hours"><label>Entrada real<input name="horaEntradaReal" type="time" required value={form.horaEntradaReal} onChange={change} /></label><label>Salida real<input name="horaSalidaReal" type="time" required value={form.horaSalidaReal} onChange={change} /></label></div>
      <p>Duración: <strong>{formatHoursToHHMM(duration)}</strong>{form.horaSalidaReal < form.horaEntradaReal && ' · Salida al día siguiente'}</p>
      <label>Pausa no pagada (minutos)<input type="number" min="0" step="any" value={Number(form.horasDescansoNoPagadas) * 60} onChange={e => setForm({ ...form, horasDescansoNoPagadas: Number(e.target.value) / 60 })} required /></label>
      <label>Tipo de turno<select name="tipoTurnoId" value={form.tipoTurnoId} onChange={change}>{types.map(type => <option key={type.id} value={type.id}>{type.nombre}</option>)}</select></label>
      <label className="real-time-checkbox"><input type="checkbox" checked={form.esFestivo} onChange={e => setForm({ ...form, esFestivo: e.target.checked })} />Jornada festiva</label>
      <PayrollChoice value={form.contarEnNomina} onChange={value => setForm({ ...form, contarEnNomina: value })} hasScheduledWork={Boolean(scheduled)} />
      <button className="submit-btn" type="submit">Guardar horas reales</button>
      {error && <p role="alert" className="live-error">{error}</p>}{message && <p role="status" className="log-save-message">{message}</p>}
    </form>
    <label className="real-time-search">Consultar por fecha<input type="search" placeholder="2026-10-19 o 19/10/2026" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {!records.length && <p>Todavía no hay horas reales registradas.</p>}
    {records.filter(record => record.fecha.includes(query.trim()) || record.fecha.split('-').reverse().join('/').includes(query.trim())).map(record => <article className="real-time-entry" key={record.fecha}>
      <h3>{formatDateSpanish(record.fecha)}</h3><p>{record.horaEntradaReal} – {record.horaSalidaReal}{record.horaSalidaReal < record.horaEntradaReal && ' (+1 día)'} · {formatHoursToHHMM(record.horasTrabajadas)}</p>
      <p className={record.contarEnNomina ? 'real-time-paid' : ''}>{record.contarEnNomina ? '💶 En nómina · añadido manualmente' : 'ⓘ Solo informativo'}</p>
      <div className="log-actions"><button type="button" onClick={() => { setForm(formForDate(record.fecha)); setMessage(''); setError(''); ref.current.scrollIntoView({ block: 'start' }); }}>Editar</button><button type="button" onClick={() => remove(record.fecha)}>Borrar</button></div>
    </article>)}
  </section>;
}
