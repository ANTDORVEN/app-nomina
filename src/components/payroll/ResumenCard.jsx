import React from 'react';
import { formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import './ResumenCard.css';

/**
 * ResumenCard.jsx - Panel de Resumen Financiero ATH con Desglose de Doble Bloque (Mes Natural + Tabla ATH).
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
    mesNatural,
    periodoATH,
    estimacionBrutoTotal, 
    diasLiquidables,
    totalHorasTrabajadas, 
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
  const antiguedadBase = conceptosDiarios ? conceptosDiarios.antiguedadMensualBase : 62.66;

  const precioJComplement = tarifasAplicadas ? tarifasAplicadas.precioJComplement : 12.36;
  const precioHorasExtra = tarifasAplicadas ? tarifasAplicadas.precioHorasExtra : 21.63;
  const precioNocturna = tarifasAplicadas ? tarifasAplicadas.plusNocturnidad : 1.85;

  const diasMesNatural = mesNatural ? mesNatural.diasLiquidables : diasLiquidables;

  return (
    <div className="resumen-card">
      <div className="resumen-header">
        <div>
          <span className="resumen-period-name">{periodo.nombreNomina}</span>
          <p className="resumen-period-dates">
            📅 Rango Tabla ATH: {formatDateSpanish(periodo.fechaInicio)} - {formatDateSpanish(periodo.fechaFin)}
          </p>
          <p className="resumen-period-dates" style={{ marginTop: '2px', color: 'var(--primary-100)' }}>
            🗓️ Mes Natural (Fijos): {formatDateSpanish(mesNatural.fechaInicio)} - {formatDateSpanish(mesNatural.fechaFin)}
          </p>
        </div>
        <span className="fichajes-badge">
          {fichajesContabilizados} {fichajesContabilizados === 1 ? 'fichaje ATH' : 'fichajes ATH'} ({diasMesNatural} días en mes)
        </span>
      </div>

      {/* Importe Bruto Estimado Principal */}
      <div className="bruto-box">
        <span className="bruto-label">ESTIMACIÓN BRUTA TOTAL NÓMINA ATH</span>
        <div className="bruto-amount">
          {estimacionBrutoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
        <span className="bruto-subtext">
          *Suma de Bloque Fijo ({diasMesNatural} días en {mesNatural.nombreMes}) + Bloque Variable (Tabla ATH)
        </span>
      </div>

      {/* Rejilla de Indicadores de Horas */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-icon">📅</span>
          <div>
            <span className="metric-value">{diasMesNatural} días</span>
            <span className="metric-label">Días Mes Natural</span>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-icon">⏱️</span>
          <div>
            <span className="metric-value">{formatHoursToHHMM(totalHorasTrabajadas)}</span>
            <span className="metric-label">Horas Liquidadas</span>
          </div>
        </div>

        <div className="metric-item highlight-extra">
          <span className="metric-icon">➕</span>
          <div>
            <span className="metric-value">{formatHoursToHHMM(totalHorasJComplement)}</span>
            <span className="metric-label">J.Complement</span>
          </div>
        </div>

        <div className="metric-item highlight-noche">
          <span className="metric-icon">🌙</span>
          <div>
            <span className="metric-value">{formatHoursToHHMM(totalHorasNocturnas)}</span>
            <span className="metric-label">Nocturnidad</span>
          </div>
        </div>
      </div>

      {/* Desglose Económico de Doble Bloque */}
      <div className="desglose-section">
        {/* BLOQUE 1: CONCEPTOS FIJOS DEL MES NATURAL */}
        <h3 className="desglose-title">
          🏛️ 1. Conceptos Fijos ({mesNatural.nombreMes}: {formatDateSpanish(mesNatural.fechaInicio)} - {formatDateSpanish(mesNatural.fechaFin)})
        </h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Salario Base ({(precioBaseDia * 30).toFixed(2)}€ × {diasMesNatural}/30)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.salarioBase.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Plus Convenio ({(precioPlusDia * 30).toFixed(2)}€ × {diasMesNatural}/30)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.plusConvenio.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Prorrata Paga Extra ({(precioProrrataDia * 30).toFixed(2)}€ × {diasMesNatural}/30)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.prorrataPagas.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Antigüedad ({antiguedadBase.toFixed(2)}€ × {diasMesNatural}/30)</span>
            <span className="concept-amount">+{conceptosDiarios ? conceptosDiarios.antiguedad.toFixed(2) : '0.00'} €</span>
          </div>
          <div className="desglose-row subtotal-row">
            <strong>Subtotal Bloque Fijo ({mesNatural.nombreMes} - {diasMesNatural} días)</strong>
            <strong className="concept-amount highlight">+{desgloseImportes.subtotalFijoMesNatural.toFixed(2)} €</strong>
          </div>
        </div>

        {/* BLOQUE 2: CONCEPTOS VARIABLES DE LA TABLA ATH */}
        <h3 className="desglose-title" style={{ marginTop: '20px' }}>
          💰 2. Conceptos Variables (Rango Tabla ATH: {formatDateSpanish(periodoATH.fechaInicio)} - {formatDateSpanish(periodoATH.fechaFin)})
        </h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>J.Complement / Excesos Presenciales ({formatHoursToHHMM(totalHorasJComplement)} × {precioJComplement.toFixed(2)}€/h)</span>
            <span className="concept-amount">+{desgloseImportes.jornadaComplementaria.toFixed(2)} €</span>
          </div>

          {desgloseImportes.horasExtraordinarias > 0 && (
            <div className="desglose-row">
              <span>Horas Extraordinarias / Festivas ({formatHoursToHHMM(totalHorasFestivasExtra)} × {precioHorasExtra.toFixed(2)}€/h)</span>
              <span className="concept-amount extra">+{desgloseImportes.horasExtraordinarias.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasNocturnas > 0 && (
            <div className="desglose-row">
              <span>Plus Nocturnidad ({formatHoursToHHMM(totalHorasNocturnas)} × {precioNocturna.toFixed(2)}€/h)</span>
              <span className="concept-amount night">+{desgloseImportes.nocturnidad.toFixed(2)} €</span>
            </div>
          )}

          {totalHorasDescansoDescontadas > 0 && (
            <div className="desglose-row break-discount-row">
              <span>☕ Descanso no remunerado ({formatHoursToHHMM(totalHorasDescansoDescontadas)} en turnos 12h)</span>
              <span className="concept-amount discount">-0.00 € (No abonable)</span>
            </div>
          )}

          <div className="desglose-row subtotal-row">
            <strong>Subtotal Bloque Variable (Tabla ATH)</strong>
            <strong className="concept-amount highlight">+{desgloseImportes.subtotalVariableATH.toFixed(2)} €</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
