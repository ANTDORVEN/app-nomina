import React, { useState, useEffect, useCallback } from 'react';
import AppNavigation from './components/navigation/AppNavigation.jsx';
import FamilyCalendar from './components/family/FamilyCalendar.jsx';
import FichajeForm from './components/shift/FichajeForm.jsx';
import LiveShift from './components/shift/LiveShift.jsx';
import RealTimeRecords from './components/shift/RealTimeRecords.jsx';
import FichajesList from './components/shift/FichajesList.jsx';
import ResumenCard from './components/payroll/ResumenCard.jsx';
import PeriodSelector from './components/payroll/PeriodSelector.jsx';
import TablaPeriodosATH from './components/payroll/TablaPeriodosATH.jsx';
import CalendarView from './components/calendar/CalendarView.jsx';
import ConfigView from './components/config/ConfigView.jsx';
import IncidenciasView from './components/incidents/IncidenciasView.jsx';
import IncidentQuickEntry from './components/incidents/IncidentQuickEntry.jsx';
import { currentIncidentDateTime } from './services/incidentService.js';

import { getPayrollPeriods, getPeriodForDate } from './services/shiftService.js';
import { calculatePayrollForPeriod } from './services/payrollService.js';
import { formatDateToISO } from './utils/dateUtils.js';

import './styles/variables.css';
import './App.css';

export default function App() {
  return <AppNavigation>{({ screen, navigate, visited }) => <AppScreens activeTab={screen} setActiveTab={navigate} visited={visited} />}</AppNavigation>;
}

function AppScreens({ activeTab, setActiveTab, visited }) {
  const [incidentDateTime, setIncidentDateTime] = useState(null);
  const [realRefresh, setRealRefresh] = useState(0);
  const [editRealDate, setEditRealDate] = useState(null);
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
    setRealRefresh(value => value + 1);
  };
  const editRealRecord = fecha => { setEditRealDate({ fecha }); setActiveTab('fichaje'); };

  const handlePeriodsUpdated = (updatedPeriods) => {
    setPeriods(updatedPeriods);
    if (updatedPeriods.length > 0 && !updatedPeriods.find(p => p.id === selectedPeriodId)) {
      setSelectedPeriodId(updatedPeriods[0].id);
    }
  };

  return (
    <div className="app-layout" hidden={activeTab === 'inicio'}>

      <main className="main-content" hidden={activeTab === 'inicio'}>
        <section hidden={activeTab !== 'fichaje'}>{visited.includes('fichaje') && (
          <div className="view-grid">
            <div>
              <LiveShift onLogSaved={handleLogSaved} onAddIncident={() => setIncidentDateTime(currentIncidentDateTime())} onViewIncidents={() => setActiveTab('incidencias')} />
              <RealTimeRecords onUpdated={handleLogSaved} refreshKey={realRefresh} editDate={editRealDate} />
              <details className="manual-fichaje disclosure-panel"><summary>Registrar una jornada manualmente</summary>
                <FichajeForm onLogSaved={handleLogSaved} onAddIncident={date => setIncidentDateTime(`${date}T${currentIncidentDateTime().slice(11)}`)} />
              </details>
            </div>
            <div>
              <PeriodSelector 
                periods={periods} 
                selectedPeriodId={selectedPeriodId} 
                onSelectPeriod={setSelectedPeriodId} 
              />
              <details className="disclosure-panel payroll-days"><summary><span>Días del periodo<small>Consultar, editar o borrar registros</small></span><span className="disclosure-value">{summary?.logs?.length ?? 0} días</span></summary><div className="disclosure-body">
              <FichajesList
                logs={summary ? summary.logs : []} 
                onDeleteLog={updateSummary} 
                onLogUpdated={handleLogSaved}
                onEditRealRecord={editRealRecord}
              />
              </div></details>
            </div>
          </div>
        )}</section>

        <section hidden={activeTab !== 'calendario'}>{visited.includes('calendario') && (
          <CalendarView onCalendarUpdated={handleLogSaved} />
        )}</section>

        <section hidden={activeTab !== 'resumen'}>{visited.includes('resumen') && (
          <div className="resumen-view-container">
            <PeriodSelector 
              periods={periods} 
              selectedPeriodId={selectedPeriodId} 
              onSelectPeriod={setSelectedPeriodId} 
            />
            <ResumenCard summary={summary} />
            <details className="disclosure-panel payroll-days"><summary><span>Días del periodo<small>Consultar, editar o borrar registros</small></span><span className="disclosure-value">{summary?.logs?.length ?? 0} días</span></summary><div className="disclosure-body">
              <FichajesList
              logs={summary ? summary.logs : []} 
              onDeleteLog={updateSummary} 
              onLogUpdated={handleLogSaved}
              onEditRealRecord={editRealRecord}
            />
            </div></details>
          </div>
        )}</section>

        <section hidden={activeTab !== 'periodos'}>{visited.includes('periodos') && (
          <TablaPeriodosATH onPeriodsUpdated={handlePeriodsUpdated} />
        )}</section>

        <section hidden={activeTab !== 'incidencias'}>{visited.includes('incidencias') && <IncidenciasView />}</section>
        <section hidden={activeTab !== 'familiar'}>{visited.includes('familiar') && <FamilyCalendar active={activeTab === 'familiar'} refreshKey={realRefresh} onOpenCalendar={() => setActiveTab('calendario')} />}</section>

        <section hidden={activeTab !== 'config'}>{visited.includes('config') && (
          <ConfigView onConfigSaved={updateSummary} />
        )}</section>
      </main>

      {incidentDateTime && <IncidentQuickEntry initialDateTime={incidentDateTime} onClose={() => setIncidentDateTime(null)} onViewIncidents={() => { setIncidentDateTime(null); setActiveTab('incidencias'); }} />}

      <footer className="app-footer" hidden={activeTab === 'inicio'}>
        <p>TES Control & Nómina • Diseñado para Técnicos en Emergencias Sanitarias</p>
      </footer>
    </div>
  );
}
