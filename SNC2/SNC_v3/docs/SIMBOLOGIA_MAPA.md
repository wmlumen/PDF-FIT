# SIMBOLOGÍA DE MAPAS - ISO 1:50,000 y Cartografía Catastral
## Relación entre Código Municipal y Estándares Internacionales

### Estándares de Referencia
- **ISO 1:50,000** - Mapas topográficos a escala 1:50,000
- **ISO 31000** - Gestión de riesgos (aplicable a zonificación)
- **ISO 19157** - Información catastral
- **Norma Paraguaya** - Resolución SNC 551/2023

---

## 1. Elementos Hidrográficos

### Ríos y Aguas Continentaless
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Río permanente** | Línea azul continua | `#1E90FF` (Roxo) | Ancho variable según magnitud; flechas dirección corriente |
| **Río intermitente** | Línea azul discontinuada | `#64B5F6` (Roxo claro) | Guiones (- - -) para tramos secos |
| **Arroyo/Chorro** | Línea azul delgada | `#90CAF9` | Solo en seasonales |
| **Laguna/Estero** | Área fills azul | `#E3F2FD` | Contorno cerrado con patrón interno |
| **Charco/Poco** | Punto azul pequeño | `#BBDEFB** | Símbolo de círculo con agua |

### Códigos en el Proyecto SNC v3
- `validarAdjuntosNotariales()` valida certificados de zonas inundables
- `generarCarátulaSNC()` incluye observaciones de riesgo hídrico
- `definirParticionesDB()` puede particionar por zona de riesgo hidrológico

---

## 2. Elementos de Vías de Comunicación

### Carreteras y Calles
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Autopista/Autovía** | Línea doble + espacios | `#C62828` (Rosso) | Línea simple + espacio + línea simple + espacio |
| **Carretera principal** | Línea gruesa continua | `#D84315** | Engrosada (2-3px) para rutas nacionales |
| **Carretera secundaria** | Línea mediana continua | `#ED6C00** | Moderado engrosado (1.5px) |
| **Calle urbana** | Línea delgada continua | `#F9A825** | Delgada (0.5px) para calles locales |
| **Calle/pavimento** | Línea punteada | `#7E57C2** | Para calles vecinales/no pavimentadas |
| **Pasillo peonal** | Línea discontinua con cruces | `#5C6BC0** | Azul oscuro con símbolos de peatón |

### Señalización de Vías
| Elemento | Símbolo | Color | Ubicación |
|----------|---------|-------|-----------|
| **Semáforo** | Círculo con colores | `#FF5722** | Intersecciones principales |
| **Stop** | Octágono rojo | `#D32F2F** | Paradas obligatorias |
| **Yield/Prioridad** | Triángulo invertido | `#F57C00** | Incorporaciones |
| **Nombre de vía** | Texto alineado | `#212121** | Fuente sans-serif, tamaño 8-10 |

### Relación SNC v3
- `generarCuadriculaUTM()` traza grids sobre vías existentes
- `exportarPDFAStrict()` incluye leyenda de tipos de vía
- `calcularMetricasPlanasUTM()` mide longitud de calles

---

## 3. Equipamientos y Instalaciones Públicas

### Instituciones Educativas
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Escuela primaria** | Pico invertido | `#3F51B5** | Azul institucional, punta hacia arriba |
| **Secundaria** | Pico doble | `#303F9F** | Dos puntos apilados |
| **Universidad** | Estrella de 5 puntas | `#5C6BC0** | Símbolo acadêmico |
| **Guardería** | Círculo con cruz | `#673AB7** | Menor tamaño, color violeta |

### Sanidad y Servicios
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Hospital** | Cruz blanca | `#E53935** | Rojo/cruz sobre fondo blanco (simbólica) |
| **CAPS/Clínica** | Cruz pequeña | `#E57377** | Menor que hospital |
| **Centro de salud** | Cruz latina | `#EF9A9A** | Variante de hospital |
| **Farmacia** | Cruz verde | `#43A047** | Verde botella + cruz |

### Equipamientos Deportivos y Culturales
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Polideportivo** | Cuadrado con anillo | `#FFB74D** | Cuadrado con borde |
| **Cancha de fútbol** | Rectángulo con marcas | `#009688** | Rectángulo verde + líneas |
| **Estadio** | Óvalo grande | `#00838F** | Óvalo relleno |
| **Biblioteca** | Libro cerrado | `#795548** | Marrón libro |
| **Museo** | Pináculo | `#607D8B** | Gris azulado |
| **Teatro/Cine** | Símbolo de máscara | `#FF9800** | Naranja máscara teatral |

### Relación SNC v3
- `MesaEntrada.generarResolucionMunicipal()` incluye equipamientos
- `MesaEntrada.generarCCC()` cuenta escuelas y hospitales por zona
- `exportPDFAStrict()` muestra leyenda de equipamientos

---

## 4. Zonas y Construcciones

### Edificios y Arquitectura
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Edificio residencial** | Rectángulo simple | `#607D8B** | Gris medio, relleno ligero |
| **Edificio multifamiliar** | Rectángulo + líneas internas | `#5C6BC0** | Gris oscuro + divisiones |
| **Edificio comercial** | Rectángulo + "C" | `#3F51B5** | Azul con letra C mayúscula |
| **Industria** | Rectángulo con chimenea | `#00838F** | + símbolo de chimenea arriba |
| **Bodega/Almacén** | Rectángulo con líneas diagonales | `#8E24AA** | Diagonales para almacenamiento |

### Zonificación (del código municipal)
| Código | Significado | Color ISO | Aplicación SNC v3 |
|--------|-------------|-----------|-------------------|
| VU | Vivienda unifamiliar | `#E3F2FD** | Módulo 7: validación residencial |
| VA | Vivienda adosada | `#BBDEFB** | Módulo 8: cuadrícula sobre lotes |
| EM | Edificios multifamiliares | `#90CAF9** | Módulo 9: densidades poblacionales |
| CS | Comercial y servicios | `#CE93D8** | Módulo 10: uso de suelo comercial |

---

## 5. Naturaleza y Medio Ambiente

### Áreas Verdes y Bosques
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Bosque** | Patrón verde diagonal | `#A5D6A7** | Diagonales verdes sobre fondo claro |
| **Área arbolada** | Símbolo de árbol agrupado | `#81C784** | Circle + pequeños círculos arriba |
| **Parque** | Círculo con árbol | `#AED582** | Círculo verde + símbolo árbol |
| **Jardín público** | Sombrilla + flor | `#C0CA3E** | Amarillo-verde con elementos |

### Suelo y Agrícola
| Elemento | Símbolo ISO | Color | Características |
|----------|-------------|-------|-----------------|
| **Huerta** | Cruzada diagonal | `#FDF077** | Amarillo mostaza + diagonales verdes |
| **Pastizal** | Puntos verdes dispersos | `#E0E0E0** | Gris claro + puntos verdes |
| **Cultivo agrícola** | Patrón de cuadricula | `#FFF3E0** | Base clara + cuadros verdes |

---

## 6. Simbología Cruzada al Proyecto SNC v3

### Colores Implementados en `js/module8.functions.mjs`

| Categoría | Color RGB | Elemento ISO Correspondiente |
|-----------|-----------|------------------------------|
| **Residencial alta** | `[255, 0, 0]` | Ríos permanentes / Zonas urbanas |
| **Residencial media** | `[255, 165, 0]` | Calles secundarias / Vías secundarias |
| **Residencial baja** | `[255, 255, 0]` | Huertas / Suelos agrícolas |
| **Comercial** | `[128, 0, 128]` | Equipamientos centrales / Zonas cívicas |
| **Industrial inocua** | `[0, 128, 0]` | Áreas industriales / Zonas productivas |
| **Referencia topográfica** | `[0, 128, 255]` | Límites administrativos / Límites de zona |
| **Espacios públicos** | `[255, 0, 255]` | Parques / Áreas recreativas |
| **ESRI Green** | `[0, 153, 0]` | Áreas verdes no clasificadas |

### Mapeo Completo (Municipal ↔ ISO ↔ SNC v3)

| Elemento Municipal | Código | ISO Color | SNC v3 Color | Módulo |
|--------------------|--------|-----------|---------------|--------|
| Vivienda unifamiliar | VU | `#E3F2FD**` | `[255,0,0]` | 7 |
| Vivienda adosada | VA | `#BBDEFB**` | `[255,165,0]` | 8 |
| Edif. multifamiliares | EM | `#90CAF9**` | `[255,255,0]` | 9 |
| Comercial y servicios | CS | `#CE93D8**` | `[128,0,128]` | 7-10 |
| Industria inocua | II | `#A5D6A7**` | `[0,128,0]` | 7 |
| Espacios públicos abiertos | EPA | `#F1s` | `[255,0,255]` | 9 |
| Recreación y turismo | RT | `#FFCCE0**` | `[255,192,203]` | 7 |
| Infraestructura verde-azul | IVA | `#A7D30C**` | `[0,128,128]` | 10 |

---

## 7. Implementación Técnica en js/

### Colores ya Definidos (sin modificar)

```javascript
// js/module8.functions.mjs - definirSimboloMojón()
principal:  { color: [255, 0, 0], lineWidth: 2.0, ... },    // Rojo - urbano principal
secundario: { color: [255, 165, 0], lineWidth: 1.5, ... }, // Naranja - secundario
auxiliar:   { color: [255, 255, 0], lineWidth: 1.0, ... }, // Amarillo - terciario
referencia: { color: [0, 128, 255], lineWidth: 1.0, ... }, // Azul - referencia
```

### Próximas Incorporaciones Recomendadas

1. **Añadir a `js/validator.js`**: Validación de tipos de suelo por colores ISO
2. **Añadir a `js/export.js`**: Leyenda completa con símbolos ISO en PDF/A export
3. **Añadir a `js/utils.js`**: Conversión de códigos municipales a colores RGB
4. **Actualizar `docs/SIMBOLOGIA_MAPA.md`**: Esta sección completada

---

## 8. Referencias Normativas

- **ISO 10303-238** - CityGML (modelos de ciudades)
- **ISO 19115** - Metadatos de datos geográficos
- **ISO 19139** - Codificación de metadatos geograficos
- **Resolución SNC 551/2023** - Requerimientos catastrales Paraguayos
- **Código de uso y ocupación** - Municipal (San Lorenzo POUT 2023)

### Leyenda de Colores para Mapa Final

Cuando se genere el mapa cattral final (PDF/A), la leyenda debe incluir:

```
LEYENDA DEL MAPA CATTRAL - SNC 551/2023

■ Rojo         : Zonas residenciales (VU/VA)
■ Naranja      : Densidades residenciales (EM)
■ Verde        : Zonas industriales/agricolas
■ Azul         : Equipamientos públicos / Espacios verdes
■ Morado       : Zonas comerciales e instituciones
■ Cyan         : Límites administrativos / RÍOS
■ Amarillo     : Suelos agrícolas / Huertas
■ Rosa         : Equipamientos deportivos/culturales
```

---

## Próximos Pasos en el Proyecto

1. **Actualizar `docs/SIMBOLOGIA_MAPA.md`** con esta estructura ISO completada ✓ (hecho)
2. **Integrar colores RGB** en `js/validator.js` para reconocimiento automático
3. **Actualizar `js/export.js`** para incluir leyenda ISO en exportaciones PDF/A
4. **Mapear códigos municipales** a propiedades GeoJSON de las parcela
5. **Probar con datos reales**: Validar que los colores se rendericen correctamente

---
*Este documento integra el código de uso y ocupación municipal (San Lorenzo POUT 2023) con estándares ISO de cartografía, proporcionando una base técnica para la simbología del proyecto SNC v3 Resolución 551/2023.*