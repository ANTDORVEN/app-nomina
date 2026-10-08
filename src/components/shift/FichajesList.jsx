import React, { useState } from 'react';
import { formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import { getShiftTypes, deleteTimeLog } from '../../services/shiftService.js';
import './FichajesList.css';
import FichajeEditor from './FichajeEditor.jsx';

/**
 * FichajesList.jsx - Listado de turnos fichados en el período seleccionado con formato visual 'Xh Ymin'.
 */
export default function FichajesList({ logs, onDeleteLog, onLogUpdated }) {
  const shiftTypes = getShiftTypes();
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  if (!logs || logs.length === 0) {
    return (
      <div className="fichajes-list-empty">
        <p>📭 No hay ningún fichaje registrado en este período todavía.</p>
      </div>
    );
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Seguro que quieres borrar este fichaje?')) {
      deleteTimeLog(id);
      if (onDeleteLog) onDeleteLog(id);
    }
  };

  return (
    <div className="fichajes-list-container">
      <h3 className="list-title">📋 Registro de Fichajes en este Periodo</h3>
      {message && <p className="log-save-message" role="status">{message}</p>}
      <div className="logs-grid">
        {logs.map(log => {
          const shiftObj = shiftTypes.find(s => s.id === log.tipoTurnoId);
          const badgeColor = shiftObj ? shiftObj.color : '#64748b';
          const shiftName = shiftObj ? shiftObj.nombre : log.tipoTurnoId;

          return (
            <div key={log.id || log.fecha} className="log-card">
              {editingId === (log.id || log.fecha) ? (
                <FichajeEditor log={log} shiftTypes={shiftTypes}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    setMessage(`Cambios guardados en la jornada del ${formatDateSpanish(log.fecha)}.`);
                    onLogUpdated?.();
                  }} />
              ) : <>
              <div className="log-card-header">
                <span className="log-date">{formatDateSpanish(log.fecha)}</span>
                <span 
                  className="shift-badge" 
                  style={{ backgroundColor: badgeColor }}
                >
                  {shiftName}
                </span>
              </div>

              <div className="log-card-body">
                <div className="log-hours">
                  <span>⏱️ {log.horaEntradaReal || '08:00'} - {log.horaSalidaReal || '16:00'}</span>
                  <strong>{formatHoursToHHMM(log.horasTrabajadas)} totales</strong>
                </div>

                {log.horasExtra > 0 && (
                  <span className="tag extra-tag">+{formatHoursToHHMM(log.horasExtra)} Extra</span>
                )}
                {log.tipoTurnoId === 'jornada_adicional' && (
                  <span className="tag extra-tag">Jornada adicional: pago completo</span>
                )}
                {log.esFestivo && (
                  <span className="tag festivo-tag">Festivo</span>
                )}
                {log.registroEnVivo && <p className="log-notes">Pausas registradas: {formatHoursToHHMM(log.registroEnVivo.pauses.reduce((total, pause) => total + (pause.end - pause.start), 0) / 3600000)} · Descontadas: {formatHoursToHHMM(log.horasDescansoNoPagadas ?? 0)}</p>}

                {log.notas && (
                  <p className="log-notes">📝 {log.notas}</p>
                )}
              </div>

              <div className="log-actions">
              <button type="button" aria-label={`Editar fichaje del ${formatDateSpanish(log.fecha)}`}
                onClick={() => { setMessage(''); setEditingId(log.id || log.fecha); }}>Editar</button>
              <button type="button"
                className="log-delete-btn"
                onClick={() => handleDelete(log.id || log.fecha)}
                title="Eliminar fichaje"
              >
                Eliminar
              </button>
              </div>
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
