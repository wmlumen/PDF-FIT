# Guía Técnica — Rotulación Cartográfica y Acotamiento Perimétrico de Parcelas Catastrales

**Ámbito:** Plataforma catastral georreferenciada (SNC N° 551/2023)
**Especialista:** Ingeniero Geomático y Especialista en SIG
**Forja:** Vanilla/ESM + Leaflet (frontend) · ArcGIS Pro (referencia de nomenclatura de etiquetas)
**Normativa técnica:** SNC N° 551/2023 — SIRGAS-Cono Sur / WGS84 · UTM 20S/21S · tolerancias Urbana ≤1/10,000, Rural ≤1/5,000

---

## 1. Jerarquía y Formato Tipográfico para Etiquetas de Parcelas

### 1.1 Principios de jerarquía visual

El identifi cado de la parcela es la información más importante del mapa. La jerarquía visual se estructura así:

| Elemento | Jerarquía | Tamaño (recomendado) | Tipografía |
|---|---|---|---|
| Identifi cador del lote (Zona + Manzana + Lote + Sublote) | **Máxima** | 11–12 px, **negrita** | Inter / Roboto Mono (condensada) |
| Superfi cie (número + m²) | Secundaria | 10–11 px | Inter / Roboto Mono |
| Uso/zonifi cación (opcional) | Terciaria | 8–9 px | Inter / Roboto Mono |
| Unidades de superfi cie (m²) | Superíndice | 60–70 % del tamaño de la superfi cie | Superíndice |

**Regla:** el identifi cador del lote siempre en **negrita y mayor tamaño**; la superfi cie aparece con **superíndice de unidades**; la zonifi cación/zonificación es opcional y se subraya visualmente (y/o se guarda para la ficha lateral).

### 1.2 Estructuración de expresiones de texto combinado (multilínea)

La expresión estándar para el etiquetado de una parcela es una cadena multilinea con niveles de jerarquía claros:

```
ZonaManzana-Lote       ← Identifi cador del lote (negrita, 11–12 px, prioridad máxima)
   12,45 m²            ← Superfi cie con superíndice de unidades (10–11 px)
   Urbanización = Parcela ───────────────────────────  ← Uso/zonifi cación opcional (8–9 px)
```

**Estructura sugerida (string):**

```
<IDENT>ZonaXX_ManzanaABCD_Lote12_Sublote3</IDENT>
<SUPERFICIE>1.242<SUP>m²</SUP></SUPERFICIE>
<USO>Urbanización: Centro 1</USO>
```

*El identifi cador del lote recibe el **nivel 1**. La superfi cie recibe el **nivel 2** con superíndice de unidades. El uso/zonifi cación es un **nivel 3** opcional.*

### 1.3 Etiquetas de estilo en línea (equivalente a XML)

Estas etiquetas permiten aplicar tamaños, colores y superíndices de manera dinámica desde la base de atributos, sin una página de diseño ligera. La sintaxis sigue las reglas de **XML** (cada etiqueta de apertura tiene su etiqueta de cierre; se pueden anidar; los nombres de etiqueta deben coincidir en mayúsculas/minúsculas):

| Etiqueta | Atributos | Uso en parcelas |
|---|---|---|
| `<FNT>` | `name`, `size` (px), `style` (italic/bold), `scale` | Fuente y tamaño del identifi cador |
| `<CLR>` | `red`, `green`, `blue` (0–255), `alpha` (0–100) | Color del texto |
| `<SUP>` | — | Superíndice (m²) |
| `<SUB>` | — | Subíndice (opcional) |
| `<NEWLINE>` | — | Salto de línea (multilinea) |
| `<PART>` | `position`, `h_align`, `v_align`, `x_offset`, `y_offset` | Posicionamiento de subelementos |
| `<BSE>` | — | Etiqueta base (Motor Maplex) — referencia de alineación |

**Sintaxis de ejemplo (etiqueta de etiquetado dinámico):**

```text
"<FNT name='Inter' style='bold' size='12'>" +
$feature.CODIGO_LOTE + "</FNT>" +
"<NEWLINE>" +
"<FNT name='RobotoMono' size='10.5'>" +
$feature.SUPERFICIE + "<SUP>m²</SUP>" +
"</FNT>" +
"<NEWLINE>" +
"<FNT name='Inter' size='9' color='RRGGBB'>" +
$feature.USO + "</FNT>"
```

**Propiedades clave de las etiquetas de estilo en línea:**

- Son invocadas dinámicamente desde el motor de etiquetado; **no se resuelven** en el panel de Contenido, la tabla de atributos ni las ventanas emergentes.
- Usan **punto como separador decimal** (12.45 m, no 12,45).
- Los caracteres especiales (`&`, `<`, `>`) deben escaparse como `&amp;`, `&lt;`, `&gt;`.
- Las etiquetas modifican temporalmente el símbolo de texto base; no reemplazan la clase de etiqueta misma.

### 1.4 Implementación en el motor de etiquetado (ejemplo concreto)

La expresión de etiqueta para una parcela en un motor tipo ArcGIS Pro/Maplex sería:

```text
"<FNT name='Inter' style='bold' size='12'>" + $feature.CCC + "</FNT>" +
"<NEWLINE>" +
"<FNT name='RobotoMono' size='10.5'>" + $feature.SUPERFICIE + "<SUP>m²</SUP></FNT>" +
"<NEWLINE>" +
"<FNT name='Inter' size='9'>" + $feature.USO_CATASTRAL + "</FNT>"
```

Donde:
- `CCC` = Código Catastral (Zona + Manzana + Lote + Sublote)
- `SUPERFICIE` = Superfi cie en m²
- `USO_CATASTRAL` = Zonifi cación / Uso (opcional)

---

## 2. Automatización del Acotamiento de Linderos (Distancias Perimetrales)

### 2.1 Procedimiento paso a paso

#### Paso 1: Validación de proyección y rejilla

Antes de cualquier cálculo de distancias, verificar que **todas las capas y la vista compartan el mismo sistema de referencia**:

- Dato: SIRGAS-Cono Sur / WGS84
- Proyección: UTM 20S (EPSG:32720) o UTM 21S (EPSG:32721)
- Escala de trabajo: coherente con la escala de exportación
- Unidad de medida: metros
- Tolerancia mínima entre coordenadas: ≲ 0.001 m (grid precision)

> **Advertencia:** capas mal proyectadas introducen desplazamientos y cálculos geométricos incorrectos. **Las acotaciones sólo son fiables en proyección correcta.**

#### Paso 2: Extracción de geometría de polígonos

Para cada parcela (polígono catastral), extraer el anillo exterior (y los anillos internos, si existen):

- Geometría: `Polygon` (anillo exterior) + `MultiPolygon` (si aplica)
- Coordenadas: `[X, Y]` en UTM (m), o `[φ, λ]` en grados (lat/lon)
- Conversión: si la geometría está en grados (WGS84), convertir a UTM mediante `proj4`:

```
proj4("EPSG:4326", "EPSG:32720", [lon, lat]) → [X, Y] en metros
proj4("EPSG:4326", "EPSG:32721", [lon, lat]) → [X, Y] en metros
```

#### Paso 3: Segmentación del perímetro

Para cada anillo exterior:

1. Obtener todos los vértices: `[(X0,Y0), (X1,Y1), ..., (Xn,Yn)]`
2. Conectar de forma secuencial: `segment_i = (vertex_i, vertex_{i+1})`
3. Para el último vértice, cerrar el polígono: `segment_{n-1} = (vertex_{n-1}, vertex_0)`
4. El número total de segmentos = `n` (n vértices → n tramos)

#### Paso 4: Cálculo de longitudes reales

La longitud de cada tramo recto `i`:

```text
L_i = √[(X_{i+1} − X_i)² + (Y_{i+1} − Y_i)²]
```

**Longitud del perímetro (total):**

```text
L_perímetro = Σ L_i  para i = 0..n−1
```

Para polígonos con anillos internos (agotamientos o reservas):

```text
L_total = L_perímetro_exterior + Σ L_anillo_interno
```

#### Paso 5: Generación de las acotaciones (coordenadas del punto de anchura)

Para cada tramo `i`, posicionar la etiqueta de distancia:

- **Coordenada del punto de anchura:** punto medio del segmento:

```
P_i = ((X_i + X_{i+1})/2, (Y_i + Y_{i+1})/2)
```

- **Ángulo de la cota (segment angle):**

```
θ_i = atan2(Y_{i+1} − Y_i, X_{i+1} − X_i)
```

- **Offset perpendicular (offset para no pisar la línea):**

```
offset_x = ± L_i × 0.45  (aprox. 4–6 px a la escala de trabajo)
offset_y = ± L_i × 0.45
```

El signo del offset se elige para orientar el texto **hacia afuera del polígono** (fuera del anillo).

#### Paso 6: Rotación del texto

El texto de la cota se rota para alinearse con el tramo:

```text
angle_i = θ_i  (en grados, convertidos de radianes)
```

**Regla:** `text-align: rotate(0deg)` o `transform: rotate(var(--segment-angle))`.

#### Paso 7: Simplificación de tramos (opcional)

Si un polígono tiene muchos vértices (variedad alta), aplicar simplificación de Douglas-Peucker:

- Tolerancia: ≲ 0.01 m (mantener la precisión catastral)
- Solo para tramos que no sean críticos (ej. límites que no se etiquetan)

### 2.2 Mejores prácticas para la orientación espacial del texto

| Regla | Descripción |
|---|---|
| **Paralela al segmento** | La cota siempre debe estar alineada con el tramo (θ_i). Nunca horizontal ni vertical. |
| **Offset hacia afuera** | El texto debe quedar 4–6 px fuera del polígono, en el sentido de "hacia afuera". |
| **No superponer** | Si dos tramos adyacentes colisionan ab initio, separar los textos simétricamente (magnitudes iguales opuestas). |
| **Alternancia de lados** | En tramos curvos o polilíneas, alternar el lado (izquierdo/derecho) para evitar superposiciones entre cotas contiguas. |
| **Densidad por escala** | En escalas pequeñas (vistas generales), mostrar solo distancias globales o ninguna; en escalas grandes (1:2000+), mostrar todas las distancias. |

### 2.3 Ejemplo de código (JS/Leaflet)

```js
function segmentDistances(polygon) {
    const coords = polygon[0]; // anillo exterior
    const n = coords.length;
    const segments = [];

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = coords[i][0], y1 = coords[i][1];
        const x2 = coords[j][0], y2 = coords[j][1];
        const length = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        segments.push({ idx: i, len: length, angle, x1, y1, x2, y2 });
    }
    return segments;
}
```

---

## 3. Criterios de Posicionamiento Cartográfico (Motor de Etiquetado)

### 3.1 Objetivo

El motor de etiquetado debe: (a) identificar la parcela, (b) determinar su ubicación, (c) calcular las distancias, (d) evitar colisiones entre parcelas vecinas, y (e) garantizar la legibilidad a toda escala de detalle catastral.

### 3.2 Reglas de ubicación espacial (cercanía a la parcela)

| Sitio | Regla |
|---|---|
| Interior del polígono | Raramente usado (solo si hay espacio). Prioridad: cola de la ficha lateral. |
| Borde exterior (cota) | **Preferido.** La etiqueta se coloca en el segundo tramo exterior (|offset| ≥ 2 px del borde). |
| Exterior del polígono | **Posición de primer plano.** El texto se sitúa a 4–6 px del perímetro, siempre que no haya colisión con parcela vecina. |
| En el centro del polígono | Solo si el área es grande (≥ 10.000 m²) y no hay límite interior. Se alinea a la esquina o centro. |
| Salida de zona | Cuando el polígono colinda con otra y el límite es compartido, la etiqueta de uno de los dos se mueve al exterior del límite común. |

### 3.3 Algoritmo de detección de colisiones (spillover y superposición)

La detección de colisiones es esencial para evitar superposiciones de etiquetas en parcelas vecinas. El algoritmo:

1. **Identificación de vecinos:** dos polígonos son vecinos si comparten un tramo común (un segmento de su perímetro coincide exactamente dentro de la tolerancia de la red).
2. **Cálculo de superposición de rectángulos de texto:** para cada etiqueta, calcular el rectángulo de texto (después de rotación y escala). Comprobar si se solapa con el rectángulo de cualquier otro etiqueta.
3. **Resolución de colisión:**
   - Si la **etiqueta está en el perímetro**: mover la etiqueta perpendicularmente a 4–6 px fuera del polígono, en dirección opuesta a la distancia entre polígonos.
   - Si la **etiqueta está en el exterior**: mantener el texto en el exterior si no hay colisión con la parcela vecina.
   - Si la **colisión es ineludible**: el texto queda fuera del polígono (orientación consecutiva, sin apretar).

### 3.4 Legibilidad a escala de detalle catastral

| Escala | Comportamiento |
|---|---|
| 1:2000 – 1:5000 (escala de detalle catastral pura) | Mostrar: identifi cador del lote (negrita), superfi cie con superíndice, distancias de todos los tramos. |
| 1:5000 – 1:10000 | Mostrar: identifi cador del lote, superfi cie, distancias solo en tramos "predecibles" (los más largos). |
| 1:10000 – 1:50000 | Mostrar: identifi cador del lote con código CCC, superfi cie. Distancias ocultas. |
| < 1:50000 (vista general) | Mostrar: identifi cador, superfi cie. Distancias y vértices ocultos. |

### 3.5 Reglas de legibilidad para la red de etiquetado

1. **No más de 1 etiqueta por punto de apoyo** (máximo de 1 texto por vértice, 2 por tramo).
2. **Máximo de número de etiquetas por parcela:** 3 (identifi cador, superfi cie, distancias). No se excede.
3. **Separación mínima entre etiquetas vecinas:** ≳ 6 px (píxeles a escala) en ambas direcciones.
4. **Texto enlazado a la tabla:** la hover en la fila de la tabla resalta el límite correspondiente; el click en el límite resalta la fila de la tabla (vinculación bidireccional).
5. **Acotación de cota en 3 niveles:** (a) "distancia" (distancia corta), (b) "longitud" (distancia exacta), (c) "superfi cie" (área total) — solo se muestran según escala.

### 3.6 Pasos de configuración del motor de etiquetado

1. **Definir las clases de etiqueta** (1 por escala de zoom).
2. **Asignar la expresión de etiqueta** (1.3) a cada clase.
3. **Configurar el motor de posicionamiento:**
   - Parámetros de separación: 6 px mínimo entre adjuntos.
   - Parámetros de objetos de etiquetado: polígonos.
   - Parámetros de ligadura: el etiquetado se vincula a la capa `parcelas`.
4. **Activación por escala:** habilitar/deshabilitar clases según el zoom.
5. **Renderizado:** dibujar las etiquetas en el lienzo, con transformación por el ángulo de los tramos (Section 2.2).

---

## 4. Resumen de convenciones

| Concepto | Convención |
|---|---|
| Dato base | SIRGAS-Cono Sur/WGS84 |
| Proyección | UTM 20S (EPSG:32720) o UTM 21S (EPSG:32721) |
| Unidades | Metros para geometría; m² para superfície |
| Distancias | Longitudes reales de tramos rectos, calculadas por `√[Δx²+Δy²]` |
| Orientación de cotas | Paralela al tramo (θ_i) |
| Offset de cotas | 4–6 px fuera del polígono |
| Identifi cador del lote | Negrita, mayor jerarquía (11–12 px) |
| Superfi cie | 10–11 px con superíndice de m² |
| Vértices | Círculos pequeños (16×16 px, radio 5–7 px) |
| Zoom | Distancias ocultas en vista general; detalladas al acercar |
| SNC N° 551/2023 | Cumplir con tolerancias: Urbana ≤1/10,000 · Rural ≤1/5,000 |

---

## 5. Referencias

- **Gis&Beers** — "Cómo acotar elementos en la vista de ArcGIS" — https://www.gisandbeers.com/como-acotar-parcelas-catastro-arcgis/ (guía práctica de dimensionamiento catastral en SIG)
- **ArcGIS Pro** — "Etiquetas de formato de texto" — https://pro.arcgis.com/es/pro-app/3.6/help/mapping/text/text-formatting-tags.htm (sintaxis XML de etiquetas de estilo en línea)
- **SNC N° 551/2023** — Normativa del modelo topográfico y cartográfico catastral paraguayo (SIRGAS-Cono Sur / WGS84, UTM 20S/21S)
- **Sistema de referencia de coordenadas** — NAD passive / DISERGEMIL · RINEX post-processing

---

*Guía técnica elaborada para el flujo de trabajo de rotulación cartográfica y acotamiento perimétrico de parcelas catastrales. Principios de jerarquía visual, formato de etiquetas y telegrafía aplicables a cualquier motor de etiquetado (ArcGIS Pro Maplex o motor equivalente en Leaflet).*
