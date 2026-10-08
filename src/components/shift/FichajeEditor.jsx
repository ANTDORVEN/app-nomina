import React, { useState } from 'react';
import { updateTimeLog } from '../../services/shiftService.js';
import { calculateWorkedHours, formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';

export default function FichajeEditor({ log, shiftTypes, onSaved, onCancel }) {
  const [tipoTurnoId, setTipoTurnoId] = useState(log.tipoTurnoId);
  const [entrada, setEntrada] = useState(log.horaEntradaReal ?? '08:00');
  const [salida, setSalida] = useState(log.horaSalidaReal ?? '16:00');
  const [esFestivo, setEsFestivo] = useState(log.esFestivo === true);
  const [notas, setNotas] = useState(log.notas ?? '');
  const [error, setError] = useState('');
  const shift = shiftTypes.find(item => item.id === tipoTurnoId);
  const sinJornada = shift?.esAusencia === true || tipoTurnoId === 'libre';
  const sinCambiosHorario = tipoTurnoId === log.tipoTurnoId
    && entrada === log.horaEntradaReal && salida === log.horaSalidaReal;
  const horas = sinJornada ? 0 : sinCambiosHorario ? Number(log.horasTrabajadas)
    : tipoTurnoId === 'guardia24' && entrada === salida ? 24 : calculateWorkedHours(entrada, salida);

  const changeType = event => {
    const id = event.target.value;
    setTipoTurnoId(id);
    setEsFestivo(shiftTypes.find(item => item.id === id)?.esFestivo === true);
  };

  const save = event => {
    event.preventDefault();
    if (!Number.isFinite(horas)) {
      setError('Revisa las horas de entrada y salida.');
      return;
    }
    const descanso = sinJornada ? 0 : log.registroEnVivo || tipoTurnoId === log.tipoTurnoId
      ? (log.horasDescansoNoPagadas ?? shift?.horasDescansoNoPagadas ?? 0)
      : (shift?.horasDescansoNoPagadas ?? 0);
    const saved = updateTimeLog(log.id || log.fecha, {
      tipoTurnoId,
      horaEntradaReal: sinJornada ? '00:00' : entrada,
      horaSalidaReal: sinJornada ? '00:00' : salida,
      horasTrabajadas: horas,
      horasExtra: tipoTurnoId === 'guardia24' ? 0 : tipoTurnoId === 'jornada_adicional'
        ? Math.max(0, horas - descanso) : Math.max(0, horas - descanso - 8),
      horasDescansoNoPagadas: descanso,
      horasNocturnas: sinCambiosHorario ? log.horasNocturnas : undefined,
      esFestivo: !sinJornada && (esFestivo || shift?.esFestivo === true),
      esAusencia: shift?.esAusencia === true,
      esPatronAuto: false,
      notas
    });
    if (!saved) {
      setError('No se han podido guardar los cambios. El fichaje anterior se conserva.');
      return;
    }
    onSaved();
  };

  return (
    <form className="log-editor" aria-label={`Editar fichaje del ${formatDateSpanish(log.fecha)}`}
      onSubmit={save} onKeyDown={event => { if (event.key === 'Escape') onCancel(); }}>
      <p className="log-editor-heading">Editar jornada del {formatDateSpanish(log.fecha)}</p>
      <label>Tipo de turno
        <select value={tipoTurnoId} onChange={changeType} autoFocus>
          {!shift && <option value={tipoTurnoId}>{tipoTurnoId}</option>}
          {shiftTypes.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
      </label>
      {!sinJornada && <div className="log-editor-times">
        <label>Entrada<input type="time" value={entrada} onChange={event => setEntrada(event.target.value)} required /></label>
        <label>Salida<input type="time" value={salida} onChange={event => setSalida(event.target.value)} required /></label>
      </div>}
      <p className="log-editor-preview">Duración: <strong>{formatHoursToHHMM(horas)}</strong>
        {tipoTurnoId === 'jornada_adicional' && ' · Jornada adicional pagada completa, descontando descansos.'}</p>
      {!sinJornada && <label className="log-editor-checkbox">
        <input type="checkbox" checked={esFestivo || shift?.esFestivo === true}
          disabled={shift?.esFestivo === true} onChange={event => setEsFestivo(event.target.checked)} />
        Día festivo
      </label>}
      <label>Notas<textarea value={notas} rows={3} onChange={event => setNotas(event.target.value)} /></label>
      {error && <p role="alert" className="log-editor-error">{error}</p>}
      <div className="log-actions">
        <button type="submit" className="log-save-btn">Guardar cambios</button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
