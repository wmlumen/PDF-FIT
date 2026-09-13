# -*- coding: utf-8 -*-

c5 = {
    'id': 5, 'tipo': 'Virtual', 'titulo': 'Infraestructura de Redes y Telecomunicaciones: La Empresa Global',
    'pregunta_central': '¿Cómo afecta a una empresa si su conexión a Internet se corta durante 24 horas?',
    'cronograma': '''<table class="table table-sm table-striped border">
        <thead class="table-dark"><tr><th>Tiempo</th><th>Etapa</th><th>Actividad</th></tr></thead>
        <tbody>
            <tr><td><strong>0–10 min</strong></td><td>Apertura</td><td>Conexión y Resultados de Aprendizaje</td></tr>
            <tr><td><strong>10–25 min</strong></td><td>Problematización</td><td>Caso: "El banco desconectado"</td></tr>
            <tr><td><strong>25–40 min</strong></td><td>Diagnóstico</td><td>Análisis de dependencia de la nube</td></tr>
            <tr><td><strong>40–65 min</strong></td><td>Teoría I</td><td>Conceptos de Red: LAN, WAN, Ancho de banda y Latencia</td></tr>
            <tr><td><strong>65–80 min</strong></td><td>Actividad 1</td><td>Calcular tiempos de transferencia y cuellos de botella</td></tr>
            <tr><td><strong>80–100 min</strong></td><td>Teoría II</td><td>Topologías de Red, Protocolo TCP/IP y Cloud Computing</td></tr>
            <tr><td><strong>100–110 min</strong></td><td>Pausa</td><td><strong>10 minutos</strong></td></tr>
            <tr><td><strong>110–130 min</strong></td><td>Teoría III</td><td>Ciberseguridad: VPNs, Firewalls y Encriptación</td></tr>
            <tr><td><strong>130–150 min</strong></td><td>Caso práctico</td><td>El ataque de Ransomware a Colonial Pipeline</td></tr>
            <tr><td><strong>150–165 min</strong></td><td>Taller Redes</td><td>Diseñar la arquitectura de red básica de una sucursal</td></tr>
            <tr><td><strong>165–175 min</strong></td><td>Socialización</td><td>Explicación de las topologías elegidas</td></tr>
            <tr><td><strong>175–180 min</strong></td><td>Evaluación/cierre</td><td>Cuestionario Múltiple Opción</td></tr>
        </tbody>
    </table>''',
    'resultados_aprendizaje': '''<ul>
        <li>Diferenciar los tipos de redes según su alcance geográfico (LAN, MAN, WAN).</li>
        <li>Comprender el rol crítico del protocolo TCP/IP en la comunicación global de datos.</li>
        <li>Identificar los conceptos de Ancho de Banda y Latencia y su impacto en los negocios.</li>
        <li>Evaluar la importancia del Cloud Computing (Nube) y las VPNs para el trabajo remoto.</li>
        <li>Analizar vulnerabilidades de red e identificar medidas básicas de ciberseguridad corporativa.</li>
    </ul>''',
    'situacion_problematica': '''<p><strong>Caso: "El banco desconectado"</strong><br>
    Un banco multinacional sufre un corte en su cable principal de fibra óptica subterránea debido a una excavación. Durante 6 horas, ninguna de sus 500 sucursales en el país puede acceder al sistema central en la nube. Los cajeros automáticos no dan dinero y los clientes no pueden usar la App móvil. Las pérdidas superan los 10 millones de dólares.</p>
    <p class="fw-bold fs-5 text-center text-primary mt-3">Pregunta Central: ¿Es la red de telecomunicaciones tan crítica como la electricidad para la empresa moderna?</p>''',
    'actividad_diagnostica': '''<p><strong>Reflexión inicial:</strong> Hagan una lista de todas las herramientas de trabajo que dejarían de funcionar en este momento si desconectamos el router Wi-Fi del edificio. ¿Qué porcentaje de las operaciones de una empresa moderna podría continuar sin Internet?</p>''',
    'teoria_1': '''<p><strong>Clasificación y Rendimiento de Redes:</strong> Las redes se clasifican por su alcance: <em>LAN</em> (Red de Área Local, dentro de un edificio) y <em>WAN</em> (Red de Área Amplia, conecta países). Su rendimiento se mide en dos factores clave: <strong>Ancho de Banda</strong> (la cantidad de datos que pueden viajar por segundo, como los carriles de una autopista) y la <strong>Latencia</strong> (el tiempo de retraso desde que se envía un paquete hasta que llega al destino).</p>''',
    'actividad_1': '''<p><strong>Cuellos de Botella:</strong> Los alumnos analizan un escenario donde una empresa tiene un sistema ERP en la nube velocísimo, computadoras de última generación, pero un enlace de Internet satelital con alta latencia. Deben explicar por qué el sistema "se siente lento" a pesar del buen hardware.</p>''',
    'teoria_2': '''<p><strong>TCP/IP y Cloud Computing:</strong> Internet funciona gracias al <em>Protocolo TCP/IP</em>, que divide los archivos en pequeños "paquetes" que viajan por distintas rutas y se reensamblan al llegar. Esta arquitectura de red permitió el surgimiento del <strong>Cloud Computing (Computación en la Nube)</strong>, donde las empresas ya no compran servidores físicos, sino que alquilan procesamiento y almacenamiento a través de Internet (ej. AWS, Azure).</p>''',
    'teoria_3': '''<p><strong>Ciberseguridad y VPNs:</strong> Al tener los datos viajando por cables públicos globales, la seguridad es vital. Un <em>Firewall</em> bloquea accesos no autorizados al servidor. Una <em>VPN (Red Privada Virtual)</em> crea un "túnel encriptado" dentro de Internet, permitiendo que un empleado desde su casa acceda a los sistemas de la empresa de forma segura, como si estuviera físicamente en la oficina.</p>''',
    'caso_practico': '''<p><strong>Colonial Pipeline (Ransomware):</strong> Análisis del ataque cibernético de 2021 donde hackers ingresaron a la red de la mayor tubería de combustible de EE. UU. (por la contraseña robada de un empleado en una VPN que no tenía doble factor de autenticación) y secuestraron los sistemas. La empresa tuvo que apagar la tubería, causando desabastecimiento de gasolina en 17 estados y debiendo pagar 4.4 millones de dólares en rescate.</p>''',
    'taller_dfd': '''<p><strong>Diseño de Arquitectura:</strong> En equipos, dibujen el esquema de red de una nueva sucursal comercial. Deben incluir e interconectar gráficamente: el Router (conexión a WAN), un Switch (conexión LAN), 5 PCs, 1 Impresora en red y la indicación de un túnel VPN hacia el servidor central en la nube.</p>''',
    'evaluacion_cierre': '''<p><strong>Evaluación Formativa:</strong> Explique por qué una empresa con sucursales en distintas ciudades requiere obligatoriamente del uso de una VPN para conectar sus sistemas de información.</p>''',
    'evaluacion_multiple_choice': '''<p><strong>Selección Múltiple (10 Puntos) - Tiempo sugerido: 10-15 minutos:</strong></p>
    <ol>
        <li class="mb-3"><strong>Redes LAN vs WAN:</strong> ¿Cuál de las siguientes opciones describe correctamente una red LAN (Local Area Network)?
            <ul class="list-unstyled ms-3">
                <li>A. Una red que conecta servidores entre Europa y América.</li>
                <li><strong>B. Una red confinada a un área geográfica pequeña, como un edificio o un campus universitario. (Correcta)</strong></li>
                <li>C. La red global de Internet pública.</li>
                <li>D. Una red satelital de posicionamiento global (GPS).</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Ancho de banda:</strong> En términos de telecomunicaciones, el "Ancho de Banda" se refiere a:
            <ul class="list-unstyled ms-3">
                <li>A. El grosor físico del cable de fibra óptica.</li>
                <li>B. El tiempo que tarda un paquete de datos en ir y volver.</li>
                <li><strong>C. La cantidad máxima de datos que se pueden transmitir por una conexión en un tiempo determinado. (Correcta)</strong></li>
                <li>D. El nivel de encriptación de un router inalámbrico.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Latencia:</strong> Si un jugador de videojuegos o un broker de bolsa se quejan de que tienen mucho "Lag" (retraso), están teniendo un problema de:
            <ul class="list-unstyled ms-3">
                <li>A. Falta de memoria RAM en el servidor.</li>
                <li>B. Redundancia de bases de datos.</li>
                <li><strong>C. Alta latencia en la transmisión de los paquetes de datos. (Correcta)</strong></li>
                <li>D. Exceso de Ancho de Banda.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Cloud Computing:</strong> Cuando una empresa decide usar "Cloud Computing" (La Nube) en modalidad SaaS (Software as a Service) como Microsoft 365, ¿qué está haciendo técnicamente?
            <ul class="list-unstyled ms-3">
                <li>A. Comprando discos duros externos para todos sus empleados.</li>
                <li><strong>B. Utilizando software alojado en servidores remotos accesibles a través de Internet, en lugar de instalarlo localmente. (Correcta)</strong></li>
                <li>C. Pagando por una red satelital que funciona aunque esté nublado.</li>
                <li>D. Contratando programadores para crear un sistema desde cero.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Protocolos de Red:</strong> ¿Cuál es el conjunto de protocolos de comunicación estándar que hace posible el funcionamiento y la interconexión global de Internet?
            <ul class="list-unstyled ms-3">
                <li>A. USB / HDMI</li>
                <li>B. Windows / MacOS</li>
                <li><strong>C. TCP / IP (Correcta)</strong></li>
                <li>D. SQL / NoSQL</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Seguridad - VPN:</strong> Una Red Privada Virtual (VPN) se utiliza corporativamente para:
            <ul class="list-unstyled ms-3">
                <li>A. Acelerar la velocidad de descarga de archivos.</li>
                <li><strong>B. Crear un túnel cifrado y seguro sobre una red pública (Internet) para que empleados remotos accedan a datos privados. (Correcta)</strong></li>
                <li>C. Reemplazar la necesidad de utilizar contraseñas.</li>
                <li>D. Emitir una señal de Wi-Fi de mayor alcance físico.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Seguridad Perimetral:</strong> El componente de software o hardware diseñado específicamente para bloquear el tráfico no autorizado (hackers) y permitir el tráfico seguro hacia la red de una empresa se denomina:
            <ul class="list-unstyled ms-3">
                <li>A. Switch de Capa 2.</li>
                <li><strong>B. Firewall (Cortafuegos). (Correcta)</strong></li>
                <li>C. Navegador Web.</li>
                <li>D. Cable Coaxial.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Ataques Cibernéticos:</strong> El ataque conocido como "Ransomware" (ej. el caso Colonial Pipeline) se caracteriza por:
            <ul class="list-unstyled ms-3">
                <li>A. Borrar accidentalmente las bases de datos de una empresa.</li>
                <li>B. Robar las impresoras de la red local.</li>
                <li><strong>C. Encriptar o secuestrar la información del sistema y exigir el pago de un rescate financiero para liberarla. (Correcta)</strong></li>
                <li>D. Enviar miles de correos publicitarios (Spam).</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Redes Inalámbricas:</strong> La principal vulnerabilidad inherente de las redes inalámbricas (Wi-Fi) en comparación con las redes cableadas en una empresa es que:
            <ul class="list-unstyled ms-3">
                <li>A. Son mucho más costosas de instalar.</li>
                <li><strong>B. Las ondas de radio traspasan las paredes del edificio, facilitando la intercepción por parte de intrusos físicos externos si no están bien encriptadas. (Correcta)</strong></li>
                <li>C. No soportan sistemas ERP.</li>
                <li>D. Dañan los discos duros de las computadoras.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Toma de decisiones arquitectónicas:</strong> Un CIO debe conectar dos sucursales corporativas ubicadas a 500 kilómetros de distancia. La solución más lógica y económica a nivel de arquitectura lógica hoy en día es:
            <ul class="list-unstyled ms-3">
                <li>A. Tender un cable físico LAN privado de 500 kilómetros.</li>
                <li>B. Usar disquetes o USB enviados por correo postal diario.</li>
                <li><strong>C. Utilizar la red pública de Internet montando una conexión VPN cifrada (creando una WAN segura). (Correcta)</strong></li>
                <li>D. Comprar un ERP diferente para cada sucursal.</li>
            </ul>
        </li>
    </ol>''',
    'bibliografia': 'Kurose, J. F., & Ross, K. W. (2017). <em>Redes de computadoras: Un enfoque descendente</em>. Pearson. <br>Stallings, W. (2014). <em>Comunicaciones y redes de computadores</em>.'
}

c6 = {
    'id': 6, 'tipo': 'Virtual', 'titulo': 'Tecnologías de Apoyo a Decisiones (DSS/GDSS)',
    'pregunta_central': 'Cuando hay mucha incertidumbre, ¿cómo un directivo evita tomar decisiones basándose solo en su instinto?',
    'cronograma': '''<table class="table table-sm table-striped border">
        <thead class="table-dark"><tr><th>Tiempo</th><th>Etapa</th><th>Actividad</th></tr></thead>
        <tbody>
            <tr><td><strong>0–10 min</strong></td><td>Apertura</td><td>Conexión con Clase 1 y Resultados de Aprendizaje</td></tr>
            <tr><td><strong>10–25 min</strong></td><td>Problematización</td><td>Caso: "Apostando la empresa por intuición"</td></tr>
            <tr><td><strong>25–40 min</strong></td><td>Diagnóstico</td><td>Tipos de Decisiones: Estructuradas vs No Estructuradas</td></tr>
            <tr><td><strong>40–65 min</strong></td><td>Teoría I</td><td>Componentes de un DSS: Base de Modelos y Análisis "What-If"</td></tr>
            <tr><td><strong>65–80 min</strong></td><td>Actividad 1</td><td>Simulación de Sensibilidad en una planilla</td></tr>
            <tr><td><strong>80–100 min</strong></td><td>Teoría II</td><td>Sistemas de Soporte a Decisiones Grupales (GDSS)</td></tr>
            <tr><td><strong>100–110 min</strong></td><td>Pausa</td><td><strong>10 minutos</strong></td></tr>
            <tr><td><strong>110–130 min</strong></td><td>Teoría III</td><td>Minería de Datos y Descubrimiento de Patrones (KDD)</td></tr>
            <tr><td><strong>130–150 min</strong></td><td>Caso práctico</td><td>El caso "Cervezas y Pañales" y las decisiones de retail</td></tr>
            <tr><td><strong>150–165 min</strong></td><td>Taller de Decisión</td><td>Resolver un problema semiestructurado usando Análisis "Búsqueda de Metas"</td></tr>
            <tr><td><strong>165–175 min</strong></td><td>Socialización</td><td>Debate sobre las conclusiones de cada grupo</td></tr>
            <tr><td><strong>175–180 min</strong></td><td>Evaluación/cierre</td><td>Cuestionario Múltiple Opción</td></tr>
        </tbody>
    </table>''',
    'resultados_aprendizaje': '''<ul>
        <li>Clasificar las decisiones corporativas en Estructuradas, Semiestructuradas y No Estructuradas.</li>
        <li>Comprender la función del Análisis de Sensibilidad ("What-If") dentro de un Sistema de Soporte a Decisiones (DSS).</li>
        <li>Identificar cómo los sistemas GDSS mitigan los problemas psicológicos en la toma de decisiones grupales.</li>
        <li>Explicar el propósito de la Minería de Datos (Data Mining) en el descubrimiento de patrones ocultos.</li>
    </ul>''',
    'situacion_problematica': '''<p><strong>Caso: "Apostando la empresa por intuición"</strong><br>
    Un gerente general tiene que decidir si lanzar un nuevo producto al mercado internacional. Tiene reportes del pasado (MIS), pero el futuro depende de variables desconocidas: ¿qué pasa si el dólar sube un 10%? ¿Qué pasa si el costo de transporte marítimo se duplica? El gerente decide lanzar el producto basándose en su "instinto". Seis meses después, la inflación logística destruye los márgenes y la empresa quiebra.</p>
    <p class="fw-bold fs-5 text-center text-primary mt-3">Pregunta Central: ¿Cómo puede la tecnología ayudar a predecir el impacto de múltiples escenarios futuros antes de arriesgar dinero real?</p>''',
    'actividad_diagnostica': '''<p><strong>Reflexión inicial:</strong> Discutan en parejas: ¿Cuál es la diferencia entre que la computadora decida a quién otorgarle un préstamo bancario de $1,000, frente a decidir a qué país la empresa debería mudar sus operaciones internacionales?</p>''',
    'teoria_1': '''<p><strong>Tipos de Decisiones y el DSS:</strong> Las decisiones operativas son <em>Estructuradas</em> (ej. reponer inventario, reglas claras matemáticas). Las decisiones de los gerentes medios son <em>Semiestructuradas</em>: hay datos, pero se requiere criterio humano. Para esto se usan los <strong>Sistemas de Soporte a Decisiones (DSS)</strong>. Su poder no radica solo en la base de datos, sino en su <em>Base de Modelos Matemáticos</em>, que permite proyectar escenarios futuros.</p>''',
    'actividad_1': '''<p><strong>El Análisis de Sensibilidad ("What-If"):</strong> Usando una hoja de cálculo con un modelo financiero básico, los alumnos modifican la celda de "Tasa de Interés" para ver cómo cambia drásticamente la celda de "Rentabilidad Neta" al final de cinco años, comprendiendo el concepto de simulador.</p>''',
    'teoria_2': '''<p><strong>Decisiones Grupales (GDSS):</strong> Las decisiones importantes se toman en comités. Sin embargo, los grupos humanos sufren de problemas como el "Pensamiento de Grupo" (Groupthink) o el miedo a contradecir al jefe. Un <em>GDSS (Group Decision Support System)</em> permite a un directorio votar ideas anónimamente y rankear alternativas mediante pantallas interactivas, democratizando y optimizando las juntas.</p>''',
    'teoria_3': '''<p><strong>Minería de Datos (Data Mining):</strong> Para decisiones mercadológicas, un DSS avanzado utiliza Minería de Datos. En lugar de que el humano haga preguntas, el software utiliza algoritmos estadísticos para escanear millones de registros transaccionales (del Data Warehouse) en busca de asociaciones, secuencias o agrupamientos (clusters) que el ojo humano jamás detectaría.</p>''',
    'caso_practico': '''<p><strong>Asociación: Cervezas y Pañales:</strong> Análisis del clásico mito/caso de retail. Un algoritmo de minería de datos en un gran supermercado descubrió una correlación oculta: los viernes por la tarde, los hombres jóvenes compraban pañales y cervezas juntos. El sistema de decisión recomendó poner las cervezas de alto margen al lado de los pañales, incrementando las ventas. El DSS descubrió el "qué" pasaba, dejando al humano deducir el "por qué".</p>''',
    'taller_dfd': '''<p><strong>Taller: Búsqueda de Metas (Goal-Seeking):</strong> Es la inversa del What-If. A los equipos se les da el objetivo (Meta): "Necesito ganar $50,000 este año". Deben usar una herramienta DSS básica (ej. Buscar Objetivo en Excel) para calcular automáticamente cuántos productos deben vender exactamente o a qué precio para alcanzar la meta exacta.</p>''',
    'evaluacion_cierre': '''<p><strong>Evaluación Formativa:</strong> Explique por qué el TPS y el MIS miran hacia el "pasado" de la empresa, mientras que un DSS (usando modelos de simulación) mira hacia el "futuro".</p>''',
    'evaluacion_multiple_choice': '''<p><strong>Selección Múltiple (10 Puntos) - Tiempo sugerido: 10-15 minutos:</strong></p>
    <ol>
        <li class="mb-3"><strong>Tipos de Decisión:</strong> Decidir cuántos artículos de limpieza comprar esta semana en un supermercado según el nivel mínimo de stock es un ejemplo de:
            <ul class="list-unstyled ms-3">
                <li>A. Decisión estratégica.</li>
                <li><strong>B. Decisión estructurada o programable. (Correcta)</strong></li>
                <li>C. Decisión no estructurada.</li>
                <li>D. Reingeniería de procesos.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Tipos de Decisión II:</strong> Decidir si la empresa debe abrir operaciones en un nuevo continente en medio de una crisis económica global es una decisión:
            <ul class="list-unstyled ms-3">
                <li>A. Operativa estructurada.</li>
                <li>B. Resolvible mediante un simple TPS.</li>
                <li><strong>C. No estructurada, ya que carece de reglas matemáticas exactas y requiere alto juicio gerencial. (Correcta)</strong></li>
                <li>D. Totalmente delegable a una computadora.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Concepto de DSS:</strong> ¿Cuál es el objetivo principal de un Sistema de Apoyo a las Decisiones (DSS)?
            <ul class="list-unstyled ms-3">
                <li>A. Procesar transacciones diarias rápidamente.</li>
                <li><strong>B. Apoyar a los gerentes en la toma de decisiones semiestructuradas, proporcionando modelos analíticos. (Correcta)</strong></li>
                <li>C. Reemplazar totalmente al ser humano en la toma de decisiones.</li>
                <li>D. Generar un recibo de pago para el cliente.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Componentes del DSS:</strong> A diferencia de un MIS (que genera reportes fijos a partir de una Base de Datos), un DSS incorpora obligatoriamente un componente adicional clave, el cual es:
            <ul class="list-unstyled ms-3">
                <li><strong>A. La Base de Modelos (estadísticos, financieros, de simulación). (Correcta)</strong></li>
                <li>B. Un teclado iluminado.</li>
                <li>C. Un Sistema Operativo.</li>
                <li>D. Un cable de fibra óptica.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Análisis What-If:</strong> El análisis "Qué pasaría si..." (What-If) dentro de un DSS permite:
            <ul class="list-unstyled ms-3">
                <li>A. Encontrar fallos en el disco duro.</li>
                <li>B. Enviar correos electrónicos masivos a clientes.</li>
                <li><strong>C. Observar cómo un cambio en una variable (ej. costo de materia prima) afecta el resultado final (ej. ganancia). (Correcta)</strong></li>
                <li>D. Diseñar diagramas de flujo de datos (DFD).</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Análisis Goal-Seeking:</strong> Si un gerente pregunta al DSS: "¿A qué precio debo vender mi producto para asegurar una rentabilidad exacta de $10,000 a fin de mes?", está utilizando la función de:
            <ul class="list-unstyled ms-3">
                <li>A. Análisis de sensibilidad.</li>
                <li><strong>B. Búsqueda de metas (Goal-Seeking). (Correcta)</strong></li>
                <li>C. Minería de textos.</li>
                <li>D. Procesamiento de transacciones.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>GDSS (Decisiones Grupales):</strong> ¿Qué problema psicológico clásico de las juntas directivas intenta solucionar un GDSS permitiendo votos e ideas anónimas en red?
            <ul class="list-unstyled ms-3">
                <li>A. La falta de acceso a Internet.</li>
                <li><strong>B. La dominación de la reunión por individuos vocales y el miedo a contradecir a los superiores. (Correcta)</strong></li>
                <li>C. El cálculo incorrecto de los impuestos.</li>
                <li>D. La lentitud del ancho de banda.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Minería de Datos (Data Mining):</strong> La técnica informática orientada a descubrir patrones ocultos y relaciones insospechadas dentro de inmensos almacenes de datos históricos se denomina:
            <ul class="list-unstyled ms-3">
                <li>A. Extracción SQL.</li>
                <li>B. Reingeniería de Procesos.</li>
                <li><strong>C. Minería de Datos. (Correcta)</strong></li>
                <li>D. Modelo Entidad-Relación.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>Caso Cervezas y Pañales:</strong> El análisis clásico que asocia la venta conjunta de productos aparentemente inconexos, para luego cambiar su ubicación en las góndolas, es un ejemplo del uso comercial de:
            <ul class="list-unstyled ms-3">
                <li>A. Un Sistema Experto en Medicina.</li>
                <li><strong>B. Minería de datos mediante reglas de asociación. (Correcta)</strong></li>
                <li>C. Un Sistema de Procesamiento de Transacciones (TPS).</li>
                <li>D. Un software de correo electrónico corporativo.</li>
            </ul>
        </li>
        <li class="mb-3"><strong>El rol del humano vs la máquina:</strong> En el contexto de un DSS avanzado, la afirmación más correcta sobre la toma de decisiones gerenciales es:
            <ul class="list-unstyled ms-3">
                <li>A. El DSS toma la decisión final y el gerente simplemente obedece el resultado matemático.</li>
                <li>B. Los modelos matemáticos eliminan completamente la necesidad de experiencia gerencial en el mercado.</li>
                <li><strong>C. El DSS asiste brindando proyecciones o escenarios lógicos, pero la responsabilidad del juicio y la decisión final recae siempre en el humano. (Correcta)</strong></li>
                <li>D. Los gerentes modernos ya no necesitan DSS porque usan IA para todo.</li>
            </ul>
        </li>
    </ol>''',
    'bibliografia': 'Turban, E., Sharda, R., & Delen, D. (2014). <em>Business Intelligence and Analytics: Systems for Decision Support</em>. Pearson.'
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

# Replace class 5
pat5 = re.compile(r"\{\s*'id': 5, 'tipo': 'Virtual'.*?'bibliografia': 'Kurose.*?\}", re.DOTALL)
content = pat5.sub(dict_to_str(c5).replace('\\', '\\\\'), content, count=1)

# Replace class 6
pat6 = re.compile(r"\{\s*'id': 6, 'tipo': 'Presencial'.*?'bibliografia': 'Turban.*?\}", re.DOTALL)
# Wait, class 6 was 'Virtual' or 'Presencial'? Let's match carefully.
# In the original file, ID 6 is 'Virtual' ? No wait, let's use a safer regex matching the id.
pat6 = re.compile(r"\{\s*'id': 6, 'tipo': '.*?'bibliografia'.*?\}", re.DOTALL)

content = pat5.sub(dict_to_str(c5).replace('\\', '\\\\'), content, count=1)
content = pat6.sub(dict_to_str(c6).replace('\\', '\\\\'), content, count=1)

with open('generar_htmls.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Classes 5 and 6 updated successfully.")
