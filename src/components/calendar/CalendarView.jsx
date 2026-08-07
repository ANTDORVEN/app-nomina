import React, { useState, useEffect } from 'react';
import { MONTH_NAMES, DAY_NAMES, getMonthDaysGrid } from '../../utils/calendarUtils.js';
import { getAllTimeLogs, getShiftTypes, saveTimeLog, deleteTimeLog } from '../../services/shiftService.js';
import { generateGuardias24hPattern, generateLunesViernesPattern, generateFinDeSemanaAlternoPattern, generateAusenciaPattern, previewDeletePatternInRange, deletePatternInRange } from '../../services/patternService.js';
import { formatDateSpanish, calculateWorkedHours } from '../../utils/dateUtils.js';
import './CalendarView.css';

/**
 * CalendarView.jsx - Vista de cuadrante con solución al bug del horario en generador de patrones y responsive móvil.
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

  // Estado para modal de generador de patrones
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternType, setPatternType] = useState('guardia24');
  const [patternStartDate, setPatternStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [patternDurationMode, setPatternDurationMode] = useState('rango');
  const [patternMonths, setPatternMonths] = useState(1);
  const [patternEndDate, setPatternEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Opciones específicas para patrones L-V, Fin de semana alterno y Ausencias
  const [lvShiftId, setLvShiftId] = useState('manana');
  const [weekendDay, setWeekendDay] = useState('sabado');
  const [ausenciaTypeId, setAusenciaTypeId] = useState('vacaciones');

  // Horarios de entrada y salida editables para el generador masivo
  const [patternStartTime, setPatternStartTime] = useState('08:00');
  const [patternEndTime, setPatternEndTime] = useState('16:00');

  // Estado para modal de BORRADO de patrones por rango
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteEndDate, setDeleteEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteOnlyAuto, setDeleteOnlyAuto] = useState(true);
  const [previewInfo, setPreviewInfo] = useState(null);

  const logs = getAllTimeLogs();
  const shiftTypes = getShiftTypes();

  // Cambio de tipo de patrón -> Sugerir horarios iniciales solo al cambiar el select
  const handlePatternCategoryChange = (e) => {
    const pType = e.target.value;
    setPatternType(pType);

    if (pType === 'guardia24') {
      const gShift = shiftTypes.find(s => s.id === 'guardia24');
      setPatternStartTime(gShift ? gShift.horaInicio : '08:00');
      setPatternEndTime(gShift ? gShift.horaFin : '08:00');
    } else if (pType === 'lunes_viernes') {
      const sObj = shiftTypes.find(s => s.id === lvShiftId);
      setPatternStartTime(sObj ? sObj.horaInicio : '07:00');
      setPatternEndTime(sObj ? sObj.horaFin : '15:00');
    } else if (pType === 'fin_semana_alterno') {
      const sabShift = shiftTypes.find(s => s.id === 'sabado_alterno');
      setPatternStartTime(sabShift ? sabShift.horaInicio : '08:00');
      setPatternEndTime(sabShift ? sabShift.horaFin : '16:00');
    } else if (pType === 'ausencias') {
      setPatternStartTime('00:00');
      setPatternEndTime('00:00');
    }
  };

  const handleLvShiftChange = (e) => {
    const sId = e.target.value;
    setLvShiftId(sId);
    const sObj = shiftTypes.find(s => s.id === sId);
    if (sObj) {
      setPatternStartTime(sObj.horaInicio);
      setPatternEndTime(sObj.horaFin);
    }
  };

  // Actualizar vista previa de borrado
  useEffect(() => {
    if (showDeleteModal && deleteStartDate && deleteEndDate) {
      const info = previewDeletePatternInRange(deleteStartDate, deleteEndDate, deleteOnlyAuto);
      setPreviewInfo(info);
    }
  }, [showDeleteModal, deleteStartDate, deleteEndDate, deleteOnlyAuto, logs]);

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
      setModalShiftId(existingLog.tipoTurnoId);
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

    const horasCalc = calculateWorkedHours(modalHoraEntrada, modalHoraSalida);
    const selectedShift = shiftTypes.find(s => s.id === modalShiftId);
    const horasTeoricas = selectedShift ? selectedShift.horasTeoricas : 8;

    let notasFinales = modalNotas;
    if (modalCompanero.trim()) {
      notasFinales = `🤝 Cambio con: ${modalCompanero.trim()}` + (modalNotas ? ` - ${modalNotas}` : '');
    }

    saveTimeLog({
      fecha: selectedDay.dateIso,
      tipoTurnoId: modalShiftId,
      horaEntradaReal: modalHoraEntrada,
      horaSalidaReal: modalHoraSalida,
      horasTrabajadas: horasCalc,
      horasExtra: Math.max(0, horasCalc - horasTeoricas),
      esFestivo: modalShiftId === 'festivo',
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

  // Ejecutar generador de patrones (Turnos o Ausencias) con horarios personalizados respetados
  const handleRunPatternGenerator = (e) => {
    e.preventDefault();

    const customEndDate = patternDurationMode === 'rango' ? patternEndDate : null;
    const months = patternDurationMode === 'meses' ? Number(patternMonths) : null;

    if (patternType === 'guardia24') {
      generateGuardias24hPattern(patternStartDate, months, customEndDate, patternStartTime, patternEndTime);
    } else if (patternType === 'lunes_viernes') {
      generateLunesViernesPattern(patternStartDate, months, customEndDate, lvShiftId, patternStartTime, patternEndTime);
    } else if (patternType === 'fin_semana_alterno') {
      generateFinDeSemanaAlternoPattern(
        patternStartDate,
        months,
        customEndDate,
        weekendDay,
        patternStartTime,
        patternEndTime
      );
    } else if (patternType === 'ausencias') {
      generateAusenciaPattern(patternStartDate, months, customEndDate, ausenciaTypeId);
    }

    setShowPatternModal(false);
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

  const daysGrid = getMonthDaysGrid(currentYear, currentMonth);

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title-box">
          <h2 className="calendar-month-title">
            🗓️ {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button className="today-btn" onClick={handleToday}>Hoy</button>
        </div>

        <div className="calendar-actions">
          <button className="pattern-btn" onClick={() => setShowPatternModal(true)}>
            ⚡ Generar Patrón / Ausencia
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

      {/* Leyenda con abreviaturas y nombres completos */}
      <div className="calendar-legend">
        {shiftTypes.map(st => (
          <span key={st.id} className="legend-item" title={st.nombre}>
            <span className="legend-color" style={{ backgroundColor: st.color }}></span>
            <strong>{st.nombreCorto || st.nombre}</strong>
            <span className="legend-full-name">({st.nombre})</span>
          </span>
        ))}
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map(dayName => (
          <div key={dayName} className="weekday-header">{dayName}</div>
        ))}

        {daysGrid.map((dayItem, index) => {
          const logForDay = logs.find(l => l.fecha === dayItem.dateIso);
          const shiftObj = logForDay 
            ? (shiftTypes.find(s => s.id === logForDay.tipoTurnoId) || { nombre: logForDay.tipoTurnoId, nombreCorto: logForDay.tipoTurnoId, color: '#805ad5' }) 
            : null;
          const isToday = dayItem.dateIso === new Date().toISOString().split('T')[0];

          const tooltipText = logForDay && shiftObj 
            ? `${shiftObj.nombre}${logForDay.notas ? ` • ${logForDay.notas}` : ''}`
            : (shiftObj ? shiftObj.nombre : '');

          return (
            <div 
              key={index} 
              className={`calendar-day-cell ${!dayItem.isCurrentMonth ? 'outside-month' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => handleDayClick(dayItem)}
              title={tooltipText}
            >
              <span className="day-number">{dayItem.dayNumber}</span>
              
              {shiftObj && (
                <div 
                  className="day-shift-badge" 
                  style={{ backgroundColor: shiftObj.color }}
                >
                  <span className="shift-name-short">{shiftObj.nombreCorto || shiftObj.nombre}</span>
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
              <h3>📅 Ajustar Turno / Ausencia: {formatDateSpanish(selectedDay.dateIso)}</h3>
              <button className="modal-close" onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            
            <form onSubmit={handleSaveDayShift} className="modal-form">
              <div className="form-group">
                <label>Tipo de Turno / Ausencia:</label>
                <select value={modalShiftId} onChange={handleModalShiftTypeChange}>
                  {shiftTypes.map(st => (
                    <option key={st.id} value={st.id}>{st.nombre} ({st.nombreCorto})</option>
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

      {/* MODAL 2: Generador de Patrones / Ausencias */}
      {showPatternModal && (
        <div className="modal-backdrop" onClick={() => setShowPatternModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚡ Generar Patrón Rotativo / Ausencia</h3>
              <button className="modal-close" onClick={() => setShowPatternModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRunPatternGenerator} className="modal-form">
              <div className="form-group">
                <label>Categoría de Patrón:</label>
                <select value={patternType} onChange={handlePatternCategoryChange}>
                  <option value="guardia24">Guardia 24h + 3 Días de Descanso (Rotativo 24/72)</option>
                  <option value="lunes_viernes">Turno Lunes a Viernes Fijo (Mañana / Tarde / Noche)</option>
                  <option value="fin_semana_alterno">Fin de Semana Alterno (Horario Personalizado)</option>
                  <option value="ausencias">🌴 Periodo de Ausencia (Vacaciones, Bajas, Moscosos)</option>
                </select>
              </div>

              {/* Si es Ausencia */}
              {patternType === 'ausencias' && (
                <div className="form-group">
                  <label>Selecciona el tipo de ausencia:</label>
                  <select value={ausenciaTypeId} onChange={e => setAusenciaTypeId(e.target.value)}>
                    <option value="vacaciones">🌴 Vacaciones (Vac.)</option>
                    <option value="baja_laboral">🏥 Baja Laboral / Médica (B. Méd)</option>
                    <option value="paternidad_maternidad">👶 Baja Paternidad / Maternidad (B. Pat)</option>
                    <option value="asuntos_propios">💼 Asuntos Propios / Moscoso (A.P.)</option>
                  </select>
                </div>
              )}

              {/* Si es Turno Lunes a Viernes */}
              {patternType === 'lunes_viernes' && (
                <div className="form-group">
                  <label>Selecciona el turno de Lunes a Viernes:</label>
                  <select value={lvShiftId} onChange={handleLvShiftChange}>
                    <option value="manana">Mañana (M)</option>
                    <option value="tarde">Tarde (T)</option>
                    <option value="noche">Noche (N)</option>
                    <option value="turno12">Turno 12h (12h)</option>
                  </select>
                </div>
              )}

              {/* Si es Fin de Semana Alterno */}
              {patternType === 'fin_semana_alterno' && (
                <div className="form-group">
                  <label>Elegir día de fin de semana alterno:</label>
                  <select value={weekendDay} onChange={e => setWeekendDay(e.target.value)}>
                    <option value="sabado">Sábado Alterno (S. Alt)</option>
                    <option value="domingo">Domingo Alterno (Fest.)</option>
                  </select>
                </div>
              )}

              {/* Campos Editables de Hora Entrada / Salida (solo si NO es ausencia) */}
              {patternType !== 'ausencias' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Hora Entrada para el patrón:</label>
                    <input 
                      type="time" 
                      value={patternStartTime} 
                      onChange={e => setPatternStartTime(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora Salida para el patrón:</label>
                    <input 
                      type="time" 
                      value={patternEndTime} 
                      onChange={e => setPatternEndTime(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Selector de Modo de Duración */}
              <div className="form-group">
                <label>Modo de Proyección:</label>
                <div className="toggle-mode-group">
                  <button 
                    type="button" 
                    className={`toggle-mode-btn ${patternDurationMode === 'rango' ? 'active' : ''}`}
                    onClick={() => setPatternDurationMode('rango')}
                  >
                    📆 Rango Personalizado
                  </button>
                  <button 
                    type="button" 
                    className={`toggle-mode-btn ${patternDurationMode === 'meses' ? 'active' : ''}`}
                    onClick={() => setPatternDurationMode('meses')}
                  >
                    📅 Bloque por Meses
                  </button>
                </div>
              </div>

              {/* Fecha Inicio */}
              <div className="form-group">
                <label>Fecha Inicio:</label>
                <input 
                  type="date" 
                  value={patternStartDate}
                  onChange={e => setPatternStartDate(e.target.value)}
                  required
                />
              </div>

              {patternDurationMode === 'meses' ? (
                <div className="form-group">
                  <label>Proyectar a cuántos meses vista:</label>
                  <select value={patternMonths} onChange={e => setPatternMonths(e.target.value)}>
                    <option value={1}>1 Mes</option>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses (Recomendado)</option>
                    <option value={12}>1 Año Completo</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Fecha Fin del Patrón / Ausencia:</label>
                  <input 
                    type="date" 
                    value={patternEndDate}
                    onChange={e => setPatternEndDate(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPatternModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  🚀 Generar Cuadrante / Ausencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
