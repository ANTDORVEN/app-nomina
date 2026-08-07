import React, { useState } from 'react';
import { getConfig, saveConfig, getAllTimeLogs, getPayrollPeriods, getShiftTypes } from '../../services/shiftService.js';
import { setStorageItem, STORAGE_KEYS } from '../../services/storageService.js';
import './ConfigView.css';

/**
 * ConfigView.jsx - Ajuste de precios de hora, pluses, pagas extra y copia de seguridad (JSON).
 */
export default function ConfigView({ onConfigSaved }) {
  const currentConfig = getConfig();

  const [precioOrdinaria, setPrecioOrdinaria] = useState(currentConfig.precioHoraOrdinaria);
  const [precioExtra, setPrecioExtra] = useState(currentConfig.precioHoraExtra);
  const [plusNocturnidad, setPlusNocturnidad] = useState(currentConfig.plusNocturnidadHora);
  const [plusFestivo, setPlusFestivo] = useState(currentConfig.plusFestivoDia);
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = {
      ...currentConfig,
      precioHoraOrdinaria: Number(precioOrdinaria),
      precioHoraExtra: Number(precioExtra),
      plusNocturnidadHora: Number(plusNocturnidad),
      plusFestivoDia: Number(plusFestivo)
    };

    saveConfig(updated);
    setMensaje('¡Configuración de precios y pluses actualizada correctamente!');
    if (onConfigSaved) onConfigSaved();

    setTimeout(() => setMensaje(''), 3000);
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
      <h2 className="config-title">⚙️ Configuración Económica & Tarifas</h2>
      <p className="config-subtitle">
        Ajusta tus precios de hora y pluses según el convenio o cambios contractuales.
      </p>

      {mensaje && <div className="alert-success">{mensaje}</div>}

      <form onSubmit={handleSubmit} className="config-form">
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

        <button type="submit" className="save-config-btn">
          💾 Guardar Nuevas Tarifas
        </button>
      </form>

      {/* Sección Copia de Seguridad */}
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
