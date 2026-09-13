// marcar_leido.js – handles section read tracking
const seccionesLeidas = {};

function marcarLeido(sectionId) {
    const pageKey = location.pathname;
    if (!seccionesLeidas[pageKey]) seccionesLeidas[pageKey] = {};
    seccionesLeidas[pageKey][sectionId] = true;

    const btn = document.querySelector(`button[data-section="${sectionId}"]`);
    if (btn) {
        btn.classList.remove('btn-outline-success');
        btn.classList.add('btn-success');
        btn.disabled = true;
    }

    const allBtns = document.querySelectorAll('.btn-marcar-leido');
    const allRead = Array.from(allBtns).every(b => b.disabled);
    if (allRead) {
        const completarBtn = document.getElementById('btn-completar-leccion');
        if (completarBtn) completarBtn.disabled = false;
    }

    localStorage.setItem('leido_state', JSON.stringify(seccionesLeidas));
}

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('leido_state');
    if (saved) Object.assign(seccionesLeidas, JSON.parse(saved));
    const pageKey = location.pathname;
    if (seccionesLeidas[pageKey]) {
        for (const sec in seccionesLeidas[pageKey]) {
            const btn = document.querySelector(`button[data-section="${sec}"]`);
            if (btn) {
                btn.classList.remove('btn-outline-success');
                btn.classList.add('btn-success');
                btn.disabled = true;
            }
        }
        const allBtns = document.querySelectorAll('.btn-marcar-leido');
        const allRead = Array.from(allBtns).every(b => b.disabled);
        if (allRead) {
            const completarBtn = document.getElementById('btn-completar-leccion');
            if (completarBtn) completarBtn.disabled = false;
        }
    }
});
