// ============================================
// SISTEMA DE QUIZ - Selección Múltiple
// 2 intentos, muestra ambos puntajes
// ============================================

class QuizSistema {
    constructor(claseId, preguntas) {
        this.claseId = claseId;
        this.preguntas = preguntas;
        this.indiceActual = 0;
        this.respuestasUsuario = [];
        this.intentos = [];
        this.intentosMaximos = 2;
        this.intentosRealizados = 0;
        this.keyStorage = `quiz_clase_${claseId}`;
        
        this.cargarEstado();
    }

    cargarEstado() {
        const guardado = localStorage.getItem(this.keyStorage);
        if (guardado) {
            const datos = JSON.parse(guardado);
            this.intentos = datos.intentos || [];
            this.intentosRealizados = this.intentos.length;
        }
    }

    guardarEstado() {
        localStorage.setItem(this.keyStorage, JSON.stringify({
            intentos: this.intentos
        }));
    }

    iniciarQuiz() {
        if (this.intentosRealizados >= this.intentosMaximos) {
            this.mostrarResultadosFinales();
            return;
        }
        
        this.indiceActual = 0;
        this.respuestasUsuario = [];
        this.mostrarPregunta();
    }

    mostrarPregunta() {
        const contenedor = document.getElementById(`quiz-content-${this.claseId}`);
        if (!contenedor) return;

        const pregunta = this.preguntas[this.indiceActual];
        const total = this.preguntas.length;
        const actual = this.indiceActual + 1;
        const intentoNum = this.intentosRealizados + 1;

        contenedor.innerHTML = `
            <div class="quiz-header">
                <span class="badge bg-secondary">Intento ${intentoNum} de ${this.intentosMaximos}</span>
                <span class="badge bg-primary">Pregunta ${actual} de ${total}</span>
            </div>
            <div class="quiz-pregunta">
                <h4>${pregunta.pregunta}</h4>
            </div>
            <div class="quiz-opciones">
                ${pregunta.opciones.map((op, i) => `
                    <button class="btn btn-outline-primary btn-block quiz-opcion" data-index="${i}" onclick="quizActual.seleccionarRespuesta(${i})">
                        <span class="opcion-letra">${String.fromCharCode(65 + i)}</span> ${op}
                    </button>
                `).join('')}
            </div>
            <div id="quiz-feedback-${this.claseId}" class="quiz-feedback" style="display:none;"></div>
            <div id="quiz-acciones-${this.claseId}" class="quiz-acciones" style="display:none;">
                <button class="btn btn-success" onclick="quizActual.siguientePregunta()">
                    ${actual < total ? 'Siguiente Pregunta' : 'Ver Resultados'} <i class="bi bi-arrow-right"></i>
                </button>
            </div>
        `;
    }

    seleccionarRespuesta(indice) {
        this.respuestasUsuario.push(indice);
        
        const pregunta = this.preguntas[this.indiceActual];
        const correcta = indice === pregunta.correcta;
        const feedback = document.getElementById(`quiz-feedback-${this.claseId}`);
        const acciones = document.getElementById(`quiz-acciones-${this.claseId}`);
        
        // Deshabilitar todas las opciones
        document.querySelectorAll('.quiz-opcion').forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('btn-outline-primary');
        });

        // Marcar correcta e incorrecta
        const opciones = document.querySelectorAll('.quiz-opcion');
        opciones[pregunta.correcta].classList.add('btn-success');
        opciones[pregunta.correcta].classList.remove('btn-outline-primary');
        
        if (!correcta) {
            opciones[indice].classList.add('btn-danger');
            opciones[indice].classList.remove('btn-outline-primary');
        }

        feedback.style.display = 'block';
        feedback.innerHTML = `
            <div class="alert ${correcta ? 'alert-success' : 'alert-danger'}">
                <i class="bi ${correcta ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
                ${correcta ? '¡Correcto!' : 'Incorrecto'}
                <br><small>${pregunta.explicacion}</small>
            </div>
        `;
        
        acciones.style.display = 'block';
    }

    siguientePregunta() {
        this.indiceActual++;
        
        if (this.indiceActual >= this.preguntas.length) {
            this.finalizarIntento();
        } else {
            this.mostrarPregunta();
        }
    }

    finalizarIntento() {
        const correctas = this.respuestasUsuario.filter((r, i) => r === this.preguntas[i].correcta).length;
        const total = this.preguntas.length;
        const porcentaje = Math.round((correctas / total) * 100);

        this.intentos.push({
            fecha: new Date().toLocaleString('es-ES'),
            correctas: correctas,
            total: total,
            porcentaje: porcentaje
        });
        
        this.intentosRealizados = this.intentos.length;
        this.guardarEstado();
        this.mostrarResultadoIntento(correctas, total, porcentaje);
    }

    mostrarResultadoIntento(correctas, total, porcentaje) {
        const contenedor = document.getElementById(`quiz-content-${this.claseId}`);
        if (!contenedor) return;

        let colorBadge = porcentaje >= 70 ? 'success' : porcentaje >= 50 ? 'warning' : 'danger';
        let mensaje = porcentaje >= 70 ? '¡Excelente!' : porcentaje >= 50 ? 'Buen intento' : 'Necesitas repasar más';

        contenedor.innerHTML = `
            <div class="quiz-resultado text-center">
                <i class="bi bi-award-fill text-${colorBadge}" style="font-size: 4rem;"></i>
                <h3 class="mt-3">${mensaje}</h3>
                <div class="puntaje-display my-4">
                    <span class="display-4 fw-bold text-${colorBadge}">${correctas}/${total}</span>
                    <br>
                    <span class="badge bg-${colorBadge} fs-5">${porcentaje}%</span>
                </div>
                ${this.intentosRealizados < this.intentosMaximos ? `
                    <p class="text-muted">Te quedan ${this.intentosMaximos - this.intentosRealizados} intento(s)</p>
                    <button class="btn btn-primary btn-lg" onclick="quizActual.iniciarQuiz()">
                        <i class="bi bi-arrow-repeat"></i> Intentar de Nuevo
                    </button>
                ` : `
                    <p class="text-muted">Has completado todos los intentos</p>
                `}
                ${this.intentos.length > 1 ? `
                    <div class="historial-intentos mt-4">
                        <h5>Historial de Intentos</h5>
                        <table class="table table-sm table-bordered mx-auto" style="max-width: 400px;">
                            <thead class="table-dark">
                                <tr><th>Intento</th><th>Fecha</th><th>Puntaje</th><th>%</th></tr>
                            </thead>
                            <tbody>
                                ${this.intentos.map((intento, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${intento.fecha}</td>
                                        <td>${intento.correctas}/${intento.total}</td>
                                        <td><span class="badge bg-${intento.porcentaje >= 70 ? 'success' : intento.porcentaje >= 50 ? 'warning' : 'danger'}">${intento.porcentaje}%</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    }

    mostrarResultadosFinales() {
        const contenedor = document.getElementById(`quiz-content-${this.claseId}`);
        if (!contenedor) return;

        contenedor.innerHTML = `
            <div class="quiz-resultado text-center">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                <h3 class="mt-3">Ya completaste todos los intentos</h3>
                <div class="historial-intentos mt-4">
                    <table class="table table-sm table-bordered mx-auto" style="max-width: 400px;">
                        <thead class="table-dark">
                            <tr><th>Intento</th><th>Fecha</th><th>Puntaje</th><th>%</th></tr>
                        </thead>
                        <tbody>
                            ${this.intentos.map((intento, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${intento.fecha}</td>
                                    <td>${intento.correctas}/${intento.total}</td>
                                    <td><span class="badge bg-${intento.porcentaje >= 70 ? 'success' : intento.porcentaje >= 50 ? 'warning' : 'danger'}">${intento.porcentaje}%</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <button class="btn btn-outline-secondary mt-3" onclick="quizActual.reiniciarCompletamente()">
                    <i class="bi bi-arrow-counterclockwise"></i> Reiniciar (borrar historial)
                </button>
            </div>
        `;
    }

    reiniciarCompletamente() {
        localStorage.removeItem(this.keyStorage);
        this.intentos = [];
        this.intentosRealizados = 0;
        this.iniciarQuiz();
    }
}

// Variable global para el quiz actual
let quizActual = null;

// Estilos CSS para el quiz
const quizStyles = document.createElement('style');
quizStyles.textContent = `
    .quiz-header { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .quiz-pregunta { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3498db; }
    .quiz-pregunta h4 { margin: 0; color: #2c3e50; font-size: 1.15rem; line-height: 1.6; }
    .quiz-opciones { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .quiz-opcion { text-align: left; padding: 12px 15px; border-radius: 8px; transition: all 0.2s; }
    .quiz-opcion:hover:not(:disabled) { transform: translateX(5px); }
    .opcion-letra { display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background: #3498db; color: white; border-radius: 50%; margin-right: 10px; font-weight: bold; }
    .quiz-feedback .alert { border-radius: 8px; padding: 15px; }
    .quiz-acciones { text-align: center; }
    .quiz-resultado { padding: 30px; }
    .puntaje-display { padding: 20px; background: #f8f9fa; border-radius: 10px; }
`;
document.head.appendChild(quizStyles);
