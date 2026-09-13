# -*- coding: utf-8 -*-

c3 = {
    'id': 3, 'tipo': 'Presencial', 'titulo': 'Teoría y Administración de Base de Datos: El Corazón del Negocio',
    'pregunta_central': '¿Por qué un simple error en una base de datos puede quebrar a una empresa?',
    'cronograma': '''<table class="table table-sm table-striped border">
        <thead class="table-dark"><tr><th>Tiempo</th><th>Etapa</th><th>Actividad</th></tr></thead>
        <tbody>
            <tr><td><strong>0–10 min</strong></td><td>Apertura</td><td>Conexión y Resultados de Aprendizaje</td></tr>
            <tr><td><strong>10–25 min</strong></td><td>Problematización</td><td>Caso: "El estudiante fantasma" (Redundancia y Anomalías)</td></tr>
            <tr><td><strong>25–40 min</strong></td><td>Diagnóstico</td><td>¿Cómo guardaban la información las empresas antes de las computadoras?</td></tr>
            <tr><td><strong>40–65 min</strong></td><td>Teoría I</td><td>Sistemas de Archivos vs Bases de Datos (DBMS)</td></tr>
            <tr><td><strong>65–80 min</strong></td><td>Actividad 1</td><td>Identificar redundancia de datos en una planilla Excel</td></tr>
            <tr><td><strong>80–100 min</strong></td><td>Teoría II</td><td>Modelo Relacional de Edgar Codd (Tablas, Filas, Columnas)</td></tr>
            <tr><td><strong>100–110 min</strong></td><td>Pausa</td><td><strong>10 minutos</strong></td></tr>
            <tr><td><strong>110–130 min</strong></td><td>Teoría III</td><td>Claves Primarias (PK) y Claves Foráneas (FK) para relacionar datos</td></tr>
            <tr><td><strong>130–150 min</strong></td><td>Caso práctico</td><td>Diseño conceptual de una Base de Datos para un Hospital</td></tr>
            <tr><td><strong>150–165 min</strong></td><td>Taller Modelo E-R</td><td>Dibujar un Modelo Entidad-Relación sencillo (Cliente - Compra - Producto)</td></tr>
            <tr><td><strong>165–175 min</strong></td><td>Socialización</td><td>Explicar por qué las tablas se relacionan</td></tr>
            <tr><td><strong>175–180 min</strong></td><td>Evaluación/cierre</td><td>Cuestionario Múltiple Opción</td></tr>
        </tbody>
    </table>''',
    'resultados_aprendizaje': '''<ul>
        <li>Identificar los problemas estructurales (redundancia, anomalías) de almacenar información en sistemas de archivos o planillas planas.</li>
        <li>Explicar el concepto de Sistema de Gestión de Bases de Datos (DBMS) y su rol como intermediario lógico.</li>
        <li>Comprender la arquitectura del Modelo Relacional: Tablas (Entidades), Columnas (Atributos) y Filas (Registros).</li>
        <li>Aplicar el concepto de Clave Primaria (Primary Key) y Clave Foránea (Foreign Key) para establecer integridad referencial.</li>
        <li>Diseñar un Modelo Entidad-Relación (E-R) básico resolviendo un problema de negocio simple.</li>
    </ul>''',
    'situacion_problematica': '''<p><strong>Caso: "El estudiante fantasma"</strong><br>
    Una universidad guarda los datos de los alumnos en planillas de Excel separadas: una para Biblioteca, otra para Bedelía y otra para Tesorería. María se muda y actualiza su dirección en Bedelía, pero no en Tesorería. Cuando la universidad le envía una notificación legal de cobro, la carta va a su casa antigua y se pierde. María es expulsada por falta de pago.</p>
    <p class="fw-bold fs-5 text-center text-primary mt-3">Pregunta Central: ¿Cómo se puede garantizar que un dato modificado en una oficina se actualice instantáneamente en todo el planeta?</p>''',
    'actividad_diagnostica': '''<p><strong>Análisis rápido:</strong> Abran Microsoft Excel e imaginen que deben registrar a todos los ciudadanos de un país, junto con sus propiedades y vehículos, en una sola hoja. ¿Qué problemas técnicos, lógicos y operativos enfrentarían al llegar al ciudadano número un millón?</p>''',
    'teoria_1': '''<p><strong>Sistemas de Archivos vs Bases de Datos:</strong> Históricamente, cada programa (ej. Contabilidad) guardaba sus propios archivos físicos. Esto generaba <em>Redundancia de Datos</em> (el mismo dato guardado muchas veces ocupando espacio) e <em>Inconsistencia</em> (los datos no coincidían entre sí). La solución científica fue la <strong>Base de Datos (BD)</strong>: un repositorio único, centralizado y sin redundancias. El software que administra esto se llama DBMS (Database Management System).</p>''',
    'actividad_1': '''<p><strong>Detección de Anomalías:</strong> Se presenta una tabla plana donde cada vez que un cliente compra, se vuelve a escribir su Nombre, Dirección, Teléfono y Ciudad. Los alumnos deben identificar cómo se produce una "anomalía de modificación" si el cliente cambia de número telefónico.</p>''',
    'teoria_2': '''<p><strong>El Modelo Relacional:</strong> Inventado por Edgar Codd (IBM) en 1970, revolucionó la informática. Propone que los datos no se guarden en listas infinitas, sino en <strong>Tablas</strong> bidimensionales. Cada Tabla representa una <em>Entidad</em> (ej. CLIENTES, PRODUCTOS). Cada fila representa un <em>Registro</em> único (ej. el cliente Juan) y cada columna un <em>Atributo</em> (ej. el Teléfono de Juan).</p>''',
    'teoria_3': '''<p><strong>Integridad y Claves:</strong> Para que las tablas no sean islas aisladas, se relacionan matemáticamente. Cada registro debe tener una <strong>Clave Primaria (PK)</strong>: un identificador único que nunca se repite (ej. Nro. de Cédula, ISBN de un libro). Para vincular a un cliente con su compra, la PK del Cliente se copia en la tabla de Compras; allí actúa como <strong>Clave Foránea (FK)</strong>, estableciendo una relación indisoluble o Integridad Referencial.</p>''',
    'caso_practico': '''<p><strong>Diseño de Arquitectura Médica:</strong> Un hospital les pide organizar su información. En lugar de una hoja de cálculo gigante, los estudiantes deben separar la información en tres entidades o tablas lógicas: PACIENTES, MEDICOS y TURNOS. Deben definir qué atributos (columnas) van en cada tabla de forma que no haya redundancia.</p>''',
    'taller_dfd': '''<p><strong>Taller: Dibujando el Modelo E-R:</strong> El Modelo Entidad-Relación es un diagrama lógico. Las entidades son rectángulos y las relaciones son rombos. En equipos, diagramen cómo la Entidad "CLIENTE" se relaciona con la Entidad "PRODUCTO" a través de un rombo llamado "COMPRA". Indiquen las Claves Primarias de cada entidad.</p>''',
    'evaluacion_cierre': '''<p><strong>Evaluación Formativa:</strong> Explique brevemente por qué el uso de una Base de Datos centralizada elimina la inconsistencia de datos que ocurría en los antiguos sistemas de archivos dispersos.</p>''',
    'evaluacion_multiple_choice': '''<p><strong>Selección Múltiple (10 Puntos) - Tiempo sugerido: 10-15 minutos:</strong></p>
    <ol>
        <li class="mb-3"><strong>Anomalías de los datos:</strong> Si una empresa guarda la dirección de un cliente en el sistema de ventas y en el sistema de cobranzas de forma separada, ¿qué problema principal se genera?
            <ul class="list-unstyled ms-3">
                <li>A. Seguridad informática extrema.</li>
                <li><strong>B. Redundancia e inconsistencia de datos. (Correcta)</strong></li>
                <li>C. Velocidad de procesamiento superior.</li>
                <li>D. Un Modelo Entidad-Relación perfecto.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Concepto de BD:</strong> Un repositorio centralizado de datos estructurados lógicamente y diseñados para ser compartidos por múltiples usuarios se denomina:
            <ul class="list-unstyled ms-3">
                <li>A. Archivo de texto secuencial.</li>
                <li>B. Sistema Operativo.</li>
                <li><strong>C. Base de Datos. (Correcta)</strong></li>
                <li>D. Hoja de cálculo simple.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Rol del DBMS:</strong> El Sistema de Gestión de Bases de Datos (DBMS) actúa principalmente como:
            <ul class="list-unstyled ms-3">
                <li>A. Un disco duro para almacenar datos físicamente.</li>
                <li><strong>B. Un intermediario de software entre los programas de los usuarios y los datos físicos. (Correcta)</strong></li>
                <li>C. Un antivirus para proteger la información de hackers.</li>
                <li>D. Un cable de red de fibra óptica.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Estructura Relacional:</strong> En el modelo relacional de Codd, ¿cómo se denominan conceptualmente las filas de una tabla?
            <ul class="list-unstyled ms-3">
                <li>A. Atributos o campos.</li>
                <li>B. Claves foráneas.</li>
                <li><strong>C. Registros o tuplas. (Correcta)</strong></li>
                <li>D. Entidades abstractas.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Estructura Relacional (Columnas):</strong> En la tabla "EMPLEADOS", la columna que guarda el "Salario" de todos los empleados representa un:
            <ul class="list-unstyled ms-3">
                <li>A. Registro.</li>
                <li><strong>B. Atributo o Campo. (Correcta)</strong></li>
                <li>C. Archivo plano.</li>
                <li>D. Clave Primaria.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Clave Primaria (PK):</strong> La característica fundamental de una Clave Primaria es que:
            <ul class="list-unstyled ms-3">
                <li>A. Puede contener valores duplicados.</li>
                <li>B. Debe ser siempre una letra.</li>
                <li><strong>C. Identifica de manera única e irrepetible a cada registro en una tabla. (Correcta)</strong></li>
                <li>D. Cambia de valor todos los días.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Clave Foránea (FK):</strong> ¿Para qué se utiliza una Clave Foránea en el diseño de bases de datos?
            <ul class="list-unstyled ms-3">
                <li><strong>A. Para establecer un enlace o relación matemática entre dos tablas. (Correcta)</strong></li>
                <li>B. Para encriptar la base de datos contra robos.</li>
                <li>C. Para ordenar los datos alfabéticamente.</li>
                <li>D. Para eliminar registros duplicados de forma automática.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Análisis de Relación:</strong> En un sistema de Biblioteca, ¿dónde debería colocarse la Clave Foránea para vincular un libro prestado con el socio que lo llevó?
            <ul class="list-unstyled ms-3">
                <li>A. En la tabla AUTORES.</li>
                <li>B. En la tabla SOCIOS, anotando todos los libros que se llevó en un solo campo.</li>
                <li><strong>C. En la tabla PRESTAMOS, colocando el código del Socio y el código del Libro. (Correcta)</strong></li>
                <li>D. No se necesitan claves foráneas.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Modelo E-R:</strong> En un Diagrama Entidad-Relación, ¿con qué figura geométrica se representa típicamente a una "Entidad" (ej. CLIENTE)?
            <ul class="list-unstyled ms-3">
                <li>A. Un círculo o elipse.</li>
                <li>B. Un rombo o diamante.</li>
                <li><strong>C. Un rectángulo. (Correcta)</strong></li>
                <li>D. Un triángulo equilátero.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Toma de decisiones:</strong> Un analista diseña una tabla llamada FACTURAS. Para no crear demasiadas tablas, decide poner el Nombre, Apellido y Dirección del cliente directamente dentro de la tabla FACTURAS en cada venta. ¿Cuál será la consecuencia técnica de esta decisión?
            <ul class="list-unstyled ms-3">
                <li>A. Aumentará la velocidad de acceso y la eficiencia.</li>
                <li>B. El diseño alcanzará el más alto nivel de normalización.</li>
                <li><strong>C. Se generará una redundancia masiva cada vez que un cliente frecuente compre algo. (Correcta)</strong></li>
                <li>D. Es imposible hacer esto en un modelo relacional.</li>
            </ul>
        </li>
    </ol>''',
    'bibliografia': 'Elmasri, R., & Navathe, S. B. (2015). <em>Fundamentos de sistemas de bases de datos</em>. Pearson. <br>Codd, E. F. (1970). <em>A relational model of data for large shared data banks</em>. Communications of the ACM.'
}

c4 = {
    'id': 4, 'tipo': 'Virtual', 'titulo': 'Sistemas Integrados de Gestión Corporativa (ERP): La Empresa Unificada',
    'pregunta_central': '¿Por qué las grandes corporaciones invierten millones de dólares en software SAP u Oracle para gestionar su empresa?',
    'cronograma': '''<table class="table table-sm table-striped border">
        <thead class="table-dark"><tr><th>Tiempo</th><th>Etapa</th><th>Actividad</th></tr></thead>
        <tbody>
            <tr><td><strong>0–10 min</strong></td><td>Apertura</td><td>Conexión con bases de datos (Clase 3) y Resultados de Aprendizaje</td></tr>
            <tr><td><strong>10–25 min</strong></td><td>Problematización</td><td>Caso: "El síndrome de la isla de información"</td></tr>
            <tr><td><strong>25–40 min</strong></td><td>Diagnóstico</td><td>Análisis del flujo de información interdepartamental</td></tr>
            <tr><td><strong>40–65 min</strong></td><td>Teoría I</td><td>Evolución: MRP -> MRP II -> ERP</td></tr>
            <tr><td><strong>65–80 min</strong></td><td>Actividad 1</td><td>Mapeo de la Cadena de Valor (Ventas -> Inventario -> Contabilidad)</td></tr>
            <tr><td><strong>80–100 min</strong></td><td>Teoría II</td><td>Arquitectura de un ERP (Módulos integrados y Base de datos única)</td></tr>
            <tr><td><strong>100–110 min</strong></td><td>Pausa</td><td><strong>10 minutos</strong></td></tr>
            <tr><td><strong>110–130 min</strong></td><td>Teoría III</td><td>Ventajas y Riesgos en la Implementación de Sistemas ERP</td></tr>
            <tr><td><strong>130–150 min</strong></td><td>Caso práctico</td><td>El desastre de la implementación de Hershey's</td></tr>
            <tr><td><strong>150–165 min</strong></td><td>Taller de Módulos</td><td>Asignación de transacciones a módulos de SAP (FI, MM, SD, HR)</td></tr>
            <tr><td><strong>165–175 min</strong></td><td>Socialización</td><td>Evaluación de riesgos corporativos</td></tr>
            <tr><td><strong>175–180 min</strong></td><td>Evaluación/cierre</td><td>Cuestionario Múltiple Opción</td></tr>
        </tbody>
    </table>''',
    'resultados_aprendizaje': '''<ul>
        <li>Diferenciar un sistema informático fragmentado ("islas") de un sistema integrado de planificación de recursos empresariales (ERP).</li>
        <li>Comprender la trazabilidad y el flujo de la información a través de los distintos módulos operativos (Ventas, Finanzas, Recursos Humanos, Logística).</li>
        <li>Identificar los principales líderes del mercado mundial de ERP (SAP, Oracle, Microsoft Dynamics) y su importancia en la empleabilidad.</li>
        <li>Analizar y evaluar los altos riesgos operativos, financieros y culturales que conlleva la implementación de un sistema ERP.</li>
    </ul>''',
    'situacion_problematica': '''<p><strong>Caso: "El síndrome de la isla de información"</strong><br>
    Un vendedor concreta el negocio del año. Ingresa el pedido en su software de ventas (CRM) y festeja. Sin embargo, el departamento de almacenes usa un sistema de inventario distinto que no se comunicó con el de ventas, por lo que no preparan el pedido. Cuando el cliente reclama, contabilidad, que usa un tercer sistema, ya le facturó la mercadería que nunca le llegó. El cliente demanda a la empresa.</p>
    <p class="fw-bold fs-5 text-center text-primary mt-3">Pregunta Central: ¿Cómo se elimina la fragmentación tecnológica para que toda la empresa hable un solo idioma?</p>''',
    'actividad_diagnostica': '''<p><strong>El flujo del dato:</strong> Describan paso a paso el viaje de la información que ocurre cuando ustedes compran un producto en línea: ¿Qué departamentos de la empresa tienen que enterarse obligatoriamente de esa compra para que el producto llegue a su casa y la empresa pague sus impuestos?</p>''',
    'teoria_1': '''<p><strong>Evolución Histórica (Del MRP al ERP):</strong> En los años 70, la industria manufacturera inventó el MRP (Material Requirements Planning) solo para calcular cuántos tornillos comprar. Luego evolucionó al MRP II que integró las máquinas de la fábrica. Finalmente, en los años 90, nace el <strong>ERP (Enterprise Resource Planning)</strong>, el cual trasciende la fábrica y absorbe todos los departamentos de cualquier tipo de empresa (servicios, salud, gobierno).</p>''',
    'actividad_1': '''<p><strong>Cadena de Valor:</strong> Los estudiantes dibujan un esquema mostrando cómo el ingreso de un solo dato ("Vender 1 Televisor") en el área de Ventas impacta automáticamente e instantáneamente en el Inventario (resta 1), en Finanzas (suma deuda del cliente) y en Contabilidad (registra impuestos), sin que ningún humano vuelva a tipear nada.</p>''',
    'teoria_2': '''<p><strong>Arquitectura de un ERP (El corazón de SAP):</strong> Un ERP se define como un software de arquitectura modular que opera sobre una <em>Base de Datos Única y Centralizada</em> (lo aprendido en la Clase 3). Los módulos típicos son: Finanzas (FI), Materiales/Logística (MM), Ventas y Distribución (SD), y Recursos Humanos (HR). Todos leen la misma tabla de datos al mismo tiempo.</p>''',
    'teoria_3': '''<p><strong>El paradigma de la implementación y las Mejores Prácticas:</strong> A diferencia de programar un software a medida, comprar un ERP de clase mundial (como SAP) implica que la empresa asume "Las Mejores Prácticas" (Best Practices) incluidas en el código del sistema. Por lo tanto, <em>es la empresa la que debe rediseñar sus procesos (BPR) para adaptarse al ERP</em>, y no el ERP el que debe reprogramarse para adaptarse a la empresa. Esto genera una resistencia cultural inmensa.</p>''',
    'caso_practico': '''<p><strong>El Colapso de Hershey's:</strong> En 1999, la gigante de chocolates Hershey's intentó implementar SAP ERP en tiempo récord justo antes de Halloween. Saltaron las fases de prueba para ganar tiempo. El sistema colapsó la logística: había chocolates en los depósitos, pero el ERP no permitía procesar los envíos. Hershey's perdió 100 millones de dólares en ventas de la temporada y el precio de sus acciones se desplomó un 8% en un solo día.</p>''',
    'taller_dfd': '''<p><strong>Asignación Modular de Transacciones:</strong> Dada una lista de eventos empresariales (ej. "Contratar a un gerente", "Pagar el salario", "Comprar materia prima a China", "Emitir balance anual"), los estudiantes deben clasificarlos indicando a qué módulo de SAP irían a impactar lógicamente (HR, FI, MM, SD).</p>''',
    'evaluacion_cierre': '''<p><strong>Evaluación Formativa:</strong> Explique brevemente: ¿Por qué la implementación de un ERP es considerada un proyecto de transformación de negocios y no simplemente un proyecto del departamento de Informática?</p>''',
    'evaluacion_multiple_choice': '''<p><strong>Selección Múltiple (10 Puntos) - Tiempo sugerido: 10-15 minutos:</strong></p>
    <ol>
        <li class="mb-3"><strong>Concepto Fundamental:</strong> ¿Qué significan las siglas ERP en el ámbito de los sistemas corporativos?
            <ul class="list-unstyled ms-3">
                <li>A. Electronic Record Processing.</li>
                <li><strong>B. Enterprise Resource Planning (Planificación de Recursos Empresariales). (Correcta)</strong></li>
                <li>C. Executive Report Program.</li>
                <li>D. External Relational Protocol.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Arquitectura del ERP:</strong> La característica técnica principal que distingue a un ERP verdadero de un grupo de programas contables aislados es que el ERP posee:
            <ul class="list-unstyled ms-3">
                <li>A. Gráficos en tercera dimensión.</li>
                <li>B. Una velocidad de procesamiento cuántica.</li>
                <li><strong>C. Módulos integrados que comparten una única base de datos centralizada. (Correcta)</strong></li>
                <li>D. Un costo muy bajo de implementación.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Flujo de la Información:</strong> En un entorno ERP, si un operador del área de Ventas (SD) registra la venta de un lote de productos, ¿qué debe hacer el área de Inventarios (MM) para actualizar el stock?
            <ul class="list-unstyled ms-3">
                <li>A. Volver a tipear la salida del lote en su propia computadora.</li>
                <li>B. Esperar un correo electrónico del vendedor.</li>
                <li><strong>C. Nada. El stock se deduce automáticamente en milisegundos. (Correcta)</strong></li>
                <li>D. Ejecutar un programa de sincronización nocturna al final del día.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Ventaja Competitiva:</strong> Una ventaja corporativa clave al implementar un sistema ERP es:
            <ul class="list-unstyled ms-3">
                <li>A. La reducción del presupuesto de tecnología a casi cero.</li>
                <li><strong>B. La trazabilidad completa (tracking) y visibilidad de los datos en tiempo real en toda la organización. (Correcta)</strong></li>
                <li>C. Que los empleados ya no necesitan capacitación.</li>
                <li>D. Que la empresa puede despedir a todos sus gerentes.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Evolución Histórica:</strong> Los sistemas ERP modernos evolucionaron directamente de los antiguos sistemas diseñados en los años 70 para calcular los materiales de las fábricas. ¿Cómo se llamaban esos sistemas originales?
            <ul class="list-unstyled ms-3">
                <li>A. CRM (Customer Relationship Management).</li>
                <li>B. EIS (Executive Information System).</li>
                <li><strong>C. MRP (Material Requirements Planning). (Correcta)</strong></li>
                <li>D. AI (Artificial Intelligence).</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Mercado de Software:</strong> ¿Cuál de las siguientes empresas alemanas es considerada la pionera y líder mundial histórico en software ERP para grandes corporaciones?
            <ul class="list-unstyled ms-3">
                <li>A. Microsoft.</li>
                <li>B. Apple.</li>
                <li><strong>C. SAP. (Correcta)</strong></li>
                <li>D. Facebook.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Filosofía de Implementación:</strong> Cuando una empresa adquiere un ERP de clase mundial (como SAP u Oracle), la filosofía principal respecto a los procesos o reglas del negocio asume que:
            <ul class="list-unstyled ms-3">
                <li>A. El código del ERP se debe reescribir y modificar completamente para que funcione exactamente como la empresa operaba antes.</li>
                <li><strong>B. El software incluye las "Mejores Prácticas" del mercado, por lo que la empresa debe hacer reingeniería para adaptarse al software. (Correcta)</strong></li>
                <li>C. El software aprenderá por sí solo cómo trabaja la empresa utilizando IA.</li>
                <li>D. Es un proceso de instalación de 24 horas similar a instalar Microsoft Office.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Gestión del Cambio:</strong> ¿Cuál es la principal causa de fracaso al implementar un sistema ERP en una organización?
            <ul class="list-unstyled ms-3">
                <li>A. Que las computadoras son muy lentas.</li>
                <li>B. Fallos matemáticos en el código del software.</li>
                <li><strong>C. La resistencia al cambio cultural de los empleados y la mala gestión del rediseño de procesos. (Correcta)</strong></li>
                <li>D. La falta de espacio en los discos duros.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Módulos Funcionales:</strong> Si el gerente de Recursos Humanos está liquidando y pagando salarios, ¿en qué módulo clásico del ERP está operando?
            <ul class="list-unstyled ms-3">
                <li>A. FI (Finanzas).</li>
                <li>B. SD (Ventas y Distribución).</li>
                <li>C. MM (Gestión de Materiales).</li>
                <li><strong>D. HR (Recursos Humanos). (Correcta)</strong></li>
            </ul>
        </li>
        <li class="mb-3"><strong>Caso Hershey's:</strong> El famoso fracaso en la implementación de SAP por parte de la chocolatera Hershey's en 1999 nos enseña que:
            <ul class="list-unstyled ms-3">
                <li>A. SAP no sirve para empresas alimenticias.</li>
                <li>B. Los chocolates no pueden ser escaneados por sistemas tecnológicos.</li>
                <li><strong>C. Forzar tiempos irreales, saltarse pruebas (testing) e implementar todo de golpe en temporadas críticas puede colapsar la logística y causar pérdidas millonarias. (Correcta)</strong></li>
                <li>D. El software de paquete es más inseguro que el software a medida.</li>
            </ul>
        </li>
    </ol>''',
    'bibliografia': 'Monk, E., & Wagner, B. (2012). <em>Concepts in Enterprise Resource Planning</em>. Cengage Learning. <br>Laudon, K. C., & Laudon, J. P. (2016). <em>Sistemas de información gerencial</em>. Pearson.'
}


import re

with open('generar_htmls.py', 'r', encoding='utf-8') as f:
    content = f.read()

def dict_to_str(d):
    res = "{\n"
    for k, v in d.items():
        if isinstance(v, str) and '<' in v:
            res += f"        '{k}': '''{v}''',\n"
        elif isinstance(v, str):
            res += f"        '{k}': '{v}',\n"
        else:
            res += f"        '{k}': {v},\n"
    res += "    }"
    return res

# Replace class 3
pat3 = re.compile(r"\{\s*'id': 3, 'tipo': 'Virtual'.*?'bibliografia': 'Elmasri, R.*?\}", re.DOTALL)
content = pat3.sub(dict_to_str(c3).replace('\\', '\\\\'), content, count=1)

# Replace class 4
pat4 = re.compile(r"\{\s*'id': 4, 'tipo': 'Virtual'.*?'bibliografia': 'Monk, E.*?\}", re.DOTALL)
content = pat4.sub(dict_to_str(c4).replace('\\', '\\\\'), content, count=1)

with open('generar_htmls.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Classes 3 and 4 updated successfully.")
