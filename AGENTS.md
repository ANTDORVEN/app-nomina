# Instrucciones del proyecto

Estas instrucciones se aplican a todo el proyecto.

## Comunicación con Antonio

- Responde en español, de forma directa, natural y concreta. Usa palabras comunes, frases de longitud variada y una estructura fácil de seguir.
- Ve al grano. Elimina relleno, introducciones genéricas, clichés, lenguaje corporativo y conclusiones que repitan lo explicado.
- Evita contrastes artificiales como «No es X, es Y», frases efectistas encadenadas y expresiones como «cabe destacar», «en definitiva» o «en este sentido» cuando no aporten información.
- No exageres ni inventes datos, fuentes, experiencias o conclusiones. Si algo no se sabe o no se ha comprobado, dilo.
- Usa listas, apartados, tablas y negritas solo cuando ayuden a entender el contenido. Evita estructuras repetitivas y agrupar siempre las ideas de tres en tres.
- Adapta el tono al contexto. Si reescribes un texto de Antonio, conserva su significado y su forma de expresarse. No introduzcas errores para parecer humano.
- Antes de entregar una respuesta, revísala en silencio y elimina lo genérico, repetitivo o artificial. No expliques esta revisión.
- Explica los cambios con palabras sencillas. Antonio estudia DAW: introduce los detalles técnicos cuando sean útiles y explica su propósito sin dar conocimientos por supuestos.

## Contexto de la aplicación

- TES Control & Nómina es una aplicación personal para registrar turnos, organizar el calendario y estimar la nómina de ATH Ambulancias Tenorio.
- Está desarrollada con React, Vite y CSS. El código principal está en `src/`.
- Los datos se guardan en el `localStorage` de cada navegador. La aplicación permite exportar e importar copias JSON; actualmente no hay sincronización entre dispositivos.
- Lee `TRASPASO.md` antes de cambiar reglas de negocio. Contiene el contexto, las decisiones anteriores y tareas pendientes. Contrasta sus indicaciones con el código actual: puede quedar desactualizado.
- `README.md` conserva información genérica de la plantilla y no describe por completo la aplicación.

## Forma de trabajar

- Revisa los archivos afectados antes de editar y respeta los cambios locales existentes.
- Limita los cambios al trabajo solicitado. No añadas dependencias ni hagas reorganizaciones amplias sin una necesidad concreta.
- Conserva la separación entre componentes, servicios, modelos y utilidades.
- Cuida los datos guardados: evita cambios que borren fichajes, tarifas, periodos o copias de seguridad. Si cambias su estructura, contempla los datos existentes.
- No publiques, despliegues ni envíes cambios al repositorio remoto sin autorización de Antonio.
- Al terminar, explica qué has cambiado, qué has comprobado y qué queda pendiente de verificar. Distingue los cambios locales de los publicados.

## Cálculo de nómina

- El cálculo actual separa dos bloques: conceptos fijos del mes natural y conceptos variables del rango de fechas de la tabla ATH.
- Mantén esa separación al corregir o ampliar el cálculo.
- Evita contabilizar las mismas horas a la vez como jornada complementaria y horas extraordinarias o festivas.
- No cambies tarifas, tratamiento de ausencias, antigüedad, nocturnidad o límites de horas basándote en suposiciones. Comprueba los requisitos y explica cualquier incertidumbre.
- Las afirmaciones de `TRASPASO.md` sobre validación con nóminas anteriores son contexto histórico. No equivalen a una comprobación propia de los cambios nuevos.
- Una compilación correcta no demuestra que la nómina coincida con la real. Verifica las modificaciones del cálculo con casos concretos y, cuando estén disponibles, con nóminas aportadas por Antonio.

## Comprobaciones

- Después de cambiar código, ejecuta `npm run lint` y `npm run build` cuando corresponda.
- Añade o ejecuta pruebas específicas cuando sean necesarias para comprobar cambios de lógica, especialmente en fechas, horas y nómina.
- En cambios visuales, comprueba la interfaz y su adaptación al móvil si dispones de medios para hacerlo. Si no puedes, indica esa limitación.
- No des un fallo por resuelto solo por haber editado el código: informa de la comprobación realizada y su alcance.
