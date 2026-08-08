import React, { useState } from 'react';
import { getConfig, saveConfig, getAllTimeLogs, getPayrollPeriods, getShiftTypes } from '../../services/shiftService.js';
import { setStorageItem, STORAGE_KEYS } from '../../services/storageService.js';
import './ConfigView.css';

/**
 * ConfigView.jsx - Ajuste de precios por día, antigüedad, tarifas horarias y copias de seguridad con Web Share API y visor JSON manual.
 */
export default function ConfigView({ onConfigSaved }) {
  const currentConfig = getConfig();
  const [shiftTypes, setShiftTypes] = useState(getShiftTypes());

  // Tarifas por Día (Desglose ATH)
  const [salarioBaseDia, setSalarioBaseDia] = useState(currentConfig.precioSalarioBaseDia || 41.78);
  const [plusConvenioDia, setPlusConvenioDia] = useState(currentConfig.precioPlusConvenioDia || 5.58);
  const [prorrataPagasDia, setProrrataPagasDia] = useState(currentConfig.precioProrrataPagaExtraDia || 8.24);

  // Antigüedad (Tramo Fijo)
  const [antiguedad, setAntiguedad] = useState(currentConfig.antiguedadMensual || 37.60);
  const [fechaIngreso, setFechaIngreso] = useState(currentConfig.fechaIngresoEmpresa || '2021-11-01');

  // Tarifas por Hora Excluyentes
  const [precioJComplement, setPrecioJComplement] = useState(currentConfig.precioHoraOrdinaria || 12.47);
  const [precioHorasExtra, setPrecioHorasExtra] = useState(currentConfig.precioHoraExtra || 21.82);
  const [plusNocturnidad, setPlusNocturnidad] = useState(currentConfig.plusNocturnidadHora || 1.85);

  const [mensaje, setMensaje] = useState('');

  // Estado para el Visor / Copiador Manual de JSON
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

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
      precioSalarioBaseDia: Number(salarioBaseDia),
      precioPlusConvenioDia: Number(plusConvenioDia),
      precioProrrataPagaExtraDia: Number(prorrataPagasDia),
      antiguedadMensual: Number(antiguedad),
      fechaIngresoEmpresa: fechaIngreso,
      precioHoraOrdinaria: Number(precioJComplement),
      precioHoraExtra: Number(precioHorasExtra),
      precioHoraFestiva: Number(precioHorasExtra),
      plusNocturnidadHora: Number(plusNocturnidad)
    };
    saveConfig(updatedConfig);

    setStorageItem(STORAGE_KEYS.SHIFT_TYPES, shiftTypes);

    setMensaje('¡Configuración de tarifas ATH guardada correctamente!');
    if (onConfigSaved) onConfigSaved();

    setTimeout(() => setMensaje(''), 3500);
  };

  // Genera el objeto completo de copia de seguridad
  const getBackupDataObject = () => {
    return {
      config: getConfig(),
      periods: getPayrollPeriods(),
      shiftTypes: getShiftTypes(),
      timeLogs: getAllTimeLogs(),
      exportedAt: new Date().toISOString()
    };
  };

  // 1. Exportar copia de seguridad en JSON (Con Web Share API para móviles iOS / Safari)
  const handleExportBackup = async () => {
    const backupData = getBackupDataObject();
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileName = `tes_nomina_backup_${new Date().toISOString().split('T')[0]}.json`;

    // A. Intentar Web Share API si está disponible en móviles (iOS Safari / Chrome Android)
    try {
      const file = new File([jsonString], fileName, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Copia de Seguridad TES Nómina',
          text: 'Copia de seguridad de turnos y nómina TES ATH'
        });
        return;
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return; // Usuario canceló el menú compartir
    }

    // B. Descarga por Blob (para PC y navegadores de escritorio)
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      // Si la descarga automática falla, abrir directamente el modal manual
      handleOpenJsonModal();
    }
  };

  // 2. Abrir Modal para Ver / Copiar JSON Manualmente
  const handleOpenJsonModal = () => {
    const backupData = getBackupDataObject();
    setJsonText(JSON.stringify(backupData, null, 2));
    setCopyFeedback('');
    setShowJsonModal(true);
  };

  // Copiar al portapapeles con fallback
  const handleCopyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        // Fallback para navegadores antiguos
        const textArea = document.getElementById('json-manual-textarea');
        if (textArea) {
          textArea.select();
          document.execCommand('copy');
        }
      }
      setCopyFeedback('¡Copiado al portapapeles con éxito! ✅');
      setTimeout(() => setCopyFeedback(''), 4000);
    } catch (err) {
      setCopyFeedback('Selecciona todo el texto de abajo y pulsa Copiar.');
    }
  };

  // Seleccionar todo el texto del textarea
  const handleSelectAllText = () => {
    const textArea = document.getElementById('json-manual-textarea');
    if (textArea) {
      textArea.focus();
      textArea.select();
    }
  };

  // Importar copia de seguridad desde un archivo o texto JSON
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        applyImportedData(imported);
      } catch (err) {
        alert('Error al leer el archivo JSON de copia de seguridad.');
      }
    };
    reader.readAsText(file);
  };

  // Importar pegando texto JSON manualmente
  const handleImportJsonFromText = () => {
    const userText = prompt("Pega aquí el contenido JSON de tu copia de seguridad:");
    if (!userText || !userText.trim()) return;

    try {
      const imported = JSON.parse(userText.trim());
      applyImportedData(imported);
    } catch (err) {
      alert("El texto introducido no es un JSON válido.");
    }
  };

  const applyImportedData = (imported) => {
    if (imported.config) setStorageItem(STORAGE_KEYS.CONFIG, imported.config);
    if (imported.periods) setStorageItem(STORAGE_KEYS.PERIODS, imported.periods);
    if (imported.shiftTypes) setStorageItem(STORAGE_KEYS.SHIFT_TYPES, imported.shiftTypes);
    if (imported.timeLogs) setStorageItem(STORAGE_KEYS.TIME_LOGS, imported.timeLogs);

    alert('¡Copia de seguridad restaurada con éxito!');
    window.location.reload();
  };

  return (
    <div className="config-container">
      <h2 className="config-title">⚙️ Configuración Económica & Desglose ATH</h2>
      <p className="config-subtitle">
        Ajusta tus precios por día trabajado (Salario Base, Plus Convenio, Prorrata Pagas) y tarifas horarias (J.Complement 12,47€/h, Horas Extraordinarias/Festivo 21,82€/h).
      </p>

      {mensaje && <div className="alert-success">{mensaje}</div>}

      <form onSubmit={handleSubmit} className="config-form">
        {/* Conceptos Calculados por Día Trabajado */}
        <h3 className="section-subtitle">📅 Conceptos por Día Trabajado (Convenio Sevilla 2025)</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>Salario Base (€/día):</label>
            <input 
              type="number" 
              step="0.01" 
              value={salarioBaseDia} 
              onChange={e => setSalarioBaseDia(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Plus Convenio (€/día):</label>
            <input 
              type="number" 
              step="0.01" 
              value={plusConvenioDia} 
              onChange={e => setPlusConvenioDia(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Prorrata Paga Extra (€/día):</label>
            <input 
              type="number" 
              step="0.01" 
              value={prorrataPagasDia} 
              onChange={e => setProrrataPagasDia(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Antigüedad (€/mes - 5 Años):</label>
            <input 
              type="number" 
              step="0.01" 
              value={antiguedad} 
              onChange={e => setAntiguedad(e.target.value)} 
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
            *Tramo actual: 37,60 €/mes (5 años). En Noviembre 2026 podrás actualizar al tramo de 6 años.
          </small>
        </div>

        {/* Tarifas Variables de Hora */}
        <h3 className="section-subtitle">💶 Tarifas Variables por Hora (Conceptos Excluyentes)</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>J.Complement / Excesos en Día Normal (€/h):</label>
            <input 
              type="number" 
              step="0.01" 
              value={precioJComplement} 
              onChange={e => setPrecioJComplement(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Horas Extraordinarias / Días Festivos (€/h):</label>
            <input 
              type="number" 
              step="0.01" 
              value={precioHorasExtra} 
              onChange={e => setPrecioHorasExtra(e.target.value)} 
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
          💾 Guardar Tarifas y Desglose ATH
        </button>
      </form>

      {/* Copias de seguridad */}
      <div className="backup-section">
        <h3 className="backup-title">📦 Copia de Seguridad y Respaldos</h3>
        <p className="backup-desc">
          Exporta tus fichajes y turnos a un archivo JSON o copia el texto directamente para guardarlo en tu móvil.
        </p>

        <div className="backup-buttons">
          <button type="button" className="btn-backup-export" onClick={handleExportBackup}>
            ⬇️ Exportar Copia (Descarga / Compartir)
          </button>

          <button type="button" className="btn-backup-copy" onClick={handleOpenJsonModal}>
            📋 Ver / Copiar JSON Manualmente
          </button>

          <label className="btn-backup-import">
            ⬆️ Importar de Archivo
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>

          <button type="button" className="btn-backup-import-text" onClick={handleImportJsonFromText}>
            📝 Pegar JSON Manualmente
          </button>
        </div>
      </div>

      {/* MODAL RESPALDO: Visor / Copiador Manual de JSON */}
      {showJsonModal && (
        <div className="modal-backdrop" onClick={() => setShowJsonModal(false)}>
          <div className="modal-content json-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Copia de Seguridad (JSON)</h3>
              <button className="modal-close" onClick={() => setShowJsonModal(false)}>✕</button>
            </div>

            <p className="modal-desc">
              Si estás en un móvil iOS (iPhone) y la descarga falla, pulsa <strong>Copiar JSON</strong> o selecciona el texto de abajo para pegarlo en Notas.
            </p>

            {copyFeedback && <div className="alert-success copy-alert">{copyFeedback}</div>}

            <div className="json-modal-actions">
              <button type="button" className="btn-primary" onClick={handleCopyToClipboard}>
                📋 Copiar JSON al Portapapeles
              </button>

              <button type="button" className="btn-secondary" onClick={handleSelectAllText}>
                📄 Seleccionar Todo
              </button>
            </div>

            <div className="form-group" style={{ marginTop: '10px' }}>
              <textarea 
                id="json-manual-textarea"
                className="json-textarea"
                readOnly
                value={jsonText}
                rows={12}
                onClick={handleSelectAllText}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowJsonModal(false)}>
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
