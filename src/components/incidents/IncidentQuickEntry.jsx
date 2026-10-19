import React, { useEffect, useRef, useState } from 'react';
import IncidentForm from './IncidentForm.jsx';
import './IncidenciasView.css';

export default function IncidentQuickEntry({ initialDateTime, onClose, onViewIncidents }) {
  const dialogRef = useRef(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { dialogRef.current.showModal(); }, []);
  return <dialog ref={dialogRef} className="incident-dialog incident-quick-dialog incidents-view" onCancel={onClose} onClose={onClose} aria-labelledby="quick-incident-title">
    <div className="incident-dialog-toolbar"><h2 id="quick-incident-title">Incidencia del turno</h2><button type="button" onClick={onClose} autoFocus>Volver al fichaje</button></div>
    <p className="incidents-intro">Se guarda en Incidencias. Puedes registrarla sin terminar ni guardar el turno.</p>
    {saved && <p role="status" className="incident-success">Incidencia guardada. Puedes volver al fichaje o consultar el registro.</p>}
    <IncidentForm initialDateTime={initialDateTime} onSaved={() => setSaved(true)} />
    <div className="incident-actions"><button type="button" onClick={onViewIncidents}>Ver todas las incidencias</button></div>
  </dialog>;
}
