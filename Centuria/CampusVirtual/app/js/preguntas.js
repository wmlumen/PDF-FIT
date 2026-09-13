// ============================================
// PREGUNTAS PERSONALIZADAS POR CLASE
// ============================================

const preguntasPorClase = {
    1: [
        {
            pregunta: "¿Qué es un Sistema de Información (SI)?",
            opciones: [
                "Un programa de computadora específico",
                "Conjunto de componentes que recolectan, procesan y distribuyen información",
                "Un tipo de hardware especializado",
                "Una red de computadoras"
            ],
            correcta: 1,
            explicacion: "Un SI es un conjunto de componentes interrelacionados que manejan información para apoyar la toma de decisiones."
        },
        {
            pregunta: "¿Cuál es la diferencia principal entre hardware y software?",
            opciones: [
                "El hardware es más rápido que el software",
                "El hardware es físico y tangible, el software es lógico e intangible",
                "El software puede funcionar sin hardware",
                "No hay diferencia, son lo mismo"
            ],
            correcta: 1,
            explicacion: "El hardware son los componentes físicos, mientras que el software son los programas e instrucciones lógicas."
        },
        {
            pregunta: "¿Qué tipo de software gestiona todos los recursos del sistema?",
            opciones: [
                "Software de aplicación",
                "Software de programación",
                "Software de sistema (Sistema Operativo)",
                "Software libre"
            ],
            correcta: 2,
            explicacion: "El software de sistema, como los sistemas operativos, gestiona todos los recursos del hardware."
        },
        {
            pregunta: "¿Cuál es el 'cerebro' de la computadora?",
            opciones: [
                "La memoria RAM",
                "El disco duro",
                "La Unidad Central de Procesamiento (CPU)",
                "La placa madre"
            ],
            correcta: 2,
            explicacion: "La CPU ejecuta las instrucciones del software y realiza todos los cálculos."
        },
        {
            pregunta: "¿Qué ciclo de vida sigue el desarrollo de un Sistema de Información?",
            opciones: [
                "Solo programación y uso",
                "Planificación, análisis, diseño, implementación, pruebas y mantenimiento",
                "Diseño y construcción únicamente",
                "No tiene un ciclo definido"
            ],
            correcta: 1,
            explicacion: "El ciclo de vida incluye múltiples fases desde la planificación hasta el mantenimiento continuo."
        }
    ],

    2: [
        {
            pregunta: "¿Qué es una ventaja competitiva según Porter?",
            opciones: [
                "Tener más empleados que la competencia",
                "Diferenciación positiva percibida por el cliente y perdurable en el tiempo",
                "El precio más bajo del mercado",
                "La ubicación física de la empresa"
            ],
            correcta: 1,
            explicacion: "Una ventaja competitiva es una diferenciación positiva que los clientes valoran y que perdura."
        },
        {
            pregunta: "¿Cuáles son las 5 fuerzas de Porter?",
            opciones: [
                "Economía, política, social, tecnológica, ambiental",
                "Rivalidad, nuevos entrantes, sustitutos, proveedores, clientes",
                "Finanzas, marketing, producción, recursos humanos, tecnología",
                "Fuerza de ventas, fuerza de producción, fuerza financiera, fuerza tecnológica, fuerza humana"
            ],
            correcta: 1,
            explicacion: "Las 5 fuerzas de Porter analizan: rivalidad entre competidores, amenaza de nuevos entrantes, sustitutos, poder de proveedores y clientes."
        },
        {
            pregunta: "¿Qué es la reingeniería de procesos?",
            opciones: [
                "Mejora incremental de procesos existentes",
                "Replanteamiento radical para lograr mejoras sustanciales",
                "Eliminación de todos los procesos",
                "Automatización de procesos manuales"
            ],
            correcta: 1,
            explicacion: "La reingeniería es un replanteamiento radical, no una mejora incremental."
        },
        {
            pregunta: "¿Qué es un Sistema de Información Estratégico (SIE)?",
            opciones: [
                "Un sistema que solo genera reportes",
                "Un sistema que modifica la manera de dirigir un negocio para generar ventaja",
                "Un sistema de correo electrónico",
                "Un sistema de respaldo de datos"
            ],
            correcta: 1,
            explicacion: "Un SIE transforma significativamente la operación del negocio para crear ventaja competitiva."
        },
        {
            pregunta: "¿Cuál de estas NO es una tecnología emergente estratégica?",
            opciones: [
                "Computación en la nube",
                "Inteligencia Artificial",
                "Procesadores de texto básicos",
                "Internet de las Cosas (IoT)"
            ],
            correcta: 2,
            explicacion: "Los procesadores de texto son herramientas comunes, no tecnologías emergentes estratégicas."
        }
    ],

    3: [
        {
            pregunta: "¿Qué es una base de datos?",
            opciones: [
                "Un archivo de Excel",
                "Conjunto de datos relacionados y organizados electrónicamente",
                "Una carpeta con documentos",
                "Un programa de contabilidad"
            ],
            correcta: 1,
            explicacion: "Una base de datos es un conjunto estructurado de datos relacionados para facilitar su gestión."
        },
        {
            pregunta: "¿Cuál es la ventaja principal de usar una base de datos sobre archivos convencionales?",
            opciones: [
                "Es más barata",
                "Reduce redundancia y mantiene consistencia de datos",
                "No requiere mantenimiento",
                "Funciona sin computadora"
            ],
            correcta: 1,
            explicacion: "Las BD eliminan duplicación de datos y garantizan consistencia en la información."
        },
        {
            pregunta: "¿Qué es un DBMS?",
            opciones: [
                "Un tipo de base de datos",
                "Sistema de Gestión de Bases de Datos",
                "Un lenguaje de programación",
                "Un dispositivo de almacenamiento"
            ],
            correcta: 1,
            explicacion: "DBMS (Database Management System) es el software que permite crear y gestionar bases de datos."
        },
        {
            pregunta: "¿Qué propiedades deben cumplir las transacciones en una BD?",
            opciones: [
                "RAP (Rápido, Accesible, Permanente)",
                "ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad)",
                "DATA (Disponibilidad, Acceso, Transferencia, Autenticación)",
                "BASE (Búsqueda, Almacenamiento, Seguridad, Eficiencia)"
            ],
            correcta: 1,
            explicacion: "Las transacciones deben ser ACID: Atómicas, Consistentes, Aisladas y Duraderas."
        },
        {
            pregunta: "¿Qué es un Data Warehouse?",
            opciones: [
                "Una base de datos transaccional",
                "Un repositorio centralizado para análisis y toma de decisiones",
                "Un almacén físico de computadoras",
                "Un sistema de correo electrónico"
            ],
            correcta: 1,
            explicacion: "Un Data Warehouse almacena datos históricos de múltiples fuentes para análisis estratégico."
        }
    ],

    4: [
        {
            pregunta: "¿Qué significa ERP?",
            opciones: [
                "Empresa de Recursos Personales",
                "Enterprise Resource Planning (Planificación de Recursos Empresariales)",
                "Estándar de Recursos Progresivos",
                "Entorno de Redes Privadas"
            ],
            correcta: 1,
            explicacion: "ERP significa Enterprise Resource Planning, gestión integrada de procesos empresariales."
        },
        {
            pregunta: "¿Cuál es la característica principal de un ERP?",
            opciones: [
                "Solo maneja contabilidad",
                "Integración total de departamentos en una plataforma única",
                "Solo funciona en una computadora",
                "No requiere capacitación"
            ],
            correcta: 1,
            explicacion: "Un ERP integra todos los departamentos en una base de datos centralizada."
        },
        {
            pregunta: "¿Cuál de estos NO es un módulo típico de un ERP?",
            opciones: [
                "Finanzas y contabilidad",
                "Recursos Humanos",
                "Videojuegos",
                "Logística y cadena de suministro"
            ],
            correcta: 2,
            explicacion: "Los ERPs incluyen módulos de negocio, no entretenimiento como videojuegos."
        },
        {
            pregunta: "¿Qué es el TCO en un proyecto ERP?",
            opciones: [
                "Tiempo de Compra Original",
                "Costo Total de Propiedad (todos los costos del ciclo de vida)",
                "Tecnología de Conexión Online",
                "Terminal de Control Operativo"
            ],
            correcta: 1,
            explicacion: "El TCO incluye todos los costos directos e indirectos a lo largo del ciclo de vida del ERP."
        },
        {
            pregunta: "¿Cuál es el primer paso para implementar un ERP?",
            opciones: [
                "Comprar el software inmediatamente",
                "Determinar los requerimientos de la empresa",
                "Contratar programadores",
                "Desinstalar el sistema anterior"
            ],
            correcta: 1,
            explicacion: "Primero se deben determinar los requerimientos funcionales y técnicos de la organización."
        }
    ],

    5: [
        {
            pregunta: "¿Qué es una hoja de cálculo?",
            opciones: [
                "Un tipo de base de datos",
                "Herramienta para organizar, analizar y almacenar datos en filas y columnas",
                "Un programa de edición de texto",
                "Un navegador web"
            ],
            correcta: 1,
            explicacion: "Las hojas de cálculo como Excel organizan datos en celdas de filas y columnas."
        },
        {
            pregunta: "¿Qué función de Excel permite resumir grandes volúmenes de datos?",
            opciones: [
                "Copiar y pegar",
                "Tablas dinámicas (Pivot Tables)",
                "Cambiar color de celdas",
                "Imprimir documentos"
            ],
            correcta: 1,
            explicacion: "Las tablas dinámicas resumen y analizan grandes cantidades de datos."
        },
        {
            pregunta: "¿Qué es un Dashboard?",
            opciones: [
                "Un tipo de virus informático",
                "Panel visual que muestra indicadores clave de rendimiento",
                "Un dispositivo de entrada",
                "Un lenguaje de programación"
            ],
            correcta: 1,
            explicacion: "Un Dashboard es un tablero visual con gráficos e indicadores para tomar decisiones."
        },
        {
            pregunta: "¿Qué tipo de gráfico es ideal para mostrar tendencias en el tiempo?",
            opciones: [
                "Gráfico circular (torta)",
                "Gráfico de líneas",
                "Gráfico de barras apiladas",
                "Gráfico de dispersión"
            ],
            correcta: 1,
            explicacion: "Los gráficos de líneas muestran claramente la evolución de datos a lo largo del tiempo."
        },
        {
            pregunta: "¿Para qué sirve la función BUSCARV en Excel?",
            opciones: [
                "Buscar y reemplazar texto",
                "Buscar un valor en una columna y retornar un valor de otra columna",
                "Crear gráficos",
                "Proteger hojas de cálculo"
            ],
            correcta: 1,
            explicacion: "BUSCARV busca un valor en la primera columna de una tabla y retorna un valor de otra columna."
        }
    ],

    6: [
        {
            pregunta: "¿Qué son las Tablas Dinámicas?",
            opciones: [
                "Tablas que se mueven automáticamente",
                "Herramientas que resumen grandes volúmenes de datos de forma interactiva",
                "Tablas de base de datos",
                "Tablas de texto en Word"
            ],
            correcta: 1,
            explicacion: "Las tablas dinámicas permiten resumir, analizar y explorar datos de forma interactiva."
        },
        {
            pregunta: "¿Qué es un KPI (Indicador Clave de Rendimiento)?",
            opciones: [
                "Un tipo de gráfico",
                "Métrica cuantificable que mide el rendimiento respecto a objetivos",
                "Una función de Excel",
                "Un dispositivo de entrada"
            ],
            correcta: 1,
            explicacion: "Un KPI es una métrica que ayuda a medir el éxito respecto a metas específicas."
        },
        {
            pregunta: "¿Qué componente es esencial para crear un Dashboard efectivo?",
            opciones: [
                "Muchos colores llamativos",
                "Indicadores claros y fáciles de interpretar",
                "Múltiples hojas de cálculo",
                "Impresora de alta calidad"
            ],
            correcta: 1,
            explicacion: "Un buen Dashboard tiene indicadores claros que facilitan la toma de decisiones."
        },
        {
            pregunta: "¿Qué formato de archivo es mejor para compartir datos tabulares?",
            opciones: [
                ".jpg (imagen)",
                ".csv o .xlsx (datos estructurados)",
                ".mp3 (audio)",
                ".exe (ejecutable)"
            ],
            correcta: 1,
            explicacion: "CSV y XLSX son formatos diseñados para datos tabulares estructurados."
        },
        {
            pregunta: "¿Qué es la segmentación de datos (slicers)?",
            opciones: [
                "Eliminar datos innecesarios",
                "Filtros visuales que permiten filtrar tablas dinámicas interactivamente",
                "Copiar datos a otra hoja",
                "Crear copias de seguridad"
            ],
            correcta: 1,
            explicacion: "Los slicers son filtros visuales que facilitan la exploración de datos en tablas dinámicas."
        }
    ],

    7: [
        {
            pregunta: "¿Qué es la Inteligencia Artificial (IA)?",
            opciones: [
                "Un tipo de robot físico",
                "Campo que crea sistemas capaces de realizar tareas que requieren inteligencia humana",
                "Un software de oficina",
                "Un lenguaje de programación"
            ],
            correcta: 1,
            explicacion: "La IA busca crear sistemas que puedan razonar, aprender y tomar decisiones como humanos."
        },
        {
            pregunta: "¿Qué es un Sistema Experto?",
            opciones: [
                "Un usuario avanzado de computadora",
                "Programa que simula el razonamiento de un experto en un dominio específico",
                "Un tipo de base de datos",
                "Un dispositivo de red"
            ],
            correcta: 1,
            explicacion: "Los Sistemas Expertos replican el conocimiento y razonamiento de especialistas humanos."
        },
        {
            pregunta: "¿Qué es el Machine Learning (Aprendizaje Automático)?",
            opciones: [
                "Enseñar computadoras a programarse solas",
                "Algoritmos que aprenden de datos sin ser programados explícitamente",
                "Un tipo de hardware",
                "Un sistema operativo"
            ],
            correcta: 1,
            explicacion: "El ML permite que los algoritmos aprendan patrones de los datos para hacer predicciones."
        },
        {
            pregunta: "¿Cuál es una aplicación común de la IA en los negocios?",
            opciones: [
                "Jugar videojuegos únicamente",
                "Chatbots de atención al cliente, análisis predictivo y recomendación",
                "Solo para investigación científica",
                "Solo para crear virus informáticos"
            ],
            correcta: 1,
            explicacion: "La IA se usa en chatbots, predicciones, recomendaciones y automatización de procesos."
        },
        {
            pregunta: "¿Qué es una red neuronal?",
            opciones: [
                "Una red de internet",
                "Modelo computacional inspirado en el cerebro humano para reconocer patrones",
                "Un tipo de cable de conexión",
                "Un programa de contabilidad"
            ],
            correcta: 1,
            explicacion: "Las redes neuronales imitan la estructura del cerebro para procesar información."
        }
    ],

    8: [
        {
            pregunta: "¿Qué es una red de computadoras?",
            opciones: [
                "Un solo computador",
                "Conjunto de dispositivos interconectados para compartir recursos",
                "Un tipo de software",
                "Un dispositivo de almacenamiento"
            ],
            correcta: 1,
            explicacion: "Una red conecta múltiples dispositivos para compartir datos y recursos."
        },
        {
            pregunta: "¿Cuál es la diferencia entre Internet e Intranet?",
            opciones: [
                "No hay diferencia",
                "Internet es pública, Intranet es privada y restringida a una organización",
                "Internet es más lenta que Intranet",
                "Intranet solo funciona con cable"
            ],
            correcta: 1,
            explicacion: "Internet es una red global pública, mientras que Intranet es privada para uso interno."
        },
        {
            pregunta: "¿Qué protocolo se usa para transferir páginas web?",
            opciones: [
                "FTP",
                "HTTP/HTTPS",
                "SMTP",
                "POP3"
            ],
            correcta: 1,
            explicacion: "HTTP y HTTPS son los protocolos para transferir páginas web de forma segura."
        },
        {
            pregunta: "¿Qué es un servidor web?",
            opciones: [
                "Una computadora personal",
                "Equipo que almacena y sirve páginas web a usuarios que las solicitan",
                "Un tipo de impresora",
                "Un programa de edición de video"
            ],
            correcta: 1,
            explicacion: "El servidor web responde a peticiones y entrega páginas web a los navegadores."
        },
        {
            pregunta: "¿Qué significa IP en redes?",
            opciones: [
                "Información Personal",
                "Internet Protocol (Protocolo de Internet)",
                "Instalación Profesional",
                "Interfaz de Programación"
            ],
            correcta: 1,
            explicacion: "IP significa Internet Protocol, el protocolo que identifica dispositivos en una red."
        }
    ],

    9: [
        {
            pregunta: "¿Qué es un DSS (Sistema de Apoyo a Decisiones)?",
            opciones: [
                "Un sistema de correo",
                "Sistema que ayuda en la toma de decisiones semiestructuradas",
                "Un tipo de base de datos",
                "Un dispositivo de entrada"
            ],
            correcta: 1,
            explicacion: "El DSS proporciona información y herramientas para apoyar decisiones gerenciales."
        },
        {
            pregunta: "¿Qué es un GDSS?",
            opciones: [
                "Gran Sistema de Datos Simples",
                "Sistema de Apoyo a Decisiones en Grupo",
                "Gestión de Datos de Software",
                "Gerencia de Desarrollo de Sistemas"
            ],
            correcta: 1,
            explicacion: "GDSS es un sistema que facilita la toma de decisiones en grupo de forma colaborativa."
        },
        {
            pregunta: "¿Qué tipo de decisiones apoya un DSS?",
            opciones: [
                "Solo decisiones operativas diarias",
                "Decisiones semiestructuradas y no estructuradas",
                "Solo decisiones matemáticas",
                "No apoya decisiones"
            ],
            correcta: 1,
            explicacion: "El DSS está diseñado para decisiones que no tienen una solución completamente definida."
        },
        {
            pregunta: "¿Qué es un data warehouse en el contexto de decisiones?",
            opciones: [
                "Almacén de hardware",
                "Repositorio de datos históricos para análisis estratégico",
                "Carpeta compartida en red",
                "Sistema de respaldo"
            ],
            correcta: 1,
            explicacion: "El data warehouse consolida datos de múltiples fuentes para análisis y toma de decisiones."
        },
        {
            pregunta: "¿Qué es Business Intelligence (BI)?",
            opciones: [
                "Inteligencia artificial para negocios",
                "Conjunto de herramientas para análisis de datos y toma de decisiones",
                "Un tipo de red social",
                "Software de diseño gráfico"
            ],
            correcta: 1,
            explicacion: "BI incluye herramientas y procesos para transformar datos en información accionable."
        }
    ],

    10: [
        {
            pregunta: "¿Qué es el Comercio Electrónico?",
            opciones: [
                "Comprar en tiendas físicas",
                "Compra y venta de productos o servicios a través de internet",
                "Un tipo de redes sociales",
                "Un sistema bancario tradicional"
            ],
            correcta: 1,
            explicacion: "El comercio electrónico permite transacciones comerciales en línea."
        },
        {
            pregunta: "¿Qué es la Firma Digital?",
            opciones: [
                "Escribir el nombre en pantalla",
                "Mecanismo criptográfico que valida la identidad y autenticidad de un documento",
                "Una contraseña simple",
                "Un tipo de correo electrónico"
            ],
            correcta: 1,
            explicacion: "La firma digital usa criptografía para garantizar autenticidad e integridad."
        },
        {
            pregunta: "¿Qué protocolo garantiza transacciones seguras en comercio electrónico?",
            opciones: [
                "HTTP",
                "HTTPS / SSL / TLS",
                "FTP",
                "SMTP"
            ],
            correcta: 1,
            explicacion: "HTTPS con SSL/TLS cifra la conexión para proteger datos sensibles."
        },
        {
            pregunta: "¿Qué es B2B en comercio electrónico?",
            opciones: [
                "Business to Consumer",
                "Business to Business (empresa a empresa)",
                "Back to Base",
                "Bank to Bank"
            ],
            correcta: 1,
            explicacion: "B2B son transacciones comerciales entre empresas, no con consumidores finales."
        },
        {
            pregunta: "¿Cuál es un riesgo del comercio electrónico?",
            opciones: [
                "No hay riesgos",
                "Robo de datos personales y fraudes financieros",
                "Solo la velocidad de internet",
                "El costo del papel"
            ],
            correcta: 1,
            explicacion: "Los principales riesgos incluyen robo de datos, fraudes y ciberataques."
        }
    ],

    11: [
        {
            pregunta: "¿Qué es Big Data?",
            opciones: [
                "Una computadora grande",
                "Conjuntos de datos masivos que requieren herramientas especiales para su análisis",
                "Un tipo de base de datos pequeña",
                "Un software de edición"
            ],
            correcta: 1,
            explicacion: "Big Data se refiere a datos masivos con volumen, velocidad y variedad elevados."
        },
        {
            pregunta: "¿Cuáles son las 3 V de Big Data?",
            opciones: [
                "Velocidad, Verdad, Validez",
                "Volumen, Velocidad, Variedad",
                "Verificar, Validar, Visualizar",
                "Vender, Verificar, Vincular"
            ],
            correcta: 1,
            explicacion: "Las 3 V son: Volumen (cantidad), Velocidad (rapidez) y Variedad (tipos de datos)."
        },
        {
            pregunta: "¿Qué es el Internet de las Cosas (IoT)?",
            opciones: [
                "Una red social",
                "Red de dispositivos físicos conectados a internet que recopilan datos",
                "Un tipo de virus",
                "Un lenguaje de programación"
            ],
            correcta: 1,
            explicacion: "IoT conecta dispositivos cotidianos (sensores, electrodomésticos) a internet."
        },
        {
            pregunta: "¿Qué es la Computación en la Nube (Cloud Computing)?",
            opciones: [
                "Usar computadoras en el cielo",
                "Servicios de computación entregados por internet bajo demanda",
                "Un tipo de nube meteorológica",
                "Almacenar documentos en papel"
            ],
            correcta: 1,
            explicacion: "Cloud Computing ofrece servidores, almacenamiento y servicios por internet."
        },
        {
            pregunta: "¿Qué es Blockchain?",
            opciones: [
                "Un tipo de virus informático",
                "Tecnología de registro distribuido e inmutable",
                "Un programa de edición de video",
                "Un sistema operativo"
            ],
            correcta: 1,
            explicacion: "Blockchain registra transacciones de forma inmutable y distribuida, base de las criptomonedas."
        }
    ],

    12: [
        {
            pregunta: "¿Qué es un EIS (Sistema de Información Ejecutiva)?",
            opciones: [
                "Sistema de correo electrónico",
                "Sistema que proporciona información estratégica a altos directivos",
                "Sistema de inventario",
                "Sistema de nómina"
            ],
            correcta: 1,
            explicacion: "El EIS ofrece información resumida y estratégica para la alta dirección."
        },
        {
            pregunta: "¿Cuál es el objetivo principal de un EIS?",
            opciones: [
                "Registrar ventas diarias",
                "Apoyar la toma de decisiones estratégicas de la alta dirección",
                "Controlar inventarios",
                "Generar facturas"
            ],
            correcta: 1,
            explicacion: "El EIS está diseñado para executives que necesitan información estratégica."
        },
        {
            pregunta: "¿Qué diferencia hay entre un EIS y un MIS?",
            opciones: [
                "No hay diferencia",
                "EIS es para executives y estratégico, MIS es para gestión operativa y táctica",
                "EIS es más barato",
                "MIS solo genera gráficos"
            ],
            correcta: 1,
            explicacion: "El MIS genera informes para gestión operativa, el EIS para decisiones estratégicas."
        },
        {
            pregunta: "¿Qué tipo de información muestra típicamente un EIS?",
            opciones: [
                "Detalles de cada transacción",
                "KPIs, tendencias, comparativas y alertas estratégicas",
                "Código fuente de programas",
                "Configuración de hardware"
            ],
            correcta: 1,
            explicacion: "Un EIS muestra indicadores clave, tendencias y alertas para la alta dirección."
        },
        {
            pregunta: "¿Por qué es importante el cierre integrador en un curso de TIC?",
            opciones: [
                "Para repetir todo lo aprendido",
                "Para integrar conocimientos y aplicarlos a situaciones reales del negocio",
                "Para aprobar automáticamente",
                "Para conocer a los compañeros"
            ],
            correcta: 1,
            explicacion: "El cierre integrador permite aplicar todos los conocimientos a escenarios prácticos."
        }
    ]
};
