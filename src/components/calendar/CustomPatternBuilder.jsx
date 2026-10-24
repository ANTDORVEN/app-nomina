import { getSelectableShiftTypes, getDisplayShiftType, baseShiftId } from '../../services/customShiftService.js';
import React, { useState } from 'react';
import { getAllTimeLogs } from '../../services/shiftService.js';
import { getCustomPatterns, saveCustomPattern, updateCustomPattern, deleteCustomPattern, previewCustomPattern, applyCustomPattern } from '../../services/customPatternService.js';
import { formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import './CustomPatternBuilder.css';

export default function CustomPatternBuilder({ onApplied, onClose }) {
  const [steps, setSteps] = useState([]);
  const [patterns, setPatterns] = useState(getCustomPatterns);
  const [selectedPattern, setSelectedPattern] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [anchor, setAnchor] = useState('');
  const [replace, setReplace] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const types = getSelectableShiftTypes();
  const options = { steps, start, end, anchor: anchor || start };
  const invalidate = () => { setPreview(null); setError(''); setMessage(''); };
  function update(index, changes) { setSteps(steps.map((step, i) => i === index ? { ...step, ...changes } : step)); invalidate(); }
  function add(free = false) { setSteps([...steps, { tipoTurnoId: free ? 'libre' : '', entrada: '', salida: '', repeticiones: 1, descansoMinutos: 0 }]); invalidate(); }
  function move(index, delta) { const next = [...steps]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; setSteps(next); invalidate(); }
  function run(action) { try { action(); setError(''); } catch (err) { setError(err.message); } }
  const existing = new Set(getAllTimeLogs().map(log => log.fecha));

  return <div className="custom-pattern-builder">
    <p className="live-hint">Empieza vacío. Añade los turnos y descansos en orden; después el ciclo se repetirá en las fechas que elijas.</p>
    {patterns.length > 0 && <label>Mis categorías y cadencias<select aria-label="Cargar una cadencia tuya" value={selectedPattern} onChange={event => {
      const id = event.target.value; setSelectedPattern(id);
      const pattern = patterns.find(item => item.id === id);
      if (pattern) { setSteps(pattern.steps.map(step => ({ ...step }))); setName(pattern.name); setCategory(pattern.category ?? ''); setAnchor(pattern.anchor ?? ''); invalidate(); }
    }}><option value="">Elige una guardada</option>{patterns.map(pattern => <option key={pattern.id} value={pattern.id}>{pattern.category ? `${pattern.category} · ` : ''}{pattern.name}</option>)}</select></label>}
    <div className="custom-pattern-actions"><button type="button" onClick={() => { setSelectedPattern(''); setName(''); setCategory(''); setSteps([]); setStart(''); setEnd(''); setAnchor(''); setReplace(false); invalidate(); }}>Crear otra desde cero</button></div>
    <h4>1. Crea tu ciclo</h4>
    {!steps.length && <p>No hay ningún turno añadido.</p>}
    {steps.map((step, index) => {
      const type = types.find(item => item.id === step.tipoTurnoId);
      const free = baseShiftId(type?.id, types) === 'libre' || type?.esAusencia;
      return <div className="custom-pattern-step" key={index}>
        <strong>Paso {index + 1}</strong>
        <label>Tipo de día<select aria-label="Tipo de día" value={step.tipoTurnoId} onChange={e => { const selected = types.find(item => item.id === e.target.value); update(index, { tipoTurnoId: e.target.value, ...(selected?.esPersonalizado ? { entrada: selected.horaInicio, salida: selected.horaFin, descansoMinutos: selected.horasDescansoNoPagadas * 60 } : {}) }); }}><option value="">Elige el tipo de turno</option>{types.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        {!free && <div className="custom-pattern-hours"><label>Entrada<input type="time" value={step.entrada} onChange={e => update(index, { entrada: e.target.value })} /></label><label>Salida<input type="time" value={step.salida} onChange={e => update(index, { salida: e.target.value })} /></label></div>}
        {baseShiftId(type?.id, types) === 'guardia24' && <p className="live-hint">La misma hora de entrada y salida representa 24 h, con salida al día siguiente.</p>}
        <label>{free ? 'Días seguidos de descanso / ausencia' : 'Días seguidos con este turno'}<input type="number" min="1" max="366" step="1" value={step.repeticiones} onChange={e => update(index, { repeticiones: e.target.value })} /></label>
        {!free && <label>Pausa no pagada por turno (minutos)<input type="number" min="0" step="any" value={step.descansoMinutos} onChange={e => update(index, { descansoMinutos: e.target.value })} /></label>}
        <div className="custom-pattern-actions"><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Subir</button><button type="button" disabled={index === steps.length - 1} onClick={() => move(index, 1)}>Bajar</button><button type="button" onClick={() => { setSteps(steps.filter((_, i) => i !== index)); invalidate(); }}>Quitar paso</button></div>
      </div>;
    })}
    <div className="custom-pattern-actions"><button type="button" onClick={() => add()}>+ Añadir turno</button><button type="button" onClick={() => add(true)}>+ Añadir descanso</button></div>
    {steps.length > 0 && <p className="live-hint">{steps.reduce((sum, step) => sum + Number(step.repeticiones || 0), 0)} días en el ciclo. Tú decides cuántos descansos hay después de cada turno.</p>}
    <details className="disclosure-panel"><summary>Guardar y organizar mis cadencias</summary><div className="disclosure-body custom-pattern-management">
      <label>Categoría del patrón<input value={category} onChange={e => setCategory(e.target.value)} placeholder="Escribe tu categoría" list="custom-pattern-categories" /></label>
      <datalist id="custom-pattern-categories">{[...new Set(patterns.map(pattern => pattern.category).filter(Boolean))].map(item => <option key={item} value={item} />)}</datalist>
      <label>Nombre de tu cadencia<input value={name} onChange={e => setName(e.target.value)} placeholder="Escribe un nombre" /></label>
      <p className="live-hint">La categoría sirve para organizar tus cadencias. Cambiarla no modifica el cálculo ni los días ya puestos en el calendario.</p>
      <div className="custom-pattern-actions">
        <button type="button" onClick={() => run(() => { const saved = saveCustomPattern(name, steps, anchor || start || undefined, category); setPatterns(saved); setSelectedPattern(saved.at(-1).id); setMessage('Cadencia guardada. Todavía no se ha añadido al calendario.'); })}>{selectedPattern ? 'Guardar como cadencia nueva' : 'Guardar mi cadencia'}</button>
        {selectedPattern && <>
          <button type="button" onClick={() => run(() => { setPatterns(updateCustomPattern(selectedPattern, { name, category, steps, anchor: anchor || start || undefined })); setMessage('Cambios de la cadencia guardados. El calendario existente se conserva.'); })}>Guardar cambios de la cadencia</button>
          <button type="button" onClick={() => { if (window.confirm('¿Eliminar esta cadencia guardada? Sus turnos ya aplicados al calendario se conservarán.')) run(() => { setPatterns(deleteCustomPattern(selectedPattern)); setSelectedPattern(''); setMessage('Cadencia eliminada. Los días del calendario se conservan.'); }); }}>Eliminar cadencia guardada</button>
        </>}
      </div>
    </div></details>
    <h4>2. Elige las fechas</h4>
    <label>Aplicar desde<input type="date" value={start} onChange={e => { setStart(e.target.value); invalidate(); }} /></label>
    <label>Hasta<input type="date" min={start} value={end} onChange={e => { setEnd(e.target.value); invalidate(); }} /></label>
    <details className="disclosure-panel"><summary>Continuar un ciclo que ya empezó</summary><div className="disclosure-body"><label>Fecha del primer día del ciclo<input type="date" value={anchor} onChange={e => { setAnchor(e.target.value); invalidate(); }} /></label><p className="live-hint">Déjalo vacío para empezar por el paso 1 en la fecha «Aplicar desde».</p></div></details>
    <label className="custom-pattern-check"><input type="checkbox" checked={replace} onChange={e => { setReplace(e.target.checked); invalidate(); }} />Sustituir los días ya guardados en ese rango</label>
    <p className="live-hint">Por defecto se conservan tus días guardados. Los fichajes de horas reales se conservan siempre y mantienen su decisión de nómina.</p>
    <button type="button" className="btn-primary" disabled={!steps.length} onClick={() => run(() => { setPreview(previewCustomPattern(options)); setMessage(''); })}>Ver vista previa</button>
    {preview && <div className="custom-pattern-preview"><h4>3. Revisa antes de aplicar</h4><p>{preview.length} días. {replace ? 'Se sustituirán los días existentes.' : `Se conservarán ${preview.filter(day => existing.has(day.fecha)).length} días existentes.`}</p><ul>{preview.slice(0, 12).map(day => <li key={day.fecha}>{formatDateSpanish(day.fecha)} · {getDisplayShiftType(day, types)?.nombre} · {day.horasTrabajadas ? `${day.horaEntradaReal}–${day.horaSalidaReal} · ${formatHoursToHHMM(day.horasTrabajadas)}` : 'Sin jornada'}</li>)}</ul>{preview.length > 12 && <p>El ciclo continúa hasta {formatDateSpanish(end)}.</p>}<button type="button" className="btn-primary" onClick={() => run(() => {
      const result = applyCustomPattern(options, replace); setPreview(null); setMessage(`Aplicados ${result.added} días. Conservados ${result.skipped} días existentes.`); onApplied?.();
    })}>Confirmar cuadrante</button></div>}
    {error && <p role="alert" className="live-error">{error}</p>}{message && <p role="status" className="alert-success">{message}</p>}
    <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
  </div>;
}
