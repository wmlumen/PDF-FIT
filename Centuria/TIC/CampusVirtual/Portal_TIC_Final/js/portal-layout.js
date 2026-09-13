'use strict';

(() => {
    const layout = document.querySelector('.portal-layout');
    const menu = document.getElementById('portal-menu');
    const toggle = document.querySelector('.portal-menu-toggle');
    if (!layout || !menu || !toggle) return;

    const storageKey = 'centuria-menu-visible';
    const visitedKey = 'centuria-menu-visited';

    // Primera visita: mostrar menú. Navegantes: oculto por defecto.
    let visited = false;
    try { visited = localStorage.getItem(visitedKey) === 'true'; } catch {}

    let visible = !visited; // Primera vez = abierto, después = cerrado
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) visible = saved === 'true';
    } catch {}

    // En móvil siempre oculto
    if (window.matchMedia('(max-width: 767px)').matches) visible = false;

    function render() {
        menu.hidden = !visible;
        layout.classList.toggle('menu-hidden', !visible);
        toggle.setAttribute('aria-expanded', String(visible));
        toggle.textContent = visible ? '‹' : '›';
        toggle.title = visible ? 'Ocultar menú' : 'Mostrar menú';
    }

    toggle.addEventListener('click', () => {
        visible = !visible;
        render();
        try {
            localStorage.setItem(storageKey, String(visible));
            localStorage.setItem(visitedKey, 'true');
        } catch {}
    });

    // Cerrar menú automáticamente al hacer clic en un enlace del menú
    menu.addEventListener('click', (e) => {
        if (e.target.closest('a') && visible) {
            visible = false;
            render();
            try {
                localStorage.setItem(storageKey, 'false');
                localStorage.setItem(visitedKey, 'true');
            } catch {}
        }
    });

    menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && visible) {
            toggle.click();
            toggle.focus();
        }
    });

    render();
})();
