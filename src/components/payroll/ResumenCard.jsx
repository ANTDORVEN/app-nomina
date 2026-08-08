import React from 'react';
import { formatDateSpanish } from '../../utils/dateUtils.js';
import './ResumenCard.css';

/**
 * ResumenCard.jsx - Tarjeta estilo panel financiero ajustada al desglose oficial ATH (Convenio Sevilla).
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
    diasLiquidables,
    totalHorasTrabajadas, 
    totalHorasPresenciales,
    totalHorasDescansoDescontadas,
    totalHorasJComplement, 
    totalHorasFestivasExtra, 
    totalHorasNocturnas, 
    conceptosDiarios,
    tarifasAplicadas,
    desgloseImportes, 
    fichajesContabilizados 
  } = summary;

  const precioBaseDia = conceptosDiarios ? conceptosDiarios.precioSalarioBaseDia : 41.78;
  const precioPlusDia = conceptosDiarios ? conceptosDiarios.precioPlusConvenioDia : 5.58;
  const precioProrrataDia = conceptosDiarios ? conceptosDiarios.precioProrrataPagaExtraDia : 8.24;

  const precioJComplement = tarifasAplicadas ? tarifasAplicadas.precioJComplement : 12.47;
  const precioHorasExtra = tarifasAplicadas ? tarifasAplicadas.precioHorasExtra : 21.82;
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
          {fichajesContabilizados} {fichajesContabilizados === 1 ? 'fichaje' : 'fichajes'} ({diasLiquidables} días)
        </span>
      </div>

      {/* Importe Bruto Estimado Principal */}
      <div className="bruto-box">
        <span className="bruto-label">ESTIMACIÓN BRUTA TOTAL NÓMINA ATH</span>
        <div className="bruto-amount">
          {estimacionBrutoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
        <span className="bruto-subtext">*Calculado proporcionalmente a {diasLiquidables} días liquidados en el período</span>
      </div>

      {/* Rejilla de Indicadores de Horas */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-icon">📅</span>
          <div>
            <span className="metric-value">{diasLiquidables} días</span>
            <span className="metric-label">Días Periodo</span>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-icon">⏱️</span>
          <div>
            <span className="metric-value">{totalHorasTrabajadas} h</span>
            <span className="metric-label">Horas Liquidadas</span>
          </div>
        </div>

        <div className="metric-item highlight-extra">
          <span className="metric-icon">➕</span>
          <div>
            <span className="metric-value">{totalHorasJComplement} h</span>
            <span className="metric-label">J.Complement</span>
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
        <h3 className="desglose-title">🏛️ 1. Salario Base & Conceptos por Día ({diasLiquidables} días)</h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Salario Base ({diasLiquidables} días × {precioBaseDia.toFixed(2)}€/día)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.salarioBase.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Plus Convenio ({diasLiquidables} días × {precioPlusDia.toFixed(2)}€/día)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.plusConvenio.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Prorrata Paga Extra ({diasLiquidables} días × {precioProrrataDia.toFixed(2)}€/día)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.prorrataPagas.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Antigüedad (5 años - Tramo Fijo)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.antiguedad.toFixed(2) : '37.60'} €</span>
          </div>
          <div className="desglose-row subtotal-row">
            <strong>Subtotal Fijo Proporcional ({diasLiquidables} días)</strong>
            <strong className="concept-amount highlight">+{conceptosDiarios ? conceptosDiarios.totalBaseDias.toFixed(2) : '0.00'} €</strong>
          </div>
        </div>

        <h3 className="desglose-title" style={{ marginTop: '16px' }}>💰 2. Variables por Horas & Pluses (Conceptos Excluyentes)</h3>
        <div className="desglose-list">
          {desgloseImportes.jornadaComplementaria > 0 && (
            <div className="desglose-row">
              <span>J.Complement / Excesos Presenciales ({totalHorasJComplement}h × {precioJComplement.toFixed(2)}€/h)</span>
              <span className="concept-amount">+{desgloseImportes.jornadaComplementaria.toFixed(2)} €</span>
            </div>
          )}

          {desgloseImportes.horasExtraordinarias > 0 && (
            <div className="desglose-row">
              <span>Horas Extraordinarias en Festivo ({totalHorasFestivasExtra}h × {precioHorasExtra.toFixed(2)}€/h)</span>
              <span className="concept-amount extra">+{desgloseImportes.horasExtraordinarias.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasNocturnas > 0 && (
            <div className="desglose-row">
              <span>Plus Nocturnidad ({totalHorasNocturnas}h × {precioNocturna.toFixed(2)}€/h)</span>
              <span className="concept-amount night">+{desgloseImportes.nocturnidad.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasDescansoDescontadas > 0 && (
            <div className="desglose-row break-discount-row">
              <span>☕ Descanso no remunerado ({totalHorasDescansoDescontadas}h en turnos 12h)</span>
              <span className="concept-amount discount">-0.00 € (No abonable)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
