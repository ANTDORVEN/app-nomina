import React from 'react';
import { formatDateSpanish, formatHoursToHHMM } from '../../utils/dateUtils.js';
import './ResumenCard.css';

const formatAmount = value => Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <span className="bruto-label">{summary.computoGuardiasPendiente ? 'ESTIMACIÓN PARCIAL · CÓMPUTO DE GUARDIAS PENDIENTE' : 'ESTIMACIÓN BRUTA TOTAL NÓMINA ATH'}</span>
        <div className="bruto-amount">
          {estimacionBrutoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
        <span className="bruto-subtext">
          *Suma de Bloque Fijo ({diasMesNatural} días en {mesNatural.nombreMes}) + Bloque Variable (Tabla ATH)
        </span>
      </div>

      {/* Rejilla de Indicadores de Horas */}
      {summary.computoGuardiasPendiente && <p role="status" className="live-conflict">Hay {formatHoursToHHMM(summary.horasGuardiasPendientesComputo)} de guardias de 24 horas registradas. Su exceso presencial mensual está pendiente de calcular: falta concretar el rango y las horas exigidas. Este importe es parcial.</p>}
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
            <span>Salario base<small>{formatAmount(precioBaseDia * 30)} € × {diasMesNatural}/30 días</small></span>
            <span className="concept-amount">+{conceptosDiarios ? formatAmount(conceptosDiarios.salarioBase) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Plus convenio<small>{formatAmount(precioPlusDia * 30)} € × {diasMesNatural}/30 días</small></span>
            <span className="concept-amount">+{conceptosDiarios ? formatAmount(conceptosDiarios.plusConvenio) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Prorrata de pagas extras<small>{formatAmount(precioProrrataDia * 30)} € × {diasMesNatural}/30 días</small></span>
            <span className="concept-amount">+{conceptosDiarios ? formatAmount(conceptosDiarios.prorrataPagas) : '0.00'} €</span>
          </div>
          <div className="desglose-row">
            <span>Antigüedad<small>{formatAmount(antiguedadBase)} € × {diasMesNatural}/30 días</small></span>
            <span className="concept-amount">+{conceptosDiarios ? formatAmount(conceptosDiarios.antiguedad) : '0.00'} €</span>
          </div>
          <div className="desglose-row subtotal-row">
            <strong>Subtotal Bloque Fijo ({mesNatural.nombreMes} - {diasMesNatural} días)</strong>
            <strong className="concept-amount highlight">+{formatAmount(desgloseImportes.subtotalFijoMesNatural)} €</strong>
          </div>
        </div>

        {/* BLOQUE 2: CONCEPTOS VARIABLES DE LA TABLA ATH */}
        <h3 className="desglose-title" style={{ marginTop: '20px' }}>
          💰 2. Conceptos Variables (Rango Tabla ATH: {formatDateSpanish(periodoATH.fechaInicio)} - {formatDateSpanish(periodoATH.fechaFin)})
        </h3>
        <div className="desglose-list">
          <div className="desglose-row">
            <span>Jornada complementaria<small>{formatHoursToHHMM(totalHorasJComplement)} × {formatAmount(precioJComplement)} €/h</small></span>
            <span className="concept-amount">+{formatAmount(desgloseImportes.jornadaComplementaria)} €</span>
          </div>

          {desgloseImportes.horasExtraordinarias > 0 && (
            <div className="desglose-row">
              <span>Horas extraordinarias / festivas<small>{formatHoursToHHMM(totalHorasFestivasExtra)} × {formatAmount(precioHorasExtra)} €/h</small></span>
              <span className="concept-amount extra">+{formatAmount(desgloseImportes.horasExtraordinarias)} €</span>
            </div>
          )}

          {totalHorasNocturnas > 0 && (
            <div className="desglose-row">
              <span>Plus de nocturnidad<small>{formatHoursToHHMM(totalHorasNocturnas)} × {formatAmount(precioNocturna)} €/h</small></span>
              <span className="concept-amount night">+{formatAmount(desgloseImportes.nocturnidad)} €</span>
            </div>
          )}

          {totalHorasDescansoDescontadas > 0 && (
            <div className="desglose-row break-discount-row">
              <span>☕ Descanso no remunerado ({formatHoursToHHMM(totalHorasDescansoDescontadas)})</span>
              <span className="concept-amount discount">-0.00 € (No abonable)</span>
            </div>
          )}

          <div className="desglose-row subtotal-row">
            <strong>Subtotal Bloque Variable (Tabla ATH)</strong>
            <strong className="concept-amount highlight">+{formatAmount(desgloseImportes.subtotalVariableATH)} €</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
