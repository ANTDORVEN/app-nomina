# TES Control & Nómina — Documento de Traspaso del Proyecto

## Revisión del 08/10/2026 (prevalece sobre las notas históricas siguientes)

- Fecha de ingreso confirmada por Antonio: 11/11/2020. Se corrige la fecha inicial 01/11/2021, conservando otras fechas personalizadas.
- La nómina de septiembre de 2026 mantiene salario base, convenio, prorrata y antigüedad con 30 días de vacaciones. Las vacaciones ya no se descuentan del bloque fijo. El tratamiento de bajas, paternidad y asuntos propios sigue pendiente de revisión; no se ha validado con esta nómina.
- Los importes de referencia de 30 días son 1.253,26 €, 167,52 €, 247,24 € y 62,66 €. Se conservan decimales al dividir entre 30 y se redondea cada concepto antes de sumar. La regla histórica de días liquidables / 30 se mantiene; falta contrastar meses completos de 28, 29 y 31 días.
- Los ajustes ahora editan importes de referencia mensuales y guardan también sus equivalentes diarios para compatibilidad. Las copias antiguas con precios diarios personalizados conservan su equivalencia mensual.
- Se elimina la migración que sustituía 12,47/21,82 € por 12,36/21,63 € y 37,60 € por 62,66 €: son valores de distintos tramos, no errores por sí mismos. No hay actualización automática de tarifas por antigüedad ni historial de tarifas por periodo.
- Nuevo tipo `jornada_adicional`: todas las horas pagadas van a jornada complementaria, descontando descansos. Si se marca festivo, solo se aplica la tarifa festiva.
- Antonio confirma que realizó la jornada de Dani del 29/08/2026 (06:00-14:30) y debía cobrarla completa. En la copia original figura como mañana. Reclasificarla produce 26,32 horas complementarias, frente a 29 pagadas; Antonio indica que hubo horas sin registrar. No reconstruirlas ni declarar una deuda a partir de esta diferencia.
- Los valores iniciales incluyen los 12 periodos del PDF ATH 2026. Se conservan los periodos ya guardados por el usuario.
- Tercera paga: la nómina contiene «CUOTA PPE ACUERDO 05-11-25», 169,78 €. Los comunicados aportados recogen desacuerdos; no hay acuerdo final confirmado. No automatizar este importe ni la subida del 2 % ni el límite/arrastre de 80 horas como reglas cerradas.
- Comprobaciones automatizadas: `npm run test`, `npm run lint`, `npm run build`. Una compilación correcta no valida los conceptos pendientes.

---

**Propietario:** Antonio, Técnico en Emergencias Sanitarias (TES) en ATH Ambulancias Tenorio, Sevilla.
**Objetivo de la app:** controlar turnos, guardias, calendario anual y calcular la nómina mensual estimada, todo en una sola app, sin depender de varias herramientas.
**Uso:** personal (con intención futura de adaptarla para otros compañeros/sectores, ver sección final).

---

## 1. Stack técnico y dónde vive el proyecto

- **Stack:** Vite + React + Vanilla CSS.
- **Editor:** Google Antigravity (IDE basado en VS Code, con agente de IA integrado).
- **Repositorio:** GitHub — `https://github.com/ANTDORVEN/app-nomina` (rama `main`).
- **Despliegue:** Netlify, conectado a GitHub — se actualiza automáticamente con cada `git push`. URL pública: `app-nomina-tes.netlify.app`.
- **Almacenamiento de datos:** `localStorage` del navegador — **cada dispositivo/navegador tiene sus propios datos, no se sincronizan entre sí**. Hay función de exportar/importar backup en JSON (en Ajustes) para mover datos entre dispositivos.
- **Flujo de trabajo:** editar código en Antigravity (local) → `git commit` + `git push` → Netlify despliega solo en 1-2 min. En móvil, si no se ven los cambios, hay que **cerrar la app del todo** (deslizar hacia arriba, no solo minimizar) y volver a abrirla, por caché.

## 2. Estructura de carpetas

```
app-nomina/
├── src/
│   ├── components/
│   │   ├── common/ (Header.jsx, Header.css)
│   │   ├── shift/ (FichajeForm.jsx, FichajesList.jsx + .css)
│   │   ├── payroll/ (ResumenCard.jsx, PeriodSelector.jsx, TablaPeriodosATH.jsx + .css)
│   │   └── calendar/ (CalendarView.jsx, CalendarView.css)
│   ├── models/
│   │   └── defaultData.js       # Datos semilla: tipos de turno TES y periodos ATH
│   ├── services/
│   │   ├── storageService.js    # Capa de almacenamiento local (localStorage)
│   │   ├── shiftService.js      # CRUD de turnos y periodos
│   │   └── payrollService.js    # Algoritmo de cálculo de nómina (el más importante)
│   ├── utils/
│   │   ├── dateUtils.js         # Operaciones con fechas, franjas que cruzan medianoche
│   │   └── calendarUtils.js     # Generación de la matriz del calendario mensual
│   ├── App.jsx
│   └── main.jsx
```

## 3. Modelo de datos: tipos de turno (`shiftTypes`)

| id | Nombre | Corto | Notas |
|---|---|---|---|
| manana | Mañana (M) | M | Horario editable (por defecto 07:00-15:00) |
| tarde | Tarde (T) | T | |
| noche | Noche (N) | N | Genera nocturnidad |
| turno12 | Turno 12h (11h Pagadas) | 12h | 1h de descanso no pagada |
| guardia24 | Guardia 24h | G24 | Genera nocturnidad |
| patron_5x2 | Patrón 5x2 / 2x5 | 5x2 | Semana 5 días trabajo/2 libres, alterna con 2/5 |
| sabado_alterno | Sábado Alterno | S. Alt | Horario editable, puede ser sábado o domingo |
| festivo | Festivo Trabajado | Fest. | `esFestivo: true` → activa precio especial |
| vacaciones | Vacaciones | Vac. | `esAusencia: true` |
| baja_laboral | Baja Laboral/Médica | B. Méd | `esAusencia: true` |
| paternidad_maternidad | Baja Paternidad/Maternidad | B. Pat | `esAusencia: true` |
| asuntos_propios | Asuntos Propios/Moscoso | A.P. | `esAusencia: true` |
| libre | Descanso/Libre | Libre | |

## 4. Convenio y tarifas (Convenio Sevilla, categoría TES, tramo 5 años de antigüedad)

**Confirmado y verificado contra nóminas reales de julio y agosto 2026** (ver sección 6):

| Concepto | Valor |
|---|---|
| Salario Base | 41,78 €/día |
| Plus Convenio | 5,58 €/día |
| Prorrata Paga Extra | 8,24 €/día |
| Antigüedad (base mensual completa, 5 años) | 62,66 €/mes |
| Precio hora J.Complement (exceso presencial, día normal) | **12,36 €/hora** |
| Precio hora Extraordinaria/Festiva | **21,63 €/hora** |
| Plus Nocturnidad | 1,85 €/hora |
| Cotización SS total (Comunes 4,70% + MEI 0,15% + Form.Prof. 0,10% + Desempleo 1,55%) | 6,50% |
| IRPF | Variable mes a mes (10,34% en agosto, 12,16% en julio) — no es fijo, lo recalcula la empresa según previsión anual |

⚠️ Ojo: en una iteración anterior se configuraron por error 12,47€/h y 21,82€/h — **están corregidos** a 12,36€ y 21,63€, verificado contra nómina real.

## 5. Lógica de cálculo de nómina (`payrollService.js`) — LA PARTE MÁS IMPORTANTE

Cada "Nómina" (ej. "Nómina Agosto 2026") se compone de **DOS BLOQUES que se SUMAN**, calculados sobre **rangos de fechas distintos**:

### Bloque 1 — Fijo (calculado sobre el MES NATURAL, ej. 1-31 de agosto)
- `días liquidables = días naturales del mes − días marcados como tipo AUSENCIA (esAusencia: true) dentro de ese mes`
- **Importante:** esto NO depende de si el resto de días tienen un fichaje de trabajo explícito. Un fin de semana sin fichar cuenta igualmente como día liquidable normal (el salario base cubre todo el mes salvo ausencias).
- Salario Base = días liquidables × 41,78€
- Plus Convenio = días liquidables × 5,58€
- Prorrata Paga Extra = días liquidables × 8,24€
- Antigüedad = 62,66€ × (días liquidables / 30)

### Bloque 2 — Variable (calculado sobre el RANGO de la Tabla de Periodos ATH, ej. 15/07-13/08 para "Agosto")
- J.Complement = horas de exceso presencial en días normales × 12,36€/h
- Horas Extraordinarias/Festivas = horas trabajadas en día festivo × 21,63€/h (**excluyente** con J.Complement — un día festivo nunca suma también a J.Complement)
- Nocturnidad = horas en turno de noche × 1,85€/h

### Total = Bloque Fijo + Bloque Variable

**Verificado exacto contra nómina real de agosto 2026** (31 días − 8 días de ausencia = 23 días liquidables → coincide al céntimo con Salario Base, Plus Convenio, Prorrata y Antigüedad reales).

## 6. Tabla de Periodos de Cómputo ATH 2026 (Bloque Variable)

| Nómina | Inicio | Fin |
|---|---|---|
| Enero | 15/12/2025 | 18/01/2026 |
| Febrero | 19/01/2026 | 19/02/2026 |
| Marzo | 20/02/2026 | 24/03/2026 |
| Abril | 25/03/2026 | 09/04/2026 |
| Mayo | 10/04/2026 | 12/05/2026 |
| Junio | 13/05/2026 | 14/06/2026 |
| Julio | 15/06/2026 | 14/07/2026 |
| Agosto | 15/07/2026 | 13/08/2026 |
| Septiembre | 14/08/2026 | 14/09/2026 |
| Octubre | 15/09/2026 | 16/10/2026 |
| Noviembre | 17/10/2026 | 19/11/2026 |
| Diciembre | 20/11/2026 | 11/12/2026 |

Esta tabla la publica la empresa cada año y hay que actualizarla manualmente (pantalla "Tabla ATH" en la app) cuando cambie.

## 7. Bugs ya corregidos (histórico)

- Horario fijo en el generador de patrón (no respetaba horas personalizadas).
- Columna equivocada al generar "Sábado Alterno" (aparecía en Lunes).
- Duplicación de horas en nómina (J.Complement + Horas Extra sumando las mismas horas a la vez).
- Etiquetas del calendario sin abreviar (ahora: M, T, N, G24, 5x2, S.Alt, Fest., Vac., B.Méd, B.Pat, A.P., Libre, 12h).
- Descuadre visual en móvil (menús/navegación).
- Botón "Exportar Backup" no funcionaba en navegadores móviles (solucionado con Web Share API).
- Formato de horas: decimal (8,83h) → horas y minutos (8h 50min) solo visual, cálculos internos siguen en decimal.
- Tarifas mal configuradas (12,47€/21,82€ → corregidas a 12,36€/21,63€).
- Antigüedad como importe fijo → corregida a prorrateada por días.
- Días liquidables mal calculados (contaba solo días con fichaje de trabajo) → corregido a "días del mes − ausencias".
- Mensaje de confirmación "✅ Fichaje guardado" al guardar un fichaje.

## 8. Mejoras pendientes (por prioridad)

### Ajustes menores
- [ ] Descuadre visual en pantalla "Fichar/Diario" (comparar CSS con `CalendarView.css`, que sí está bien).
- [ ] Bug: en el formulario de fichaje individual (no el generador de patrón), los campos Hora Entrada/Salida a veces no son editables y se quedan fijos en 8:00-16:00.
- [ ] Revisar pequeño desfase en Bloque Variable (J.Complement dio 16h23min en la app vs 17,77h en nómina real de agosto — probablemente fichajes con minutos sueltos sin registrar con precisión).

### Funcionalidad media
- [ ] **Tope de 80h de exceso pagadas por periodo, con arrastre al siguiente mes.** La empresa solo paga máx. 80h de J.Complement por nómina; el exceso se arrastra al periodo siguiente hasta completarse (algunos compañeros acumulan "deuda de horas"). Necesita: lógica de arrastre entre periodos, indicador visual de horas pendientes acumuladas, respetar el tope también en el periodo con arrastre.
- [ ] **Cálculo de Neto (deducciones):**
  - Cotizaciones SS (6,50% fijo) → fácil de automatizar con precisión.
  - IRPF → NO es un % fijo (la empresa lo recalcula mes a mes según previsión anual). Propuesta: campo configurable en Ajustes donde el usuario introduce el % de IRPF de su última nómina real, y la app lo aplica sobre el bruto para estimar el neto.

### Proyecto futuro — versión multi-sector / monetizable
Idea: adaptar la app para que cualquier usuario (no solo TES de ATH) pueda configurarla para su sector.

- **Fase A — Desvincular de ATH:** nombre de empresa y logo configurables (no fijos), Tabla de Periodos vacía por defecto y configurable desde cero.
- **Fase B — Generalizar convenio/categoría:** asistente de configuración inicial (sector, precios, tipos de turno editables/creables por el usuario, no fijos a TES).
- **Fase C — Multiusuario real (backend):** cuentas de usuario, login, base de datos (ej. Supabase). Aquí ya hay coste de infraestructura. Antes de monetizar: revisar RGPD (datos de terceros) y posibles cláusulas del contrato con ATH sobre propiedad intelectual/actividades paralelas — no es asesoría legal, solo un aviso a revisar.
- **Orden sugerido:** A y B primero (gratis, sirve como pieza de portafolio "app configurable multi-sector"), validar interés real con un grupo pequeño antes de plantear la Fase C.

## 9. Notas de aprendizaje / contexto del usuario

- Antonio es estudiante de DAW (FP Superior, ILerna), pero llevaba tiempo desconectado de la programación.
- Prioridad pedagógica: explicar cada paso con calma, usando analogías simples, antes de tocar código. Evitar dar nada por sobreentendido.
- Este proyecto también se usará como pieza de portafolio — cuidar que el código quede limpio, comentado y bien estructurado, no solo funcional.
- Antonio prefiere ir probando y usando la app en el día a día para encontrar fallos reales, en vez de sesiones maratonianas de desarrollo — el ritmo de trabajo es iterativo: usar → detectar fallo → corregir → verificar contra datos reales → seguir usando.
- Regla de oro seguida en este proyecto: **nunca dar un fix por bueno solo porque el agente dice "arreglado"** — siempre verificar con captura de pantalla o comparando contra una nómina real en papel.

---
*Documento generado el 08/08/2026 (actualizado 01/09/2026) para servir de contexto a cualquier IA o persona que retome el proyecto.*
