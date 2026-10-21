import React, { useEffect, useRef, useState } from 'react';
import { FAMILY_TYPES, familyStep, getFamilyData, saveFamilyName, saveFamilyShift, deleteFamilyShift, saveFamilyPattern, previewFamilyPattern, applyFamilyPattern } from '../../services/familyService.js';
import { getAllTimeLogs, getShiftTypes } from '../../services/shiftService.js';
import { STORAGE_KEYS } from '../../services/storageService.js';
import { DAY_NAMES, MONTH_NAMES, getMonthDaysGrid } from '../../utils/calendarUtils.js';
import { formatDateToISO, formatDateSpanish } from '../../utils/dateUtils.js';
import './FamilyCalendar.css';
import CadenceBuilder from './CadenceBuilder.jsx';

const typeName = id => FAMILY_TYPES.find(type => type.id === id)?.name ?? id;
const hours = (entrada, salida, is24HourShift = false) => `${entrada}–${salida}${salida < entrada || (is24HourShift && entrada === salida) ? ' (+1 día)' : ''}`;
const ownTurnName = (log, type) => ({ manana: 'Mañana', tarde: 'Tarde', noche: 'Noche', guardia24: 'Guardia 24 h', turno12: 'Turno 12 h', jornada_adicional: 'Adicional', sabado_alterno: 'Sábado', libre: 'Libre' }[log?.tipoTurnoId] ?? type?.nombre?.replace(/\s*\([^)]*\)/g, '') ?? log?.tipoTurnoId);
const ownTurnCode = (log, type) => ({ manana: 'M', tarde: 'T', noche: 'N', guardia24: '24', turno12: '12', jornada_adicional: 'Ad', sabado_alterno: 'S', libre: 'L', vacaciones: 'V' }[log?.tipoTurnoId] ?? type?.nombreCorto ?? '?');

export default function FamilyCalendar({ active, refreshKey, onOpenCalendar }) {
  const [month, setMonth] = useState(() => formatDateToISO(new Date()).slice(0, 7));
  const [data, setData] = useState(getFamilyData);
  const [ownLogs, setOwnLogs] = useState(getAllTimeLogs);
  const [name, setName] = useState(() => getFamilyData().partnerName);
  const [ownName, setOwnName] = useState(() => getFamilyData().ownName);
  const [selected, setSelected] = useState(null);
  const [shift, setShift] = useState(() => ({ ...familyStep('dia'), notas: '' }));
  const [patternId, setPatternId] = useState(() => getFamilyData().patterns[0]?.id ?? '');
  const [anchor, setAnchor] = useState(() => getFamilyData().patterns[0]?.anchor ?? formatDateToISO(new Date()));
  const [rangeStart, setRangeStart] = useState(formatDateToISO(new Date()));
  const [rangeEnd, setRangeEnd] = useState(formatDateToISO(new Date()));
  const [replace, setReplace] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const editor = useRef(null);
  const types = getShiftTypes();
  const [year, monthNumber] = month.split('-').map(Number);
  const monthGrid = getMonthDaysGrid(year, monthNumber - 1);
  const grid = monthGrid.slice(0, Math.ceil((monthGrid.findLastIndex(day => day.isCurrentMonth) + 1) / 7) * 7);
  const currentPattern = data.patterns.find(pattern => pattern.id === patternId);
  const options = { patternId, anchor, start: rangeStart, end: rangeEnd };
  const ownFor = date => ownLogs.find(log => log.fecha === date);
  const familyFor = date => data.shifts.find(item => item.fecha === date);
  useEffect(() => {
    if (active) { setData(getFamilyData()); setOwnLogs(getAllTimeLogs()); }
  }, [active, refreshKey]);
  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEYS.FAMILY_CALENDAR || event.key === null) setData(getFamilyData());
      if (event.key === STORAGE_KEYS.TIME_LOGS || event.key === null) setOwnLogs(getAllTimeLogs());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function run(action) {
    try { action(); setError(''); } catch (err) { setError(err.message); setMessage(''); }
  }
  function moveMonth(delta) {
    setMonth(formatDateToISO(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7));
  }
  function selectDay(fecha) {
    setSelected(fecha); setShift(familyFor(fecha) ?? { ...familyStep('dia'), notas: '' });
    setError(''); setMessage('');
  }
  useEffect(() => { if (selected && active) editor.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [selected, active]);
  const changeRange = setter => event => { setter(event.target.value); setPreview(null); };

  return <section className="family-view" aria-label="Calendario de los dos">
    <div className="family-calendar-board">
    <div className="family-month-toolbar"><button type="button" aria-label="Mes anterior" onClick={() => moveMonth(-1)}>←</button><label>Mes<input type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /></label><button type="button" aria-label="Mes siguiente" onClick={() => moveMonth(1)}>→</button></div>
    <div className="family-legend"><span className="family-person family-person-own">Arriba: {data.ownName}</span><span className="family-person family-person-partner">Abajo: {data.partnerName}</span><span className="family-shared-legend">★ Ambos libres</span></div>
    <div className="family-grid" role="group" aria-label={`Turnos de ${MONTH_NAMES[monthNumber - 1]} ${year}`}>
      {DAY_NAMES.map((day, index) => <div className={`family-weekday ${index >= 5 ? 'family-weekend' : ''}`} key={day}>{day}</div>)}
      {grid.map(day => {
        if (!day.isCurrentMonth) return <div className="family-blank-day" key={day.dateIso} aria-hidden="true" />;
        const own = ownFor(day.dateIso);
        const ownType = types.find(type => type.id === own?.tipoTurnoId);
        const partner = familyFor(day.dateIso);
        const bothFree = own?.tipoTurnoId === 'libre' && partner?.tipo === 'libre';
        return <button type="button" key={day.dateIso} className={`family-day ${bothFree ? 'family-both-free' : ''} ${selected === day.dateIso ? 'family-selected' : ''}`} onClick={() => selectDay(day.dateIso)} aria-label={`${formatDateSpanish(day.dateIso)}. ${data.ownName}: ${ownType?.nombre ?? 'sin turno registrado'}. ${data.partnerName}: ${partner ? typeName(partner.tipo) : 'sin asignar'}${bothFree ? '. Ambos libres' : ''}`} aria-pressed={selected === day.dateIso}>
          <strong className="family-day-number">{day.dayNumber}{bothFree && <span className="family-free-star" aria-hidden="true">★</span>}</strong>
          <span className={`family-turn-band family-own-band ${!own ? 'family-no-data' : ''}`} title={`${data.ownName}: ${own ? ownTurnName(own, ownType) : 'sin turno registrado'}`} aria-hidden="true">{own && <strong className={ownTurnCode(own, ownType).length > 2 ? 'family-code-long' : ''}>{ownTurnCode(own, ownType)}</strong>}</span>
          <span className={`family-turn-band family-partner-band ${!partner ? 'family-no-data' : ''}`} title={`${data.partnerName}: ${partner ? typeName(partner.tipo) : 'sin turno registrado'}`} aria-hidden="true">{partner && <strong>{FAMILY_TYPES.find(type => type.id === partner.tipo)?.short}</strong>}</span>
        </button>;
      })}
    </div>
    <p className="family-code-legend">D: día · M: mañana · T: tarde · N: noche · L: libre · 24: guardia · Ad: adicional · V: vacaciones</p>
    <p className="family-help">Toca un día para ver los horarios completos. Vacío significa sin datos. Las noches se anotan en su fecha de entrada.</p>
    </div>
    <p className="family-intro">Tus turnos vienen del calendario anual. Aquí añades los de {data.partnerName}; no afectan a tu nómina.</p>
    {selected && <div className="family-panel family-editor" ref={editor}>
      <h3>{formatDateSpanish(selected)}</h3>
      <p className="family-own"><strong>{data.ownName}:</strong> {ownFor(selected) ? `${types.find(type => type.id === ownFor(selected).tipoTurnoId)?.nombre ?? ownFor(selected).tipoTurnoId} · ${hours(ownFor(selected).horaEntradaReal ?? '00:00', ownFor(selected).horaSalidaReal ?? '00:00', ownFor(selected).tipoTurnoId === 'guardia24')}` : 'Sin turno registrado'}</p>
      <button type="button" className="family-link" onClick={onOpenCalendar}>Editar mis turnos en el calendario anual</button>
      <form onSubmit={event => { event.preventDefault(); run(() => { setData(saveFamilyShift({ ...shift, fecha: selected })); setMessage('Turno familiar guardado. El resto de la cadencia se conserva.'); setPreview(null); }); }}>
        <h3>Turno de {data.partnerName}</h3>
        <label>Tipo de turno<select value={shift.tipo} onChange={e => setShift({ ...shift, ...familyStep(e.target.value) })}>{FAMILY_TYPES.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        {shift.tipo !== 'libre' && <div className="family-time-row"><label>Entrada<input type="time" required value={shift.entrada} onChange={e => setShift({ ...shift, entrada: e.target.value })} /></label><label>Salida<input type="time" required value={shift.salida} onChange={e => setShift({ ...shift, salida: e.target.value })} /></label></div>}
        {shift.tipo !== 'libre' && <p>{hours(shift.entrada, shift.salida)}. Puedes acortar las horas por la reducción.</p>}
        <label>Notas / cambio de turno<textarea rows={3} value={shift.notas} placeholder="Reducción, cambio con compañera…" onChange={e => setShift({ ...shift, notas: e.target.value })} /></label>
        <div className="family-actions"><button className="family-primary" type="submit">Guardar este día</button><button type="button" onClick={() => { if (window.confirm('¿Quitar el turno de tu pareja de este día? Tus turnos no se modificarán.')) run(() => { setData(deleteFamilyShift(selected)); setShift({ ...familyStep('dia'), notas: '' }); setMessage('Turno familiar quitado.'); setPreview(null); }); }}>Quitar turno</button><button type="button" onClick={() => setSelected(null)}>Cerrar día</button></div>
      </form>
    </div>}
    {error && <p className="family-error" role="alert">{error}</p>}{message && <p className="family-success" role="status">{message}</p>}
    <details className="family-panel family-apply-panel">
      <summary>Aplicar una cadencia</summary><p>Rellena solo el mes o el rango que elijas. No se añade ningún turno hasta que confirmes.</p>
      <label>Cadencia<select value={patternId} onChange={event => { setPatternId(event.target.value); setAnchor(data.patterns.find(pattern => pattern.id === event.target.value)?.anchor ?? formatDateToISO(new Date())); setPreview(null); }}>{data.patterns.map(pattern => <option key={pattern.id} value={pattern.id}>{pattern.name}</option>)}</select></label>
      <p className="family-sequence">{currentPattern?.steps.map(step => FAMILY_TYPES.find(type => type.id === step.tipo)?.short).join(' → ')} · {currentPattern?.steps.length} días</p>
      <label>Fecha del primer día del ciclo<input type="date" value={anchor} onChange={changeRange(setAnchor)} /></label>
      <small>En la cadencia de 11 días: el día de 08:00 a 20:00 que precede a noche y tres libres. Para la semana de mañanas, elige un lunes. Esta fecha se guarda al aplicar para continuar el ciclo en los meses siguientes.</small>
      <div className="family-time-row"><label>Rellenar desde<input type="date" value={rangeStart} onChange={changeRange(setRangeStart)} /></label><label>Hasta<input type="date" value={rangeEnd} onChange={changeRange(setRangeEnd)} /></label></div>
      <div className="family-actions"><button type="button" onClick={() => { setRangeStart(`${month}-01`); setRangeEnd(formatDateToISO(new Date(year, monthNumber, 0))); setPreview(null); }}>Usar el mes visible</button><button type="button" onClick={() => { setRangeStart(`${month}-01`); setRangeEnd(formatDateToISO(new Date(year, monthNumber + 1, 0))); setPreview(null); }}>Usar dos meses</button></div>
      <label className="family-checkbox"><input type="checkbox" checked={replace} onChange={e => { setReplace(e.target.checked); setPreview(null); }} />Sustituir los turnos ya guardados en ese rango, incluidos cambios manuales</label>
      <button type="button" onClick={() => run(() => setPreview(previewFamilyPattern(options)))}>Ver vista previa</button>
      {preview && <div className="family-preview"><p><strong>{preview.length} días.</strong> {replace ? 'Se sustituirán los días existentes.' : `Se conservarán ${preview.filter(item => familyFor(item.fecha)).length} días ya guardados.`}</p><ul>{preview.slice(0, 14).map(item => <li key={item.fecha}>{formatDateSpanish(item.fecha)}: {typeName(item.tipo)} {item.tipo !== 'libre' && hours(item.entrada, item.salida)}</li>)}</ul>{preview.length > 14 && <p>La secuencia continúa hasta {formatDateSpanish(rangeEnd)}.</p>}<button className="family-primary" type="button" onClick={() => run(() => { const result = applyFamilyPattern(options, replace); setData(result.data); setPreview(null); setMessage(`Guardados ${result.added} días. Conservados ${result.skipped} días existentes.`); if (selected) setShift(result.data.shifts.find(item => item.fecha === selected) ?? { ...familyStep('dia'), notas: '' }); })}>Confirmar aplicación</button></div>}
    </details>
    <details className="family-panel"><summary>Crear o adaptar una cadencia</summary>
      <CadenceBuilder patterns={data.patterns} onSave={(name, steps) => {
        const updated = saveFamilyPattern(name, steps);
        setData(updated); setPatternId(updated.patterns.at(-1).id); setAnchor(formatDateToISO(new Date()));
        setPreview(null); setMessage('Cadencia guardada. Selecciona las fechas para aplicarla al calendario.');
      }} />
    </details>
    <details className="disclosure-panel"><summary><span>Nombres del calendario<small>Cómo aparecéis en la vista familiar</small></span></summary><div className="disclosure-body"><form className="family-names-form" onSubmit={event => { event.preventDefault(); run(() => { setData(saveFamilyName(name, ownName)); setMessage('Nombres actualizados.'); }); }}><label>Tu nombre<input required value={ownName} onChange={e => setOwnName(e.target.value)} /></label><label>Nombre de tu pareja<input required value={name} onChange={e => setName(e.target.value)} /></label><button type="submit">Guardar nombres</button></form></div></details>
  </section>;
}
