import React, { useState } from 'react';
import { FAMILY_TYPES } from '../../services/familyService.js';

export default function CadenceBuilder({ patterns, onSave }) {
  const [steps, setSteps] = useState([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const current = selected === null ? null : steps[selected];
  function load(id) {
    setSteps((patterns.find(item => item.id === id)?.steps ?? []).map(step => ({ ...step })));
    setSelected(null); setError(''); setSavedMessage('');
  }
  function update(changes) {
    setSteps(steps.map((step, index) => index === selected ? { ...step, ...changes } : step));
  }
  function add(type) {
    if (steps.length >= 366) { setError('La cadencia puede tener como máximo 366 días.'); return; }
    setSteps([...steps, { tipo: type, entrada: type === 'libre' ? '00:00' : '', salida: type === 'libre' ? '00:00' : '' }]); setSelected(steps.length); setError('');
  }
  function move(delta) {
    const updated = steps.slice();
    [updated[selected], updated[selected + delta]] = [updated[selected + delta], updated[selected]];
    setSteps(updated); setSelected(selected + delta);
  }
  function save(event) {
    event.preventDefault();
    try { onSave(name, steps); setError(''); setName(''); setSelected(null); setSavedMessage('Cadencia guardada. Ya puedes elegirla en Aplicar una cadencia.'); }
    catch (err) { setError(err.message); }
  }
  return <div className="cadence-builder">
    <h3>Crea tu cadencia desde cero</h3>
    <p>No hay una secuencia predefinida. Tú añades los días y ajustas sus horas.</p>
    {patterns.length > 0 && <label>Cargar una cadencia guardada<select aria-label="Cargar una cadencia guardada" defaultValue="" onChange={event => { if (event.target.value) load(event.target.value); }}><option value="">Elige una guardada</option>{patterns.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    <h3>1. Monta los días en orden</h3>
    <p>Pulsa un día para cambiarlo o ajustar sus horas. Después del último día, el ciclo vuelve a empezar.</p>
    <div className="cadence-days" role="group" aria-label="Días de tu cadencia">{steps.map((step, index) => <button type="button" key={index} className={`cadence-day cadence-${step.tipo}`} aria-pressed={selected === index} aria-label={`Editar día ${index + 1}: ${FAMILY_TYPES.find(type => type.id === step.tipo)?.name}`} onClick={() => setSelected(index)}><small>Día {index + 1}</small><strong>{FAMILY_TYPES.find(type => type.id === step.tipo)?.name}</strong><small>{step.tipo === 'libre' ? 'Descanso' : step.entrada && step.salida ? `${step.entrada}–${step.salida}` : 'Indica las horas'}</small></button>)}</div>
    {!steps.length && <p className="cadence-empty">Añade el primer día con uno de estos botones.</p>}
    <div className="cadence-add" aria-label="Añadir días">{FAMILY_TYPES.map(type => <button type="button" key={type.id} onClick={() => add(type.id)}>+ {type.name}</button>)}</div>
    {current && <div className="cadence-edit">
      <h4>Editar día {selected + 1}</h4>
      <div className="cadence-types">{FAMILY_TYPES.map(type => <button type="button" key={type.id} aria-pressed={current.tipo === type.id} onClick={() => update({ tipo: type.id, entrada: type.id === 'libre' ? '00:00' : current.tipo === 'libre' ? '' : current.entrada, salida: type.id === 'libre' ? '00:00' : current.tipo === 'libre' ? '' : current.salida })}>{type.name}</button>)}</div>
      {current.tipo !== 'libre' && <div className="family-time-row"><label>Entrada del día seleccionado<input type="time" value={current.entrada} onChange={e => update({ entrada: e.target.value })} /></label><label>Salida del día seleccionado<input type="time" value={current.salida} onChange={e => update({ salida: e.target.value })} /></label></div>}
      <div className="family-actions"><button type="button" disabled={selected === 0} onClick={() => move(-1)}>← Mover antes</button><button type="button" disabled={selected === steps.length - 1} onClick={() => move(1)}>Mover después →</button><button type="button" onClick={() => { setSteps(steps.filter((_, index) => index !== selected)); setSelected(null); }}>Quitar este día</button><button type="button" onClick={() => setSelected(null)}>Listo</button></div>
    </div>}
    <form onSubmit={save}>
      <h3>2. Ponle nombre y guárdala</h3>
      <label>Nombre de la cadencia<input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej. Turnos con reducción" /></label>
      <p>{steps.length} días en el ciclo. Guardarla no añade turnos al calendario.</p>
      {error && <p role="alert" className="family-error">{error}</p>}
      {savedMessage && <p role="status" className="family-success">{savedMessage}</p>}
      <button type="submit" className="family-primary" disabled={!steps.length || !name.trim()}>Guardar cadencia</button>
    </form>
  </div>;
}
