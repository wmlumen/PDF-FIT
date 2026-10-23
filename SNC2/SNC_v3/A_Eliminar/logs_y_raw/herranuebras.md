Para encarar el desarrollo de un sistema informático adaptado a la \*\*Resolución SNC N° 551/2023\*\* del Servicio Nacional de Catastro (SNC) —que rige las especificaciones técnicas para la presentación de planos, fraccionamientos, unificaciones, loteamientos, mensuras y expedientes catastrales en Paraguay—, la plataforma debe cubrir tanto la ingeniería geométrica y geoespacial como la rigurosidad registral, administrativa y documental exigida por la institución.



A continuación se desglosan los \*\*200 requerimientos y funcionalidades clave\*\*, organizados sistemáticamente en 10 dominios de arquitectura y negocio:



\---



\### MÓDULO 1: Geodesia, Proyecciones y Georreferenciación (1–20)



1\. Integración del datum oficial SIRGAS-Cono Sur (WGS84).

2\. Soporte nativo y cálculo en Proyección Universal Transversal de Mercator (UTM).

3\. Definición y procesamiento para Zona UTM 21S (Meridiano Central 57° O, EPSG:32721).

4\. Definición y procesamiento para Zona UTM 20S (Meridiano Central 63° O, EPSG:32720) para áreas correspondientes del Chaco.

5\. Algoritmo de detección y alerta ante polígonos que cruzan el límite entre UTM 20S y 21S.

6\. Cálculo y almacenamiento automatizado del factor de escala local ($k$).

7\. Cálculo y almacenamiento del factor de escala de elevación ($k\_h$).

8\. Aplicación del factor de escala combinado ($k\_c = k \\times k\_h$) para el paso de distancias de terreno a distancias de cuadrícula.

9\. Reducción rigurosa de distancias topográficas de terreno a distancias sobre el elipsoide WGS84.

10\. Cálculo automatizado del ángulo de convergencia de meridianos ($\\gamma$) en cada vértice.

11\. Registro de coordenadas de cuadrícula planas oficiales: Este ($X$) y Norte ($Y$) en metros a tres decimales ($0.001\\text{ m}$).

12\. Almacenamiento simultáneo de coordenadas geodésicas elipsoidales: Latitud ($\\varphi$) y Longitud ($\\lambda$) en sexagesimal (grados, minutos y segundos a 4 decimales de segundo).

13\. Manejo de Altura Elipsoidal ($h$) y conversión opcional a Altura Ortométrica ($H$) mediante modelo geoidal.

14\. Validación de vinculación obligatoria a la Red Geodésica Nacional Pasiva del SNC / DISERGEMIL.

15\. Integración con la Red Geodésica Nacional Activa (Estaciones GNSS Continuas / CORS) oficiales del SNC.

16\. Registro de datos brutos del receptor GNSS (archivos RINEX) y vector base de post-proceso.

17\. Ingesta y validación del reporte de post-proceso GNSS (Precisiones 1-sigma / 2-sigma, PDOP, RMS).

18\. Tolerancia diferencial de cierre lineal según el tipo de área (Urbana $\\le 1/10.000$; Rural $\\le 1/5.000$).

19\. Módulo de cálculo para compensación de poligonales cerradas (Regla de Bowditch / Mínimos Cuadrados).

20\. Control de consistencia en vértices de apoyo y puntos de control GPS (Monolitos / Mojones).



\---



\### MÓDULO 2: Estructura Cadastral y Jerarquía Política (21–40)



21\. Base de datos jerárquica: Departamentos del Paraguay (codificación oficial SNC 01 al 17, más Capital 00).

22\. Codificación normalizada de Distritos/Municipios según nomenclatura oficial del SNC.

23\. Identificador único de Padrón Matriz para fincas rurales e inmuebles no amanzanados.

24\. Identificador de Cuenta Corriente Catastral (C.C.C.) con segmentación de componentes.

25\. Validador sintáctico del formato CCC Urbana: `Zona` (2 dígitos).

26\. Validador sintáctico de CCC Urbana: `Manzana` (4 dígitos alfanuméricos).

27\. Validador sintáctico de CCC Urbana: `Lote` (2 a 4 dígitos alfanuméricos).

28\. Validador sintáctico de CCC Urbana para propiedad horizontal: `Sublote / Piso / Dpto`.

29\. Soporte del identificador de Distrito Rural: `Zona / Padrón / Subdivisión`.

30\. Manejo de identificadores temporales de expediente (N° Provisorio) previos a la asignación de cuenta definitiva.

31\. Historial de reasignación y desdoblamiento de C.C.C. y Padrones (trazabilidad genealógica).

32\. Mapeo de límites de distritos creados recientemente o áreas en diferendo limítrofe.

33\. Clasificación de suelo según plan regulador municipal: Urbano, Suburbano, Rural, Industrial.

34\. Campo para Finca N° del Registro General de la Propiedad (DGRP).

35\. Campo para Matrícula Inmobiliaria (Formato folio real electrónico DGRP).

36\. Identificación de Número de Tomo y Folio histórico registral.

37\. Validación cruzada de congruencia entre Distrito Político vs. Jurisdicción Registral/Judicial.

38\. Registro de secciones catastrales, polígonos catastrales y sectores censales INE.

39\. Atributo de afectación fiscal o exención tributaria según código municipal.

40\. Trazabilidad de nomenclatura catastral anterior vs. nomenclatura catastral vigente.



\---



\### MÓDULO 3: Parser CAD y Normalización de Entidades (41–65)



41\. Ingestor directo de planos en formato AutoCAD DXF (versiones R12 hasta 2018+).

42\. Ingestor y conversor de planos nativos DWG a estructuras vectoriales abiertas.

43\. Extractor de primitivas geométricas estrictas: `LWPOLYLINE`, `POLYLINE`, `LINE`, `POINT`, `TEXT`, `MTEXT`.

44\. Conversor forzado de polilíneas 3D (`POLYLINE 3D`) a polilíneas 2D planas eliminando elevación errónea.

45\. Descomposición automática de arcos y curvas (`ARC`, `SPLINE`, `BULGE`) a cuerdas poligonales de alta densidad.

46\. Validador de capas obligatorias (Layers) normalizadas bajo estándar SNC (ej. `LINDEROS`, `TEXTOS`, `CUADRO\_RUMBO`).

47\. Detector de entidades huérfanas en capa 0 o capas no reconocidas por el estándar.

48\. Parser de bloques de atributos (`INSERT`/`ATTDEF`) para rótulos y carátulas automáticas.

49\. Extracción de textos de rumbos y distancias vinculados a los lados del polígono.

50\. Extracción de identificadores textuales de mojones/vértices (ej. `V1`, `V2`, `P1`, `M1`).

51\. Detector de textos flotantes o sin enlace geométrico a una entidad o vértice.

52\. Purga automática de entidades basura: bloques vacíos, capas congeladas, vistas guardadas (`VIEW`), cotas rotas (`DIMENSION`).

53\. Normalización de unidades del archivo CAD (forzar metros en vez de milímetros o pulgadas).

54\. Detección de escalado arbitrario de planos (planos no digitalizados en escala 1:1 de cuadrícula).

55\. Detección de rotación del espacio de modelo (ModelSpace no orientado al Norte geográfico).

56\. Conversión bidireccional automática: DXF $\\leftrightarrow$ GeoJSON con atributos estándar SNC.

57\. Conversión automática: DXF $\\leftrightarrow$ ESRI Shapefile con sus archivos auxiliares (.shp, .shx, .dbf, .prj).

58\. Exportación de geometrías a GeoPackage (GPKG) multicapa.

59\. Ingesta y validación de tablas de cálculo de coordenadas en CSV/Excel tabulado.

60\. Filtro anti-splines: rechazo de linderos definidos como curvas Bézier sin discretización geométrica.

61\. Extracción de entidades de amojonamiento auxiliar (árbol testigo, estaca de hierro, mojón de hormigón).

62\. Parser de hatch/tramas (detección de cursos de agua, servidumbres de paso y áreas de reserva).

63\. Mapeo de cotas fijas de altimetría si el levantamiento incluye curvas de nivel.

64\. Validador de grosor de línea y colores estándar según convención de loteamientos.

65\. Conversión de geometrías cerradas a topología `Polygon` y `MultiPolygon` estricta OGC.



\---



\### MÓDULO 4: Validación Topológica y Consistencia Espacial (66–90)



66\. Validación de cierre polinómico estricto: el vértice final debe coincidir exactamente con el inicial ($\\vert{}x\_0 - x\_n\\vert{} = 0$).

67\. Detección y bloqueo de auto-intersecciones de bordes (polígonos tipo reloj de arena o lazo).

68\. Tolerancia de auto-cierre con snapping configurable a nivel de milímetro ($\\le 0.005\\text{ m}$).

69\. Detector de vértices duplicados o redundantes en un mismo alineamiento rectilíneo.

70\. Detector de aristas con longitud cero o sub-milimétricas.

71\. Detección de solapamiento (Overlap) con parcelas colindantes registradas en el catastro oficial.

72\. Detección de vacíos injustificados (Gaps) entre parcelas vecinas aprobadas.

73\. Verificación de orientación de nodos: contorno exterior en sentido horario (CW) según estándar SNC.

74\. Verificación de orientación de islas o huecos interiores (anillos) en sentido antihorario (CCW).

75\. Validación topológica de fraccionamientos: la suma de las partes debe igualar geométricamente al lote matriz.

76\. Validación de unificación/fusión: eliminación obligatoria de líneas de límite medianero interno.

77\. Detección de polígonos colapsados (ancho cero o picos geométricos aberrantes / slivers).

78\. Verificación de coincidencia topológica de linderos colindantes (vértice a vértice en linderos compartidos).

79\. Detector de pseudonodos innecesarios sobre líneas medianeras sin quiebre angular.

80\. Verificación de polígonos de servidumbre de paso: deben intersectar correctamente los linderos de acceso.

81\. Control topológico de calles y cesión pública: polígonos de calles deben conectar con la trama vial pública existente.

82\. Validación de ochavas: control de poligonación de chaflanes en esquinas reglamentarias (típico $L \\ge 5\\text{ m}$).

83\. Validación topológica de ochavas en fraccionamientos urbanos: verificación de que no queden como ángulos rectos.

84\. Control de franjas de protección de recursos hídricos (Ley 3239/07): linderos respetando retiros de arroyos/ríos.

85\. Validación de retiros de dominio público sobre Rutas Nacionales/Caminos Vecinales (MOPC).

86\. Verificación de no invasión de áreas silvestres protegidas (MADES / SINASIP).

87\. Verificación de no superposición con reservas indígenas reconocidas (INDI).

88\. Verificación de no intrusión en tierras del Instituto Nacional de Desarrollo Rural y de la Tierra (INDERT).

89\. Algoritmo de detección de micro-agujeros generados por digitalización imprecisa de polilíneas.

90\. Matriz interactiva de errores topológicos con enlace de paneo y zoom directo al conflicto.



\---



\### MÓDULO 5: Cálculos Analíticos y Cuadro de Rumbos (91–110)



91\. Cálculo analítico de Superficie Plana (Geometría de Gauss sobre coordenadas UTM).

92\. Cálculo analítico de Superficie Elipsoidal / Geodésica.

93\. Comparador de discrepancia de superficie: Superficie según Título vs. Superficie según Mensura.

94\. Alerta de tolerancia legal de demasía o faltante de superficie permitida según el Código Civil y normas SNC.

95\. Cálculo automatizado del Cuadro de Rumbos y Distancias para cada tramo del polígono.

96\. Representación de rumbos en formato circular cuadrantal: Cuadrante, Grados, Minutos y Segundos (ej. `N 45° 12' 33" E`).

97\. Representación opcional de rumbos en Acimut decimal y sexagesimal ($0^\\circ$ a $360^\\circ$).

98\. Comparador analítico entre el rumbo calculado y el texto de rumbo rotulado en el plano CAD.

99\. Comparador analítico entre la distancia calculada y la distancia acotada en el plano CAD.

100\. Detección de discrepancias angulares superiores a 1 segundo de arco.

101\. Detección de discrepancias lineales superiores a 1 milímetro entre acotado y geometría.

102\. Cálculo de centroide geométrico ($X, Y$) del inmueble para posicionamiento de etiquetas.

103\. Determinación de dimensiones de frente, contra-frente y fondos (costados laterales).

104\. Cálculo de desarrollo de curva en linderos curvos: Radio ($R$), Longitud de Arco ($L$), Cuerda ($C$), Ángulo Central ($\\Delta$).

105\. Verificación trigonométrica de cierre angular de la poligonal perimetral: $\\sum \\text{Ángulos} = (n \\pm 2) \\times 180^\\circ$.

106\. Cálculo de excentricidad y momento de inercia para detectar geometrías desproporcionadas.

107\. Desglose de cálculo de balance de superficies para loteamientos: Área Útil, Área de Calles, Área Verde/Plazas.

108\. Verificación porcentual de donación obligatoria de Espacio Verde (ej. 7% según Ley Orgánica Municipal).

109\. Verificación porcentual de cesión de calles (ej. reserva vial mínima municipal).

110\. Exportación de la planilla analítica a tabla de bases de datos relacional y archivo PDF certificado.



\---



\### MÓDULO 6: Operaciones Catastrales y Tipología de Actos (111–130)



111\. Módulo para Mensura Judicial (Juicios de deslinde, mensura y amojonamiento).

112\. Módulo para Mensura Particular / Administrativa.

113\. Flujo para Fraccionamiento Urbano (subdivisión de lotes consolidados).

114\. Flujo para Fraccionamiento Rural (desprendimiento de parcelas agropecuarias).

115\. Flujo para Unificación / Refundición de padrones o cuentas corrientes.

116\. Flujo para Loteamientos con apertura de calles y cesión comunal.

117\. Módulo para Modificación o Rectificación de Loteamientos vigentes.

118\. Módulo para Urbanizaciones Cerradas y Condominios (Régimen de Propiedad Horizontal).

119\. Gestión de Régimen de Copropiedad: asignación de coeficientes porcentuales fiscales a unidades funcionales.

120\. Procedimiento para Desafectación de bienes de dominio público a privado y viceversa.

121\. Módulo de Servidumbres Reales: electroductos (ANDE), acueductos, oleoductos y tránsito.

122\. Procedimiento para Expropiaciones viales y de obras de infraestructura pública (MOPC/Municipios).

123\. Flujo para Declaración de Herederos y Adjudicación de partes en condominio.

124\. Procedimiento de Revalúo y Regularización de Construcciones / Edificaciones.

125\. Control de estados parcelarios: Vigente, En Tramitación, Anulado, Bloqueado, Histórico/Inactivo.

126\. Validación de lote mínimo reglamentario municipal (ej. frente mínimo $\\ge 12\\text{ m}$, área mínima $\\ge 360\\text{ m}^2$).

127\. Detección de lotes remanentes inviables por dimensiones residuales en fraccionamientos.

128\. Registro de linderos según título antecedente vs. linderos actuales constatados en campo.

129\. Validación de colindantes: registro nominativo de linderos Norte, Sur, Este y Oeste con nombres y números de CCC/Padrón.

130\. Trazabilidad de títulos de origen: individualización clara del inmueble madre y expedientes conexos.



\---



\### MÓDULO 7: Requisitos Documentales y Validación Profesional (131–150)



131\. Base de datos y registro de Profesionales Matriculados habilitados ante el SNC.

132\. Validación de categoría del profesional habilitado: Agrimensor, Ingeniero Geógrafo, Ingeniero Civil.

133\. Validación de número de registro profesional del MOPC.

134\. Validación de vigencia del carné y habilitación gremial/profesional.

135\. Firma Digital avanzada / cualificada (Ley 6822/21) en archivos CAD, GeoJSON y PDF.

136\. Validación de firma digital mediante certificados PSC autorizados por el MIC del Paraguay.

137\. Sellado de tiempo criptográfico (Time Stamping) al momento del envío del expediente.

138\. Generación obligatoria del Formulario Único de Solicitud de Entrada Catastral (FUSEC / Carátula).

139\. Validación de campos de la Carátula Catastral según modelo Resolución 551.

140\. Verificación de adjuntos obligatorios: Copia autenticada de Cédula de Identidad de propietarios.

141\. Verificación de Personas Jurídicas: Poderes habilitantes, Escritura de Constitución y Acta de Directorio.

142\. Validación de adjunto de Título de Propiedad o Copia Notarial cotejada.

143\. Validación de adjunto de Certificado de No Invasión / Constancia de ocupación pacífica.

144\. Verificación de Factura / Boleta de Pago de Tasa Judicial o Arancel Especial de Catastro.

145\. Validación de Aprobación Municipal previa (Resolución de la Junta Municipal / Intendencia) en fraccionamientos.

146\. Validación de Constancia de Viabilidad Ambiental del MADES (para loteamientos e industrias).

147\. Validación de Declaración de Impacto Ambiental (DIA) vinculada al padrón correspondiente.

148\. Notificación y registro de citación formal a colindantes en mensuras judiciales/particulares.

149\. Almacenamiento del Acta de Deslinde y Amojonamiento suscrita en el terreno con los testigos.

150\. Control de firmas de conformidad de propietarios colindantes.



\---



\### MÓDULO 8: Formato de Salida y Generación de Planos (151–170)



151\. Generador de planos en tamaños normalizados según norma ISO 216: A0, A1, A2, A3, A4.

152\. Plantilla estandarizada de carátula técnica oficial SNC con posición fija en esquina inferior derecha.

153\. Rotulación paramétrica: Propietario(s), Departamento, Distrito, Lugar/Compañía/Barrio, Padrón/CCC.

154\. Rotulación del profesional actuante: Nombre, Firma, Registro MOPC, Especialidad, Fecha de levantamiento.

155\. Generación automática del Cuadro de Rumbos, Distancias y Coordenadas integrado en el layout del plano.

156\. Inserción obligatoria del Croquis de Ubicación / Macro-localización a escala conveniente (1:10.000 / 1:50.000).

157\. Inserción de la Rosa de los Vientos o Flecha de Norte indicando la orientación exacta de cuadrícula.

158\. Generación de cuadrícula de coordenadas UTM (Grilla) con cruces o líneas punteadas y valores en los márgenes.

159\. Control estricto de escala numérica normalizada (1:500, 1:1.000, 1:2.000, 1:5.000, 1:10.000) sin escalas intermedias atípicas.

160\. Generación de escala gráfica proporcional a la escala numérica seleccionada.

161\. Inserción automática de Código QR de verificación criptográfica del plano aprobado.

162\. Marca de agua de seguridad institucional en borradores y planos preliminares.

163\. Simbología estándar de mojones: hormigón existente, hormigón nuevo, estaca de madera, clavo en asfalto, árbol.

164\. Convención de linderos: trazo continuo para límites confirmados, trazo discontinuo para límites aproximados o en litigio.

165\. Representación gráfica de accidentes geográficos: cursos de agua permanentes, intermitentes, esteros, bosques.

166\. Representación diferenciada de caminos: asfaltados, empedrados, enripiados, terraplén y servidumbres.

167\. Exportación a PDF/A (estándar de preservación digital a largo plazo) en escala 100% vectorial.

168\. Generación de planos en capas separadas dentro del PDF para auditoría rápida en visualizadores.

169\. Control de márgenes mínimos reglamentarios para encuadernación de expedientes físicos (margen izquierdo $\\ge 30\\text{ mm}$).

170\. Firma digital incrustada visualmente en el plano PDF con resumen del certificado criptográfico.



\---



\### MÓDULO 9: Flujo de Aprobación, Mesa de Entrada y Trazabilidad (171–190)



171\. Módulo de Mesa de Entrada Virtual para ingreso telemático de expedientes por parte de agrimensores.

172\. Generación automática del Número Único de Entrada y Ficha Técnica de Expediente.

173\. Bandeja de entrada para Técnicos Revisores del SNC con asignación balanceada de carga de trabajo.

174\. Sistema automatizado de pre-calificación geométrica antes de permitir el ingreso definitivo del expediente.

175\. Emisión de informe preliminar de observaciones topográficas y formales (Checklist automático).

176\. Módulo de Notificaciones Electrónicas en tiempo real al profesional solicitante vía correo y portal.

177\. Gestión de Plazos y Términos Perentorios para contestación de notas de observación técnica.

178\. Pila de reingresos: control de versiones entre el archivo observado y el archivo subsanado (Diff geométrico).

179\. Herramienta de comparación visual ("Ghost Layer") superponiendo el plano corregido sobre el anterior.

180\. Bitácora inmutable de auditoría (Audit Trail) de cada acción: quién revisó, qué editó y cuándo.

181\. Generación de Dictamen Técnico de Agrimensura con firma digital del perito revisor de Catastro.

182\. Circuito de visado: Aprobación Técnica $\\rightarrow$ Fiscalización $\\rightarrow$ Firma del Director de Geodesia.

183\. Circuito de asignación catastral: derivación interna para generación formal del nuevo Padrón o CCC.

184\. Emisión de la Resolución Administrativa de Aprobación Catastral formalizada.

185\. Emisión del Certificado Catastral oficial con validez jurídica para transferencias notariales.

186\. Conexión de interoperabilidad con la Dirección General de los Registros Públicos (DGRP / RGP).

187\. Notificación automática del nuevo empadronamiento a la Municipalidad correspondiente para cobro del Impuesto Inmobiliario.

188\. Protocolo de bloqueo registral preventivo de inmuebles en proceso de litigio judicial de mensura.

189\. Búsqueda y consulta de antecedentes de expedientes por número, profesional, titular o cuenta catastral.

190\. Dashboard de métricas: tiempos de resolución de expedientes, cuellos de botella y tasas de rechazo.



\---



\### MÓDULO 10: Arquitectura del Geoportal, Base de Datos y Seguridad (191–200)



191\. Motor de base de datos relacional espacial de alto rendimiento (PostgreSQL con extensión PostGIS avanzada).

192\. Tablas particionadas por Departamentos y Distritos para optimizar consultas de millones de vértices y linderos.

193\. Servidor de mapas interoperable (GeoServer o motor vectorial en Rust/Node.js) sirviendo estándares OGC (WMS, WFS, WCS).

194\. Servidor de teselas vectoriales (MVT / Mapbox Vector Tiles) para visualización fluida de todo el parcelario nacional.

195\. Control de concurrencia y transaccionalidad ACID en operaciones de división y fusión de parcelas.

196\. Almacenamiento de objetos seguro (S3 compatible) para resguardo de archivos brutos DWG, DXF, RINEX y PDFs.

197\. Arquitectura de seguridad con Autenticación Multifactor (MFA) para profesionales y personal del SNC.

198\. Modelo de control de accesos basado en roles (RBAC) con permisos diferenciados por jurisdicción distrital/departamental.

199\. API REST / GraphQL documentada para consulta de datos catastrales por parte de instituciones del Estado (MOPC, MADES, INDERT, DGRP).

200\. Plan de contingencia, replicación geográfica de base de datos y copias de seguridad incrementales periódicas con integridad criptográfica verificable.



herranuebras esta un lintado en la raiz 

Revisé el archivo herranuebras.txt que está en la raíz del proyecto.



Es un documento de especificación con 200 requerimientos y funcionalidades clave estructurados en 10 módulos temáticos, diseñados para cubrir integralmente la Resolución SNC N° 551/2023.



A continuación tienes el cruce detallado del 100% de ese listado contra el código real implementado en SNC\_v3, indicando qué ya está construido, qué está a medias y qué falta por implementar:



Mapeo Comparativo: herranuebras.txt vs. Código Actual

Módulo en herranuebras.txt	Requisitos	% Implementado	Estado en el Código

1\. Geodesia, Proyecciones y Georreferenciación	1 al 20	45%	Hecho: WGS84/SIRGAS, UTM 21S y 20S vía Proj4 (js/config.js), Este/Norte en metros a 3 decimales, coordenadas elipsoidales sexagesimales, tolerancias de cierre lineal.

Falta: Factor de escala local (

𝑘

k) y combinado (

𝑘

𝑐

k 

c

​

&#x20;), convergencia de meridianos (

𝛾

γ), modelo geoidal, ingesta de archivos RINEX GNSS y compensación por Mínimos Cuadrados / Bowditch.

2\. Estructura Catastral y Jerarquía Política	21 al 40	60%	Hecho: Departamentos (00-17) y distritos oficiales con GeoJSON (DISTRITOS\_PY\_CNPV2022.geojson), autocompletado por coordenadas, validación de CCC urbana (Zona/Mz/Lote) y padrón rural (js/validator.js).

Falta: Formato folio real electrónico DGRP (Matrículas), trazabilidad genealógica de desdoblamientos y relación con sectores censales INE.

3\. Parser CAD y Normalización de Entidades	41 al 65	70%	Hecho: Parser DXF R12-2018 (dxf-parser), conversión de polilíneas 3D a 2D planas, extracción de capas y textos de rumbos/distancias, conversión DXF 

↔

↔ GeoJSON 

↔

↔ Shapefile 

↔

↔ CSV/Excel (js/parser.js).

Falta: Lector directo de DWG nativo sin conversión previa, purga automática de bloques/vistas congeladas CAD, exportación a GeoPackage (GPKG) multicapa.

4\. Validación Topológica y Consistencia Espacial	66 al 90	65%	Hecho: Cierre estricto de polígonos, detección de auto-intersecciones, snapping milimétrico, eliminación de vértices duplicados, detección de solapes (overlaps), orientación horaria/antihoraria (js/validator.js, js/topologyRepair.js).

Falta: Detección de vacíos injustificados (gaps), control geométrico de ochavas/chaflanes reglamentarios (

𝐿

≥

5

 m

L≥5 m), validación de cruce con capas oficiales de protección (MADES, INDI, INDERT) y retiros MOPC.

5\. Cálculos Analíticos y Cuadro de Rumbos	91 al 110	80%	Hecho: Superficie plana de Gauss en UTM, comparador de superficie Título vs. Mensura y discrepancia porcentual, cuadro de rumbos en formato cuadrantal (N 45° 12' 33" E) y acimutal, centroide geométrico, balance de áreas en loteamientos (js/cogo.js, js/export.js).

Falta: Verificación matemática de cierre angular 

∑

=

(

𝑛

±

2

)

×

180

∘

∑=(n±2)×180 

∘

&#x20;, excentricidad de lote, cálculo completo de curvas compuestas (

𝑅

,

𝐿

,

𝐶

,

Δ

R,L,C,Δ).

6\. Operaciones Catastrales y Tipología de Actos	111 al 130	50%	Hecho: Mensuras particulares, fraccionamiento urbano/rural, unificación de parcelas (js/lineage.js, js/geoprocessing.js), loteamientos con cesión municipal (js/municipal.js).

Falta: Flujos formales de Mensura Judicial, Régimen de Propiedad Horizontal y coeficientes de copropiedad, expropiaciones MOPC y servidumbres ANDE.

7\. Requisitos Documentales y Validación Profesional	131 al 150	30%	Hecho: Registro de agrimensor actuante (nombre, registro MOPC, categoría) en carátula y reportes (js/export.js).

Falta: Firma Digital cualificada (Ley 6822/21 con prestadores PSC de Paraguay), sellado de tiempo criptográfico (Timestamping), validación de adjuntos notariales y títulos escaneados.

8\. Formato de Salida y Generación de Planos	151 al 170	75%	Hecho: Salida en formatos ISO A4, A3, A2, A1, A0, carátula reglamentaria en esquina inferior derecha, flecha de Norte, escala gráfica, código QR, exportación a PDF y Shapefile comprimido (js/export.js).

Falta: Dibujo automático de la cuadrícula/grilla UTM con cruces y rotulación marginal, exportación a estándar estricto PDF/A en capas independientes (layers), simbología visual de tipos de mojón.

9\. Flujo de Aprobación, Mesa de Entrada y Trazabilidad	171 al 190	20%	Hecho: Checklist automático de pre-calificación geométrica antes de exportar, historial de versiones y linaje parcelario local.

Falta: Mesa de Entrada Virtual para revisores del SNC con distribución de expedientes, notificaciones automáticas por correo de observaciones técnicas, capa fantasma ("Ghost Layer") para comparar correcciones, interoperabilidad con DGRP y municipios.

10\. Arquitectura del Geoportal, Base de Datos y Seguridad	191 al 200	25%	Hecho: API Express con SQLite, consultas espaciales indexadas (cacheDb.js), control de planes de suscripción (server-api.js).

Falta: Servidor de mapas vectorial de alto rendimiento (PostGIS + Mapbox Vector Tiles / MVT), almacenamiento de archivos pesados en la nube (S3), autenticación multifactor (MFA), roles y permisos granulares por municipio.

Resumen Global de Cobertura

Promedio General Implementado: \~52% de los 200 requerimientos de herranuebras.txt.

La fortaleza del proyecto hoy (80% - 90%): Los motores matemáticos, geométricos y GIS (Módulos 3, 4, 5 y 8: importación CAD, cálculos COGO, cuadro de rumbos, validación de tolerancias de la Res. 551 y exportación a PDF/SHP/KML).

El gran faltante (20% - 40%): La capa institucional y administrativa (Módulos 7, 9 y 10: firma digital con validez jurídica en Paraguay, mesa de entrada de expedientes con flujo de aprobación técnica, e interoperabilidad con DGRP / MADES / INDERT).

generar en el grafo los pendientes a trabajar en el proyecto



A partir de la auditoría de cobertura contra los 200 ítems de \*\*`herranuebras.txt`\*\* (donde el 52% se encuentra construido o avanzado y el restante 48% corresponde a los vacíos analíticos, institucionales y de infraestructura), a continuación se presenta el \*\*grafo de dependencias, ruta crítica y desglose técnico de los ítems pendientes\*\* a ejecutar en el repositorio `SNC\_v3`.



\---



\### Grafo de Dependencias de los Módulos Pendientes



```mermaid

graph TD

&#x20;   %% ESTILOS

&#x20;   classDef geo fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1;

&#x20;   classDef topo fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20;

&#x20;   classDef reg fill:#FFF8E1,stroke:#F57F17,stroke-width:2px,color:#E65100;

&#x20;   classDef doc fill:#FBE9E7,stroke:#D84315,stroke-width:2px,color:#BF360C;

&#x20;   classDef infra fill:#EDE7F6,stroke:#512DA8,stroke-width:2px,color:#311B92;

&#x20;   classDef interop fill:#FCE4EC,stroke:#C2185B,stroke-width:2px,color:#880E4F;



&#x20;   %% FASE 1: NÚCLEO GEODÉSICO Y MATEMÁTICO AVANZADO

&#x20;   subgraph F1 \["Módulo 1 \& 5: Núcleo Geodésico y Analítico (Faltantes)"]

&#x20;       T1\_1\["M1: Factores de escala (k, kh, kc)"]:::geo

&#x20;       T1\_2\["M1: Convergencia de meridianos (γ)"]:::geo

&#x20;       T1\_3\["M1: Ingesta RINEX + Mínimos Cuadrados / Bowditch"]:::geo

&#x20;       T1\_4\["M5: Verificación Cierre Angular Σ=(n±2)\*180°"]:::geo

&#x20;       T1\_5\["M5: Curvas compuestas (R, L, C, Δ) + Excentricidad"]:::geo

&#x20;   end



&#x20;   %% FASE 2: MOTOR TOPOLÓGICO, CAD Y RESTRICCIONES ESPACIALES

&#x20;   subgraph F2 \["Módulo 3 \& 4: Parser CAD y Topología Legal Res. 551"]

&#x20;       T2\_1\["M3: Parser nativo DWG sin conversión externa"]:::topo

&#x20;       T2\_2\["M3: Exportador GeoPackage (GPKG) multicapa"]:::topo

&#x20;       T2\_3\["M4: Detección de Gaps / Vacíos con linderos"]:::topo

&#x20;       T2\_4\["M4: Control geométrico de Ochavas (L ≥ 5m)"]:::topo

&#x20;       T2\_5\["M4: Cruce automático con restricciones MADES / MOPC / INDI"]:::topo

&#x20;   end



&#x20;   %% FASE 3: OPERACIONES REGISTRALES Y CONDICIÓN DOMINIAL

&#x20;   subgraph F3 \["Módulo 2 \& 6: Tipología de Actos y Vínculo DGRP"]

&#x20;       T3\_1\["M2: Folio Real Electrónico (Matrículas DGRP)"]:::reg

&#x20;       T3\_2\["M2: Linaje de desdoblamiento + Sectores INE"]:::reg

&#x20;       T3\_3\["M6: Régimen de Propiedad Horizontal (Copropiedad)"]:::reg

&#x20;       T3\_4\["M6: Flujo formal de Mensura Judicial y Servidumbres"]:::reg

&#x20;   end



&#x20;   %% FASE 4: MAQUETACIÓN CARTOGRÁFICA Y SEGURIDAD JURÍDICA

&#x20;   subgraph F4 \["Módulo 7 \& 8: Certificación y Salida Cartográfica"]

&#x20;       T4\_1\["M8: Grilla UTM con cruces y rotulación marginal"]:::doc

&#x20;       T4\_2\["M8: Simbología normalizada de tipos de mojón"]:::doc

&#x20;       T4\_3\["M8: Exportación PDF/A en capas independientes"]:::doc

&#x20;       T4\_4\["M7: Firma Digital Cualificada (Ley 6822/21 - PSC)"]:::doc

&#x20;       T4\_5\["M7: Sellado de tiempo criptográfico (RFC 3161)"]:::doc

&#x20;   end



&#x20;   %% FASE 5: INFRAESTRUCTURA, SERVIDOR VECTORIAL Y MESA DE ENTRADA

&#x20;   subgraph F5 \["Módulo 9 \& 10: Geoportal, Mesa de Entrada y Escalabilidad"]

&#x20;       T5\_1\["M10: Migración a PostgreSQL + PostGIS (Particionado)"]:::infra

&#x20;       T5\_2\["M10: Servidor de Vector Tiles MVT (Martin / pg\_tileserv)"]:::infra

&#x20;       T5\_3\["M10: Almacenamiento desacoplado S3/MinIO para CAD/RINEX"]:::infra

&#x20;       T5\_4\["M10: Autenticación MFA + RBAC por Municipio"]:::infra

&#x20;       T5\_5\["M9: Mesa de Entrada Virtual de Expedientes SNC"]:::infra

&#x20;       T5\_6\["M9: Capa Fantasma (Ghost Layer / Diff Geométrico)"]:::infra

&#x20;       T5\_7\["M9: Notificaciones telemáticas de observaciones"]:::infra

&#x20;   end



&#x20;   %% FASE 6: INTEROPERABILIDAD INSTITUCIONAL

&#x20;   subgraph F6 \["Interoperabilidad y Ecosistema Exterior"]

&#x20;       T6\_1\["API WFS/WMS para Software de Topógrafos"]:::interop

&#x20;       T6\_2\["Conector de Interoperabilidad con DGRP y MADES"]:::interop

&#x20;   end



&#x20;   %% RELACIONES DE DEPENDENCIA DIRECTA

&#x20;   T5\_1 --> T5\_2

&#x20;   T5\_1 --> T2\_3

&#x20;   T5\_1 --> T2\_5



&#x20;   T1\_1 \& T1\_2 --> T1\_4

&#x20;   T1\_4 \& T1\_5 --> T4\_1



&#x20;   T2\_1 --> T2\_2

&#x20;   T2\_3 \& T2\_4 --> T5\_6



&#x20;   T3\_1 \& T3\_3 --> T4\_3

&#x20;   T2\_5 --> T6\_2



&#x20;   T4\_1 \& T4\_2 --> T4\_3

&#x20;   T4\_3 --> T4\_4 --> T4\_5



&#x20;   T5\_3 \& T5\_4 --> T5\_5

&#x20;   T4\_5 --> T5\_5



&#x20;   T5\_5 --> T5\_6 \& T5\_7

&#x20;   T5\_2 \& T5\_5 --> T6\_1

&#x20;   T5\_6 --> T6\_2



```



\---



\### Desglose Operativo de Pendientes por Sprint



\#### Sprint 1: Precisión Geodésica y Motor Analítico COGO



\* \*\*Factor de Escala Local ($k$), de Elevación ($k\_h$) y Combinado ($k\_c$):\*\* Integrar en `js/cogo.js` el cálculo de reducción al elipsoide WGS84 para cada vértice y centroide de parcela, garantizando el paso analítico riguroso de medidas de terreno a cuadrícula UTM.

\* \*\*Convergencia de Meridianos ($\\gamma$):\*\* Calcular el ángulo $\\gamma = (\\lambda - \\lambda\_0) \\sin \\varphi$ para cada estación/vértice, completando el reporte técnico de orientación.

\* \*\*Verificación de Cierre Angular:\*\* Incorporar la regla perimetral $\\sum \\text{Ángulos} = (n \\pm 2) \\times 180^\\circ$ en `js/validator.js` con umbral de tolerancia instrumental.

\* \*\*Curvas Circulares y Excentricidad:\*\* Soporte analítico para arcos en linderos fluviales o rotondas ($R$, $L$, $C$, $\\Delta$) y métrica de forma para descartar geometrías anómalas (\*slivers\*).



\#### Sprint 2: Topología Faltante, Ochavas y Salida Gráfica PDF/A



\* \*\*Detección de Gaps y Continuidad:\*\* Identificar separaciones no justificadas contra el parcelario consolidado adyacente.

\* \*\*Control Geométrico de Ochavas:\*\* Validar que todo fraccionamiento o loteamiento en esquinas urbanas incorpore el chaflán normativo con longitud de cuerda $L \\ge 5\\text{ m}$.

\* \*\*Grilla UTM Paramétrica:\*\* Añadir al generador de planos (`js/export.js`) la cuadrícula cartográfica con cruces a intervalos regulares (50 m, 100 m, 500 m) y rotulado perimetral de coordenadas Este/Norte.

\* \*\*Simbología Normalizada de Mojones:\*\* Renderizar en el mapa y en el layout de exportación la simbología reglamentaria del SNC para mojones de hormigón, estacas de hierro y testigos naturales.

\* \*\*Formato PDF/A:\*\* Configurar la generación de documentos bajo estándar de preservación digital PDF/A, estructurado en capas vectoriales separadas (linderos, textos, grilla, afectaciones).



\#### Sprint 3: Infraestructura Espacial, Almacenamiento y Vector Tiles



\* \*\*Migración de SQLite a PostgreSQL + PostGIS:\*\* Reemplazar el almacenamiento local SQLite (`cacheDb.js`) por un esquema relacional espacial con particionado por distrito y columnas geométricas nativas `GEOMETRY(Polygon, 32721)`.

\* \*\*Servidor de MVT (Vector Tiles):\*\* Desplegar Martin o pg\_tileserv para alimentar el visor web con teselas vectoriales ligeras, eliminando la sobrecarga de transferir GeoJSON masivos.

\* \*\*Almacenamiento de Objetos Desacoplado (S3 / MinIO):\*\* Configurar repositorio para resguardar archivos brutos pesados (DWG, DXF, RINEX, escaneos notariales) sin saturar el volumen de la base de datos.

\* \*\*Autenticación y Seguridad:\*\* Implementar MFA y control de accesos basado en roles (RBAC) con separación de perfiles (Agrimensor, Revisor Técnico Municipal, Director de Catastro).



\#### Sprint 4: Validación Jurídica, Mesa de Entrada y Flujos Institucionales



\* \*\*Firma Digital Cualificada (Ley 6822/21):\*\* Integrar la validación y firma de entregables finales (PDF y GeoJSON) mediante certificados PSC paraguayos acreditados por el MIC.

\* \*\*Sellado de Tiempo (Timestamping):\*\* Aplicar sellos de tiempo RFC 3161 al momento de radicar el expediente.

\* \*\*Mesa de Entrada y Bandeja de Revisores:\*\* Módulo administrativo para asignación de expedientes, estados de tramitación y emisión de dictámenes técnicos.

\* \*\*Capa Fantasma ("Ghost Layer"):\*\* Herramienta de comparación visual que proyecta el plano corregido sobre el plano observado para auditar correcciones de forma inmediata.

\* \*\*Interoperabilidad Externa:\*\* Servicios web para cruce espacial con capas de protección ambiental (franjas hídricas MADES Ley 3239/07, SINASIP) y validación dominial con DGRP.



Sí. La \*\*Resolución SNC N° 551/2023 no opera en el vacío\*\*, sino que vino a modificar y unificar exclusivamente el \*\*formato de intercambio digital\*\* (estableciendo la obligatoriedad del formato Shapefile con su tabla de atributos `.dbf` normalizada y derogando el punto 2.3.1 de la 437/12).



Todo el resto del marco técnico, sustancial y procedimental para la confección, visado y presentación de planos en Paraguay sigue regido por un conjunto de \*\*resoluciones, decretos y acordadas vigentes\*\* que un sistema profesional debe contemplar de forma obligatoria:



\---



\### 1. Marco Técnico y Normativo del SNC (Vigente en Conjunto con la 551)



\#### A. Resolución SNC N° 437/2012 (y Res. 175): «Normas para Documentos Técnicos y Guía de Requisitos»



Es el \*\*esqueleto gráfico y documental base\*\*. Aunque la Res. 551/2023 sustituyó el medio/formato digital a Shapefile, todo el apartado de \*\*Normas para Documentos Técnicos\*\* de la 437/12 sigue plenamente vigente:



\* \*\*Escalas reglamentarias forzadas:\*\* Prohibición de escalas arbitrarias. Obliga al uso estricto de escalas estándar: `1:500`, `1:1.000`, `1:2.000`, `1:5.000`, `1:10.000`, `1:20.000` y `1:50.000`.

\* \*\*Cuadro de Rumbos y Distancias:\*\* Especifica la orientación obligatoria en cuadrante sexagesimal (`Rumbo`, `Distancia en metros`, `Vértices`, `Coordenadas UTM`).

\* \*\*Croquis de Localización / Macro:\*\* Debe incluirse en una ventana gráfica independiente del plano mostrando vías de acceso, accidentes principales y mojones de arranque referenciados a puntos consolidados.

\* \*\*Tolerancias de discrepancia superficial:\*\* Fija los criterios de tolerancia entre la superficie analítica de mensura y la superficie descripta en el título antecedente.



\#### B. Resolución SNC N° 216/2022: «Unificación de Inmuebles y Lotes Deslindados en Títulos»



Modificó las históricas Notas 20 y 22 de la Res. 437/12 y es clave para el módulo registral del sistema:



\* \*\*Regla de presentación por polígono matriz:\*\* Para unificaciones, exige que el plano ilustre tanto las \*\*fracciones originales independientes\*\* con sus linderos según título como la \*\*fracción resultante unificada\*\* con sus linderos actuales.

\* \*\*Lotes deslindados bajo un solo identificador:\*\* Regula cómo desdoblar catastralmente inmuebles que en una misma cuenta o padrón tienen dos o más parcelas físicamente separadas (o cuando existen fracciones "resto" separadas), estableciendo cuándo se requiere o prescinde de aprobación municipal previa.



\#### C. Resolución SNC N° 220/2011: «Asignación de Nomenclatura Catastral»



Define los procedimientos operativos para asignar nueva Cuenta Corriente o nuevo Padrón tras:



\* Sentencia definitiva de \*\*Mensura Judicial\*\*.

\* Fraccionamientos particulares y loteamientos aprobados.

\* Expropiaciones viales del MOPC.



\#### D. Resolución SNC N° 88/2011: «Registro de Profesionales Habilitados»



\* Obliga a que todo plano ingresado esté vinculado a un profesional (Agrimensor, Ing. Geógrafo, Ing. Civil) matriculado y habilitado en el registro interno del SNC, además de su registro MOPC anual.



\---



\### 2. Normas de Origen Registral y Judicial (DGRP / CSJ)



\#### E. Acordada N° 84/1998 (Corte Suprema de Justicia / DGRP)



Es una de las normas más observadas en mensuras y fraccionamientos:



\* \*\*Principio de Representación del Resto:\*\* Todo plano de fraccionamiento o desprendimiento que pretenda inscripción registral debe graficar y determinar analíticamente no solo la fracción a transferir, sino \*\*el polígono general antecedente y la fracción remanente ("Resto")\*\*, con su respectivo balance de superficies y linderos actualizados.



\#### F. Código de Organización Judicial (Ley 879/81) y Código Procesal Civil (Título de Mensuras)



\* \*\*Juicios de Mensura y Deslinde:\*\* Exige el depósito judicial previo de las operaciones técnicas, la citación formal de colindantes con cédula de notificación, la suscripción del \*\*Acta de Deslinde y Amojonamiento in situ\*\* y la sentencia judicial homologatoria firme antes de la asignación de nomenclatura definitiva.



\---



\### 3. Normativa Municipal y Ordenamiento Urbano



\#### G. Ley N° 3966/2010 «Orgánica Municipal» (Capítulo de Loteamientos y Tierras)



\* \*\*Cesión de Espacio Verde (Art. 136):\*\* Obligatoriedad de ceder gratuitamente a la municipalidad un porcentaje del área total loteada (mínimo legal del \*\*7%\*\* para plazas/espacios verdes, sumado al porcentaje de calles públicas y áreas comunales).

\* \*\*Perfiles Viales Mínimos:\*\* Las calles proyectadas en loteamientos deben cumplir anchos mínimos (típicamente entre 12 y 16 metros para secundarias, y 24 a 30 metros para avenidas colectoras).

\* \*\*Aprobación de la Junta Municipal:\*\* Ningún plano de fraccionamiento con apertura de calles o loteamiento puede obtener Padrón/CCC definitiva en Catastro sin la \*\*Resolución homologatoria de la Junta Municipal y promulgación del Intendente\*\*.



\---



\### 4. Normativa Ambiental y Recursos Naturales (Cruce MADES)



\#### H. Ley N° 3239/2007 «De los Recursos Hídricos del Paraguay»



\* Fija las \*\*zonas de servidumbre y riberas de protección\*\*:

\* Prohíbe amojonar o privatizar cauces de dominio público.

\* Establece franjas de amortiguamiento no edificables (retiros de arroyos y manantiales) que el software debe alertar si un loteador pretende solapar como superficie útil de lote.







\#### I. Ley N° 4241/2010 «Restablecimiento de Bosques Protectores de Cauces Hídricos»



\* Exige que en planos rurales y loteamientos periurbanos se identifiquen y preserven las franjas de bosques riparios a ambos márgenes de cursos fluviales (cuyo ancho oscila entre 5 y 100 metros dependiendo del orden y caudal del cauce).



\---



\### ¿Qué implica esto para el diseño de tu sistema?



Si el programa solo valida el formato Shapefile y los campos del `.dbf` de la Res. 551/2023, \*\*Catastro o la Municipalidad lo rechazarán por vicios de fondo\*\*. Tu motor debe contemplar las siguientes validaciones automáticas:



1\. \*\*Validador de Balances según Acordada 84/98:\*\* Cálculo del trinomio $\\text{Matriz} - \\text{Transferido} = \\text{Resto}$.

2\. \*\*Controlador de Cesiones de la Ley 3966/10:\*\* Alerta de bloqueo si el área de plaza/espacio verde es $< 7\\%$.

3\. \*\*Escalas Paramétricas de la Res. 437/12:\*\* En el módulo de salida a PDF/A, restringir el selector de escalas únicamente a las escalas reglamentarias del SNC.

4\. \*\*Validación de Matrícula y Registros (Res. 88/11):\*\* Verificación de firma/registro del profesional antes de autorizar la exportación o radicación del expediente.

5\. \*\*Buffer de Protección Hídrica (Leyes 3239/07 y 4241/10):\*\* Algoritmo de intersección espacial que impida generar esquinas o linderos privados dentro de la franja protegida de nacientes y arroyos.



**Aprovechando los módulos que ya están construidos en \*\*SNC\_v3\*\* (el motor COGO en `js/cogo.js`, la validación topológica en `js/validator.js`, la edición y linaje en `js/lineage.js`/`js/geoprocessing.js`, y la exportación en `js/export.js`), se pueden estructurar \*\*6 herramientas operativas concretas\*\* para cerrar la brecha con el marco normativo ampliado (Resoluciones 437/12, 216/22, 88/11, Acordada 84/98 CSJ, Ley 3966/10 y leyes ambientales del MADES):**



**---**



**### 1. Inspector de Balances de Fraccionamiento (Cumplimiento Acordada 84/98 CSJ)**



**Aprovecha el cálculo analítico de áreas de Gauss y la estructura de linaje existente (`js/lineage.js`).**



**\* \*\*Qué hace:\*\* Verifica de forma estricta la ecuación de balance superficial en desprendimientos:**



**$$\\text{Superficie Matriz} = \\sum \\text{Superficie Fracciones a Transferir} + \\text{Superficie Remanente (Resto)}$$**





**\* \*\*Funcionalidad clave:\*\***

**\* Calcula la discrepancia admisible ($\\pm 0.01\\text{ m}^2$ en áreas urbanas y tolerancia proporcional en rurales).**

**\* Exige que el usuario dibuje o importe obligatoriamente el polígono del \*\*"Resto"\*\*, impidiendo generar planos de desprendimiento "flotantes" sin delimitar el remanente.**

**\* Valida que los linderos del resto coincidan punto a punto con los bordes no afectados de la finca matriz.**







**---**



**### 2. Validador Urbanístico de Loteamientos (Cumplimiento Ley Orgánica Municipal 3966/10)**



**Aprovecha las herramientas de geoprocesamiento (`js/geoprocessing.js`) y cálculo de áreas útiles (`js/municipal.js`).**



**\* \*\*Qué hace:\*\* Audita el plano de loteamiento antes de su presentación municipal y catastral para evitar rechazos de la Junta Municipal.**

**\* \*\*Funcionalidad clave:\*\***

**\* \*\*Cálculo de cesión pública obligatoria:\*\* Comprueba automáticamente que la superficie destinada a plazas y edificios públicos alcance el \*\*7% mínimo legal\*\* respecto al área bruta o útil del inmueble matriz.**

**\* \*\*Verificador de anchos de calle:\*\* Mide de forma paramétrica la distancia perpendicular entre líneas municipales enfrentadas para alertar si alguna calle proyectada tiene menos de 12 metros (o menos de 24 metros en vías colectoras/avenidas).**

**\* \*\*Inspector de lote mínimo:\*\* Evalúa frente (ej. $\\ge 12\\text{ m}$) y área total (ej. $\\ge 360\\text{ m}^2$) de cada sublote derivado, marcando en rojo los lotes residuales inviables.**







**---**



**### 3. Motor de Restricciones Ambientales e Hídricas (Cumplimiento Leyes MADES 3239/07 y 4241/10)**



**Aprovecha el motor de intersección espacial y snapping (`js/validator.js`).**



**\* \*\*Qué hace:\*\* Contrasta el polígono medido por el topógrafo contra la red de cauces hídricos, humedales y áreas SINASIP.**

**\* \*\*Funcionalidad clave:\*\***

**\* \*\*Buffer dinámico de protección:\*\* Aplica una franja de amortiguamiento automática a lo largo de cursos de agua (ej. 5 a 30 metros según el cauce).**

**\* \*\*Control de invasión:\*\* Emite un bloqueo crítico si algún lindero privado penetra la franja de servidumbre hídrica de dominio público o si se pretende amojonar dentro del lecho del arroyo.**

**\* \*\*Detección de reservas forestales:\*\* En áreas rurales mayores a 20 ha, calcula si se respeta el 25% de cobertura boscosa legal exigido por el marco ambiental/INFONA.**







**---**



**### 4. Compositor Paramétrico de Planos Normados (Cumplimiento Res. SNC 437/12)**



**Aprovecha el motor de maquetación en PDF/A y dibujo de carátula (`js/export.js`).**



**\* \*\*Qué hace:\*\* Automatiza la diagramación del plano para garantizar que cumpla la guía de requisitos técnicos sin necesidad de retoques manuales en CAD.**

**\* \*\*Funcionalidad clave:\*\***

**\* \*\*Bloqueo a escalas normalizadas:\*\* Elimina la selección libre de escalas y restringe la salida a: `1:500`, `1:1.000`, `1:2.000`, `1:5.000`, `1:10.000`, `1:20.000` y `1:50.000`. Si el predio no encaja, fuerza a pasar al siguiente tamaño de lámina ISO (A3 $\\rightarrow$ A2 $\\rightarrow$ A1 $\\rightarrow$ A0).**

**\* \*\*Generador de cuadrícula UTM:\*\* Traza automáticamente la grilla con cruces o líneas discontinuas a intervalos métricos constantes, rotulando los valores de Este y Norte en los márgenes exteriores.**

**\* \*\*Ventana de Macro-localización:\*\* Inserta un recuadro secundario con el croquis de ubicación a escala reducida, mostrando vías de acceso, accidentes principales y la referencia a hitos consolidados.**







**---**



**### 5. Asistente de Unificación y Lotes Deslindados (Cumplimiento Res. SNC 216/22)**



**Aprovecha las operaciones de fusión geométrica (`js/geoprocessing.js`) y el árbol genealógico catastral.**



**\* \*\*Qué hace:\*\* Resuelve los expedientes de refundición de cuentas o de fincas con múltiples cuerpos deslindados bajo un mismo padrón.**

**\* \*\*Funcionalidad clave:\*\***

**\* \*\*Visualización dual:\*\* Renderiza en capas superpuestas las geometrías de las parcelas matrices (según sus respectivos títulos antecedente) y el nuevo polígono envolvente resultante.**

**\* \*\*Purga de medianeras internas:\*\* Suprime de forma automática los linderos internos compartidos al consolidar el lote unificado, recalculando el nuevo cuadro de rumbos y distancias perimetral.**

**\* \*\*Detección de discontinuidad física:\*\* Alerta si se intenta unificar parcelas que no son espacialmente colindantes (separadas por calles o arroyos públicos), sugiriendo el trámite de desdoblamiento previo.**







**---**



**### 6. Módulo de Acreditación y Matriz de Verificación Pre-Ingreso (Res. SNC 88/11 y Mesa de Entrada)**



**Aprovecha el checklist de pre-calificación geométrica ya existente en el sistema.**



**\* \*\*Qué hace:\*\* Funciona como un "semáforo previo" que asegura que ningún expediente se exporte o ingrese si carece de respaldo profesional o técnico.**

**\* \*\*Funcionalidad clave:\*\***

**\* \*\*Padrón de profesionales:\*\* Valida que el nombre, título profesional y número de registro MOPC coincidan con los formatos admitidos por el SNC.**

**\* \*\*Informe de conformidad técnica:\*\* Emite un reporte en PDF/JSON con el resumen de validaciones superadas:**

**\* Cierre angular y lineal.**

**\* Tolerancias de discrepancia Superficie Título vs. Superficie Mensura.**

**\* Balance de fraccionamiento / cesión municipal.**

**\* Ausencia de conflicto con retiros viales o zonas de protección del MADES.

Para diseñar un software municipal integral (\*Sistema Integrado de Gestión Municipal y Catastro Multifinalitario - SIGM\*), el sistema no debe limitarse a una base de datos cartográfica: debe ser el \*\*núcleo transaccional, tributario, territorial y administrativo\*\* del municipio.**



**En el marco legal paraguayo, este software debe responder estrictamente a la \*\*Ley N° 3966/2010 «Orgánica Municipal»\*\*, la \*\*Ley N° 125/1991 y Ley N° 5513/2015\*\* (Régimen Tributario e Impuesto Inmobiliario), la \*\*Ley N° 6822/2021\*\* (Servicios de Confianza y Firma Digital), normativas del \*\*MADES\*\* (Leyes 294/93, 3239/07, 4241/10) y los estándares del \*\*Servicio Nacional de Catastro (Resolución 551/2023, 437/12 y concordantes)\*\*.**



**---**



**### 1. Marco Normativo Municipal que el Software Debe Cumplir**



**| Ley / Instrumento Legal | Qué Exige | Cómo lo Implementa el Software |**

**| --- | --- | --- |**

**| \*\*Ley 3966/10 (Orgánica Municipal)\*\* | Art. 136 (Cesión de Espacios Verdes $\\ge 7\\%$ y calles en loteamientos). | Algoritmo de balance que bloquea aprobación si la cesión pública no alcanza el porcentaje o si los perfiles viales son $< 12\\text{ m}$. |**

**| \*\*Ley 3966/10 (Art. 224 y ss.)\*\* | Clasificación del suelo: Urbano, Suburbano y Rural; planes reguladores y zonificación. | Capas restrictivas que auditan FOS (Factor de Ocupación), FUS (Factor de Utilización) y retiros de línea municipal. |**

**| \*\*Ley 5513/15 (Modif. Ley 125/91)\*\* | Liquidación del Impuesto Inmobiliario, adicional al baldío y suelo rural/urbano. | Motor tributario que calcula el valor fiscal del suelo (por zonas homogéneas) + edificación (por tipología/antigüedad). |**

**| \*\*Ley 6822/21 (Firma Digital)\*\* | Validez jurídica de actos administrativos electrónicos. | Firma digital avanzada/cualificada en resoluciones de intendencia, visados técnicos y planos PDF/A. |**

**| \*\*Ley 3239/07 y Ley 4241/10 (MADES)\*\* | Protección de riberas, franjas de servidumbre de agua y bosques riparios. | \*Buffer\* de protección automática a cursos hídricos que impide habilitar construcciones o parcelas en zonas de amortiguamiento. |**

**| \*\*Ley 5282/14 (Acceso a la Información)\*\* | Transparencia activa de presupuestos, compras y resoluciones. | Portal público con visor de datos abiertos, normativas comunales y estado de expedientes. |**



**---**



**### 2. Módulos Funcionales del Sistema Integral**



**El sistema se estructura en \*\*6 subsistemas interconectados\*\* sobre una única base de datos espacial:**



**```**

**┌────────────────────────────────────────────────────────────────────────┐**

**│                        PORTAL PÚBLICO Y CIUDADANO                       │**

**│  - Trámites Online (Mesa de Entrada)  - Consulta de Deuda / Pago Web  │**

**│  - Geoportal Abierto (Zonificación)   - Validación de Planos por QR    │**

**└───────────────────────────────────┬────────────────────────────────────┘**

&#x20;                                   **│**

&#x20;                                   **▼**

**┌────────────────────────────────────────────────────────────────────────┐**

**│                    NÚCLEO MUNICIPAL (BACKOFFICE)                       │**

**├───────────────────────────────┬────────────────────────────────────────┤**

**│ 1. CATASTRO Y GIS             │ 2. OBRAS PARTICULARES Y URBANISMO      │**

**│ - Mosaico Parcelario Unificado│ - Visado de Planos de Construcción     │**

**│ - Topología Res. SNC 551/2023 │ - Control de FOS, FUS y Retiros        │**

**│ - Ficha Catastral Alfanumérica│ - Inspecciones en Campo (App Móvil)    │**

**├───────────────────────────────┼────────────────────────────────────────┤**

**│ 3. HACIENDA Y TRIBUTACIÓN     │ 4. GESTIÓN DE EXPEDIENTES (BPM)        │**

**│ - Impuesto Inmobiliario / Baldío│ - Mesa de Entrada Única Telemática    │**

**│ - Patentes Comerciales/Rodados│ - Circuito de Firmas Digitales         │**

**│ - Pasarela de Cobranzas / Caja│ - Pistas de Auditoría Inmutables       │**

**├───────────────────────────────┼────────────────────────────────────────┤**

**│ 5. MEDIO AMBIENTE Y SALUBRIDAD│ 6. INTEROPERABILIDAD                   │**

**│ - Restricciones MADES/Hídricas│ - Conexión SNC (Catastro Nacional)     │**

**│ - Control de Residuos/Vertedero│ - Conexión DGRP (Registros Públicos)  │**

**│ - Monitoreo de Deforestación  │ - WMS / WFS para Topógrafos            │**

**└───────────────────────────────┴────────────────────────────────────────┘**



**```**



**#### Módulo I: Catastro Multifinalitario y GIS (El Corazón Territorial)**



**\* \*\*Padrón Catastral Unificado:\*\* Gestión simultánea de C.C.C. urbana (`Zona/Manzana/Lote/Piso/Dpto`) y Padrón Rural.**

**\* \*\*Mosaico Parcelario Dinámico:\*\* Base de datos PostGIS con visualización de todo el distrito a escala milimétrica.**

**\* \*\*Motor de Auditoría Topológica (Res. 551/2023):\*\* Detección automática de solapamientos (\*overlaps\*), huecos no justificados (\*gaps\*), cierre angular/lineal y poligonales cerradas.**

**\* \*\*Ficha Catastral Multifinalitaria:\*\* Vincula datos jurídicos (título, propietario, DGRP), físicos (área, frente, fondo, topografía), económicos (valor fiscal, valor venal) y de servicios (agua, luz, recolección de basura, tipo de pavimento).**

**\* \*\*Gestor de Linaje Parcelario:\*\* Historial de cómo nació cada lote (árbol genealógico de fraccionamientos, unificaciones y loteamientos).**



**#### Módulo II: Obras Particulares y Control Urbano**



**\* \*\*Aprobación Digital de Planos de Obras:\*\* Carga de planos arquitectónicos y estructurales en PDF/DWG.**

**\* \*\*Validador Automático del Plan Regulador:\*\***

**\* Chequeo del \*\*FOS\*\* (Factor de Ocupación del Suelo): alerta si la superficie cubierta supera el límite de la zona.**

**\* Chequeo del \*\*FUS\*\* (Factor de Utilización del Suelo): control de metros cuadrados construibles totales.**

**\* Control de retiros obligatorios: frontal sobre línea municipal, laterales y contrafrente.**





**\* \*\*Fiscalización Móvil en Terreno:\*\* App para inspectores con GPS integrado que permite labrar actas de infracción georreferenciadas con fotografías y sincronización en tiempo real.**

**\* \*\*Permisos de Demolición y Ocupación de Vía Pública.\*\***



**#### Módulo III: Administración Tributaria y Rentas Municipales**



**\* \*\*Liquidación del Impuesto Inmobiliario (Ley 5513/15):\*\***

**\* Cálculo paramétrico automático: `Valor Fiscal del Suelo` (según zona homogénea decretada) $+$ `Valor de Mejoras/Construcción` (según tabla de valores por metro cuadrado, tipo de material y antigüedad).**

**\* Aplicación automática de alícuotas del impuesto adicional a inmuebles baldíos o subutilizados.**





**\* \*\*Tasas Especiales:\*\* Barrido y limpieza, recolección de basura, conservación de pavimentos, salubridad y alumbrado.**

**\* \*\*Otros Tributos:\*\* Patente comercial e industrial, patente a los rodados (vinculada al Registro Único del Automotor), impuesto a la publicidad y propaganda, y plusvalía (impuesto al mayor valor en loteamientos).**

**\* \*\*Caja y Cobranzas Multicanal:\*\* Emisión de facturación electrónica (SIFEN - DNIT), boletas de pago con código de barras y botón de pago telemático (Bancard, Aquí Pago, Pago Móvil).**

**\* \*\*Certificado de Paz y Salvo:\*\* Emisión automatizada con código QR de la constancia de no adeudar tributos comunales.**



**#### Módulo IV: Mesa de Entrada Digital y Gestión de Expedientes (BPM)**



**\* \*\*Expediente Electrónico Único:\*\* Cada trámite (fraccionamiento, queja, solicitud de permiso) genera un número correlativo e inmutable vinculado a la cuenta catastral.**

**\* \*\*Flujos de Trabajo Parametrizables:\*\* Enrutamiento automático entre dependencias:**

**$$\\text{Mesa de Entrada} \\rightarrow \\text{Catastro} \\rightarrow \\text{Medio Ambiente} \\rightarrow \\text{Obras Particulares} \\rightarrow \\text{Asesoría Jurídica} \\rightarrow \\text{Intendencia / Junta}$$**





**\* \*\*Firma Digital Avanzada (Ley 6822/21):\*\* Los directores y el intendente firman digitalmente dictámenes y resoluciones, eliminando el expediente físico de papel.**

**\* \*\*Trazabilidad y Alertas de Plazos:\*\* Contador de días hábiles por departamento para evitar la mora burocrática y notificaciones por correo al ciudadano/agrimensor.**



**#### Módulo V: Gestión Ambiental y Territorial (Vínculo MADES)**



**\* \*\*Capa de Restricciones Hídricas (Ley 3239/07):\*\* Polígonos de amortiguamiento automáticos en nacientes y arroyos que alertan en el visor si un loteador o constructor pretende ocupar el lecho.**

**\* \*\*Control de Bosques Protectores (Ley 4241/10):\*\* Monitoreo de desmontes en riberas fluviales.**

**\* \*\*Registro de Evaluaciones de Impacto Ambiental:\*\* Campo obligatorio para vincular el número de expediente SIAM/MADES y la Declaración de Impacto Ambiental (DIA) en estaciones de servicio, loteamientos, industrias y canteras.**

**\* \*\*Catastro de Pasivos Ambientales:\*\* Georreferenciación de vertederos, zonas inundables, cementerios y puntos críticos de contaminación.**



**#### Módulo VI: Interoperabilidad y Servicios Externos**



**\* \*\*Conector con el SNC:\*\* Exportación e importación en el formato estándar (Shapefile/GeoJSON de la Res. 551/2023) con atributos `.dbf` normalizados para agilizar la asignación de padrones definitivos.**

**\* \*\*Conector con la DGRP:\*\* Cotejo de titularidades dominiales, fincas y matrículas del folio real electrónico.**

**\* \*\*Servicios OGC Abiertos:\*\* Publicación de capas WMS/WMTS/WFS para que los agrimensores y topógrafos descarguen los límites de manzanas oficiales directamente a su Civil 3D o QGIS.**



**---**



**### 3. Roles de Usuarios y Matriz de Permisos (RBAC)**



**Para evitar fraudes catastrales o tributarios, el sistema debe implementar una separación estricta de deberes:**



**1. \*\*Contribuyente / Ciudadano:\*\* Consulta de deuda, radicación de denuncias, seguimiento de expedientes y descarga de boletas.**

**2. \*\*Topógrafo / Agrimensor / Arquitecto:\*\* Carga de proyectos, simulación de validaciones topológicas (\*pre-flight\*) y recepción de observaciones técnicas.**

**3. \*\*Revisor Técnico de Catastro / Obras:\*\* Validación espacial, cotejo de linderos, verificación de FOS/FUS y emisión de dictámenes técnicos.**

**4. \*\*Liquidador de Rentas / Cajero:\*\* Modificación de bases imponibles (sujeto a auditoría), cobro y emisión de facturas. No puede alterar geometrías parcelarias.**

**5. \*\*Director de Área / Intendente:\*\* Firma de resoluciones aprobatorias, bloqueo cautelar de inmuebles y visualización de tableros de control gerencial.**

**6. \*\*Auditor Interno:\*\* Acceso de solo lectura a la bitácora inmutable (\*Audit Trail\*) para verificar qué usuario modificó valores fiscales, linderos o condonó recargos.**



**---**



**### 4. Arquitectura de Despliegue Recomendada**



**Para un municipio paraguayo estándar, considerando archivos CAD pesados y conectividad variable:**



**\* \*\*Base de Datos:\*\* PostgreSQL 16+ con PostGIS 3.4+. El servidor debe residir en una nube soberana o centro de datos seguro con replicación diaria.**

**\* \*\*Backend:\*\* Node.js (TypeScript) o Python (FastAPI), implementado como API REST desacoplada.**

**\* \*\*Motor Geoespacial:\*\* Servidor de teselas vectoriales (\*\*Martin\*\* o \*\*pg\_tileserv\*\*) para que el mapa vuele en los navegadores sin transferir archivos pesados.**

**\* \*\*Almacenamiento de Archivos:\*\* Repositorio compatible con S3 (MinIO si es en servidor local, o AWS/Wasabi) para resguardar planos DWG, PDFs firmados y actas de inspección.**

**\* \*\*Frontend:\*\* Interfaz web única en React o Next.js, responsive (adaptada a pantallas de escritorio y tablets de inspectores).**



**---**



**### 5. Plan de Implementación por Fases**



**1. \*\*Fase 1 (Saneamiento y Migración - Meses 1 a 3):\*\***

**\* Migración de planillas Excel o bases de datos antiguas a PostgreSQL.**

**\* Carga del mosaico parcelario disponible y depuración de cuentas corrientes duplicadas.**

**\* Parametrización de ordenanzas tributarias y zonas homogéneas.**





**2. \*\*Fase 2 (Núcleo Tributario y Mesa de Entrada - Meses 4 a 6):\*\***

**\* Puesta en marcha de la liquidación del Impuesto Inmobiliario y caja.**

**\* Implementación de la mesa de entrada digital y seguimiento de expedientes.**





**3. \*\*Fase 3 (GIS y Obras Particulares - Meses 7 a 9):\*\***

**\* Habilitación del validador topológico (Res. 551 y Ley 3966).**

**\* Visado digital de obras particulares y loteamientos.**

**\* Despliegue de la app móvil para fiscalización de campo.**





**4. \*\*Fase 4 (Interoperabilidad y Firma Digital - Meses 10 a 12):\*\***

**\* Conexión con servicios de firma digital (PSC) y sellado de tiempo.**

**\* Conexión WFS con agrimensores y reporte automático al SNC y MADES.**



