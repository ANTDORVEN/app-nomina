import { getSelectableShiftTypes } from '../../services/customShiftService.js';
import React, { useEffect, useRef, useState } from 'react';
import { getPeriodForDate } from '../../services/shiftService.js';
import { changeLiveShift, getLiveShift, LIVE_SHIFT_KEY, liveDurations, liveShiftLog } from '../../services/liveShiftService.js';
import { getRealTimeRecords, saveRealTimeRecord, scheduledWorkForDate } from '../../services/realTimeService.js';
import { setStorageItem } from '../../services/storageService.js';
import PayrollChoice from './PayrollChoice.jsx';
import './RealTimeRecords.css';
import { formatDateToISO, formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import './LiveShift.css';

const clock = ms => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function LiveShift({ onLogSaved, onAddIncident, onViewIncidents, onViewRealRecord }) {
  const [session, setSession] = useState(getLiveShift);
  const [now, setNow] = useState(Date.now);
  const [typeId, setTypeId] = useState('');
  const [festive, setFestive] = useState(false);
  const [notes, setNotes] = useState('');
  const [payrollChoice, setPayrollChoice] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savedDate, setSavedDate] = useState(null);
  const review = useRef(null);
  const types = getSelectableShiftTypes().filter(type => !type.esAusencia && type.horasTeoricas > 0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sync = event => { if (event.key === LIVE_SHIFT_KEY || event.key === null) setSession(getLiveShift()); };
    window.addEventListener('storage', sync);
    return () => { clearInterval(timer); window.removeEventListener('storage', sync); };
  }, []);
  const duration = liveDurations(session, now);
  const paused = session?.pauses.at(-1)?.end === null;
  const finished = Boolean(session?.endedAt);
  const date = formatDateToISO(new Date(session?.startedAt ?? now));
  const period = getPeriodForDate(date);
  const scheduled = scheduledWorkForDate(date);
  const existingRecord = getRealTimeRecords().find(record => record.fecha === date);
  const chosenId = typeId || existingRecord?.tipoTurnoPersonalizadoId || existingRecord?.tipoTurnoId || scheduled?.tipoTurnoPersonalizadoId || scheduled?.tipoTurnoId || 'jornada_adicional';
  const countInPayroll = payrollChoice ?? existingRecord?.contarEnNomina ?? !scheduled;

  function act(action) {
    try {
      const updated = changeLiveShift(session, action);
      setSession(updated); setNow(Date.now()); setError(''); setMessage(''); setSavedDate(null);
      if (action === 'start') { setTypeId(''); setNotes(''); setFestive(false); setPayrollChoice(null); }
    } catch (err) { setError(err.message); setSession(getLiveShift()); }
  }
  function save(event) {
    event.preventDefault();
    try {
      const log = liveShiftLog(session, types.find(type => type.id === chosenId), true, festive, notes);
      if (JSON.stringify(getLiveShift()) !== JSON.stringify(session)) throw new Error('El turno ha cambiado en otra ventana. Revisa el registro.');
      saveRealTimeRecord({ ...log, contarEnNomina: countInPayroll });
      if (!setStorageItem(LIVE_SHIFT_KEY, null)) throw new Error('Horas guardadas. Pulsa guardar otra vez para cerrar el contador pendiente.');
      setSession(null); setSavedDate(date); setMessage(`Turno del ${formatDateSpanish(date)} guardado: ${countInPayroll ? `cuenta en nómina${period ? ` (${period.nombreNomina})` : ''}` : 'solo informativo; no sustituye las horas del cuadrante ni añade horas a la nómina'}.`);
      setError(''); onLogSaved?.(log);
    } catch (err) { setError(err.message); setSession(getLiveShift()); }
  }

  return <section className="live-shift fichaje-card" aria-labelledby="live-title">
    <div className="live-heading"><h2 id="live-title">Mi turno</h2><span className={`live-status ${paused && !finished ? 'paused' : ''}`}>{finished ? 'Pendiente de guardar' : session ? paused ? 'En pausa' : 'En marcha' : 'Sin iniciar'}</span></div>
    <p className="live-date">{formatDateSpanish(date)}</p>
    {finished && <div className="live-pending-panel">
      <p><strong>Turno terminado del {formatDateSpanish(date)}</strong></p>
      <p>No está en marcha. Guárdalo o descártalo para poder iniciar un turno nuevo.</p>
      <div className="live-pending-actions">
        <button type="button" className="btn-primary" onClick={() => { review.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); review.current?.querySelector('select')?.focus({ preventScroll: true }); }}>Revisar turno pendiente</button>
        <button type="button" className="btn-secondary" onClick={() => { if (window.confirm('¿Descartar este turno terminado sin guardar? Solo se quitará el contador pendiente. Tus registros guardados y el cuadrante se conservan.')) act('discard'); }}>Descartar turno pendiente</button>
      </div>
    </div>}
    <div className="live-clock" role="timer" aria-label="Tiempo de actividad">{clock(duration.active)}</div>
    <p className="live-clock-label">{finished ? 'Duración del turno terminado' : session ? 'Tiempo de actividad' : 'Pulsa iniciar cuando empiece tu jornada'}</p>
    {session && <div className="live-metrics"><span>Desde la entrada<strong>{clock(duration.total)}</strong></span><span>Pausas<strong>{clock(duration.pause)}</strong></span></div>}
    {!finished && <div className="live-buttons">
      {!session ? <button className="live-start" onClick={() => act('start')}>▶ Iniciar turno</button> : <>
        <button className="live-pause" onClick={() => act(paused ? 'resume' : 'pause')}>{paused ? '▶ Reanudar turno' : 'Ⅱ Pausa / comida'}</button>
        <button className="live-stop" onClick={() => act('finish')}>■ Terminar turno</button>
      </>}
    </div>}
    {session && !finished && <p className="live-hint">Entrada: {new Date(session.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. El turno se conserva al cerrar esta app en este navegador.</p>}
    {finished && <form className="live-review" ref={review} onSubmit={save}>
      <h3>Revisar y guardar</h3>
      <p>Entrada: {new Date(session.startedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}<br />Salida: {new Date(session.endedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</p>
      <div className="form-group"><label htmlFor="live-type">Tipo de turno para el cálculo</label><select id="live-type" value={chosenId} onChange={e => setTypeId(e.target.value)}>{types.map(type => <option key={type.id} value={type.id}>{type.nombre}</option>)}</select></div>
      <p className="live-hint">Para un cambio que debas cobrar completo, elige Jornada adicional. Puedes cambiar el turno sugerido.</p>
      <p className="live-hint">Las pausas y el almuerzo se descuentan del tiempo pagado.</p>
      <label className="checkbox-label"><input type="checkbox" checked={festive} onChange={e => setFestive(e.target.checked)} />Jornada festiva</label>
      <p>Tiempo pagado: <strong>{formatHoursToHHMM(duration.active / 3600000)}</strong></p>
      <div className="form-group"><label htmlFor="live-notes">Notas (opcional)</label><input id="live-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cambio con un compañero…" /></div>
      <PayrollChoice value={countInPayroll} onChange={setPayrollChoice} hasScheduledWork={Boolean(scheduled)} />
      {existingRecord && <p className="live-hint">Ya hay horas reales de este día. Al guardar se actualizará ese registro.</p>}
      <button className="submit-btn">Guardar turno</button>
    </form>}
    <div className="turno-incidents">
      <button type="button" onClick={onAddIncident}>📝 Añadir incidencia</button>
      <button type="button" onClick={onViewIncidents}>Ver incidencias</button>
    </div>
    <p className="live-period">{period ? `Nómina: ${period.nombreNomina}` : 'Sin periodo ATH configurado para esta fecha'}</p>
    {error && <p role="alert" className="live-error">{error}</p>}
    {message && <div className="alert-success"><p role="status">{message}</p>{savedDate && <button type="button" className="btn-secondary" onClick={() => onViewRealRecord?.(savedDate)}>Ver o corregir este fichaje</button>}</div>}
  </section>;
}
