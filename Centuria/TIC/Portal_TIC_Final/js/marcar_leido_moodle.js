// marcar_leido_moodle.js - Enviar "Marcar como leído" a Moodle local
// Incluir este script en cada Unidad_0N.html después de marcarLeido()
// Requiere que Moodle esté corriendo en http://localhost:8080 y el usuario haya iniciado sesión en Moodle

function enviarMarcadoAMoodle(unit, section) {
    // CURRENT_USER_ID debe obtenerse de Moodle - si no hay sesión, falla silenciosamente
    // Intenta obtener userid desde la API de Moodle o desde variable global
    const userid = window.MOODLE_USER_ID || 0; // Reemplazar con valor real desde Moodle
    if (!userid) {
        console.warn('Moodle userid no disponible, guardando solo localStorage');
        return;
    }
    fetch('http://localhost:8080/local/marcado/mark.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userid: userid,
            unit: unit,      // ej: "Unidad_02"
            section: section, // ej: "sec_03"
            read: true
        })
    }).then(r => r.json()).then(data => {
        console.log('Marcado guardado en Moodle:', data);
    }).catch(err => {
        console.warn('No se pudo guardar en Moodle (¿Moodle no está corriendo?):', err);
    });
}

// Ejemplo de integración: sobrescribir marcarLeido existente
// const _origMarcarLeido = window.marcarLeido;
// window.marcarLeido = function(sectionId) {
//     _origMarcarLeido(sectionId);
//     const unit = location.pathname.split('/').pop().replace('.html',''); // Unidad_02
//     enviarMarcadoAMoodle(unit, sectionId);
//     // también guardar localStorage como respaldo
//     localStorage.setItem('marcado_'+unit+'_'+sectionId, 'true');
// };
