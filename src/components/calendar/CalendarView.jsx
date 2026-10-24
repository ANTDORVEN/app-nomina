import { getSelectableShiftTypes, getDisplayShiftType, baseShiftId, shiftSelectionFields } from '../../services/customShiftService.js';
import React, { useState } from 'react';
import { MONTH_NAMES, DAY_NAMES, getMonthDaysGrid } from '../../utils/calendarUtils.js';
import { getAllTimeLogs, saveTimeLog, deleteTimeLog } from '../../services/shiftService.js';
import { previewDeletePatternInRange, deletePatternInRange } from '../../services/patternService.js';
import { formatDateSpanish, calculateWorkedHours, formatHoursToHHMM } from '../../utils/dateUtils.js';
import { generatedGuardiasToRepair, repairGeneratedGuardias } from '../../services/guardiaService.js';
import CustomPatternBuilder from './CustomPatternBuilder.jsx';
import './CalendarView.css';

/**
 * CalendarView.jsx - Vista de cuadrante con formato visual de horas 'Xh Ymin' en insignias de celdas.
 */
export default function CalendarView({ onCalendarUpdated }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Estado para modal de edición de día individual
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalShiftId, setModalShiftId] = useState('manana');
  const [modalHoraEntrada, setModalHoraEntrada] = useState('08:00');
  const [modalHoraSalida, setModalHoraSalida] = useState('16:00');
  const [modalNotas, setModalNotas] = useState('');
  const [modalCompanero, setModalCompanero] = useState('');

  const [showPatternModal, setShowPatternModal] = useState(false);
  const [repairMessage, setRepairMessage] = useState('');

  // Estado para modal de BORRADO de patrones por rango
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteEndDate, setDeleteEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteOnlyAuto, setDeleteOnlyAuto] = useState(true);
  const previewInfo = showDeleteModal && deleteStartDate && deleteEndDate
    ? previewDeletePatternInRange(deleteStartDate, deleteEndDate, deleteOnlyAuto) : null;

  const logs = getAllTimeLogs();
  const shiftTypes = getSelectableShiftTypes();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Abrir modal para editar día individual
  const handleDayClick = (dayItem) => {
    setSelectedDay(dayItem);
    const existingLog = logs.find(l => l.fecha === dayItem.dateIso);
    if (existingLog) {
      setModalShiftId(existingLog.tipoTurnoPersonalizadoId ?? existingLog.tipoTurnoId);
      setModalHoraEntrada(existingLog.horaEntradaReal || '08:00');
      setModalHoraSalida(existingLog.horaSalidaReal || '16:00');
      setModalNotas(existingLog.notas || '');
      setModalCompanero(existingLog.companeroIntercambio || '');
    } else {
      setModalShiftId('manana');
      setModalHoraEntrada('08:00');
      setModalHoraSalida('16:00');
      setModalNotas('');
      setModalCompanero('');
    }
  };

  const handleModalShiftTypeChange = (e) => {
    const sId = e.target.value;
    setModalShiftId(sId);
    const sObj = shiftTypes.find(s => s.id === sId);
    if (sObj) {
      setModalHoraEntrada(sObj.horaInicio);
      setModalHoraSalida(sObj.horaFin);
    }
  };

  const handleSaveDayShift = (e) => {
    e.preventDefault();
    if (!selectedDay) return;

    const horasCalc = baseShiftId(modalShiftId, shiftTypes) === 'guardia24' && modalHoraEntrada === modalHoraSalida ? 24 : calculateWorkedHours(modalHoraEntrada, modalHoraSalida);
    const selectedShift = shiftTypes.find(s => s.id === modalShiftId);


    let notasFinales = modalNotas;
    if (modalCompanero.trim()) {
      notasFinales = `🤝 Cambio con: ${modalCompanero.trim()}` + (modalNotas ? ` - ${modalNotas}` : '');
    }

    saveTimeLog({
      fecha: selectedDay.dateIso,
      ...shiftSelectionFields(modalShiftId, shiftTypes),
      horaEntradaReal: modalHoraEntrada,
      horaSalidaReal: modalHoraSalida,
      horasTrabajadas: horasCalc,
      horasDescansoNoPagadas: selectedShift?.horasDescansoNoPagadas ?? 0,
      esAusencia: selectedShift?.esAusencia === true,
      registroEnVivo: undefined,
      horasExtra: baseShiftId(modalShiftId, shiftTypes) === 'guardia24' ? 0 : baseShiftId(modalShiftId, shiftTypes) === 'jornada_adicional'
        ? Math.max(0, horasCalc - (selectedShift?.horasDescansoNoPagadas ?? 0))
        : Math.max(0, horasCalc - (selectedShift?.horasDescansoNoPagadas ?? 0) - 8),
      esFestivo: selectedShift?.esFestivo === true,
      esPatronAuto: false,
      notas: notasFinales,
      companeroIntercambio: modalCompanero.trim()
    });

    setSelectedDay(null);
    if (onCalendarUpdated) onCalendarUpdated();
  };

  const handleDeleteDayShift = () => {
    if (!selectedDay) return;
    deleteTimeLog(selectedDay.dateIso);
    setSelectedDay(null);
    if (onCalendarUpdated) onCalendarUpdated();
  };

  // Borrar cadencia por rango
  const handleRunDeletePattern = (e) => {
    e.preventDefault();
    if (!previewInfo || previewInfo.totalEncontrados === 0) {
      alert('No hay turnos para borrar en ese rango de fechas.');
      return;
    }

    const mensajeConfirm = deleteOnlyAuto
      ? `¿Confirmas eliminar ${previewInfo.autoGenerados} turnos de patrón automático entre ${formatDateSpanish(deleteStartDate)} y ${formatDateSpanish(deleteEndDate)}?\n(Tus fichajes manuales se respetarán).`
      : `⚠️ ATENCIÓN: Vas a borrar TODOS los turnos (${previewInfo.totalEncontrados} en total, incluidos manuales) entre ${formatDateSpanish(deleteStartDate)} y ${formatDateSpanish(deleteEndDate)}.\n¿Deseas continuar?`;

    if (window.confirm(mensajeConfirm)) {
      deletePatternInRange(deleteStartDate, deleteEndDate, deleteOnlyAuto);
      setShowDeleteModal(false);
      if (onCalendarUpdated) onCalendarUpdated();
    }
  };

  const monthGrid = getMonthDaysGrid(currentYear, currentMonth);
  const daysGrid = monthGrid.slice(0, Math.ceil((monthGrid.findLastIndex(day => day.isCurrentMonth) + 1) / 7) * 7);

  return (
    <div className="calendar-container">
      {generatedGuardiasToRepair(logs).length > 0 && <div className="live-conflict guardia-repair">
        <p>Hay {generatedGuardiasToRepair(logs).length} guardias generadas con horario o duración incorrectos. Puedes corregirlas a 24 h manteniendo su hora de entrada y poniendo la misma hora de salida al día siguiente. Los fichajes reales y las ediciones manuales se conservan.</p>
        <details><summary>Ver fechas afectadas</summary><p>{generatedGuardiasToRepair(logs).map(log => formatDateSpanish(log.fecha)).join(' · ')}</p></details>
        <button type="button" className="btn-secondary" onClick={() => {
          if (!window.confirm('¿Corregir solo estas guardias antiguas a 24 horas, conservando su hora de entrada? Se conservará una copia del registro anterior.')) return;
          try { const count = repairGeneratedGuardias(); setRepairMessage(`Corregidas ${count} guardias generadas. Fichajes reales conservados.`); onCalendarUpdated?.(); }
          catch (error) { setRepairMessage(error.message); }
        }}>Corregir guardias generadas</button>
      </div>}
      {repairMessage && <p role="status" className="live-hint">{repairMessage}</p>}
      <div className="calendar-header">
        <div className="calendar-title-box">
          <h2 className="calendar-month-title">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button className="today-btn" onClick={handleToday}>Hoy</button>
        </div>

        <div className="calendar-actions">
          <div className="nav-buttons-group">
            <button className="nav-arrow" aria-label="Mes anterior" onClick={handlePrevMonth}>‹</button>
            <button className="nav-arrow" aria-label="Mes siguiente" onClick={handleNextMonth}>›</button>
          </div>
        </div>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map(dayName => (
          <div key={dayName} className="weekday-header">{dayName}</div>
        ))}

        {daysGrid.map((dayItem, index) => {
          const logForDay = logs.find(l => l.fecha === dayItem.dateIso);
          const shiftObj = logForDay 
            ? (getDisplayShiftType(logForDay, shiftTypes) || { nombre: logForDay.tipoTurnoId, nombreCorto: logForDay.tipoTurnoId, color: '#805ad5' })
            : null;
          const isToday = dayItem.dateIso === new Date().toISOString().split('T')[0];

          return (
            <button type="button"
              key={index} 
              className={`calendar-day-cell ${!dayItem.isCurrentMonth ? 'outside-month' : ''} ${isToday ? 'is-today' : ''} ${shiftObj ? (logForDay.tipoTurnoId === 'libre' ? 'rest-day' : 'scheduled-day') : ''}`}
              style={{ '--shift-color': shiftObj?.color }}
              aria-label={`${formatDateSpanish(dayItem.dateIso)}: ${shiftObj?.nombre ?? 'sin turno registrado'}`}
              onClick={() => handleDayClick(dayItem)}
            >
              <span className="day-number">{dayItem.dayNumber}</span>
              
              {shiftObj && dayItem.isCurrentMonth && (
                <div 
                  className="day-shift-badge" 

                >
                  <span className="shift-name-short">{logForDay.tipoTurnoId === 'guardia24' && !shiftObj.esPersonalizado ? formatHoursToHHMM(logForDay.horasTrabajadas) : shiftObj.nombreCorto || shiftObj.nombre}</span>
                  {logForDay.horasTrabajadas > 0 && logForDay.tipoTurnoId !== 'guardia24' && (
                    <span className="shift-hours">{formatHoursToHHMM(logForDay.horasTrabajadas)}</span>
                  )}
                </div>
              )}

              {logForDay && logForDay.companeroIntercambio && (
                <span className="exchange-tag" title={`Intercambiado con ${logForDay.companeroIntercambio}`}>
                  🤝 {logForDay.companeroIntercambio}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <details className="disclosure-panel calendar-tools"><summary><span>Organizar turnos<small>Crear tu ciclo, añadir ausencias o borrar una cadencia</small></span></summary><div className="disclosure-body calendar-actions">
          <button className="pattern-btn" onClick={() => setShowPatternModal(true)}>
            Crear cuadrante desde cero
          </button>
          <button className="pattern-btn delete-cadence-btn" onClick={() => setShowDeleteModal(true)}>
            🗑️ Borrar Cadencia
          </button>
      </div></details>
      {/* Leyenda con abreviaturas y nombres completos */}
      <details className="calendar-legend-panel">
        <summary>Colores y tipos de turno</summary>
        <div className="calendar-legend">
        {shiftTypes.map(st => (
          <span key={st.id} className="legend-item" title={st.nombre}>
            <span className="legend-color" style={{ backgroundColor: st.color }}></span>
            <strong>{st.nombreCorto || st.nombre}</strong>
            <span className="legend-full-name">({st.nombre})</span>
          </span>
        ))}
        </div>
      </details>

      {/* MODAL 1: Editar Día Individual */}
      {selectedDay && (
        <div className="modal-backdrop" onClick={() => setSelectedDay(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Ajustar Turno / Ausencia: {formatDateSpanish(selectedDay.dateIso)}</h3>
              <button className="modal-close" onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            
            {baseShiftId(modalShiftId, shiftTypes) === 'guardia24' && <p className="live-hint">Con ambas horas iguales se guardan 24 h, con salida al día siguiente.</p>}
            <form onSubmit={handleSaveDayShift} className="modal-form">
              <div className="form-group">
                <label>Tipo de Turno / Ausencia:</label>
                <select value={modalShiftId} onChange={handleModalShiftTypeChange}>
                  {shiftTypes.map(st => (
                    <option key={st.id} value={st.id}>{st.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hora Entrada:</label>
                  <input 
                    type="time" 
                    value={modalHoraEntrada} 
                    onChange={e => setModalHoraEntrada(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Hora Salida:</label>
                  <input 
                    type="time" 
                    value={modalHoraSalida} 
                    onChange={e => setModalHoraSalida(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>🤝 Intercambio de Guardia (Opcional):</label>
                <input 
                  type="text" 
                  placeholder="Ej: Juan Pérez (me cubre este turno)" 
                  value={modalCompanero}
                  onChange={e => setModalCompanero(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Notas / Observaciones:</label>
                <input 
                  type="text" 
                  placeholder="Ej: Cambio de ruta, justificante medico..." 
                  value={modalNotas}
                  onChange={e => setModalNotas(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedDay(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn-secondary" onClick={handleDeleteDayShift}>
                  🗑️ Borrar Día
                </button>
                <button type="submit" className="btn-primary">
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPatternModal && <div className="modal-backdrop" onClick={() => setShowPatternModal(false)}>
        <div className="modal-content custom-pattern-modal" onClick={event => event.stopPropagation()}>
          <div className="modal-header"><h3>Crear mi cuadrante desde cero</h3><button type="button" className="modal-close" aria-label="Cerrar creador de cuadrante" onClick={() => setShowPatternModal(false)}>✕</button></div>
          <CustomPatternBuilder onApplied={onCalendarUpdated} onClose={() => setShowPatternModal(false)} />
        </div>
      </div>}

      {/* MODAL 3: Borrar Cadencia por Rango */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Borrar Cadencia por Rango de Fechas</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRunDeletePattern} className="modal-form">
              <p className="modal-desc">
                Elimina una rotación o periodo de ausencias proyectado previamente.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha Inicio:</label>
                  <input 
                    type="date" 
                    value={deleteStartDate} 
                    onChange={e => setDeleteStartDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Fecha Fin:</label>
                  <input 
                    type="date" 
                    value={deleteEndDate} 
                    onChange={e => setDeleteEndDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={deleteOnlyAuto} 
                    onChange={e => setDeleteOnlyAuto(e.target.checked)} 
                  />
                  <span>🛡️ Proteger mis fichajes manuales (solo borrar turnos generados por patrón)</span>
                </label>
              </div>

              {previewInfo && (
                <div className="preview-impact-box">
                  📊 <strong>Resumen de turnos a eliminar:</strong>
                  <ul>
                    <li>Turnos de Patrón Automático: <strong>{previewInfo.autoGenerados}</strong></li>
                    {!deleteOnlyAuto && <li>Fichajes Manuales: <strong>{previewInfo.manuales}</strong> (⚠️ Se borrarán)</li>}
                    <li>Total a eliminar: <strong>{deleteOnlyAuto ? previewInfo.autoGenerados : previewInfo.totalEncontrados} turnos</strong></li>
                  </ul>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary danger-btn"
                  disabled={!previewInfo || (deleteOnlyAuto ? previewInfo.autoGenerados === 0 : previewInfo.totalEncontrados === 0)}
                >
                  🗑️ Confirmar y Borrar Cadencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
