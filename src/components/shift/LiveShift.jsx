import React, { useEffect, useState } from 'react';
import { getShiftTypes, getAllTimeLogs, getPeriodForDate } from '../../services/shiftService.js';
import { changeLiveShift, getLiveShift, LIVE_SHIFT_KEY, liveDurations, liveShiftLog, saveLiveShift, suggestShift } from '../../services/liveShiftService.js';
import { formatDateToISO, formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import './LiveShift.css';

const clock = ms => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function LiveShift({ onLogSaved }) {
  const [session, setSession] = useState(getLiveShift);
  const [now, setNow] = useState(Date.now);
  const [typeId, setTypeId] = useState('');
  const [festive, setFestive] = useState(false);
  const [notes, setNotes] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const types = getShiftTypes().filter(type => !type.esAusencia && type.horasTeoricas > 0);
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
  const chosenId = typeId || (session ? suggestShift(session, types) : 'manana');
  const existing = finished && getAllTimeLogs().find(log => log.fecha === date && log.id !== session.id);

  function act(action) {
    try {
      const updated = changeLiveShift(session, action);
      setSession(updated); setNow(Date.now()); setError(''); setMessage('');
      if (action === 'start') { setTypeId(''); setNotes(''); setFestive(false); setReplace(false); }
    } catch (err) { setError(err.message); setSession(getLiveShift()); }
  }
  function save(event) {
    event.preventDefault();
    try {
      const log = liveShiftLog(session, types.find(type => type.id === chosenId), true, festive, notes);
      saveLiveShift(session, log, replace);
      setSession(null); setMessage(`Turno del ${formatDateSpanish(date)} guardado${period ? ` en ${period.nombreNomina}` : ''}.`);
      setError(''); onLogSaved?.(log);
    } catch (err) { setError(err.message); setSession(getLiveShift()); }
  }

  return <section className="live-shift fichaje-card" aria-labelledby="live-title">
    <div className="live-heading"><h2 id="live-title">Mi turno</h2><span className={`live-status ${paused && !finished ? 'paused' : ''}`}>{finished ? 'Pendiente de guardar' : session ? paused ? 'En pausa' : 'En marcha' : 'Sin iniciar'}</span></div>
    <p className="live-date">{formatDateSpanish(date)}</p>
    <div className="live-clock" role="timer" aria-label="Tiempo de actividad">{clock(duration.active)}</div>
    <p className="live-clock-label">{session ? 'Tiempo de actividad' : 'Pulsa iniciar cuando empiece tu jornada'}</p>
    {session && <div className="live-metrics"><span>Desde la entrada<strong>{clock(duration.total)}</strong></span><span>Pausas<strong>{clock(duration.pause)}</strong></span></div>}
    {!finished && <div className="live-buttons">
      {!session ? <button className="live-start" onClick={() => act('start')}>▶ Iniciar turno</button> : <>
        <button className="live-pause" onClick={() => act(paused ? 'resume' : 'pause')}>{paused ? '▶ Reanudar turno' : 'Ⅱ Pausa / comida'}</button>
        <button className="live-stop" onClick={() => act('finish')}>■ Terminar turno</button>
      </>}
    </div>}
    {session && !finished && <p className="live-hint">Entrada: {new Date(session.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. El turno se conserva al cerrar esta app en este navegador.</p>}
    {finished && <form className="live-review" onSubmit={save}>
      <h3>Revisar y guardar</h3>
      <p>Entrada: {new Date(session.startedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}<br />Salida: {new Date(session.endedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</p>
      <div className="form-group"><label htmlFor="live-type">Turno sugerido por la hora de entrada</label><select id="live-type" value={chosenId} onChange={e => setTypeId(e.target.value)}>{types.map(type => <option key={type.id} value={type.id}>{type.nombre}</option>)}</select></div>
      <p className="live-hint">Para un cambio que debas cobrar completo, elige Jornada adicional. Puedes cambiar el turno sugerido.</p>
      <p className="live-hint">Las pausas y el almuerzo se descuentan del tiempo pagado.</p>
      <label className="checkbox-label"><input type="checkbox" checked={festive} onChange={e => setFestive(e.target.checked)} />Jornada festiva</label>
      <p>Tiempo pagado: <strong>{formatHoursToHHMM(duration.active / 3600000)}</strong></p>
      <div className="form-group"><label htmlFor="live-notes">Notas (opcional)</label><input id="live-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cambio con un compañero…" /></div>
      {existing && <div className="live-conflict"><p>Ya tienes un fichaje el {formatDateSpanish(date)}: {existing.horaEntradaReal}–{existing.horaSalidaReal}. Se conserva hasta que confirmes su sustitución.</p><label className="checkbox-label"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />Sustituir ese fichaje por este turno</label></div>}
      <button className="submit-btn" disabled={Boolean(existing && !replace)}>Guardar turno</button>
    </form>}
    <p className="live-period">{period ? `Nómina: ${period.nombreNomina}` : 'Sin periodo ATH configurado para esta fecha'}</p>
    {error && <p role="alert" className="live-error">{error}</p>}
    {message && <p role="status" className="alert-success">{message}</p>}
  </section>;
}
