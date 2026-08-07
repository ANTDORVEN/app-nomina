import React, { useState } from 'react';
import { getConfig, saveConfig, getAllTimeLogs, getPayrollPeriods, getShiftTypes } from '../../services/shiftService.js';
import { setStorageItem, STORAGE_KEYS } from '../../services/storageService.js';
import './ConfigView.css';

/**
 * ConfigView.jsx - Ajuste de precios de hora, pluses, conceptos fijos del convenio, horarios de turnos y backup JSON.
 */
export default function ConfigView({ onConfigSaved }) {
  const currentConfig = getConfig();
  const [shiftTypes, setShiftTypes] = useState(getShiftTypes());

  // Tarifas Variables
  const [precioOrdinaria, setPrecioOrdinaria] = useState(currentConfig.precioHoraOrdinaria);
  const [precioExtra, setPrecioExtra] = useState(currentConfig.precioHoraExtra);
  const [plusNocturnidad, setPlusNocturnidad] = useState(currentConfig.plusNocturnidadHora);
  const [plusFestivo, setPlusFestivo] = useState(currentConfig.plusFestivoDia);

  // Conceptos Fijos Mensuales (Convenio Sevilla 2025)
  const [salarioBase, setSalarioBase] = useState(currentConfig.salarioBaseMensual || 1253.26);
  const [plusConvenio, setPlusConvenio] = useState(currentConfig.plusConvenio || 167.52);
  const [antiguedad, setAntiguedad] = useState(currentConfig.antiguedadMensual || 62.66);
  const [prorrateoPagas, setProrrateoPagas] = useState(currentConfig.prorrateoPagasExtra || 247.24);
  const [fechaIngreso, setFechaIngreso] = useState(currentConfig.fechaIngresoEmpresa || '2021-11-01');

  const [mensaje, setMensaje] = useState('');

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

    const updatedConfig = {
      ...currentConfig,
      precioHoraOrdinaria: Number(precioOrdinaria),
      precioHoraExtra: Number(precioExtra),
      plusNocturnidadHora: Number(plusNocturnidad),
      plusFestivoDia: Number(plusFestivo),
      salarioBaseMensual: Number(salarioBase),
      plusConvenio: Number(plusConvenio),
      antiguedadMensual: Number(antiguedad),
      prorrateoPagasExtra: Number(prorrateoPagas),
      fechaIngresoEmpresa: fechaIngreso
    };
    saveConfig(updatedConfig);

    setStorageItem(STORAGE_KEYS.SHIFT_TYPES, shiftTypes);

    setMensaje('¡Configuración de tarifas, conceptos fijos y antigüedad guardada correctamente!');
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
      <h2 className="config-title">⚙️ Configuración Económica & Convenio</h2>
      <p className="config-subtitle">
        Ajusta tus conceptos fijos del Convenio de Sevilla 2025, la antigüedad y las tarifas de hora.
      </p>

      {mensaje && <div className="alert-success">{mensaje}</div>}

      <form onSubmit={handleSubmit} className="config-form">
        {/* Conceptos Fijos Mensuales (Convenio Sevilla 2025) */}
        <h3 className="section-subtitle">🏛️ Conceptos Fijos Mensuales (Convenio Sevilla)</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>Salario Base Mensual (€):</label>
            <input 
              type="number" 
              step="0.01" 
              value={salarioBase} 
              onChange={e => setSalarioBase(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Plus Convenio Mensual (€):</label>
            <input 
              type="number" 
              step="0.01" 
              value={plusConvenio} 
              onChange={e => setPlusConvenio(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Antigüedad (€ - Tramo Actual 5 Años):</label>
            <input 
              type="number" 
              step="0.01" 
              value={antiguedad} 
              onChange={e => setAntiguedad(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Pagas Extra Prorrateadas (€/mes):</label>
            <input 
              type="number" 
              step="0.01" 
              value={prorrateoPagas} 
              onChange={e => setProrrateoPagas(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>📅 Fecha de Ingreso en la Empresa (Cómputo de Antigüedad):</label>
          <input 
            type="date" 
            value={fechaIngreso} 
            onChange={e => setFechaIngreso(e.target.value)} 
          />
          <small className="field-hint">
            *Te servirá para actualizar fácilmente el tramo cuando cumplas los 6 años de antigüedad (Noviembre 2026).
          </small>
        </div>

        {/* Tarifas Variables de Hora */}
        <h3 className="section-subtitle">💶 Tarifas Variables por Hora & Pluses</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>Precio Hora Presencia (€/h):</label>
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

        {/* Horarios por defecto de los turnos */}
        <h3 className="section-subtitle">⏱️ Horarios por Defecto de los Tipos de Turno</h3>
        <p className="section-desc">Ajusta la hora de inicio y fin de cada turno para adaptarlo a tus horarios reales de servicio.</p>

        <div className="shift-types-editor">
          {shiftTypes.map(st => (
            <div key={st.id} className="shift-type-row">
              <div className="shift-type-name">
                <span className="color-dot" style={{ backgroundColor: st.color }}></span>
                <strong>{st.nombre}</strong> ({st.nombreCorto})
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
