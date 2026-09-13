# -*- coding: utf-8 -*-

c7 = {
    'id': 7, 'tipo': 'Virtual', 'titulo': 'Inteligencia Artificial y Sistemas Expertos en los Negocios',
    'pregunta_central': '¿Puede una computadora tener el conocimiento y el criterio de un médico o un ingeniero con 30 años de experiencia?',
    'cronograma': '''<table class="table table-sm table-striped border">
        <thead class="table-dark"><tr><th>Tiempo</th><th>Etapa</th><th>Actividad</th></tr></thead>
        <tbody>
            <tr><td><strong>0–10 min</strong></td><td>Apertura</td><td>Conexión con la Clase 6 y Resultados de Aprendizaje</td></tr>
            <tr><td><strong>10–25 min</strong></td><td>Problematización</td><td>Caso: "La jubilación del experto indispensable"</td></tr>
            <tr><td><strong>25–40 min</strong></td><td>Diagnóstico</td><td>Debate: ¿Qué significa realmente "aprender" para una máquina?</td></tr>
            <tr><td><strong>40–65 min</strong></td><td>Teoría I</td><td>Introducción a la Inteligencia Artificial (IA) y Machine Learning</td></tr>
            <tr><td><strong>65–80 min</strong></td><td>Actividad 1</td><td>Entrenamiento de un modelo conceptual básico (Gatos vs Perros)</td></tr>
            <tr><td><strong>80–100 min</strong></td><td>Teoría II</td><td>Sistemas Expertos (SE): Base de Conocimiento y Motor de Inferencia</td></tr>
            <tr><td><strong>100–110 min</strong></td><td>Pausa</td><td><strong>10 minutos</strong></td></tr>
            <tr><td><strong>110–130 min</strong></td><td>Teoría III</td><td>Lógica Difusa (Fuzzy Logic) y Redes Neuronales Artificiales</td></tr>
            <tr><td><strong>130–150 min</strong></td><td>Caso práctico</td><td>El Sistema Experto MYCIN para diagnósticos médicos</td></tr>
            <tr><td><strong>150–165 min</strong></td><td>Taller IA</td><td>Estructurar una regla de producción IF-THEN compleja</td></tr>
            <tr><td><strong>165–175 min</strong></td><td>Socialización</td><td>Análisis ético de decisiones tomadas por algoritmos</td></tr>
            <tr><td><strong>175–180 min</strong></td><td>Evaluación/cierre</td><td>Cuestionario Múltiple Opción</td></tr>
        </tbody>
    </table>''',
    'resultados_aprendizaje': '''<ul>
        <li>Diferenciar conceptualmente entre la programación tradicional y el Aprendizaje Automático (Machine Learning).</li>
        <li>Identificar la arquitectura fundamental de un Sistema Experto (Base de Conocimiento, Motor de Inferencia, Interfaz de Usuario).</li>
        <li>Comprender el concepto de Lógica Difusa y cómo permite a las computadoras procesar la ambigüedad humana ("mucho", "poco").</li>
        <li>Explicar a grandes rasgos el funcionamiento y aplicación de las Redes Neuronales Artificiales en el reconocimiento de patrones.</li>
        <li>Evaluar las implicaciones éticas y estratégicas de sustituir o complementar el juicio humano con Sistemas de IA en una organización.</li>
    </ul>''',
    'situacion_problematica': '''<p><strong>Caso: "La jubilación del experto indispensable"</strong><br>
    En una gigantesca planta química, el ingeniero jefe de mezclas, Don Carlos, lleva 35 años ajustando las válvulas. Él no usa fórmulas matemáticas precisas; él "sabe" cuándo la mezcla está lista por el color, el olor y la presión. El problema: Don Carlos se jubila el mes que viene. Si se va, la planta corre riesgo de parar operaciones porque los ingenieros nuevos tardarán 10 años en ganar su intuición.</p>
    <p class="fw-bold fs-5 text-center text-primary mt-3">Pregunta Central: ¿Cómo puede la empresa "descargar" y guardar para siempre la intuición y el conocimiento acumulado de Don Carlos antes de que se marche?</p>''',
    'actividad_diagnostica': '''<p><strong>Reflexión inicial:</strong> ¿Cómo aprenden ustedes a jugar un videojuego o un deporte nuevo? ¿Alguien les da un manual matemático perfecto de cada movimiento, o aprenden equivocándose cientos de veces hasta encontrar el patrón de éxito? Discutan la diferencia entre "ser programado" y "aprender empíricamente".</p>''',
    'teoria_1': '''<p><strong>Inteligencia Artificial y Machine Learning:</strong> La programación tradicional es: <em>Datos + Reglas (Código) = Respuestas</em>. En el Aprendizaje Automático (Machine Learning), el paradigma se invierte: le damos a la máquina <em>Datos + Respuestas pasadas = La máquina descubre las Reglas</em>. La IA en negocios busca imitar cognitivamente la forma en que el cerebro humano reconoce patrones complejos, como aprobar un crédito bancario basándose en el historial de millones de deudores.</p>''',
    'actividad_1': '''<p><strong>Entrenamiento Conceptual:</strong> Se muestra a los estudiantes cómo un algoritmo ingenuo clasifica imágenes usando píxeles. Reflexionan sobre cómo, al darle 10.000 imágenes etiquetadas como "Fraude" y 10.000 como "Legítimo", la IA ajusta estadísticamente sus pesos internos sin necesidad de que un humano le programe explícitamente "qué es un fraude".</p>''',
    'teoria_2': '''<p><strong>Sistemas Expertos (SE):</strong> Son la rama de la IA diseñada para replicar el razonamiento de un especialista humano de alto nivel en un dominio muy estrecho (ej. diagnosticar cáncer). Se componen de: a) <strong>Base de Conocimiento:</strong> cientos de reglas IF-THEN extraídas del cerebro del experto mediante ingeniería del conocimiento. b) <strong>Motor de Inferencia:</strong> el "cerebro lógico" que recorre las reglas. c) <strong>Interfaz de Usuario.</strong></p>''',
    'teoria_3': '''<p><strong>Lógica Difusa y Redes Neuronales:</strong> La computadora clásica solo entiende Verdadero/Falso (1 o 0). La <em>Lógica Difusa (Fuzzy Logic)</em> introduce los grados de verdad (ej. "La temperatura es un 0.8 de Caliente"), permitiendo programar conceptos ambiguos. Por otro lado, las <em>Redes Neuronales Artificiales</em> simulan sinapsis cerebrales mediante nodos interconectados (Deep Learning), excelentes para el reconocimiento visual y de lenguaje natural.</p>''',
    'caso_practico': '''<p><strong>MYCIN y los Límites de la IA:</strong> Análisis del pionero sistema experto MYCIN (Universidad de Stanford, 1970s), que recetaba antibióticos para infecciones sanguíneas. Aunque era más preciso que el 90% de los médicos humanos en su diagnóstico estadístico matemático, tenía cero "sentido común". Si se le daban síntomas absurdos, el sistema no sabía decir "este paciente está muerto" o "este es un perro, no un humano". Esto evidencia la diferencia vital entre el cálculo algorítmico y el razonamiento contextual profundo de los seres humanos.</p>''',
    'taller_dfd': '''<p><strong>Taller: Ingeniería del Conocimiento:</strong> En equipos, imaginen que deben construir un Sistema Experto para aprobar o rechazar tarjetas de crédito. Escriban un "Árbol de Decisión" encadenando al menos 5 reglas de producción de la forma "SI [condición] Y [condición], ENTONCES [resultado]". Deben incluir variables como Sueldo, Deudas previas, Edad y Antigüedad laboral.</p>''',
    'evaluacion_cierre': '''<p><strong>Evaluación Formativa:</strong> Explique: ¿Por qué la "Base de Conocimiento" de un Sistema Experto es mucho más valiosa (y difícil de conseguir) que el hardware o el software en sí mismo?</p>''',
    'evaluacion_multiple_choice': '''<p><strong>Selección Múltiple (10 Puntos) - Tiempo sugerido: 10-15 minutos:</strong></p>
    <ol>
        <li class="mb-3"><strong>Paradigma de la IA:</strong> A diferencia de la programación tradicional, en el Aprendizaje Automático (Machine Learning), el sistema informático:
            <ul class="list-unstyled ms-3">
                <li>A. Requiere que un humano escriba manualmente cada regla paso a paso.</li>
                <li><strong>B. Descubre las reglas o patrones matemáticos por sí mismo tras analizar grandes volúmenes de datos históricos (entrenamiento). (Correcta)</strong></li>
                <li>C. No necesita bases de datos, funciona de manera mágica.</li>
                <li>D. Es incapaz de mejorar su rendimiento con el paso del tiempo.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Definición de Sistema Experto:</strong> Un Sistema Experto (SE) en el ámbito corporativo se define mejor como:
            <ul class="list-unstyled ms-3">
                <li>A. Un programa antivirus muy avanzado y difícil de usar.</li>
                <li>B. Una computadora que solo puede ser operada por expertos informáticos.</li>
                <li><strong>C. Un sistema de IA que emula el razonamiento y la capacidad de toma de decisiones de un especialista humano en un campo muy específico. (Correcta)</strong></li>
                <li>D. Un software que ayuda a los gerentes a chatear más rápido.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Componentes del Sistema Experto:</strong> ¿Cuál es el corazón intelectual de un Sistema Experto, donde se almacenan las reglas empíricas, la heurística y la intuición técnica extraída del especialista humano?
            <ul class="list-unstyled ms-3">
                <li>A. El monitor LED de alta resolución.</li>
                <li><strong>B. La Base de Conocimiento (Knowledge Base). (Correcta)</strong></li>
                <li>C. La placa base (Motherboard).</li>
                <li>D. El cable de red TCP/IP.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Reglas de Producción:</strong> En la arquitectura clásica de un Sistema Experto, el conocimiento humano suele codificarse internamente utilizando la estructura lógica de:
            <ul class="list-unstyled ms-3">
                <li>A. Bucles FOR infinitos.</li>
                <li>B. Código binario puramente aleatorio.</li>
                <li><strong>C. Reglas de condición-acción (SI... ENTONCES... / IF-THEN). (Correcta)</strong></li>
                <li>D. Tablas de Excel vacías.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Rol del Ingeniero del Conocimiento:</strong> En la creación de un Sistema Experto, la persona encargada de entrevistar al experto humano (ej. el médico) y traducir sus conocimientos verbales a reglas informáticas que el sistema entienda, se denomina:
            <ul class="list-unstyled ms-3">
                <li>A. Hacker de sombrero blanco.</li>
                <li>B. Administrador de Red.</li>
                <li><strong>C. Ingeniero del Conocimiento (Knowledge Engineer). (Correcta)</strong></li>
                <li>D. Soporte Técnico de nivel 1.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Lógica Difusa (Fuzzy Logic):</strong> La principal característica que aporta la Lógica Difusa a la Inteligencia Artificial es su capacidad para:
            <ul class="list-unstyled ms-3">
                <li>A. Multiplicar números de mil dígitos en un milisegundo.</li>
                <li><strong>B. Procesar datos cualitativos ambiguos (como "caliente", "viejo", "rápido") mediante grados continuos de pertenencia entre 0 y 1. (Correcta)</strong></li>
                <li>C. Borrar (difuminar) datos antiguos del disco duro para ahorrar espacio.</li>
                <li>D. Evitar el sobrecalentamiento del procesador.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Redes Neuronales Artificiales:</strong> Tecnologías como el reconocimiento facial, el dictado por voz y la conducción autónoma basan su poder en modelos matemáticos inspirados en la biología del cerebro humano, conocidos como:
            <ul class="list-unstyled ms-3">
                <li>A. Bases de Datos Relacionales Clásicas.</li>
                <li>B. Redes de Área Local (LAN).</li>
                <li><strong>C. Redes Neuronales Artificiales y Deep Learning (Aprendizaje Profundo). (Correcta)</strong></li>
                <li>D. Sistemas Expertos IF-THEN simples.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Motor de Inferencia:</strong> El componente de un Sistema Experto encargado de evaluar los datos ingresados por el usuario y navegar por las reglas para deducir una respuesta o diagnóstico, recibe el nombre de:
            <ul class="list-unstyled ms-3">
                <li><strong>A. Motor de Inferencia (Inference Engine). (Correcta)</strong></li>
                <li>B. Memoria ROM.</li>
                <li>C. Firewall.</li>
                <li>D. ERP Integrado.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Limitaciones de la IA (El Sentido Común):</strong> El caso clásico del sistema médico pionero MYCIN demuestra que una gran limitación histórica de los Sistemas Expertos es:
            <ul class="list-unstyled ms-3">
                <li>A. Su incapacidad para hacer cálculos estadísticos básicos.</li>
                <li>B. Que los médicos se rehusaban a comprar computadoras.</li>
                <li><strong>C. Su falta total de "sentido común" contextual o capacidad analítica fuera de su dominio milimétricamente programado. (Correcta)</strong></li>
                <li>D. Que siempre se equivocaba más que los humanos.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Toma de decisiones - Estrategia vs IA:</strong> Un gerente afirma: "La Inteligencia Artificial es infalible, por lo que acataremos sin revisar todas las decisiones financieras que nos arroje el algoritmo". Como analista en Sistemas de Información, usted le responde:
            <ul class="list-unstyled ms-3">
                <li>A. Excelente estrategia, el algoritmo no se equivoca jamás.</li>
                <li>B. Es correcto, así ahorramos tiempo de análisis en el directorio.</li>
                <li><strong>C. Es un error estratégico gravísimo; los algoritmos pueden heredar sesgos ocultos de los datos de entrenamiento pasados y carecen de ética humana frente a contextos totalmente nuevos. (Correcta)</strong></li>
                <li>D. Es incorrecto porque la IA solo sirve para jugar ajedrez, no para negocios.</li>
            </ul>
        </li>
    </ol>''',
    'bibliografia': 'Russell, S., & Norvig, P. (2016). <em>Inteligencia artificial: Un enfoque moderno</em>. Pearson.'
}

c8 = {
    'id': 8, 'tipo': 'Asincrónica', 'titulo': 'Sistemas de Apoyo a Ejecutivos (EIS) y Tableros de Control',
    'pregunta_central': '¿Por qué el Director General (CEO) de una corporación no tiene tiempo para leer un informe detallado de 50 páginas?',
    'cronograma': '''<table class="table table-sm table-striped border">
        <thead class="table-dark"><tr><th>Tiempo</th><th>Etapa</th><th>Actividad</th></tr></thead>
        <tbody>
            <tr><td><strong>0–10 min</strong></td><td>Apertura</td><td>Conexión con Clase 7 y Resultados de Aprendizaje</td></tr>
            <tr><td><strong>10–25 min</strong></td><td>Problematización</td><td>Caso: "El CEO ahogado en información"</td></tr>
            <tr><td><strong>25–40 min</strong></td><td>Diagnóstico</td><td>Análisis de la escasez cognitiva en la Alta Dirección</td></tr>
            <tr><td><strong>40–65 min</strong></td><td>Teoría I</td><td>EIS: Filosofía y Psicología del usuario ejecutivo</td></tr>
            <tr><td><strong>65–80 min</strong></td><td>Actividad 1</td><td>Identificar KPIs vitales vs Métricas de vanidad</td></tr>
            <tr><td><strong>80–100 min</strong></td><td>Teoría II</td><td>Factores Críticos de Éxito (CSF) de John Rockart</td></tr>
            <tr><td><strong>100–110 min</strong></td><td>Pausa</td><td><strong>10 minutos</strong></td></tr>
            <tr><td><strong>110–130 min</strong></td><td>Teoría III</td><td>Tableros de Control (Dashboards) y Función Drill-Down</td></tr>
            <tr><td><strong>130–150 min</strong></td><td>Caso práctico</td><td>El Centro de Comando Operacional Global de Amazon</td></tr>
            <tr><td><strong>150–165 min</strong></td><td>Taller EIS</td><td>Diseño en papel de la interfaz de un Dashboard para un CEO</td></tr>
            <tr><td><strong>165–175 min</strong></td><td>Socialización</td><td>Justificación de los colores y alertas semafóricas elegidas</td></tr>
            <tr><td><strong>175–180 min</strong></td><td>Evaluación/cierre</td><td>Cuestionario Múltiple Opción</td></tr>
        </tbody>
    </table>''',
    'resultados_aprendizaje': '''<ul>
        <li>Diferenciar las necesidades informativas y cognitivas de la Alta Dirección (CEO) frente a la Gerencia Media (MIS/DSS).</li>
        <li>Comprender y aplicar la teoría de los Factores Críticos de Éxito (CSF) como base metodológica para construir un EIS.</li>
        <li>Explicar el funcionamiento de un Tablero de Control (Dashboard) y su sistema de alertas semafóricas.</li>
        <li>Demostrar la capacidad analítica de utilizar la función de perforación de datos (Drill-Down) para investigar la raíz de un problema corporativo.</li>
    </ul>''',
    'situacion_problematica': '''<p><strong>Caso: "El CEO ahogado en información"</strong><br>
    Una empresa invirtió en un ERP costoso. Cada viernes, los gerentes medios (MIS) le imprimen al Presidente de la compañía un reporte financiero y operativo de 300 hojas llenas de celdas de Excel en fuente tamaño 8. El Presidente no puede leer 300 hojas. Para cuando encuentra que las ventas en Brasil cayeron, ya es martes de la semana siguiente y el problema empeoró. El presidente se queja de que "tiene mucha información, pero cero visibilidad".</p>
    <p class="fw-bold fs-5 text-center text-primary mt-3">Pregunta Central: ¿Cómo diseñamos un sistema para alguien cuyo recurso más escaso es el tiempo?</p>''',
    'actividad_diagnostica': '''<p><strong>Reflexión inicial:</strong> Imaginen que son pilotos volando un Boeing 747 en medio de una tormenta. Si tuvieran que leer un manual de texto en pantalla para saber la altitud y la presión de aceite, el avión se estrellaría. ¿Cómo les presenta la información el panel de instrumentos del avión para que puedan reaccionar en una fracción de segundo?</p>''',
    'teoria_1': '''<p><strong>Sistemas de Información Ejecutiva (EIS) y la Alta Dirección:</strong> En la cúspide de la pirámide organizacional (Directores, Presidentes), el problema no es la falta de datos, sino la <em>sobrecarga cognitiva</em>. Un EIS (Executive Information System) se diseña bajo un postulado psicológico: debe ser 100% intuitivo, táctil, gráfico y no requerir capacitación. El EIS no muestra planillas, muestra el pulso vital del negocio en tiempo real.</p>''',
    'actividad_1': '''<p><strong>Filtro de Relevancia:</strong> Dada una lista de 20 métricas (ej. cantidad de resmas de papel usadas, rotación de personal clave, ganancias netas globales), los estudiantes deben descartar el "ruido operativo" y seleccionar solo las 4 métricas vitales (KPIs) que el CEO debería mirar cada mañana al despertar.</p>''',
    'teoria_2': '''<p><strong>Factores Críticos de Éxito (CSF):</strong> Según la teoría académica de John Rockart (MIT), un EIS jamás debe construirse intentando resumir todos los datos de la empresa. Debe construirse estrictamente respondiendo a los Factores Críticos de Éxito: <em>las 4 o 5 áreas clave donde las cosas DEBEN salir bien para que la empresa sobreviva y prospere</em>. Si el éxito de un supermercado es la frescura de los alimentos, el EIS del CEO debe priorizar métricas de cadena de frío y caducidad, no solo dinero.</p>''',
    'teoria_3': '''<p><strong>El Dashboard (Tablero de Control) y el Drill-Down:</strong> Un EIS se materializa visualmente en un Dashboard o Cuadro de Mando. Utiliza semaforización: si el indicador está Verde, el CEO no hace nada. Si está Rojo, hay una desviación del presupuesto. La herramienta estrella del EIS es el <strong>Drill-Down (Perforación de Datos)</strong>: la capacidad del CEO de hacer clic en el gráfico rojo (Nivel Global) y perforar capa por capa (País &rarr; Región &rarr; Sucursal &rarr; Vendedor) hasta llegar a la raíz micro del problema en 5 segundos, sin llamar a un analista.</p>''',
    'caso_practico': '''<p><strong>Centro de Comando Operacional (Amazon):</strong> Análisis de la élite directiva de Amazon. Sus directores globales no leen reportes impresos estáticos de ayer. Toman decisiones rodeados de pantallas gigantes (o tablets) con mapas de calor de flujo geoespacial y algoritmos predictivos. Si un nodo logístico en Europa parpadea en rojo (retraso), el Drill-Down revela al instante que es una huelga portuaria, permitiendo al ejecutivo desviar envíos marítimos en tiempo real.</p>''',
    'taller_dfd': '''<p><strong>Taller: Diseñando el Dashboard del CEO:</strong> En equipos, imaginen que son los arquitectos EIS para el Presidente de una gran aerolínea latinoamericana. Dibujen en papel (Wireframing) la interfaz principal del sistema en una Tablet. Definan gráficamente al menos 4 indicadores críticos de éxito, estableciendo los límites numéricos para que se enciendan las alertas verde, amarilla o roja.</p>''',
    'evaluacion_cierre': '''<p><strong>Evaluación Formativa:</strong> Explique, usando un ejemplo, la acción tecnológica conocida como "Drill-Down" y por qué empodera estratégicamente a un alto directivo.</p>''',
    'evaluacion_multiple_choice': '''<p><strong>Selección Múltiple (10 Puntos) - Tiempo sugerido: 10-15 minutos:</strong></p>
    <ol>
        <li class="mb-3"><strong>Perfil de usuario EIS:</strong> El usuario final para el que se diseña específicamente un Sistema de Información Ejecutiva (EIS) se encuentra en:
            <ul class="list-unstyled ms-3">
                <li>A. El nivel de entrada operativo (Cajeros, operadores).</li>
                <li>B. El nivel administrativo intermedio (Supervisores de turno).</li>
                <li><strong>C. La cúspide de la pirámide organizacional (Alta Dirección, Presidencia, CEO). (Correcta)</strong></li>
                <li>D. El nivel puramente técnico (Programadores y administradores de red).</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Necesidad Cognitiva:</strong> A diferencia de los gerentes de nivel medio que requieren reportes detallados (MIS) o simuladores (DSS), la principal restricción o "escasez" a la que se enfrenta un alto directivo es:
            <ul class="list-unstyled ms-3">
                <li>A. La falta total de datos de transacciones.</li>
                <li>B. La incapacidad de usar un mouse.</li>
                <li><strong>C. La escasez de tiempo y atención cognitiva frente a la inmensidad de los datos (sobrecarga de información). (Correcta)</strong></li>
                <li>D. La falta de espacio en su disco duro.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Interfaz y Usabilidad:</strong> Una regla de oro inquebrantable en el diseño e interfaz gráfica de un sistema EIS es que:
            <ul class="list-unstyled ms-3">
                <li>A. Debe requerir al menos 6 meses de capacitación técnica para poder interpretarlo.</li>
                <li>B. Solo debe funcionar escribiendo líneas de comandos de código fuente.</li>
                <li><strong>C. Debe ser extremadamente intuitivo, iconográfico (gráfico) y no requerir prácticamente ninguna capacitación de uso previo. (Correcta)</strong></li>
                <li>D. Debe estar impreso únicamente en blanco y negro.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Teoría de John Rockart:</strong> La metodología clásica para definir qué información exacta debe mostrar el EIS del presidente se basa en identificar:
            <ul class="list-unstyled ms-3">
                <li>A. Todos los errores contables históricos de la empresa.</li>
                <li><strong>B. Los Factores Críticos de Éxito (CSF), es decir, las pocas áreas vitales donde los resultados deben ser excelentes. (Correcta)</strong></li>
                <li>C. El código fuente del Sistema Operativo Windows.</li>
                <li>D. Las redes neuronales que controlan el edificio.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Ejemplo CSF:</strong> Para un hospital de alta complejidad, un ejemplo claro de Factor Crítico de Éxito a medir en el Dashboard del director sería:
            <ul class="list-unstyled ms-3">
                <li>A. La marca de las computadoras usadas por las secretarias.</li>
                <li>B. El color de pintura de la sala de espera.</li>
                <li><strong>C. La tasa de mortalidad postoperatoria y la disponibilidad inmediata de camas en Terapia Intensiva. (Correcta)</strong></li>
                <li>D. El número de veces que se cayó el internet en la cafetería.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Alertas Semafóricas:</strong> El propósito psicológico de usar la semaforización (Verde, Amarillo, Rojo) en un Tablero de Control (Dashboard) es:
            <ul class="list-unstyled ms-3">
                <li>A. Hacer que el software se vea más moderno e infantil.</li>
                <li>B. Reemplazar a los gerentes de recursos humanos.</li>
                <li><strong>C. Aplicar la "Administración por Excepción", atrayendo la atención del directivo rápida y exclusivamente hacia las áreas con desviaciones graves. (Correcta)</strong></li>
                <li>D. Medir la temperatura física del servidor central.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Función Drill-Down (I):</strong> ¿A qué se refiere la capacidad funcional conocida como Drill-Down (Perforación de Datos) en un EIS?
            <ul class="list-unstyled ms-3">
                <li>A. Aumentar el tamaño de la letra del reporte para que se lea mejor.</li>
                <li>B. Borrar permanentemente datos inútiles de la base de datos para ganar espacio.</li>
                <li><strong>C. Navegar interactivamente desde una visión de resumen macro, bajando a través de las jerarquías hasta llegar al nivel de detalle micro que origina un problema. (Correcta)</strong></li>
                <li>D. Descargar un virus de Internet.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Función Drill-Down (II) Aplicada:</strong> Un CEO ve un gráfico rojo en "Ventas Totales Europa". Hace clic y ve los países. Hace clic en "Alemania" (que está en rojo) y ve las ciudades. Hace clic en "Berlín" y ve que el problema es la falta de inventario del producto X. Esta secuencia es un ejemplo perfecto de:
            <ul class="list-unstyled ms-3">
                <li>A. Inteligencia Artificial (Lógica Difusa).</li>
                <li><strong>B. Capacidad analítica de Drill-Down. (Correcta)</strong></li>
                <li>C. Falla de seguridad informática (Ransomware).</li>
                <li>D. Reingeniería de procesos corporativos (BPR).</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Metodología de Desarrollo:</strong> A diferencia de un sistema transaccional (TPS) cuyas reglas son estáticas, las necesidades informativas de la mente de un CEO cambian rápidamente según el mercado. Por tanto, construir un EIS requiere una metodología de desarrollo:
            <ul class="list-unstyled ms-3">
                <li>A. Extremadamente lenta y rígida (Ciclo de Vida en Cascada de 3 años).</li>
                <li><strong>B. Ágil e iterativa (Prototipado rápido), donde el diseño evolucione constantemente según el feedback del directivo. (Correcta)</strong></li>
                <li>C. Orientada exclusivamente a reemplazar hardware antiguo.</li>
                <li>D. Sin la participación u opinión de los altos directivos.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Sistemas Geográficos:</strong> Un Centro de Comando Global Operacional (como el que usan las mega-corporaciones tecnológicas y logísticas mundiales para su directorio) combina típicamente un EIS con:
            <ul class="list-unstyled ms-3">
                <li>A. Impresoras de inyección de tinta lentas.</li>
                <li>B. Documentos fotocopiados en papel carbónico.</li>
                <li><strong>C. Sistemas de Información Geográfica (GIS) y pantallas interactivas para mapeo de calor espacial en tiempo real. (Correcta)</strong></li>
                <li>D. Sistemas operativos puramente basados en texto y comandos (MS-DOS).</li>
            </ul>
        </li>
    </ol>''',
    'bibliografia': 'Watson, H. J., Houdeshel, G., & Belcher, C. E. (1992). <em>Building executive information systems and other decision support applications</em>.'
}

import re

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

with open('generar_htmls.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace class 7
pat7 = re.compile(r"\{\s*'id': 7,.*?'bibliografia':.*?\}", re.DOTALL)
content = pat7.sub(dict_to_str(c7).replace('\\', '\\\\'), content, count=1)

# Replace class 8
pat8 = re.compile(r"\{\s*'id': 8,.*?'bibliografia':.*?\}", re.DOTALL)
content = pat8.sub(dict_to_str(c8).replace('\\', '\\\\'), content, count=1)

with open('generar_htmls.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Classes 7 and 8 updated successfully.")
