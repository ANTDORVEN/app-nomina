import React from 'react';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './ResumenCard.css';

/**
 * ResumenCard.jsx - Tarjeta estilo panel financiero con la estimación de nómina Convenio Sevilla 2025.
 */
export default function ResumenCard({ summary }) {
  if (!summary || !summary.periodo) {
    return (
      <div className="resumen-card empty">
        <p>⚠️ Selecciona un período de cobro ATH para ver la estimación de nómina.</p>
      </div>
    );
  }

  const { 
    periodo, 
    estimacionBrutoTotal, 
    totalHorasTrabajadas, 
    totalHorasPresenciales,
    totalHorasDescansoDescontadas,
    totalHorasOrdinarias, 
    totalHorasExtra, 
    totalHorasNocturnas, 
    totalDiasFestivos, 
    conceptosFijos,
    desgloseImportes, 
    fichajesContabilizados 
  } = summary;

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
        <span className="bruto-label">ESTIMACIÓN BRUTA TOTAL (CONVENIO SEVILLA)</span>
        <div className="bruto-amount">
          {estimacionBrutoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
        <span className="bruto-subtext">*Incluye fijos mensuales (1.730,68 €) + variables por horas y pluses</span>
      </div>

      {/* Rejilla de Indicadores de Horas */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-icon">⏱️</span>
          <div>
            <span className="metric-value">{totalHorasTrabajadas} h</span>
            <span className="metric-label">Horas Liquidadas</span>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-icon">🚑</span>
          <div>
            <span className="metric-value">{totalHorasPresenciales} h</span>
            <span className="metric-label">Presencia Reloj</span>
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

      {/* Desglose Económico Completo */}
      <div className="desglose-section">
        <h3 className="desglose-title">🏛️ Conceptos Fijos Mensuales</h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Salario Base Mensual</span>
            <span className="concept-amount">+{conceptosFijos ? conceptosFijos.salarioBase.toFixed(2) : '1253.26'} €</span>
          </div>
          <div className="desglose-row">
            <span>Plus Convenio Mensual</span>
            <span className="concept-amount">+{conceptosFijos ? conceptosFijos.plusConvenio.toFixed(2) : '167.52'} €</span>
          </div>
          <div className="desglose-row">
            <span>Complemento Antigüedad (5 años)</span>
            <span className="concept-amount">+{conceptosFijos ? conceptosFijos.antiguedad.toFixed(2) : '62.66'} €</span>
          </div>
          <div className="desglose-row">
            <span>Pagas Extra Prorrateadas</span>
            <span className="concept-amount">+{conceptosFijos ? conceptosFijos.prorrateoPagas.toFixed(2) : '247.24'} €</span>
          </div>
          <div className="desglose-row subtotal-row">
            <strong>Subtotal Fijo Mensual</strong>
            <strong className="concept-amount highlight">+{conceptosFijos ? conceptosFijos.totalFijoMensual.toFixed(2) : '1730.68'} €</strong>
          </div>
        </div>

        <h3 className="desglose-title" style={{ marginTop: '16px' }}>💰 Variables por Horas & Pluses</h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Horas Presenciales ({totalHorasOrdinarias}h @ 12.36€)</span>
            <span className="concept-amount">+{desgloseImportes.ordinario.toFixed(2)} €</span>
          </div>

          {totalHorasDescansoDescontadas > 0 && (
            <div className="desglose-row break-discount-row">
              <span>☕ Descanso no remunerado ({totalHorasDescansoDescontadas}h total en turno 12h)</span>
              <span className="concept-amount discount">-0.00 €</span>
            </div>
          )}

          <div className="desglose-row">
            <span>Horas Extraordinarias ({totalHorasExtra}h @ 21.63€)</span>
            <span className="concept-amount extra">+{desgloseImportes.extra.toFixed(2)} €</span>
          </div>
          <div className="desglose-row">
            <span>Plus Nocturnidad ({totalHorasNocturnas}h @ 1.85€)</span>
            <span className="concept-amount night">+{desgloseImportes.nocturnidad.toFixed(2)} €</span>
          </div>
          {desgloseImportes.festivos > 0 && (
            <div className="desglose-row">
              <span>Plus Festivos ({totalDiasFestivos} días @ 35.00€)</span>
              <span className="concept-amount holiday">+{desgloseImportes.festivos.toFixed(2)} €</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
