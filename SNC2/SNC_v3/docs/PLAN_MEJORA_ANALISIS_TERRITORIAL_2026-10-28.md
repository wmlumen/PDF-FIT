# Plan de mejora del Análisis Territorial Catastral

Revisión experta (tributación inmobiliaria, catastro y cartografía) del panel `analisis-territorial.html` y hoja de ruta para que sus datos y métodos puedan publicarse en una revista científica arbitrada.

- Fecha: 28 de octubre de 2026
- Alcance: 266 distritos del Paraguay, liquidación del Impuesto Inmobiliario, ejercicio fiscal 2026
- Fuente principal: planillas de liquidación publicadas por la DNIT (514 planillas, importadas a `data/dnit_cuentas.sqlite`)
- Archivos del panel: `scripts/analisis-territorial.mjs` (cálculo) y `scripts/analisis-territorial.plantilla.html` (presentación)

## 1. Resumen

El panel ya ofrece una lectura útil y única del territorio: 1.862.698 cuentas urbanas y 1.258.173 padrones rurales con su valor fiscal y el impuesto liquidado, comparables entre los 266 distritos. Para que esos datos sean citables en una revista se necesitan tres cosas que hoy faltan o están incompletas:

1. **Calidad de datos medida y declarada.** La revisión encontró texto (nombres y documentos de personas) dentro de columnas numéricas, superficies rurales en otra unidad y cuentas sin superficie. Dos de esos errores alteraban cifras del panel y ya se corrigieron (sección 3); el resto debe medirse con un protocolo explícito y publicarse junto a los resultados.
2. **Rigor tributario.** El panel trabaja con impuesto *liquidado*, no *recaudado*, y con valor *fiscal*, no de *mercado*. Toda conclusión sobre "recaudación" o "equidad del valúo" debe decirlo, y las preguntas sobre calidad del valúo requieren un estudio de razones valor fiscal / precio de venta (IAAO).
3. **Dimensión espacial.** Hoy el análisis no usa la geometría de las parcelas. Vincular cada cuenta corriente con su parcela del SNC permite mapas, autocorrelación espacial y normalización por superficie y población, que son estándar en la literatura.

El plan se organiza en seis fases (A a F), con tareas, criterio de cierre y responsable, y termina con una propuesta concreta de artículo.

## 2. Hallazgos de la revisión

### 2.1 Tributación inmobiliaria

| Hallazgo | Evidencia (base al 28/10/2026) | Consecuencia | Prioridad |
|---|---|---|---|
| El panel mide impuesto liquidado, no cobrado | La DNIT publica la liquidación; no hay datos de pago ni de mora | Frases como "recaudación" deben decir "liquidación". El plan mensual estima potencial, no ingreso | Alta |
| Parte municipal del impuesto | 70 % del impuesto total (69,89 % medido) | Coincide con la norma; conviene citar el artículo vigente de la Ley Orgánica Municipal y el destino del 30 % restante | Media |
| Cuentas donde el impuesto no es el 1 % del valor fiscal | 42.514 de 1.844.930 cuentas urbanas con valor (2,3 %) | Pueden ser exoneraciones, adicionales o errores. Hay que clasificarlas antes de calcular tasas efectivas | Alta |
| Adicional al impuesto (baldíos y otros) | Columnas `impuesto_adicional` y `adicional_rural` presentes | El panel no separa impuesto base y adicional. Es clave para estudiar la política sobre suelo ocioso | Media |
| Valor fiscal frente a valor de mercado | No hay precios de mercado en la base | No se puede afirmar que un distrito está "subvaluado". Se necesita un estudio de razones (fase B) | Alta |
| Impuesto mediano atípico en Ypejhu (Canindeyú) | Gs 1.235.065 por cuenta, mayor que Recoleta (Asunción) | Posible error de planilla o padrón con pocas cuentas grandes. Verificar contra la planilla original | Media |
| Luque aparecía como el distrito de mayor impuesto mediano de Central | Gs 2.358.187 mostrado; valor real Gs 103.434 | Error de cálculo por texto en columnas numéricas. **Corregido** | Hecho |

### 2.2 Catastro

| Hallazgo | Evidencia | Consecuencia | Prioridad |
|---|---|---|---|
| Cuentas urbanas sin superficie de terreno | 51.842 (2,8 %) | No entran al análisis de lotes ni de valor por m². Deben informarse como faltantes por distrito | Media |
| Cuentas sin valor de tierra | 39.375 | Afectan el valor del m² y el Gini | Media |
| Cuentas sin impuesto | 5.521 | Posibles exoneradas. Separar de las que pagan 0 por error | Media |
| Valor edificado sin superficie edificada | 14.850 cuentas (y 1.757 al revés) | Inconsistencia lógica entre campos. Afecta el indicador "% con edificación" | Alta |
| Valor oficial menor que el valor de la tierra | 12.639 cuentas | Inconsistencia: el valor oficial debería sumar tierra y edificación | Media |
| Propiedad horizontal (pisos y salones) | 149.714 cuentas (8 %) | Su superficie es una cuota del terreno común. **Ya se excluyen** del control del lote mínimo | Hecho |
| Lotes urbanos de más de 10 ha | 18.648 | Pueden ser chacras dentro del radio urbano o errores de unidad. Revisar antes de medir concentración del suelo | Media |
| La "zona" de la cuenta corriente no subdivide el distrito | 193 de 247 distritos urbanos tienen una sola zona | Las subdivisiones del panel solo son útiles en Asunción y en pocos distritos. Hacen falta barrios o manzanas desde la cartografía | Alta |
| Asunción publicada en 6 planillas | La Encarnación, La Catedral, San Roque, Santa María de la Asunción, Recoleta, Santísima Trinidad | Ya se muestra el total y cada parte. Documentar que no son barrios oficiales | Hecho |
| Identificador cuenta corriente | Único solo dentro de cada distrito (278.298 se repiten entre distritos) | La clave debe ser departamento + distrito + cuenta. El panel ya lo hace; declararlo en la metodología | Baja |
| Dimensión jurídica ausente | La liquidación no trae titular ni situación registral | El catastro multifinalitario (físico, jurídico, económico) queda incompleto. Ver fase C | Media |

### 2.3 Cartografía

| Hallazgo | Consecuencia | Prioridad |
|---|---|---|
| El análisis no usa la geometría de las parcelas | No hay mapas, ni análisis de vecindad, ni densidades por superficie | Alta |
| Servicio WFS oficial disponible (`snc:parcelas_activas`, límites de departamento, distrito y área urbana) | Permite unir cuentas con parcelas. Campo `ccatastral` a menudo vacío: usar `clave_comparacion` como respaldo | Alta |
| Sistema de referencia | Pedir los datos en EPSG:32721 (UTM 21S) y reproyectar en el servidor; en EPSG:4326 el servicio redondea a 4 decimales (unos 11 m). El Chaco occidental cae en el huso 20S (EPSG:32720) | Media |
| Unidad de análisis | Comparar distritos de tamaños muy distintos genera el problema de la unidad espacial modificable (MAUP). Conviene repetir resultados a nivel de manzana o celda regular | Media |
| Sin normalización por población ni superficie | Los totales favorecen a los distritos grandes. Hace falta impuesto por habitante (Censo 2022) y por km² | Alta |
| Calidad cartográfica no medida | Para publicar hay que informar exactitud posicional, completitud y consistencia topológica de la capa de parcelas (ISO 19157) | Media |

### 2.4 Calidad de datos y privacidad

| Hallazgo | Evidencia | Acción |
|---|---|---|
| Texto en columnas numéricas | 337 celdas urbanas (Luque 62, San Lorenzo 44, Ñemby 34, Lambaré 25…) y 1.207 padrones rurales con superficie inválida | El cálculo ya las trata como faltantes. Falta registrarlas en una tabla de calidad por planilla |
| Datos personales en planillas públicas | Nombres y números de documento de titulares dentro de columnas de superficie e impuesto | No publicarlos nunca. La base derivada para la revista debe eliminarlos (fase A) y el artículo debe declarar el tratamiento |
| Superficie rural poco confiable | Suma nacional de 171 millones de ha, cuando el país tiene unos 40,7 millones. Planillas con otra unidad: Itacurubí de la Cordillera, Pedro Juan Caballero, Capitán Bado, San Juan de Ñeembucú, Villa Hayes, entre otras | Detectar la unidad por planilla (relación HAS/MTS2 y valor por ha). Mientras tanto, no publicar indicadores de superficie rural |
| Un solo ejercicio fiscal | Solo 2026 | Sin serie temporal no hay análisis de evolución. Pedir a la DNIT ejercicios anteriores (2021 a 2025) |

### 2.5 Métodos del panel

| Método | Observación | Mejora |
|---|---|---|
| Gini y curvas de Lorenz | Se informa un valor puntual | Agregar intervalos de confianza por bootstrap y descomposición de Theil (entre y dentro de departamentos) |
| "Mediana de los distritos" como referencia nacional | Da el mismo peso a un distrito de 300 cuentas que a uno de 100.000 | Informar también la mediana ponderada por cuentas |
| Mejor y peor distrito | Sensible al mínimo de 200 cuentas | Informar la sensibilidad (100, 200, 500) y usar percentiles en lugar de extremos |
| Índice de urgencia (pestaña del plan) | Pesos que suman 0,90; empates por redondeo | Normalizar a 100, justificar pesos o usar análisis de componentes principales. Anotado para su autor en `docs/TURNOS_IA.md` |
| Plan mensual de recaudación | Supone que cada edificación incorporada vale la mitad del promedio | Calibrar con altas reales cuando haya un segundo ejercicio y mostrar un rango (escenario bajo, medio, alto) |
| Línea de tendencia en gráficos ampliados | En rankings ordenados no tiene interpretación inferencial | Mostrarla solo en distribuciones y series temporales, o rotularla como descriptiva |
| Recomendaciones automáticas | Reglas fijas sobre umbrales | Documentar cada regla en una ficha técnica y citar su fundamento |

## 3. Correcciones aplicadas el 28/10/2026

1. Saneamiento numérico en el cálculo urbano y rural: un texto en una columna numérica se trata como dato faltante. Efecto principal: el impuesto mediano de Luque pasa de Gs 2.358.187 a Gs 103.434 por cuenta; el ranking "mejor y peor distrito" de Central cambia.
2. Propiedad horizontal excluida del control del lote mínimo: el porcentaje nacional de lotes bajo 360 m² pasa de 16,9 % a 11,0 % (183.808 de 1.665.841 lotes propios).
3. Superficie rural: se descartan valores no numéricos y padrones de más de 200.000 ha.
4. Ranking de urgencia: visible en la vista país y con los porcentajes bien expresados (antes 0,9 % en lugar de 90 %).

## 3 bis. Fuentes complementarias incorporadas (28/10/2026)

| Fuente | Contenido | Uso en el panel | Cobertura |
|---|---|---|---|
| SNC, "Recaudación potencial por municipio del Impuesto Inmobiliario 2024" (PDF, Decreto 947/2023) | Total por distrito (impuesto + adicionales, urbano + rural) | Activa "Evolución en el tiempo" (2024 frente a 2026) | 260 de 266 distritos (6 sin rótulo legible en el gráfico) |
| SNC, liquidación 2026 (Decreto 3165/2025) | Consulta por departamento y distrito | Misma información que las planillas DNIT ya cargadas | — |

**Alcance.** El panel usa solo datos del impuesto inmobiliario, del impuesto a la tierra y del catastro. Las estadísticas de impuestos nacionales de la DNIT (IVA, IRE, contribuyentes) se evaluaron y se descartaron por estar fuera de ese alcance.

**Municipios nuevos.** Entre 2024 y 2026 no aparecen municipios nuevos en las listas del SNC: los 266 distritos de la liquidación 2026 figuran en el informe 2024.

**Bajas 2024–2026 a verificar (tarea A5).** 18 distritos bajan pese al cambio de valuación. Las bajas grandes no se explican por creación de municipios: Pedro Juan Caballero (−40 %, arrastra a Amambay de Gs 38.900 a 24.100 millones), Desmochados (−76 %), San Salvador (−60 %), Itapé (−57 %), Cerrito (−43 %), Los Cedrales (−42 %). Causas posibles: planillas 2026 incompletas o con columnas corridas, cambio de valuación (Decreto 947/2023 frente a 3165/2025) o error de lectura del gráfico 2024. La comparación 2024–2026 mezcla fuentes (SNC y DNIT) y decretos de valuación distintos; debe declararse así en cualquier publicación.

## 4. Plan de mejora

Cada tarea tiene un identificador, un criterio de cierre verificable y un carril sugerido. Las IA se turnan según `AGENTS.md` y registran cada turno en `docs/TURNOS_IA.md`.

### Fase A. Calidad e integridad de datos (prerrequisito de todo lo demás)

| Id | Tarea | Criterio de cierre |
|---|---|---|
| A1 | Tabla `calidad_planillas`: por planilla, filas, celdas con texto, campos vacíos, inconsistencias (2.2) y unidad detectada | Tabla poblada para las 514 planillas y exportada como CSV |
| A2 | Detector de unidad de superficie rural por planilla (ha, m², otra) usando la relación HAS/MTS2 y el valor por hectárea | Suma nacional de superficie rural entre 30 y 45 millones de ha; lista de planillas corregidas |
| A3 | Seudonimización: eliminar de la base derivada todo texto que no corresponda a su columna | Ninguna celda con letras en campos numéricos de la base publicable; prueba automática |
| A4 | Clasificar las 42.514 cuentas cuyo impuesto no es el 1 % del valor: exonerada, adicional, error | Cada cuenta con una categoría; resumen por distrito |
| A5 | Verificar contra la planilla original los casos atípicos: Ypejhu, Luque, Itacurubí de la Cordillera, lotes urbanos de más de 10 ha | Informe con la planilla, la fila y la decisión tomada |
| A6 | Pedir a la DNIT las liquidaciones 2021 a 2025 e importarlas con `--archivo` (el ejercicio se lee del título) | Al menos dos ejercicios en `historico_cuentas` |
| A7 | Indicador de calidad visible en el panel: semáforo por distrito (bueno, revisar, no confiable) | El semáforo aparece en la cabecera de cada distrito |

### Fase B. Rigor tributario

| Id | Tarea | Criterio de cierre |
|---|---|---|
| B1 | Separar impuesto base, adicional y total en todos los indicadores | Gráficos y tablas con las tres series |
| B2 | Tasa efectiva por distrito (impuesto / valor fiscal) y su dispersión | Tabla y mapa de tasas efectivas |
| B3 | Estudio de razones valor fiscal / precio de mercado según el estándar IAAO: mediana de la razón, coeficiente de dispersión (COD), diferencial relacionado con el precio (PRD) y PRB | Muestra de transacciones o avisos geolocalizados en al menos 5 distritos; COD y PRD con intervalos |
| B4 | Brecha fiscal: diferencia entre lo liquidado y lo que se liquidaría con valores de mercado | Estimación por distrito con rango |
| B5 | Pedir a municipios piloto datos de cobro (pagado, en mora) para pasar de liquidación a recaudación | Convenio o nota firmada con al menos un municipio |
| B6 | Revisar el texto legal vigente (impuesto, adicionales, exoneraciones, distribución) y citar artículos en el panel | Glosario legal con artículo y enlace oficial |

### Fase C. Catastro y vínculo cartográfico

| Id | Tarea | Criterio de cierre |
|---|---|---|
| C1 | Unir cuentas DNIT con parcelas del WFS (`ccatastral`, respaldo `clave_comparacion`) | Porcentaje de cuentas unidas por distrito (meta: 80 % en distritos piloto) |
| C2 | Medir la calidad cartográfica: completitud, superposiciones, huecos, exactitud posicional contra puntos de control | Informe ISO 19157 por distrito piloto |
| C3 | Subdivisión real del distrito: barrios (Asunción y municipios que los tengan), manzanas o celdas hexagonales | Sección "Por subdivisión" con unidades que no dependan de la zona de la cuenta |
| C4 | Superficie construida observada (imagen satelital o huellas de edificios abiertas) frente a la declarada | Estimación de edificación no declarada por manzana en distritos piloto |
| C5 | Dimensión jurídica: cruce con Registros Públicos por cuenta corriente donde haya convenio | Porcentaje de cuentas con situación registral conocida |
| C6 | Población por barrio o radio censal (Censo 2022, INE) | Indicadores por habitante en el panel |

### Fase D. Métodos estadísticos y espaciales

| Id | Tarea | Criterio de cierre |
|---|---|---|
| D1 | Intervalos de confianza (bootstrap, 1.000 réplicas) para Gini, medianas y porcentajes | Cada indicador del panel muestra su intervalo |
| D2 | Descomposición de Theil de la desigualdad del valor fiscal: entre departamentos, entre distritos, dentro de distritos | Tabla de descomposición nacional |
| D3 | Autocorrelación espacial: I de Moran global e indicadores locales (LISA) para % edificado, valor por m² e impuesto por cuenta | Mapas de conglomerados alto-alto y bajo-bajo con significancia |
| D4 | Modelo explicativo del impuesto por cuenta: urbanización, distancia a la capital, población, % edificado | Modelo con diagnóstico de residuos y efecto espacial |
| D5 | Índice compuesto de capacidad catastral y fiscal con pesos justificados (componentes principales o panel de expertos) | Índice 0 a 100 con análisis de sensibilidad |
| D6 | Validación del plan mensual: comparar metas con altas reales del ejercicio siguiente | Error de la estimación por distrito |

### Fase E. Panel: que se entienda lo que se muestra

| Id | Tarea | Criterio de cierre |
|---|---|---|
| E1 | Ficha técnica en cada gráfico: definición, fórmula, fuente, unidad, fecha, limitaciones | Botón "Cómo se calcula" en todos los gráficos |
| E2 | Glosario: liquidación, valor fiscal, cuenta corriente, padrón, propiedad horizontal, Gini, Lorenz, mediana ponderada | Glosario enlazado desde los términos |
| E3 | Lenguaje preciso: "liquidado" en lugar de "recaudado"; "estimación" en los montos del plan | Revisión de todos los textos del panel |
| E4 | Mapa coroplético por distrito con clasificación por cuantiles y leyenda | Mapa en la vista país y departamento |
| E5 | Exportar cada tabla a CSV con su ficha | Botón de descarga en cada tabla |
| E6 | Versión del dato visible: ejercicio, fecha de importación, versión del código | Pie de página con las tres referencias |
| E7 | Pruebas automáticas de la plantilla: que cada vista dibuje sin errores y que los totales cuadren con la base | Pruebas en `npm test` |

### Fase F. Publicación científica

| Id | Tarea | Criterio de cierre |
|---|---|---|
| F1 | Congelar una versión de datos (ejercicio 2026, fecha de corte) y del código | Etiqueta en git y suma de verificación de la base |
| F2 | Publicar el conjunto de datos derivado y seudonimizado en un repositorio con DOI (por ejemplo Zenodo), con diccionario de datos y licencia | DOI activo |
| F3 | Redactar el artículo (estructura en la sección 5) | Manuscrito completo revisado por los coautores |
| F4 | Declaración de ética y protección de datos: tratamiento de los datos personales hallados en fuentes públicas | Párrafo en métodos y anexo de procedimiento |
| F5 | Elegir revista y adaptar formato | Envío realizado |
| F6 | Responder a revisores con el mismo flujo de turnos y registro | Versión revisada |

**Revistas posibles** (según el enfoque final): Land Use Policy; Land; Journal of Property Tax Assessment & Administration (IAAO); Cities; Revista EURE; Investigaciones Geográficas (UNAM); Cuadernos de Economía; documentos de trabajo del Lincoln Institute of Land Policy como paso previo.

## 5. Propuesta de artículo

**Título tentativo:** "Desigualdad, completitud catastral y potencial fiscal del impuesto inmobiliario en los municipios del Paraguay: evidencia de 3,1 millones de cuentas".

**Preguntas de investigación**

1. ¿Cuán desigual es la distribución del valor fiscal inmobiliario dentro y entre los municipios, y qué parte se explica por diferencias entre departamentos?
2. ¿Qué relación hay entre la completitud del catastro (edificación registrada, superficie, zonificación de valores) y el impuesto liquidado por cuenta?
3. ¿Cuánto podría aumentar la base municipal si se completara el registro de edificaciones, y cómo se distribuye ese potencial en el territorio?
4. ¿Qué parte del territorio urbano incumple el lote mínimo legal en lotes propios, y dónde se concentra?

**Hipótesis**

- H1. La desigualdad del valor fiscal se explica sobre todo dentro de los distritos, no entre ellos.
- H2. Los distritos con un valor del m² casi único (sin zonificar) tienen menor impuesto por cuenta, controlando por tamaño y urbanización.
- H3. La edificación no registrada se concentra espacialmente en la periferia de las áreas urbanas en crecimiento.

**Estructura (IMRyD)**

1. Introducción: el impuesto inmobiliario como fuente municipal en América Latina; catastro multifinalitario; el caso paraguayo.
2. Datos: liquidación DNIT 2026, cartografía SNC, Censo 2022; protocolo de calidad (fase A); seudonimización.
3. Métodos: indicadores, Gini y Lorenz con intervalos, Theil, autocorrelación espacial, modelo explicativo, estimación del potencial.
4. Resultados: panorama nacional, desigualdad, completitud, lote mínimo, potencial fiscal, mapas.
5. Discusión: implicancias para la gestión municipal, límites (liquidado y no cobrado, valor fiscal y no de mercado), comparación regional.
6. Conclusiones y agenda.

**Figuras previstas:** mapa de impuesto por cuenta; curvas de Lorenz nacional y por departamento; mapa LISA de % edificado; gráfico de potencial fiscal por departamento; mapa de cumplimiento del lote mínimo.

**Tablas previstas:** calidad de datos por departamento; estadísticos descriptivos; descomposición de Theil; modelo explicativo; potencial fiscal con escenarios.

## 6. Cronograma orientativo

| Meses | Fases | Producto |
|---|---|---|
| 1–2 | A1 a A5, E3, E6 | Base limpia y panel con lenguaje preciso |
| 2–4 | B1, B2, B6, C1, C6, D1, D2, E1, E2 | Indicadores con intervalos, fichas técnicas, unión con parcelas |
| 4–6 | C2, C3, D3, D4, E4 | Mapas, análisis espacial y modelo |
| 6–8 | B3, B4, C4, D5 | Estudio de razones y potencial con escenarios |
| 8–10 | F1 a F5 | Datos con DOI y manuscrito enviado |
| Continuo | A6, B5, C5, D6 | Series históricas, cobro real, situación registral |

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| La DNIT cambia el formato de las planillas | Detección automática de encabezados y de tipo (ya existe) y alerta en el registro de turnos |
| No se consiguen precios de mercado | Usar avisos inmobiliarios geolocalizados como aproximación y declararlo |
| No se consiguen datos de cobro | Limitar las conclusiones a la liquidación |
| Exposición de datos personales | Seudonimización obligatoria (A3) antes de cualquier publicación |
| Cambios hechos por varias IA que se pisan | Regla de turnos de `AGENTS.md` y registro en `docs/TURNOS_IA.md` |

## 8. Referencias

- Anselin, L. (1995). Local indicators of spatial association: LISA. Geographical Analysis, 27(2), 93–115.
- Bahl, R., y Martinez-Vazquez, J. (2008). The property tax in developing countries: current practice and prospects. En G. Ingram y Y. Hong (eds.), Making the Property Tax Work. Lincoln Institute of Land Policy.
- De Cesare, C. M. (2012). Sistemas del impuesto predial en América Latina y el Caribe. Lincoln Institute of Land Policy.
- Erba, D. A. (org.) (2008). El catastro territorial en América Latina y el Caribe. Lincoln Institute of Land Policy (capítulo Paraguay: L. Moreno de Prieto y D. A. Erba).
- Gini, C. (1912). Variabilità e mutabilità. Bologna.
- IAAO (2013). Standard on Ratio Studies. International Association of Assessing Officers.
- ISO 19157:2013. Geographic information — Data quality.
- Lorenz, M. O. (1905). Methods of measuring the concentration of wealth. Publications of the American Statistical Association, 9(70), 209–219.
- Moran, P. A. P. (1950). Notes on continuous stochastic phenomena. Biometrika, 37(1/2), 17–23.
- Openshaw, S. (1984). The Modifiable Areal Unit Problem. Geo Books.
- Theil, H. (1967). Economics and Information Theory. North-Holland.
- Normativa paraguaya a citar con su texto vigente: Ley 125/1991 (régimen tributario, Impuesto Inmobiliario), Ley 3966/2010 Orgánica Municipal, Ley 109/1991 (Servicio Nacional de Catastro) y Decreto 14956/1992 (normas técnicas del catastro).
