import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/common/Header.jsx';
import FichajeForm from './components/shift/FichajeForm.jsx';
import LiveShift from './components/shift/LiveShift.jsx';
import FichajesList from './components/shift/FichajesList.jsx';
import ResumenCard from './components/payroll/ResumenCard.jsx';
import PeriodSelector from './components/payroll/PeriodSelector.jsx';
import TablaPeriodosATH from './components/payroll/TablaPeriodosATH.jsx';
import CalendarView from './components/calendar/CalendarView.jsx';
import ConfigView from './components/config/ConfigView.jsx';

import { getPayrollPeriods, getPeriodForDate } from './services/shiftService.js';
import { calculatePayrollForPeriod } from './services/payrollService.js';
import { formatDateToISO } from './utils/dateUtils.js';

import './styles/variables.css';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('fichaje');
  const [periods, setPeriods] = useState(getPayrollPeriods());
  
  // Buscar periodo activo por defecto según la fecha de hoy
  const todayPeriod = getPeriodForDate(formatDateToISO(new Date()));
  const [selectedPeriodId, setSelectedPeriodId] = useState(
    todayPeriod ? todayPeriod.id : (periods[0] ? periods[0].id : '')
  );

  const [summary, setSummary] = useState(null);

  // Recalcular resumen de nómina cuando cambie el periodo o se modifiquen fichajes
  const updateSummary = useCallback(() => {
    const currentPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];
    if (currentPeriod) {
      const summaryData = calculatePayrollForPeriod(currentPeriod);
      setSummary(summaryData);
    }
  }, [selectedPeriodId, periods]);

  useEffect(() => {
    updateSummary();
  }, [updateSummary]);

  const handleLogSaved = () => {
    updateSummary();
  };

  const handlePeriodsUpdated = (updatedPeriods) => {
    setPeriods(updatedPeriods);
    if (updatedPeriods.length > 0 && !updatedPeriods.find(p => p.id === selectedPeriodId)) {
      setSelectedPeriodId(updatedPeriods[0].id);
    }
  };

  return (
    <div className="app-layout">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === 'fichaje' && (
          <div className="view-grid">
            <div>
              <LiveShift onLogSaved={handleLogSaved} />
              <details className="manual-fichaje"><summary>Registrar una jornada manualmente</summary>
                <FichajeForm onLogSaved={handleLogSaved} />
              </details>
            </div>
            <div>
              <PeriodSelector 
                periods={periods} 
                selectedPeriodId={selectedPeriodId} 
                onSelectPeriod={setSelectedPeriodId} 
              />
              <FichajesList 
                logs={summary ? summary.logs : []} 
                onDeleteLog={updateSummary} 
                onLogUpdated={updateSummary}
              />
            </div>
          </div>
        )}

        {activeTab === 'calendario' && (
          <CalendarView onCalendarUpdated={updateSummary} />
        )}

        {activeTab === 'resumen' && (
          <div className="resumen-view-container">
            <PeriodSelector 
              periods={periods} 
              selectedPeriodId={selectedPeriodId} 
              onSelectPeriod={setSelectedPeriodId} 
            />
            <ResumenCard summary={summary} />
            <FichajesList 
              logs={summary ? summary.logs : []} 
              onDeleteLog={updateSummary} 
              onLogUpdated={updateSummary}
            />
          </div>
        )}

        {activeTab === 'periodos' && (
          <TablaPeriodosATH onPeriodsUpdated={handlePeriodsUpdated} />
        )}

        {activeTab === 'config' && (
          <ConfigView onConfigSaved={updateSummary} />
        )}
      </main>

      <footer className="app-footer">
        <p>TES Control & Nómina • Diseñado para Técnicos en Emergencias Sanitarias</p>
      </footer>
    </div>
  );
}
