# Geoportal Municipal Multifinalitario — Vistas Diferenciadas por Perfil
## SNC v3 (Catastro PY / Ley 3966/10 / Ley 5513/15 / Res. SNC 551/2023)

El Catastro Municipal deja de ser una oficina técnica aislada de archivo y se convierte en el **motor estratégico y financiero del municipio**. La plataforma se organiza bajo el paradigma de **Geoportal Multifinalitario con Vistas Diferenciadas por Perfil (RBAC)**, adaptando la complejidad analítica y visual al rol específico de cada actor.

---

## 1. Arquitectura General de Roles y Vistas

```
                              ┌──────────────────────────────────────────────┐
                              │        GEOPORTAL MUNICIPAL UNIFICADO         │
                              └──────────────────────┬───────────────────────┘
                                                     │
                 ┌───────────────────────────────────┼──────────────────────────────────┐
                 │                                   │                                  │
                 ▼                                   ▼                                  ▼
   ┌───────────────────────────┐       ┌───────────────────────────┐      ┌───────────────────────────┐
   │      VISTA CIUDADANA      │       │     VISTA DEL CONCEJAL    │      │    VISTA DEL INTENDENTE   │
   │   (Pública / Vecinal)     │       │     (Legislativa / Urb)   │      │   (Dashboard Ejecutivo)   │
   ├───────────────────────────┤       ├───────────────────────────┤      ├───────────────────────────┤
   │ - Búsqueda por CCC/Padrón │       │ - Auditoría de loteos 7%  │      │ - Semáforo de morosidad   │
   │ - Ficha parcelaria + QR   │       │ - Franjas hídricas MADES  │      │ - Mejoras no declaradas   │
   │ - Estado de cuenta tribut.│       │ - Inventario bienes pub.  │      │ - Avance de obras viales  │
   │ - Usos de suelo permitidos│       │ - Comparativa de ortofotos│      │ - Eficiencia de trámites  │
   │ - Denuncias georref.      │       │ - Simulador impacto tasas │      │ - Reporte ejecutivo 1-clic│
   └───────────────────────────┘       └───────────────────────────┘      └───────────────────────────┘
```

---

## 2. Especificación Detallada por Perfil

### Módulo G-01 · Vista Ciudadana: Transparencia, Servicios y Autogestión

Diseñada para el vecino y contribuyente. Prioriza simplicidad, rapidez y autoservicio para reducir la congestión en las ventanillas municipales.

#### A. Funcionalidades e Información
1. **Buscador Universal Omnicanal:**
   * Búsqueda por Cuenta Corriente Catastral (`Zona-Manzana-Lote`), Padrón rural, dirección física o nombre de calle.
2. **Ficha Parcelaria Pública Oficial:**
   * Superficie oficial de terreno, linderos, dimensiones de frente y fondo.
   * Tipo de calzada frente al lote (asfalto, empedrado, enripiado, tierra).
   * Días y horarios de recolección de residuos sólidos urbanos.
   * Código QR criptográfico descargable con verificación de empadronamiento oficial.
3. **Consulta de Estado Tributario:**
   * Acceso protegido por Cédula de Identidad o RUC del titular.
   * Visualización del Impuesto Inmobiliario y tasas especiales devengadas.
   * Emisión de boleta digital de pago e integración con pasarela de cobro en línea.
4. **Zonificación y Usos de Suelo Permitidos:**
   * Consulta interactiva al hacer clic sobre cualquier parcela: uso permitido (Residencial, Comercial Mixto, Industrial, Reserva).
   * Parámetros urbanísticos: factor de ocupación de suelo (FOS), factor de edificación (FOT) y altura máxima de edificación.
5. **Infraestructura y Equipamiento Comunitario:**
   * Capas de plazas, comisarías, centros de salud, escuelas y paradas de transporte público.
   * Cálculo de radio de caminabilidad e isócronas peatonales a pie (5 y 10 minutos).
6. **Denuncias Territoriales Georreferenciadas:**
   * Formulario vecinal para reportar baldíos con malezas, microbasurales, baches o pérdidas de agua con punto en el mapa y foto adjunta.

#### B. Directrices de UI/UX
* **Estilo:** Minimalista, alto contraste, carga ultrarrápida, 100% responsivo para smartphones.
* **Layout:** Buscador flotante superior, mapa a pantalla completa, panel lateral retráctil (*Drawer*) derecho para la ficha sin bloquear la cartografía.

---

### Módulo G-02 · Vista del Concejal: Planificación, Ordenanzas y Control Territorial

Diseñada para los miembros de la Junta Municipal y comisiones de Obras y Legislación. Brinda sustento técnico y legal para el tratamiento de ordenanzas y loteamientos.

#### A. Funcionalidades e Información
1. **Auditoría de Loteamientos y Fraccionamientos (Ley 3966/10):**
   * Visualización superpuesta del polígono matriz y lotes proyectados.
   * Verificación automática de la **cesión obligatoria del 7% para espacios verdes y plazas**.
   * Identificación topográfica de terrenos cedidos para evitar aceptación de barrancas o anegadizos.
2. **Mapa de Calor de Expansión Urbana y Servicios:**
   * Crecimiento urbano no consolidado vs. suelo urbanizado.
   * Cobertura real de redes de agua potable, desagüe cloacal y tendido eléctrico de la ANDE.
3. **Cruce de Restricciones Ambientales (MADES / Ley 3239/07):**
   * Franjas de amortiguamiento y protección de recursos hídricos (retiros de arroyos, ríos y nacientes).
   * Cotas de inundabilidad histórica y humedales protegidos para vetar autorizaciones riesgosas.
4. **Inventario de Bienes de Dominio Público Municipal:**
   * Catálogo georreferenciado de plazas, calles desafectadas, inmuebles fiscales arrendados y baldíos municipales para control patrimonial y prevención de invasiones.
5. **Simulador de Impacto Normativo y Tributario:**
   * Modelado territorial del impacto de cambios en ordenanzas tributarias o cobro de contribuciones especiales por mejoras viales por distrito/barrio.
6. **Panel Comparativo Histórico (*Split View*):**
   * Cortina deslizante para comparar ortofotos/satélites de años anteriores vs. actual para verificar desmontes o avance clandestino sobre calles.

#### B. Directrices de UI/UX
* **Herramientas:** Selector temático de capas (*Medio Ambiente*, *Planeamiento*, *Patrimonio*).
* **Filtros territoriales:** Segmentación por compañía, barrio o distrito electoral con métricas automáticas.

---

### Módulo G-03 · Vista del Intendente (Dashboard Ejecutivo / War Room)

Diseñada para la máxima autoridad municipal y el gabinete de recaudación y obras. Traduce el catastro en recaudación fiscal, seguimiento físico de obras y control político.

#### A. Funcionalidades e Información
1. **KPIs Financieros y Potencial Fiscal (Ley 5513/15):**
   * Eficacia del Impuesto Inmobiliario: recaudación real vs. presupuesto emitido.
   * **Semáforo Territorial de Morosidad:**
     * 🟢 Verde: Al día.
     * 🟡 Amarillo: Atraso $\le 1$ año.
     * 🔴 Rojo: Morosidad crítica $> 2$ años.
     * Focalización de cuadrillas de notificación y cobranza coactiva.
2. **Detección Automática de Mejoras No Declaradas:**
   * Cruce de ortofotos/drones con la base catastral: detección de parcelas registradas como baldíos que poseen edificaciones clandestinas.
   * Cálculo en tiempo real de la evasión tributaria estimada por metro cuadrado construido.
3. **Seguimiento Físico y Financiero de Obras Públicas:**
   * Trazabilidad de obras viales (empedrados, asfaltados, desagües pluviales): % de avance físico con registro fotográfico del inspector municipal.
   * Monitoreo del recupero frentista de la Contribución por Mejoras.
4. **Mesa de Entrada y Tiempos de Resolución:**
   * Cuellos de botella en la tramitación de expedientes catastrales y de obras particulares.
   * Detección de expedientes con mora injustificada por dependencia revisora.
5. **Alertas Territoriales Críticas:**
   * Detección temprana de loteamientos clandestinos en apertura de calles sin aprobación de la Junta Municipal.
   * Alertas de intervención en áreas ambientales protegidas.
6. **Reporte Ejecutivo de Gabinete en 1 Clic:**
   * Generación de PDF ejecutivo con gráficos consolidados y mapas temáticos para reuniones de gabinete o presentaciones ante la Junta Municipal.

---

## 3. Matriz Comparativa de Interfaces

| Componente | Vista Ciudadana | Vista Concejal | Vista Intendente |
| :--- | :--- | :--- | :--- |
| **Audiencia** | Vecinos, contribuyentes, escribanos. | Concejales, asesores jurídicos, comisión de obras. | Intendente, directores de finanzas y obras. |
| **Buscador Principal** | C.C.C., calle, barrio, nombre común. | N° de Expediente, Padrón, Loteador, Fracción. | Filtros ejecutivos: morosidad, montos, metas de cobro. |
| **Capas Críticas** | Callejero, servicios, zonificación barrial. | Ley 3966 (7% verde), franjas MADES, patrimonio público. | Mapa semafórico de deuda, obras activas, mejoras clandestinas. |
| **Acciones Principales** | Pagar impuesto, descargar ficha QR, denunciar. | Dictamen técnico de loteos, auditar calles y plazas. | Despacho de obras, intimaciones fiscales, reporte de gestión. |
| **Salida Documental** | Ficha catastral y boleta con código QR. | Dictamen preliminar con plano normativo. | Informe gerencial consolidado en PDF de 1 página. |

---

## 4. Requerimientos de Backend y Datos

1. **Control de Acceso Basado en Roles (RBAC):**
   * `rol:ciudadano` (acceso anónimo / público a datos abiertos).
   * `rol:concejal` (lectura analítica y capas regulatorias).
   * `rol:intendente` (acceso a recaudación, deuda nominal y métricas de gabinete).
2. **Servicio de Datos Espaciales:**
   * La vista ciudadana y del concejal consumen **MVT (Mapbox Vector Tiles)** servidas por el motor espacial Martin sobre PostgreSQL/PostGIS.
   * Los KPIs del intendente se calculan mediante vistas materializadas en PostGIS actualizadas periódicamente para no sobrecargar el servidor operacional.
3. **Seguridad y Privacidad de Datos:**
   * La vista ciudadana no expone datos personales de terceros ni montos de deuda ajena (cumplimiento de privacidad).
   * Solo el titular autenticado con su Cédula/RUC puede consultar su estado de cuenta individual.
