import React, { useState } from 'react';
import { getConfig, saveConfig, getAllTimeLogs, getPayrollPeriods, getShiftTypes } from '../../services/shiftService.js';
import { setStorageItem, STORAGE_KEYS } from '../../services/storageService.js';
import './ConfigView.css';

/**
 * ConfigView.jsx - Ajuste de precios de hora, pluses, edición de horarios por turno y backup JSON.
 */
export default function ConfigView({ onConfigSaved }) {
  const currentConfig = getConfig();
  const [shiftTypes, setShiftTypes] = useState(getShiftTypes());

  const [precioOrdinaria, setPrecioOrdinaria] = useState(currentConfig.precioHoraOrdinaria);
  const [precioExtra, setPrecioExtra] = useState(currentConfig.precioHoraExtra);
  const [plusNocturnidad, setPlusNocturnidad] = useState(currentConfig.plusNocturnidadHora);
  const [plusFestivo, setPlusFestivo] = useState(currentConfig.plusFestivoDia);
  const [mensaje, setMensaje] = useState('');

  // Actualizar un campo de horario de un tipo de turno
  const handleShiftTypeTimeChange = (id, field, value) => {
    const updated = shiftTypes.map(st => {
      if (st.id === id) {
        return { ...st, [field]: value };
      }
      return st;
    });
    setShiftTypes(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Guardar precios
    const updatedConfig = {
      ...currentConfig,
      precioHoraOrdinaria: Number(precioOrdinaria),
      precioHoraExtra: Number(precioExtra),
      plusNocturnidadHora: Number(plusNocturnidad),
      plusFestivoDia: Number(plusFestivo)
    };
    saveConfig(updatedConfig);

    // Guardar horarios por defecto de los turnos (Punto 1 y 2)
    setStorageItem(STORAGE_KEYS.SHIFT_TYPES, shiftTypes);

    setMensaje('¡Configuración de tarifas y horarios de turnos actualizada!');
    if (onConfigSaved) onConfigSaved();

    setTimeout(() => setMensaje(''), 3500);
  };

  // Exportar copia de seguridad en JSON
  const handleExportBackup = () => {
    const backupData = {
      config: getConfig(),
      periods: getPayrollPeriods(),
      shiftTypes: getShiftTypes(),
      timeLogs: getAllTimeLogs(),
      exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tes_nomina_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar copia de seguridad
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.config) setStorageItem(STORAGE_KEYS.CONFIG, imported.config);
        if (imported.periods) setStorageItem(STORAGE_KEYS.PERIODS, imported.periods);
        if (imported.shiftTypes) setStorageItem(STORAGE_KEYS.SHIFT_TYPES, imported.shiftTypes);
        if (imported.timeLogs) setStorageItem(STORAGE_KEYS.TIME_LOGS, imported.timeLogs);

        alert('¡Copia de seguridad restaurada con éxito!');
        window.location.reload();
      } catch (err) {
        alert('Error al leer el archivo JSON de copia de seguridad.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="config-container">
      <h2 className="config-title">⚙️ Configuración Económica & Horarios de Turnos</h2>
      <p className="config-subtitle">
        Personaliza los horarios de tus turnos (ej. Mañana 07:00-15:00) y las horas de descanso no pagadas.
      </p>

      {mensaje && <div className="alert-success">{mensaje}</div>}

      <form onSubmit={handleSubmit} className="config-form">
        {/* Tarifas de Nómina */}
        <h3 className="section-subtitle">💶 Tarifas e Importes por Hora</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Precio Hora Ordinaria (€/h):</label>
            <input 
              type="number" 
              step="0.01" 
              value={precioOrdinaria} 
              onChange={e => setPrecioOrdinaria(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Precio Hora Extra (€/h):</label>
            <input 
              type="number" 
              step="0.01" 
              value={precioExtra} 
              onChange={e => setPrecioExtra(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Plus Nocturnidad (€/h noche):</label>
            <input 
              type="number" 
              step="0.01" 
              value={plusNocturnidad} 
              onChange={e => setPlusNocturnidad(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Plus Festivo (€/día festivo):</label>
            <input 
              type="number" 
              step="0.01" 
              value={plusFestivo} 
              onChange={e => setPlusFestivo(e.target.value)} 
              required 
            />
          </div>
        </div>

        {/* Horarios por defecto de los turnos (Punto 1 y 2) */}
        <h3 className="section-subtitle">⏱️ Horarios por Defecto de los Tipos de Turno</h3>
        <p className="section-desc">Ajusta la hora de inicio y fin de cada turno para adaptarlo a tus horarios reales de servicio.</p>

        <div className="shift-types-editor">
          {shiftTypes.map(st => (
            <div key={st.id} className="shift-type-row">
              <div className="shift-type-name">
                <span className="color-dot" style={{ backgroundColor: st.color }}></span>
                <strong>{st.nombre}</strong>
              </div>

              <div className="shift-type-inputs">
                <label>
                  Entrada:
                  <input 
                    type="time" 
                    value={st.horaInicio || '08:00'}
                    onChange={e => handleShiftTypeTimeChange(st.id, 'horaInicio', e.target.value)}
                  />
                </label>

                <label>
                  Salida:
                  <input 
                    type="time" 
                    value={st.horaFin || '16:00'}
                    onChange={e => handleShiftTypeTimeChange(st.id, 'horaFin', e.target.value)}
                  />
                </label>

                <label>
                  Descanso no pagado (h):
                  <input 
                    type="number" 
                    step="0.5"
                    min="0"
                    max="5"
                    value={st.horasDescansoNoPagadas || 0}
                    onChange={e => handleShiftTypeTimeChange(st.id, 'horasDescansoNoPagadas', Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="save-config-btn">
          💾 Guardar Tarifas y Horarios
        </button>
      </form>

      {/* Copias de seguridad */}
      <div className="backup-section">
        <h3 className="backup-title">📦 Copia de Seguridad y Respaldos</h3>
        <p className="backup-desc">
          Exporta tus fichajes y turnos a un archivo JSON para tenerlos a salvo o pasarlos a otro dispositivo.
        </p>

        <div className="backup-buttons">
          <button type="button" className="btn-backup-export" onClick={handleExportBackup}>
            ⬇️ Exportar Copia de Seguridad (JSON)
          </button>

          <label className="btn-backup-import">
            ⬆️ Importar Copia de Seguridad
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
  );
}
