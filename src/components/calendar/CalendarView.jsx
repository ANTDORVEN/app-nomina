import React, { useState, useEffect } from 'react';
import { MONTH_NAMES, DAY_NAMES, getMonthDaysGrid } from '../../utils/calendarUtils.js';
import { getAllTimeLogs, getShiftTypes, saveTimeLog, deleteTimeLog } from '../../services/shiftService.js';
import { generateGuardias24hPattern, generateSabadosAlternosPattern, previewDeletePatternInRange, deletePatternInRange } from '../../services/patternService.js';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './CalendarView.css';

/**
 * CalendarView.jsx - Vista de cuadrante interactivo con generador y borrador de cadencias por rango.
 */
export default function CalendarView({ onCalendarUpdated }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Estado para modal de edición de día individual
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalShiftId, setModalShiftId] = useState('manana');
  const [modalNotas, setModalNotas] = useState('');
  const [modalCompanero, setModalCompanero] = useState('');

  // Estado para modal de generador de patrones
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternType, setPatternType] = useState('guardia24');
  const [patternStartDate, setPatternStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [patternMonths, setPatternMonths] = useState(6);

  // Estado para modal de BORRADO de patrones por rango
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteEndDate, setDeleteEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteOnlyAuto, setDeleteOnlyAuto] = useState(true);
  const [previewInfo, setPreviewInfo] = useState(null);

  const logs = getAllTimeLogs();
  const shiftTypes = getShiftTypes();

  // Actualizar vista previa cuando cambien las fechas de borrado o el switch
  useEffect(() => {
    if (showDeleteModal && deleteStartDate && deleteEndDate) {
      const info = previewDeletePatternInRange(deleteStartDate, deleteEndDate, deleteOnlyAuto);
      setPreviewInfo(info);
    }
  }, [showDeleteModal, deleteStartDate, deleteEndDate, deleteOnlyAuto, logs]);

  // Cambiar de mes
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

  // Abrir modal de edición para un día concreto
  const handleDayClick = (dayItem) => {
    setSelectedDay(dayItem);
    const existingLog = logs.find(l => l.fecha === dayItem.dateIso);
    if (existingLog) {
      setModalShiftId(existingLog.tipoTurnoId);
      setModalNotas(existingLog.notas || '');
      setModalCompanero(existingLog.companeroIntercambio || '');
    } else {
      setModalShiftId('manana');
      setModalNotas('');
      setModalCompanero('');
    }
  };

  // Guardar turno del día seleccionado
  const handleSaveDayShift = (e) => {
    e.preventDefault();
    if (!selectedDay) return;

    const selectedShift = shiftTypes.find(s => s.id === modalShiftId);
    const horasTeoricas = selectedShift ? selectedShift.horasTeoricas : 8;

    let notasFinales = modalNotas;
    if (modalCompanero.trim()) {
      notasFinales = `🤝 Cambio con: ${modalCompanero.trim()}` + (modalNotas ? ` - ${modalNotas}` : '');
    }

    saveTimeLog({
      fecha: selectedDay.dateIso,
      tipoTurnoId: modalShiftId,
      horaEntradaReal: selectedShift ? selectedShift.horaInicio : '08:00',
      horaSalidaReal: selectedShift ? selectedShift.horaFin : '16:00',
      horasTrabajadas: horasTeoricas,
      horasExtra: 0,
      esFestivo: modalShiftId === 'festivo',
      esPatronAuto: false, // Fichaje manual
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

  // Ejecutar generador de patrones
  const handleRunPatternGenerator = (e) => {
    e.preventDefault();
    if (patternType === 'guardia24') {
      generateGuardias24hPattern(patternStartDate, Number(patternMonths));
    } else if (patternType === 'sabado_alterno') {
      generateSabadosAlternosPattern(patternStartDate, Number(patternMonths));
    }
    setShowPatternModal(false);
    if (onCalendarUpdated) onCalendarUpdated();
  };

  // Ejecutar borrado de cadencia con confirmación previa
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

  const daysGrid = getMonthDaysGrid(currentYear, currentMonth);

  return (
    <div className="calendar-container">
      {/* Controles de Navegación del Calendario */}
      <div className="calendar-header">
        <div className="calendar-title-box">
          <h2 className="calendar-month-title">
            🗓️ {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button className="today-btn" onClick={handleToday}>Hoy</button>
        </div>

        <div className="calendar-actions">
          <button className="pattern-btn" onClick={() => setShowPatternModal(true)}>
            ⚡ Generar Patrón
          </button>
          <button className="pattern-btn delete-cadence-btn" onClick={() => setShowDeleteModal(true)}>
            🗑️ Borrar Cadencia
          </button>
          <div className="nav-buttons-group">
            <button className="nav-arrow" onClick={handlePrevMonth}>◀</button>
            <button className="nav-arrow" onClick={handleNextMonth}>▶</button>
          </div>
        </div>
      </div>

      {/* Leyenda de Colores de Turnos */}
      <div className="calendar-legend">
        {shiftTypes.map(st => (
          <span key={st.id} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: st.color }}></span>
            {st.nombre}
          </span>
        ))}
      </div>

      {/* Cuadrícula de 7 Columnas */}
      <div className="calendar-grid">
        {DAY_NAMES.map(dayName => (
          <div key={dayName} className="weekday-header">{dayName}</div>
        ))}

        {daysGrid.map((dayItem, index) => {
          const logForDay = logs.find(l => l.fecha === dayItem.dateIso);
          const shiftObj = logForDay ? shiftTypes.find(s => s.id === logForDay.tipoTurnoId) : null;
          const isToday = dayItem.dateIso === new Date().toISOString().split('T')[0];

          return (
            <div 
              key={index} 
              className={`calendar-day-cell ${!dayItem.isCurrentMonth ? 'outside-month' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => handleDayClick(dayItem)}
            >
              <span className="day-number">{dayItem.dayNumber}</span>
              
              {shiftObj && (
                <div 
                  className="day-shift-badge" 
                  style={{ backgroundColor: shiftObj.color }}
                  title={logForDay.notas || shiftObj.nombre}
                >
                  <span className="shift-name-short">{shiftObj.nombre}</span>
                  {logForDay.horasTrabajadas > 0 && (
                    <span className="shift-hours">{logForDay.horasTrabajadas}h</span>
                  )}
                </div>
              )}

              {logForDay && logForDay.companeroIntercambio && (
                <span className="exchange-tag" title={`Intercambiado con ${logForDay.companeroIntercambio}`}>
                  🤝 {logForDay.companeroIntercambio}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Editar Día Individual */}
      {selectedDay && (
        <div className="modal-backdrop" onClick={() => setSelectedDay(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Editar Turno: {formatDateSpanish(selectedDay.dateIso)}</h3>
              <button className="modal-close" onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            
            <form onSubmit={handleSaveDayShift} className="modal-form">
              <div className="form-group">
                <label>Tipo de Turno:</label>
                <select value={modalShiftId} onChange={e => setModalShiftId(e.target.value)}>
                  {shiftTypes.map(st => (
                    <option key={st.id} value={st.id}>{st.nombre} ({st.horasTeoricas}h)</option>
                  ))}
                </select>
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
                  placeholder="Ej: Cambio de base, retención en urgencias..." 
                  value={modalNotas}
                  onChange={e => setModalNotas(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleDeleteDayShift}>
                  🗑️ Borrar Turno
                </button>
                <button type="submit" className="btn-primary">
                  💾 Guardar Día
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Generador de Patrones */}
      {showPatternModal && (
        <div className="modal-backdrop" onClick={() => setShowPatternModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚡ Generar Patrón Rotativo</h3>
              <button className="modal-close" onClick={() => setShowPatternModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRunPatternGenerator} className="modal-form">
              <div className="form-group">
                <label>Selecciona el tipo de patrón rotativo:</label>
                <select value={patternType} onChange={e => setPatternType(e.target.value)}>
                  <option value="guardia24">Guardia 24h + 3 Días de Descanso (Rotativo 24/72)</option>
                  <option value="sabado_alterno">Sábados Alternos (1 Sábado Sí / 1 Sábado No)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Fecha de la primera guardia o sábado a trabajar:</label>
                <input 
                  type="date" 
                  value={patternStartDate}
                  onChange={e => setPatternStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Proyectar a cuántos meses vista:</label>
                <select value={patternMonths} onChange={e => setPatternMonths(e.target.value)}>
                  <option value={3}>3 Meses</option>
                  <option value={6}>6 Meses (Recomendado)</option>
                  <option value={12}>1 Año Completo</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPatternModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  🚀 Generar Cuadrante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Borrar Cadencia por Rango con Vista Previa */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Borrar Cadencia por Rango de Fechas</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRunDeletePattern} className="modal-form">
              <p className="modal-desc">
                Elimina una rotación proyectada previamente cuando cambies de turno a mitad de año.
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

              {/* Vista Previa de Impacto */}
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
