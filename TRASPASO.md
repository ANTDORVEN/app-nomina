# TES Control & Nómina — Documento de Traspaso del Proyecto

## Publicación autorizada — 24/10/2026

- Antonio pide subir la versión revisada para su móvil. Se publica el código actual: cadencias desde cero, categorías y tipos propios, iconos familiares y correcciones de guardias/horas reales/contador descritas abajo.
- Las sugerencias de aviso de copia, comparación ampliada al terminar, detección de solapes y deshacer cuadrante NO están implementadas ni forman parte de esta publicación. Cómputo mensual de guardias sigue pendiente de nómina real.
- Validación previa: 72 pruebas, lint y build correctos; archivo de producción index-C7QBng1j.js. Se conserva dominio y claves de almacenamiento; no se incluyen datos de localhost. Publicación mediante el repositorio conectado a Netlify. La confirmación del despliegue debe verificarse en el dominio público.

## Tipos de turno propios e iconos familiares — 23/10/2026, solo local

- Antonio confirma cadencias y tipos de turno propios y pide emojis en nombres e iconos de cada persona. Ajustes / Tarifas → Mis tipos de turno permite crear y editar nombre, abreviatura/emoji, color, horario y pausa. Sin tipos personales predefinidos. Se elige expresamente el tratamiento de nómina de un tipo existente; no se añaden reglas ni tarifas nuevas.
- customShiftService guarda las definiciones en tes_nomina_custom_shift_types. Selectores de calendario, cadencias, fichajes manuales y reales y contador incluyen los tipos personales. Cada jornada conserva tipoTurnoId base y tipoTurnoPersonalizadoId opcional; el motor salarial sigue usando el tipo base. Cambiar nombre/color/horario habitual no reescribe horas de jornadas aplicadas; cambiar tratamiento de un tipo ya usado requiere crear otro.
- El creador de cadencias carga las horas y pausas habituales al elegir un tipo personal y permite ajustarlas. Las guardias personales con entrada/salida iguales conservan 24h y el cómputo mensual pendiente. No se implementa el límite 160/200h.
- Calendario familiar → Nombres e iconos del calendario: nombre e icono editables para cada persona, 🚑 y 🏥 por defecto para datos anteriores. Se muestran en leyenda y turnos; admite emojis en nombres y cadencias. No se modifican turnos familiares al guardar nombres/iconos; icono vacío permite ocultarlo.
- Las copias JSON incluyen customShiftTypes e iconos; se validan definiciones y referencias de cadencias antes de restaurar. Copias antiguas sin el campo conservan definiciones personales existentes. No hay sincronización entre móviles.
- Verificaciones: 72 pruebas automatizadas, lint y build; navegador aislado con creación/edición de tipos, cadencia con emoji, guardias24, fichaje manual, cambio a tipo base en horas reales sin etiqueta antigua, exportación/restauración JSON con referencias, iconos familiares; vistas 320/390/1280 y modo oscuro sin desbordamiento. Capturas revisadas. Sin tocar datos del navegador de Antonio. Todo sigue local, no publicado.

## Categorías personales y gestión de cadencias — 23/10/2026, solo local

- Antonio pide poder crear categorías de patrón y que la aplicación sea ajustable; su captura todavía muestra el generador antiguo. Se comprueba en navegador aislado que el servidor local sirve el creador nuevo. Para revisarlo debe recargar la página; no hace falta borrar datos.
- Se añade category opcional a las cadencias personales, compatible con copias previas. Campo libre con sugerencias de categorías ya guardadas; selector de cadencias muestra categoría y nombre. Guardar nueva, cargar, actualizar la misma conservando ID, guardar como nueva, eliminar con confirmación y empezar otra vacía. Cambiar/eliminar la definición no modifica turnos ya aplicados.
- customPatternService valida categorías y añade updateCustomPattern/deleteCustomPattern con manejo de fallos de almacenamiento. customPatterns ya se incluye en las copias JSON. No se alteran tarifas ni reglas de nómina.
- Antonio confirma después que quiere también tipos de turno propios. Implementados en el apartado superior; las categorías de cadencia siguen siendo agrupaciones, no categorías profesionales del convenio.
- 65 pruebas superadas, lint/build correctos. Pruebas de navegador: creación de categoría, edición manteniendo identidad, duplicado, cancelación/confirmación del borrado, calendario intacto, carga e inicio vacío; sin desbordamiento a 320px. Repetida comprobación de creador y copias en claro/oscuro y tamaños móvil/ordenador. Sigue solo local.

## Cuadrantes y cadencias desde cero — 23/10/2026, solo local

- Antonio pide no dejar patrones predefinidos: él crea turnos, horas y descansos. Se sustituye el generador de categorías preestablecidas del calendario anual por CustomPatternBuilder, inicialmente vacío y sin fechas, tipo ni horas seleccionados. Cada paso tiene tipo de día, entrada/salida, repeticiones y pausa no pagada; añadir descanso permite indicar tres días u otra cantidad. Se puede ordenar/quitar pasos, guardar cadencias propias y cargarlas expresamente. No se añaden libres por deducción del tipo de guardia.
- customPatternService valida la secuencia y muestra vista previa para el rango elegido antes de confirmar. Usa fechas civiles para la fase, con referencia opcional para continuar ciclos entre meses. Aplica una sola escritura y conserva días existentes por defecto; sustituir requiere marcar su opción, guardando fichajeSustituido. Los registros de horas reales no se modifican. Horas y pausas van al motor actual, sin resolver el cómputo mensual pendiente ni cambiar tarifas.
- Cadencias propias en tes_nomina_custom_patterns, clave CUSTOM_PATTERNS del storageService. Copias incluyen customPatterns con validación antes de restaurar; copias antiguas sin el campo conservan las cadencias existentes. No hay nuevas dependencias.
- También se retiran las secuencias iniciales del creador familiar: nuevo calendario con patterns vacío; creador siempre vacío, horas en blanco al añadir un turno y sin botones de plantillas. Aplicar una cadencia empieza sin selección. Las cadencias y turnos familiares ya almacenados se conservan y pueden cargarse expresamente, incluidas las antiguas; no se borran por esta actualización.
- 61 pruebas superadas, lint/build correctos. Navegador aislado: creador vacío; ciclo personal 07:30–07:30 + tres libres; guardado sin generar fechas; vista previa/aplicación conservando un día manual; carga posterior; copia JSON y restauración de copia antigua conservando cadencias. Claro/oscuro y 320/390/1280 sin desbordamiento. Familiar: crear ciclo sin horas prefijadas, guardar/cargar, aplicar conservando reducción de jornada existente. Se mantiene solo local, no publicado.

## Turno pendiente y horarios manuales — 23/10/2026, solo local

- Nueva captura de Antonio: Mi turno muestra 21/10, entrada 08:24 y salida 19:18, estado Pendiente de guardar; los botones de iniciar/pausar no aparecían porque el contador ya estaba terminado y sin resolver. Se añade aviso visible arriba, Revisar turno pendiente (enfoca el formulario) y Descartar turno pendiente con confirmación. No se borra automáticamente ese turno: descartar solo limpia LIVE_SHIFT_KEY, conserva registros y cuadrante, exige sesión terminada/actualizada y permite iniciar otra. Guardar conserva el recorrido anterior.
- Antonio aclara que introduce personalmente horas y otros campos de cualquier patrón. Esta aclaración prevalece sobre el bloqueo a 08–08 descrito abajo: se desbloquean las horas en todos los patrones y el servicio respeta horas personalizadas. Entrada y salida iguales en guardia son 24 h; distintas calculan la duración indicada. La casilla muestra duración real, evitando rotular 24 h si el usuario eligió 8 h.
- Nuevos patrones de guardias llevan horarioPersonalizado:true y no se proponen como errores antiguos. Una guardia previa con horas iguales y 24h también se respeta aunque sea 07:30–07:30. La corrección explícita de errores antiguos conserva la hora de entrada y pone esa misma hora de salida, guardando original y 24h. No altera los turnos ya guardados sin pulsar y confirmar.
- Comprobaciones: 53 pruebas, lint/build correctos. Navegador aislado: pendiente del 21, cancelar/aceptar descarte, conservación de registros, inicio/pausa/reanudación/fin/guardado del turno nuevo; todos los patrones con horas editables; 07:30–07:30 con 24h y 08–16 con 8h respetados sin aviso de reparación. Sin errores ni desbordamiento a 320px. Todavía solo local, sin publicación.

## Decisión sobre el cómputo mensual — 23/10/2026

- Antonio plantea acumular guardias y turnos normales cronológicamente, con límites de 160/200 h según semanas, y dividir el turno que cruza el límite. Tras las dudas sobre cómo determinar semanas, rango, tarifas y conceptos ya incluidos en el salario fijo, decide expresamente esperar a tener la nómina antes de cambiar el cálculo. No implementar todavía esa propuesta ni convertir 160/200 h en límites automáticos. El trabajo autorizado ahora son las correcciones de las capturas descritas debajo.

## Correcciones de guardias y fichaje real — 23/10/2026, solo local

- Antonio aporta capturas: guardias automáticas de noviembre etiquetadas G24 pero con 08–16 y 8h; otras guardias generadas a 07:30–07:30; fichaje real del 22/10 07:53 al 23/10 08:03 con 24h10 y No (Solo informativo). Antonio indica salida 08:05: no cambiar el dato real basándose solo en esa discrepancia.
- Causa del generador: categoría inicial guardia24 pero estado inicial de salida 16:00; el horario correcto solo se sugería al cambiar la categoría. Se fija 08–08 al generar y se protege el servicio contra 08–16. El guardado del día en calendario ahora conserva 24h cuando las horas son iguales, y cero excesos diarios para guardia24. Fichaje manual propone 08–08 y marca esPatronAuto:false para protegerlo de reparaciones posteriores.
- guardiaService ofrece vista previa de guardias automáticas con hora/duración incorrecta y reparación explícita desde Calendario. Solo esPatronAuto:true sin registro real/contador; respeta manuales, libres, IDs y conserva el original dentro de guardiaGeneradaOriginal. Escritura única, fallo deja los registros originales. No se aplica automáticamente ni se recrea todo el cuadrante.
- El fichaje real de la captura sí estaba guardado: No mantiene el cuadrante para nómina, conforme a la regla acordada. FichajesList muestra ahora en el mismo día la comparación del real informativo con el cuadrante y un acceso para revisar/cambiar la decisión. Al guardar el contador, mensaje explícito y botón Ver o corregir este fichaje.
- Se añade fechaSalidaReal opcional compatible con copias antiguas. El contador la guarda a partir de endedAt; los registros antiguos la deducen del contador o del cruce de medianoche. Edición de horas reales muestra día de salida y duración correcta: 07:53 a 08:05 del día siguiente = 24h12. Cambiar solo Sí/No o el tipo mantiene los segundos del contador; cambiar horas/fecha conserva su evidencia en registroEnVivoOriginal. Nunca convertir este caso en 12 minutos. Validación de fecha final y coherencia de timestamps, también al importar copias.
- Se sustituye la vista previa de borrado en un efecto dependiente de un array nuevo por un cálculo derivado, evitando actualizaciones continuas con el modal abierto. Sin cambios en tarifas, nómina fija, rango ATH o cómputo mensual pendiente de guardias. El exceso de 12 minutos no se interpreta automáticamente como complemento pagadero.
- Comprobaciones: 50 pruebas (8 nuevas), lint/build correctos. Navegador aislado con datos sintéticos: guardias nuevas y reparación selectiva; editar guardia 08–08 conserva 24h; salida del día siguiente y 24h12; No conserva cuadrante, Sí sustituye sin duplicar; cierre y guardado del contador del 22 al 23; acceso al registro. Repasadas siete pantallas claro/oscuro a 320/390/1280 y edición desplegable sin pérdida de borradores. Capturas revisadas. Datos del móvil intactos, no se ha publicado ni enviado al remoto. Servidor local iniciado para revisar.

## Versión autorizada para publicar — 21/10/2026

- Antonio autoriza subir la versión actual para usarla en su móvil. Se aparca la monetización y la distribución en tiendas; esta autorización corresponde a actualizar la web personal existente en Netlify.
- Incluye los cambios visuales aprobados: claro/oscuro persistente, secciones desplegables, calendario anual simplificado, días libres azul grisáceo suave y calendario familiar claro/oscuro. Las propuestas posteriores para suavizar el familiar no se implementaron: se publica el estado probado actual.
- Solo código: no se incluyen datos de localhost ni de las pruebas. Se conserva el dominio y las claves de almacenamiento de fichajes, tarifas, incidencias y calendarios. No borrar datos del navegador ni reinstalar para actualizar.
- Validación previa a publicar: 42 pruebas superadas, lint/build correctos; archivo de producción `index-DIFpYS8j.js`. Las notas anteriores de solo local son el historial previo a esta autorización.

## Calendario anual más discreto — 21/10/2026, solo local

- Tras ver la captura con guardias alternadas y muchas casillas Libre, Antonio indica que todavía le choca visualmente. Se sustituyen las tarjetas y barras por una cuadrícula continua con líneas suaves: descansos blancos con Libre pequeño, turnos con fondo tintado según su color y guardias con 24 h grande. Fuera del mes solo se muestran números discretos; se quitan semanas completas que no contienen ningún día del mes visible.
- Cabecera con mes, Hoy y flechas; generación de patrones/ausencias y borrado de cadencias en Organizar turnos, bajo la cuadrícula. Leyenda también plegada debajo. Se elimina el tooltip nativo largo; notas y horarios se consultan al pulsar el día. Las casillas son botones con descripción accesible y apertura por teclado.
- Sin cambios de datos o cálculo. Lint/build correctos. Navegador aislado con diciembre y 8 guardias sintéticas: 35 casillas, claro/oscuro y anchuras 320/390/1100 sin desbordamiento, apertura por teclado con horario 08:00–08:00 conservado, herramientas de generar/borrar accesibles y almacenamiento intacto. Capturas revisadas en móvil y ordenador. No publicado.

## Secciones desplegables — 21/10/2026, solo local

- Antonio pide mostrar lo importante de un vistazo y desplegar las herramientas de consulta/edición, con una presentación sencilla inspirada en las filas de ajustes de iOS. En Resumen Nómina quedan visibles el importe, las horas y los totales fijo/variable; desglose y lista de días (con contador) están plegados inicialmente. El listado de Fichar también se pliega.
- Formularios y consulta de horas reales en desplegables separados; pulsar Editar, tanto en su historial como desde Resumen, abre automáticamente el formulario y mantiene la fecha. Ajustes se divide en salario/antigüedad, tarifas y horarios; exportar copia sigue visible e importar/copiar se despliega. También se pliegan añadir incidencia, añadir periodo y nombres familiares. Editar incidencia abre y enfoca su formulario. Los campos inválidos de Ajustes abren su panel antes de la validación del navegador.
- Se usan detalles nativos, sin desmontar formularios ni cambiar el almacenamiento o el cálculo. Las pausas del contador y el aviso de cómputo pendiente siguen visibles. Texto de la métrica Horas Liquidadas cambiado a Horas registradas para describir el dato mostrado.
- Comprobado en navegador aislado con 16 días sintéticos: plegar/desplegar no cambia importes ni datos, borrador de edición conservado, edición de horas reales desde Resumen abre el formulario y mantiene el cuadrante, validación de ajustes y edición de incidencias accesibles. Repetidas pruebas de cadencias/navegación y siete secciones en claro/oscuro a 320/390/1280px sin desbordamiento. 42 pruebas existentes superadas, lint/build correctos. Solo local; pendiente revisión de Antonio en su móvil.

## Aspecto claro y oscuro — 21/10/2026, solo local

- Antonio solicita simplificar la presentación de toda la app y conservar las funciones. Se elimina el CSS sobrante de la plantilla y se centraliza la paleta en `variables.css`: superficies claras por defecto y alternativa oscura, con avisos, textos y calendarios adaptados a ambos aspectos. Se mantienen los siete accesos grandes y los colores verde/amarillo/rojo del contador.
- Selector Claro / Oscuro visible en todas las secciones, gestionado por `ThemeToggle` y `themeService`. Preferencia independiente en `tes_nomina_theme`, aplicada antes de renderizar y conservada al recargar. No modifica datos de nómina, copias, fichajes ni tarifas; si falla el guardado del aspecto se avisa y se conserva el cambio en la sesión.
- Calendario anual con leyenda desplegable y códigos más grandes; franjas de color para identificar el turno y texto de contraste estable. Familiar conserva azul/rosa por persona y amarillo para ambos libres, también en oscuro. Formularios móviles con texto de 16px para evitar el zoom automático y botones de al menos 44px.
- Verificación: lint/build correctos y 42 pruebas existentes superadas. Navegador aislado: siete secciones en ambos aspectos a 320/390/1280px sin desbordamiento de página, persistencia tras recarga, borrador conservado, cambio de aspecto con contador activo y pausado sin alterar su registro; cadencias y cuadrante comprobados con datos sintéticos. No se trasladan los datos de prueba. Pendiente revisión de Antonio en su móvil; no publicado.

## Calendario familiar claro — 21/10/2026, solo local

- Antonio aporta como referencia una app con casillas claras y turnos grandes y autoriza probar este diseño en el calendario familiar. El tablero mensual usa fondo claro, números oscuros, líneas continuas y dos franjas de ancho completo y posición fija: arriba azul para Antonio, abajo rosa para su pareja. Los nombres se muestran en la leyenda; códigos grandes M/T/N/D/L/24 y leyenda de significados, con los horarios completos al pulsar el día.
- Los días sin datos conservan franjas blancas; no equivalen a libre. Ambos libres sigue amarillo y estrella. Fuera del mes se muestran huecos sin números hasta completar las semanas. El resto de la app conserva el estilo oscuro y las herramientas de aplicar/crear cadencias quedan plegadas bajo el calendario.
- Solo presentación, sin cambios en almacenamiento, turnos ni nómina. Lint/build correctos y prueba de navegador aislado sin errores: calendario, códigos, franjas de ancho completo, coincidencias de libres, creación/edición de cadencias y navegación; sin desbordamiento a 320px. No publicado: la web pública sigue en la versión del 20/10.

## Versión aprobada para publicar — 20/10/2026

- Antonio aprueba publicar el conjunto de cambios: inicio con siete tarjetas grandes, navegación por secciones, incidencias desde fichaje y registro, horas reales con inclusión opcional en nómina y calendario familiar mensual con nombres, fondos por persona, coincidencias de libres en amarillo y creador visual de cadencias.
- Copia de seguridad del móvil exportada por Antonio antes de publicar. Los datos introducidos en localhost son pruebas y no deben trasladarse al móvil ni incluirse como datos iniciales. La publicación solo lleva código; se conserva el almacenamiento del navegador en el mismo dominio.
- Comprobaciones finales: 42 pruebas correctas, lint sin advertencias y build correcto. Las pruebas de navegador aislado verificaron navegación, formularios, generación/edición de cadencias, coincidencias de descanso y adaptación a móvil. Las referencias siguientes a solo local o pendiente de revisión son el historial de esta misma versión, anterior a esta autorización.

## Inicio y calendario familiar — 19/10/2026, versión local

- Coincidencias de descanso: fondo amarillo y estrella solo cuando el cuadrante propio tiene tipo libre y el turno de pareja también es libre. Los días sin datos, vacaciones u otras ausencias no se interpretan como libre. La leyenda y la descripción accesible indican Ambos libres. Sin cambios en datos ni nómina.

- Ajuste visual del 20/10: Antonio elige mantener vista mensual, con nombre y fondo por persona. Se muestran bloques azul/rosa con nombre y turno escrito completo; desaparecen letras sueltas y guiones, y los días de otros meses quedan vacíos. Los días sin datos no se marcan como libres. El nombre propio (Antonio por defecto, compatible con datos anteriores) y el de la pareja se editan al pie del calendario. Sin cambios en turnos ni cálculo.

- Ajuste posterior aprobado en local: los siete accesos del inicio usan la misma tarjeta grande. Se elimina la distinción de accesos secundarios pequeños. El creador pasa a CadenceBuilder con tres pasos: elegir base (11 días, semana de mañanas o desde cero), tarjetas de días que se pueden tocar para cambiar tipo/horas, mover/quitar días y botones para añadir un turno; finalmente nombre y guardado. Se mantienen el servicio y los formatos guardados. Probado en navegador aislado: siete tarjetas de igual altura, edición de horas en una tarjeta, añadir un libre, guardar una cadencia sin modificar los turnos ya aplicados.

- Navegación gestionada por AppNavigation, con HomeView y siete accesos grandes: Fichar, Calendario Anual, Resumen, Familiar, Incidencias, Tabla ATH y Ajustes. Cabecera de cada sección con Volver al inicio; sin las pestañas superiores. Las pantallas visitadas permanecen montadas y ocultas para conservar formularios al volver. El inicio no deja un bloque vacío debajo.
- Calendario familiar mensual con los turnos propios leídos de getAllTimeLogs, sin duplicarlos, y turnos de la pareja almacenados aparte en tes_nomina_family_calendar. No afecta a payrollService. Día a día: tipo, horas editables para reducción, libre, notas, quitar turno; noches en fecha de entrada con indicación +1 día.
- Cadencia inicial de 11 días: D N L L L D N L L L L, día 08–20 y noche 20–08. No se precargan fechas, tampoco el 26/11. Se elige fecha de inicio de ciclo y rango a rellenar, o mes visible/dos meses, con vista previa y confirmación. La fecha de referencia se recuerda al aplicar para mantener la fase el mes siguiente; cálculo por fechas civiles, robusto al cambio de hora.
- Por defecto la aplicación de cadencias conserva los días existentes, incluidos los editados por reducción; sustituir requiere marcar su opción. Se pueden crear cadencias con pasos y repeticiones, horas propias, cargar una existente y guardar una adaptación. Incluye semana de mañanas L–V y dos libres. Se puede cambiar el nombre de la pareja.
- JSON incluye familyCalendar con nombre, turnos y cadencias. Las copias antiguas sin ese campo conservan el calendario familiar existente. Sin sincronización entre dispositivos.
- Comprobado con 42 pruebas, lint/build y prueba visual en Chrome aislado (datos sintéticos): siete accesos, ida/vuelta conservando borrador, calendario propio visible, aplicación del ciclo y edición sin alterar los siguientes días, persistencia tras recargar, sin errores de navegador ni desbordamiento horizontal a 320px. Capturas de inicio y familiar en la carpeta de artefactos de esta conversación. Sigue solo en local, sin commit ni publicación.

## Horas reales — segunda fase del 19/10/2026, pendiente de revisión local

- Almacena un registro por fecha en `tes_nomina_real_time_records`; no modifica los fichajes del cuadrante. El formulario está en Fichar / Diario y el contador guarda también en ese registro. Ambos permiten Sí/No para contar en nómina, con No por defecto si hay trabajo en cuadrante y Sí en día libre. Al editar se mantiene la decisión guardada.
- Para evitar duplicados, el bloque variable de payrollService usa una vista derivada: si Sí, sustituye solo para el cálculo la entrada del mismo día por las horas reales; si no hay entrada añade una. Si No, o al borrar, sigue contando el cuadrante original. El bloque fijo siempre usa el cuadrante original. Esta sustitución se explica junto a los botones Sí/No; no se suman ambas jornadas del mismo día.
- Un día libre propone jornada_adicional para pagar completas las horas según el motor existente; con cuadrante propone su tipo. No hay nuevas tarifas ni algoritmo de importes. El tipo y el festivo se pueden corregir. Guardia24 mantiene el cómputo pendiente que ya existía.
- Entradas/salidas manuales cruzan medianoche con la utilidad existente; guardia24 con horas iguales representa 24h. Pausas descontadas una vez, duración visible y marcas de incluido/informativo. El contador conserva precisión de segundos y sus pausas reales. Guardar otra vez la misma fecha actualiza en vez de duplicar.
- Los registros se exportan/importan como realTimeRecords; una copia antigua sin ese campo los conserva. Desde el resumen, editar una fila de horas reales abre su formulario específico. Al borrar esa fila se borra el registro real, nunca el cuadrante.
- Se añadieron pruebas de Sí/No en día libre y con cuadrante, conmutación y borrado, turnos nocturnos, pausas, persistencia, errores de escritura, copias e identidad por día. La comprobación visual interactiva sigue pendiente por no disponer de control de navegador utilizable; Antonio está revisando la página local. No publicar hasta revisar ambas partes.

## Incidencias — 19/10/2026, solo local

- Primera fase autorizada: incidencias con fecha y hora local editable, matrícula, número de coche y motivo multilínea. Guardado en `tes_nomina_incidents` mediante storageService, búsqueda por fecha/matrícula, edición, confirmación de eliminación y vista limpia en diálogo de pantalla completa con copia de texto.
- Formulario compartido `IncidentForm`: se abre desde Mi turno (Añadir incidencia) y desde el fichaje manual (con la fecha seleccionada), sin terminar ni guardar el fichaje. Mi turno incluye Ver incidencias. La sección Incidencias permite consultar y añadir por su cuenta usando el mismo servicio y almacenamiento.
- Exportación/importación JSON incluye incidents; las copias antiguas sin ese campo conservan las incidencias existentes. No hay sincronización entre dispositivos. La persistencia depende del almacenamiento local del navegador, como los fichajes.
- Nómina y cuadrante sin cambios en esta fase. Registro de horas reales con inclusión opcional en nómina pendiente: Antonio quiere revisar Incidencias antes de empezar la segunda fase y publicar al final.
- Comprobaciones: 23 pruebas, lint y build correctos. La revisión visual automática no se completó: el control del navegador se detuvo por no poder verificar su URL. No confundir la web pública con http://127.0.0.1:5173/, que contiene estos cambios todavía sin publicar.

## Revisión del 08/10/2026 (prevalece sobre las notas históricas siguientes)

- Aclaración posterior de Antonio: pausa y almuerzo NO pagados; el contador descuenta siempre las pausas y se elimina la elección de pagarlas. Turnos ordinarios: presencial solo por encima de 8 horas netas, incluido turno12 (12h menos 1h de pausa = 3h de exceso). Se conservan las excepciones anteriores de jornada adicional y sábado alterno hasta aclaración expresa.
- Guardias de 24 horas: Antonio confirma cómputo mensual, sin exceso diario sobre 8h. Se elimina ese exceso diario, se conservan sus horas y se marca la estimación como PARCIAL con cómputo de guardias pendiente. Falta confirmar si usa mes natural o rango ATH, cómo se fija la jornada exigida y cómo se mezclan turnos ordinarios con guardias. Los 168h son un ejemplo, no un umbral fijo. No automatizar el exceso mensual hasta resolverlo. La nocturnidad conserva la lógica anterior; no está validada para esta aclaración. Estas notas sustituyen las decisiones anteriores que permitían pagar pausas.
- Antonio responde que desconoce el rango exacto del cómputo y cómo se mezclan turnos; esperará a ver la nómina de este mes. Mantener el cálculo mensual pendiente hasta disponer de esa comprobación.

- Fichaje con contador incluido en esta versión: pantalla Mi turno con iniciar (verde), pausa/comida y reanudar (amarillo), terminar (rojo). Guarda las fechas reales de entrada, salida y pausas en una clave local separada; al recargar recupera el turno. Cerrar en pausa termina también esa pausa. El registro manual queda desplegable. Al terminar hay revisión antes de guardar: sugiere mañana/tarde/noche según los inicios configurados, con 90 minutos de margen de entrada anticipada; la sugerencia se puede cambiar. No deduce por sí solo jornada adicional ni festivo. Asigna ATH por la fecha local de entrada, también al cruzar medianoche. No divide jornadas entre periodos.
- Las pausas del contador se descuentan siempre conforme a lo indicado por Antonio. El total entre entrada y salida va a horasTrabajadas y las pausas registradas se añaden a horasDescansoNoPagadas; conserva precisión temporal hasta redondear importes. No suma además el descanso por defecto del tipo. Al editar un registro del contador se conserva ese descuento aunque cambie el tipo. Las pausas quedan visibles en el listado y sus fechas incluidas en el JSON del fichaje guardado; el contador todavía activo permanece solo en ese navegador y no forma parte de la copia de fichajes.
- Si hay fichaje en la misma fecha pide confirmar la sustitución y conserva el registro anterior dentro de fichajeSustituido. Los fallos de escritura mantienen el contador pendiente; repetir el guardado no duplica la jornada. Detecta cambios de otra ventana antes de actuar. Se probaron inicio, pausa, recarga, reanudación, cierre y guardado en navegador local, además de pruebas automatizadas de turno nocturno, colisiones y fallos de almacenamiento. Las reglas de nocturnidad existentes no cambian.

- Mejoras incluidas en esta versión: edición desde el listado en Diario y Resumen, con guardado y cancelación. La fecha e identidad del fichaje se conservan, al igual que sus datos adicionales; un fallo de almacenamiento no muestra éxito. El resumen separa conceptos, fórmulas e importes en móvil y utiliza comas decimales.

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

