import React from 'react';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './PeriodSelector.css';

/**
 * PeriodSelector.jsx - Selector de periodo de cobro ATH para filtrar la estimación de nómina.
 */
export default function PeriodSelector({ periods, selectedPeriodId, onSelectPeriod }) {
  return (
    <div className="period-selector">
      <label htmlFor="period-select" className="period-label">
        📅 Selecciona Periodo de Cobro (Tabla ATH):
      </label>
      <select 
        id="period-select"
        className="period-dropdown"
        value={selectedPeriodId} 
        onChange={(e) => onSelectPeriod(e.target.value)}
      >
        {periods.map(period => (
          <option key={period.id} value={period.id}>
            {period.nombreNomina} ({formatDateSpanish(period.fechaInicio)} - {formatDateSpanish(period.fechaFin)})
          </option>
        ))}
      </select>
    </div>
  );
}
