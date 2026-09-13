import os

html_dir = 'Materiales_HTML'
if not os.path.exists(html_dir):
    os.makedirs(html_dir)

clases = [
    {
        "id": 1,
        "titulo": "Unidad I y V: Introducción y Hardware/Software",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>Unidad I: Introducción a los Sistemas de Información Computarizados
A continuación se presenta una estructura pedagógica completa para la Unidad I de un curso sobre Sistemas de Información Computarizados, organizada según los temas solicitados. Esta unidad está diseñada para estudiantes de nivel medio o técnico, con enfoque conceptual y práctico.</p>
<ol>
<li>Definiciones y conceptos
Sistema de Información (SI): Conjunto de componentes interrelacionados que recolectan, procesan, almacenan y distribuyen información para apoyar la toma de decisiones, coordinación, control, análisis y visualización en una organización.</li>
</ol>
<p>Sistema de Información Computarizado: Tipo de SI que utiliza tecnología informática (hardware, software, redes y bases de datos) para procesar y almacenar información de manera eficiente.</p>
<p>Tecnología de la Información (TI): Herramientas y recursos tecnológicos (computadoras, servidores, redes, software) que permiten el tratamiento automatizado de la información.</p>
<ol>
<li>Clasificación de los sistemas de información
Los sistemas de información se clasifican principalmente en dos grandes grupos:</li>
</ol>
<p>A. Sistemas de Apoyo a las Operaciones
Sistemas de procesamiento de transacciones (TPS): Registran y procesan las transacciones diarias de la organización.</p>
<p>Sistemas de control de procesos: Monitorean y controlan procesos físicos o industriales.</p>
<p>Sistemas de colaboración empresarial: Facilitan la comunicación y trabajo en equipo.</p>
<p>B. Sistemas de Apoyo Administrativo y Gerencial
Sistemas de Información Gerencial (MIS): Generan informes para la gestión operativa y táctica.</p>
<p>Sistemas de Apoyo a la Toma de Decisiones (DSS): Ayudan en decisiones semiestructuradas.</p>
<p>Sistemas de Información Ejecutiva (EIS): Proporcionan información estratégica a altos directivos.</p>
<ol>
<li>Tipos y usos de los sistemas de información
Tipo de sistema Uso principal
TPS Registro de ventas, compras, nóminas
MIS Informes de gestión, control presupuestario
DSS Análisis de escenarios, simulaciones
EIS Tableros de control ejecutivo
Sistemas expertos   Asistencia en diagnóstico y recomendaciones</li>
<li>Las tecnologías de la información y la sociedad
Las TI han transformado la forma en que las organizaciones operan y las personas se comunican.</li>
</ol>
<p>Impactos positivos: acceso a información, automatización, eficiencia, conectividad global.</p>
<p>Desafíos: brecha digital, privacidad, seguridad, dependencia tecnológica.</p>
<ol>
<li>Desarrollo de los sistemas de información
El desarrollo de SI implica un proceso estructurado que incluye:</li>
</ol>
<p>Identificación de necesidades</p>
<p>Análisis de requerimientos</p>
<p>Diseño del sistema</p>
<p>Implementación y pruebas</p>
<p>Puesta en producción y mantenimiento</p>
<ol>
<li>Ciclo de vida de los sistemas de información
El ciclo de vida típico incluye las siguientes fases:</li>
</ol>
<p>Planificación: Definición de objetivos, alcance y recursos.</p>
<p>Análisis: Estudio de requerimientos y procesos actuales.</p>
<p>Diseño: Especificación técnica y lógica del sistema.</p>
<p>Implementación: Desarrollo, configuración o adquisición del sistema.</p>
<p>Pruebas: Verificación y validación del funcionamiento.</p>
<p>Instalación/Despliegue: Puesta en marcha en el entorno productivo.</p>
<p>Uso y mantenimiento: Operación continua, corrección y mejora.</p>
<ol>
<li>Variables determinantes en el proceso de desarrollo
Calidad: Cumplimiento de especificaciones y estándares.</li>
</ol>
<p>Recursos: Disponibilidad de personal, presupuesto y tiempo.</p>
<p>Complejidad: Tamaño y dificultad técnica del sistema.</p>
<p>Riesgos: Incertidumbre tecnológica, organizacional o de mercado.</p>
<ol>
<li>Métodos alternos para la adquisición de sistemas
A. Método tradicional
Desarrollo interno por personal de la organización.</li>
</ol>
<p>Control total sobre el proceso y personalización.</p>
<p>Mayor tiempo y costo inicial.</p>
<p>B. Compra de paquetes
Adquisición de software comercial (ej. ERP, CRM).</p>
<p>Rápida implementación, menor costo inicial.</p>
<p>Posible necesidad de adaptación o configuración.</p>
<p>C. Outsourcing
Contratación de terceros para desarrollo o mantenimiento.</p>
<p>Acceso a expertise externo.</p>
<p>Riesgos de dependencia y pérdida de control.</p>
<p>D. Desarrollo por parte del usuario final
Los usuarios crean sus propias aplicaciones (ej. macros, hojas de cálculo).</p>
<p>Rápido y adaptado a necesidades específicas.</p>
<p>Riesgos de falta de estándares y documentación.</p>
<ol>
<li>Aseguramiento de la calidad total (TQM)
Enfoque sistemático para garantizar que el sistema cumpla con los requerimientos y estándares de calidad.</li>
</ol>
<p>Incluye revisiones, pruebas, auditorías y mejora continua.</p>
<p>Normas aplicables: ISO 9001, ISO/IEC 25000.</p>
<ol>
<li>Técnicas de diseño y documentación
Diagramas de flujo de datos (DFD): Representación gráfica del flujo de información entre procesos, entidades y almacenes de datos.</li>
</ol>
<p>Diagramas entidad-relación (ER): Modelado de bases de datos.</p>
<p>Documentación técnica: Manuales de usuario, especificaciones, diccionarios de datos.</p>
<p>Elementos de un DFD:
Entidades externas: Fuentes o destinos de datos (rectángulo).</p>
<p>Procesos: Transformaciones de datos (círculo o rectángulo redondeado).</p>
<p>Flujos de datos: Movimiento de información (flechas).</p>
<p>Almacenes de datos: Repositorios de información (líneas paralelas o rectángulo abierto).</p>
<ol>
<li>Pruebas del sistema
Pruebas unitarias: Verificación de componentes individuales.</li>
</ol>
<p>Pruebas de integración: Validación de la interacción entre módulos.</p>
<p>Pruebas de sistema: Evaluación del sistema completo.</p>
<p>Pruebas de aceptación: Confirmación por parte del usuario final.</p>
<ol>
<li>Mantenimiento
Tipos de mantenimiento:</li>
</ol>
<p>Correctivo: Corrección de errores detectados.</p>
<p>Preventivo: Mejoras para evitar fallos futuros.</p>
<p>Adaptativo: Ajustes por cambios en el entorno.</p>
<p>Perfectivo: Optimización de rendimiento o funcionalidad.</p>
<ol>
<li>Ingeniería de software asistida por computadora (CASE)
Uso de herramientas software para apoyar las actividades del ciclo de vida del desarrollo.</li>
</ol>
<p>Incluye: modelado, generación de código, pruebas, documentación.</p>
<p>Beneficios: mayor productividad, consistencia, reutilización.</p></div><div class="mb-5"><p>Unidad V: Tecnologías de la Información. Hardware y Software
Esta unidad introduce los fundamentos de las tecnologías de información, abordando los conceptos básicos de hardware (la parte física) y software (la parte lógica) de los sistemas computacionales.</p>
<ol>
<li>La computadora: definición, componentes básicos y clasificación
Definición de computadora
Una computadora (también llamada ordenador o computador) es una máquina electrónica capaz de recibir, procesar y almacenar datos, así como de ejecutar instrucciones programadas para realizar tareas específicas de manera automática y rápida.</li>
</ol>
<p>Características fundamentales:
Electrónica: Utiliza circuitos y componentes electrónicos para operar</p>
<p>Programable: Puede ejecutar diferentes conjuntos de instrucciones</p>
<p>Automática: Realiza procesos sin intervención humana constante</p>
<p>Versátil: Puede realizar múltiples tipos de tareas</p>
<p>Rápida: Procesa información a velocidades muy altas</p>
<p>Componentes básicos de una computadora
Los componentes de una computadora se dividen en dos grandes categorías: hardware (parte física) y software (parte lógica).</p>
<p>A. Hardware básico
El hardware básico incluye todos aquellos elementos indispensables para el correcto funcionamiento del equipo. Sin ellos, la computadora no puede operar.</p>
<p>Componentes principales del hardware:
Componente  Función Descripción
Unidad Central de Procesamiento (CPU)   Procesamiento de instrucciones  Es el "cerebro" del sistema. Ejecuta las instrucciones del software y realiza cálculos 
Memoria RAM Almacenamiento temporal Guarda datos temporalmente mientras el sistema está en uso. Se borra al apagar el equipo 
Memoria ROM Almacenamiento permanente básico    Contiene instrucciones esenciales para el arranque del sistema 
Placa madre (Motherboard)   Conexión de componentes Placa base que conecta todos los componentes entre sí 
Dispositivos de entrada Captura de datos    Teclado, ratón, escáner, micrófono, cámara 
Dispositivos de salida  Presentación de resultados  Monitor, impresora, altavoces, proyectores 
Dispositivos de almacenamiento  Guardado permanente Disco duro (HDD), disco sólido (SSD), unidades ópticas 
Fuente de alimentación  Suministro de energía   Convierte la corriente eléctrica en la energía que necesita el sistema 
Arquitectura básica de una computadora:
text
┌─────────────────────────────────────────────────────┐
│                    COMPUTADORA                       │
│  ┌───────────────────────────────────────────────┐  │
│  │              CPU (Procesador)                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │  │
│  │  │Registro │ │   ALU   │ │Unidad de Control│  │  │
│  │  │         │ │(Unidad   │ │   (CU)          │  │  │
│  │  │         │ │Aritmético-│ │                 │  │  │
│  │  │         │ │Lógica)   │ │                 │  │  │
│  │  └─────────┘ └─────────┘ └─────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│           ↕              ↕              ↕          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Memoria    │ │ Dispositivos│ │ Dispositivos│   │
│  │  Principal  │ │  de Entrada │ │  de Salida  │   │
│  │  (RAM)      │ │             │ │             │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│           ↕                                        │
│  ┌─────────────┐                                   │
│  │  Memoria    │                                   │
│  │  Secundaria │                                   │
│  │  (Disco)    │                                   │
│  └─────────────┘                                   │
└─────────────────────────────────────────────────────┘
B. Hardware complementario
El hardware complementario incluye dispositivos que realizan funciones específicas más allá de las básicas, no estrictamente necesarias para el funcionamiento mínimo de la computadora.</p>
<p>Ejemplos:</p>
<p>Tarjetas de red</p>
<p>Tarjetas de sonido</p>
<p>Tarjetas gráficas dedicadas</p>
<p>Unidades de backup</p>
<p>Scanners</p>
<p>Cámaras web</p>
<p>Joysticks y gamepads</p>
<p>Clasificación de las computadoras
Las computadoras pueden clasificarse según diferentes criterios:</p>
<p>A. Por tamaño y capacidad de procesamiento:
Tipo    Características Uso típico
Supercomputadoras   Máxima capacidad de procesamiento, costo muy elevado    Investigación científica, simulaciones complejas, clima
Mainframes  Gran capacidad, soportan múltiples usuarios simultáneos Grandes empresas, bancos, instituciones gubernamentales
Minicomputadoras    Capacidad intermedia, múltiples usuarios    Empresas medianas, universidades
Microcomputadoras   Tamaño reducido, un usuario a la vez    Uso personal, oficinas, hogares
B. Por tipo de uso:
Tipo    Descripción Ejemplos
Computadoras personales (PC)    Para uso individual Desktop, laptop
Servidores  Proveen servicios a otras computadoras  Servidores web, de archivos, de bases de datos
Dispositivos móviles    Portátiles, con batería Smartphones, tablets
Computadoras embebidas  Integradas en otros dispositivos    Electrodomésticos, automóviles, sistemas industriales
C. Por arquitectura:
Analógicas: Trabajan con señales continuas (poco comunes actualmente)</p>
<p>Digitales: Trabajan con valores discretos (binarios: 0 y 1)</p>
<p>Híbridas: Combinan características de ambas</p>
<ol>
<li>Concepto de software
Definición
El software (también llamado logicial, soporte lógico o programática) es el conjunto de programas, instrucciones, reglas, documentación y datos asociados que forman parte de las operaciones de un sistema de computación.</li>
</ol>
<p>Definiciones clave:
"Conjunto de los componentes lógicos necesarios que hace posible la realización de tareas específicas, en contraposición a los componentes físicos que son llamados hardware."</p>
<p>"El conjunto de programas, instrucciones y reglas informáticas para ejecutar ciertas tareas en una computadora." (Real Academia Española)</p>
<p>"Todo componente intangible (y no físico) que forma parte de dispositivos, como computadoras, teléfonos móviles o tabletas y que permite su funcionamiento."</p>
<p>Características del software:
Intangible: No tiene forma física, es lógico</p>
<p>Instruccional: Consiste en instrucciones que el hardware ejecuta</p>
<p>Funcional: Permite realizar tareas específicas</p>
<p>Dependiente del hardware: Necesita hardware para ejecutarse</p>
<p>Modificable: Puede actualizarse y mejorarse</p>
<p>Requerido: Sin software, el hardware es inútil</p>
<p>Relación entre hardware y software:
Aspecto Hardware    Software
Naturaleza  Físico, tangible    Lógico, intangible 
Componentes Circuitos, chips, dispositivos  Programas, instrucciones, datos 
Durabilidad Se desgasta con el tiempo   No se desgasta, pero puede volverse obsoleto
Modificación    Requiere reemplazo físico   Puede actualizarse fácilmente
Función Ejecuta instrucciones   Proporciona instrucciones 
Dependencia No funciona sin software    No funciona sin hardware 
Tipos de software
El software se clasifica en tres categorías principales:</p>
<ol>
<li>Software de sistema
Es el software más esencial, que actúa como intermediario principal entre el usuario y el hardware. Su objetivo es vincular adecuadamente al usuario con el sistema informático, aislándolo de los detalles internos del hardware.</li>
</ol>
<p>Funciones principales:</p>
<p>Gestionar los recursos del hardware</p>
<p>Proveer una interfaz para el usuario</p>
<p>Dar soporte a otros programas</p>
<p>Controlar dispositivos y periféricos</p>
<p>Ejemplos:</p>
<p>Tipo    Descripción Ejemplos concretos
Sistemas operativos Gestionan todos los recursos del sistema    Windows, macOS, Linux, Android, iOS
Controladores de dispositivos (Drivers) Permiten la comunicación con hardware específico    Driver de impresora, driver de tarjeta gráfica
Utilitarios del sistema Herramientas de mantenimiento y optimización    Antivirus, desfragmentadores, limpiadores de disco
Herramientas de diagnóstico Verifican el estado del sistema Herramientas de monitoreo, test de memoria
2. Software de programación
Es el conjunto de herramientas que permiten al programador desarrollar programas informáticos, usando diferentes alternativas y lenguajes de programación, de una manera práctica.</p>
<p>Funciones principales:</p>
<p>Crear nuevos programas y aplicaciones</p>
<p>Modificar software existente</p>
<p>Depurar y probar código</p>
<p>Traducir código a lenguaje máquina</p>
<p>Ejemplos:</p>
<p>Herramienta Función Ejemplos
Editores de código  Escribir y editar programas Visual Studio Code, Sublime Text, Notepad++
Compiladores    Traducir código a lenguaje máquina  GCC, Clang, javac
Intérpretes Ejecutar código línea por línea Python, Ruby, JavaScript
Depuradores (Debuggers) Detectar y corregir errores GDB, Visual Studio Debugger
Entornos de desarrollo (IDE)    Suite completa de herramientas  Visual Studio, Eclipse, IntelliJ IDEA
Enlazadores (Linkers)   Unir módulos de código  Linker de C++, ld
3. Software de aplicación
Son programas diseñados para realizar una o más tareas específicas, aprovechando las capacidades del sistema informático para desempeñar cualquier tipo de tareas ajenas a su mantenimiento y funcionamiento básico.</p>
<p>Características:</p>
<p>Orientados al usuario final</p>
<p>Realizan tareas específicas y concretas</p>
<p>Se ejecutan sobre el software de sistema</p>
<p>Pueden ser automáticos o asistidos</p>
<p>Ejemplos por categoría:</p>
<p>Categoría   Función Ejemplos
Ofimática   Tareas de oficina y productividad   Microsoft Office, Google Workspace, LibreOffice
Navegación web  Acceder a internet  Chrome, Firefox, Safari, Edge
Multimedia  Reproducir y editar audio/video VLC, Windows Media Player, Adobe Premiere
Comunicación    Mensajería y videoconferencia   WhatsApp, Zoom, Skype, Slack
Educación   Aprendizaje y enseñanza Plataformas LMS, software educativo
Negocios    Gestión empresarial ERP, CRM, software contable
Diseño  Creación gráfica y modelado Adobe Photoshop, AutoCAD, CorelDRAW
Videojuegos Entretenimiento interactivo Juegos de PC, consolas, móviles
Seguridad   Protección del sistema  Antivirus, firewalls, antimalware
Clasificación adicional del software
Por modelo de licencia:
Tipo    Características Ejemplos
Software propietario    Licencia restringida, código cerrado    Windows, Microsoft Office, Adobe Photoshop
Software libre (Open Source)    Código abierto, modificable Linux, LibreOffice, GIMP
Freeware    Gratuito pero no necesariamente abierto Skype, Adobe Reader
Shareware   Versión de prueba gratuita  Antivirus, utilitarios
SaaS (Software as a Service)    Software en la nube, por suscripción    Google Workspace, Salesforce, Office 365
Por plataforma:
Software de escritorio: Se instala en computadoras personales</p>
<p>Software web: Se ejecuta en navegadores</p>
<p>Software móvil: Para smartphones y tablets</p>
<p>Software embebido: Integrado en dispositivos específicos</p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 2,
        "titulo": "Unidad II: Estrategia de Negocios a través de TI",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><h2>Unidad II: La Estrategia de Negocios a Través de Tecnologías de Información</h2>
<p>Esta unidad explora cómo las organizaciones utilizan los sistemas de información y las tecnologías de información (TI) para formular e implementar estrategias competitivas que les permitan obtener ventajas sostenibles en el mercado. <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></p>
<hr />
<h2>1. La estrategia en los negocios</h2>
<ul>
<li><strong>Estrategia empresarial:</strong> Conjunto de decisiones y acciones planificadas para alcanzar los objetivos organizacionales a largo plazo en un entorno competitivo. <a href="https://www.gestiopolis.com/sistemas-de-informacion-estrategica-para-la-competitividad/">gestiopolis</a></li>
<li><strong>Estrategia competitiva:</strong> Define cómo la empresa competirá, qué objetivos perseguirá y qué políticas aplicará para lograrlos. <a href="https://www.gestiopolis.com/sistemas-de-informacion-estrategica-para-la-competitividad/">gestiopolis</a></li>
<li>Las TI se han convertido en un componente central de la estrategia moderna, permitiendo innovación, eficiencia y diferenciación. <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ul>
<hr />
<h2>2. Ventajas competitivas y los sistemas de información</h2>
<p>Una <strong>ventaja competitiva</strong> es una diferenciación positiva respecto a la competencia, percibida por el cliente y perdurable en el tiempo. <a href="https://repositorio.uchile.cl/bitstream/handle/2250/108259/olate_m.pdf?sequence=3">repositorio.uchile</a></p>
<h3>Cómo los SI generan ventajas competitivas:</h3>
<ul>
<li><strong>Reducción de costos:</strong> Automatización de procesos, optimización de recursos.</li>
<li><strong>Diferenciación:</strong> Productos o servicios únicos habilitados por tecnología.</li>
<li><strong>Enfoque:</strong> Segmentación de mercado mediante datos y análisis.</li>
<li><strong>Innovación:</strong> Nuevos productos, servicios o modelos de negocio. <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ul>
<h3>Objetivos estratégicos de los SI:</h3>
<ol>
<li>Excelencia operativa</li>
<li>Nuevos productos, servicios y modelos de negocio</li>
<li>Relaciones estrechas con clientes y proveedores</li>
<li>Mejora en la toma de decisiones</li>
<li>Ventaja competitiva</li>
<li>Supervivencia en el mercado <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ol>
<hr />
<h2>3. Impulsos estratégicos</h2>
<p>Los <strong>impulsos estratégicos</strong> son acciones o iniciativas que permiten a la organización aprovechar las TI para transformar su posición competitiva:</p>
<ul>
<li><strong>Automatización de procesos críticos</strong></li>
<li><strong>Integración de cadenas de suministro</strong></li>
<li><strong>Desarrollo de canales digitales de venta</strong></li>
<li><strong>Implementación de sistemas de inteligencia de negocios</strong></li>
<li><strong>Adopción de tecnologías emergentes (cloud, IA, IoT)</strong> <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ul>
<hr />
<h2>4. Fuerzas de la industria (Modelo de las 5 Fuerzas de Porter)</h2>
<p>El modelo de Michael Porter analiza cinco fuerzas competitivas que determinan la rentabilidad y el atractivo de una industria: <a href="https://asana.com/es/resources/porters-five-forces">asana</a></p>
<h3>Las cinco fuerzas:</h3>
<p>| Fuerza | Descripción | Implicación estratégica |
|--------|-------------|------------------------|
| <strong>1. Rivalidad entre competidores</strong> | Intensidad de la competencia en el sector | Estrategias de diferenciación o reducción de costos |
| <strong>2. Amenaza de nuevos entrantes</strong> | Facilidad con la que nuevas empresas pueden ingresar | Barreras de entrada (tecnología, capital, regulación) |
| <strong>3. Amenaza de productos sustitutos</strong> | Disponibilidad de alternativas que satisfacen la misma necesidad | Innovación y fidelización de clientes |
| <strong>4. Poder de negociación de los proveedores</strong> | Capacidad de los proveedores para influir en precios y condiciones | Diversificación de proveedores o integración vertical |
| <strong>5. Poder de negociación de los clientes</strong> | Capacidad de los clientes para exigir mejores precios o condiciones | Diferenciación y creación de valor agregado |</p>
<h3>Uso de las TI para contrarrestar las fuerzas de Porter: <a href="https://contabilidad360.wordpress.com/2016/02/17/modelo-de-las-cinco-fuerzas-de-porter-y-la-tecnologia-de-informacion/">contabilidad360.wordpress</a></h3>
<p>| Fuerza | Uso potencial de las TI |
|--------|------------------------|
| Rivalidad | Sistemas de análisis competitivo, CRM avanzado |
| Nuevos entrantes | Plataformas digitales con altos costos de migración |
| Sustitutos | Sistemas de recomendación, personalización masiva |
| Proveedores | Sistemas de gestión de cadena de suministro (SCM) |
| Clientes | Portales de autoservicio, programas de fidelización digital |</p>
<hr />
<h2>5. Los sistemas de información estratégicos en la organización</h2>
<p>Un <strong>Sistema de Información Estratégico (SIE)</strong> es aquel que modifica significativamente la manera de dirigir un negocio para generar ventaja estratégica. <a href="https://repositorio.uchile.cl/bitstream/handle/2250/108259/olate_m.pdf?sequence=3">repositorio.uchile</a></p>
<h3>Características de los SIE:</h3>
<ul>
<li>Alineados con la estrategia corporativa</li>
<li>Capaces de cambiar objetivos, procesos o relaciones ambientales</li>
<li>Generan ventajas competitivas sostenibles</li>
<li>Suelen ser difíciles de imitar por la competencia <a href="https://repositorio.uchile.cl/bitstream/handle/2250/108259/olate_m.pdf?sequence=3">repositorio.uchile</a></li>
</ul>
<h3>Ejemplos de SIE:</h3>
<ul>
<li><strong>Sistemas CRM (Customer Relationship Management):</strong> Gestión integral de relaciones con clientes.</li>
<li><strong>Sistemas ERP (Enterprise Resource Planning):</strong> Integración de procesos empresariales.</li>
<li><strong>Sistemas de comercio electrónico:</strong> Ventas y servicios en línea.</li>
<li><strong>Sistemas de inteligencia de negocios (BI):</strong> Análisis de datos para decisiones estratégicas.</li>
<li><strong>Plataformas digitales de ecosistema:</strong> Conectan múltiples actores (ej. Uber, Airbnb). <a href="https://www.gestiopolis.com/sistemas-de-informacion-estrategica-para-la-competitividad/">gestiopolis</a></li>
</ul>
<hr />
<h2>6. Implantación de sistemas estratégicos</h2>
<h3>Fases de implantación:</h3>
<ol>
<li><strong>Análisis estratégico:</strong> Identificar oportunidades donde las TI pueden generar ventaja.</li>
<li><strong>Diseño del sistema:</strong> Alinear arquitectura tecnológica con objetivos de negocio.</li>
<li><strong>Desarrollo o adquisición:</strong> Construir o comprar la solución.</li>
<li><strong>Implementación:</strong> Despliegue, capacitación y cambio organizacional.</li>
<li><strong>Evaluación:</strong> Medir impacto en indicadores de desempeño estratégico. <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ol>
<h3>Factores críticos de éxito:</h3>
<ul>
<li>Compromiso de la alta dirección</li>
<li>Alineación entre TI y estrategia de negocio</li>
<li>Gestión del cambio organizacional</li>
<li>Inversión sostenida en tecnología y talento <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ul>
<hr />
<h2>7. Reingeniería de procesos</h2>
<p>La <strong>reingeniería de procesos</strong> es el replanteamiento fundamental y el rediseño radical de los procesos de negocio para lograr mejoras sustanciales en indicadores críticos como costo, calidad, servicio y rapidez. <a href="https://openaccess.uoc.edu/bitstream/10609/63105/1/Direcci%C3%B3n%20estrat%C3%A9gica%20de%20sistemas%20y%20tecnolog%C3%ADas%20de%20la%20informaci%C3%B3n_M%C3%B3dulo%203_Tecnolog%C3%ADas%20de%20la%20informaci%C3%B3n%20y%20procesos%20de%20negocio.pdf">openaccess.uoc</a></p>
<h3>Principios de la reingeniería:</h3>
<ul>
<li><strong>Enfoque en procesos, no en tareas</strong></li>
<li><strong>Eliminación de actividades que no agregan valor</strong></li>
<li><strong>Uso intensivo de tecnología para automatizar y integrar</strong></li>
<li><strong>Rediseño desde cero (no mejora incremental)</strong> <a href="https://openaccess.uoc.edu/bitstream/10609/63105/1/Direcci%C3%B3n%20estrat%C3%A9gica%20de%20sistemas%20y%20tecnolog%C3%ADas%20de%20la%20informaci%C3%B3n_M%C3%B3dulo%203_Tecnolog%C3%ADas%20de%20la%20informaci%C3%B3n%20y%20procesos%20de%20negocio.pdf">openaccess.uoc</a></li>
</ul>
<h3>Papel de las TI en la reingeniería:</h3>
<ul>
<li>Automatización de flujos de trabajo</li>
<li>Integración de sistemas y bases de datos</li>
<li>Habilitación de nuevos canales de atención</li>
<li>Soporte a la toma de decisiones en tiempo real <a href="https://openaccess.uoc.edu/bitstream/10609/63105/1/Direcci%C3%B3n%20estrat%C3%A9gica%20de%20sistemas%20y%20tecnolog%C3%ADas%20de%20la%20informaci%C3%B3n_M%C3%B3dulo%203_Tecnolog%C3%ADas%20de%20la%20informaci%C3%B3n%20y%20procesos%20de%20negocio.pdf">openaccess.uoc</a></li>
</ul>
<hr />
<h2>8. Tecnologías de vanguardia en los negocios</h2>
<p>Las tecnologías emergentes están transformando los modelos de negocio y creando nuevas oportunidades estratégicas:</p>
<h3>Tecnologías clave:</h3>
<ul>
<li><strong>Computación en la nube (Cloud Computing):</strong> Escalabilidad, flexibilidad y reducción de costos de infraestructura.</li>
<li><strong>Inteligencia Artificial (IA) y Machine Learning:</strong> Automatización inteligente, predicción, personalización.</li>
<li><strong>Internet de las Cosas (IoT):</strong> Monitoreo en tiempo real de activos y procesos.</li>
<li><strong>Blockchain:</strong> Trazabilidad, seguridad y transparencia en transacciones.</li>
<li><strong>Big Data y Analytics:</strong> Análisis masivo de datos para insights estratégicos.</li>
<li><strong>Robótica y automatización de procesos (RPA):</strong> Eficiencia operativa en tareas repetitivas.</li>
<li><strong>Realidad aumentada/virtual (AR/VR):</strong> Experiencias inmersivas para clientes y empleados. <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ul>
<h3>Impacto estratégico:</h3>
<ul>
<li>Creación de nuevos modelos de negocio (ej. plataformas digitales, economía colaborativa)</li>
<li>Transformación de la experiencia del cliente</li>
<li>Optimización de operaciones y cadenas de valor</li>
<li>Habilitación de la innovación continua <a href="https://riunet.upv.es/bitstreams/9c5a4bfa-e014-498d-9b12-e9811f2517d2/download">riunet.upv</a></li>
</ul>
<hr />
<h2>Sugerencias didácticas para la unidad</h2>
<ul>
<li><strong>Análisis de caso:</strong> Estudiar cómo una empresa (ej. Amazon, Netflix) utiliza SIE para mantener ventaja competitiva.</li>
<li><strong>Aplicación del modelo de Porter:</strong> Analizar un sector local usando las 5 fuerzas y proponer estrategias habilitadas por TI.</li>
<li><strong>Taller de reingeniería:</strong> Rediseñar un proceso empresarial incorporando tecnologías digitales.</li>
<li><strong>Debate:</strong> ¿Las TI son una ventaja competitiva sostenible o solo un requisito para competir?</li>
<li><strong>Evaluación:</strong> Ensayo sobre el papel de una tecnología emergente en la estrategia de una organización.</li>
</ul>
<hr />
<p>¿Te gustaría que prepare materiales complementarios como presentaciones, guías de trabajo, estudios de caso o evaluaciones para esta unidad?</p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 3,
        "titulo": "Unidad III: Fundamentos de Base de Datos",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>Unidad III: Fundamentos de Administración de Base de Datos
Esta unidad introduce los conceptos fundamentales de la administración de bases de datos, desde los archivos convencionales hasta las tecnologías modernas como data warehouse y bases de datos distribuidas.</p>
<ol>
<li>Archivos convencionales
Los archivos convencionales (o sistemas de archivos tradicionales) son conjuntos de registros almacenados de manera independiente, generalmente organizados por aplicaciones específicas.</li>
</ol>
<p>Características:
Cada aplicación gestiona sus propios archivos</p>
<p>Los datos están dispersos en múltiples archivos</p>
<p>No hay integración centralizada</p>
<p>El acceso es secuencial o indexado según el diseño del archivo</p>
<p>Limitaciones:
Redundancia de datos: La misma información se repite en varios archivos.</p>
<p>Inconsistencia: Dificultad para mantener datos actualizados en todos los archivos.</p>
<p>Dificultad de acceso: Cada aplicación necesita conocer la estructura del archivo.</p>
<p>Falta de seguridad: Control de acceso limitado.</p>
<p>Problemas de integridad: No hay mecanismos automáticos para validar datos.</p>
<ol>
<li>Definición de base de datos
Una base de datos (BD) es un conjunto de datos relacionados y organizados de manera estructurada, almacenados electrónicamente para facilitar su acceso, gestión y actualización.</li>
</ol>
<p>Definiciones clave:
"Conjunto de archivos de contexto similar que están interrelacionados y almacenados para su posterior uso."</p>
<p>"Colección organizada de información estructurada, típicamente almacenada electrónicamente en un sistema informático."</p>
<p>Elementos básicos:
Datos: Información almacenada</p>
<p>Metadatos: Datos sobre los datos (estructura, relaciones, restricciones)</p>
<p>Tablas/registros/campos: Estructura de organización</p>
<p>Relaciones: Conexiones lógicas entre datos</p>
<ol>
<li>Ventajas en el uso de base de datos
Ventaja Descripción
Reducción de redundancia    Los datos se almacenan una sola vez, evitando duplicación 
Consistencia de datos   Actualizaciones centralizadas garantizan coherencia 
Compartición de datos   Múltiples usuarios y aplicaciones acceden a los mismos datos 
Integridad  Mecanismos para validar y mantener la calidad de los datos 
Seguridad   Control de acceso mediante permisos y autenticación 
Acceso concurrente  Varios usuarios pueden trabajar simultáneamente 
Independencia de datos  Separación entre estructura lógica y física 
Recuperación ante fallos    Mecanismos de backup y restauración 
Eficiencia en desarrollo    Reduce tiempo de creación de aplicaciones </li>
<li>El manejo del sistema de base de datos (DBMS)
Un Sistema de Gestión de Bases de Datos (DBMS - Database Management System) es un conjunto de programas que permiten crear, gestionar y acceder a las bases de datos de manera controlada y eficiente.</li>
</ol>
<p>Funciones principales del DBMS:
Definición de datos: Crear y modificar la estructura de la BD (DDL - Data Definition Language)</p>
<p>Manipulación de datos: Insertar, actualizar, eliminar y consultar datos (DML - Data Manipulation Language)</p>
<p>Control de acceso: Gestionar permisos y seguridad de usuarios</p>
<p>Gestión de transacciones: Garantizar propiedades ACID (Atomicidad, Consistencia, Isolación, Durabilidad)</p>
<p>Optimización de consultas: Mejorar el rendimiento del acceso a datos</p>
<p>Respaldo y recuperación: Proteger contra pérdida de datos</p>
<p>Componentes del DBMS:
Lenguaje de definición de datos (DDL)</p>
<p>Lenguaje de manipulación de datos (DML)</p>
<p>Motor de almacenamiento</p>
<p>Gestor de transacciones</p>
<p>Catálogo de metadatos</p>
<p>Ejemplos de DBMS:
Relacionales: MySQL, PostgreSQL, Oracle, SQL Server</p>
<p>No relacionales: MongoDB, Cassandra, Redis</p>
<p>En la nube: Amazon RDS, Google Cloud SQL, Azure SQL Database</p>
<ol>
<li>El administrador de la base de datos (DBA)
El Administrador de Base de Datos (DBA - Database Administrator) es el profesional responsable de administrar, mantener y asegurar el correcto funcionamiento de las bases de datos de una organización.</li>
</ol>
<p>Funciones principales del DBA:
Función Descripción
Diseño e implementación Crear y configurar bases de datos según necesidades empresariales 
Seguridad   Implementar medidas de protección, permisos y autenticación 
Respaldo y recuperación Realizar copias de seguridad y restaurar datos en caso de fallos 
Optimización de rendimiento Ajustar consultas, índices y configuración para mejorar velocidad 
Monitoreo   Supervisar el funcionamiento y detectar problemas 
Mantenimiento   Actualizar software, aplicar patches y upgrades 
Gestión de usuarios Administrar permisos y acceso de diferentes usuarios 
Documentación   Registrar cambios, estructuras y procedimientos 
Recuperación de desastres   Diseñar y ejecutar planes de contingencia 
Integración con aplicaciones    Conectar la BD con sistemas empresariales 
Tipos de DBA:
DBA de sistemas: Enfocado en infraestructura y servidores</p>
<p>DBA de desarrollo: Trabaja en diseño y modelado de datos</p>
<p>DBA de aplicaciones: Especializado en integración con software específico</p>
<p>Arquitecto de bases de datos: Diseña soluciones de almacenamiento a gran escala</p>
<ol>
<li>Tipos de modelos de base de datos
Los modelos de base de datos definen cómo se estructuran, organizan y relacionan los datos dentro del sistema.</li>
</ol>
<p>Modelos tradicionales:
Modelo  Características Uso típico
Jerárquico  Estructura de árbol con relaciones padre-hijo   Sistemas legacy, aplicaciones con estructura fija 
De red  Nodos interconectados mediante apuntadores, permite relaciones muchos-a-muchos  Aplicaciones complejas con múltiples relaciones 
Modelos modernos:
Modelo  Características Uso típico
Relacional  Datos organizados en tablas con filas y columnas, usa SQL   La mayoría de aplicaciones empresariales 
Orientado a objetos Almacena objetos con atributos y métodos    Aplicaciones complejas, sistemas heredados de OOP 
Documental  Datos almacenados como documentos (JSON, XML)   Aplicaciones web, contenido semiestructurado 
Multidimensional    Optimizado para análisis y consultas complejas  Data warehouse, business intelligence 
Deductivo   Usa lógica formal para inferir nueva información    Sistemas expertos, IA 
Transaccional   Optimizado para operaciones de transacción  Sistemas financieros, comercio electrónico 
7. Bases de datos distribuidas
Una base de datos distribuida es un sistema en el que los datos están almacenados en múltiples ubicaciones físicas (servidores, centros de datos, geografías) pero se gestionan como una única base de datos lógica.</p>
<p>Características:
Descentralización: Los datos residen en diferentes nodos o localidades</p>
<p>Transparencia: Los usuarios acceden como si fuera una sola BD</p>
<p>Autonomía: Cada nodo puede operar independientemente</p>
<p>Replicación: Copias de datos en múltiples ubicaciones para disponibilidad</p>
<p>Ventajas:
Disponibilidad: Si un nodo falla, otros pueden continuar operando</p>
<p>Rendimiento: Los datos están más cerca de los usuarios que los necesitan</p>
<p>Escalabilidad: Fácil agregar nuevos nodos</p>
<p>Acceso descentralizado: Diferentes localidades pueden acceder localmente</p>
<p>Desafíos:
Consistencia: Mantener datos sincronizados entre nodos</p>
<p>Complejidad: Mayor dificultad en diseño y administración</p>
<p>Costo: Infraestructura distribuida más costosa</p>
<p>Seguridad: Múltiples puntos de acceso requieren protección adicional</p>
<p>Ejemplos de uso:
Sistemas bancarios multinacionales</p>
<p>Cadenas de retail con múltiples sucursales</p>
<p>Universidades con campus distribuidos</p>
<p>Aplicaciones cloud globales</p>
<ol>
<li>Data warehouse
Un data warehouse (almacén de datos) es un repositorio centralizado de datos integrados provenientes de múltiples fuentes, diseñado específicamente para análisis y toma de decisiones empresariales.</li>
</ol>
<p>Características principales:
Integrado: Consolida datos de diferentes sistemas (ERP, CRM, transaccionales)</p>
<p>Temporal: Almacena datos históricos para análisis de tendencias</p>
<p>No volátil: Los datos no se modifican, solo se consultan</p>
<p>Orientado a temas: Organizado por áreas de negocio (ventas, finanzas, clientes)</p>
<p>Componentes típicos:
Fuentes de datos: Sistemas transaccionales, archivos externos</p>
<p>Proceso ETL: Extracción, Transformación y Carga de datos</p>
<p>Almacén central: Repositorio principal de datos consolidados</p>
<p>Herramientas de BI: Software para análisis y visualización</p>
<p>Beneficios:
Análisis histórico: Permite estudiar tendencias a lo largo del tiempo</p>
<p>Toma de decisiones: Información consolidada para estrategia empresarial</p>
<p>Rendimiento: Consultas analíticas no afectan sistemas transaccionales</p>
<p>Calidad de datos: Procesos de limpieza y estandarización</p>
<p>Diferencias con base de datos transaccional:
Aspecto Base de datos transaccional Data warehouse
Propósito   Operaciones diarias (OLTP)  Análisis y decisiones (OLAP)
Tipo de datos   Actuales, detallados    Históricos, consolidados
Operaciones Insertar, actualizar, eliminar  Principalmente consultas
Usuarios    Operativos  Analistas, gerentes
Estructura  Normalizada Desnormalizada (optimizada para lectura)</p>
<p>He revisado el contenido de la <strong>Unidad III: Fundamentos de Administración de Base de Datos</strong> que has compartido. El material está bien estructurado y cubre todos los temas solicitados de manera completa y organizada.</p>
<h2>Observaciones sobre el contenido</h2>
<p>El documento presenta una progresión lógica desde conceptos básicos (archivos convencionales) hasta tecnologías avanzadas (data warehouse), lo cual es pedagógicamente apropiado para estudiantes de nivel medio o técnico.</p>
<h3>Puntos fuertes del material:</h3>
<ul>
<li><strong>Claridad conceptual:</strong> Las definiciones son precisas y accesibles</li>
<li><strong>Organización visual:</strong> El uso de tablas comparativas facilita la comprensión</li>
<li><strong>Completitud:</strong> Todos los temas del syllabus están cubiertos</li>
<li><strong>Aplicabilidad:</strong> Incluye ejemplos concretos de DBMS y casos de uso</li>
</ul>
<h2>Sugerencias de mejora pedagógica</h2>
<p>Si deseas enriquecer este material para uso en el aula, puedo ayudarte a desarrollar:</p>
<h3>1. <strong>Actividades prácticas</strong></h3>
<ul>
<li>Ejercicios de modelado de datos (crear diagramas entidad-relación)</li>
<li>Laboratorio de SQL básico (consultas SELECT, INSERT, UPDATE, DELETE)</li>
<li>Comparación hands-on entre archivos planos y bases de datos</li>
</ul>
<h3>2. <strong>Recursos visuales</strong></h3>
<ul>
<li>Diagramas de arquitectura DBMS</li>
<li>Infografías sobre el rol del DBA</li>
<li>Esquemas de modelos de base de datos</li>
</ul>
<h3>3. <strong>Evaluaciones</strong></h3>
<ul>
<li>Cuestionarios de opción múltiple por tema</li>
<li>Ejercicios de caso para análisis</li>
<li>Rúbricas para evaluar proyectos prácticos</li>
</ul>
<h3>4. <strong>Material complementario</strong></h3>
<ul>
<li>Presentaciones en formato diapositivas</li>
<li>Guías de estudio para estudiantes</li>
<li>Glosario de términos técnicos</li>
</ul>
<p>¿Te gustaría que elabore alguno de estos recursos complementarios para la unidad? ¿O prefieres que continúe con la siguiente unidad del curso?</p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 4,
        "titulo": "Unidad IV: Sistemas Integrados de Gestión (ERP)",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>Unidad IV: Sistemas Integrados de Gestión
Esta unidad aborda los sistemas ERP como herramientas fundamentales para la integración y optimización de procesos empresariales, incluyendo aspectos de evaluación, selección e implementación.</p>
<ol>
<li>Sistemas integradores de la administración de empresas o Enterprise Resource Planning (ERP)
Definición
Un sistema de planificación de recursos empresariales (ERP - Enterprise Resource Planning) es la gestión integrada de los principales procesos empresariales, a menudo en tiempo real y mediada por software y tecnología.</li>
</ol>
<p>Definiciones complementarias:
"Sistema global de planificación de los recursos y de gestión de la información que de forma estructurada puede satisfacer la demanda de las necesidades de gestión de la empresa."</p>
<p>"Software que permite controlar y automatizar todos los flujos clave de una empresa, desde las finanzas y la facturación hasta la gestión de personal y el inventario, en una única base de datos centralizada."</p>
<p>"Sistema integrado de software de gestión empresarial, compuesto por un conjunto de módulos funcionales susceptibles de ser adaptados a las necesidades de cada cliente."</p>
<p>Características principales de los ERP:
Característica  Descripción
Integración total   Todos los departamentos y áreas comparten información en una plataforma única 
Base de datos centralizada  Información única y consistente, sin duplicados 
Tiempo real Los datos se actualizan instantáneamente en todos los módulos 
Automatización  Tareas repetitivas se ejecutan automáticamente (informes, asientos contables) 
Modularidad Se organiza en módulos por área funcional (finanzas, RRHH, logística, etc.) 
Personalización Adaptable a las necesidades específicas de cada empresa 
Seguridad avanzada  Control de acceso basado en roles y cifrado de datos 
Escalabilidad   El sistema crece con la empresa 
Integraciones externas  Conexión con otras aplicaciones vía API 
Módulos funcionales típicos:
Finanzas y contabilidad: Gestión contable, presupuestos, tesorería</p>
<p>Recursos humanos: Nóminas, selección, capacitación, desempeño</p>
<p>Logística y cadena de suministro: Compras, inventarios, almacén</p>
<p>Ventas y marketing: Pedidos, facturación, CRM</p>
<p>Producción: Planificación, control de calidad, mantenimiento</p>
<p>Gestión de proyectos: Seguimiento, costos, recursos</p>
<p>Inteligencia de negocios: Reportes, dashboards, análisis</p>
<p>Beneficios de implementar un ERP:
Integración de información dispersa</p>
<p>Reducción de costos operativos</p>
<p>Mejora en la toma de decisiones</p>
<p>Automatización de procesos</p>
<p>Visibilidad en tiempo real del negocio</p>
<p>Estandarización de procedimientos</p>
<p>Trazabilidad completa de operaciones</p>
<ol>
<li>Actualización, costos de las tecnologías de la información
Costos de implementación de un ERP
Los costos de un proyecto ERP son significativos y deben evaluarse cuidadosamente. Incluyen múltiples componentes:</li>
</ol>
<p>Categorías de costos:
Tipo de costo   Descripción
Licencias de software   Costo por módulo o paquete del ERP 
Hardware e infraestructura  Servidores, redes, equipos (si es on-premise)
Implementación  Servicios de consultoría, configuración, personalización 
Migración de datos  Conversión y traslado de información de sistemas antiguos 
Integraciones   Conexión con otros sistemas existentes 
Capacitación    Formación del personal en el uso del sistema 
Mantenimiento   Soporte técnico, actualizaciones, patches 
Desarrollo a medida Personalizaciones específicas no cubiertas por el estándar 
Modelos de costos:
Modelo  Características Consideraciones financieras
On-Premise  Software instalado en servidores propios    Mayor inversión inicial (CAPEX), control total
SaaS (Cloud)    Software como servicio en la nube   Pago recurrente (OPEX), menor inversión inicial, escalable 
Híbrido Combinación de ambos modelos    Flexibilidad, complejidad de gestión
Costo Total de Propiedad (TCO - Total Cost of Ownership)
El TCO incluye todos los costos directos e indirectos a lo largo del ciclo de vida del ERP:</p>
<p>Costos de adquisición</p>
<p>Costos de implementación</p>
<p>Costos operativos anuales</p>
<p>Costos de mantenimiento y soporte</p>
<p>Costos de actualización</p>
<p>Costos de oportunidad</p>
<ol>
<li>Determinación de requerimientos
La determinación de requerimientos es una fase crítica que define qué necesita la empresa del sistema ERP.</li>
</ol>
<p>Fases para determinar requerimientos:
Análisis de procesos actuales</p>
<p>Mapeo de procesos de negocio</p>
<p>Identificación de cuellos de botella</p>
<p>Detección de necesidades de mejora</p>
<p>Definición de requisitos funcionales</p>
<p>Qué debe hacer el sistema</p>
<p>Módulos necesarios</p>
<p>Funcionalidades específicas por área</p>
<p>Definición de requisitos técnicos</p>
<p>Infraestructura requerida</p>
<p>Integraciones necesarias</p>
<p>Seguridad y cumplimiento normativo</p>
<p>Escalabilidad futura</p>
<p>Priorización de requerimientos</p>
<p>Críticos vs. deseables</p>
<p>Alineación con estrategia empresarial</p>
<p>Documentación del RFP (Request for Proposal)</p>
<p>Documento formal para solicitar propuestas a proveedores</p>
<p>Factores a considerar:
Tamaño y complejidad de la organización</p>
<p>Sector industrial y regulaciones aplicables</p>
<p>Número de usuarios concurrentes</p>
<p>Necesidades de movilidad y acceso remoto</p>
<p>Idiomas y localización</p>
<p>Presupuesto disponible</p>
<ol>
<li>Evaluación técnica de propuestas
La evaluación técnica analiza la capacidad de las soluciones ERP para satisfacer los requerimientos definidos.</li>
</ol>
<p>Criterios de evaluación técnica:
Criterio    Aspectos a evaluar
Funcionalidad   Cobertura de módulos, características específicas, flexibilidad 
Arquitectura tecnológica    Plataforma, base de datos, lenguajes de desarrollo 
Escalabilidad   Capacidad de crecer con la empresa 
Integración APIs, conectores, compatibilidad con sistemas existentes 
Usabilidad  Interfaz amigable, curva de aprendizaje 
Seguridad   Autenticación, roles, cifrado, cumplimiento normativo 
Soporte técnico Disponibilidad, SLA, cobertura geográfica 
Referencias Casos de éxito en empresas similares 
Proveedor   Experiencia, estabilidad financiera, trayectoria 
Metodología de evaluación:
Demostraciones (demos): Ver el sistema en acción con escenarios reales</p>
<p>Pruebas piloto: Implementación limitada para validar funcionalidad</p>
<p>Visitas a referencias: Conocer experiencias de otros clientes</p>
<p>Evaluación por puntuación: Asignar pesos y calificaciones a cada criterio</p>
<p>Matriz de decisión: Comparar alternativas de manera objetiva</p>
<p>Proveedores líderes de ERP:
SAP: SAP S/4HANA, SAP Business One</p>
<p>Oracle: Oracle ERP Cloud, Oracle NetSuite</p>
<p>Microsoft: Microsoft Dynamics 365</p>
<p>Otros: Infor, Epicor, Odoo, Zoho ERP</p>
<ol>
<li>Evaluación financiera de las propuestas
La evaluación financiera determina la viabilidad económica del proyecto ERP y compara alternativas desde la perspectiva de retorno de inversión.</li>
</ol>
<p>Indicadores financieros clave:
Indicador   Descripción Interpretación
VAN (Valor Actual Neto) Valor presente de flujos de caja futuros menos inversión inicial    VAN &gt; 0 indica viabilidad económica 
TIR (Tasa Interna de Retorno)   Tasa de descuento que hace VAN = 0  TIR &gt; tasa de oportunidad indica rentabilidad 
Payback (Periodo de recuperación)   Tiempo necesario para recuperar la inversión    Menor periodo = menor riesgo 
ROI (Retorno sobre inversión)   (Beneficios - Costos) / Costos × 100    Porcentaje de retorno sobre lo invertido 
TCO (Costo Total de Propiedad)  Suma de todos los costos durante el ciclo de vida   Permite comparar opciones a largo plazo 
Ejemplo de evaluación financiera:
En un caso de estudio de empresa del sector aeronáutico:</p>
<p>Indicador   Oracle ERP Cloud    SAP S/4HANA Cloud
VAN US$ 49,004.74   US$ 120,875.04
TIR 11.45%  13.04%
Payback 4.51 años   4.38 años
Decisión    Viable  Seleccionado (mejores indicadores)
Componentes del análisis financiero:
Estimación de costos:</p>
<p>Inversión inicial (licencias, implementación, hardware)</p>
<p>Costos operativos anuales (mantenimiento, soporte, personal)</p>
<p>Costos de oportunidad</p>
<p>Proyección de beneficios:</p>
<p>Reducción de costos operativos</p>
<p>Mejora en productividad</p>
<p>Disminución de errores</p>
<p>Mejora en servicio al cliente</p>
<p>Toma de decisiones más rápida</p>
<p>Análisis de sensibilidad:</p>
<p>Escenarios optimista, base y pesimista</p>
<p>Impacto de variaciones en costos o beneficios</p>
<p>Estudio costo-beneficio:</p>
<p>Comparación cuantitativa de costos vs. beneficios esperados</p>
<ol>
<li>Actividades posteriores a la firma del contrato
Una vez firmado el contrato con el proveedor del ERP, comienzan las actividades críticas para asegurar una implementación exitosa.</li>
</ol>
<p>Actividades principales:
1. Capacitación y formación del personal
Cursos de entrenamiento antes de la llegada del nuevo sistema</p>
<p>Capacitación por roles y niveles de usuario</p>
<p>Materiales de referencia y documentación</p>
<p>Sesiones prácticas con el sistema</p>
<ol>
<li>Conversión de programas y datos
Migración de información de sistemas antiguos al nuevo ERP</li>
</ol>
<p>Limpieza y validación de datos</p>
<p>Mapeo de campos y estructuras</p>
<p>Pruebas de integridad de datos migrados</p>
<ol>
<li>Traslado de información
Carga masiva de datos históricos</li>
</ol>
<p>Verificación de consistencia</p>
<p>Respaldo de información crítica</p>
<ol>
<li>Configuración y personalización
Adaptación del sistema a procesos específicos de la empresa</li>
</ol>
<p>Definición de parámetros y reglas de negocio</p>
<p>Desarrollo de funcionalidades a medida (si aplica)</p>
<ol>
<li>Pruebas del sistema
Pruebas unitarias por módulo</li>
</ol>
<p>Pruebas de integración entre módulos</p>
<p>Pruebas de rendimiento y carga</p>
<p>Pruebas de aceptación por usuarios</p>
<ol>
<li>Puesta en marcha (Go-Live)
Plan de implementación (por fases o big bang)</li>
</ol>
<p>Soporte intensivo durante los primeros días</p>
<p>Monitoreo de incidencias</p>
<ol>
<li>Soporte post-implementación
Mesa de ayuda para usuarios</li>
</ol>
<p>Corrección de errores y ajustes</p>
<p>Optimización continua del sistema</p>
<p>Factores críticos de éxito post-contrato:
Compromiso de la alta dirección</p>
<p>Gestión del cambio organizacional</p>
<p>Comunicación efectiva con todos los stakeholders</p>
<p>Plan de proyecto detallado con hitos claros</p>
<p>Equipo de implementación dedicado</p>
<p>Capacitación adecuada y oportuna</p>
<p>Soporte técnico disponible</p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 5,
        "titulo": "Laboratorio Práctico I",
        "tipo": "Presencial",
        "definiciones": """<div class='alert alert-info fs-5'><i class='bi bi-laptop'></i> Práctica de Laboratorio. Las guías se entregarán presencialmente.</div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 6,
        "titulo": "Laboratorio Práctico II",
        "tipo": "Presencial",
        "definiciones": """<div class='alert alert-info fs-5'><i class='bi bi-laptop'></i> Práctica de Laboratorio. Las guías se entregarán presencialmente.</div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 7,
        "titulo": "Unidad VII: Apoyo a la Toma de Decisiones (Parte I)",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>La <strong>Unidad VII</strong> del programa ADE18 es <strong>“Tecnologías de Apoyo a la Toma de Decisiones”</strong>. El programa incluye sistemas transaccionales, proceso de toma de decisiones, DSS, GDSS, diseño de salas, casos de aplicación, inteligencia artificial y sistemas expertos. </p>
<p>A continuación, el material desarrollado manteniendo esa estructura y con orientación universitaria hacia Administración.</p>
<h1>UNIDAD VII — TECNOLOGÍAS DE APOYO A LA TOMA DE DECISIONES</h1>
<p><strong>Asignatura:</strong> Tecnología de la Información y la Comunicación
<strong>Código:</strong> ADE18
<strong>Carrera:</strong> Administración
<strong>Unidad:</strong> VII
<strong>Enfoque:</strong> Sistemas de información, análisis y toma de decisiones empresariales</p>
<hr />
<h1>1. INTRODUCCIÓN: DE REGISTRAR DATOS A TOMAR DECISIONES</h1>
<p>Las organizaciones generan diariamente grandes cantidades de datos:</p>
<ul>
<li>ventas;</li>
<li>compras;</li>
<li>pagos;</li>
<li>inventarios;</li>
<li>movimientos bancarios;</li>
<li>clientes;</li>
<li>proveedores;</li>
<li>costos;</li>
<li>asistencia;</li>
<li>producción;</li>
<li>reclamos;</li>
<li>operaciones administrativas.</li>
</ul>
<p>Registrar estos datos es necesario, pero no suficiente.</p>
<p>El verdadero valor aparece cuando la organización puede convertirlos en <strong>información útil para tomar decisiones</strong>.</p>
<p>Por ejemplo:</p>
<p>Un sistema registra que durante seis meses las ventas fueron:</p>
<p><strong>Enero:</strong> G. 120 millones
<strong>Febrero:</strong> G. 125 millones
<strong>Marzo:</strong> G. 118 millones
<strong>Abril:</strong> G. 110 millones
<strong>Mayo:</strong> G. 103 millones
<strong>Junio:</strong> G. 95 millones</p>
<p>Los registros representan información histórica.</p>
<p>Pero la administración necesita responder preguntas de mayor nivel:</p>
<p><strong>¿Por qué están disminuyendo las ventas?</strong></p>
<p><strong>¿Continuará la tendencia?</strong></p>
<p><strong>¿Qué productos están provocando la caída?</strong></p>
<p><strong>¿Qué sucedería si reducimos los precios?</strong></p>
<p><strong>¿Conviene aumentar la publicidad?</strong></p>
<p><strong>¿Qué decisión debería tomar la gerencia?</strong></p>
<p>Las tecnologías de apoyo a las decisiones permiten avanzar desde el simple registro de operaciones hacia el <strong>análisis, comparación, simulación y evaluación de alternativas</strong>.</p>
<hr />
<h1>2. PLATAFORMA DE SISTEMAS TRANSACCIONALES</h1>
<p>Los <strong>Sistemas de Procesamiento de Transacciones (TPS)</strong> registran las operaciones rutinarias de una organización.</p>
<p>Ejemplos:</p>
<ul>
<li>venta realizada;</li>
<li>factura emitida;</li>
<li>compra registrada;</li>
<li>pago recibido;</li>
<li>salario abonado;</li>
<li>producto ingresado;</li>
<li>transferencia realizada;</li>
<li>inscripción de un estudiante;</li>
<li>reserva confirmada.</li>
</ul>
<p>Cada operación genera datos.</p>
<p>Por ejemplo:</p>
<p><strong>VENTA</strong></p>
<p>Cliente: María González
Producto: Notebook
Cantidad: 1
Precio: G. 4.500.000
Sucursal: San Lorenzo
Fecha: 08/09/2026
Vendedor: Juan López</p>
<p>Una venta individual puede tener poco valor para una decisión estratégica.</p>
<p>Pero miles de operaciones acumuladas permiten analizar:</p>
<ul>
<li>productos más vendidos;</li>
<li>clientes principales;</li>
<li>horarios de mayor venta;</li>
<li>sucursales con mejor rendimiento;</li>
<li>evolución mensual;</li>
<li>comportamiento de precios;</li>
<li>niveles de inventario.</li>
</ul>
<p>Por esta razón, los sistemas transaccionales constituyen una importante <strong>fuente de datos para sistemas de apoyo gerencial y de decisiones</strong>.</p>
<hr />
<h1>3. DEL TPS A LA DECISIÓN</h1>
<p>Podemos representar el proceso de la siguiente manera:</p>
<p><strong>TRANSACCIONES</strong></p>
<p>↓</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>BASE DE DATOS</strong></p>
<p>↓</p>
<p><strong>PROCESAMIENTO Y ANÁLISIS</strong></p>
<p>↓</p>
<p><strong>INFORMACIÓN</strong></p>
<p>↓</p>
<p><strong>ALTERNATIVAS</strong></p>
<p>↓</p>
<p><strong>DECISIÓN</strong></p>
<p>↓</p>
<p><strong>ACCIÓN</strong></p>
<p>Ejemplo:</p>
<p><strong>TPS:</strong> registra 25.000 ventas.</p>
<p>↓</p>
<p><strong>Análisis:</strong> identifica caída del 18 % en determinada categoría.</p>
<p>↓</p>
<p><strong>DSS:</strong> compara posibles estrategias.</p>
<p>↓</p>
<p><strong>Gerente:</strong> selecciona una alternativa.</p>
<p>↓</p>
<p><strong>Empresa:</strong> implementa la decisión.</p>
<p>La tecnología no necesariamente toma la decisión final.</p>
<p>Su función principal puede ser <strong>mejorar la calidad de la información disponible para quien debe decidir</strong>.</p>
<hr />
<h1>4. EL PROCESO DE TOMA DE DECISIONES</h1>
<p>Tomar una decisión significa seleccionar una alternativa entre diferentes posibilidades para alcanzar un objetivo o resolver un problema.</p>
<p>En administración, las decisiones pueden relacionarse con:</p>
<ul>
<li>inversiones;</li>
<li>contratación;</li>
<li>producción;</li>
<li>marketing;</li>
<li>financiamiento;</li>
<li>inventario;</li>
<li>expansión;</li>
<li>proveedores;</li>
<li>precios;</li>
<li>tecnología.</li>
</ul>
<p>Una decisión empresarial debería apoyarse en información relevante y no exclusivamente en intuición.</p>
<hr />
<h1>5. ETAPAS DEL PROCESO DE DECISIÓN</h1>
<p>Un proceso de decisión puede estructurarse en varias etapas.</p>
<h2>5.1. Identificación del problema</h2>
<p>Primero debemos reconocer que existe una situación que requiere intervención.</p>
<p>Ejemplo:</p>
<p><strong>Las ventas disminuyeron un 20 %.</strong></p>
<p>Pero detectar el síntoma no significa conocer el problema.</p>
<p>La disminución podría deberse a:</p>
<ul>
<li>aumento de precios;</li>
<li>nuevos competidores;</li>
<li>falta de inventario;</li>
<li>mala atención;</li>
<li>cambios en los consumidores;</li>
<li>problemas económicos;</li>
<li>publicidad insuficiente.</li>
</ul>
<hr />
<h2>5.2. Recolección de información</h2>
<p>Se obtienen datos relacionados con el problema.</p>
<p>Por ejemplo:</p>
<ul>
<li>ventas históricas;</li>
<li>precios;</li>
<li>inventarios;</li>
<li>clientes;</li>
<li>competidores;</li>
<li>costos;</li>
<li>campañas;</li>
<li>reclamos.</li>
</ul>
<hr />
<h2>5.3. Análisis</h2>
<p>Los datos son procesados para identificar:</p>
<ul>
<li>tendencias;</li>
<li>patrones;</li>
<li>relaciones;</li>
<li>anomalías;</li>
<li>causas posibles.</li>
</ul>
<hr />
<h2>5.4. Generación de alternativas</h2>
<p>Se identifican diferentes opciones.</p>
<p>Ejemplo:</p>
<p><strong>Alternativa A:</strong> reducir precios.</p>
<p><strong>Alternativa B:</strong> aumentar publicidad.</p>
<p><strong>Alternativa C:</strong> introducir nuevos productos.</p>
<p><strong>Alternativa D:</strong> cerrar productos poco rentables.</p>
<hr />
<h2>5.5. Evaluación de alternativas</h2>
<p>Se estudian:</p>
<ul>
<li>costos;</li>
<li>beneficios;</li>
<li>riesgos;</li>
<li>recursos;</li>
<li>impacto;</li>
<li>tiempo;</li>
<li>viabilidad.</li>
</ul>
<hr />
<h2>5.6. Selección</h2>
<p>La administración elige la alternativa considerada más conveniente.</p>
<hr />
<h2>5.7. Implementación</h2>
<p>La decisión se transforma en acciones concretas.</p>
<hr />
<h2>5.8. Evaluación</h2>
<p>Finalmente se analizan los resultados.</p>
<p>Una decisión administrativa no termina cuando se selecciona una alternativa.</p>
<p>Debe comprobarse:</p>
<p><strong>¿Funcionó?</strong></p>
<hr />
<h1>6. TIPOS DE DECISIONES</h1>
<h2>Decisiones estructuradas</h2>
<p>Son repetitivas y poseen reglas relativamente claras.</p>
<p>Ejemplo:</p>
<p>Si el inventario baja del mínimo establecido, generar una orden de reposición.</p>
<p>Pueden automatizarse con mayor facilidad.</p>
<hr />
<h2>Decisiones semiestructuradas</h2>
<p>Una parte puede resolverse mediante reglas o análisis, pero otra requiere juicio humano.</p>
<p>Ejemplo:</p>
<p>Determinar cuánto inventario comprar para los próximos tres meses.</p>
<p>El sistema puede proporcionar:</p>
<ul>
<li>ventas históricas;</li>
<li>tendencias;</li>
<li>costos;</li>
<li>proyecciones.</li>
</ul>
<p>Pero el gerente puede considerar factores adicionales.</p>
<hr />
<h2>Decisiones no estructuradas</h2>
<p>Son complejas, poco frecuentes y no poseen una solución predeterminada.</p>
<p>Ejemplos:</p>
<ul>
<li>ingresar a un nuevo mercado;</li>
<li>adquirir otra empresa;</li>
<li>cambiar el modelo de negocio;</li>
<li>realizar una inversión estratégica.</li>
</ul>
<p>En estas decisiones la experiencia y el juicio directivo tienen un papel importante.</p>
<hr />
<h1>7. SISTEMAS DE APOYO A LA TOMA DE DECISIONES — DSS</h1>
<p><strong>DSS</strong> significa:</p>
<p><strong>Decision Support System</strong></p>
<p>o</p>
<p><strong>Sistema de Apoyo a la Toma de Decisiones.</strong></p>
<p>Es un sistema diseñado para proporcionar información, modelos y herramientas analíticas que ayuden a las personas a evaluar problemas y alternativas.</p>
<p>Su finalidad fundamental es <strong>apoyar al decisor</strong>.</p>
<hr />
<h1>8. CARACTERÍSTICAS DE LOS DSS</h1>
<p>Un DSS puede:</p>
<ul>
<li>integrar información;</li>
<li>consultar datos;</li>
<li>analizar tendencias;</li>
<li>comparar alternativas;</li>
<li>realizar simulaciones;</li>
<li>generar escenarios;</li>
<li>utilizar modelos;</li>
<li>presentar información gráficamente;</li>
<li>responder preguntas del tipo “¿qué pasaría si...?”.</li>
</ul>
<p>Una característica importante es la <strong>interactividad</strong>.</p>
<p>El usuario puede modificar determinadas variables y observar cómo cambian los resultados.</p>
<hr />
<h1>9. ANÁLISIS “WHAT-IF”</h1>
<p>Una de las herramientas conceptuales más importantes es el análisis:</p>
<p><strong>What if? — ¿Qué pasaría si...?</strong></p>
<p>Ejemplo:</p>
<p>Una empresa vende un producto a:</p>
<p><strong>Precio:</strong> G. 100.000
<strong>Ventas:</strong> 1.000 unidades</p>
<p>La gerencia desea analizar:</p>
<p><strong>¿Qué sucedería si reducimos el precio un 10 % y las ventas aumentan un 25 %?</strong></p>
<p>Un sistema de apoyo puede calcular diferentes escenarios antes de implementar la decisión.</p>
<p>Otros ejemplos:</p>
<p><strong>¿Qué ocurre si el dólar aumenta 15 %?</strong></p>
<p><strong>¿Qué sucede si las ventas disminuyen 20 %?</strong></p>
<p><strong>¿Qué ocurre si contratamos cinco vendedores adicionales?</strong></p>
<p><strong>¿Qué sucede si aumentamos la inversión publicitaria?</strong></p>
<p>El DSS permite explorar posibles consecuencias.</p>
<hr />
<h1>10. ANÁLISIS DE SENSIBILIDAD</h1>
<p>El análisis de sensibilidad estudia cómo cambia un resultado cuando se modifica una o varias variables.</p>
<p>Por ejemplo:</p>
<p>Una empresa analiza su utilidad modificando el precio:</p>
<p><strong>Precio A:</strong> G. 80.000
<strong>Precio B:</strong> G. 90.000
<strong>Precio C:</strong> G. 100.000
<strong>Precio D:</strong> G. 110.000</p>
<p>El objetivo es comprender qué variables tienen mayor influencia sobre los resultados.</p>
<hr />
<h1>11. ANÁLISIS DE ESCENARIOS</h1>
<p>Una organización puede construir diferentes escenarios futuros.</p>
<h3>Escenario optimista</h3>
<ul>
<li>aumento de ventas;</li>
<li>reducción de costos;</li>
<li>crecimiento económico.</li>
</ul>
<h3>Escenario probable</h3>
<ul>
<li>comportamiento esperado según información disponible.</li>
</ul>
<h3>Escenario pesimista</h3>
<ul>
<li>caída de ventas;</li>
<li>aumento de costos;</li>
<li>dificultades económicas.</li>
</ul>
<p>Esto permite preparar decisiones antes de que ocurran determinadas situaciones.</p>
<hr />
<h1>12. COMPONENTES CONCEPTUALES DE UN DSS</h1>
<p>Un DSS puede integrar varios elementos.</p>
<h3>Datos</h3>
<p>Información interna y externa.</p>
<h3>Modelos</h3>
<p>Representaciones matemáticas, financieras, estadísticas o lógicas.</p>
<h3>Software</h3>
<p>Herramientas para realizar cálculos, consultas y simulaciones.</p>
<h3>Interfaz</h3>
<p>Permite al usuario interactuar con el sistema.</p>
<h3>Usuario decisor</h3>
<p>Persona responsable de analizar los resultados y tomar decisiones.</p>
<hr />
<h1>13. CASO DE APLICACIÓN DE UN DSS</h1>
<h2>Supermercados Centuria</h2>
<p>La empresa debe decidir dónde abrir una nueva sucursal.</p>
<p>Tiene tres posibles ubicaciones:</p>
<p><strong>San Lorenzo</strong></p>
<p><strong>Luque</strong></p>
<p><strong>Fernando de la Mora</strong></p>
<p>La decisión considera:</p>
<ul>
<li>población;</li>
<li>alquiler;</li>
<li>competencia;</li>
<li>tránsito;</li>
<li>ingresos promedio;</li>
<li>distancia de proveedores;</li>
<li>costo de instalación;</li>
<li>ventas estimadas.</li>
</ul>
<p>Un DSS podría permitir asignar valores a estas variables y comparar las alternativas.</p>
<p>El gerente podría preguntar:</p>
<p><strong>¿Qué ubicación obtiene mejores resultados?</strong></p>
<p>Después:</p>
<p><strong>¿Qué sucede si el alquiler aumenta 20 %?</strong></p>
<p>Después:</p>
<p><strong>¿Qué sucede si las ventas son 15 % menores de lo esperado?</strong></p>
<p>El sistema permite analizar múltiples escenarios antes de comprometer recursos.</p>
<hr />
<h1>14. DSS NO SIGNIFICA DECISIÓN AUTOMÁTICA</h1>
<p>Debe diferenciarse:</p>
<p><strong>Sistema que APOYA una decisión</strong></p>
<p>de</p>
<p><strong>Sistema que TOMA automáticamente una decisión.</strong></p>
<p>Un DSS proporciona elementos para decidir.</p>
<p>La responsabilidad administrativa continúa perteneciendo al decisor cuando la decisión requiere intervención humana.</p>
<p>Por ejemplo, un sistema puede indicar:</p>
<p><strong>“La alternativa B presenta mayor rentabilidad proyectada.”</strong></p>
<p>Pero el gerente puede considerar además:</p>
<ul>
<li>riesgos;</li>
<li>reputación;</li>
<li>legislación;</li>
<li>impacto social;</li>
<li>estrategia empresarial.</li>
</ul>
<p>La tecnología aumenta la capacidad de análisis, pero no elimina automáticamente la responsabilidad humana.</p>
<hr />
<h1>15. SISTEMAS DE APOYO A DECISIONES EN GRUPO — GDSS</h1>
<p><strong>GDSS</strong> significa:</p>
<p><strong>Group Decision Support System.</strong></p>
<p>Son sistemas diseñados para facilitar procesos de decisión donde participan varias personas.</p>
<p>Son especialmente útiles cuando una decisión requiere:</p>
<ul>
<li>diferentes conocimientos;</li>
<li>diferentes departamentos;</li>
<li>discusión;</li>
<li>evaluación conjunta;</li>
<li>votación;</li>
<li>generación de alternativas;</li>
<li>consenso.</li>
</ul>
<hr />
<h1>16. CARACTERÍSTICAS DE LOS GDSS</h1>
<p>Un GDSS puede permitir:</p>
<ul>
<li>compartir documentos;</li>
<li>presentar información;</li>
<li>registrar propuestas;</li>
<li>generar ideas;</li>
<li>realizar votaciones;</li>
<li>clasificar alternativas;</li>
<li>comparar opiniones;</li>
<li>colaborar a distancia;</li>
<li>documentar decisiones.</li>
</ul>
<p>Ejemplo:</p>
<p>Una empresa debe seleccionar un nuevo sistema ERP.</p>
<p>Participan:</p>
<ul>
<li>gerente general;</li>
<li>gerente financiero;</li>
<li>responsable de tecnología;</li>
<li>administración;</li>
<li>recursos humanos;</li>
<li>compras.</li>
</ul>
<p>Cada área puede evaluar diferentes aspectos de las propuestas.</p>
<hr />
<h1>17. VENTAJAS DE LOS GDSS</h1>
<p>Entre sus posibles ventajas:</p>
<ul>
<li>participación de múltiples especialistas;</li>
<li>mayor cantidad de alternativas;</li>
<li>registro del proceso;</li>
<li>colaboración;</li>
<li>estructuración de reuniones;</li>
<li>reducción de determinadas barreras geográficas;</li>
<li>posibilidad de analizar diferentes opiniones.</li>
</ul>
<hr />
<h1>18. DESVENTAJAS Y LIMITACIONES DE LOS GDSS</h1>
<p>También pueden aparecer dificultades:</p>
<ul>
<li>resistencia al uso de tecnología;</li>
<li>información insuficiente;</li>
<li>conflictos entre participantes;</li>
<li>dependencia tecnológica;</li>
<li>problemas de conectividad;</li>
<li>exceso de información;</li>
<li>mala configuración del proceso;</li>
<li>costos de implementación.</li>
</ul>
<p>La existencia de tecnología no garantiza una buena decisión grupal.</p>
<hr />
<h1>19. DISEÑO DE SALAS PARA GDSS</h1>
<p>Tradicionalmente, los GDSS podían implementarse mediante salas especialmente equipadas.</p>
<p>Una sala de decisión puede disponer de:</p>
<ul>
<li>computadoras;</li>
<li>pantalla principal;</li>
<li>conectividad;</li>
<li>software colaborativo;</li>
<li>sistemas de votación;</li>
<li>herramientas de presentación.</li>
</ul>
<p>Actualmente muchas de estas funciones pueden realizarse también mediante plataformas digitales y ambientes virtuales.</p>
<p>El principio continúa siendo el mismo:</p>
<p><strong>utilizar tecnología para estructurar y mejorar el proceso de decisión colectiva.</strong></p>
<hr />
<h1>20. USOS PRÁCTICOS DE GDSS</h1>
<p>Puede utilizarse para:</p>
<ul>
<li>planificación estratégica;</li>
<li>elaboración presupuestaria;</li>
<li>selección de proveedores;</li>
<li>evaluación de proyectos;</li>
<li>selección de tecnología;</li>
<li>gestión de riesgos;</li>
<li>planificación de inversiones;</li>
<li>resolución de problemas complejos.</li>
</ul>
<hr />
<h1>21. CASO DE APLICACIÓN DE GDSS</h1>
<p>Una universidad debe seleccionar una nueva plataforma académica.</p>
<p>Existen cuatro propuestas.</p>
<p>Participan representantes de:</p>
<ul>
<li>Dirección;</li>
<li>Administración;</li>
<li>Docencia;</li>
<li>Secretaría;</li>
<li>Informática;</li>
<li>estudiantes.</li>
</ul>
<p>Se establecen criterios:</p>
<p><strong>Costo — 20 %</strong></p>
<p><strong>Funcionalidad — 25 %</strong></p>
<p><strong>Facilidad de uso — 15 %</strong></p>
<p><strong>Seguridad — 15 %</strong></p>
<p><strong>Soporte — 10 %</strong></p>
<p><strong>Escalabilidad — 15 %</strong></p>
<p>Cada participante evalúa las alternativas.</p>
<p>El sistema consolida las puntuaciones y genera un resultado.</p>
<p>Esto no significa que la plataforma con mayor puntuación deba seleccionarse automáticamente.</p>
<p>El resultado constituye información para apoyar la decisión colectiva.</p>
<hr />
<h1>22. INTELIGENCIA ARTIFICIAL</h1>
<p>La Inteligencia Artificial incorpora técnicas que permiten que los sistemas realicen tareas asociadas con capacidades como:</p>
<ul>
<li>reconocimiento;</li>
<li>clasificación;</li>
<li>predicción;</li>
<li>generación;</li>
<li>procesamiento de lenguaje;</li>
<li>identificación de patrones;</li>
<li>recomendaciones;</li>
<li>resolución de determinados problemas.</li>
</ul>
<p>Dentro del contexto empresarial, puede utilizarse como apoyo para:</p>
<ul>
<li>pronosticar demanda;</li>
<li>detectar fraude;</li>
<li>analizar clientes;</li>
<li>automatizar procesos;</li>
<li>realizar recomendaciones;</li>
<li>clasificar documentos;</li>
<li>asistir al usuario;</li>
<li>analizar grandes volúmenes de información.</li>
</ul>
<hr />
<h1>23. IA Y TOMA DE DECISIONES</h1>
<p>Supongamos que una institución posee información histórica de miles de clientes.</p>
<p>Un sistema puede analizar:</p>
<ul>
<li>compras;</li>
<li>frecuencia;</li>
<li>preferencias;</li>
<li>comportamiento;</li>
<li>historial.</li>
</ul>
<p>A partir de estos datos podría generar:</p>
<p><strong>Predicción:</strong> probabilidad de compra.</p>
<p><strong>Clasificación:</strong> segmento de cliente.</p>
<p><strong>Recomendación:</strong> producto potencialmente interesante.</p>
<p><strong>Alerta:</strong> comportamiento anormal.</p>
<p>Estos resultados pueden apoyar decisiones comerciales.</p>
<hr />
<h1>24. SISTEMAS EXPERTOS</h1>
<p>Un <strong>sistema experto</strong> busca representar conocimiento especializado para proporcionar recomendaciones o conclusiones dentro de un dominio determinado.</p>
<p>Tradicionalmente utiliza:</p>
<h3>Base de conocimiento</h3>
<p>Contiene conocimientos y reglas del dominio.</p>
<h3>Motor de inferencia</h3>
<p>Aplica reglas para obtener conclusiones.</p>
<h3>Interfaz</h3>
<p>Permite interactuar con el usuario.</p>
<hr />
<h1>25. EJEMPLO SIMPLIFICADO DE SISTEMA EXPERTO</h1>
<p>Supongamos un sistema para evaluación financiera.</p>
<p>Reglas:</p>
<p><strong>SI</strong> liquidez es baja
<strong>Y</strong> endeudamiento es alto
<strong>ENTONCES</strong> riesgo financiero elevado.</p>
<p>Otra regla:</p>
<p><strong>SI</strong> liquidez es alta
<strong>Y</strong> endeudamiento es bajo
<strong>ENTONCES</strong> situación financiera favorable.</p>
<p>El sistema recibe información, aplica reglas y produce una recomendación o conclusión.</p>
<hr />
<h1>26. BENEFICIOS DE LOS SISTEMAS EXPERTOS</h1>
<p>Pueden contribuir a:</p>
<ul>
<li>conservar conocimiento especializado;</li>
<li>proporcionar respuestas consistentes;</li>
<li>apoyar personal menos experimentado;</li>
<li>automatizar determinados análisis;</li>
<li>reducir tiempos;</li>
<li>disponibilizar conocimiento de forma más amplia.</li>
</ul>
<hr />
<h1>27. COSTOS Y LIMITACIONES</h1>
<p>El desarrollo y mantenimiento de estos sistemas puede implicar:</p>
<ul>
<li>adquisición del conocimiento;</li>
<li>especialistas;</li>
<li>desarrollo;</li>
<li>validación;</li>
<li>actualización;</li>
<li>infraestructura;</li>
<li>capacitación;</li>
<li>mantenimiento.</li>
</ul>
<p>Además, el conocimiento puede cambiar.</p>
<p>Un sistema basado en conocimientos desactualizados puede producir recomendaciones inadecuadas.</p>
<hr />
<h1>28. SHELL PARA SISTEMAS EXPERTOS</h1>
<p>Un <strong>Shell</strong> es una herramienta o entorno que proporciona componentes necesarios para construir sistemas expertos sin tener que desarrollar toda la infraestructura desde cero.</p>
<p>El desarrollador incorpora principalmente:</p>
<ul>
<li>conocimiento;</li>
<li>reglas;</li>
<li>relaciones;</li>
<li>criterios.</li>
</ul>
<p>El entorno proporciona mecanismos para procesarlos.</p>
<hr />
<h1>29. SELECCIÓN DE APLICACIONES PARA SISTEMAS EXPERTOS</h1>
<p>No todos los problemas justifican un sistema experto.</p>
<p>Una aplicación resulta más apropiada cuando:</p>
<ul>
<li>existe conocimiento especializado identificable;</li>
<li>existen reglas o criterios relativamente claros;</li>
<li>el problema se presenta repetidamente;</li>
<li>el conocimiento puede representarse;</li>
<li>existe valor económico u operativo en automatizar el análisis.</li>
</ul>
<hr />
<h1>30. DEL TPS A LA INTELIGENCIA</h1>
<p>Podemos observar una evolución conceptual:</p>
<p><strong>TPS</strong></p>
<p>¿Qué ocurrió?</p>
<p>↓</p>
<p><strong>MIS</strong></p>
<p>¿Qué está ocurriendo en la organización?</p>
<p>↓</p>
<p><strong>DSS</strong></p>
<p>¿Qué pasaría si modificamos determinadas variables?</p>
<p>↓</p>
<p><strong>GDSS</strong></p>
<p>¿Qué alternativa debería evaluar un grupo?</p>
<p>↓</p>
<p><strong>IA / SISTEMAS EXPERTOS</strong></p>
<p>¿Qué patrones, predicciones o recomendaciones puede generar el sistema?</p>
<p>Esta progresión permite comprender que las tecnologías empresariales pueden utilizar los datos en diferentes niveles de análisis.</p>
<hr />
<h1>31. CASO INTEGRADOR — DISTRIBUIDORA PARAGUAYA</h1>
<p>Una distribuidora posee 12.000 clientes y realiza aproximadamente 3.000 operaciones por día.</p>
<p>La gerencia observa una reducción de rentabilidad.</p>
<h2>Nivel 1 — TPS</h2>
<p>El sistema registra:</p>
<ul>
<li>ventas;</li>
<li>compras;</li>
<li>pagos;</li>
<li>inventarios.</li>
</ul>
<h2>Nivel 2 — Información gerencial</h2>
<p>Se identifica:</p>
<ul>
<li>reducción del margen;</li>
<li>aumento de costos;</li>
<li>productos de baja rotación.</li>
</ul>
<h2>Nivel 3 — DSS</h2>
<p>Se simulan alternativas:</p>
<p><strong>A:</strong> aumentar precios 5 %.</p>
<p><strong>B:</strong> cambiar proveedores.</p>
<p><strong>C:</strong> eliminar productos poco rentables.</p>
<p><strong>D:</strong> aumentar volumen de compra para negociar descuentos.</p>
<h2>Nivel 4 — GDSS</h2>
<p>Administración, Finanzas, Ventas y Compras analizan conjuntamente las alternativas.</p>
<h2>Nivel 5 — IA</h2>
<p>Un modelo analiza datos históricos y genera una predicción de demanda por producto.</p>
<p>La decisión final puede integrar todos estos elementos.</p>
<hr />
<h1>32. ACTIVIDAD PRÁCTICA — “USTED ES EL GERENTE”</h1>
<h2>Situación</h2>
<p>Una empresa dispone de G. 500 millones para invertir.</p>
<p>Tiene tres alternativas:</p>
<h3>Proyecto A</h3>
<p>Nueva sucursal.</p>
<h3>Proyecto B</h3>
<p>Plataforma de comercio electrónico.</p>
<h3>Proyecto C</h3>
<p>Modernización del sistema logístico.</p>
<p>Cada grupo deberá definir criterios para evaluar las alternativas.</p>
<p>Como mínimo:</p>
<ul>
<li>inversión;</li>
<li>rentabilidad esperada;</li>
<li>riesgo;</li>
<li>tiempo;</li>
<li>impacto estratégico.</li>
</ul>
<p>Luego deberá asignar una puntuación de <strong>1 a 5</strong> a cada alternativa.</p>
<p>Finalmente responder:</p>
<p><strong>1. ¿Qué alternativa seleccionaron?</strong></p>
<p><strong>2. ¿Qué criterios tuvieron mayor peso?</strong></p>
<p><strong>3. ¿Cambiaría la decisión si el presupuesto disminuyera 30 %?</strong></p>
<p><strong>4. ¿Qué información adicional necesitan?</strong></p>
<p><strong>5. ¿Qué parte de la decisión puede realizar un sistema y qué parte corresponde al gerente?</strong></p>
<hr />
<h1>33. DESAFÍO “WHAT-IF”</h1>
<p>Una empresa vende mensualmente:</p>
<p><strong>5.000 unidades</strong></p>
<p>Precio:</p>
<p><strong>G. 100.000</strong></p>
<p>Costo unitario:</p>
<p><strong>G. 70.000</strong></p>
<p>La gerencia considera reducir el precio a:</p>
<p><strong>G. 90.000</strong></p>
<p>Se estima que las ventas podrían aumentar a:</p>
<p><strong>7.000 unidades.</strong></p>
<p>Calcule para ambos escenarios:</p>
<p><strong>Ingresos = Precio × Cantidad</strong></p>
<p><strong>Costo = Costo unitario × Cantidad</strong></p>
<p><strong>Resultado simplificado = Ingresos − Costos</strong></p>
<p>Luego responda:</p>
<p><strong>¿Qué alternativa parece más conveniente según estos datos?</strong></p>
<p><strong>¿Es suficiente esta información para tomar la decisión definitiva?</strong></p>
<p>El objetivo no es solamente realizar el cálculo.</p>
<p>El estudiante debe comprender que una decisión requiere interpretar el resultado y considerar otras variables.</p>
<hr />
<h1>34. DEBATE</h1>
<h2>“¿Debe una empresa permitir que una Inteligencia Artificial tome decisiones importantes sin intervención humana?”</h2>
<p>Dividir la clase en dos grupos.</p>
<h3>Grupo A</h3>
<p>Defenderá una mayor automatización de decisiones.</p>
<h3>Grupo B</h3>
<p>Defenderá la necesidad de mantener intervención humana.</p>
<p>Analizar:</p>
<ul>
<li>velocidad;</li>
<li>costos;</li>
<li>errores;</li>
<li>sesgos;</li>
<li>responsabilidad;</li>
<li>transparencia;</li>
<li>experiencia;</li>
<li>datos;</li>
<li>consecuencias.</li>
</ul>
<hr />
<h1>35. PENSAMIENTO CRÍTICO</h1>
<p>Una empresa implementa un sistema de Inteligencia Artificial.</p>
<p>Después de seis meses el gerente afirma:</p>
<blockquote>
<p>“Ya no necesito analizar los resultados. El sistema me dice qué decisión tomar.”</p>
</blockquote>
<p>Analice críticamente esta afirmación.</p>
<p>Una recomendación tecnológica puede estar condicionada por:</p>
<ul>
<li>calidad de los datos;</li>
<li>modelo utilizado;</li>
<li>variables consideradas;</li>
<li>información faltante;</li>
<li>contexto;</li>
<li>errores;</li>
<li>cambios del entorno.</li>
</ul>
<p>Por ello, el administrador debe desarrollar la capacidad de <strong>interpretar críticamente la información proporcionada por los sistemas</strong>.</p>
<hr />
<h1>36. SÍNTESIS DE LA UNIDAD</h1>
<p>La tecnología puede apoyar diferentes etapas de la decisión:</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>INFORMACIÓN</strong></p>
<p>↓</p>
<p><strong>ANÁLISIS</strong></p>
<p>↓</p>
<p><strong>ALTERNATIVAS</strong></p>
<p>↓</p>
<p><strong>SIMULACIÓN</strong></p>
<p>↓</p>
<p><strong>RECOMENDACIÓN</strong></p>
<p>↓</p>
<p><strong>DECISIÓN</strong></p>
<p>↓</p>
<p><strong>ACCIÓN</strong></p>
<p>↓</p>
<p><strong>EVALUACIÓN</strong></p>
<p>La competencia profesional fundamental no consiste simplemente en saber utilizar una herramienta.</p>
<p>Consiste en saber:</p>
<p><strong>qué información necesitamos,</strong></p>
<p><strong>qué preguntas debemos realizar,</strong></p>
<p><strong>cómo interpretar los resultados</strong></p>
<p>y</p>
<p><strong>cómo utilizar la tecnología para tomar mejores decisiones.</strong></p>
<hr />
<h1>37. EVALUACIÓN — SELECCIÓN MÚLTIPLE</h1>
<h3>1.</h3>
<p>¿Cuál es la función principal de un TPS?</p>
<p><strong>A.</strong> Registrar transacciones operativas.
<strong>B.</strong> Diseñar páginas web.
<strong>C.</strong> Sustituir a los gerentes.
<strong>D.</strong> Crear redes inalámbricas.</p>
<h3>2.</h3>
<p>¿Qué caracteriza principalmente a un DSS?</p>
<p><strong>A.</strong> Solamente almacena documentos.</p>
<p><strong>B.</strong> Apoya el análisis y evaluación de alternativas.</p>
<p><strong>C.</strong> Solamente registra ventas.</p>
<p><strong>D.</strong> Administra exclusivamente redes.</p>
<h3>3.</h3>
<p>Una empresa modifica el precio dentro de un modelo para observar cómo afecta la utilidad. Está realizando:</p>
<p><strong>A.</strong> Análisis What-if.
<strong>B.</strong> Mantenimiento de hardware.
<strong>C.</strong> Diseño de red.
<strong>D.</strong> Procesamiento de texto.</p>
<h3>4.</h3>
<p>¿Cuál es un ejemplo de decisión semiestructurada?</p>
<p><strong>A.</strong> Registrar automáticamente una venta.</p>
<p><strong>B.</strong> Determinar cuánto inventario comprar utilizando datos y juicio gerencial.</p>
<p><strong>C.</strong> Imprimir una factura.</p>
<p><strong>D.</strong> Guardar una contraseña.</p>
<h3>5.</h3>
<p>Un GDSS está especialmente orientado a:</p>
<p><strong>A.</strong> Decisiones grupales.</p>
<p><strong>B.</strong> Reparación de computadoras.</p>
<p><strong>C.</strong> Creación de dominios.</p>
<p><strong>D.</strong> Instalación de impresoras.</p>
<h3>6.</h3>
<p>¿Cuál es una posible ventaja de un GDSS?</p>
<p><strong>A.</strong> Elimina todos los conflictos.</p>
<p><strong>B.</strong> Permite estructurar y apoyar decisiones donde participan varias personas.</p>
<p><strong>C.</strong> Garantiza decisiones correctas.</p>
<p><strong>D.</strong> Elimina la necesidad de información.</p>
<h3>7.</h3>
<p>Un sistema que utiliza conocimientos y reglas especializadas para generar recomendaciones corresponde a:</p>
<p><strong>A.</strong> Sistema experto.</p>
<p><strong>B.</strong> Switch.</p>
<p><strong>C.</strong> Sistema operativo.</p>
<p><strong>D.</strong> DNS.</p>
<h3>8.</h3>
<p>¿Qué función cumple tradicionalmente el motor de inferencia de un sistema experto?</p>
<p><strong>A.</strong> Imprimir documentos.</p>
<p><strong>B.</strong> Aplicar conocimiento y reglas para obtener conclusiones.</p>
<p><strong>C.</strong> Proporcionar conexión Wi-Fi.</p>
<p><strong>D.</strong> Almacenar físicamente el servidor.</p>
<h3>9.</h3>
<p>¿Cuál de las siguientes afirmaciones es más correcta respecto de un DSS?</p>
<p><strong>A.</strong> Siempre sustituye al gerente.</p>
<p><strong>B.</strong> Garantiza que toda decisión sea correcta.</p>
<p><strong>C.</strong> Proporciona herramientas e información para apoyar al decisor.</p>
<p><strong>D.</strong> Solo puede utilizarse para decisiones financieras.</p>
<h3>10.</h3>
<p>Una IA predice que las ventas disminuirán 15 % el próximo trimestre. ¿Cuál debería ser la actitud más apropiada del administrador?</p>
<p><strong>A.</strong> Ejecutar inmediatamente cualquier recomendación sin analizarla.</p>
<p><strong>B.</strong> Ignorar el resultado porque fue generado por una computadora.</p>
<p><strong>C.</strong> Analizar la predicción, los datos, el contexto y otras variables antes de decidir.</p>
<p><strong>D.</strong> Considerar la predicción como una certeza absoluta.</p>
<h2>CLAVE DE RESPUESTAS</h2>
<p><strong>1-A | 2-B | 3-A | 4-B | 5-A | 6-B | 7-A | 8-B | 9-C | 10-C</strong></p>
<p>Este contenido cubre los temas que el programa exige para la Unidad VII, incluyendo <strong>DSS, GDSS, casos de aplicación, inteligencia artificial, sistemas expertos, sus beneficios y costos, Shell y selección de aplicaciones</strong>. </p>
<p>Además, refuerza uno de los objetivos centrales de ADE18: que el estudiante pueda <strong>analizar herramientas tecnológicas de apoyo para la toma de decisiones en los negocios</strong>. </p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 8,
        "titulo": "Unidad VI: Infraestructura de Redes",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>La <strong>Unidad VI</strong> del programa oficial es <strong>“Infraestructura de Redes y Sistemas Empresariales”</strong> y comprende: comunicación de datos, hardware de apoyo a la comunicación, conectividad, redes computacionales, Internet, dominios, servicios de Internet, Intranet, Extranet y protocolos inalámbricos para Internet. </p>
<p>Propongo desarrollarla como un material universitario completo, con orientación hacia <strong>Administración y negocios</strong>, no como un curso puramente técnico de redes.</p>
<h1>UNIDAD VI — INFRAESTRUCTURA DE REDES Y SISTEMAS EMPRESARIALES</h1>
<p><strong>Asignatura:</strong> Tecnología de la Información y la Comunicación
<strong>Código:</strong> ADE18
<strong>Carrera:</strong> Administración
<strong>Unidad:</strong> VI
<strong>Tema:</strong> Infraestructura de Redes y Sistemas Empresariales</p>
<hr />
<h1>1. INTRODUCCIÓN</h1>
<p>Las organizaciones actuales dependen de la capacidad de intercambiar información de manera rápida, confiable y segura.</p>
<p>Una empresa puede disponer de computadoras, sistemas administrativos, bases de datos y aplicaciones especializadas; sin embargo, si estos recursos funcionan de manera aislada, su capacidad para compartir información es limitada.</p>
<p>Las <strong>redes computacionales</strong> permiten conectar dispositivos, personas, aplicaciones y sistemas para que puedan intercambiar datos y utilizar recursos compartidos.</p>
<p>Gracias a una infraestructura de comunicaciones una organización puede, por ejemplo:</p>
<ul>
<li>compartir archivos;</li>
<li>utilizar sistemas administrativos centralizados;</li>
<li>acceder a bases de datos;</li>
<li>realizar videoconferencias;</li>
<li>utilizar aplicaciones en la nube;</li>
<li>conectar diferentes sucursales;</li>
<li>realizar operaciones comerciales por Internet;</li>
<li>permitir trabajo remoto;</li>
<li>integrar proveedores y clientes;</li>
<li>acceder a información en tiempo real.</li>
</ul>
<p>Por esta razón, las redes constituyen una parte fundamental de la infraestructura tecnológica de una organización.</p>
<hr />
<h1>2. COMUNICACIÓN DE DATOS</h1>
<h2>2.1. Concepto</h2>
<p>La <strong>comunicación de datos</strong> es el proceso mediante el cual dos o más dispositivos intercambian información utilizando un medio de transmisión y un conjunto de reglas previamente establecidas.</p>
<p>Puede representarse de manera simplificada como:</p>
<p><strong>EMISOR → MEDIO DE TRANSMISIÓN → RECEPTOR</strong></p>
<p>Por ejemplo, cuando una computadora envía una factura electrónica a un servidor, existe un dispositivo que origina los datos, una infraestructura que los transporta y otro dispositivo que los recibe.</p>
<h2>2.2. Elementos básicos</h2>
<p>Para que exista comunicación de datos normalmente intervienen:</p>
<h3>Emisor</h3>
<p>Es el dispositivo que origina la información.</p>
<p>Ejemplos:</p>
<ul>
<li>computadora;</li>
<li>teléfono móvil;</li>
<li>servidor;</li>
<li>terminal de ventas;</li>
<li>sensor.</li>
</ul>
<h3>Receptor</h3>
<p>Es el dispositivo que recibe la información.</p>
<h3>Mensaje</h3>
<p>Es la información transmitida.</p>
<p>Puede contener:</p>
<ul>
<li>texto;</li>
<li>imágenes;</li>
<li>documentos;</li>
<li>audio;</li>
<li>video;</li>
<li>registros de una base de datos;</li>
<li>instrucciones.</li>
</ul>
<h3>Medio de transmisión</h3>
<p>Es el canal utilizado para transportar los datos.</p>
<p>Puede ser:</p>
<p><strong>Cableado:</strong> cobre, cable coaxial o fibra óptica.</p>
<p><strong>Inalámbrico:</strong> ondas de radio, Wi-Fi, redes móviles u otras tecnologías.</p>
<h3>Protocolo</h3>
<p>Es el conjunto de reglas que establece cómo debe producirse la comunicación.</p>
<p>Los dispositivos necesitan utilizar reglas compatibles para poder intercambiar correctamente la información.</p>
<hr />
<h1>3. TRANSMISIÓN DE INFORMACIÓN</h1>
<p>Los datos digitales son representados mediante bits.</p>
<p>Un <strong>bit</strong> representa una unidad binaria:</p>
<p><strong>0 o 1</strong></p>
<p>Ocho bits forman normalmente un <strong>byte</strong>.</p>
<p>La velocidad de una conexión de red se expresa habitualmente en <strong>bits por segundo (bps)</strong>.</p>
<p>Algunas unidades utilizadas son:</p>
<ul>
<li>Kbps — kilobits por segundo;</li>
<li>Mbps — megabits por segundo;</li>
<li>Gbps — gigabits por segundo.</li>
</ul>
<p>Es importante no confundir:</p>
<p><strong>MB = megabytes</strong></p>
<p>con</p>
<p><strong>Mb = megabits</strong></p>
<p>Esta diferencia resulta relevante al interpretar velocidades de Internet y tamaños de archivos.</p>
<hr />
<h1>4. ANCHO DE BANDA</h1>
<p>El <strong>ancho de banda</strong> representa la capacidad de transmisión disponible en una conexión.</p>
<p>Puede imaginarse como una carretera.</p>
<p>Una carretera pequeña permite el paso de una cantidad limitada de vehículos. Una carretera con numerosos carriles puede transportar simultáneamente una cantidad mucho mayor.</p>
<p>En una red ocurre algo similar.</p>
<p>Una conexión de mayor capacidad puede transportar más datos por unidad de tiempo.</p>
<p>Sin embargo, una conexión rápida no depende exclusivamente del ancho de banda.</p>
<p>También influyen:</p>
<ul>
<li>congestión;</li>
<li>distancia;</li>
<li>calidad de la infraestructura;</li>
<li>servidores utilizados;</li>
<li>interferencias;</li>
<li>cantidad de usuarios;</li>
<li>configuración de la red.</li>
</ul>
<hr />
<h1>5. LATENCIA</h1>
<p>La <strong>latencia</strong> es el tiempo que tarda la información en desplazarse desde un punto hasta otro y obtener una respuesta.</p>
<p>Una conexión puede tener gran capacidad y, al mismo tiempo, presentar una latencia elevada.</p>
<p>La latencia resulta especialmente importante en:</p>
<ul>
<li>videoconferencias;</li>
<li>llamadas por Internet;</li>
<li>videojuegos;</li>
<li>sistemas interactivos;</li>
<li>operaciones en tiempo real;</li>
<li>acceso remoto.</li>
</ul>
<p>Por ello:</p>
<p><strong>Ancho de banda ≠ latencia.</strong></p>
<p>Son características diferentes de una conexión.</p>
<hr />
<h1>6. HARDWARE DE APOYO A LA COMUNICACIÓN</h1>
<p>Para construir una red se necesitan dispositivos especializados.</p>
<h2>6.1. Tarjeta o interfaz de red</h2>
<p>Permite que un dispositivo pueda conectarse a una red.</p>
<p>Puede proporcionar conexión mediante:</p>
<ul>
<li>Ethernet;</li>
<li>Wi-Fi;</li>
<li>otras tecnologías.</li>
</ul>
<h2>6.2. Switch</h2>
<p>Un <strong>switch</strong> conecta múltiples dispositivos dentro de una misma red local.</p>
<p>Por ejemplo:</p>
<p>Una empresa posee:</p>
<ul>
<li>20 computadoras;</li>
<li>3 impresoras;</li>
<li>2 servidores.</li>
</ul>
<p>Un switch puede permitir que estos dispositivos formen parte de la misma infraestructura local.</p>
<h2>6.3. Router</h2>
<p>El <strong>router</strong> permite interconectar diferentes redes y dirigir el tráfico entre ellas.</p>
<p>En una organización suele intervenir en la conexión entre:</p>
<p><strong>Red interna ↔ otras redes ↔ Internet</strong></p>
<h3>Diferencia fundamental</h3>
<p><strong>Switch:</strong> conecta principalmente dispositivos dentro de una red.</p>
<p><strong>Router:</strong> comunica redes diferentes.</p>
<h2>6.4. Punto de acceso inalámbrico</h2>
<p>El <strong>Access Point (AP)</strong> proporciona conectividad inalámbrica a los dispositivos.</p>
<p>Permite conectar:</p>
<ul>
<li>notebooks;</li>
<li>teléfonos;</li>
<li>tablets;</li>
<li>terminales móviles;</li>
<li>otros dispositivos compatibles.</li>
</ul>
<h2>6.5. Módem</h2>
<p>El módem permite establecer determinados tipos de conexión con la infraestructura del proveedor de telecomunicaciones.</p>
<p>En instalaciones modernas sus funciones pueden estar incorporadas junto con otros equipos.</p>
<h2>6.6. Servidor</h2>
<p>Un servidor es un sistema que proporciona servicios o recursos a otros dispositivos denominados clientes.</p>
<p>Puede existir un:</p>
<ul>
<li>servidor de archivos;</li>
<li>servidor web;</li>
<li>servidor de correo;</li>
<li>servidor de aplicaciones;</li>
<li>servidor de bases de datos;</li>
<li>servidor de autenticación.</li>
</ul>
<hr />
<h1>7. CONECTIVIDAD</h1>
<p>La <strong>conectividad</strong> es la capacidad de los dispositivos y sistemas para establecer comunicación e intercambiar información.</p>
<p>En una organización, disponer de conectividad significa mucho más que simplemente “tener Internet”.</p>
<p>Una infraestructura adecuada debe permitir que los recursos tecnológicos correctos puedan comunicarse de acuerdo con las necesidades de la organización.</p>
<p>Por ejemplo:</p>
<p><strong>Sucursal A → Sistema empresarial → Base de datos central</strong></p>
<p><strong>Sucursal B → Sistema empresarial → Base de datos central</strong></p>
<p><strong>Sucursal C → Sistema empresarial → Base de datos central</strong></p>
<p>El gerente podría entonces consultar información consolidada proveniente de las tres sucursales.</p>
<hr />
<h1>8. REDES COMPUTACIONALES</h1>
<p>Una <strong>red computacional</strong> es un conjunto de dispositivos interconectados que pueden comunicarse y compartir información y recursos.</p>
<p>Los dispositivos conectados pueden incluir:</p>
<ul>
<li>computadoras;</li>
<li>servidores;</li>
<li>teléfonos;</li>
<li>impresoras;</li>
<li>cámaras;</li>
<li>sensores;</li>
<li>terminales de ventas;</li>
<li>dispositivos industriales.</li>
</ul>
<hr />
<h1>9. CLASIFICACIÓN DE LAS REDES SEGÚN SU ALCANCE</h1>
<h2>PAN — Personal Area Network</h2>
<p>Red de alcance personal.</p>
<p>Ejemplo:</p>
<p>Un teléfono conectado mediante Bluetooth a auriculares o a otros dispositivos cercanos.</p>
<h2>LAN — Local Area Network</h2>
<p>Red de área local.</p>
<p>Normalmente conecta dispositivos dentro de un espacio relativamente limitado.</p>
<p>Ejemplos:</p>
<ul>
<li>oficina;</li>
<li>laboratorio;</li>
<li>edificio;</li>
<li>institución educativa.</li>
</ul>
<h2>MAN — Metropolitan Area Network</h2>
<p>Red que puede abarcar un área metropolitana.</p>
<p>Puede interconectar diferentes ubicaciones dentro de una ciudad o área urbana.</p>
<h2>WAN — Wide Area Network</h2>
<p>Red de área extensa.</p>
<p>Permite comunicar dispositivos o redes ubicados a grandes distancias.</p>
<p>Una empresa con oficinas en diferentes ciudades o países puede utilizar infraestructura WAN para integrar sus operaciones.</p>
<hr />
<h1>10. TOPOLOGÍAS DE RED</h1>
<p>La <strong>topología</strong> representa la forma en que los componentes de una red están organizados o interconectados.</p>
<p>Entre las configuraciones tradicionales encontramos:</p>
<h3>Estrella</h3>
<p>Los dispositivos se conectan a un elemento central.</p>
<p>Es ampliamente utilizada en redes locales modernas.</p>
<h3>Bus</h3>
<p>Los dispositivos comparten un medio principal de comunicación.</p>
<p>Tiene importancia histórica y conceptual.</p>
<h3>Anillo</h3>
<p>Los dispositivos forman una estructura circular de comunicación.</p>
<h3>Malla</h3>
<p>Los nodos poseen múltiples conexiones entre sí.</p>
<p>Puede proporcionar mayor redundancia y disponibilidad.</p>
<hr />
<h1>11. MODELO CLIENTE–SERVIDOR</h1>
<p>Muchas aplicaciones empresariales utilizan una arquitectura denominada <strong>cliente-servidor</strong>.</p>
<p>El cliente solicita un recurso o servicio y el servidor responde.</p>
<p>Ejemplo:</p>
<p><strong>Computadora del empleado → solicitud → servidor</strong></p>
<p><strong>Servidor → respuesta → computadora del empleado</strong></p>
<p>Cuando un funcionario consulta los datos de un cliente mediante un sistema empresarial, su dispositivo puede actuar como cliente mientras otro sistema proporciona los datos o servicios requeridos.</p>
<hr />
<h1>12. INTERNET</h1>
<p>Internet es una infraestructura mundial de redes interconectadas que utilizan protocolos compatibles para intercambiar información.</p>
<p>Internet permite que millones de dispositivos y redes puedan comunicarse.</p>
<p>Debe diferenciarse entre:</p>
<p><strong>Internet:</strong> infraestructura global de comunicación.</p>
<p><strong>Web:</strong> uno de los servicios que funciona sobre Internet.</p>
<p>Por lo tanto:</p>
<p><strong>Internet y Web no son exactamente lo mismo.</strong></p>
<hr />
<h1>13. DIRECCIÓN IP</h1>
<p>Para que los dispositivos puedan comunicarse mediante redes basadas en Internet Protocol necesitan mecanismos de direccionamiento.</p>
<p>Una <strong>dirección IP</strong> permite identificar una interfaz o dispositivo dentro de un contexto de red.</p>
<p>Existen dos versiones ampliamente conocidas:</p>
<h3>IPv4</h3>
<p>Ejemplo conceptual:</p>
<p><strong>192.168.1.10</strong></p>
<p>Utiliza direcciones de 32 bits.</p>
<h3>IPv6</h3>
<p>Fue desarrollado, entre otros motivos, para ampliar considerablemente el espacio disponible para direcciones.</p>
<p>Utiliza direcciones de 128 bits.</p>
<hr />
<h1>14. DOMINIOS DE INTERNET</h1>
<p>Recordar números de direcciones IP para acceder a los servicios sería poco práctico.</p>
<p>Por ello existen nombres de dominio.</p>
<p>Ejemplo:</p>
<p><strong><a href="http://www.empresa.com">www.empresa.com</a></strong></p>
<p>Un dominio proporciona un nombre legible que puede asociarse con recursos disponibles en Internet.</p>
<h2>DNS</h2>
<p>El <strong>Domain Name System (DNS)</strong> permite resolver nombres de dominio hacia información necesaria para localizar servicios en la red, como direcciones IP.</p>
<p>Puede comprenderse de manera simplificada como un mecanismo de traducción:</p>
<p><strong>Nombre de dominio → dirección correspondiente</strong></p>
<hr />
<h1>15. ESTRUCTURA DE UN DOMINIO</h1>
<p>Consideremos:</p>
<p><strong>ventas.empresa.com</strong></p>
<p>Podemos identificar diferentes niveles:</p>
<p><strong>.com</strong> → dominio de nivel superior.</p>
<p><strong>empresa</strong> → dominio registrado dentro de ese espacio.</p>
<p><strong>ventas</strong> → subdominio.</p>
<p>Los dominios pueden utilizar diferentes extensiones.</p>
<p>Ejemplos:</p>
<ul>
<li>.com</li>
<li>.org</li>
<li>.edu</li>
<li>.net</li>
</ul>
<p>También existen dominios territoriales asociados con países.</p>
<p>En Paraguay se utiliza:</p>
<p><strong>.py</strong></p>
<hr />
<h1>16. SERVICIOS EN INTERNET</h1>
<p>Internet proporciona infraestructura para numerosos servicios.</p>
<p>Entre ellos:</p>
<h3>World Wide Web</h3>
<p>Acceso a sitios, aplicaciones y contenidos mediante tecnologías web.</p>
<h3>Correo electrónico</h3>
<p>Permite intercambio de mensajes y archivos.</p>
<h3>Transferencia de archivos</h3>
<p>Permite enviar y recibir archivos entre sistemas.</p>
<h3>Videoconferencia</h3>
<p>Permite comunicación audiovisual en tiempo real.</p>
<h3>Mensajería instantánea</h3>
<p>Facilita comunicaciones rápidas entre usuarios.</p>
<h3>Almacenamiento y aplicaciones en la nube</h3>
<p>Permiten utilizar infraestructura y servicios informáticos accesibles mediante redes.</p>
<h3>Comercio electrónico</h3>
<p>Permite realizar operaciones comerciales mediante plataformas digitales.</p>
<hr />
<h1>17. INTERNET EN LA EMPRESA</h1>
<p>Para una organización, Internet puede utilizarse para:</p>
<p><strong>Comunicación</strong></p>
<p>Correo, videoconferencias y mensajería.</p>
<p><strong>Marketing</strong></p>
<p>Sitios web, redes sociales y publicidad digital.</p>
<p><strong>Ventas</strong></p>
<p>Comercio electrónico y plataformas de pedidos.</p>
<p><strong>Administración</strong></p>
<p>Sistemas empresariales accesibles mediante Internet.</p>
<p><strong>Atención al cliente</strong></p>
<p>Portales, chat, seguimiento y soporte.</p>
<p><strong>Trabajo remoto</strong></p>
<p>Acceso autorizado a recursos empresariales desde ubicaciones externas.</p>
<hr />
<h1>18. INTRANET</h1>
<p>Una <strong>Intranet</strong> es una red o entorno privado de información utilizado dentro de una organización y basado frecuentemente en tecnologías similares a las empleadas en Internet.</p>
<p>Puede contener:</p>
<ul>
<li>documentos internos;</li>
<li>reglamentos;</li>
<li>procedimientos;</li>
<li>formularios;</li>
<li>noticias institucionales;</li>
<li>sistemas administrativos;</li>
<li>recursos humanos;</li>
<li>manuales;</li>
<li>calendarios.</li>
</ul>
<p>Ejemplo:</p>
<p>Una empresa dispone de un portal al que solamente pueden acceder sus empleados.</p>
<p>Ese portal puede formar parte de su Intranet.</p>
<hr />
<h1>19. EXTRANET</h1>
<p>Una <strong>Extranet</strong> extiende determinados recursos o servicios organizacionales hacia usuarios externos autorizados.</p>
<p>Estos pueden ser:</p>
<ul>
<li>proveedores;</li>
<li>distribuidores;</li>
<li>clientes;</li>
<li>socios comerciales.</li>
</ul>
<p>Ejemplo:</p>
<p>Una empresa permite que sus proveedores ingresen a un portal privado para verificar órdenes de compra.</p>
<p>Esto representa una aplicación típica de Extranet.</p>
<hr />
<h1>20. INTERNET, INTRANET Y EXTRANET</h1>
<p>La diferencia fundamental se encuentra principalmente en el alcance y en quién puede acceder.</p>
<p><strong>Internet</strong></p>
<p>Acceso público/global según el servicio publicado.</p>
<p><strong>Intranet</strong></p>
<p>Acceso restringido principalmente a miembros de una organización.</p>
<p><strong>Extranet</strong></p>
<p>Acceso controlado que incorpora determinados usuarios externos autorizados.</p>
<p>Ejemplo empresarial:</p>
<p><strong>Internet:</strong> página pública de una empresa.</p>
<p><strong>Intranet:</strong> portal interno de empleados.</p>
<p><strong>Extranet:</strong> portal privado para proveedores.</p>
<hr />
<h1>21. PROTOCOLOS DE COMUNICACIÓN</h1>
<p>Un protocolo establece reglas para que los sistemas puedan comunicarse.</p>
<p>Sin reglas comunes, los dispositivos no podrían interpretar correctamente los mensajes intercambiados.</p>
<h2>TCP/IP</h2>
<p>La familia de protocolos TCP/IP constituye una base fundamental de las comunicaciones en Internet y numerosas redes empresariales.</p>
<p>De manera simplificada:</p>
<p><strong>IP</strong> participa en el direccionamiento y encaminamiento de paquetes.</p>
<p><strong>TCP</strong> proporciona mecanismos para una comunicación confiable entre aplicaciones cuando se utiliza este protocolo de transporte.</p>
<hr />
<h1>22. HTTP Y HTTPS</h1>
<h2>HTTP</h2>
<p><strong>Hypertext Transfer Protocol</strong></p>
<p>Se utiliza para la comunicación de recursos y aplicaciones web.</p>
<h2>HTTPS</h2>
<p>Es HTTP utilizado con mecanismos criptográficos de seguridad proporcionados mediante TLS.</p>
<p>Permite proteger la comunicación entre cliente y servidor frente a diversos riesgos de interceptación o modificación durante el tránsito.</p>
<p>Para una empresa que maneja:</p>
<ul>
<li>contraseñas;</li>
<li>información personal;</li>
<li>pagos;</li>
<li>documentos;</li>
<li>datos administrativos;</li>
</ul>
<p>la protección de las comunicaciones es fundamental.</p>
<hr />
<h1>23. PROTOCOLOS INALÁMBRICOS</h1>
<p>Las comunicaciones inalámbricas permiten intercambiar información sin necesidad de un cable físico entre los dispositivos.</p>
<h2>Wi-Fi</h2>
<p>Permite establecer redes locales inalámbricas.</p>
<p>Es ampliamente utilizado en:</p>
<ul>
<li>hogares;</li>
<li>oficinas;</li>
<li>universidades;</li>
<li>comercios;</li>
<li>instituciones públicas.</li>
</ul>
<h2>Bluetooth</h2>
<p>Tecnología inalámbrica utilizada principalmente para comunicaciones de corto alcance.</p>
<p>Ejemplos:</p>
<ul>
<li>auriculares;</li>
<li>teclados;</li>
<li>dispositivos móviles;</li>
<li>periféricos;</li>
<li>determinados sensores.</li>
</ul>
<h2>Redes móviles</h2>
<p>Las tecnologías celulares permiten conectividad a través de infraestructura proporcionada por operadores de telecomunicaciones.</p>
<p>Las generaciones tecnológicas han evolucionado desde sistemas anteriores hasta tecnologías como 4G y 5G.</p>
<hr />
<h1>24. RED CABLEADA VS. RED INALÁMBRICA</h1>
<p>No existe una solución universalmente superior. La elección depende de los requerimientos.</p>
<h3>Cableada</h3>
<p>Puede proporcionar:</p>
<ul>
<li>estabilidad;</li>
<li>altas velocidades;</li>
<li>menor exposición a determinadas interferencias;</li>
<li>conexiones predecibles.</li>
</ul>
<p>Pero requiere infraestructura física.</p>
<h3>Inalámbrica</h3>
<p>Proporciona:</p>
<ul>
<li>movilidad;</li>
<li>flexibilidad;</li>
<li>facilidad de conexión;</li>
<li>menor dependencia del cableado hasta el dispositivo.</li>
</ul>
<p>Sin embargo, deben considerarse:</p>
<ul>
<li>cobertura;</li>
<li>interferencias;</li>
<li>capacidad;</li>
<li>seguridad;</li>
<li>cantidad de usuarios.</li>
</ul>
<p>Las organizaciones frecuentemente utilizan una combinación de ambas.</p>
<hr />
<h1>25. SEGURIDAD BÁSICA DE UNA RED EMPRESARIAL</h1>
<p>Aunque el programa de esta unidad se concentra en infraestructura y conectividad, no puede comprenderse una red empresarial sin introducir el concepto de seguridad.</p>
<p>Una organización debería considerar, entre otros aspectos:</p>
<ul>
<li>autenticación de usuarios;</li>
<li>contraseñas seguras;</li>
<li>permisos de acceso;</li>
<li>actualización de equipos;</li>
<li>cifrado;</li>
<li>segmentación;</li>
<li>copias de seguridad;</li>
<li>protección frente a software malicioso;</li>
<li>monitoreo;</li>
<li>políticas de uso.</li>
</ul>
<p>Una red empresarial no debe diseñarse solamente pensando:</p>
<p><strong>“¿Cómo conectamos todo?”</strong></p>
<p>También debe preguntarse:</p>
<p><strong>“¿Qué debe conectarse, quién debe acceder y bajo qué condiciones?”</strong></p>
<hr />
<h1>26. INFRAESTRUCTURA DE RED COMO RECURSO EMPRESARIAL</h1>
<p>Desde la perspectiva administrativa, la infraestructura tecnológica constituye una inversión que debe responder a las necesidades del negocio.</p>
<p>Una organización debe considerar:</p>
<h3>Disponibilidad</h3>
<p>¿Los sistemas estarán disponibles cuando sean necesarios?</p>
<h3>Rendimiento</h3>
<p>¿La infraestructura soportará la cantidad de usuarios y operaciones?</p>
<h3>Escalabilidad</h3>
<p>¿Podrá crecer si aumenta la empresa?</p>
<h3>Seguridad</h3>
<p>¿La información estará adecuadamente protegida?</p>
<h3>Costos</h3>
<p>¿Cuánto cuesta adquirir, implementar, mantener y actualizar la infraestructura?</p>
<h3>Continuidad</h3>
<p>¿Qué sucederá si falla Internet, un router, un servidor o un enlace entre sucursales?</p>
<hr />
<h1>27. CASO DE ESTUDIO — COMERCIAL CENTURIA S.A.</h1>
<p>Una empresa paraguaya posee:</p>
<ul>
<li>casa central en Asunción;</li>
<li>sucursal en San Lorenzo;</li>
<li>sucursal en Ciudad del Este;</li>
<li>60 funcionarios;</li>
<li>sistema de ventas;</li>
<li>sistema de inventario;</li>
<li>correo electrónico;</li>
<li>página web;</li>
<li>vendedores que utilizan notebooks;</li>
<li>proveedores que necesitan consultar órdenes de compra.</li>
</ul>
<p>Actualmente cada sucursal administra información parcialmente independiente.</p>
<p>La gerencia desea integrar las operaciones.</p>
<h2>Problemas identificados</h2>
<ol>
<li>
<p>Los inventarios no se actualizan inmediatamente entre sucursales.</p>
</li>
<li>
<p>Los gerentes reciben informes con retraso.</p>
</li>
<li>
<p>Los vendedores necesitan consultar disponibilidad de productos.</p>
</li>
<li>
<p>Los proveedores solicitan información sobre sus órdenes.</p>
</li>
<li>
<p>Los funcionarios necesitan acceder a documentos institucionales.</p>
</li>
</ol>
<h2>Solución conceptual</h2>
<p>La organización podría desarrollar una infraestructura donde:</p>
<p><strong>LAN de cada sucursal</strong></p>
<p>↓</p>
<p><strong>Conectividad entre ubicaciones y servicios empresariales</strong></p>
<p>↓</p>
<p><strong>Sistemas centralizados o integrados</strong></p>
<p>↓</p>
<p><strong>Base de datos</strong></p>
<p>Además:</p>
<p><strong>Intranet → funcionarios</strong></p>
<p><strong>Extranet → proveedores autorizados</strong></p>
<p><strong>Internet → clientes y servicios públicos</strong></p>
<p>De esta manera, la red deja de ser simplemente infraestructura técnica y se convierte en un elemento que permite integrar procesos empresariales.</p>
<hr />
<h1>28. ACTIVIDAD PRÁCTICA</h1>
<h2>“Diseñando la red de una empresa”</h2>
<h3>Situación</h3>
<p>Una empresa posee:</p>
<ul>
<li>25 empleados;</li>
<li>20 computadoras;</li>
<li>5 notebooks;</li>
<li>3 impresoras;</li>
<li>1 servidor;</li>
<li>conexión a Internet;</li>
<li>área administrativa;</li>
<li>área comercial;</li>
<li>depósito;</li>
<li>sala de reuniones.</li>
</ul>
<p>La empresa necesita:</p>
<ul>
<li>compartir archivos;</li>
<li>acceder a Internet;</li>
<li>utilizar impresoras compartidas;</li>
<li>conectarse mediante Wi-Fi;</li>
<li>acceder al sistema administrativo;</li>
<li>realizar videoconferencias.</li>
</ul>
<h3>Consigna</h3>
<p>En grupos, diseñar conceptualmente la infraestructura de red.</p>
<p>El esquema debe incluir como mínimo:</p>
<p><strong>Internet → Router → Switch → Equipos</strong></p>
<p>y considerar:</p>
<ul>
<li>servidor;</li>
<li>computadoras;</li>
<li>impresoras;</li>
<li>puntos de acceso Wi-Fi;</li>
<li>notebooks.</li>
</ul>
<p>Posteriormente responder:</p>
<ol>
<li>
<p>¿Qué función cumple el router?</p>
</li>
<li>
<p>¿Qué función cumple el switch?</p>
</li>
<li>
<p>¿Por qué utilizarían Wi-Fi?</p>
</li>
<li>
<p>¿Qué recursos deberían protegerse especialmente?</p>
</li>
<li>
<p>¿Qué sucedería con la empresa si la red deja de funcionar durante toda una jornada?</p>
</li>
</ol>
<hr />
<h1>29. SITUACIÓN PROBLEMÁTICA</h1>
<p>Una empresa contrata una conexión a Internet de alta velocidad.</p>
<p>El gerente afirma:</p>
<blockquote>
<p>“Ahora nuestra infraestructura tecnológica es excelente porque tenemos Internet muy rápido.”</p>
</blockquote>
<p>Analice la afirmación.</p>
<p>La velocidad de Internet constituye solamente una variable.</p>
<p>Una infraestructura empresarial debe considerar además:</p>
<ul>
<li>diseño de la red;</li>
<li>equipos;</li>
<li>disponibilidad;</li>
<li>seguridad;</li>
<li>redundancia;</li>
<li>servidores;</li>
<li>sistemas;</li>
<li>cantidad de usuarios;</li>
<li>mantenimiento;</li>
<li>necesidades reales del negocio.</li>
</ul>
<p>Por ello, <strong>mayor velocidad de Internet no significa automáticamente mejor infraestructura tecnológica empresarial</strong>.</p>
<hr />
<h1>30. PREGUNTAS PARA DISCUSIÓN</h1>
<ol>
<li>
<p>¿Puede funcionar actualmente una empresa sin Internet?</p>
</li>
<li>
<p>¿Qué actividades podrían continuar si una organización pierde su conexión durante ocho horas?</p>
</li>
<li>
<p>¿Qué diferencia existe entre tener Internet y disponer de una infraestructura de red empresarial?</p>
</li>
<li>
<p>¿Por qué una empresa debería separar determinados accesos internos de los accesos de clientes y proveedores?</p>
</li>
<li>
<p>¿Qué riesgos aparecen cuando todos los empleados comparten una misma contraseña Wi-Fi?</p>
</li>
<li>
<p>¿Qué consecuencias económicas puede producir una falla de red?</p>
</li>
<li>
<p>¿Una red inalámbrica puede reemplazar completamente una red cableada en cualquier organización?</p>
</li>
<li>
<p>¿La infraestructura tecnológica representa un gasto o una inversión?</p>
</li>
</ol>
<hr />
<h1>31. SÍNTESIS DE LA UNIDAD</h1>
<p>Al finalizar esta unidad debemos comprender una idea central:</p>
<p><strong>Las redes permiten que la información circule dentro y fuera de una organización.</strong></p>
<p>La secuencia conceptual puede representarse como:</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>DISPOSITIVOS</strong></p>
<p>↓</p>
<p><strong>RED</strong></p>
<p>↓</p>
<p><strong>COMUNICACIÓN</strong></p>
<p>↓</p>
<p><strong>SISTEMAS EMPRESARIALES</strong></p>
<p>↓</p>
<p><strong>INFORMACIÓN</strong></p>
<p>↓</p>
<p><strong>DECISIONES</strong></p>
<p>La infraestructura de red no constituye un objetivo por sí misma.</p>
<p>Su verdadero valor empresarial aparece cuando permite:</p>
<ul>
<li>integrar personas;</li>
<li>conectar procesos;</li>
<li>compartir recursos;</li>
<li>acceder a sistemas;</li>
<li>reducir tiempos;</li>
<li>mejorar la comunicación;</li>
<li>obtener información oportunamente;</li>
<li>apoyar las decisiones de la organización.</li>
</ul>
<hr />
<h1>32. EVALUACIÓN — SELECCIÓN MÚLTIPLE</h1>
<h3>1.</h3>
<p>¿Cuál es la función principal de un switch en una red local?</p>
<p><strong>A.</strong> Crear páginas web.
<strong>B.</strong> Conectar dispositivos dentro de una red.
<strong>C.</strong> Registrar dominios.
<strong>D.</strong> Crear bases de datos.</p>
<h3>2.</h3>
<p>¿Qué dispositivo se utiliza principalmente para comunicar diferentes redes?</p>
<p><strong>A.</strong> Router.
<strong>B.</strong> Teclado.
<strong>C.</strong> Impresora.
<strong>D.</strong> Monitor.</p>
<h3>3.</h3>
<p>Una red dentro de una oficina corresponde normalmente a:</p>
<p><strong>A.</strong> PAN.
<strong>B.</strong> LAN.
<strong>C.</strong> MAN.
<strong>D.</strong> WAN.</p>
<h3>4.</h3>
<p>¿Qué sistema permite relacionar nombres de dominio con información de direccionamiento necesaria para localizar servicios?</p>
<p><strong>A.</strong> DNS.
<strong>B.</strong> CPU.
<strong>C.</strong> USB.
<strong>D.</strong> RAM.</p>
<h3>5.</h3>
<p>Una plataforma privada utilizada solamente por funcionarios de una empresa corresponde a:</p>
<p><strong>A.</strong> Internet.
<strong>B.</strong> Extranet.
<strong>C.</strong> Intranet.
<strong>D.</strong> Web pública.</p>
<h3>6.</h3>
<p>Una empresa proporciona acceso privado a determinados proveedores para consultar órdenes de compra. Esto constituye:</p>
<p><strong>A.</strong> Intranet.
<strong>B.</strong> Extranet.
<strong>C.</strong> PAN.
<strong>D.</strong> DNS.</p>
<h3>7.</h3>
<p>¿Cuál de las siguientes tecnologías permite crear redes locales inalámbricas?</p>
<p><strong>A.</strong> Wi-Fi.
<strong>B.</strong> HDMI.
<strong>C.</strong> SSD.
<strong>D.</strong> CPU.</p>
<h3>8.</h3>
<p>¿Cuál es la diferencia fundamental entre Internet y Web?</p>
<p><strong>A.</strong> No existe ninguna diferencia.</p>
<p><strong>B.</strong> Internet es la infraestructura global de redes y la Web es uno de los servicios que funciona sobre ella.</p>
<p><strong>C.</strong> Internet solamente funciona en teléfonos.</p>
<p><strong>D.</strong> La Web es la infraestructura física de Internet.</p>
<h3>9.</h3>
<p>Una conexión posee gran ancho de banda pero demora en responder. ¿Qué variable podría estar afectando la experiencia?</p>
<p><strong>A.</strong> Latencia.
<strong>B.</strong> Tamaño del monitor.
<strong>C.</strong> Capacidad del teclado.
<strong>D.</strong> Resolución de la impresora.</p>
<h3>10.</h3>
<p>¿Por qué las redes son estratégicamente importantes para las organizaciones?</p>
<p><strong>A.</strong> Porque eliminan la necesidad de administrar información.</p>
<p><strong>B.</strong> Porque solamente permiten navegar por Internet.</p>
<p><strong>C.</strong> Porque permiten integrar dispositivos, personas, información, aplicaciones y procesos.</p>
<p><strong>D.</strong> Porque sustituyen completamente a los trabajadores.</p>
<h2>Respuestas</h2>
<p><strong>1-B | 2-A | 3-B | 4-A | 5-C | 6-B | 7-A | 8-B | 9-A | 10-C</strong></p>
<p>Este desarrollo cubre <strong>todos los contenidos expresamente establecidos para la Unidad VI en el programa ADE18</strong>: comunicación de datos, hardware de comunicación, conectividad, redes, Internet, dominios, servicios, Intranet, Extranet y protocolos inalámbricos. </p>
<p>Además, mantuve el enfoque empresarial del programa: el objetivo no es formar técnicos instaladores de redes, sino que el futuro administrador comprenda la infraestructura tecnológica disponible para las organizaciones, coherente con los objetivos de la asignatura. </p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 9,
        "titulo": "Unidad VII: Apoyo a la Toma de Decisiones (Parte II)",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>La <strong>Unidad VII</strong> del programa ADE18 es <strong>“Tecnologías de Apoyo a la Toma de Decisiones”</strong>. El programa incluye sistemas transaccionales, proceso de toma de decisiones, DSS, GDSS, diseño de salas, casos de aplicación, inteligencia artificial y sistemas expertos. </p>
<p>A continuación, el material desarrollado manteniendo esa estructura y con orientación universitaria hacia Administración.</p>
<h1>UNIDAD VII — TECNOLOGÍAS DE APOYO A LA TOMA DE DECISIONES</h1>
<p><strong>Asignatura:</strong> Tecnología de la Información y la Comunicación
<strong>Código:</strong> ADE18
<strong>Carrera:</strong> Administración
<strong>Unidad:</strong> VII
<strong>Enfoque:</strong> Sistemas de información, análisis y toma de decisiones empresariales</p>
<hr />
<h1>1. INTRODUCCIÓN: DE REGISTRAR DATOS A TOMAR DECISIONES</h1>
<p>Las organizaciones generan diariamente grandes cantidades de datos:</p>
<ul>
<li>ventas;</li>
<li>compras;</li>
<li>pagos;</li>
<li>inventarios;</li>
<li>movimientos bancarios;</li>
<li>clientes;</li>
<li>proveedores;</li>
<li>costos;</li>
<li>asistencia;</li>
<li>producción;</li>
<li>reclamos;</li>
<li>operaciones administrativas.</li>
</ul>
<p>Registrar estos datos es necesario, pero no suficiente.</p>
<p>El verdadero valor aparece cuando la organización puede convertirlos en <strong>información útil para tomar decisiones</strong>.</p>
<p>Por ejemplo:</p>
<p>Un sistema registra que durante seis meses las ventas fueron:</p>
<p><strong>Enero:</strong> G. 120 millones
<strong>Febrero:</strong> G. 125 millones
<strong>Marzo:</strong> G. 118 millones
<strong>Abril:</strong> G. 110 millones
<strong>Mayo:</strong> G. 103 millones
<strong>Junio:</strong> G. 95 millones</p>
<p>Los registros representan información histórica.</p>
<p>Pero la administración necesita responder preguntas de mayor nivel:</p>
<p><strong>¿Por qué están disminuyendo las ventas?</strong></p>
<p><strong>¿Continuará la tendencia?</strong></p>
<p><strong>¿Qué productos están provocando la caída?</strong></p>
<p><strong>¿Qué sucedería si reducimos los precios?</strong></p>
<p><strong>¿Conviene aumentar la publicidad?</strong></p>
<p><strong>¿Qué decisión debería tomar la gerencia?</strong></p>
<p>Las tecnologías de apoyo a las decisiones permiten avanzar desde el simple registro de operaciones hacia el <strong>análisis, comparación, simulación y evaluación de alternativas</strong>.</p>
<hr />
<h1>2. PLATAFORMA DE SISTEMAS TRANSACCIONALES</h1>
<p>Los <strong>Sistemas de Procesamiento de Transacciones (TPS)</strong> registran las operaciones rutinarias de una organización.</p>
<p>Ejemplos:</p>
<ul>
<li>venta realizada;</li>
<li>factura emitida;</li>
<li>compra registrada;</li>
<li>pago recibido;</li>
<li>salario abonado;</li>
<li>producto ingresado;</li>
<li>transferencia realizada;</li>
<li>inscripción de un estudiante;</li>
<li>reserva confirmada.</li>
</ul>
<p>Cada operación genera datos.</p>
<p>Por ejemplo:</p>
<p><strong>VENTA</strong></p>
<p>Cliente: María González
Producto: Notebook
Cantidad: 1
Precio: G. 4.500.000
Sucursal: San Lorenzo
Fecha: 08/09/2026
Vendedor: Juan López</p>
<p>Una venta individual puede tener poco valor para una decisión estratégica.</p>
<p>Pero miles de operaciones acumuladas permiten analizar:</p>
<ul>
<li>productos más vendidos;</li>
<li>clientes principales;</li>
<li>horarios de mayor venta;</li>
<li>sucursales con mejor rendimiento;</li>
<li>evolución mensual;</li>
<li>comportamiento de precios;</li>
<li>niveles de inventario.</li>
</ul>
<p>Por esta razón, los sistemas transaccionales constituyen una importante <strong>fuente de datos para sistemas de apoyo gerencial y de decisiones</strong>.</p>
<hr />
<h1>3. DEL TPS A LA DECISIÓN</h1>
<p>Podemos representar el proceso de la siguiente manera:</p>
<p><strong>TRANSACCIONES</strong></p>
<p>↓</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>BASE DE DATOS</strong></p>
<p>↓</p>
<p><strong>PROCESAMIENTO Y ANÁLISIS</strong></p>
<p>↓</p>
<p><strong>INFORMACIÓN</strong></p>
<p>↓</p>
<p><strong>ALTERNATIVAS</strong></p>
<p>↓</p>
<p><strong>DECISIÓN</strong></p>
<p>↓</p>
<p><strong>ACCIÓN</strong></p>
<p>Ejemplo:</p>
<p><strong>TPS:</strong> registra 25.000 ventas.</p>
<p>↓</p>
<p><strong>Análisis:</strong> identifica caída del 18 % en determinada categoría.</p>
<p>↓</p>
<p><strong>DSS:</strong> compara posibles estrategias.</p>
<p>↓</p>
<p><strong>Gerente:</strong> selecciona una alternativa.</p>
<p>↓</p>
<p><strong>Empresa:</strong> implementa la decisión.</p>
<p>La tecnología no necesariamente toma la decisión final.</p>
<p>Su función principal puede ser <strong>mejorar la calidad de la información disponible para quien debe decidir</strong>.</p>
<hr />
<h1>4. EL PROCESO DE TOMA DE DECISIONES</h1>
<p>Tomar una decisión significa seleccionar una alternativa entre diferentes posibilidades para alcanzar un objetivo o resolver un problema.</p>
<p>En administración, las decisiones pueden relacionarse con:</p>
<ul>
<li>inversiones;</li>
<li>contratación;</li>
<li>producción;</li>
<li>marketing;</li>
<li>financiamiento;</li>
<li>inventario;</li>
<li>expansión;</li>
<li>proveedores;</li>
<li>precios;</li>
<li>tecnología.</li>
</ul>
<p>Una decisión empresarial debería apoyarse en información relevante y no exclusivamente en intuición.</p>
<hr />
<h1>5. ETAPAS DEL PROCESO DE DECISIÓN</h1>
<p>Un proceso de decisión puede estructurarse en varias etapas.</p>
<h2>5.1. Identificación del problema</h2>
<p>Primero debemos reconocer que existe una situación que requiere intervención.</p>
<p>Ejemplo:</p>
<p><strong>Las ventas disminuyeron un 20 %.</strong></p>
<p>Pero detectar el síntoma no significa conocer el problema.</p>
<p>La disminución podría deberse a:</p>
<ul>
<li>aumento de precios;</li>
<li>nuevos competidores;</li>
<li>falta de inventario;</li>
<li>mala atención;</li>
<li>cambios en los consumidores;</li>
<li>problemas económicos;</li>
<li>publicidad insuficiente.</li>
</ul>
<hr />
<h2>5.2. Recolección de información</h2>
<p>Se obtienen datos relacionados con el problema.</p>
<p>Por ejemplo:</p>
<ul>
<li>ventas históricas;</li>
<li>precios;</li>
<li>inventarios;</li>
<li>clientes;</li>
<li>competidores;</li>
<li>costos;</li>
<li>campañas;</li>
<li>reclamos.</li>
</ul>
<hr />
<h2>5.3. Análisis</h2>
<p>Los datos son procesados para identificar:</p>
<ul>
<li>tendencias;</li>
<li>patrones;</li>
<li>relaciones;</li>
<li>anomalías;</li>
<li>causas posibles.</li>
</ul>
<hr />
<h2>5.4. Generación de alternativas</h2>
<p>Se identifican diferentes opciones.</p>
<p>Ejemplo:</p>
<p><strong>Alternativa A:</strong> reducir precios.</p>
<p><strong>Alternativa B:</strong> aumentar publicidad.</p>
<p><strong>Alternativa C:</strong> introducir nuevos productos.</p>
<p><strong>Alternativa D:</strong> cerrar productos poco rentables.</p>
<hr />
<h2>5.5. Evaluación de alternativas</h2>
<p>Se estudian:</p>
<ul>
<li>costos;</li>
<li>beneficios;</li>
<li>riesgos;</li>
<li>recursos;</li>
<li>impacto;</li>
<li>tiempo;</li>
<li>viabilidad.</li>
</ul>
<hr />
<h2>5.6. Selección</h2>
<p>La administración elige la alternativa considerada más conveniente.</p>
<hr />
<h2>5.7. Implementación</h2>
<p>La decisión se transforma en acciones concretas.</p>
<hr />
<h2>5.8. Evaluación</h2>
<p>Finalmente se analizan los resultados.</p>
<p>Una decisión administrativa no termina cuando se selecciona una alternativa.</p>
<p>Debe comprobarse:</p>
<p><strong>¿Funcionó?</strong></p>
<hr />
<h1>6. TIPOS DE DECISIONES</h1>
<h2>Decisiones estructuradas</h2>
<p>Son repetitivas y poseen reglas relativamente claras.</p>
<p>Ejemplo:</p>
<p>Si el inventario baja del mínimo establecido, generar una orden de reposición.</p>
<p>Pueden automatizarse con mayor facilidad.</p>
<hr />
<h2>Decisiones semiestructuradas</h2>
<p>Una parte puede resolverse mediante reglas o análisis, pero otra requiere juicio humano.</p>
<p>Ejemplo:</p>
<p>Determinar cuánto inventario comprar para los próximos tres meses.</p>
<p>El sistema puede proporcionar:</p>
<ul>
<li>ventas históricas;</li>
<li>tendencias;</li>
<li>costos;</li>
<li>proyecciones.</li>
</ul>
<p>Pero el gerente puede considerar factores adicionales.</p>
<hr />
<h2>Decisiones no estructuradas</h2>
<p>Son complejas, poco frecuentes y no poseen una solución predeterminada.</p>
<p>Ejemplos:</p>
<ul>
<li>ingresar a un nuevo mercado;</li>
<li>adquirir otra empresa;</li>
<li>cambiar el modelo de negocio;</li>
<li>realizar una inversión estratégica.</li>
</ul>
<p>En estas decisiones la experiencia y el juicio directivo tienen un papel importante.</p>
<hr />
<h1>7. SISTEMAS DE APOYO A LA TOMA DE DECISIONES — DSS</h1>
<p><strong>DSS</strong> significa:</p>
<p><strong>Decision Support System</strong></p>
<p>o</p>
<p><strong>Sistema de Apoyo a la Toma de Decisiones.</strong></p>
<p>Es un sistema diseñado para proporcionar información, modelos y herramientas analíticas que ayuden a las personas a evaluar problemas y alternativas.</p>
<p>Su finalidad fundamental es <strong>apoyar al decisor</strong>.</p>
<hr />
<h1>8. CARACTERÍSTICAS DE LOS DSS</h1>
<p>Un DSS puede:</p>
<ul>
<li>integrar información;</li>
<li>consultar datos;</li>
<li>analizar tendencias;</li>
<li>comparar alternativas;</li>
<li>realizar simulaciones;</li>
<li>generar escenarios;</li>
<li>utilizar modelos;</li>
<li>presentar información gráficamente;</li>
<li>responder preguntas del tipo “¿qué pasaría si...?”.</li>
</ul>
<p>Una característica importante es la <strong>interactividad</strong>.</p>
<p>El usuario puede modificar determinadas variables y observar cómo cambian los resultados.</p>
<hr />
<h1>9. ANÁLISIS “WHAT-IF”</h1>
<p>Una de las herramientas conceptuales más importantes es el análisis:</p>
<p><strong>What if? — ¿Qué pasaría si...?</strong></p>
<p>Ejemplo:</p>
<p>Una empresa vende un producto a:</p>
<p><strong>Precio:</strong> G. 100.000
<strong>Ventas:</strong> 1.000 unidades</p>
<p>La gerencia desea analizar:</p>
<p><strong>¿Qué sucedería si reducimos el precio un 10 % y las ventas aumentan un 25 %?</strong></p>
<p>Un sistema de apoyo puede calcular diferentes escenarios antes de implementar la decisión.</p>
<p>Otros ejemplos:</p>
<p><strong>¿Qué ocurre si el dólar aumenta 15 %?</strong></p>
<p><strong>¿Qué sucede si las ventas disminuyen 20 %?</strong></p>
<p><strong>¿Qué ocurre si contratamos cinco vendedores adicionales?</strong></p>
<p><strong>¿Qué sucede si aumentamos la inversión publicitaria?</strong></p>
<p>El DSS permite explorar posibles consecuencias.</p>
<hr />
<h1>10. ANÁLISIS DE SENSIBILIDAD</h1>
<p>El análisis de sensibilidad estudia cómo cambia un resultado cuando se modifica una o varias variables.</p>
<p>Por ejemplo:</p>
<p>Una empresa analiza su utilidad modificando el precio:</p>
<p><strong>Precio A:</strong> G. 80.000
<strong>Precio B:</strong> G. 90.000
<strong>Precio C:</strong> G. 100.000
<strong>Precio D:</strong> G. 110.000</p>
<p>El objetivo es comprender qué variables tienen mayor influencia sobre los resultados.</p>
<hr />
<h1>11. ANÁLISIS DE ESCENARIOS</h1>
<p>Una organización puede construir diferentes escenarios futuros.</p>
<h3>Escenario optimista</h3>
<ul>
<li>aumento de ventas;</li>
<li>reducción de costos;</li>
<li>crecimiento económico.</li>
</ul>
<h3>Escenario probable</h3>
<ul>
<li>comportamiento esperado según información disponible.</li>
</ul>
<h3>Escenario pesimista</h3>
<ul>
<li>caída de ventas;</li>
<li>aumento de costos;</li>
<li>dificultades económicas.</li>
</ul>
<p>Esto permite preparar decisiones antes de que ocurran determinadas situaciones.</p>
<hr />
<h1>12. COMPONENTES CONCEPTUALES DE UN DSS</h1>
<p>Un DSS puede integrar varios elementos.</p>
<h3>Datos</h3>
<p>Información interna y externa.</p>
<h3>Modelos</h3>
<p>Representaciones matemáticas, financieras, estadísticas o lógicas.</p>
<h3>Software</h3>
<p>Herramientas para realizar cálculos, consultas y simulaciones.</p>
<h3>Interfaz</h3>
<p>Permite al usuario interactuar con el sistema.</p>
<h3>Usuario decisor</h3>
<p>Persona responsable de analizar los resultados y tomar decisiones.</p>
<hr />
<h1>13. CASO DE APLICACIÓN DE UN DSS</h1>
<h2>Supermercados Centuria</h2>
<p>La empresa debe decidir dónde abrir una nueva sucursal.</p>
<p>Tiene tres posibles ubicaciones:</p>
<p><strong>San Lorenzo</strong></p>
<p><strong>Luque</strong></p>
<p><strong>Fernando de la Mora</strong></p>
<p>La decisión considera:</p>
<ul>
<li>población;</li>
<li>alquiler;</li>
<li>competencia;</li>
<li>tránsito;</li>
<li>ingresos promedio;</li>
<li>distancia de proveedores;</li>
<li>costo de instalación;</li>
<li>ventas estimadas.</li>
</ul>
<p>Un DSS podría permitir asignar valores a estas variables y comparar las alternativas.</p>
<p>El gerente podría preguntar:</p>
<p><strong>¿Qué ubicación obtiene mejores resultados?</strong></p>
<p>Después:</p>
<p><strong>¿Qué sucede si el alquiler aumenta 20 %?</strong></p>
<p>Después:</p>
<p><strong>¿Qué sucede si las ventas son 15 % menores de lo esperado?</strong></p>
<p>El sistema permite analizar múltiples escenarios antes de comprometer recursos.</p>
<hr />
<h1>14. DSS NO SIGNIFICA DECISIÓN AUTOMÁTICA</h1>
<p>Debe diferenciarse:</p>
<p><strong>Sistema que APOYA una decisión</strong></p>
<p>de</p>
<p><strong>Sistema que TOMA automáticamente una decisión.</strong></p>
<p>Un DSS proporciona elementos para decidir.</p>
<p>La responsabilidad administrativa continúa perteneciendo al decisor cuando la decisión requiere intervención humana.</p>
<p>Por ejemplo, un sistema puede indicar:</p>
<p><strong>“La alternativa B presenta mayor rentabilidad proyectada.”</strong></p>
<p>Pero el gerente puede considerar además:</p>
<ul>
<li>riesgos;</li>
<li>reputación;</li>
<li>legislación;</li>
<li>impacto social;</li>
<li>estrategia empresarial.</li>
</ul>
<p>La tecnología aumenta la capacidad de análisis, pero no elimina automáticamente la responsabilidad humana.</p>
<hr />
<h1>15. SISTEMAS DE APOYO A DECISIONES EN GRUPO — GDSS</h1>
<p><strong>GDSS</strong> significa:</p>
<p><strong>Group Decision Support System.</strong></p>
<p>Son sistemas diseñados para facilitar procesos de decisión donde participan varias personas.</p>
<p>Son especialmente útiles cuando una decisión requiere:</p>
<ul>
<li>diferentes conocimientos;</li>
<li>diferentes departamentos;</li>
<li>discusión;</li>
<li>evaluación conjunta;</li>
<li>votación;</li>
<li>generación de alternativas;</li>
<li>consenso.</li>
</ul>
<hr />
<h1>16. CARACTERÍSTICAS DE LOS GDSS</h1>
<p>Un GDSS puede permitir:</p>
<ul>
<li>compartir documentos;</li>
<li>presentar información;</li>
<li>registrar propuestas;</li>
<li>generar ideas;</li>
<li>realizar votaciones;</li>
<li>clasificar alternativas;</li>
<li>comparar opiniones;</li>
<li>colaborar a distancia;</li>
<li>documentar decisiones.</li>
</ul>
<p>Ejemplo:</p>
<p>Una empresa debe seleccionar un nuevo sistema ERP.</p>
<p>Participan:</p>
<ul>
<li>gerente general;</li>
<li>gerente financiero;</li>
<li>responsable de tecnología;</li>
<li>administración;</li>
<li>recursos humanos;</li>
<li>compras.</li>
</ul>
<p>Cada área puede evaluar diferentes aspectos de las propuestas.</p>
<hr />
<h1>17. VENTAJAS DE LOS GDSS</h1>
<p>Entre sus posibles ventajas:</p>
<ul>
<li>participación de múltiples especialistas;</li>
<li>mayor cantidad de alternativas;</li>
<li>registro del proceso;</li>
<li>colaboración;</li>
<li>estructuración de reuniones;</li>
<li>reducción de determinadas barreras geográficas;</li>
<li>posibilidad de analizar diferentes opiniones.</li>
</ul>
<hr />
<h1>18. DESVENTAJAS Y LIMITACIONES DE LOS GDSS</h1>
<p>También pueden aparecer dificultades:</p>
<ul>
<li>resistencia al uso de tecnología;</li>
<li>información insuficiente;</li>
<li>conflictos entre participantes;</li>
<li>dependencia tecnológica;</li>
<li>problemas de conectividad;</li>
<li>exceso de información;</li>
<li>mala configuración del proceso;</li>
<li>costos de implementación.</li>
</ul>
<p>La existencia de tecnología no garantiza una buena decisión grupal.</p>
<hr />
<h1>19. DISEÑO DE SALAS PARA GDSS</h1>
<p>Tradicionalmente, los GDSS podían implementarse mediante salas especialmente equipadas.</p>
<p>Una sala de decisión puede disponer de:</p>
<ul>
<li>computadoras;</li>
<li>pantalla principal;</li>
<li>conectividad;</li>
<li>software colaborativo;</li>
<li>sistemas de votación;</li>
<li>herramientas de presentación.</li>
</ul>
<p>Actualmente muchas de estas funciones pueden realizarse también mediante plataformas digitales y ambientes virtuales.</p>
<p>El principio continúa siendo el mismo:</p>
<p><strong>utilizar tecnología para estructurar y mejorar el proceso de decisión colectiva.</strong></p>
<hr />
<h1>20. USOS PRÁCTICOS DE GDSS</h1>
<p>Puede utilizarse para:</p>
<ul>
<li>planificación estratégica;</li>
<li>elaboración presupuestaria;</li>
<li>selección de proveedores;</li>
<li>evaluación de proyectos;</li>
<li>selección de tecnología;</li>
<li>gestión de riesgos;</li>
<li>planificación de inversiones;</li>
<li>resolución de problemas complejos.</li>
</ul>
<hr />
<h1>21. CASO DE APLICACIÓN DE GDSS</h1>
<p>Una universidad debe seleccionar una nueva plataforma académica.</p>
<p>Existen cuatro propuestas.</p>
<p>Participan representantes de:</p>
<ul>
<li>Dirección;</li>
<li>Administración;</li>
<li>Docencia;</li>
<li>Secretaría;</li>
<li>Informática;</li>
<li>estudiantes.</li>
</ul>
<p>Se establecen criterios:</p>
<p><strong>Costo — 20 %</strong></p>
<p><strong>Funcionalidad — 25 %</strong></p>
<p><strong>Facilidad de uso — 15 %</strong></p>
<p><strong>Seguridad — 15 %</strong></p>
<p><strong>Soporte — 10 %</strong></p>
<p><strong>Escalabilidad — 15 %</strong></p>
<p>Cada participante evalúa las alternativas.</p>
<p>El sistema consolida las puntuaciones y genera un resultado.</p>
<p>Esto no significa que la plataforma con mayor puntuación deba seleccionarse automáticamente.</p>
<p>El resultado constituye información para apoyar la decisión colectiva.</p>
<hr />
<h1>22. INTELIGENCIA ARTIFICIAL</h1>
<p>La Inteligencia Artificial incorpora técnicas que permiten que los sistemas realicen tareas asociadas con capacidades como:</p>
<ul>
<li>reconocimiento;</li>
<li>clasificación;</li>
<li>predicción;</li>
<li>generación;</li>
<li>procesamiento de lenguaje;</li>
<li>identificación de patrones;</li>
<li>recomendaciones;</li>
<li>resolución de determinados problemas.</li>
</ul>
<p>Dentro del contexto empresarial, puede utilizarse como apoyo para:</p>
<ul>
<li>pronosticar demanda;</li>
<li>detectar fraude;</li>
<li>analizar clientes;</li>
<li>automatizar procesos;</li>
<li>realizar recomendaciones;</li>
<li>clasificar documentos;</li>
<li>asistir al usuario;</li>
<li>analizar grandes volúmenes de información.</li>
</ul>
<hr />
<h1>23. IA Y TOMA DE DECISIONES</h1>
<p>Supongamos que una institución posee información histórica de miles de clientes.</p>
<p>Un sistema puede analizar:</p>
<ul>
<li>compras;</li>
<li>frecuencia;</li>
<li>preferencias;</li>
<li>comportamiento;</li>
<li>historial.</li>
</ul>
<p>A partir de estos datos podría generar:</p>
<p><strong>Predicción:</strong> probabilidad de compra.</p>
<p><strong>Clasificación:</strong> segmento de cliente.</p>
<p><strong>Recomendación:</strong> producto potencialmente interesante.</p>
<p><strong>Alerta:</strong> comportamiento anormal.</p>
<p>Estos resultados pueden apoyar decisiones comerciales.</p>
<hr />
<h1>24. SISTEMAS EXPERTOS</h1>
<p>Un <strong>sistema experto</strong> busca representar conocimiento especializado para proporcionar recomendaciones o conclusiones dentro de un dominio determinado.</p>
<p>Tradicionalmente utiliza:</p>
<h3>Base de conocimiento</h3>
<p>Contiene conocimientos y reglas del dominio.</p>
<h3>Motor de inferencia</h3>
<p>Aplica reglas para obtener conclusiones.</p>
<h3>Interfaz</h3>
<p>Permite interactuar con el usuario.</p>
<hr />
<h1>25. EJEMPLO SIMPLIFICADO DE SISTEMA EXPERTO</h1>
<p>Supongamos un sistema para evaluación financiera.</p>
<p>Reglas:</p>
<p><strong>SI</strong> liquidez es baja
<strong>Y</strong> endeudamiento es alto
<strong>ENTONCES</strong> riesgo financiero elevado.</p>
<p>Otra regla:</p>
<p><strong>SI</strong> liquidez es alta
<strong>Y</strong> endeudamiento es bajo
<strong>ENTONCES</strong> situación financiera favorable.</p>
<p>El sistema recibe información, aplica reglas y produce una recomendación o conclusión.</p>
<hr />
<h1>26. BENEFICIOS DE LOS SISTEMAS EXPERTOS</h1>
<p>Pueden contribuir a:</p>
<ul>
<li>conservar conocimiento especializado;</li>
<li>proporcionar respuestas consistentes;</li>
<li>apoyar personal menos experimentado;</li>
<li>automatizar determinados análisis;</li>
<li>reducir tiempos;</li>
<li>disponibilizar conocimiento de forma más amplia.</li>
</ul>
<hr />
<h1>27. COSTOS Y LIMITACIONES</h1>
<p>El desarrollo y mantenimiento de estos sistemas puede implicar:</p>
<ul>
<li>adquisición del conocimiento;</li>
<li>especialistas;</li>
<li>desarrollo;</li>
<li>validación;</li>
<li>actualización;</li>
<li>infraestructura;</li>
<li>capacitación;</li>
<li>mantenimiento.</li>
</ul>
<p>Además, el conocimiento puede cambiar.</p>
<p>Un sistema basado en conocimientos desactualizados puede producir recomendaciones inadecuadas.</p>
<hr />
<h1>28. SHELL PARA SISTEMAS EXPERTOS</h1>
<p>Un <strong>Shell</strong> es una herramienta o entorno que proporciona componentes necesarios para construir sistemas expertos sin tener que desarrollar toda la infraestructura desde cero.</p>
<p>El desarrollador incorpora principalmente:</p>
<ul>
<li>conocimiento;</li>
<li>reglas;</li>
<li>relaciones;</li>
<li>criterios.</li>
</ul>
<p>El entorno proporciona mecanismos para procesarlos.</p>
<hr />
<h1>29. SELECCIÓN DE APLICACIONES PARA SISTEMAS EXPERTOS</h1>
<p>No todos los problemas justifican un sistema experto.</p>
<p>Una aplicación resulta más apropiada cuando:</p>
<ul>
<li>existe conocimiento especializado identificable;</li>
<li>existen reglas o criterios relativamente claros;</li>
<li>el problema se presenta repetidamente;</li>
<li>el conocimiento puede representarse;</li>
<li>existe valor económico u operativo en automatizar el análisis.</li>
</ul>
<hr />
<h1>30. DEL TPS A LA INTELIGENCIA</h1>
<p>Podemos observar una evolución conceptual:</p>
<p><strong>TPS</strong></p>
<p>¿Qué ocurrió?</p>
<p>↓</p>
<p><strong>MIS</strong></p>
<p>¿Qué está ocurriendo en la organización?</p>
<p>↓</p>
<p><strong>DSS</strong></p>
<p>¿Qué pasaría si modificamos determinadas variables?</p>
<p>↓</p>
<p><strong>GDSS</strong></p>
<p>¿Qué alternativa debería evaluar un grupo?</p>
<p>↓</p>
<p><strong>IA / SISTEMAS EXPERTOS</strong></p>
<p>¿Qué patrones, predicciones o recomendaciones puede generar el sistema?</p>
<p>Esta progresión permite comprender que las tecnologías empresariales pueden utilizar los datos en diferentes niveles de análisis.</p>
<hr />
<h1>31. CASO INTEGRADOR — DISTRIBUIDORA PARAGUAYA</h1>
<p>Una distribuidora posee 12.000 clientes y realiza aproximadamente 3.000 operaciones por día.</p>
<p>La gerencia observa una reducción de rentabilidad.</p>
<h2>Nivel 1 — TPS</h2>
<p>El sistema registra:</p>
<ul>
<li>ventas;</li>
<li>compras;</li>
<li>pagos;</li>
<li>inventarios.</li>
</ul>
<h2>Nivel 2 — Información gerencial</h2>
<p>Se identifica:</p>
<ul>
<li>reducción del margen;</li>
<li>aumento de costos;</li>
<li>productos de baja rotación.</li>
</ul>
<h2>Nivel 3 — DSS</h2>
<p>Se simulan alternativas:</p>
<p><strong>A:</strong> aumentar precios 5 %.</p>
<p><strong>B:</strong> cambiar proveedores.</p>
<p><strong>C:</strong> eliminar productos poco rentables.</p>
<p><strong>D:</strong> aumentar volumen de compra para negociar descuentos.</p>
<h2>Nivel 4 — GDSS</h2>
<p>Administración, Finanzas, Ventas y Compras analizan conjuntamente las alternativas.</p>
<h2>Nivel 5 — IA</h2>
<p>Un modelo analiza datos históricos y genera una predicción de demanda por producto.</p>
<p>La decisión final puede integrar todos estos elementos.</p>
<hr />
<h1>32. ACTIVIDAD PRÁCTICA — “USTED ES EL GERENTE”</h1>
<h2>Situación</h2>
<p>Una empresa dispone de G. 500 millones para invertir.</p>
<p>Tiene tres alternativas:</p>
<h3>Proyecto A</h3>
<p>Nueva sucursal.</p>
<h3>Proyecto B</h3>
<p>Plataforma de comercio electrónico.</p>
<h3>Proyecto C</h3>
<p>Modernización del sistema logístico.</p>
<p>Cada grupo deberá definir criterios para evaluar las alternativas.</p>
<p>Como mínimo:</p>
<ul>
<li>inversión;</li>
<li>rentabilidad esperada;</li>
<li>riesgo;</li>
<li>tiempo;</li>
<li>impacto estratégico.</li>
</ul>
<p>Luego deberá asignar una puntuación de <strong>1 a 5</strong> a cada alternativa.</p>
<p>Finalmente responder:</p>
<p><strong>1. ¿Qué alternativa seleccionaron?</strong></p>
<p><strong>2. ¿Qué criterios tuvieron mayor peso?</strong></p>
<p><strong>3. ¿Cambiaría la decisión si el presupuesto disminuyera 30 %?</strong></p>
<p><strong>4. ¿Qué información adicional necesitan?</strong></p>
<p><strong>5. ¿Qué parte de la decisión puede realizar un sistema y qué parte corresponde al gerente?</strong></p>
<hr />
<h1>33. DESAFÍO “WHAT-IF”</h1>
<p>Una empresa vende mensualmente:</p>
<p><strong>5.000 unidades</strong></p>
<p>Precio:</p>
<p><strong>G. 100.000</strong></p>
<p>Costo unitario:</p>
<p><strong>G. 70.000</strong></p>
<p>La gerencia considera reducir el precio a:</p>
<p><strong>G. 90.000</strong></p>
<p>Se estima que las ventas podrían aumentar a:</p>
<p><strong>7.000 unidades.</strong></p>
<p>Calcule para ambos escenarios:</p>
<p><strong>Ingresos = Precio × Cantidad</strong></p>
<p><strong>Costo = Costo unitario × Cantidad</strong></p>
<p><strong>Resultado simplificado = Ingresos − Costos</strong></p>
<p>Luego responda:</p>
<p><strong>¿Qué alternativa parece más conveniente según estos datos?</strong></p>
<p><strong>¿Es suficiente esta información para tomar la decisión definitiva?</strong></p>
<p>El objetivo no es solamente realizar el cálculo.</p>
<p>El estudiante debe comprender que una decisión requiere interpretar el resultado y considerar otras variables.</p>
<hr />
<h1>34. DEBATE</h1>
<h2>“¿Debe una empresa permitir que una Inteligencia Artificial tome decisiones importantes sin intervención humana?”</h2>
<p>Dividir la clase en dos grupos.</p>
<h3>Grupo A</h3>
<p>Defenderá una mayor automatización de decisiones.</p>
<h3>Grupo B</h3>
<p>Defenderá la necesidad de mantener intervención humana.</p>
<p>Analizar:</p>
<ul>
<li>velocidad;</li>
<li>costos;</li>
<li>errores;</li>
<li>sesgos;</li>
<li>responsabilidad;</li>
<li>transparencia;</li>
<li>experiencia;</li>
<li>datos;</li>
<li>consecuencias.</li>
</ul>
<hr />
<h1>35. PENSAMIENTO CRÍTICO</h1>
<p>Una empresa implementa un sistema de Inteligencia Artificial.</p>
<p>Después de seis meses el gerente afirma:</p>
<blockquote>
<p>“Ya no necesito analizar los resultados. El sistema me dice qué decisión tomar.”</p>
</blockquote>
<p>Analice críticamente esta afirmación.</p>
<p>Una recomendación tecnológica puede estar condicionada por:</p>
<ul>
<li>calidad de los datos;</li>
<li>modelo utilizado;</li>
<li>variables consideradas;</li>
<li>información faltante;</li>
<li>contexto;</li>
<li>errores;</li>
<li>cambios del entorno.</li>
</ul>
<p>Por ello, el administrador debe desarrollar la capacidad de <strong>interpretar críticamente la información proporcionada por los sistemas</strong>.</p>
<hr />
<h1>36. SÍNTESIS DE LA UNIDAD</h1>
<p>La tecnología puede apoyar diferentes etapas de la decisión:</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>INFORMACIÓN</strong></p>
<p>↓</p>
<p><strong>ANÁLISIS</strong></p>
<p>↓</p>
<p><strong>ALTERNATIVAS</strong></p>
<p>↓</p>
<p><strong>SIMULACIÓN</strong></p>
<p>↓</p>
<p><strong>RECOMENDACIÓN</strong></p>
<p>↓</p>
<p><strong>DECISIÓN</strong></p>
<p>↓</p>
<p><strong>ACCIÓN</strong></p>
<p>↓</p>
<p><strong>EVALUACIÓN</strong></p>
<p>La competencia profesional fundamental no consiste simplemente en saber utilizar una herramienta.</p>
<p>Consiste en saber:</p>
<p><strong>qué información necesitamos,</strong></p>
<p><strong>qué preguntas debemos realizar,</strong></p>
<p><strong>cómo interpretar los resultados</strong></p>
<p>y</p>
<p><strong>cómo utilizar la tecnología para tomar mejores decisiones.</strong></p>
<hr />
<h1>37. EVALUACIÓN — SELECCIÓN MÚLTIPLE</h1>
<h3>1.</h3>
<p>¿Cuál es la función principal de un TPS?</p>
<p><strong>A.</strong> Registrar transacciones operativas.
<strong>B.</strong> Diseñar páginas web.
<strong>C.</strong> Sustituir a los gerentes.
<strong>D.</strong> Crear redes inalámbricas.</p>
<h3>2.</h3>
<p>¿Qué caracteriza principalmente a un DSS?</p>
<p><strong>A.</strong> Solamente almacena documentos.</p>
<p><strong>B.</strong> Apoya el análisis y evaluación de alternativas.</p>
<p><strong>C.</strong> Solamente registra ventas.</p>
<p><strong>D.</strong> Administra exclusivamente redes.</p>
<h3>3.</h3>
<p>Una empresa modifica el precio dentro de un modelo para observar cómo afecta la utilidad. Está realizando:</p>
<p><strong>A.</strong> Análisis What-if.
<strong>B.</strong> Mantenimiento de hardware.
<strong>C.</strong> Diseño de red.
<strong>D.</strong> Procesamiento de texto.</p>
<h3>4.</h3>
<p>¿Cuál es un ejemplo de decisión semiestructurada?</p>
<p><strong>A.</strong> Registrar automáticamente una venta.</p>
<p><strong>B.</strong> Determinar cuánto inventario comprar utilizando datos y juicio gerencial.</p>
<p><strong>C.</strong> Imprimir una factura.</p>
<p><strong>D.</strong> Guardar una contraseña.</p>
<h3>5.</h3>
<p>Un GDSS está especialmente orientado a:</p>
<p><strong>A.</strong> Decisiones grupales.</p>
<p><strong>B.</strong> Reparación de computadoras.</p>
<p><strong>C.</strong> Creación de dominios.</p>
<p><strong>D.</strong> Instalación de impresoras.</p>
<h3>6.</h3>
<p>¿Cuál es una posible ventaja de un GDSS?</p>
<p><strong>A.</strong> Elimina todos los conflictos.</p>
<p><strong>B.</strong> Permite estructurar y apoyar decisiones donde participan varias personas.</p>
<p><strong>C.</strong> Garantiza decisiones correctas.</p>
<p><strong>D.</strong> Elimina la necesidad de información.</p>
<h3>7.</h3>
<p>Un sistema que utiliza conocimientos y reglas especializadas para generar recomendaciones corresponde a:</p>
<p><strong>A.</strong> Sistema experto.</p>
<p><strong>B.</strong> Switch.</p>
<p><strong>C.</strong> Sistema operativo.</p>
<p><strong>D.</strong> DNS.</p>
<h3>8.</h3>
<p>¿Qué función cumple tradicionalmente el motor de inferencia de un sistema experto?</p>
<p><strong>A.</strong> Imprimir documentos.</p>
<p><strong>B.</strong> Aplicar conocimiento y reglas para obtener conclusiones.</p>
<p><strong>C.</strong> Proporcionar conexión Wi-Fi.</p>
<p><strong>D.</strong> Almacenar físicamente el servidor.</p>
<h3>9.</h3>
<p>¿Cuál de las siguientes afirmaciones es más correcta respecto de un DSS?</p>
<p><strong>A.</strong> Siempre sustituye al gerente.</p>
<p><strong>B.</strong> Garantiza que toda decisión sea correcta.</p>
<p><strong>C.</strong> Proporciona herramientas e información para apoyar al decisor.</p>
<p><strong>D.</strong> Solo puede utilizarse para decisiones financieras.</p>
<h3>10.</h3>
<p>Una IA predice que las ventas disminuirán 15 % el próximo trimestre. ¿Cuál debería ser la actitud más apropiada del administrador?</p>
<p><strong>A.</strong> Ejecutar inmediatamente cualquier recomendación sin analizarla.</p>
<p><strong>B.</strong> Ignorar el resultado porque fue generado por una computadora.</p>
<p><strong>C.</strong> Analizar la predicción, los datos, el contexto y otras variables antes de decidir.</p>
<p><strong>D.</strong> Considerar la predicción como una certeza absoluta.</p>
<h2>CLAVE DE RESPUESTAS</h2>
<p><strong>1-A | 2-B | 3-A | 4-B | 5-A | 6-B | 7-A | 8-B | 9-C | 10-C</strong></p>
<p>Este contenido cubre los temas que el programa exige para la Unidad VII, incluyendo <strong>DSS, GDSS, casos de aplicación, inteligencia artificial, sistemas expertos, sus beneficios y costos, Shell y selección de aplicaciones</strong>. </p>
<p>Además, refuerza uno de los objetivos centrales de ADE18: que el estudiante pueda <strong>analizar herramientas tecnológicas de apoyo para la toma de decisiones en los negocios</strong>. </p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 10,
        "titulo": "Unidad IX: Negocios en Internet",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><h1>UNIDAD IX — PARADIGMAS CONTEMPORÁNEOS DE NEGOCIOS EN INTERNET</h1>
<p><strong>Asignatura:</strong> Tecnología de la Información y la Comunicación
<strong>Código:</strong> ADE18
<strong>Carrera:</strong> Administración
<strong>Unidad:</strong> IX
<strong>Tema central:</strong> Negocios digitales, comercio electrónico, pagos, gobierno electrónico y firma digital</p>
<hr />
<h1>1. INTRODUCCIÓN: INTERNET COMO ENTORNO DE NEGOCIOS</h1>
<p>Internet dejó de ser solamente una herramienta de comunicación y acceso a información.</p>
<p>Actualmente constituye una infraestructura sobre la cual las organizaciones pueden:</p>
<ul>
<li>promocionar productos;</li>
<li>vender;</li>
<li>comprar;</li>
<li>cobrar;</li>
<li>realizar pagos;</li>
<li>atender clientes;</li>
<li>gestionar proveedores;</li>
<li>prestar servicios;</li>
<li>distribuir contenidos;</li>
<li>administrar operaciones;</li>
<li>realizar trámites;</li>
<li>desarrollar nuevos modelos de negocio.</li>
</ul>
<p>Esta transformación dio origen a los denominados <strong>negocios electrónicos o negocios por Internet</strong>.</p>
<p>La pregunta ya no es únicamente:</p>
<p><strong>“¿Nuestra empresa tiene presencia en Internet?”</strong></p>
<p>La pregunta empresarial más importante es:</p>
<p><strong>“¿Cómo utiliza nuestra organización Internet para generar valor?”</strong></p>
<hr />
<h1>2. NEGOCIOS POR INTERNET</h1>
<p>Un negocio por Internet utiliza tecnologías digitales y redes para desarrollar total o parcialmente actividades empresariales.</p>
<p>Estas actividades pueden incluir:</p>
<p><strong>Marketing</strong></p>
<p>↓</p>
<p><strong>Captación de clientes</strong></p>
<p>↓</p>
<p><strong>Venta</strong></p>
<p>↓</p>
<p><strong>Pago</strong></p>
<p>↓</p>
<p><strong>Entrega</strong></p>
<p>↓</p>
<p><strong>Atención posventa</strong></p>
<p>↓</p>
<p><strong>Fidelización</strong></p>
<p>Internet puede intervenir en una, varias o todas estas etapas.</p>
<hr />
<h1>3. NEGOCIO TRADICIONAL Y NEGOCIO DIGITAL</h1>
<p>En un negocio tradicional, el cliente puede:</p>
<ol>
<li>trasladarse hasta el establecimiento;</li>
<li>consultar productos;</li>
<li>seleccionar;</li>
<li>pagar;</li>
<li>retirar el producto.</li>
</ol>
<p>En un negocio digital puede:</p>
<ol>
<li>acceder a una plataforma;</li>
<li>buscar productos;</li>
<li>comparar;</li>
<li>realizar el pedido;</li>
<li>pagar electrónicamente;</li>
<li>seleccionar entrega;</li>
<li>recibir seguimiento;</li>
<li>calificar la experiencia.</li>
</ol>
<p>El producto puede ser el mismo.</p>
<p>Lo que cambia es el <strong>proceso de interacción y generación de valor</strong>.</p>
<hr />
<h1>4. E-BUSINESS</h1>
<p>El concepto de <strong>e-business</strong> es más amplio que simplemente vender productos mediante una página web.</p>
<p>Incluye el uso de tecnologías digitales para apoyar diferentes procesos empresariales.</p>
<p>Por ejemplo:</p>
<ul>
<li>comercio electrónico;</li>
<li>marketing digital;</li>
<li>administración de clientes;</li>
<li>comunicación con proveedores;</li>
<li>sistemas de pagos;</li>
<li>logística;</li>
<li>colaboración;</li>
<li>servicio posventa.</li>
</ul>
<p>Por ello:</p>
<p><strong>E-commerce forma parte del e-business, pero e-business no se limita al e-commerce.</strong></p>
<hr />
<h1>5. COMERCIO ELECTRÓNICO</h1>
<p>El <strong>comercio electrónico o e-commerce</strong> comprende operaciones comerciales realizadas mediante medios electrónicos y redes digitales.</p>
<p>Puede incluir:</p>
<ul>
<li>presentación de productos;</li>
<li>selección;</li>
<li>pedido;</li>
<li>contratación;</li>
<li>pago;</li>
<li>facturación;</li>
<li>seguimiento;</li>
<li>atención al cliente.</li>
</ul>
<p>Ejemplos cotidianos:</p>
<ul>
<li>comprar un electrodoméstico por Internet;</li>
<li>reservar un hotel;</li>
<li>contratar un servicio digital;</li>
<li>adquirir una entrada;</li>
<li>realizar un pedido mediante una plataforma.</li>
</ul>
<hr />
<h1>6. CATEGORÍAS DEL COMERCIO ELECTRÓNICO</h1>
<p>El comercio electrónico puede clasificarse según los participantes.</p>
<h2>B2C — Business to Consumer</h2>
<p><strong>Empresa → Consumidor</strong></p>
<p>Una empresa vende directamente a consumidores finales.</p>
<p>Ejemplo:</p>
<p>Una tienda de electrodomésticos vende una notebook a una persona mediante su tienda online.</p>
<hr />
<h2>B2B — Business to Business</h2>
<p><strong>Empresa → Empresa</strong></p>
<p>Las operaciones se realizan entre organizaciones.</p>
<p>Ejemplo:</p>
<p>Una empresa distribuidora vende productos a supermercados mediante una plataforma de pedidos.</p>
<hr />
<h2>C2C — Consumer to Consumer</h2>
<p><strong>Consumidor → Consumidor</strong></p>
<p>Una persona realiza una operación con otra mediante una plataforma digital.</p>
<p>Ejemplo:</p>
<p>Una persona publica un producto usado y otra persona lo adquiere.</p>
<hr />
<h2>C2B — Consumer to Business</h2>
<p><strong>Consumidor → Empresa</strong></p>
<p>Una persona ofrece determinado valor, producto o servicio a una organización.</p>
<p>Ejemplo:</p>
<p>Un profesional independiente proporciona un servicio digital a una empresa mediante una plataforma.</p>
<hr />
<h1>7. OTROS ENTORNOS DIGITALES</h1>
<p>Además de las relaciones comerciales tradicionales, Internet permite interacciones con:</p>
<ul>
<li>instituciones públicas;</li>
<li>organizaciones;</li>
<li>proveedores;</li>
<li>profesionales;</li>
<li>comunidades;</li>
<li>plataformas intermediarias.</li>
</ul>
<p>Esto demuestra que los negocios digitales forman parte de un <strong>ecosistema</strong>, no solamente de una tienda virtual.</p>
<hr />
<h1>8. MODELOS DE NEGOCIO EN INTERNET</h1>
<p>Internet permitió desarrollar diferentes modelos.</p>
<h2>Venta directa</h2>
<p>La organización vende directamente mediante su propia plataforma.</p>
<hr />
<h2>Marketplace</h2>
<p>Una plataforma conecta múltiples vendedores con compradores.</p>
<p>El operador puede obtener ingresos mediante:</p>
<ul>
<li>comisiones;</li>
<li>publicidad;</li>
<li>servicios;</li>
<li>suscripciones.</li>
</ul>
<hr />
<h2>Suscripción</h2>
<p>El usuario realiza pagos periódicos para acceder a un producto o servicio.</p>
<p>Ejemplo conceptual:</p>
<p><strong>Pago mensual → acceso continuo al servicio</strong></p>
<hr />
<h2>Freemium</h2>
<p>Se ofrece una versión básica sin costo y se cobra por funciones adicionales.</p>
<hr />
<h2>Publicidad</h2>
<p>El servicio puede generar ingresos mediante anuncios.</p>
<hr />
<h2>Comisión por intermediación</h2>
<p>La plataforma obtiene un porcentaje o tarifa por facilitar una transacción.</p>
<hr />
<h1>9. ¿CÓMO PREPARAR UN NEGOCIO ONLINE?</h1>
<p>Crear un negocio digital no comienza eligiendo el color de una página web.</p>
<p>Debe comenzar con preguntas empresariales.</p>
<h2>Paso 1 — Definir la propuesta de valor</h2>
<p>¿Qué problema resolvemos?</p>
<p>¿Por qué el cliente debería elegirnos?</p>
<hr />
<h2>Paso 2 — Identificar al cliente</h2>
<p>¿Quién comprará?</p>
<p>¿Qué necesita?</p>
<p>¿Cómo compra?</p>
<p>¿Qué medios digitales utiliza?</p>
<hr />
<h2>Paso 3 — Definir productos o servicios</h2>
<p>¿Qué ofreceremos?</p>
<p>¿Productos físicos?</p>
<p>¿Servicios?</p>
<p>¿Productos digitales?</p>
<hr />
<h2>Paso 4 — Definir el modelo de ingresos</h2>
<p>¿Cómo generará dinero el negocio?</p>
<ul>
<li>venta;</li>
<li>comisión;</li>
<li>suscripción;</li>
<li>publicidad;</li>
<li>servicios.</li>
</ul>
<hr />
<h2>Paso 5 — Diseñar el proceso comercial</h2>
<p>Debe establecerse:</p>
<p><strong>Cliente → Producto → Carrito → Pedido → Pago → Confirmación → Entrega → Posventa</strong></p>
<hr />
<h2>Paso 6 — Seleccionar tecnología</h2>
<p>La tecnología debe responder al modelo de negocio.</p>
<hr />
<h2>Paso 7 — Organizar logística</h2>
<p>Si existen productos físicos:</p>
<ul>
<li>inventario;</li>
<li>almacenamiento;</li>
<li>preparación;</li>
<li>transporte;</li>
<li>entrega;</li>
<li>devoluciones.</li>
</ul>
<hr />
<h2>Paso 8 — Establecer atención al cliente</h2>
<p>Definir:</p>
<ul>
<li>canales;</li>
<li>horarios;</li>
<li>responsables;</li>
<li>procedimientos;</li>
<li>tratamiento de reclamos.</li>
</ul>
<hr />
<h2>Paso 9 — Considerar seguridad y cumplimiento</h2>
<p>El negocio manejará posiblemente:</p>
<ul>
<li>datos personales;</li>
<li>contraseñas;</li>
<li>direcciones;</li>
<li>información de pedidos;</li>
<li>pagos.</li>
</ul>
<p>La seguridad debe formar parte del diseño.</p>
<hr />
<h1>10. ELECCIÓN DE TECNOLOGÍAS</h1>
<p>Una organización puede seleccionar diferentes alternativas tecnológicas.</p>
<p>La elección debe considerar:</p>
<ul>
<li>tamaño del negocio;</li>
<li>cantidad de productos;</li>
<li>volumen de operaciones;</li>
<li>presupuesto;</li>
<li>integración;</li>
<li>seguridad;</li>
<li>escalabilidad;</li>
<li>soporte;</li>
<li>facilidad de administración.</li>
</ul>
<p>No siempre la tecnología más costosa representa la mejor solución.</p>
<p>La pregunta correcta es:</p>
<p><strong>¿Qué tecnología responde mejor a los requerimientos del negocio?</strong></p>
<hr />
<h1>11. COMPONENTES DE UNA PLATAFORMA DE COMERCIO ELECTRÓNICO</h1>
<p>Una solución de e-commerce puede incorporar:</p>
<h3>Catálogo</h3>
<p>Presenta productos y servicios.</p>
<h3>Buscador</h3>
<p>Facilita encontrar productos.</p>
<h3>Carrito</h3>
<p>Permite seleccionar productos antes de comprar.</p>
<h3>Gestión de pedidos</h3>
<p>Registra y administra operaciones.</p>
<h3>Inventario</h3>
<p>Controla disponibilidad.</p>
<h3>Clientes</h3>
<p>Gestiona datos y cuentas.</p>
<h3>Pagos</h3>
<p>Procesa o integra mecanismos de pago.</p>
<h3>Logística</h3>
<p>Gestiona preparación y entrega.</p>
<h3>Analítica</h3>
<p>Permite conocer comportamiento y resultados.</p>
<hr />
<h1>12. EXPERIENCIA DEL USUARIO</h1>
<p>Una plataforma puede disponer de excelente tecnología y aun así fracasar si es difícil de utilizar.</p>
<p>El cliente espera:</p>
<ul>
<li>navegación clara;</li>
<li>información comprensible;</li>
<li>precios visibles;</li>
<li>proceso sencillo;</li>
<li>funcionamiento móvil;</li>
<li>confianza;</li>
<li>confirmaciones;</li>
<li>atención.</li>
</ul>
<p>Cada paso innecesario puede convertirse en una barrera para completar la compra.</p>
<hr />
<h1>13. EMBUDO DE CONVERSIÓN</h1>
<p>Supongamos:</p>
<p><strong>10.000 personas visitan la tienda</strong></p>
<p>↓</p>
<p><strong>3.000 observan productos</strong></p>
<p>↓</p>
<p><strong>1.000 agregan al carrito</strong></p>
<p>↓</p>
<p><strong>600 comienzan el pago</strong></p>
<p>↓</p>
<p><strong>400 compran</strong></p>
<p>La empresa debe preguntarse:</p>
<p><strong>¿Dónde estamos perdiendo clientes?</strong></p>
<p>La tecnología permite medir el proceso comercial y detectar puntos de abandono.</p>
<hr />
<h1>14. TASA DE CONVERSIÓN</h1>
<p>Una métrica importante es la tasa de conversión.</p>
<p>De manera simplificada:</p>
<p><strong>Tasa de conversión = Compras / Visitantes × 100</strong></p>
<p>Ejemplo:</p>
<p>10.000 visitantes.</p>
<p>400 compradores.</p>
<p><strong>400 / 10.000 × 100 = 4 %</strong></p>
<p>Esto significa que aproximadamente el 4 % de los visitantes considerados completaron la acción de compra.</p>
<hr />
<h1>15. VENTAJAS DEL COMERCIO ELECTRÓNICO</h1>
<p>Entre sus posibles ventajas encontramos:</p>
<h3>Mayor alcance</h3>
<p>Permite llegar a clientes fuera del entorno físico inmediato.</p>
<h3>Disponibilidad</h3>
<p>Los sistemas pueden recibir operaciones durante períodos amplios, incluso fuera del horario tradicional.</p>
<h3>Automatización</h3>
<p>Diversos procesos pueden automatizarse.</p>
<h3>Medición</h3>
<p>Las interacciones digitales generan información analizable.</p>
<h3>Personalización</h3>
<p>La experiencia puede adaptarse utilizando datos y preferencias.</p>
<h3>Escalabilidad</h3>
<p>Determinados modelos digitales pueden crecer sin reproducir exactamente la estructura física tradicional.</p>
<hr />
<h1>16. PROBLEMÁTICAS DEL COMERCIO ELECTRÓNICO</h1>
<p>También existen dificultades.</p>
<h2>Seguridad</h2>
<p>Riesgo de ataques, accesos indebidos o fraude.</p>
<h2>Privacidad</h2>
<p>Tratamiento responsable de información personal.</p>
<h2>Confianza</h2>
<p>El cliente debe confiar en el vendedor y en el proceso.</p>
<h2>Logística</h2>
<p>Una venta digital puede fracasar por una mala entrega física.</p>
<h2>Dependencia tecnológica</h2>
<p>Una falla puede detener operaciones.</p>
<h2>Competencia</h2>
<p>Internet facilita comparar alternativas.</p>
<h2>Fraude</h2>
<p>Pueden existir operaciones fraudulentas.</p>
<h2>Abandono del carrito</h2>
<p>Clientes que inician pero no completan la compra.</p>
<hr />
<h1>17. EL PROBLEMA DE LA ÚLTIMA MILLA</h1>
<p>En comercio electrónico de productos físicos, la venta no termina cuando el cliente presiona:</p>
<p><strong>“Comprar”</strong></p>
<p>Debe cumplirse:</p>
<p><strong>Pedido</strong></p>
<p>↓</p>
<p><strong>Preparación</strong></p>
<p>↓</p>
<p><strong>Despacho</strong></p>
<p>↓</p>
<p><strong>Transporte</strong></p>
<p>↓</p>
<p><strong>Entrega</strong></p>
<p>↓</p>
<p><strong>Confirmación</strong></p>
<p>La denominada <strong>última milla</strong> representa la etapa final de entrega al cliente.</p>
<p>Puede convertirse en uno de los puntos más críticos de la experiencia.</p>
<hr />
<h1>18. SISTEMAS DE PAGO</h1>
<p>Un negocio online necesita establecer mecanismos para recibir pagos.</p>
<p>Dependiendo del modelo comercial y de las opciones disponibles, pueden utilizarse:</p>
<ul>
<li>tarjetas;</li>
<li>transferencias;</li>
<li>billeteras digitales;</li>
<li>pasarelas de pago;</li>
<li>otros mecanismos electrónicos autorizados.</li>
</ul>
<hr />
<h1>19. PASARELA DE PAGO</h1>
<p>Una <strong>pasarela de pago</strong> proporciona infraestructura tecnológica para facilitar el procesamiento de pagos electrónicos entre los participantes correspondientes.</p>
<p>De manera conceptual:</p>
<p><strong>CLIENTE</strong></p>
<p>↓</p>
<p><strong>COMERCIO</strong></p>
<p>↓</p>
<p><strong>SISTEMA/PASARELA DE PAGO</strong></p>
<p>↓</p>
<p><strong>INFRAESTRUCTURA FINANCIERA</strong></p>
<p>↓</p>
<p><strong>AUTORIZACIÓN O RECHAZO</strong></p>
<p>↓</p>
<p><strong>RESULTADO PARA EL COMERCIO</strong></p>
<p>La seguridad y protección de la información financiera son elementos fundamentales.</p>
<hr />
<h1>20. RIESGOS EN LOS PAGOS DIGITALES</h1>
<p>Las organizaciones deben considerar:</p>
<ul>
<li>fraude;</li>
<li>robo de credenciales;</li>
<li>suplantación;</li>
<li>operaciones no autorizadas;</li>
<li>sitios falsos;</li>
<li>manipulación de información;</li>
<li>ingeniería social.</li>
</ul>
<p>Por esta razón deben implementarse controles adecuados según el riesgo y el sistema utilizado.</p>
<hr />
<h1>21. CONFIANZA DIGITAL</h1>
<p>En un establecimiento físico, el cliente puede observar:</p>
<ul>
<li>local;</li>
<li>productos;</li>
<li>empleados;</li>
<li>infraestructura.</li>
</ul>
<p>En Internet existen otros elementos de confianza.</p>
<p>Por ejemplo:</p>
<ul>
<li>identificación clara del comercio;</li>
<li>información de contacto;</li>
<li>políticas transparentes;</li>
<li>seguridad del sitio;</li>
<li>condiciones de compra;</li>
<li>mecanismos de atención;</li>
<li>reputación;</li>
<li>proceso de pago confiable.</li>
</ul>
<p>La <strong>confianza</strong> constituye un activo importante en el comercio electrónico.</p>
<hr />
<h1>22. ASPECTOS LEGALES</h1>
<p>El programa incluye expresamente los aspectos legales del comercio electrónico.</p>
<p>Una organización debe considerar el marco jurídico aplicable a sus operaciones.</p>
<p>Dependiendo de la actividad, pueden existir obligaciones relacionadas con:</p>
<ul>
<li>identificación del proveedor;</li>
<li>contratación;</li>
<li>protección del consumidor;</li>
<li>tratamiento de datos;</li>
<li>documentación;</li>
<li>comprobantes;</li>
<li>pagos;</li>
<li>seguridad;</li>
<li>firma electrónica o digital;</li>
<li>obligaciones tributarias.</li>
</ul>
<p>El administrador debe comprender que:</p>
<p><strong>Una operación realizada por Internet no está fuera del marco jurídico.</strong></p>
<hr />
<h1>23. CONTRATACIÓN ELECTRÓNICA</h1>
<p>Una operación comercial puede formalizarse utilizando medios electrónicos.</p>
<p>Por ello es importante conservar evidencia relacionada con:</p>
<ul>
<li>pedido;</li>
<li>aceptación;</li>
<li>condiciones;</li>
<li>fecha;</li>
<li>pago;</li>
<li>entrega;</li>
<li>comunicaciones.</li>
</ul>
<p>La tecnología debe permitir no solamente realizar operaciones sino también mantener información adecuada sobre ellas.</p>
<hr />
<h1>24. PROTECCIÓN DE DATOS</h1>
<p>Los negocios digitales pueden recopilar:</p>
<ul>
<li>nombres;</li>
<li>teléfonos;</li>
<li>correos;</li>
<li>direcciones;</li>
<li>historial de compras;</li>
<li>preferencias;</li>
<li>información relacionada con operaciones.</li>
</ul>
<p>La organización debe preguntarse:</p>
<p><strong>¿Qué datos necesitamos realmente?</strong></p>
<p><strong>¿Para qué los utilizaremos?</strong></p>
<p><strong>¿Quién puede acceder?</strong></p>
<p><strong>¿Cómo los protegemos?</strong></p>
<p><strong>¿Durante cuánto tiempo deben conservarse?</strong></p>
<p>Acumular información sin una finalidad clara también genera riesgos.</p>
<hr />
<h1>25. E-GOVERNMENT — GOBIERNO ELECTRÓNICO</h1>
<p>El programa incorpora el concepto de <strong>e-government</strong>.</p>
<p>Se refiere al uso de tecnologías de información y comunicación por parte del sector público para mejorar o transformar determinados servicios, procesos e interacciones.</p>
<p>Puede comprender relaciones:</p>
<p><strong>Gobierno → Ciudadanos</strong></p>
<p><strong>Gobierno → Empresas</strong></p>
<p><strong>Gobierno → Gobierno</strong></p>
<p><strong>Gobierno → Funcionarios</strong></p>
<hr />
<h1>26. SERVICIOS DE GOBIERNO ELECTRÓNICO</h1>
<p>Entre los ejemplos conceptuales pueden encontrarse:</p>
<ul>
<li>consultas;</li>
<li>solicitudes;</li>
<li>registros;</li>
<li>certificados;</li>
<li>pagos;</li>
<li>presentación de documentos;</li>
<li>seguimiento de expedientes;</li>
<li>notificaciones;</li>
<li>trámites administrativos.</li>
</ul>
<p>El objetivo es utilizar la tecnología para mejorar aspectos como:</p>
<ul>
<li>acceso;</li>
<li>eficiencia;</li>
<li>trazabilidad;</li>
<li>disponibilidad;</li>
<li>simplificación.</li>
</ul>
<hr />
<h1>27. DIGITALIZAR NO SIGNIFICA TRANSFORMAR</h1>
<p>Supongamos un trámite que requiere:</p>
<ol>
<li>descargar un formulario;</li>
<li>imprimirlo;</li>
<li>completarlo a mano;</li>
<li>escanearlo;</li>
<li>enviarlo por correo.</li>
</ol>
<p>El proceso utiliza tecnología.</p>
<p>Pero debemos preguntarnos:</p>
<p><strong>¿El procedimiento fue realmente transformado o solamente trasladado parcialmente al entorno digital?</strong></p>
<p>La transformación digital debería analizar también:</p>
<ul>
<li>simplificación;</li>
<li>eliminación de pasos innecesarios;</li>
<li>interoperabilidad;</li>
<li>automatización;</li>
<li>experiencia del usuario.</li>
</ul>
<hr />
<h1>28. FIRMA ELECTRÓNICA Y FIRMA DIGITAL</h1>
<p>En el contexto de las operaciones digitales resulta importante distinguir conceptualmente los mecanismos utilizados para identificar, autenticar o expresar conformidad mediante medios electrónicos.</p>
<p>El programa menciona expresamente la <strong>firma digital</strong>.</p>
<p>La firma digital utiliza mecanismos criptográficos que permiten proporcionar garantías relacionadas con la autenticidad e integridad de información digital, dentro del marco técnico y jurídico correspondiente.</p>
<hr />
<h1>29. PRINCIPIOS ASOCIADOS A LA FIRMA DIGITAL</h1>
<p>Entre los conceptos relevantes se encuentran:</p>
<h3>Autenticidad</h3>
<p>Permite aportar elementos para verificar la identidad asociada al firmante.</p>
<h3>Integridad</h3>
<p>Permite detectar modificaciones posteriores en la información firmada.</p>
<h3>Vinculación</h3>
<p>Relaciona la firma con determinada información y con el mecanismo utilizado por el firmante.</p>
<p>El valor jurídico específico dependerá de la legislación y de los requisitos aplicables.</p>
<hr />
<h1>30. FIRMA MANUSCRITA VS. ENTORNO DIGITAL</h1>
<p>En un documento físico tradicional encontramos:</p>
<p><strong>Documento + firma manuscrita</strong></p>
<p>En un entorno electrónico pueden utilizarse mecanismos digitales para proporcionar garantías sobre:</p>
<ul>
<li>identidad;</li>
<li>integridad;</li>
<li>autenticidad;</li>
<li>manifestación de voluntad,</li>
</ul>
<p>según el sistema y marco jurídico aplicable.</p>
<p>La transición no consiste simplemente en colocar una imagen escaneada de una firma sobre un PDF.</p>
<hr />
<h1>31. CERTIFICADOS DIGITALES</h1>
<p>En determinados esquemas de firma digital se utilizan certificados digitales.</p>
<p>Estos permiten vincular información de identidad con elementos criptográficos utilizados en el proceso.</p>
<p>Conceptualmente:</p>
<p><strong>IDENTIDAD</strong></p>
<p>↓</p>
<p><strong>CERTIFICADO</strong></p>
<p>↓</p>
<p><strong>MECANISMO CRIPTOGRÁFICO</strong></p>
<p>↓</p>
<p><strong>FIRMA DIGITAL</strong></p>
<p>↓</p>
<p><strong>VERIFICACIÓN</strong></p>
<hr />
<h1>32. TRANSFORMACIÓN DIGITAL DE LOS NEGOCIOS</h1>
<p>El comercio electrónico es solamente una parte de una transformación más amplia.</p>
<p>Una organización digital puede integrar:</p>
<p><strong>MARKETING</strong></p>
<p>↓</p>
<p><strong>E-COMMERCE</strong></p>
<p>↓</p>
<p><strong>CRM</strong></p>
<p>↓</p>
<p><strong>ERP</strong></p>
<p>↓</p>
<p><strong>PAGOS</strong></p>
<p>↓</p>
<p><strong>LOGÍSTICA</strong></p>
<p>↓</p>
<p><strong>ANALÍTICA</strong></p>
<p>↓</p>
<p><strong>TOMA DE DECISIONES</strong></p>
<p>La verdadera transformación aparece cuando estas tecnologías modifican y mejoran procesos empresariales.</p>
<hr />
<h1>33. OMNICANALIDAD</h1>
<p>Los clientes pueden interactuar mediante diferentes canales:</p>
<ul>
<li>tienda física;</li>
<li>sitio web;</li>
<li>aplicación;</li>
<li>teléfono;</li>
<li>redes sociales;</li>
<li>mensajería.</li>
</ul>
<p>Una estrategia integrada busca evitar que cada canal funcione como un mundo completamente independiente.</p>
<p>Ejemplo:</p>
<p><strong>Consultar online → comprar online → retirar físicamente</strong></p>
<p>o</p>
<p><strong>Consultar físicamente → comprar posteriormente mediante plataforma digital</strong></p>
<p>El objetivo es proporcionar una experiencia coherente.</p>
<hr />
<h1>34. DATOS GENERADOS POR EL NEGOCIO DIGITAL</h1>
<p>Una ventaja importante de los entornos digitales es la capacidad de obtener información sobre el proceso comercial.</p>
<p>Por ejemplo:</p>
<ul>
<li>visitantes;</li>
<li>productos consultados;</li>
<li>carritos;</li>
<li>compras;</li>
<li>frecuencia;</li>
<li>ticket promedio;</li>
<li>abandono;</li>
<li>recurrencia.</li>
</ul>
<p>Estos datos pueden posteriormente alimentar:</p>
<ul>
<li>MIS;</li>
<li>DSS;</li>
<li>EIS;</li>
<li>sistemas analíticos;</li>
<li>herramientas de IA.</li>
</ul>
<p>Por ello, esta unidad se conecta directamente con las unidades anteriores de la asignatura.</p>
<hr />
<h1>35. CASO DE ESTUDIO — “ÑANDE MARKET”</h1>
<p>Una empresa paraguaya posee tres locales físicos y desea comenzar a vender por Internet.</p>
<p>Actualmente utiliza:</p>
<ul>
<li>sistema de inventario;</li>
<li>facturación;</li>
<li>redes sociales;</li>
<li>entrega mediante terceros.</li>
</ul>
<p>La dirección propone:</p>
<blockquote>
<p>“Hagamos una página web y con eso ya tendremos un negocio digital.”</p>
</blockquote>
<h2>Problemas que deben analizarse</h2>
<h3>Tecnología</h3>
<p>¿Cómo funcionará la plataforma?</p>
<h3>Inventario</h3>
<p>¿La disponibilidad online estará actualizada?</p>
<h3>Pago</h3>
<p>¿Cómo pagará el cliente?</p>
<h3>Logística</h3>
<p>¿Cómo llegará el producto?</p>
<h3>Atención</h3>
<p>¿Quién responderá consultas?</p>
<h3>Seguridad</h3>
<p>¿Cómo se protegerán los datos?</p>
<h3>Legal</h3>
<p>¿Qué condiciones y obligaciones deben cumplirse?</p>
<h3>Marketing</h3>
<p>¿Cómo llegarán clientes a la plataforma?</p>
<h3>Analítica</h3>
<p>¿Cómo se medirá el desempeño?</p>
<p>La conclusión es fundamental:</p>
<p><strong>Crear una página web no equivale a construir un negocio digital.</strong></p>
<hr />
<h1>36. ACTIVIDAD PRÁCTICA — CREAR UN NEGOCIO ONLINE</h1>
<p>Los estudiantes deberán diseñar conceptualmente una microempresa digital.</p>
<h2>Paso 1</h2>
<p>Nombre del negocio.</p>
<h2>Paso 2</h2>
<p>Producto o servicio.</p>
<h2>Paso 3</h2>
<p>Cliente objetivo.</p>
<h2>Paso 4</h2>
<p>Propuesta de valor.</p>
<h2>Paso 5</h2>
<p>Categoría:</p>
<ul>
<li>B2C;</li>
<li>B2B;</li>
<li>C2C;</li>
<li>C2B.</li>
</ul>
<h2>Paso 6</h2>
<p>Modelo de ingresos.</p>
<h2>Paso 7</h2>
<p>Canal digital.</p>
<h2>Paso 8</h2>
<p>Sistema de pago.</p>
<h2>Paso 9</h2>
<p>Método de entrega.</p>
<h2>Paso 10</h2>
<p>Atención al cliente.</p>
<h2>Paso 11</h2>
<p>Tres riesgos principales.</p>
<h2>Paso 12</h2>
<p>Tres indicadores para medir el negocio.</p>
<h3>Producto final</h3>
<p>Presentación de <strong>5 minutos</strong> defendiendo la viabilidad del negocio.</p>
<hr />
<h1>37. ACTIVIDAD — CALCULAR LA CONVERSIÓN</h1>
<p>Una tienda recibe durante un mes:</p>
<p><strong>20.000 visitantes</strong></p>
<p>De ellos:</p>
<p><strong>5.000 observan productos</strong></p>
<p><strong>2.500 agregan productos al carrito</strong></p>
<p><strong>1.500 comienzan el pago</strong></p>
<p><strong>1.000 compran</strong></p>
<h2>Preguntas</h2>
<h3>1.</h3>
<p>¿Cuál es la tasa final de conversión?</p>
<p><strong>1.000 / 20.000 × 100 = 5 %</strong></p>
<h3>2.</h3>
<p>¿Cuántos visitantes abandonaron entre carrito e inicio del pago?</p>
<p><strong>1.000 usuarios.</strong></p>
<h3>3.</h3>
<p>¿Qué debería investigar la empresa?</p>
<p>El estudiante puede proponer:</p>
<ul>
<li>precio;</li>
<li>costos adicionales;</li>
<li>dificultad del proceso;</li>
<li>confianza;</li>
<li>medios de pago;</li>
<li>problemas técnicos.</li>
</ul>
<hr />
<h1>38. CASO PARA TOMA DE DECISIONES</h1>
<p>Una tienda online presenta:</p>
<p><strong>Visitas: +40 %</strong></p>
<p><strong>Ventas: +5 %</strong></p>
<p><strong>Abandono de carrito: +35 %</strong></p>
<p><strong>Reclamos: +25 %</strong></p>
<p>El gerente afirma:</p>
<blockquote>
<p>“Nuestra estrategia digital funciona porque tenemos 40 % más visitas.”</p>
</blockquote>
<h2>Pregunta</h2>
<p>¿Está de acuerdo?</p>
<p>No necesariamente.</p>
<p>Las visitas aumentaron considerablemente, pero las ventas crecieron mucho menos y aumentaron el abandono y los reclamos.</p>
<p>El administrador debe evitar analizar <strong>métricas aisladas</strong>.</p>
<hr />
<h1>39. DETECTE EL ERROR</h1>
<p>Una empresa solicita para registrar una compra:</p>
<ul>
<li>nombre;</li>
<li>apellido;</li>
<li>dirección;</li>
<li>teléfono;</li>
<li>fecha de nacimiento;</li>
<li>profesión;</li>
<li>estado civil;</li>
<li>número de documento;</li>
<li>empresa donde trabaja;</li>
<li>ingreso mensual.</li>
</ul>
<p>Pero solamente necesita entregar un producto.</p>
<h2>Pregunta</h2>
<p>¿Todos esos datos son necesarios?</p>
<p>El estudiante deberá analizar el principio de solicitar información proporcional a la finalidad de la operación y los riesgos derivados de recopilar datos innecesarios.</p>
<hr />
<h1>40. DEBATE</h1>
<h2>“¿El comercio electrónico reemplazará completamente al comercio físico?”</h2>
<h3>Grupo A</h3>
<p>Defenderá la afirmación.</p>
<h3>Grupo B</h3>
<p>La cuestionará.</p>
<p>Analizar:</p>
<ul>
<li>costos;</li>
<li>experiencia;</li>
<li>confianza;</li>
<li>logística;</li>
<li>accesibilidad;</li>
<li>tecnología;</li>
<li>hábitos de consumo;</li>
<li>tipos de productos;</li>
<li>omnicanalidad.</li>
</ul>
<p>El objetivo no es determinar un ganador, sino argumentar utilizando conceptos de la unidad.</p>
<hr />
<h1>41. PREGUNTAS DE ANÁLISIS</h1>
<ol>
<li>
<p>¿Cuál es la diferencia entre e-business y e-commerce?</p>
</li>
<li>
<p>¿Qué diferencia existe entre B2B y B2C?</p>
</li>
<li>
<p>¿Por qué una página web no constituye por sí misma un negocio digital?</p>
</li>
<li>
<p>¿Qué importancia tiene la logística en el comercio electrónico?</p>
</li>
<li>
<p>¿Qué función cumplen los sistemas de pago?</p>
</li>
<li>
<p>¿Por qué la confianza es importante en Internet?</p>
</li>
<li>
<p>¿Qué riesgos aparecen al recopilar datos personales?</p>
</li>
<li>
<p>¿Qué significa gobierno electrónico?</p>
</li>
<li>
<p>¿Qué aporta la firma digital?</p>
</li>
<li>
<p>¿Cómo puede utilizar un administrador los datos generados por una tienda online?</p>
</li>
</ol>
<hr />
<h1>42. SÍNTESIS DE LA UNIDAD</h1>
<p>Un negocio digital puede representarse como un sistema:</p>
<p><strong>CLIENTE</strong></p>
<p>↓</p>
<p><strong>CANAL DIGITAL</strong></p>
<p>↓</p>
<p><strong>CATÁLOGO</strong></p>
<p>↓</p>
<p><strong>PEDIDO</strong></p>
<p>↓</p>
<p><strong>PAGO</strong></p>
<p>↓</p>
<p><strong>SISTEMA EMPRESARIAL</strong></p>
<p>↓</p>
<p><strong>INVENTARIO</strong></p>
<p>↓</p>
<p><strong>LOGÍSTICA</strong></p>
<p>↓</p>
<p><strong>ENTREGA</strong></p>
<p>↓</p>
<p><strong>POSVENTA</strong></p>
<p>↓</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>ANÁLISIS</strong></p>
<p>↓</p>
<p><strong>DECISIONES</strong></p>
<p>El comercio electrónico no consiste únicamente en vender mediante Internet.</p>
<p>Requiere integrar:</p>
<p><strong>estrategia + tecnología + procesos + personas + pagos + logística + seguridad + aspectos legales + información.</strong></p>
<hr />
<h1>43. EVALUACIÓN — SELECCIÓN MÚLTIPLE</h1>
<h3>1.</h3>
<p>¿Cuál es la relación más apropiada entre e-business y e-commerce?</p>
<p><strong>A.</strong> Son exactamente lo mismo.</p>
<p><strong>B.</strong> E-commerce puede considerarse parte de un concepto más amplio de e-business.</p>
<p><strong>C.</strong> E-business solamente significa publicidad.</p>
<p><strong>D.</strong> E-commerce no utiliza Internet.</p>
<hr />
<h3>2.</h3>
<p>Una empresa vende directamente a un consumidor final mediante su tienda online. Corresponde a:</p>
<p><strong>A.</strong> B2B.</p>
<p><strong>B.</strong> B2C.</p>
<p><strong>C.</strong> C2C.</p>
<p><strong>D.</strong> C2B.</p>
<hr />
<h3>3.</h3>
<p>Una distribuidora vende mercaderías a supermercados mediante una plataforma digital. Corresponde principalmente a:</p>
<p><strong>A.</strong> B2B.</p>
<p><strong>B.</strong> B2C.</p>
<p><strong>C.</strong> C2C.</p>
<p><strong>D.</strong> C2B.</p>
<hr />
<h3>4.</h3>
<p>¿Cuál es la función principal de una pasarela de pago?</p>
<p><strong>A.</strong> Diseñar productos.</p>
<p><strong>B.</strong> Facilitar tecnológicamente el procesamiento de pagos electrónicos.</p>
<p><strong>C.</strong> Transportar físicamente mercaderías.</p>
<p><strong>D.</strong> Crear publicidad.</p>
<hr />
<h3>5.</h3>
<p>Una tienda tiene 10.000 visitantes y 500 realizan una compra. ¿Cuál es su tasa de conversión?</p>
<p><strong>A.</strong> 50 %.</p>
<p><strong>B.</strong> 20 %.</p>
<p><strong>C.</strong> 5 %.</p>
<p><strong>D.</strong> 0,5 %.</p>
<hr />
<h3>6.</h3>
<p>¿Cuál representa un problema del comercio electrónico?</p>
<p><strong>A.</strong> Seguridad y fraude.</p>
<p><strong>B.</strong> Nunca genera datos.</p>
<p><strong>C.</strong> Elimina completamente la logística.</p>
<p><strong>D.</strong> Impide realizar pagos.</p>
<hr />
<h3>7.</h3>
<p>¿Qué representa mejor el concepto de e-government?</p>
<p><strong>A.</strong> Venta privada de computadoras al público.</p>
<p><strong>B.</strong> Uso de TIC en procesos, servicios e interacciones del sector público.</p>
<p><strong>C.</strong> Exclusivamente redes sociales de funcionarios.</p>
<p><strong>D.</strong> Una tienda online privada.</p>
<hr />
<h3>8.</h3>
<p>¿Cuál es una propiedad importante asociada con la firma digital?</p>
<p><strong>A.</strong> Permitir verificar integridad y autenticidad dentro del sistema correspondiente.</p>
<p><strong>B.</strong> Aumentar la velocidad de Internet.</p>
<p><strong>C.</strong> Eliminar todos los riesgos jurídicos.</p>
<p><strong>D.</strong> Reemplazar los sistemas de pago.</p>
<hr />
<h3>9.</h3>
<p>Una empresa tiene muchas visitas, pero pocas compras. ¿Qué debería analizar principalmente?</p>
<p><strong>A.</strong> Únicamente aumentar visitas.</p>
<p><strong>B.</strong> El proceso de conversión y los puntos de abandono.</p>
<p><strong>C.</strong> Eliminar todos los productos.</p>
<p><strong>D.</strong> Comprar computadoras más grandes.</p>
<hr />
<h3>10.</h3>
<p>¿Cuál es la afirmación más correcta?</p>
<p><strong>A.</strong> Tener una página web significa automáticamente tener un negocio digital exitoso.</p>
<p><strong>B.</strong> El comercio electrónico solamente necesita tecnología.</p>
<p><strong>C.</strong> Un negocio online requiere integrar estrategia, tecnología, procesos, pagos, logística, seguridad y atención.</p>
<p><strong>D.</strong> La logística deja de ser necesaria cuando la venta se realiza por Internet.</p>
<hr />
<h1>CLAVE DE RESPUESTAS</h1>
<p><strong>1-B | 2-B | 3-A | 4-B | 5-C | 6-A | 7-B | 8-A | 9-B | 10-C</strong></p>
<hr />
<h1>44. ACTIVIDAD DE CIERRE</h1>
<p>Responda individualmente:</p>
<h3>1.</h3>
<p>Explique la diferencia entre <strong>tener presencia en Internet</strong> y <strong>poseer un modelo de negocio digital</strong>.</p>
<h3>2.</h3>
<p>Mencione un ejemplo de:</p>
<p><strong>B2C:</strong></p>
<p><strong>B2B:</strong></p>
<p><strong>C2C:</strong></p>
<h3>3.</h3>
<p>Identifique tres elementos necesarios para que una venta online termine exitosamente después de que el cliente presiona “Comprar”.</p>
<h3>4.</h3>
<p>¿Por qué un administrador debe comprender los sistemas de pago aunque no sea programador?</p>
<h3>5.</h3>
<p>Complete:</p>
<p><strong>“Un negocio digital genera valor cuando la tecnología <strong><em>_</em></strong><strong><em>_</em></strong><strong><em>_</em></strong><strong><em>_</em></strong>____.”</strong></p>
<hr />
<h1>IDEA CENTRAL DE LA UNIDAD</h1>
<p><strong>DIGITALIZAR UN CANAL NO SIGNIFICA TRANSFORMAR UN NEGOCIO.</strong></p>
<p>La verdadera transformación ocurre cuando la tecnología modifica de manera coherente la forma en que la organización:</p>
<p><strong>crea valor → atrae clientes → vende → cobra → entrega → atiende → obtiene datos → aprende → toma decisiones.</strong></p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 11,
        "titulo": "Unidad X: Futuro de las TIC",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p><em>Contenido de la Unidad X en desarrollo.</em></p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
    {
        "id": 12,
        "titulo": "Unidad VIII: Sistemas de Apoyo a Ejecutivos (EIS)",
        "tipo": "Presencial",
        "definiciones": """<div class="mb-5"><p>La <strong>Unidad VIII</strong> del programa ADE18 corresponde a <strong>“Sistemas de Apoyo a Ejecutivos (EIS)”</strong>. El programa establece específicamente: concepto, características, factores de éxito, proceso de desarrollo, implantación y efecto del EIS en la planeación y el control organizacional. </p>
<h1>UNIDAD VIII — SISTEMAS DE APOYO A EJECUTIVOS (EIS)</h1>
<p><strong>Asignatura:</strong> Tecnología de la Información y la Comunicación
<strong>Código:</strong> ADE18
<strong>Carrera:</strong> Administración
<strong>Unidad:</strong> VIII
<strong>Tema central:</strong> Información estratégica para la alta dirección</p>
<hr />
<h1>1. INTRODUCCIÓN</h1>
<p>Un gerente operativo necesita conocer qué ocurrió hoy.</p>
<p>Un gerente de área necesita conocer cómo está funcionando su departamento.</p>
<p>Un alto ejecutivo necesita algo diferente:</p>
<p><strong>comprender rápidamente la situación global de la organización para tomar decisiones estratégicas.</strong></p>
<p>Un presidente, director general o gerente general difícilmente puede revisar individualmente:</p>
<ul>
<li>miles de facturas;</li>
<li>registros de ventas;</li>
<li>movimientos de inventario;</li>
<li>operaciones financieras;</li>
<li>informes de cada departamento;</li>
<li>datos de clientes;</li>
<li>información de proveedores.</li>
</ul>
<p>Necesita que esos datos sean <strong>seleccionados, resumidos, comparados y presentados de manera comprensible</strong>.</p>
<p>Los <strong>Sistemas de Apoyo a Ejecutivos (EIS)</strong> responden a esta necesidad.</p>
<hr />
<h1>2. ¿QUÉ ES UN EIS?</h1>
<p><strong>EIS</strong> significa:</p>
<p><strong>Executive Information System</strong></p>
<p>o <strong>Sistema de Información Ejecutiva / Sistema de Apoyo a Ejecutivos</strong>.</p>
<p>Es un sistema orientado principalmente a proporcionar a los niveles superiores de una organización acceso rápido a información relevante, resumida y estratégica para apoyar los procesos de planeación, seguimiento y control.</p>
<p>Su objetivo no consiste simplemente en mostrar datos.</p>
<p>Debe ayudar al ejecutivo a responder preguntas como:</p>
<p><strong>¿Cómo está funcionando la organización?</strong></p>
<p><strong>¿Estamos alcanzando nuestros objetivos?</strong></p>
<p><strong>¿Dónde existen problemas?</strong></p>
<p><strong>¿Qué áreas necesitan atención?</strong></p>
<p><strong>¿Qué tendencias se están produciendo?</strong></p>
<p><strong>¿Qué oportunidades o amenazas aparecen?</strong></p>
<hr />
<h1>3. DEL DATO OPERATIVO A LA INFORMACIÓN EJECUTIVA</h1>
<p>Consideremos una empresa con 20 sucursales.</p>
<p>Cada día genera:</p>
<ul>
<li>8.000 ventas;</li>
<li>600 compras;</li>
<li>300 pagos;</li>
<li>movimientos de inventario;</li>
<li>reclamos;</li>
<li>devoluciones;</li>
<li>gastos;</li>
<li>cobranzas.</li>
</ul>
<p>El presidente de la empresa no necesita analizar inicialmente las 8.000 ventas.</p>
<p>Necesita información como:</p>
<p><strong>Ventas de hoy: G. 1.850 millones</strong></p>
<p><strong>Variación respecto de ayer: +4,5 %</strong></p>
<p><strong>Variación respecto del año anterior: +8,2 %</strong></p>
<p><strong>Sucursal con mayor crecimiento: CDE</strong></p>
<p><strong>Sucursal con mayor caída: San Lorenzo</strong></p>
<p><strong>Margen promedio: 27 %</strong></p>
<p><strong>Cumplimiento de meta mensual: 92 %</strong></p>
<p>El EIS transforma grandes volúmenes de información en una <strong>visión ejecutiva de la organización</strong>.</p>
<hr />
<h1>4. PIRÁMIDE DE INFORMACIÓN ORGANIZACIONAL</h1>
<p>Puede comprenderse mediante diferentes niveles:</p>
<p><strong>NIVEL ESTRATÉGICO</strong></p>
<p>Alta dirección
EIS
Decisiones estratégicas</p>
<p>↓</p>
<p><strong>NIVEL GERENCIAL</strong></p>
<p>Gerentes de áreas
MIS / DSS
Control y decisiones tácticas</p>
<p>↓</p>
<p><strong>NIVEL OPERATIVO</strong></p>
<p>Funcionarios y supervisores
TPS
Operaciones cotidianas</p>
<p>En la base existen miles de transacciones.</p>
<p>A medida que ascendemos, la información se vuelve:</p>
<ul>
<li>más resumida;</li>
<li>más estratégica;</li>
<li>más comparativa;</li>
<li>más orientada al futuro.</li>
</ul>
<hr />
<h1>5. DIFERENCIA ENTRE TPS, MIS, DSS Y EIS</h1>
<h2>TPS</h2>
<p><strong>Pregunta principal:</strong></p>
<p>¿Qué operación ocurrió?</p>
<p>Ejemplo:</p>
<p>Se realizó una venta de G. 3.500.000.</p>
<hr />
<h2>MIS</h2>
<p><strong>Pregunta principal:</strong></p>
<p>¿Cómo está funcionando determinada área?</p>
<p>Ejemplo:</p>
<p>Las ventas mensuales fueron G. 850 millones.</p>
<hr />
<h2>DSS</h2>
<p><strong>Pregunta principal:</strong></p>
<p>¿Qué podría ocurrir si modificamos determinadas variables?</p>
<p>Ejemplo:</p>
<p>¿Qué sucede con la rentabilidad si aumentamos el precio 5 %?</p>
<hr />
<h2>EIS</h2>
<p><strong>Pregunta principal:</strong></p>
<p>¿Cómo está funcionando globalmente la organización y dónde debe concentrarse la atención ejecutiva?</p>
<p>Ejemplo:</p>
<p>El margen global cayó tres puntos porcentuales y dos regiones explican el 70 % de la disminución.</p>
<hr />
<h1>6. CARACTERÍSTICAS DE LOS EIS</h1>
<p>Un Sistema de Información Ejecutiva debe presentar determinadas características.</p>
<h2>6.1. Información resumida</h2>
<p>El ejecutivo necesita inicialmente una visión general.</p>
<p>No debe enfrentarse a miles de registros operativos.</p>
<hr />
<h2>6.2. Información relevante</h2>
<p>Mostrar más información no significa proporcionar mejor información.</p>
<p>Un buen EIS selecciona aquello que tiene importancia estratégica.</p>
<hr />
<h2>6.3. Facilidad de interpretación</h2>
<p>La información debe presentarse de manera que permita comprender rápidamente la situación.</p>
<p>Puede utilizar:</p>
<ul>
<li>indicadores;</li>
<li>gráficos;</li>
<li>tendencias;</li>
<li>comparaciones;</li>
<li>alertas;</li>
<li>tableros.</li>
</ul>
<hr />
<h2>6.4. Información oportuna</h2>
<p>Una información correcta que llega demasiado tarde puede perder gran parte de su utilidad.</p>
<p>El EIS debe proporcionar información con la frecuencia requerida por la decisión.</p>
<hr />
<h2>6.5. Integración</h2>
<p>Puede consolidar información procedente de diferentes áreas:</p>
<ul>
<li>Finanzas;</li>
<li>Ventas;</li>
<li>Marketing;</li>
<li>Recursos Humanos;</li>
<li>Producción;</li>
<li>Logística;</li>
<li>Compras.</li>
</ul>
<hr />
<h2>6.6. Orientación estratégica</h2>
<p>El EIS se concentra especialmente en información vinculada con:</p>
<ul>
<li>objetivos;</li>
<li>resultados;</li>
<li>tendencias;</li>
<li>riesgos;</li>
<li>oportunidades;</li>
<li>desempeño global.</li>
</ul>
<hr />
<h1>7. DASHBOARD O TABLERO EJECUTIVO</h1>
<p>Uno de los mecanismos habituales para presentar información ejecutiva es el <strong>dashboard</strong> o tablero de control.</p>
<p>Un dashboard organiza visualmente indicadores importantes para facilitar su seguimiento.</p>
<p>Ejemplo:</p>
<h2>TABLERO EJECUTIVO — SEPTIEMBRE</h2>
<p><strong>Ventas:</strong> G. 5.250 millones
<strong>Meta:</strong> G. 5.500 millones
<strong>Cumplimiento:</strong> 95,5 %</p>
<p><strong>Margen:</strong> 24 %
<strong>Objetivo:</strong> 27 %</p>
<p><strong>Clientes nuevos:</strong> 485
<strong>Meta:</strong> 450</p>
<p><strong>Morosidad:</strong> 8,5 %
<strong>Máximo esperado:</strong> 6 %</p>
<p><strong>Satisfacción del cliente:</strong> 87 %
<strong>Meta:</strong> 90 %</p>
<p>Un ejecutivo puede identificar inmediatamente:</p>
<p><strong>Ventas:</strong> cerca de la meta.</p>
<p><strong>Clientes nuevos:</strong> por encima de la meta.</p>
<p><strong>Margen:</strong> requiere atención.</p>
<p><strong>Morosidad:</strong> alerta.</p>
<hr />
<h1>8. INDICADORES CLAVE DE DESEMPEÑO — KPI</h1>
<p><strong>KPI</strong> significa:</p>
<p><strong>Key Performance Indicator</strong></p>
<p>o <strong>Indicador Clave de Desempeño</strong>.</p>
<p>Un KPI permite medir un aspecto considerado importante para el cumplimiento de los objetivos organizacionales.</p>
<p>Ejemplos:</p>
<h3>Ventas</h3>
<ul>
<li>crecimiento mensual;</li>
<li>cumplimiento de meta;</li>
<li>ventas por sucursal.</li>
</ul>
<h3>Finanzas</h3>
<ul>
<li>rentabilidad;</li>
<li>liquidez;</li>
<li>morosidad;</li>
<li>margen.</li>
</ul>
<h3>Clientes</h3>
<ul>
<li>satisfacción;</li>
<li>retención;</li>
<li>reclamos.</li>
</ul>
<h3>Recursos Humanos</h3>
<ul>
<li>rotación;</li>
<li>ausentismo;</li>
<li>productividad.</li>
</ul>
<h3>Operaciones</h3>
<ul>
<li>tiempo de entrega;</li>
<li>nivel de inventario;</li>
<li>pedidos pendientes.</li>
</ul>
<hr />
<h1>9. KPI NO ES CUALQUIER DATO</h1>
<p>Supongamos que una empresa registra 200 variables.</p>
<p>No significa que posea 200 KPI.</p>
<p>Un indicador clave debe estar vinculado con:</p>
<ul>
<li>objetivos;</li>
<li>prioridades;</li>
<li>resultados importantes;</li>
<li>decisiones.</li>
</ul>
<p>Ejemplo:</p>
<p><strong>Cantidad de impresiones realizadas:</strong> puede ser una métrica.</p>
<p><strong>Rentabilidad por sucursal:</strong> podría ser un KPI estratégico.</p>
<p>La diferencia depende de la importancia que la variable tenga para los objetivos de la organización.</p>
<hr />
<h1>10. META, RESULTADO Y DESVIACIÓN</h1>
<p>Un EIS adquiere mayor valor cuando no muestra solamente resultados, sino que permite compararlos.</p>
<p>Ejemplo:</p>
<p><strong>Meta de ventas:</strong> G. 1.000 millones</p>
<p><strong>Resultado:</strong> G. 850 millones</p>
<p><strong>Cumplimiento:</strong> 85 %</p>
<p><strong>Desviación:</strong> -15 %</p>
<p>El ejecutivo puede observar rápidamente que existe una diferencia entre lo planificado y lo realizado.</p>
<p>Esto vincula directamente al EIS con los procesos de <strong>planeación y control</strong>.</p>
<hr />
<h1>11. INFORMACIÓN INTERNA Y EXTERNA</h1>
<p>Un EIS puede utilizar información procedente de la propia organización y, cuando corresponda, información externa.</p>
<h2>Información interna</h2>
<ul>
<li>ventas;</li>
<li>costos;</li>
<li>presupuestos;</li>
<li>inventarios;</li>
<li>producción;</li>
<li>clientes;</li>
<li>recursos humanos.</li>
</ul>
<h2>Información externa</h2>
<p>Según las necesidades de la organización:</p>
<ul>
<li>comportamiento del mercado;</li>
<li>competidores;</li>
<li>indicadores económicos;</li>
<li>cambios regulatorios;</li>
<li>tendencias sectoriales;</li>
<li>información de proveedores.</li>
</ul>
<p>La alta dirección necesita comprender tanto lo que ocurre <strong>dentro de la empresa</strong> como determinados cambios relevantes del entorno.</p>
<hr />
<h1>12. DRILL-DOWN</h1>
<p>Aunque el ejecutivo comienza con información resumida, en determinadas situaciones necesita conocer el origen de un resultado.</p>
<p>El <strong>drill-down</strong> permite avanzar desde información general hacia niveles de mayor detalle.</p>
<p>Ejemplo:</p>
<p><strong>Ventas nacionales: -12 %</strong></p>
<p>↓</p>
<p><strong>Región Central: -18 %</strong></p>
<p>↓</p>
<p><strong>Sucursal San Lorenzo: -25 %</strong></p>
<p>↓</p>
<p><strong>Categoría electrónica: -38 %</strong></p>
<p>↓</p>
<p><strong>Producto X: -52 %</strong></p>
<p>El ejecutivo comienza observando un problema general y progresivamente profundiza hasta localizar dónde se produce.</p>
<hr />
<h1>13. ALERTAS Y EXCEPCIONES</h1>
<p>Un EIS puede destacar situaciones que requieren atención.</p>
<p>Ejemplo:</p>
<p><strong>Morosidad objetivo: ≤ 5 %</strong></p>
<p>Resultado:</p>
<p><strong>8,7 %</strong></p>
<p>El sistema puede destacar esta desviación para que el ejecutivo no tenga que revisar manualmente cada indicador.</p>
<p>Esto se relaciona con el principio de <strong>administración por excepción</strong>:</p>
<p>la dirección concentra su atención especialmente en desviaciones importantes.</p>
<hr />
<h1>14. INFORMACIÓN VISUAL</h1>
<p>La visualización facilita la identificación de:</p>
<ul>
<li>tendencias;</li>
<li>diferencias;</li>
<li>anomalías;</li>
<li>relaciones;</li>
<li>evolución temporal.</li>
</ul>
<p>Sin embargo, un gráfico debe responder a una necesidad concreta.</p>
<p>Un dashboard saturado de:</p>
<ul>
<li>colores;</li>
<li>gráficos;</li>
<li>indicadores;</li>
<li>animaciones;</li>
<li>información irrelevante</li>
</ul>
<p>puede dificultar la toma de decisiones.</p>
<p>El objetivo no es crear el tablero más llamativo.</p>
<p>El objetivo es <strong>comunicar información estratégica de forma clara</strong>.</p>
<hr />
<h1>15. FACTORES DE ÉXITO DE UN EIS</h1>
<p>La implementación exitosa de un EIS depende de diferentes factores.</p>
<h2>15.1. Apoyo de la alta dirección</h2>
<p>El sistema debe responder a necesidades reales de los ejecutivos.</p>
<hr />
<h2>15.2. Identificación correcta de requerimientos</h2>
<p>Debe determinarse:</p>
<p><strong>¿Qué decisiones toma el ejecutivo?</strong></p>
<p><strong>¿Qué información necesita?</strong></p>
<p><strong>¿Con qué frecuencia?</strong></p>
<p><strong>¿Qué indicadores son verdaderamente importantes?</strong></p>
<hr />
<h2>15.3. Calidad de datos</h2>
<p>Un dashboard visualmente excelente no tiene valor si utiliza información incorrecta.</p>
<p>Principio fundamental:</p>
<p><strong>Datos incorrectos → Información incorrecta → Decisiones potencialmente incorrectas</strong></p>
<hr />
<h2>15.4. Integración</h2>
<p>Si Finanzas, Ventas y Administración utilizan definiciones diferentes para los mismos conceptos, aparecerán inconsistencias.</p>
<p>Ejemplo:</p>
<p>Ventas afirma:</p>
<p><strong>Facturación mensual: G. 5.000 millones.</strong></p>
<p>Finanzas afirma:</p>
<p><strong>Facturación mensual: G. 4.600 millones.</strong></p>
<p>Antes de construir el tablero debe determinarse por qué existen diferencias.</p>
<hr />
<h2>15.5. Facilidad de uso</h2>
<p>El sistema debe permitir que los ejecutivos accedan a la información sin complejidad innecesaria.</p>
<hr />
<h2>15.6. Información relevante</h2>
<p>El EIS debe evitar la sobrecarga.</p>
<p><strong>Más indicadores ≠ mejor sistema ejecutivo.</strong></p>
<hr />
<h2>15.7. Actualización</h2>
<p>La frecuencia debe responder a la naturaleza del indicador.</p>
<p>Algunos datos pueden requerir actualización:</p>
<ul>
<li>inmediata;</li>
<li>diaria;</li>
<li>semanal;</li>
<li>mensual;</li>
<li>trimestral.</li>
</ul>
<hr />
<h1>16. PROCESO DE DESARROLLO DE UN EIS</h1>
<p>El desarrollo puede estructurarse conceptualmente en diferentes etapas.</p>
<h2>Etapa 1 — Identificar objetivos estratégicos</h2>
<p>¿Qué quiere alcanzar la organización?</p>
<p>Ejemplo:</p>
<p>Aumentar la rentabilidad.</p>
<hr />
<h2>Etapa 2 — Identificar necesidades ejecutivas</h2>
<p>¿Qué necesita conocer la dirección para gestionar ese objetivo?</p>
<hr />
<h2>Etapa 3 — Definir indicadores</h2>
<p>Ejemplo:</p>
<ul>
<li>ventas;</li>
<li>margen;</li>
<li>costos;</li>
<li>rentabilidad.</li>
</ul>
<hr />
<h2>Etapa 4 — Identificar fuentes de datos</h2>
<p>¿Dónde se encuentran los datos?</p>
<ul>
<li>ERP;</li>
<li>CRM;</li>
<li>sistema financiero;</li>
<li>hojas de cálculo;</li>
<li>bases de datos;</li>
<li>fuentes externas.</li>
</ul>
<hr />
<h2>Etapa 5 — Integrar y validar</h2>
<p>Los datos deben:</p>
<ul>
<li>consolidarse;</li>
<li>depurarse;</li>
<li>verificarse;</li>
<li>estandarizarse.</li>
</ul>
<hr />
<h2>Etapa 6 — Diseñar la presentación</h2>
<p>Determinar:</p>
<ul>
<li>indicadores;</li>
<li>gráficos;</li>
<li>comparaciones;</li>
<li>alertas;</li>
<li>filtros;</li>
<li>niveles de detalle.</li>
</ul>
<hr />
<h2>Etapa 7 — Probar</h2>
<p>Debe verificarse:</p>
<ul>
<li>exactitud;</li>
<li>claridad;</li>
<li>rendimiento;</li>
<li>facilidad de uso.</li>
</ul>
<hr />
<h2>Etapa 8 — Implantar</h2>
<p>El sistema se incorpora a las actividades de gestión.</p>
<hr />
<h2>Etapa 9 — Evaluar y mejorar</h2>
<p>Los objetivos de la organización cambian.</p>
<p>Por ello, los indicadores también pueden necesitar modificaciones.</p>
<hr />
<h1>17. IMPLANTACIÓN DEL EIS</h1>
<p>La implantación no debe considerarse solamente una instalación tecnológica.</p>
<p>Requiere considerar:</p>
<h3>Personas</h3>
<p>¿Quién utilizará la información?</p>
<h3>Procesos</h3>
<p>¿Cómo se incorporará el tablero a reuniones y decisiones?</p>
<h3>Datos</h3>
<p>¿Son confiables?</p>
<h3>Tecnología</h3>
<p>¿La infraestructura soporta el sistema?</p>
<h3>Capacitación</h3>
<p>¿Los usuarios saben interpretar los indicadores?</p>
<h3>Gestión del cambio</h3>
<p>¿La organización está preparada para utilizar una administración más basada en información?</p>
<hr />
<h1>18. EIS Y PLANEACIÓN</h1>
<p>La <strong>planeación</strong> determina:</p>
<ul>
<li>qué queremos alcanzar;</li>
<li>cómo pretendemos lograrlo;</li>
<li>qué recursos utilizaremos;</li>
<li>qué resultados esperamos.</li>
</ul>
<p>Ejemplo:</p>
<p>Objetivo anual:</p>
<p><strong>Aumentar ventas 15 %.</strong></p>
<p>El EIS permite monitorear periódicamente:</p>
<p><strong>Meta acumulada:</strong> +15 %</p>
<p><strong>Resultado actual:</strong> +8 %</p>
<p>El ejecutivo puede identificar anticipadamente que el ritmo de crecimiento es insuficiente.</p>
<hr />
<h1>19. EIS Y CONTROL</h1>
<p>El control administrativo implica comparar:</p>
<p><strong>lo planificado</strong></p>
<p>con</p>
<p><strong>lo realizado.</strong></p>
<p>La lógica puede expresarse:</p>
<p><strong>OBJETIVO</strong></p>
<p>↓</p>
<p><strong>META</strong></p>
<p>↓</p>
<p><strong>INDICADOR</strong></p>
<p>↓</p>
<p><strong>RESULTADO</strong></p>
<p>↓</p>
<p><strong>COMPARACIÓN</strong></p>
<p>↓</p>
<p><strong>DESVIACIÓN</strong></p>
<p>↓</p>
<p><strong>ACCIÓN CORRECTIVA</strong></p>
<p>El EIS facilita especialmente las etapas de seguimiento, comparación e identificación de desviaciones.</p>
<hr />
<h1>20. EJEMPLO DE CONTROL EJECUTIVO</h1>
<p>Una empresa establece:</p>
<p><strong>Meta de entregas a tiempo: 95 %</strong></p>
<p>Resultado:</p>
<p><strong>Enero: 96 %</strong></p>
<p><strong>Febrero: 95 %</strong></p>
<p><strong>Marzo: 92 %</strong></p>
<p><strong>Abril: 88 %</strong></p>
<p>Aunque el resultado de abril todavía pueda parecer relativamente alto, el ejecutivo debería observar una <strong>tendencia negativa</strong>.</p>
<p>El valor de un EIS no está solamente en mostrar el 88 %.</p>
<p>También debe facilitar reconocer:</p>
<p><strong>96 → 95 → 92 → 88</strong></p>
<p>La tendencia puede ser más importante que un valor aislado.</p>
<hr />
<h1>21. EFECTO DEL EIS EN LA ORGANIZACIÓN</h1>
<p>Un EIS correctamente implementado puede contribuir a:</p>
<ul>
<li>mejorar visibilidad organizacional;</li>
<li>reducir tiempo de acceso a información;</li>
<li>detectar desviaciones;</li>
<li>realizar seguimiento de objetivos;</li>
<li>integrar información de diferentes áreas;</li>
<li>fortalecer procesos de planeación;</li>
<li>apoyar el control gerencial;</li>
<li>identificar tendencias;</li>
<li>focalizar la atención ejecutiva.</li>
</ul>
<p>Pero un EIS no garantiza automáticamente una buena administración.</p>
<p>La calidad de las decisiones continúa dependiendo de:</p>
<ul>
<li>calidad de los datos;</li>
<li>correcta interpretación;</li>
<li>capacidad administrativa;</li>
<li>contexto;</li>
<li>experiencia;</li>
<li>criterios utilizados.</li>
</ul>
<hr />
<h1>22. CASO DE ESTUDIO — GRUPO CENTURIA</h1>
<p>Una empresa posee cinco sucursales.</p>
<p>La dirección recibe mensualmente 15 informes diferentes en hojas de cálculo.</p>
<p>El director general manifiesta:</p>
<blockquote>
<p>“Tenemos muchos datos, pero no puedo saber rápidamente si la empresa está mejor o peor que el mes pasado.”</p>
</blockquote>
<p>Se decide implementar un EIS.</p>
<h2>Objetivos estratégicos</h2>
<ol>
<li>
<p>Incrementar ventas.</p>
</li>
<li>
<p>Mejorar rentabilidad.</p>
</li>
<li>
<p>Reducir morosidad.</p>
</li>
<li>
<p>Mejorar satisfacción de clientes.</p>
</li>
</ol>
<h2>Indicadores seleccionados</h2>
<h3>Ventas</h3>
<ul>
<li>ventas totales;</li>
<li>crecimiento;</li>
<li>cumplimiento de meta.</li>
</ul>
<h3>Rentabilidad</h3>
<ul>
<li>margen;</li>
<li>rentabilidad por sucursal.</li>
</ul>
<h3>Cobranzas</h3>
<ul>
<li>morosidad;</li>
<li>cuentas vencidas.</li>
</ul>
<h3>Clientes</h3>
<ul>
<li>satisfacción;</li>
<li>reclamos.</li>
</ul>
<p>El director pasa de recibir 15 informes independientes a disponer inicialmente de un tablero ejecutivo con los indicadores fundamentales.</p>
<p>Cuando detecta una anomalía puede profundizar en la información.</p>
<hr />
<h1>23. ACTIVIDAD PRÁCTICA — CONSTRUIR UN TABLERO EJECUTIVO</h1>
<h2>Situación</h2>
<p>Usted forma parte del equipo directivo de una empresa comercial.</p>
<p>Dispone de los siguientes resultados:</p>
<p><strong>Ventas</strong></p>
<p>Meta: G. 1.000 millones
Real: G. 920 millones</p>
<p><strong>Rentabilidad</strong></p>
<p>Meta: 20 %
Real: 16 %</p>
<p><strong>Morosidad</strong></p>
<p>Máximo esperado: 5 %
Real: 9 %</p>
<p><strong>Clientes nuevos</strong></p>
<p>Meta: 150
Real: 185</p>
<p><strong>Satisfacción</strong></p>
<p>Meta: 90 %
Real: 84 %</p>
<h2>Actividad</h2>
<p>Determine:</p>
<p><strong>1. ¿Qué indicadores cumplen sus metas?</strong></p>
<p><strong>2. ¿Cuáles presentan desviaciones negativas?</strong></p>
<p><strong>3. ¿Cuál considera más crítico?</strong></p>
<p><strong>4. ¿Qué indicador analizaría primero?</strong></p>
<p><strong>5. ¿Qué información adicional solicitaría?</strong></p>
<p><strong>6. ¿Qué decisión podría considerar la dirección?</strong></p>
<p>El objetivo es comprender que un EIS <strong>no termina en el gráfico</strong>.</p>
<p>El tablero debe provocar:</p>
<p><strong>preguntas → análisis → decisiones.</strong></p>
<hr />
<h1>24. ACTIVIDAD DE DISEÑO</h1>
<p>Imagine que es gerente general de una universidad.</p>
<p>Seleccione únicamente <strong>seis KPI</strong> que desearía observar cada semana o cada mes.</p>
<p>Puede considerar:</p>
<ul>
<li>cantidad de estudiantes;</li>
<li>nuevos estudiantes;</li>
<li>deserción;</li>
<li>morosidad;</li>
<li>ingresos;</li>
<li>gastos;</li>
<li>asistencia;</li>
<li>satisfacción;</li>
<li>rendimiento académico;</li>
<li>disponibilidad tecnológica.</li>
</ul>
<p>Debe justificar:</p>
<p><strong>¿Por qué seleccionó esos seis?</strong></p>
<p>La dificultad consiste precisamente en <strong>no seleccionar todos</strong>.</p>
<p>Un ejecutivo debe distinguir entre información disponible e información verdaderamente estratégica.</p>
<hr />
<h1>25. DETECTE EL ERROR</h1>
<p>Un gerente solicita:</p>
<blockquote>
<p>“Quiero un dashboard con todos los datos que tenemos. Si tenemos 300 indicadores, quiero ver los 300.”</p>
</blockquote>
<h2>Pregunta</h2>
<p>¿Qué problema existe en esta solicitud?</p>
<p>Un EIS debe priorizar información relevante.</p>
<p>Presentar cientos de indicadores simultáneamente puede generar:</p>
<ul>
<li>sobrecarga;</li>
<li>confusión;</li>
<li>pérdida de prioridades;</li>
<li>dificultad para identificar desviaciones.</li>
</ul>
<p>La información ejecutiva debe ser <strong>selectiva y orientada a objetivos</strong>.</p>
<hr />
<h1>26. SEGUNDO ERROR</h1>
<p>El tablero indica:</p>
<p><strong>Ventas: G. 5.800 millones</strong></p>
<p>El gerente celebra el resultado.</p>
<p>Sin embargo, no conoce:</p>
<ul>
<li>la meta;</li>
<li>las ventas anteriores;</li>
<li>el presupuesto;</li>
<li>los costos;</li>
<li>la rentabilidad.</li>
</ul>
<h2>Reflexión</h2>
<p>¿Podemos afirmar que G. 5.800 millones representa un buen resultado?</p>
<p><strong>No necesariamente.</strong></p>
<p>Un valor aislado necesita contexto.</p>
<p>La información ejecutiva adquiere significado mediante:</p>
<p><strong>comparación + objetivo + tendencia + contexto.</strong></p>
<hr />
<h1>27. DESAFÍO PROFESIONAL</h1>
<p>Una empresa presenta estos resultados:</p>
<p><strong>Ventas:</strong> +18 %</p>
<p><strong>Clientes:</strong> +22 %</p>
<p><strong>Margen:</strong> -9 %</p>
<p><strong>Morosidad:</strong> +35 %</p>
<p>El director afirma:</p>
<blockquote>
<p>“La empresa está excelente porque las ventas aumentaron.”</p>
</blockquote>
<p>¿Está de acuerdo?</p>
<p>El estudiante debe comprender que una organización no puede evaluarse mediante un único indicador.</p>
<p>Las ventas crecieron, pero:</p>
<ul>
<li>disminuyó el margen;</li>
<li>aumentó significativamente la morosidad.</li>
</ul>
<p>Por lo tanto, el crecimiento de ventas no garantiza necesariamente una mejora global del desempeño.</p>
<hr />
<h1>28. PREGUNTAS PARA DISCUSIÓN</h1>
<ol>
<li>
<p>¿Qué información debería observar diariamente un gerente general?</p>
</li>
<li>
<p>¿Qué información debería observar mensualmente?</p>
</li>
<li>
<p>¿Todos los datos empresariales deberían aparecer en un EIS?</p>
</li>
<li>
<p>¿Cuál es el riesgo de utilizar demasiados KPI?</p>
</li>
<li>
<p>¿Puede existir un excelente dashboard basado en datos incorrectos?</p>
</li>
<li>
<p>¿Por qué las metas son necesarias para interpretar resultados?</p>
</li>
<li>
<p>¿Qué diferencia existe entre mostrar información y apoyar una decisión?</p>
</li>
<li>
<p>¿Un EIS puede reemplazar la experiencia del ejecutivo?</p>
</li>
<li>
<p>¿Qué indicador utilizaría para medir el desempeño de una universidad?</p>
</li>
<li>
<p>¿Qué indicador eliminaría de un tablero si no contribuye a ninguna decisión?</p>
</li>
</ol>
<hr />
<h1>29. SÍNTESIS CONCEPTUAL</h1>
<p>El funcionamiento de un EIS puede resumirse:</p>
<p><strong>OPERACIONES</strong></p>
<p>↓</p>
<p><strong>DATOS</strong></p>
<p>↓</p>
<p><strong>INTEGRACIÓN</strong></p>
<p>↓</p>
<p><strong>INDICADORES</strong></p>
<p>↓</p>
<p><strong>DASHBOARD EJECUTIVO</strong></p>
<p>↓</p>
<p><strong>COMPARACIÓN CON METAS</strong></p>
<p>↓</p>
<p><strong>IDENTIFICACIÓN DE DESVIACIONES</strong></p>
<p>↓</p>
<p><strong>ANÁLISIS</strong></p>
<p>↓</p>
<p><strong>DECISIÓN</strong></p>
<p>↓</p>
<p><strong>CONTROL</strong></p>
<p>El principio fundamental de esta unidad es:</p>
<blockquote>
<p><strong>Un ejecutivo no necesita todos los datos; necesita la información correcta, en el momento adecuado y presentada de manera que pueda comprender la situación y actuar.</strong></p>
</blockquote>
<hr />
<h1>30. EVALUACIÓN — SELECCIÓN MÚLTIPLE</h1>
<h2>1.</h2>
<p>¿Cuál es el objetivo principal de un EIS?</p>
<p><strong>A.</strong> Registrar cada transacción individual.</p>
<p><strong>B.</strong> Proporcionar información estratégica a la alta dirección.</p>
<p><strong>C.</strong> Reparar computadoras.</p>
<p><strong>D.</strong> Administrar exclusivamente el correo electrónico.</p>
<hr />
<h2>2.</h2>
<p>¿Qué significa KPI?</p>
<p><strong>A.</strong> Key Performance Indicator.</p>
<p><strong>B.</strong> Knowledge Processing Internet.</p>
<p><strong>C.</strong> Key Programming Interface.</p>
<p><strong>D.</strong> Knowledge Performance Internet.</p>
<hr />
<h2>3.</h2>
<p>¿Cuál sería el mejor ejemplo de un KPI ejecutivo?</p>
<p><strong>A.</strong> Cantidad de teclados de la empresa.</p>
<p><strong>B.</strong> Rentabilidad mensual comparada con la meta.</p>
<p><strong>C.</strong> Nombre de cada archivo almacenado.</p>
<p><strong>D.</strong> Cantidad de páginas impresas por un empleado.</p>
<hr />
<h2>4.</h2>
<p>¿Qué permite realizar el drill-down?</p>
<p><strong>A.</strong> Eliminar automáticamente los datos.</p>
<p><strong>B.</strong> Pasar de información resumida hacia niveles de mayor detalle.</p>
<p><strong>C.</strong> Desconectar usuarios.</p>
<p><strong>D.</strong> Crear redes inalámbricas.</p>
<hr />
<h2>5.</h2>
<p>Una empresa tiene una meta de ventas de G. 1.000 millones y alcanza G. 800 millones. ¿Cuál es su cumplimiento?</p>
<p><strong>A.</strong> 20 %.</p>
<p><strong>B.</strong> 80 %.</p>
<p><strong>C.</strong> 100 %.</p>
<p><strong>D.</strong> 125 %.</p>
<hr />
<h2>6.</h2>
<p>¿Cuál es un factor fundamental para el éxito de un EIS?</p>
<p><strong>A.</strong> Mostrar la mayor cantidad posible de gráficos.</p>
<p><strong>B.</strong> Utilizar exclusivamente datos externos.</p>
<p><strong>C.</strong> Calidad y relevancia de los datos.</p>
<p><strong>D.</strong> Eliminar las metas empresariales.</p>
<hr />
<h2>7.</h2>
<p>¿Cuál representa correctamente la lógica del control administrativo?</p>
<p><strong>A.</strong> Resultado → ignorar meta → continuar.</p>
<p><strong>B.</strong> Meta → resultado → comparación → desviación → acción.</p>
<p><strong>C.</strong> Compra → venta → impresión.</p>
<p><strong>D.</strong> Hardware → software → Internet.</p>
<hr />
<h2>8.</h2>
<p>Un tablero muestra 150 indicadores simultáneamente y el gerente no puede determinar cuáles requieren atención. ¿Cuál es el principal problema?</p>
<p><strong>A.</strong> Falta de información.</p>
<p><strong>B.</strong> Sobrecarga de información.</p>
<p><strong>C.</strong> Falta de computadoras.</p>
<p><strong>D.</strong> Exceso de almacenamiento.</p>
<hr />
<h2>9.</h2>
<p>¿Cuál es la diferencia más importante entre TPS y EIS?</p>
<p><strong>A.</strong> No existe diferencia.</p>
<p><strong>B.</strong> TPS se orienta al registro de operaciones y EIS a información estratégica para ejecutivos.</p>
<p><strong>C.</strong> EIS solamente almacena documentos.</p>
<p><strong>D.</strong> TPS solamente funciona con Internet.</p>
<hr />
<h2>10.</h2>
<p>Las ventas aumentaron 20 %, pero el margen disminuyó y la morosidad aumentó considerablemente. ¿Cuál es la conclusión más apropiada?</p>
<p><strong>A.</strong> La empresa necesariamente está mejor porque aumentaron las ventas.</p>
<p><strong>B.</strong> La empresa necesariamente está en quiebra.</p>
<p><strong>C.</strong> Deben analizarse conjuntamente varios indicadores antes de evaluar el desempeño.</p>
<p><strong>D.</strong> Los demás indicadores pueden ignorarse.</p>
<hr />
<h1>CLAVE DE RESPUESTAS</h1>
<p><strong>1-B | 2-A | 3-B | 4-B | 5-B | 6-C | 7-B | 8-B | 9-B | 10-C</strong></p>
<hr />
<h1>31. ACTIVIDAD DE CIERRE</h1>
<p>Responda individualmente:</p>
<h3>1.</h3>
<p>Explique en una oración qué diferencia un EIS de un sistema transaccional.</p>
<h3>2.</h3>
<p>Seleccione tres KPI que utilizaría si fuera gerente general de una empresa comercial.</p>
<h3>3.</h3>
<p>¿Qué es más peligroso para un ejecutivo: no tener información o tomar decisiones basándose en información incorrecta? Fundamente.</p>
<h3>4.</h3>
<p>Complete:</p>
<p><strong>“Un buen tablero ejecutivo no es el que muestra más datos, sino el que <strong><em>_</em></strong><strong><em>_</em></strong><strong><em>_</em></strong><strong><em>_</em></strong>____.”</strong></p>
<hr />
<h1>IDEA CENTRAL DE LA UNIDAD</h1>
<p><strong>MEDIR NO ES LO MISMO QUE CONTROLAR.</strong></p>
<p>Una organización puede medir cientos de variables.</p>
<p>El control administrativo aparece cuando esos resultados son:</p>
<p><strong>comparados con objetivos, interpretados y utilizados para decidir acciones.</strong></p>
<p>El EIS constituye el puente tecnológico entre la información organizacional y la visión estratégica de la alta dirección.</p>
<p>El desarrollo se mantiene dentro de los contenidos expresamente establecidos por el programa para esta unidad: <strong>concepto, características, factores de éxito, desarrollo, implantación y efecto del EIS sobre la planeación y el control</strong>. </p>
<p>La secuencia también enlaza con la Unidad VII: primero el estudiante estudia tecnologías de apoyo a decisiones y luego asciende al <strong>nivel ejecutivo y estratégico de la información organizacional</strong>.</p></div>""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    },
]


template_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{titulo_pagina} - TIC Centuria</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        body {{ background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.7; }}
        body.locked {{ overflow: hidden; }}
        #login-mask {{ position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(30,43,60,0.98); z-index: 9999; display: flex; align-items: center; justify-content: center; }}
        .login-box {{ background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); max-width: 450px; width: 95%; }}
        .sidebar {{ background-color: #1e2b3c; min-height: 100vh; color: white; padding-top: 0; }}
        .sidebar h5 {{ color: #ecf0f1; font-weight: bold; padding: 15px; margin-bottom: 0; text-align: center; background: #16202c; }}
        .sidebar a {{ color: #bdc3c7; text-decoration: none; display: block; padding: 12px 20px; border-bottom: 1px solid #2c3e50; transition: 0.2s; }}
        .sidebar a:hover, .sidebar a.active {{ background-color: #2c3e50; color: white; padding-left: 25px; border-left: 4px solid #3498db; }}
        .content {{ padding: 50px 8%; background-color: white; min-height: 100vh; }}
        h1.page-title {{ color: #2c3e50; font-weight: 800; border-bottom: 4px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; font-size: 2.2rem; }}
        
        .section-card {{ background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 25px; margin-bottom: 35px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border-left: 5px solid; position: relative; }}
        .border-def {{ border-left-color: #3498db; }}
        .border-casos {{ border-left-color: #e74c3c; }}
        .border-comp {{ border-left-color: #9b59b6; }}
        .border-ej {{ border-left-color: #f1c40f; }}
        .border-bib {{ border-left-color: #2ecc71; }}
        
        .section-title {{ font-size: 1.4rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }}
        .text-def {{ color: #2980b9; }}
        .text-casos {{ color: #c0392b; }}
        .text-comp {{ color: #8e44ad; }}
        .text-ej {{ color: #f39c12; }}
        .text-bib {{ color: #27ae60; }}
        
        table {{ font-size: 1.1rem; }}
        p {{ font-size: 1.15rem; color: #444; text-align: justify; margin-bottom: 15px; }}
        
        .badge-presencial {{ background-color: #e74c3c; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }}
        .badge-virtual {{ background-color: #2980b9; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }}
        .badge-asincronica {{ background-color: #27ae60; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }}
    </style>
</head>
<body class="locked">
    <div id="login-mask">
        <div class="login-box">
            <h3 class="mb-4 text-center text-dark fw-bold"><i class="bi bi-mortarboard-fill text-primary"></i> Portal Estudiantil</h3>
            
            <ul class="nav nav-pills nav-justified mb-4" id="authTabs">
                <li class="nav-item"><a class="nav-link active fw-bold" id="tab-login" href="#" style="cursor:pointer;">Ingreso</a></li>
                <li class="nav-item"><a class="nav-link fw-bold" id="tab-register" href="#" style="cursor:pointer;">Registro</a></li>
            </ul>
            
            <div id="form-login">
                <input type="text" id="login-cedula" class="form-control form-control-lg mb-3" placeholder="Número de Cédula">
                <button id="btn-login" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm">Ingresar a Clases</button>
                <p id="login-error" class="text-danger mt-3 text-center fs-5" style="display:none; font-weight:bold;">Cédula no registrada.</p>
            </div>
            
            <div id="form-register" style="display:none;">
                <input type="text" id="reg-nombre" class="form-control mb-2" placeholder="Nombre">
                <input type="text" id="reg-apellido" class="form-control mb-2" placeholder="Apellido">
                <input type="text" id="reg-cedula" class="form-control mb-2" placeholder="Cédula de Identidad">
                <input type="text" id="reg-telefono" class="form-control mb-2" placeholder="Teléfono">
                <input type="email" id="reg-email" class="form-control mb-4" placeholder="Correo Electrónico">
                <button id="btn-register" class="btn btn-success w-100 fw-bold shadow-sm">Completar Registro</button>
                <p id="reg-msg" class="text-center mt-3 fs-5 fw-bold"></p>
            </div>
        </div>
    </div>
    
    <div class="container-fluid">
        <div class="row">
            <nav class="col-md-3 col-lg-2 sidebar px-0 fixed-top" style="position: sticky; top: 0;">
                <h5>CENTURIA ADE18</h5>
                <div class="text-center p-3 border-bottom border-secondary" style="background-color: #1a2533;">
                    <i class="bi bi-person-circle fs-1 text-light"></i>
                    <div id="sidebar-user-name" class="fw-bold text-white mt-2 fs-5"></div>
                    <div id="sidebar-user-id" class="text-info mb-3"></div>
                    <button id="btn-logout" class="btn btn-sm btn-outline-danger w-100 fw-bold"><i class="bi bi-box-arrow-left"></i> Salir de Sesión</button>
                </div>
                <a href="index.html"><i class="bi bi-house-door me-2"></i>Inicio - Programa</a>
                <a href="planilla.html" class="text-warning fw-bold"><i class="bi bi-table me-2"></i>Planilla de Progreso</a>
                <div class="px-3 pt-4 pb-2 text-uppercase small fw-bold" style="color:#95a5a6; letter-spacing: 1px;">Material de Clases</div>
                {menu_links}
            </nav>
            <main class="col-md-9 col-lg-10 content">
                {contenido_principal}
            </main>
        </div>
    </div>
    
    <script>
        let currentUser = null;
        
        document.addEventListener("DOMContentLoaded", function() {{
            const mask = document.getElementById('login-mask');
            const btnLogout = document.getElementById('btn-logout');
            
            // Auth UI toggle
            document.getElementById('tab-login').onclick = (e) => {{ e.preventDefault(); document.getElementById('form-login').style.display='block'; document.getElementById('form-register').style.display='none'; document.getElementById('tab-login').classList.add('active'); document.getElementById('tab-register').classList.remove('active'); }};
            document.getElementById('tab-register').onclick = (e) => {{ e.preventDefault(); document.getElementById('form-register').style.display='block'; document.getElementById('form-login').style.display='none'; document.getElementById('tab-register').classList.add('active'); document.getElementById('tab-login').classList.remove('active'); }};
            
            function loadUsers() {{ return JSON.parse(localStorage.getItem('tic_users')) || {{}}; }}
            function saveUsers(u) {{ localStorage.setItem('tic_users', JSON.stringify(u)); }}
            
            // Register Logic
            document.getElementById('btn-register').onclick = () => {{
                let nom = document.getElementById('reg-nombre').value.trim();
                let ape = document.getElementById('reg-apellido').value.trim();
                let ced = document.getElementById('reg-cedula').value.trim();
                let tel = document.getElementById('reg-telefono').value.trim();
                let ema = document.getElementById('reg-email').value.trim();
                
                if(!nom || !ape || !ced) return alert("Nombre, Apellido y Cédula son obligatorios.");
                
                let users = loadUsers();
                users[ced] = {{ nombre: nom, apellido: ape, cedula: ced, telefono: tel, email: ema }};
                saveUsers(users);
                
                let msg = document.getElementById('reg-msg');
                msg.className = "text-success text-center mt-2 fw-bold";
                msg.innerText = "¡Registro exitoso! Ya puedes ingresar.";
                setTimeout(() => {{ document.getElementById('tab-login').click(); document.getElementById('login-cedula').value = ced; }}, 1500);
            }};
            
            // Login Logic
            function doLogin(ced) {{
                let users = loadUsers();
                if(users[ced]) {{
                    sessionStorage.setItem('current_cedula', ced);
                    sessionStorage.setItem('current_nombre', users[ced].nombre + ' ' + users[ced].apellido);
                    applySession();
                }} else {{
                    document.getElementById('login-error').style.display = 'block';
                }}
            }}
            
            document.getElementById('btn-login').onclick = () => doLogin(document.getElementById('login-cedula').value.trim());
            document.getElementById('login-cedula').addEventListener('keypress', function(e) {{ if(e.key === 'Enter') doLogin(this.value.trim()); }});
            
            // Apply Session
            function applySession() {{
                let c = sessionStorage.getItem('current_cedula');
                if(c) {{
                    currentUser = c;
                    mask.style.display = 'none';
                    document.body.classList.remove('locked');
                    document.getElementById('sidebar-user-name').innerText = sessionStorage.getItem('current_nombre');
                    document.getElementById('sidebar-user-id').innerText = "C.I: " + c;
                    
                    window.dispatchEvent(new Event('authReady'));
                }} else {{
                    mask.style.display = 'flex';
                    document.body.classList.add('locked');
                }}
            }}
            
            btnLogout.onclick = () => {{
                sessionStorage.removeItem('current_cedula');
                sessionStorage.removeItem('current_nombre');
                location.reload();
            }};
            
            applySession();
        }});
    </script>
    {scripts_marcadores}
</body>
</html>"""

modalidades_sabados = {
    1: 'Virtual', 2: 'Asincrónica', 3: 'Presencial',
    4: 'Virtual', 5: 'Asincrónica', 6: 'Presencial',
    7: 'Virtual', 8: 'Asincrónica', 9: 'Presencial',
    10: 'Virtual', 11: 'Asincrónica', 12: 'Presencial'
}

modalidades_lunes_viernes = {
    1: 'Presencial', 2: 'Virtual', 3: 'Presencial',
    4: 'Presencial', 5: 'Asincrónica', 6: 'Presencial',
    7: 'Presencial', 8: 'Virtual', 9: 'Presencial',
    10: 'Presencial', 11: 'Asincrónica', 12: 'Presencial'
}

def generar_html_por_grupo(directorio_grupo, modalidades_grupo):
    html_dir = directorio_grupo
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)

    grupo_js = os.path.basename(directorio_grupo)

    menu_links = ""
    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        menu_links += f'<a href="clase_{c["id"]:02d}.html" class="menu-clase" data-clase="{c["id"]}">Clase {c["id"]} ({tipo_actual})</a>\n'
    menu_links = '<a href="programa.html"><i class="bi bi-file-earmark-text me-2"></i>Programa Oficial</a>\n' + menu_links

    # Progress and Attendance Logic Script
    script_base = f"""
    <script>
        const current_grupo = '{grupo_js}';
        window.addEventListener('authReady', function() {{
            if(!currentUser) return;
            
            document.querySelectorAll('.menu-clase').forEach(link => {{
                let clId = link.getAttribute('data-clase');
                let state = localStorage.getItem('tic_progress_' + currentUser + '_' + current_grupo + '_clase_' + clId);
                if (state === 'finished') {{
                    link.classList.add('text-success', 'fw-bold');
                    link.innerHTML += ' <i class="bi bi-check-circle-fill float-end"></i>';
                }} else if (state) {{
                    link.classList.add('text-warning', 'fw-bold');
                    link.innerHTML += ' <i class="bi bi-bookmark-fill float-end"></i>';
                }}
            }});
            
            if(typeof current_clase !== 'undefined') {{
                let pKey = 'tic_progress_' + currentUser + '_' + current_grupo + '_clase_' + current_clase;
                let aKey = 'tic_asistencia_' + currentUser + '_' + current_grupo + '_clase_' + current_clase;
                let mainContent = document.querySelector('.content');
                let savedState = localStorage.getItem(pKey);
                
                // ASISTENCIA LOGIC
                let savedAsistencia = localStorage.getItem(aKey);
                let asisDiv = document.createElement('div');
                asisDiv.className = 'text-center mb-5';
                
                if (savedAsistencia) {{
                    asisDiv.innerHTML = `<span class="badge bg-success fs-5 p-3 shadow-sm"><i class="bi bi-check2-circle"></i> Asistencia Registrada: ${{savedAsistencia}}</span>`;
                }} else {{
                    let btnAsis = document.createElement('button');
                    btnAsis.className = 'btn btn-info text-white btn-lg fw-bold shadow-sm';
                    btnAsis.innerHTML = '<i class="bi bi-person-raised-hand"></i> Registrar mi Asistencia en esta Clase';
                    btnAsis.onclick = function() {{
                        let fecha = new Date().toLocaleString('es-ES', {{ dateStyle: 'short', timeStyle: 'short' }});
                        localStorage.setItem(aKey, fecha);
                        location.reload();
                    }};
                    asisDiv.appendChild(btnAsis);
                }}
                
                let modalidadBadge = document.querySelector('.badge.text-white');
                if(modalidadBadge) {{
                    modalidadBadge.parentNode.insertBefore(asisDiv, modalidadBadge.nextSibling);
                }}

                // Bookmarks on sections
                if(savedState !== 'finished') {{
                    let cards = document.querySelectorAll('.section-card');
                    cards.forEach((card, index) => {{
                        let secId = 'sec-' + index;
                        card.id = secId;
                        let title = card.querySelector('.section-title');
                        if (title) {{
                            let btn = document.createElement('button');
                            btn.className = 'btn btn-sm btn-outline-warning ms-auto marcador-btn float-end';
                            btn.innerHTML = '<i class="bi bi-bookmark"></i> Marcar hasta aquí';
                            btn.onclick = function() {{
                                localStorage.setItem(pKey, secId);
                                location.reload();
                            }};
                            title.appendChild(btn);
                        }}
                    }});
                }}

                // Final Button / Banner
                if (savedState === 'finished') {{
                    let badge = document.createElement('div');
                    badge.className = 'alert alert-success text-center fw-bold shadow border-success p-4 mb-4';
                    badge.innerHTML = '<i class="bi bi-trophy-fill fs-1 text-warning d-block mb-2"></i><h4 class="mb-0">¡Felicidades, ' + sessionStorage.getItem('current_nombre') + '!</h4><p class="mb-0 mt-2 fs-5">Ya has completado totalmente el desarrollo de esta lección.</p>';
                    mainContent.appendChild(badge.cloneNode(true)); // Add to bottom
                    mainContent.insertBefore(badge, mainContent.firstChild); // Add to top
                }} else {{
                    let finishBtn = document.createElement('button');
                    finishBtn.className = 'btn btn-success btn-lg mt-5 mb-5 w-100 shadow fw-bold p-3';
                    finishBtn.innerHTML = '<i class="bi bi-check-all fs-3 me-2"></i> Confirmar Lección como Completada';
                    finishBtn.onclick = function() {{
                        localStorage.setItem(pKey, 'finished');
                        location.reload();
                    }};
                    mainContent.appendChild(finishBtn);
                }}

                // Scroll to active bookmark
                if (savedState && savedState.startsWith('sec-')) {{
                    let target = document.getElementById(savedState);
                    if (target) {{
                        target.style.border = '4px dashed #f39c12';
                        target.style.backgroundColor = '#fffdf7';
                        let markAlert = document.createElement('div');
                        markAlert.className = 'alert alert-warning mb-4 fw-bold fs-5 text-center shadow-sm';
                        markAlert.innerHTML = '<i class="bi bi-bookmark-fill me-2"></i> Marcador activo: Retomaste desde aquí.';
                        target.insertBefore(markAlert, target.firstChild);
                        setTimeout(() => {{
                            target.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                        }}, 600);
                    }}
                }}
            }}
        }});
    </script>
    """

    index_content = """
<h1 class="page-title text-center">Tecnología de la Información y la Comunicación (ADE18)</h1>
<div class="alert alert-dark text-center fs-5 mb-5"><strong>Instituto Superior Centuria</strong> | 2do Año - 3er Semestre | Carga Horaria: 120hs</div>
<div class="section-card border-def shadow-sm">
    <div class="section-title text-def"><i class="bi bi-bullseye"></i> Fundamentación y Objetivos Académicos</div>
    <p>Este documento presenta el programa académico de la asignatura Tecnologías de la Información y la Comunicación, diseñada para estudiantes de segundo año de administración. El curso se fundamenta en la relevancia de las herramientas digitales como motores de competitividad y éxito dentro del entorno empresarial contemporáneo. A través de diez unidades, el plan de estudios abarca desde la gestión de bases de datos y sistemas integrados hasta las nuevas tendencias del comercio electrónico y la inteligencia artificial. La metodología de enseñanza combina la teoría con la práctica en laboratorios y visitas técnicas para asegurar un aprendizaje integral.</p>
</div>
<div class="section-card border-casos shadow-sm">
    <div class="section-title text-casos"><i class="bi bi-bar-chart-steps"></i> Metodología de Evaluación Oficial</div>
    <ul class="list-group list-group-flush fs-5">
        <li class="list-group-item d-flex justify-content-between"><span><i class="bi bi-journal-text text-primary"></i> <strong>2 Exámenes Parciales</strong></span> <span class="badge bg-primary rounded-pill">40%</span></li>
        <li class="list-group-item d-flex justify-content-between"><span><i class="bi bi-person-check text-success"></i> <strong>Participación en Clase (Asistencia)</strong></span> <span class="badge bg-success rounded-pill">10%</span></li>
        <li class="list-group-item d-flex justify-content-between"><span><i class="bi bi-award text-danger"></i> <strong>Examen Final Integrador</strong></span> <span class="badge bg-danger rounded-pill">50%</span></li>
    </ul>
</div>
"""
    with open(os.path.join(html_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Programa ADE18", menu_links=menu_links, contenido_principal=index_content, scripts_marcadores=script_base))

    programa_content = """
    <h1 class="page-title text-center"><i class="bi bi-journal-bookmark-fill text-primary"></i> Programa Académico Oficial</h1>
    
<div class="section-card border-def shadow-sm">
    <div class="section-title text-def"><i class="bi bi-card-list"></i> Programa Oficial a Desarrollar</div>
    <div class="fs-5"><p>IDENTIFICACION</p>
<p>FUNDAMENTACION</p>
<p>Cuando se habla de tecnología de información exploramos un territorio donde las organizaciones y las personas que las componen se ven inmersas en un alto dinamismo, de cambios cada vez más frecuentes y de gran impacto; es por ello que la combinación entre la tecnología informática con los sistemas de información, se convierte en un factor estratégico.  </p>
<p>La gestión eficaz y eficiente de la información en las diversas estructuras empresariales se transformó en sinónimo de éxito, razón por la cual se invierten cada vez mayores recursos en dicha área del conocimiento.  </p>
<p>Aquellas organizaciones que conozcan y aprovechen las tendencias tecnológicas tendrán una ventaja competitiva sobre las demás.  </p>
<p>El programa busca sistematizar todas estas variables trascendentales, a los efectos de brindar al futuro administrador las herramientas teóricas y prácticas que ajusten su gestión a las exigencias técnicas del actual mundo empresarial  </p>
<p>OBJETIVOS </p>
<p>Conocer la perspectiva conceptual y estratégica de las tecnologías de la información.  </p>
<p>Señalar la infraestructura de vanguardia con las que pueden contar las organizaciones.  </p>
<p>Analizar las herramientas tecnológicas de apoyo, para la toma de decisiones en los negocios.  </p>
<p>Explicar los enfoques de las organizaciones basadas en el desarrollo de las tecnologías de la información, mediante técnicas de evaluación de costos y beneficios, y la implementación de nuevos paradigmas en los negocios.  </p>
<p>CONTENIDOS </p>
<p>UNIDAD I: INTRODUCCIÓN A LOS SISTEMAS DE INFORMACIÓN COMPUTARIZADOS  </p>
<p>Definiciones y conceptos. Clasificación. Tipos y usos de los sistemas de información. Las tecnologías de la información y la sociedad. Desarrollo de los sistemas de Información. Ciclo de vida de los sistemas de información. Variables determinantes en el proceso de desarrollo de sistemas. Métodos alternos para la adquisición de sistemas. Método tradicional. Aseguramiento de la calidad total. Técnicas de diseño y documentación. Diagramas de flujos de datos. Pruebas del sistema. Mantenimiento. Ingeniería de software asistida por computadora. Compra de paquetes. Desarrollo por parte del usuario final. Outsourcing.  </p>
<p>UNIDAD II: LA ESTRATEGIA DE NEGOCIOS A TRAVÉS DE TECNOLOGÍAS DE INFORMACIÓN  </p>
<p>La estrategia en los negocios. Ventajas competitivas y los sistemas de información. Impulsos estratégicos. Fuerzas de la industria. Los sistemas de información estratégicos en la organización. Implantación de sistemas estratégicos. Reingeniería de procesos. Tecnologías de vanguardia en los negocios.  </p>
<p>UNIDAD III: FUNDAMENTOS DE ADMINISTRACIÓN DE BASE DE DATOS  </p>
<p>Archivos convencionales. Definición de base de datos. Ventajas en el uso de base de datos. El manejo del sistema de base de datos (DBMS). El administrador de la base de datos (DBA). Tipos de modelos de base de datos. Bases de datos distribuidas. Data warehouse.  </p>
<p>UNIDAD IV: SISTEMAS INTEGRADOS DE GESTIÓN  </p>
<p>Sistemas integradores de la administración de empresas o Enterprise Resource Plannig (ERP). Actualización, costos de las tecnologías de la información. Determinación de requerimientos. Evaluación técnica de propuestas. Evaluación financiera de las propuestas. Actividades posteriores a la firma del contrato.  </p>
<p>UNIDAD V: TECNOLOGÍAS DE LA INFORMACIÓN. HARDWARE Y SOFTWARE  </p>
<p>La computadora: definición, componentes básicos y clasificación. Concepto de software.  </p>
<p>UNIDAD VI: INFRAESTRUCTURA DE REDES Y SISTEMAS EMPRESARIALES  </p>
<p>Comunicación de datos. Hardware de apoyo a la comunicación. Conectividad. Redes computacionales. Internet. Dominios de internet. Servicios en internet. Intranet. Extranet. Protocolos inalámbricos para internet.  </p>
<p>UNIDAD VII: TECNOLOGÍAS DE APOYO A LA TOMA DE DECISIONES  </p>
<p>Plataforma de sistemas transaccionales. El proceso de toma de decisiones. Definición y tipos de sistemas de apoyo a las decisiones. Características de los sistemas de apoyo para la toma de decisiones (DSS). Caso de aplicación de un DSS. Sistemas de apoyo para la toma de decisiones en grupo (GDSS). Características de los GDSS. Ventajas y desventajas del uso de GDSS. Diseño de salas. Usos prácticos de un GDSS. Casos de aplicación. Inteligencia artificial. Sistemas expertos. Beneficios que genera el uso de sistemas expertos y costos que involucra. El generador de sistemas expertos o Shell. Selección de aplicaciones para sistemas expertos.  </p>
<p>UNIDAD VIII: SISTEMAS DE APOYO A EJECUTIVOS (EIS)  </p>
<p>Concepto. Características. Factores de éxito. Proceso de desarrollo. Implantación. Efecto del EIS en el proceso de planeación y control de la organización. </p>
<p>UNIDAD IX: PARADIGMAS CONTEMPORÁNEOS DE NEGOCIOS EN INTERNET  </p>
<p>Introducción a los negocios por internet. Cómo preparar los “Negocios on line”. Elección de tecnologías. Comercio electrónico: concepto, categorías, ventajas y problemáticas, sistemas de pago, aspectos legales. E-goberment. Firma digital.  </p>
<p>UNIDAD X: FUTURO DE LAS TIC  </p>
<p>Nuevas tendencias tecnológicas aplicadas a los negocios. Cubos de datos. Bases de datos post-relacionales. Redes de alta velocidad </p>
<p>ESTRATEGIAS DE ENSEÑANZA – APRENDIZAJE</p>
<p>Clases magistrales con apoyo de equipos audiovisuales  </p>
<p>Trabajo con material bibliográfico, exhibición de videos y/o películas sobre temas desarrollados  </p>
<p>Estudios de casos en laboratorio de informática  </p>
<p>Talleres para elaboración y presentación de trabajos individuales y grupales</p>
<p>Conferencias, seminarios, charlas, simposios, mesas redondas  </p>
<p>Visita a empresas para relacionar los conceptos teóricos con la práctica  </p>
<p>Utilización de plataformas virtuales y otros recursos auxiliares</p>
<p>EVALUACION  </p>
<p>El método de evaluación contempla la ponderación de pruebas parciales, participación en clase y prueba final. Por tanto, se pondera el proceso y el producto de acuerdo al siguiente detalle:</p>
<p>Dos exámenes parciales equivalente al 40% de la nota final </p>
<p>Participación en clase (asistencia) equivalente al 10% de la nota final. </p>
<p>El examen final tendrá un valor hasta el 50% de la nota final.</p>
<p>Totalizando el 100%. </p>
<p>Las calificaciones para la nota final se realizaran siguiendo la siguiente escala:</p>
<p>0%      a   69% Uno         1   Insuficiente</p>
<p>70%     a   77% Dos     2   Aprobado</p>
<p>78% a   85% tres        3   Bueno</p>
<p>86% a   93% Cuatro  4   Distinguido</p>
<p>94% a   100%    Cinco       5   Sobresaliente</p>
<p>Los exámenes parciales y finales podrán rendirse en forma ordinaria y extraordinaria. </p>
<p>Para tener derecho a examen final el alumno debe tener 80% de asistencia, aprobados los exámenes parciales.</p>
<p>BIBLIOGRAFÍA  </p>
<p>Cohe Kare, Daniel y Asín Lares, Enrique. Tecnología de información en los Negocios. México: McGraw-Hill. 2009</p>
<p>Amor, D., La Revolución e-business. Argentina: Prentice Hall.  2000</p></div>
</div>

    """
    with open(os.path.join(html_dir, "programa.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Programa Oficial", menu_links=menu_links, contenido_principal=programa_content, scripts_marcadores=script_base))


    # Generate Planilla with Toggle
    planilla_content = """
    <h1 class="page-title text-center"><i class="bi bi-table text-warning"></i> Planilla Oficial (Progreso y Asistencia)</h1>
    
    <div class="d-flex justify-content-center mb-4 mt-4">
        <div class="btn-group shadow-sm" role="group">
            <input type="radio" class="btn-check" name="btnradio" id="btn-progreso" autocomplete="off" checked>
            <label class="btn btn-outline-primary fw-bold px-4 py-2 fs-5" for="btn-progreso"><i class="bi bi-journal-check"></i> Progreso Académico</label>

            <input type="radio" class="btn-check" name="btnradio" id="btn-asistencia" autocomplete="off">
            <label class="btn btn-outline-info fw-bold px-4 py-2 fs-5" for="btn-asistencia"><i class="bi bi-person-lines-fill"></i> Registro de Asistencia</label>
        </div>
    </div>
    
    <div class="card shadow border-0">
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-striped table-hover align-middle mb-0">
                    <thead class="table-dark">
                        <tr>
                            <th class="p-3">Cédula</th>
                            <th class="p-3">Estudiante</th>
                            <th class="p-3">Contacto</th>
                            <th class="text-center p-3" title="Clase 1">C1</th><th class="text-center p-3" title="Clase 2">C2</th><th class="text-center p-3" title="Clase 3">C3</th>
                            <th class="text-center p-3" title="Clase 4">C4</th><th class="text-center p-3" title="Clase 5">C5</th><th class="text-center p-3" title="Clase 6">C6</th>
                            <th class="text-center p-3" title="Clase 7">C7</th><th class="text-center p-3" title="Clase 8">C8</th><th class="text-center p-3" title="Clase 9">C9</th>
                            <th class="text-center p-3" title="Clase 10">C10</th><th class="text-center p-3" title="Clase 11">C11</th><th class="text-center p-3" title="Clase 12">C12</th>
                        </tr>
                    </thead>
                    <tbody id="planilla-body">
                        <!-- Llenado por JS -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <script>
        window.addEventListener('authReady', function() {
            const current_grupo = '""" + grupo_js + """';
            let users = JSON.parse(localStorage.getItem('tic_users')) || {};
            let tbody = document.getElementById('planilla-body');
            
            function renderTable(mode) {
                tbody.innerHTML = '';
                for (let ced in users) {
                    let u = users[ced];
                    let tr = document.createElement('tr');
                    tr.innerHTML = `<td class="fw-bold">${u.cedula}</td><td><strong>${u.apellido}</strong>, ${u.nombre}</td><td class="small text-muted">${u.email}<br>${u.telefono}</td>`;
                    
                    for(let i = 1; i <= 12; i++) {
                        let td = document.createElement('td');
                        td.className = 'text-center align-middle';
                        
                        if(mode === 'progreso') {
                            let st = localStorage.getItem('tic_progress_' + ced + '_' + current_grupo + '_clase_' + i);
                            if (st === 'finished') {
                                td.innerHTML = '<i class="bi bi-check-circle-fill text-success fs-4" title="Completado"></i>';
                            } else if (st) {
                                td.innerHTML = '<i class="bi bi-bookmark-fill text-warning fs-4" title="En progreso"></i>';
                            } else {
                                td.innerHTML = '<i class="bi bi-dash text-black-50 fs-4"></i>';
                            }
                        } else {
                            let ast = localStorage.getItem('tic_asistencia_' + ced + '_' + current_grupo + '_clase_' + i);
                            if (ast) {
                                td.innerHTML = `<span class="badge bg-success" title="${ast}">P</span><br><small class="text-muted" style="font-size:0.65rem;">${ast}</small>`;
                            } else {
                                td.innerHTML = '<span class="badge bg-danger">A</span>';
                            }
                        }
                        tr.appendChild(td);
                    }
                    tbody.appendChild(tr);
                }
                if (Object.keys(users).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="15" class="text-center text-muted py-5 fs-5">No hay alumnos registrados en el sistema.</td></tr>';
                }
            }
            
            renderTable('progreso');
            
            document.getElementById('btn-progreso').addEventListener('change', () => renderTable('progreso'));
            document.getElementById('btn-asistencia').addEventListener('change', () => renderTable('asistencia'));
        });
    </script>
    """
    with open(os.path.join(html_dir, "planilla.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Planilla Progreso y Asistencia", menu_links=menu_links, contenido_principal=planilla_content, scripts_marcadores=script_base))


    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        badge_class = f"badge-{tipo_actual.lower()}"
        
        script_clase = f"<script>const current_clase = {c['id']};</script>\n" + script_base

        if 'resultados_aprendizaje' in c:
            clase_content = f'''
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]} — {c["titulo"]}</h1>
            <div class="alert alert-secondary fs-5 text-center"><em>"{c.get('pregunta_central', '')}"</em></div>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4 d-block" style="width: fit-content; margin: 0 auto;"><i class="bi bi-tags"></i> Modalidad de Cursada: {tipo_actual}</span>
            
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-bullseye"></i> 1. Resultados de Aprendizaje</div>{c.get("resultados_aprendizaje", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-exclamation-triangle-fill"></i> 2. Situación Problemática</div>{c.get("situacion_problematica", "")}</div>
            <div class="section-card border-ej"><div class="section-title text-ej"><i class="bi bi-question-circle"></i> 3. Actividad Diagnóstica</div>{c.get("actividad_diagnostica", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-book"></i> 4. Desarrollo Teórico</div>{c.get("teoria_1", "")}<hr>{c.get("actividad_1", "")}<hr>{c.get("teoria_2", "")}<hr>{c.get("teoria_3", "")}</div>
            <div class="section-card border-plan"><div class="section-title text-plan" style="color:#d35400;"><i class="bi bi-briefcase"></i> 5. Caso Práctico Real</div>{c.get("caso_practico", "")}</div>
            <div class="section-card border-rubrica"><div class="section-title text-rubrica" style="color:#2c3e50;"><i class="bi bi-diagram-3"></i> 6. Mini Laboratorio / DFD</div>{c.get("taller_dfd", "")}</div>
            <div class="section-card border-bib"><div class="section-title text-bib"><i class="bi bi-check-circle"></i> 7. Evaluación Formativa y Cierre</div>{c.get("evaluacion_cierre", "")}</div>
            
            <div class="section-card border-ej">
    <div class="section-title text-ej"><i class="bi bi-controller"></i> Autoevaluación Secuencial Interactiva</div>
    <p class="text-muted"><i class="bi bi-info-circle"></i> <em>Este ejercicio de conocimiento no es calificable. Las preguntas aparecerán a medida que vayas avanzando para que evalúes tu propia comprensión de los temas de la unidad.</em></p>
    
    <div id="quiz-container-{c['id']}" class="bg-light p-4 border rounded shadow-sm">
        <div id="quiz-intro-{c['id']}" class="text-center">
            <h4 class="text-dark mb-4">¿Listo para repasar los conceptos clave?</h4>
            <button class="btn btn-warning btn-lg fw-bold shadow-sm" onclick="startQuiz({c['id']})"><i class="bi bi-play-circle-fill"></i> Comenzar Secuencia de Repaso</button>
        </div>
        
        <div id="quiz-question-{c['id']}" style="display:none;" class="text-center">
            <span class="badge bg-secondary mb-3 fs-6" id="quiz-progress-{c['id']}">Pregunta 1 de 3</span>
            <h4 id="quiz-text-{c['id']}" class="text-primary fw-bold mb-4" style="line-height: 1.5;"></h4>
            
            <div id="quiz-options-{c['id']}" class="d-flex flex-column gap-2 text-start mb-4" style="display:none;"></div>
            
            <button id="btn-reveal-{c['id']}" class="btn btn-outline-primary fw-bold mb-3" onclick="revealAnswer({c['id']})"><i class="bi bi-eye"></i> Revelar Concepto Clave</button>
            
            <div id="quiz-answer-box-{c['id']}" class="alert alert-success fs-5 shadow-sm" style="display:none; text-align: left;">
                <i class="bi bi-check-circle-fill text-success"></i> <span id="quiz-answer-{c['id']}"></span>
            </div>
            
            <button id="btn-next-{c['id']}" class="btn btn-success mt-2 fw-bold w-100 py-2 fs-5 shadow-sm" style="display:none;" onclick="nextQuestion({c['id']})">Siguiente Pregunta <i class="bi bi-arrow-right-circle"></i></button>
        </div>
        
        <div id="quiz-finish-{c['id']}" style="display:none;" class="text-center">
            <i class="bi bi-award-fill text-warning" style="font-size: 5rem;"></i>
            <h2 class="mt-3 text-dark fw-bold">¡Secuencia Completada!</h2>
            <p class="fs-5 text-muted">Excelente trabajo repasando y fijando los conocimientos.</p>
            <button class="btn btn-outline-secondary mt-3 fw-bold" onclick="resetQuiz({c['id']})"><i class="bi bi-arrow-counterclockwise"></i> Repasar de nuevo</button>
        </div>
    </div>
</div>

<script>
    let questions_{c['id']} = [];
    if ({c['id']} === 1) {{
        questions_{c['id']} = [
            {{
                q: "Dato e información: Una tienda registró las siguientes ventas diarias: 45 – 52 – 61 – 73 – 85 unidades. ¿Cuál de las siguientes opciones representa información y no simplemente datos?",
                options: [
                    "A. 45, 52, 61, 73 y 85.",
                    "B. Los números fueron registrados durante cinco días.",
                    "C. Las ventas aumentaron progresivamente durante los cinco días analizados.",
                    "D. Los valores están almacenados en una computadora."
                ],
                correct: 2
            }},
            {{
                q: "Concepto de sistema: ¿Cuál de las siguientes opciones describe mejor un sistema?",
                options: [
                    "A. Un conjunto de computadoras conectadas a Internet.",
                    "B. Un conjunto de elementos relacionados que interactúan para alcanzar un objetivo.",
                    "C. Una colección de datos almacenados.",
                    "D. Un programa utilizado por una empresa."
                ],
                correct: 1
            }},
            {{
                q: "Sistema de Información: Una empresa posee computadoras modernas, pero cada departamento registra sus datos independientemente y no existen procedimientos para compartirlos. ¿Cuál es la conclusión más apropiada?",
                options: [
                    "A. Poseer computadoras garantiza automáticamente un buen Sistema de Información.",
                    "B. El hardware es suficiente para administrar la información empresarial.",
                    "C. La tecnología por sí sola no garantiza un Sistema de Información eficiente.",
                    "D. La empresa solamente necesita una conexión más rápida a Internet."
                ],
                correct: 2
            }},
            {{
                q: "Componentes de un SI: ¿Cuál de los siguientes elementos NO corresponde por sí solo a un componente tecnológico suficiente para constituir un Sistema de Información completo?",
                options: [
                    "A. Personas.",
                    "B. Datos.",
                    "C. Procedimientos.",
                    "D. Una computadora aislada."
                ],
                correct: 3
            }},
            {{
                q: "Entrada – proceso – salida: En un supermercado, el cajero escanea los productos, el sistema calcula el total y posteriormente imprime el comprobante. ¿Cuál es la salida del proceso?",
                options: [
                    "A. Los códigos de los productos escaneados.",
                    "B. El cálculo realizado por el sistema.",
                    "C. El comprobante generado.",
                    "D. El lector de código de barras."
                ],
                correct: 2
            }},
            {{
                q: "Sistema TPS: Un sistema registra automáticamente cada venta realizada en las cajas de un supermercado. Este sistema corresponde principalmente a:",
                options: [
                    "A. TPS — Sistema de Procesamiento de Transacciones.",
                    "B. DSS — Sistema de Apoyo a las Decisiones.",
                    "C. EIS — Sistema de Información Ejecutiva.",
                    "D. MIS — Sistema de Información Gerencial."
                ],
                correct: 0
            }},
            {{
                q: "Sistema MIS: El gerente recibe cada lunes un informe que muestra ventas totales, ventas por sucursal, productos más vendidos y comparación con la semana anterior. ¿Qué tipo de sistema está utilizando principalmente?",
                options: [
                    "A. TPS.",
                    "B. MIS.",
                    "C. DSS.",
                    "D. EIS."
                ],
                correct: 1
            }},
            {{
                q: "Sistema DSS: Una empresa desea abrir una nueva sucursal. El sistema permite modificar variables como alquiler, cantidad de clientes, costos, ubicación y ventas proyectadas para comparar diferentes escenarios. Corresponde principalmente a:",
                options: [
                    "A. TPS.",
                    "B. MIS.",
                    "C. DSS.",
                    "D. Sistema operativo."
                ],
                correct: 2
            }},
            {{
                q: "Análisis de una situación: Una universidad registra información de estudiantes en diferentes hojas de cálculo. Algunos alumnos aparecen duplicados y existen diferencias entre los datos manejados por Secretaría y Administración. ¿Cuál es el principal problema?",
                options: [
                    "A. Falta de computadoras.",
                    "B. Exceso de estudiantes.",
                    "C. Falta de integración y consistencia de los datos.",
                    "D. Falta de impresoras."
                ],
                correct: 2
            }},
            {{
                q: "Pensamiento crítico: Una empresa afirma: ‘Nuestra organización está completamente digitalizada porque todos los empleados utilizan computadoras.’ ¿Cuál es la respuesta técnicamente más apropiada?",
                options: [
                    "A. Es correcto, porque digitalización significa tener computadoras.",
                    "B. Es correcto siempre que las computadoras tengan Internet.",
                    "C. No necesariamente; la tecnología debe integrarse con personas, datos y procedimientos para generar información útil.",
                    "D. Es incorrecto porque las empresas no necesitan computadoras para digitalizarse."
                ],
                correct: 2
            }}
        ];
    }} else {{
        questions_{c['id']} = [
            {{ q: "¿Cuál es el propósito principal de los conceptos analizados en esta unidad para una organización?", a: "Permiten optimizar recursos, mejorar la toma de decisiones y alinear la tecnología con los objetivos estratégicos del negocio." }},
            {{ q: "Si tuvieras que aplicar esto en tu futuro rol como Administrador, ¿cuál sería el primer paso?", a: "Identificar las necesidades de información de la empresa y evaluar qué tecnología o proceso existente puede cubrir esa brecha de manera eficiente." }},
            {{ q: "¿Por qué crees que este tema es una ventaja competitiva en el mercado actual?", a: "Porque automatiza procesos críticos, reduce costos operativos y permite innovar en la manera de entregar valor a los clientes." }}
        ];
    }}

    let currentQ_{c['id']} = 0;

    function startQuiz(id) {{
        document.getElementById('quiz-intro-' + id).style.display = 'none';
        document.getElementById('quiz-question-' + id).style.display = 'block';
        currentQ_{c['id']} = 0;
        loadQuestion(id);
    }}

    function loadQuestion(id) {{
        let qData = questions_{c['id']}[currentQ_{c['id']}];
        document.getElementById('quiz-progress-' + id).innerText = "Paso " + (currentQ_{c['id']} + 1) + " de " + questions_{c['id']}.length;
        document.getElementById('quiz-text-' + id).innerText = qData.q;
        
        let optionsContainer = document.getElementById('quiz-options-' + id);
        let revealBtn = document.getElementById('btn-reveal-' + id);
        let answerBox = document.getElementById('quiz-answer-box-' + id);
        let nextBtn = document.getElementById('btn-next-' + id);
        
        answerBox.style.display = 'none';
        nextBtn.style.display = 'none';
        optionsContainer.innerHTML = '';
        
        if(qData.options) {{
            revealBtn.style.display = 'none';
            optionsContainer.style.display = 'flex';
            
            qData.options.forEach((opt, index) => {{
                let btn = document.createElement('button');
                btn.className = 'btn btn-outline-dark text-start p-3 fs-6';
                btn.innerHTML = opt;
                btn.onclick = function() {{
                    let allBtns = optionsContainer.querySelectorAll('button');
                    allBtns.forEach(b => {{ b.disabled = true; b.classList.remove('btn-outline-dark'); b.classList.add('btn-light', 'text-muted'); }});
                    
                    if(index === qData.correct) {{
                        btn.classList.remove('btn-light', 'text-muted');
                        btn.classList.add('btn-success', 'text-white', 'fw-bold');
                        btn.innerHTML += ' <i class="bi bi-check-circle-fill float-end fs-5"></i>';
                        answerBox.className = 'alert alert-success mt-4 fs-6 shadow-sm';
                        answerBox.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> ¡Correcto! Has comprendido el concepto.';
                    }} else {{
                        btn.classList.remove('btn-light', 'text-muted');
                        btn.classList.add('btn-danger', 'text-white');
                        btn.innerHTML += ' <i class="bi bi-x-circle-fill float-end fs-5"></i>';
                        let correctBtn = allBtns[qData.correct];
                        correctBtn.classList.remove('btn-light', 'text-muted');
                        correctBtn.classList.add('btn-outline-success', 'fw-bold');
                        answerBox.className = 'alert alert-warning mt-4 fs-6 shadow-sm';
                        answerBox.innerHTML = '<i class="bi bi-info-circle-fill text-warning"></i> La respuesta correcta era la opción marcada en verde.';
                    }}
                    answerBox.style.display = 'block';
                    nextBtn.style.display = 'inline-block';
                }};
                optionsContainer.appendChild(btn);
            }});
        }} else {{
            optionsContainer.style.display = 'none';
            revealBtn.style.display = 'inline-block';
            document.getElementById('quiz-answer-' + id).innerText = qData.a;
        }}
    }}

    function revealAnswer(id) {{
        document.getElementById('btn-reveal-' + id).style.display = 'none';
        let box = document.getElementById('quiz-answer-box-' + id);
        box.className = 'alert alert-info mt-4 fs-5 shadow-sm text-start';
        box.style.display = 'block';
        document.getElementById('btn-next-' + id).style.display = 'inline-block';
    }}

    function nextQuestion(id) {{
        currentQ_{c['id']}++;
        if (currentQ_{c['id']} < questions_{c['id']}.length) {{
            loadQuestion(id);
        }} else {{
            document.getElementById('quiz-question-' + id).style.display = 'none';
            document.getElementById('quiz-finish-' + id).style.display = 'block';
        }}
    }}

    function resetQuiz(id) {{
        document.getElementById('quiz-finish-' + id).style.display = 'none';
        startQuiz(id);
    }}
</script>
            
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-journal-bookmark"></i> 9. Bibliografía Oficial</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            <div class="mt-5 pt-3 border-top">
                <div class="text-end mb-3">
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDocente-{c['id']}" aria-expanded="false" aria-controls="collapseDocente-{c['id']}">
                        <i class="bi bi-lock-fill"></i> Panel Docente: Mostrar Cronograma
                    </button>
                </div>
                <div class="collapse" id="collapseDocente-{c['id']}">
                    <div class="section-card shadow-sm border-0 bg-light border-start border-4 border-secondary">
                        <div class="section-title text-secondary"><i class="bi bi-clock-history"></i> Cronograma de la Sesión (Oculto para Alumnos)</div>
                        <div class="table-responsive">{c.get("cronograma", "")}</div>
                        <hr>
                        <h5 class="text-secondary"><i class="bi bi-key-fill"></i> Clave de Respuestas (Autoevaluación)</h5>
                        <div id="docente-respuestas-{c['id']}" class="fs-6 text-dark mt-3"></div>
                    </div>
                </div>
            </div>
            '''
        else:
            clase_content = f'''
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]}: {c["titulo"]}</h1>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4 d-block" style="width: fit-content; margin: 0 auto;"><i class="bi bi-tags"></i> Modalidad de Cursada: {tipo_actual}</span>
            
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-journal-bookmark-fill"></i> 1. Desarrollo Teórico y Conceptual</div>{c.get("definiciones", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-newspaper"></i> 2. Análisis Crítico y Casos</div>{c.get("casos", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-sliders2"></i> 3. Evaluaciones y Comparativas</div><div class="table-responsive">{c.get("comparaciones", "")}</div></div>
            
            <div class="section-card border-ej">
    <div class="section-title text-ej"><i class="bi bi-controller"></i> Autoevaluación Secuencial Interactiva</div>
    <p class="text-muted"><i class="bi bi-info-circle"></i> <em>Este ejercicio de conocimiento no es calificable. Las preguntas aparecerán a medida que vayas avanzando para que evalúes tu propia comprensión de los temas de la unidad.</em></p>
    
    <div id="quiz-container-{c['id']}" class="bg-light p-4 border rounded shadow-sm">
        <div id="quiz-intro-{c['id']}" class="text-center">
            <h4 class="text-dark mb-4">¿Listo para repasar los conceptos clave?</h4>
            <button class="btn btn-warning btn-lg fw-bold shadow-sm" onclick="startQuiz({c['id']})"><i class="bi bi-play-circle-fill"></i> Comenzar Secuencia de Repaso</button>
        </div>
        
        <div id="quiz-question-{c['id']}" style="display:none;" class="text-center">
            <span class="badge bg-secondary mb-3 fs-6" id="quiz-progress-{c['id']}">Pregunta 1 de 3</span>
            <h4 id="quiz-text-{c['id']}" class="text-primary fw-bold mb-4" style="line-height: 1.5;"></h4>
            
            <div id="quiz-options-{c['id']}" class="d-flex flex-column gap-2 text-start mb-4" style="display:none;"></div>
            
            <button id="btn-reveal-{c['id']}" class="btn btn-outline-primary fw-bold mb-3" onclick="revealAnswer({c['id']})"><i class="bi bi-eye"></i> Revelar Concepto Clave</button>
            
            <div id="quiz-answer-box-{c['id']}" class="alert alert-success fs-5 shadow-sm" style="display:none; text-align: left;">
                <i class="bi bi-check-circle-fill text-success"></i> <span id="quiz-answer-{c['id']}"></span>
            </div>
            
            <button id="btn-next-{c['id']}" class="btn btn-success mt-2 fw-bold w-100 py-2 fs-5 shadow-sm" style="display:none;" onclick="nextQuestion({c['id']})">Siguiente Pregunta <i class="bi bi-arrow-right-circle"></i></button>
        </div>
        
        <div id="quiz-finish-{c['id']}" style="display:none;" class="text-center">
            <i class="bi bi-award-fill text-warning" style="font-size: 5rem;"></i>
            <h2 class="mt-3 text-dark fw-bold">¡Secuencia Completada!</h2>
            <p class="fs-5 text-muted">Excelente trabajo repasando y fijando los conocimientos.</p>
            <button class="btn btn-outline-secondary mt-3 fw-bold" onclick="resetQuiz({c['id']})"><i class="bi bi-arrow-counterclockwise"></i> Repasar de nuevo</button>
        </div>
    </div>
</div>

<script>
    let questions_{c['id']} = [];
    if ({c['id']} === 1) {{
        questions_{c['id']} = [
            {{
                q: "Dato e información: Una tienda registró las siguientes ventas diarias: 45 – 52 – 61 – 73 – 85 unidades. ¿Cuál de las siguientes opciones representa información y no simplemente datos?",
                options: [
                    "A. 45, 52, 61, 73 y 85.",
                    "B. Los números fueron registrados durante cinco días.",
                    "C. Las ventas aumentaron progresivamente durante los cinco días analizados.",
                    "D. Los valores están almacenados en una computadora."
                ],
                correct: 2
            }},
            {{
                q: "Concepto de sistema: ¿Cuál de las siguientes opciones describe mejor un sistema?",
                options: [
                    "A. Un conjunto de computadoras conectadas a Internet.",
                    "B. Un conjunto de elementos relacionados que interactúan para alcanzar un objetivo.",
                    "C. Una colección de datos almacenados.",
                    "D. Un programa utilizado por una empresa."
                ],
                correct: 1
            }},
            {{
                q: "Sistema de Información: Una empresa posee computadoras modernas, pero cada departamento registra sus datos independientemente y no existen procedimientos para compartirlos. ¿Cuál es la conclusión más apropiada?",
                options: [
                    "A. Poseer computadoras garantiza automáticamente un buen Sistema de Información.",
                    "B. El hardware es suficiente para administrar la información empresarial.",
                    "C. La tecnología por sí sola no garantiza un Sistema de Información eficiente.",
                    "D. La empresa solamente necesita una conexión más rápida a Internet."
                ],
                correct: 2
            }},
            {{
                q: "Componentes de un SI: ¿Cuál de los siguientes elementos NO corresponde por sí solo a un componente tecnológico suficiente para constituir un Sistema de Información completo?",
                options: [
                    "A. Personas.",
                    "B. Datos.",
                    "C. Procedimientos.",
                    "D. Una computadora aislada."
                ],
                correct: 3
            }},
            {{
                q: "Entrada – proceso – salida: En un supermercado, el cajero escanea los productos, el sistema calcula el total y posteriormente imprime el comprobante. ¿Cuál es la salida del proceso?",
                options: [
                    "A. Los códigos de los productos escaneados.",
                    "B. El cálculo realizado por el sistema.",
                    "C. El comprobante generado.",
                    "D. El lector de código de barras."
                ],
                correct: 2
            }},
            {{
                q: "Sistema TPS: Un sistema registra automáticamente cada venta realizada en las cajas de un supermercado. Este sistema corresponde principalmente a:",
                options: [
                    "A. TPS — Sistema de Procesamiento de Transacciones.",
                    "B. DSS — Sistema de Apoyo a las Decisiones.",
                    "C. EIS — Sistema de Información Ejecutiva.",
                    "D. MIS — Sistema de Información Gerencial."
                ],
                correct: 0
            }},
            {{
                q: "Sistema MIS: El gerente recibe cada lunes un informe que muestra ventas totales, ventas por sucursal, productos más vendidos y comparación con la semana anterior. ¿Qué tipo de sistema está utilizando principalmente?",
                options: [
                    "A. TPS.",
                    "B. MIS.",
                    "C. DSS.",
                    "D. EIS."
                ],
                correct: 1
            }},
            {{
                q: "Sistema DSS: Una empresa desea abrir una nueva sucursal. El sistema permite modificar variables como alquiler, cantidad de clientes, costos, ubicación y ventas proyectadas para comparar diferentes escenarios. Corresponde principalmente a:",
                options: [
                    "A. TPS.",
                    "B. MIS.",
                    "C. DSS.",
                    "D. Sistema operativo."
                ],
                correct: 2
            }},
            {{
                q: "Análisis de una situación: Una universidad registra información de estudiantes en diferentes hojas de cálculo. Algunos alumnos aparecen duplicados y existen diferencias entre los datos manejados por Secretaría y Administración. ¿Cuál es el principal problema?",
                options: [
                    "A. Falta de computadoras.",
                    "B. Exceso de estudiantes.",
                    "C. Falta de integración y consistencia de los datos.",
                    "D. Falta de impresoras."
                ],
                correct: 2
            }},
            {{
                q: "Pensamiento crítico: Una empresa afirma: ‘Nuestra organización está completamente digitalizada porque todos los empleados utilizan computadoras.’ ¿Cuál es la respuesta técnicamente más apropiada?",
                options: [
                    "A. Es correcto, porque digitalización significa tener computadoras.",
                    "B. Es correcto siempre que las computadoras tengan Internet.",
                    "C. No necesariamente; la tecnología debe integrarse con personas, datos y procedimientos para generar información útil.",
                    "D. Es incorrecto porque las empresas no necesitan computadoras para digitalizarse."
                ],
                correct: 2
            }}
        ];
    }} else {{
        questions_{c['id']} = [
            {{ q: "¿Cuál es el propósito principal de los conceptos analizados en esta unidad para una organización?", a: "Permiten optimizar recursos, mejorar la toma de decisiones y alinear la tecnología con los objetivos estratégicos del negocio." }},
            {{ q: "Si tuvieras que aplicar esto en tu futuro rol como Administrador, ¿cuál sería el primer paso?", a: "Identificar las necesidades de información de la empresa y evaluar qué tecnología o proceso existente puede cubrir esa brecha de manera eficiente." }},
            {{ q: "¿Por qué crees que este tema es una ventaja competitiva en el mercado actual?", a: "Porque automatiza procesos críticos, reduce costos operativos y permite innovar en la manera de entregar valor a los clientes." }}
        ];
    }}

    let currentQ_{c['id']} = 0;

    function startQuiz(id) {{
        document.getElementById('quiz-intro-' + id).style.display = 'none';
        document.getElementById('quiz-question-' + id).style.display = 'block';
        currentQ_{c['id']} = 0;
        loadQuestion(id);
    }}

    function loadQuestion(id) {{
        let qData = questions_{c['id']}[currentQ_{c['id']}];
        document.getElementById('quiz-progress-' + id).innerText = "Paso " + (currentQ_{c['id']} + 1) + " de " + questions_{c['id']}.length;
        document.getElementById('quiz-text-' + id).innerText = qData.q;
        
        let optionsContainer = document.getElementById('quiz-options-' + id);
        let revealBtn = document.getElementById('btn-reveal-' + id);
        let answerBox = document.getElementById('quiz-answer-box-' + id);
        let nextBtn = document.getElementById('btn-next-' + id);
        
        answerBox.style.display = 'none';
        nextBtn.style.display = 'none';
        optionsContainer.innerHTML = '';
        
        if(qData.options) {{
            revealBtn.style.display = 'none';
            optionsContainer.style.display = 'flex';
            
            qData.options.forEach((opt, index) => {{
                let btn = document.createElement('button');
                btn.className = 'btn btn-outline-dark text-start p-3 fs-6';
                btn.innerHTML = opt;
                btn.onclick = function() {{
                    let allBtns = optionsContainer.querySelectorAll('button');
                    allBtns.forEach(b => {{ b.disabled = true; b.classList.remove('btn-outline-dark'); b.classList.add('btn-light', 'text-muted'); }});
                    
                    if(index === qData.correct) {{
                        btn.classList.remove('btn-light', 'text-muted');
                        btn.classList.add('btn-success', 'text-white', 'fw-bold');
                        btn.innerHTML += ' <i class="bi bi-check-circle-fill float-end fs-5"></i>';
                        answerBox.className = 'alert alert-success mt-4 fs-6 shadow-sm';
                        answerBox.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> ¡Correcto! Has comprendido el concepto.';
                    }} else {{
                        btn.classList.remove('btn-light', 'text-muted');
                        btn.classList.add('btn-danger', 'text-white');
                        btn.innerHTML += ' <i class="bi bi-x-circle-fill float-end fs-5"></i>';
                        let correctBtn = allBtns[qData.correct];
                        correctBtn.classList.remove('btn-light', 'text-muted');
                        correctBtn.classList.add('btn-outline-success', 'fw-bold');
                        answerBox.className = 'alert alert-warning mt-4 fs-6 shadow-sm';
                        answerBox.innerHTML = '<i class="bi bi-info-circle-fill text-warning"></i> La respuesta correcta era la opción marcada en verde.';
                    }}
                    answerBox.style.display = 'block';
                    nextBtn.style.display = 'inline-block';
                }};
                optionsContainer.appendChild(btn);
            }});
        }} else {{
            optionsContainer.style.display = 'none';
            revealBtn.style.display = 'inline-block';
            document.getElementById('quiz-answer-' + id).innerText = qData.a;
        }}
    }}

    function revealAnswer(id) {{
        document.getElementById('btn-reveal-' + id).style.display = 'none';
        let box = document.getElementById('quiz-answer-box-' + id);
        box.className = 'alert alert-info mt-4 fs-5 shadow-sm text-start';
        box.style.display = 'block';
        document.getElementById('btn-next-' + id).style.display = 'inline-block';
    }}

    function nextQuestion(id) {{
        currentQ_{c['id']}++;
        if (currentQ_{c['id']} < questions_{c['id']}.length) {{
            loadQuestion(id);
        }} else {{
            document.getElementById('quiz-question-' + id).style.display = 'none';
            document.getElementById('quiz-finish-' + id).style.display = 'block';
        }}
    }}

    function resetQuiz(id) {{
        document.getElementById('quiz-finish-' + id).style.display = 'none';
        startQuiz(id);
    }}
</script>
            
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-book"></i> 5. Bibliografía Académica</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            <div class="mt-5 pt-3 border-top">
                <div class="text-end mb-3">
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDocente-{c['id']}" aria-expanded="false" aria-controls="collapseDocente-{c['id']}">
                        <i class="bi bi-lock-fill"></i> Panel Docente
                    </button>
                </div>
                <div class="collapse" id="collapseDocente-{c['id']}">
                    <div class="section-card shadow-sm border-0 bg-light border-start border-4 border-secondary">
                        <h5 class="text-secondary"><i class="bi bi-key-fill"></i> Clave de Respuestas (Autoevaluación)</h5>
                        <div id="docente-respuestas-{c['id']}" class="fs-6 text-dark mt-3"></div>
                    </div>
                </div>
            </div>
            '''
            
        with open(os.path.join(html_dir, f"clase_{c['id']:02d}.html"), "w", encoding="utf-8") as f:
            f.write(template_html.format(titulo_pagina=f"Clase {c['id']}", menu_links=menu_links, contenido_principal=clase_content, scripts_marcadores=script_clase))

# Generar para ambos grupos
generar_html_por_grupo('Materiales_HTML_Sabados', modalidades_sabados)
generar_html_por_grupo('Materiales_HTML_LunesViernes', modalidades_lunes_viernes)

print("Archivos HTML reconstruidos exitosamente con Asistencia y Progreso Integrados.")
