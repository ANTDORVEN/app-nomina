import React from 'react';

export default function PayrollChoice({ value, onChange, hasScheduledWork }) {
  return <fieldset className="payroll-choice">
    <legend>¿Añadir estas horas a la nómina?</legend>
    {hasScheduledWork && <p>Este día ya cuenta por cuadrante. Si eliges Sí, las horas reales sustituyen a las del cuadrante en el cálculo de ese día.</p>}
    {!hasScheduledWork && <p>Este día no tiene jornada de trabajo contada por cuadrante.</p>}
    <div><button type="button" aria-pressed={value === true} onClick={() => onChange(true)}>Sí</button><button type="button" aria-pressed={value === false} onClick={() => onChange(false)}>No</button></div>
    <small>{value ? 'Contará en nómina como añadido manualmente.' : 'Solo informativo. El cuadrante seguirá contando como hasta ahora.'}</small>
  </fieldset>;
}
