import React from 'react';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './ResumenCard.css';

/**
 * ResumenCard.jsx - Tarjeta estilo panel financiero con la estimación de nómina.
 */
export default function ResumenCard({ summary }) {
  if (!summary || !summary.periodo) {
    return (
      <div className="resumen-card empty">
        <p>⚠️ Selecciona un período de cobro ATH para ver la estimación de nómina.</p>
      </div>
    );
  }

  const { periodo, estimacionBrutoTotal, totalHorasTrabajadas, totalHorasOrdinarias, totalHorasExtra, totalHorasNocturnas, totalDiasFestivos, desgloseImportes, fichajesContabilizados } = summary;

  return (
    <div className="resumen-card">
      <div className="resumen-header">
        <div>
          <span className="resumen-period-name">{periodo.nombreNomina}</span>
          <p className="resumen-period-dates">
            📅 {formatDateSpanish(periodo.fechaInicio)} - {formatDateSpanish(periodo.fechaFin)}
          </p>
        </div>
        <span className="fichajes-badge">
          {fichajesContabilizados} {fichajesContabilizados === 1 ? 'fichaje' : 'fichajes'}
        </span>
      </div>

      {/* Importe Bruto Estimado Principal */}
      <div className="bruto-box">
        <span className="bruto-label">ESTIMACIÓN BRUTA TOTAL</span>
        <div className="bruto-amount">
          {estimacionBrutoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
        <span className="bruto-subtext">*Calculado en base a tus tarifas configuradas</span>
      </div>

      {/* Rejilla de Indicadores de Horas */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-icon">⏱️</span>
          <div>
            <span className="metric-value">{totalHorasTrabajadas} h</span>
            <span className="metric-label">Horas Totales</span>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-icon">💼</span>
          <div>
            <span className="metric-value">{totalHorasOrdinarias} h</span>
            <span className="metric-label">Ordinarias</span>
          </div>
        </div>

        <div className="metric-item highlight-extra">
          <span className="metric-icon">🚀</span>
          <div>
            <span className="metric-value">{totalHorasExtra} h</span>
            <span className="metric-label">Horas Extra</span>
          </div>
        </div>

        <div className="metric-item highlight-noche">
          <span className="metric-icon">🌙</span>
          <div>
            <span className="metric-value">{totalHorasNocturnas} h</span>
            <span className="metric-label">Nocturnidad</span>
          </div>
        </div>
      </div>

      {/* Desglose Económico por Concepto */}
      <div className="desglose-section">
        <h3 className="desglose-title">💰 Desglose por Conceptos</h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Horas Presenciales / Ordinarias</span>
            <span className="concept-amount">+{desgloseImportes.ordinario.toFixed(2)} €</span>
          </div>
          <div className="desglose-row">
            <span>Horas Extraordinarias</span>
            <span className="concept-amount extra">+{desgloseImportes.extra.toFixed(2)} €</span>
          </div>
          <div className="desglose-row">
            <span>Plus Nocturnidad</span>
            <span className="concept-amount night">+{desgloseImportes.nocturnidad.toFixed(2)} €</span>
          </div>
          {desgloseImportes.festivos > 0 && (
            <div className="desglose-row">
              <span>Plus Festivos ({totalDiasFestivos} días)</span>
              <span className="concept-amount holiday">+{desgloseImportes.festivos.toFixed(2)} €</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
