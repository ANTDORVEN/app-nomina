import React, { useState } from 'react';
import { getShiftTypes } from '../../services/shiftService.js';
import { getCustomShiftTypes, saveCustomShiftType } from '../../services/customShiftService.js';
import './CustomShiftTypes.css';

const empty = () => ({ nombre: '', nombreCorto: '', tipoBase: '', horaInicio: '', horaFin: '', color: '#3b82f6', horasDescansoNoPagadas: 0 });

export default function CustomShiftTypes({ onSaved }) {
  const [items, setItems] = useState(getCustomShiftTypes);
  const [id, setId] = useState('');
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const bases = getShiftTypes();
  const base = bases.find(type => type.id === form.tipoBase);
  const free = base?.id === 'libre' || base?.esAusencia;
  const change = event => { setForm({ ...form, [event.target.name]: event.target.value }); setMessage(''); setError(''); };
  return <details className="disclosure-panel custom-shift-types"><summary><span>Mis tipos de turno<small>Nombre con emojis, color y horario propios</small></span><span className="disclosure-value">{items.length}</span></summary><div className="disclosure-body">
    <p>Puedes crear tus propios nombres y horarios. El tratamiento de nómina usa una de las reglas que ya tiene la app.</p>
    {items.length > 0 && <label>Editar un tipo guardado<select aria-label="Editar un tipo guardado" value={id} onChange={e => { setId(e.target.value); setForm(items.find(item => item.id === e.target.value) ?? empty()); setError(''); setMessage(''); }}><option value="">Crear uno nuevo</option>{items.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>}
    <form onSubmit={event => { event.preventDefault(); try { const saved = saveCustomShiftType(form, id || undefined); setItems(saved); setId(id || saved.at(-1).id); setError(''); setMessage('Tipo de turno guardado. Los horarios de las jornadas ya registradas se conservan.'); onSaved?.(); } catch (err) { setError(err.message); } }}>
      <label>Nombre del turno<input name="nombre" value={form.nombre} onChange={change} required placeholder="Puedes escribir un emoji y un nombre" /></label>
      <label>Abreviatura o emoji<input name="nombreCorto" value={form.nombreCorto} onChange={change} required maxLength={16} placeholder="Para el calendario" /></label>
      <label>Color del turno<input name="color" type="color" value={form.color} onChange={change} /></label>
      <label>Tratar en nómina como<select aria-label="Tratar en nómina como" name="tipoBase" value={form.tipoBase} onChange={change} required disabled={Boolean(id)}><option value="">Elige la regla de cálculo</option>{bases.map(type => <option key={type.id} value={type.id}>{type.nombre}</option>)}</select></label>
      <p className="live-hint">El nombre o el color no determinan el pago. Una guardia mantiene su cómputo mensual pendiente. Para cambiar la regla de un tipo ya guardado, crea otro.</p>
      {!free && <><div className="custom-pattern-hours"><label>Entrada habitual<input name="horaInicio" type="time" value={form.horaInicio} onChange={change} required /></label><label>Salida habitual<input name="horaFin" type="time" value={form.horaFin} onChange={change} required /></label></div><label>Pausa no pagada habitual (minutos)<input type="number" min="0" step="any" value={Number(form.horasDescansoNoPagadas) * 60} onChange={e => setForm({ ...form, horasDescansoNoPagadas: Number(e.target.value) / 60 })} required /></label></>}
      {error && <p role="alert" className="live-error">{error}</p>}{message && <p role="status" className="alert-success">{message}</p>}
      <div className="custom-pattern-actions"><button type="submit">{id ? 'Guardar cambios del tipo' : 'Crear tipo de turno'}</button><button type="button" onClick={() => { setId(''); setForm(empty()); setError(''); setMessage(''); }}>Nuevo tipo desde cero</button></div>
    </form>
  </div></details>;
}
