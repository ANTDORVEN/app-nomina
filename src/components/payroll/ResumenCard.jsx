import React from 'react';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './ResumenCard.css';

/**
 * ResumenCard.jsx - Tarjeta estilo panel financiero ajustada al modelo real del Convenio de Sevilla 2025.
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
    totalHorasPresencialesExceso, 
    totalHorasFestivas, 
    totalHorasExtra, 
    totalHorasNocturnas, 
    totalDiasFestivos, 
    conceptosFijos,
    tarifasAplicadas,
    desgloseImportes, 
    fichajesContabilizados 
  } = summary;

  const precioPresencial = tarifasAplicadas ? tarifasAplicadas.precioHoraPresencial : 12.36;
  const precioFestiva = tarifasAplicadas ? tarifasAplicadas.precioHoraFestiva : 21.00;
  const precioExtra = tarifasAplicadas ? tarifasAplicadas.precioHoraExtra : 21.63;
  const precioNocturna = tarifasAplicadas ? tarifasAplicadas.plusNocturnidad : 1.85;

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
        <span className="bruto-subtext">*Suma de Salario Base Fijo (1.730,68 €) + excesos presenciales, festivos y nocturnidad</span>
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
          <span className="metric-icon">➕</span>
          <div>
            <span className="metric-value">{totalHorasPresencialesExceso} h</span>
            <span className="metric-label">Exceso Presencial</span>
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
        <h3 className="desglose-title">🏛️ 1. Salario Base Fijo Mensual (Jornada Estándar)</h3>
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
            <strong>Total Fijo Mensual Garantizado</strong>
            <strong className="concept-amount highlight">+{conceptosFijos ? conceptosFijos.totalFijoMensual.toFixed(2) : '1730.68'} €</strong>
          </div>
        </div>

        <h3 className="desglose-title" style={{ marginTop: '16px' }}>💰 2. Variables por Excesos de Jornada, Sábados & Festivos</h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Horas Presenciales de Exceso / Sábados ({totalHorasPresencialesExceso}h @ {precioPresencial.toFixed(2)}€/h)</span>
            <span className="concept-amount">+{desgloseImportes.presencialExceso.toFixed(2)} €</span>
          </div>

          {totalHorasFestivas > 0 && (
            <div className="desglose-row">
              <span>Horas en Días Festivos ({totalHorasFestivas}h @ {precioFestiva.toFixed(2)}€/h)</span>
              <span className="concept-amount holiday">+{desgloseImportes.festivos.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasExtra > 0 && (
            <div className="desglose-row">
              <span>Horas Extraordinarias ({totalHorasExtra}h @ {precioExtra.toFixed(2)}€/h)</span>
              <span className="concept-amount extra">+{desgloseImportes.extra.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasNocturnas > 0 && (
            <div className="desglose-row">
              <span>Plus Nocturnidad ({totalHorasNocturnas}h @ {precioNocturna.toFixed(2)}€/h)</span>
              <span className="concept-amount night">+{desgloseImportes.nocturnidad.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasDescansoDescontadas > 0 && (
            <div className="desglose-row break-discount-row">
              <span>☕ Descanso no remunerado ({totalHorasDescansoDescontadas}h total en turnos 12h)</span>
              <span className="concept-amount discount">-0.00 € (No abonable)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
