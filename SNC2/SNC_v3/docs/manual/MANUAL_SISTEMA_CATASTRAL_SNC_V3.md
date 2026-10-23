# MANUAL DE ARQUITECTURA CARTOGRÁFICA Y APILAMIENTO VISUAL (SNC_v3)

**Resolución SNC N° 551/2023 | República del Paraguay**  
*Documento de Especificación Técnica Cartográfica y Jerarquía de Panes*

---

## 1. Organización del Conjunto de Datos y Agrupación Flexible

El sistema **SNC_v3** organiza las fuentes cartográficas permitiendo dos modalidades operativas principales dentro de la Tabla de Contenido (TOC) y el gestor de capas:

### 1.1 Agrupación por Servidor Oficial (`byServer`)
Permite al operador fiscalizar la procedencia institucional de la información geográfica:
* **Servidor Base:** Mapas de navegación global (OSM, ESRI Satelital, CartoDB, Topografía).
* **Servidor INE / Geodésico Nacional:** Límites departamentales y distritales oficiales del Paraguay.
* **Servidor MAG (Ministerio de Agricultura y Ganadería):** Capas de monitoreo agropecuario, cultivos temporales y permanentes, con ciclo de vigencia de 15 días.
* **Servidor MADES (SIAM / SIAGUA):** Cobertura ambiental, parques nacionales (SINASIP) y red hidrográfica.
* **Servidor SNC / DGRP / RUN:** Catastro nacional oficial (WMS CRS:84), loteamientos aprobados y fincas registrales.
* **Servidor Municipal:** Zonificación comunal, ordenanzas de loteamiento (Ley 3966/10) y perfiles viales.
* **Servidor Local / Usuario:** Archivos DXF, Shapefiles binarios, KML y GeoJSON importados para el expediente en curso.

### 1.2 Agrupación por Dominio Temático (`byTheme`)
Permite al usuario filtrar las capas en función de la naturaleza jurídica y técnica del análisis:
* **Tema Ambiental:** Cauces hídricos, áreas silvestres protegidas y fajas de servidumbre (30m).
* **Tema Catastral:** Parcelas oficiales, mosaico nacional, manzanas y distritos catastrales.
* **Tema Agropecuario:** Soja, maíz, arroz, pasturas ganaderas y cuencas rurales.
* **Tema Municipal / Urbanismo:** Cesiones públicas viales (16%), plazas (5%-7%) y coeficientes FOS/FOT.
* **Tema Cobertura Nacional:** Delimitaciones departamentales y distritales soberanas.
* **Tema Trabajo del Usuario:** Geometría de mensura, derroteros COGO y subdivisiones periciales.

---

## 2. Orden Estricto de Apilamiento Visual (Leaflet Panes & Z-Index)

Para impedir que capas densas (como teselas raster satelitales o coberturas poligonales continuas) tapen el trabajo de mensura del perito, se implementa una arquitectura nativa de **7 Panes de Leaflet** con prelación vertical obligatoria:

| Nivel | Nombre del Pane | Z-Index | Organismo / Fuente | Capas Incluidas | Regla de Prelación |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **1** | `pane-base` | **200** | Mapas Base | OSM, Satélite ESRI, Topo, Carto | **Fondo:** Siempre en la base del mapa. |
| **2** | `pane-paraguay` | **300** | INE / Geodésico | Departamentos y Distritos | Arriba del mapa base; contextualiza los límites soberanos. |
| **3** | `pane-mag` | **400** | MAG | Cultivos, aptitud y ganadería | Arriba de los límites nacionales; ciclo 15 días. |
| **4** | `pane-mades` | **500** | MADES | SINASIP, Cauces y Franja Hídrica | Arriba del MAG; evalúa restricciones ambientales directas. |
| **5** | `pane-catastro` | **600** | SNC / DGRP / RUN | Catastro WMS, Fincas y Loteamientos | Arriba de MADES; referencia registral previa. |
| **6** | `pane-municipal` | **700** | Municipalidad | Zonificación urbana y ejes viales | Arriba de la cartografía catastral nacional. |
| **7** | `pane-usuario` | **800** | Usuario / Perito | **Parcela en Trámite, Cotas y COGO** | **Cúspide inmutable:** Siempre visible en primer plano. |

### Regla para Nuevas Capas:
Cualquier nueva capa integrada al geoportal deberá asociarse estrictamente al pane temático correspondiente según su origen institucional, heredando el Z-Index prefijado sin alterar el orden jerárquico.

---

## 3. Registro Histórico de Versiones Anteriores (Discontinuadas pero Auditables)

> **Nota de Trazabilidad Histórica:** Conforme a la regla de preservación documental, la especificación inicial que utilizaba niveles numéricos planos de z-order y accesos directos desestimados se mantiene documentada a continuación de forma tachada:

* ~~**Esquema z-order simple previo (5 niveles):**~~  
  * ~~*Nivel 0:* Mapa Base~~  
  * ~~*Nivel 10:* Nacional~~  
  * ~~*Nivel 20:* MADES~~  
  * ~~*Nivel 30:* Municipio~~  
  * ~~*Nivel 40:* Usuario~~  
  *(Reemplazado por los 7 Leaflet Panes nativos con Z-Index 200 a 800 para evitar solapamientos).*

* ~~**Enlace Directo Discontinuado:** `https://serviciosvep.mef.gov.py/home`~~  
  *(Desestimado en los portales por directiva institucional; se mantiene únicamente el procesamiento analítico offline).*

---

## 4. Circuito Oficial de Firmas Digitales y Sellos Institucionales (Ley N° 6822/2021)

El sistema implementa en `js/signatureManager.js` la arquitectura de 4 slots jerárquicos conforme a la **Ley N° 6822/2021** y la **Resolución SNC N° 551/2023**:

### 4.1 Registro Histórico de Jerarquía Preliminar (Ajustado)
> **Trazabilidad Documental:** Se conserva tachada la redacción preliminar y se actualiza a la diferenciación técnica entre Sellos Internos y Firmas Digitales Cualificadas:

* ~~**Jerarquía preliminar no diferenciada:**~~
  * ~~1. Slot 1: Responsable Técnico (Perito Agrimensor con Matrícula MOPC/SNC).~~
  * ~~2. Slot 2: Revisor Municipal (Director de Catastro u Obras Municipales).~~
  * ~~3. Slot 3: Calificador Técnico Catastral (Servicio Nacional de Catastro).~~
  * ~~4. Slot 4: Autoridad Resolutiva (Director del SNC / RUN). Emisión del Certificado definitivo.~~

### 4.2 Protocolo Gubernamental Vigente (js/signatureManager.js)

| Slot | Identificador | Rol Requerido | Tipo de Estampado | Carácter Definitivo | Alcance Pericial e Institucional |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | `slot_profesional` | `AGRIMENSOR_TOPOGRAFO` | **Firma Digital Cualificada** | **Obligatorio** | Declaración jurada de mensura, georreferenciación y responsabilidad pericial del profesional matriculado MOPC/SNC. |
| **2** | `slot_revisor` | `REVISOR_TECNICO` | **Sello Interno Institucional** | No (Revisión) | Sello de control preliminar, verificación topológica y consistencia de atributos en gabinete. |
| **3** | `slot_fiscalizador` | `JEFE_FISCALIZACION` | **Sello Interno Institucional** | No (Revisión) | Visto bueno técnico de la jefatura de fiscalización catastral y control de tolerancias. |
| **4** | `slot_director` | `AUTORIDAD_RESOLUTIVA` | **Firma Digital Cualificada** | **Obligatorio** | Homologación final por la máxima autoridad (Director SNC / Intendente / RUN) con emisión de Certificado Catastral y asignación de Padrón. |

#### Reglas de Negocio Estrictas:
1. **Sellos Internos:** Permitidos exclusivamente para estados en revisión (`BORRADOR`, `MESA_ENTRADA`, `ASIGNADO`, `EN_REVISION`, `OBSERVADO`, `REINGRESO`).
2. **Firmas Digitales Cualificadas:** Requisito excluyente e infranqueable para dictámenes y homologaciones definitivas (`DICTAMEN`, `APROBADO_FISCALIZACION`, `FIRMADO_DIRECTOR`, `PADRON_ASIGNADO`).
3. **Validación Criptográfica:** Verificación de cadena de confianza PKI, sellado de tiempo RFC 3161 y consulta de revocación CRL.


---

## 13.4 Jerarquía de Dependencias Municipales y Mapeo de Capas Geográficas (`data/`)

**Marco Normativo:** Ley Orgánica Municipal N° 3966/2010, Ley N° 5621/2016 de Protección del Patrimonio Cultural, Ley N° 6822/2021 de Servicios de Confianza y Resolución SNC N° 551/2023.

### 1. Matriz de Control de Acceso por Dependencia

| Dependencia | Padre Institucional | Secciones Habilitadas en `/municipal` | Capas Asociadas en `data/` | Dictámenes |
| :--- | :--- | :--- | :--- | :---: |
| **⭐ Super Admin** | *— (Sin restricción)* | **TODAS las secciones sin filtros** (`*`) | Acceso total a todas las capas (`data/municipal` y `data/Paraguay`) | **✅** |
| **📜 Notarial** | *— (Pilar Autónomo)* | Estado Municipal + Control de Capas (`municipal-status`, `qgis-layer-control`) | `data/municipal/parcelas.geojson`, `data/municipal/DISTRITOS_PY_CNPV2022.geojson` | **❌** |
| **🏛️ Junta Municipal** | *— (Cabeza Municipal)* | Estado Municipal + Control de Capas (`municipal-status`, `qgis-layer-control`) | `data/municipal/barrios.geojson`, `zona_influencia.geojson`, `DISTRITOS_PY_CNPV2022.geojson`, `01. Datos Oficiales DGEEC` | **❌** |
| **📐 Catastro** | `junta_municipal` | **TODO:** Estado, Capas, Fraccionamiento, Balance, Loteamiento, Ambiental, Simbología, Dictamen (`*`) | `data/municipal/parcelas.geojson`, `sample_fraccionamiento_municipal.geojson`, `barrios.geojson`, `03.Topografia/curva de nivel.shp` | **✅** |
| **🌿 Ambiental** | `junta_municipal` | Estado + Capas + Restricciones Ambientales (`municipal-status`, `qgis-layer-control`, `ambiental`) | `data/municipal/hidro.geojson`, `vertedero*.geojson` (500m y 1000m), `02.Hidrografia`, `04.Cobertura forestal` | **❌** |
| **📏 Planificación** | `junta_municipal` | Estado + Fraccionamiento + Balance de Superficies + Loteamiento (`municipal-status`, `qgis-layer-control`, `fraccionamiento`, `balance-sidebar`, `loteamiento`) | `data/municipal/barrios.geojson`, `zona_influencia.geojson`, `sample_fraccionamiento_municipal.geojson`, `01. Datos Oficiales DGEEC`, `05.Relevamiento de viviendas 2012` | **❌** |
| **🚧 Obras y Vialidad** | `junta_municipal` | Estado + Capas + Loteamiento / Perfiles Viales (`municipal-status`, `qgis-layer-control`, `loteamiento`) | `data/municipal/vias.geojson`, `data/Paraguay/03.Topografia/curva de nivel.shp` | **❌** |
| **🎓 Educación** | `junta_municipal` | Estado + Capas (Modo Consulta) (`municipal-status`, `qgis-layer-control`) | `data/Paraguay/06. Datos MEC actualizados/` (`Establecimientos escolares 2014.shp`, `establecimientos_07032019__1124.csv`), `barrios.geojson` | **❌** |
| **🏺 Patrimonio** | `junta_municipal` | Estado + Capas (Modo Consulta) (`municipal-status`, `qgis-layer-control`) | `data/municipal/casco_hist.geojson`, `casco_historico.geojson`, `centro.geojson`, `vuelo_casco.geojson` | **❌** |

---

### 2. Inventario Técnico de Capas en Disco (`data/`) y su Asignación

#### A. Dirección de Catastro y Agrimensura
* `data/municipal/parcelas.geojson`: Registro geométrico y alfanumérico de las parcelas del municipio.
* `data/municipal/sample_fraccionamiento_municipal.geojson`: Expedientes de loteamiento y fraccionamiento para subdivisión en lotes y manzanas.
* `data/municipal/barrios.geojson`: Cartografía de delimitación de barrios y zonas catastrales.
* `data/Paraguay/03.Topografia/curva de nivel.shp`: Análisis altimétrico de pendientes para loteamientos.
* **Competencia:** Emite y firma digitalmente el **Dictamen Catastral Municipal** habilitante para la asignación de padrón por el SNC.

#### B. Dirección de Medio Ambiente y Salubridad
* `data/municipal/hidro.geojson`: Red de drenaje, ríos y arroyos. Evalúa la franja hídrica de 30m de protección de cauces.
* `data/municipal/vertedero.geojson`, `vertedero_500.geojson`, `vertedero_1000.geojson`, `vertedero_integrado.geojson`: Polígono de vertedero y radios de exclusión sanitaria obligatorios de 500m y 1.000m (Restricción ambiental directa para loteamiento residencial).
* `data/Paraguay/02.Hidrografia/`: Cuencas y cauces hídricos a escala nacional y departamental.
* `data/Paraguay/04.Cobertura forestal/`: Bosques nativos y reservas protegidas MADES/SINASIP.

#### C. Dirección de Planificación Urbana y Territorial
* `data/municipal/barrios.geojson` y `zona_influencia.geojson`: Perímetros de consolidación urbana y zonas de expansión.
* `data/municipal/sample_fraccionamiento_municipal.geojson`: Fiscalización del Balance de Cesión Obligatoria según Art. 235 de la Ley 3966/10 (16% para vías públicas y 5% a 7% para plazas y edificios públicos).
* `data/Paraguay/01. Datos Oficiales DGEEC/`: Parámetros demográficos y densidad poblacional.
* `data/Paraguay/05.Relevamiento de viviendas 2012/`: Indicadores de tipología constructiva y déficit habitacional.

#### D. Dirección de Obras Públicas y Vialidad
* `data/municipal/vias.geojson`: Trazado de ejes viales, calles, avenidas y servidumbres de paso.
* `data/Paraguay/03.Topografia/curva de nivel.shp`: Determinación de pendientes longitudinales y transversales para escorrentía pluvial, zanjas de drenaje y rasantes de calles.

#### E. Dirección de Educación y Cultura
* `data/Paraguay/06. Datos MEC actualizados/Establecimientos escolares 2014.shp`: Cobertura georreferenciada de escuelas y colegios públicos y privados.
* `establecimientos_07032019__1124.csv`: Padrón y equipamiento educativo. Permite verificar que los nuevos loteamientos cuenten con reserva de espacio educativo en su radio de influencia barrial (Art. 235 Ley 3966).

#### F. Dirección de Patrimonio Histórico y Turismo
* `data/municipal/casco_hist.geojson` / `casco_historico.geojson`: Polígono de amortiguamiento y protección del Casco Histórico (Ley 5621/16).
* `data/municipal/centro.geojson`: Monumentos, iglesias y sitios de valor histórico.
* `data/municipal/vuelo_casco.geojson`: Relevamiento fotogramétrico con drones de alta resolución del centro urbano fundacional.
