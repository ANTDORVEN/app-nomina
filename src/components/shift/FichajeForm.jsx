import React, { useState, useEffect } from 'react';
import { getShiftTypes, saveTimeLog, getPeriodForDate } from '../../services/shiftService.js';
import { formatDateToISO, calculateWorkedHours, formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import './FichajeForm.css';

/**
 * FichajeForm.jsx - Formulario optimizado para fichaje rápido con resumen visual en formato 'Xh Ymin'.
 */
export default function FichajeForm({ onLogSaved }) {
  const shiftTypes = getShiftTypes();
  
  const [fecha, setFecha] = useState(formatDateToISO(new Date()));
  const [tipoTurnoId, setTipoTurnoId] = useState('manana');
  const [horaEntrada, setHoraEntrada] = useState('08:00');
  const [horaSalida, setHoraSalida] = useState('16:00');
  const [horasExtraManuales, setHorasExtraManuales] = useState(0);
  const [esFestivo, setEsFestivo] = useState(false);
  const [notas, setNotas] = useState('');
  
  const [periodoAsignado, setPeriodoAsignado] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  // Actualizar franja horaria por defecto según el tipo de turno elegido
  const handleShiftTypeChange = (e) => {
    const selectedId = e.target.value;
    setTipoTurnoId(selectedId);
    const selectedShift = shiftTypes.find(s => s.id === selectedId);
    if (selectedShift) {
      setHoraEntrada(selectedShift.horaInicio);
      setHoraSalida(selectedShift.horaFin);
      if (selectedId === 'festivo') setEsFestivo(true);
    }
  };

  // Buscar a qué periodo ATH pertenece la fecha seleccionada
  useEffect(() => {
    const period = getPeriodForDate(fecha);
    setPeriodoAsignado(period);
  }, [fecha]);

  // Cálculo en tiempo real de las horas trabajadas
  const horasTrabajadasCalculadas = calculateWorkedHours(horaEntrada, horaSalida);
  const selectedShiftObj = shiftTypes.find(s => s.id === tipoTurnoId);
  const horasTeoricas = selectedShiftObj ? selectedShiftObj.horasTeoricas : 8;
  const horasExtraAuto = Math.max(0, horasTrabajadasCalculadas - horasTeoricas);
  const totalHorasExtra = Number(horasExtraManuales) > 0 ? Number(horasExtraManuales) : horasExtraAuto;

  const handleSubmit = (e) => {
    e.preventDefault();

    const logData = {
      fecha,
      tipoTurnoId,
      horaEntradaReal: horaEntrada,
      horaSalidaReal: horaSalida,
      horasTrabajadas: horasTrabajadasCalculadas,
      horasExtra: totalHorasExtra,
      esFestivo,
      notas
    };

    saveTimeLog(logData);
    setMensajeExito(`¡Fichaje del ${formatDateSpanish(fecha)} guardado correctamente!`);

    if (onLogSaved) onLogSaved(logData);

    setTimeout(() => {
      setMensajeExito('');
    }, 3500);
  };

  return (
    <div className="fichaje-card">
      <h2 className="fichaje-title">⚡ Registrar Fichaje / Jornada</h2>

      {periodoAsignado ? (
        <div className="periodo-badge">
          📌 Periodo de Cobro: <strong>{periodoAsignado.nombreNomina}</strong> ({formatDateSpanish(periodoAsignado.fechaInicio)} - {formatDateSpanish(periodoAsignado.fechaFin)})
        </div>
      ) : (
        <div className="periodo-badge warning">
          ⚠️ Esta fecha no está dentro de ningún período de cobro de ATH configurado.
        </div>
      )}

      {mensajeExito && <div className="alert-success">{mensajeExito}</div>}

      <form onSubmit={handleSubmit} className="fichaje-form">
        {/* Selector de Fecha */}
        <div className="form-group">
          <label htmlFor="fecha">Fecha de la jornada:</label>
          <input 
            type="date" 
            id="fecha" 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)} 
            required 
          />
        </div>

        {/* Selector de Tipo de Turno */}
        <div className="form-group">
          <label htmlFor="tipoTurno">Tipo de Turno:</label>
          <select id="tipoTurno" value={tipoTurnoId} onChange={handleShiftTypeChange}>
            {shiftTypes.map(shift => (
              <option key={shift.id} value={shift.id}>
                {shift.nombre} ({formatHoursToHHMM(shift.horasTeoricas)})
              </option>
            ))}
          </select>
        </div>

        {/* Franja Horaria Entrada / Salida */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="horaEntrada">Hora Entrada:</label>
            <input 
              type="time" 
              id="horaEntrada" 
              value={horaEntrada} 
              onChange={(e) => setHoraEntrada(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label htmlFor="horaSalida">Hora Salida:</label>
            <input 
              type="time" 
              id="horaSalida" 
              value={horaSalida} 
              onChange={(e) => setHoraSalida(e.target.value)} 
            />
          </div>
        </div>

        {/* Resumen Calculado en Vivo */}
        <div className="live-calculation-box">
          <div className="calc-item">
            <span className="calc-label">Horas Totales:</span>
            <span className="calc-value highlight">{formatHoursToHHMM(horasTrabajadasCalculadas)}</span>
          </div>
          <div className="calc-item">
            <span className="calc-label">Horas Extra:</span>
            <span className="calc-value extra">{formatHoursToHHMM(totalHorasExtra)}</span>
          </div>
        </div>

        {/* Checkbox Festivo y Ajuste Manual Extra */}
        <div className="form-row checkboxes">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={esFestivo} 
              onChange={(e) => setEsFestivo(e.target.checked)} 
            />
            <span>¿Es día festivo? (Plus Festivo)</span>
          </label>
        </div>

        {/* Campo Notas */}
        <div className="form-group">
          <label htmlFor="notas">Notas / Incidencias (Opcional):</label>
          <input 
            type="text" 
            id="notas" 
            placeholder="Ej: Cambio con compañero, retraso de 30m por servicio..." 
            value={notas} 
            onChange={(e) => setNotas(e.target.value)} 
          />
        </div>

        <button type="submit" className="submit-btn">
          💾 Guardar Fichaje
        </button>
      </form>
    </div>
  );
}
