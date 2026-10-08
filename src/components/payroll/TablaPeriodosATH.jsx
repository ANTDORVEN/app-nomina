import React, { useState } from 'react';
import { getPayrollPeriods } from '../../services/shiftService.js';
import { setStorageItem, STORAGE_KEYS } from '../../services/storageService.js';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './TablaPeriodosATH.css';

/**
 * TablaPeriodosATH.jsx - Gestor de la tabla de periodos de cobro de Ambulancias Tenorio (ATH).
 */
export default function TablaPeriodosATH({ onPeriodsUpdated }) {
  const [periods, setPeriods] = useState(getPayrollPeriods());

  const [nombreNomina, setNombreNomina] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleAddPeriod = (e) => {
    e.preventDefault();
    if (!nombreNomina || !fechaInicio || !fechaFin) return;

    const newPeriod = {
      id: 'ath_' + Date.now(),
      nombreNomina,
      fechaInicio,
      fechaFin,
      estaCerrado: false
    };

    const updated = [...periods, newPeriod];
    // Ordenar por fecha de inicio
    updated.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

    setStorageItem(STORAGE_KEYS.PERIODS, updated);
    setPeriods(updated);
    if (onPeriodsUpdated) onPeriodsUpdated(updated);

    setNombreNomina('');
    setFechaInicio('');
    setFechaFin('');
    setMensaje('¡Nuevo periodo ATH guardado correctamente!');
    setTimeout(() => setMensaje(''), 3000);
  };

  const handleDeletePeriod = (id) => {
    if (window.confirm('¿Eliminar este periodo de cobro?')) {
      const updated = periods.filter(p => p.id !== id);
      setStorageItem(STORAGE_KEYS.PERIODS, updated);
      setPeriods(updated);
      if (onPeriodsUpdated) onPeriodsUpdated(updated);
    }
  };

  return (
    <div className="periodos-container">
      <h2 className="periodos-title">📅 Configurar Tabla de Periodos ATH</h2>
      <p className="periodos-subtitle">
        Introduce o edita la tabla oficial de fechas de cobro que publica la empresa para cada año.
      </p>

      {mensaje && <div className="alert-success">{mensaje}</div>}

      {/* Formulario para añadir nuevo periodo */}
      <form onSubmit={handleAddPeriod} className="periodo-form">
        <div className="form-group">
          <label>Nombre del mes de nómina:</label>
          <input 
            type="text" 
            placeholder="Ej: Nómina Septiembre 2026"
            value={nombreNomina}
            onChange={(e) => setNombreNomina(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha Inicio:</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Fecha Fin:</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="add-period-btn">
          ➕ Añadir Periodo a la Tabla
        </button>
      </form>

      {/* Listado de Periodos Configurados */}
      <div className="table-wrapper">
        <table className="periods-table">
          <thead>
            <tr>
              <th>Nómina</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id}>
                <td><strong>{p.nombreNomina}</strong></td>
                <td>{formatDateSpanish(p.fechaInicio)}</td>
                <td>{formatDateSpanish(p.fechaFin)}</td>
                <td>
                  <button 
                    className="delete-period-btn" 
                    onClick={() => handleDeletePeriod(p.id)}
                    title="Eliminar periodo"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
