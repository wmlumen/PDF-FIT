/**
 * view-as-admin.js — Botón flotante "Volver al Admin"
 * Incluir en cualquier página: <script src="js/view-as-admin.js"></script>
 * Solo se muestra cuando la página se accede con ?view_as=admin
 */
(function(){
    var params = new URLSearchParams(window.location.search);
    if (params.get('view_as') === 'admin') {
        var a = document.createElement('a');
        a.href = 'admin/index.html';
        a.textContent = 'Volver al Admin';
        a.innerHTML = '<i class="bi bi-arrow-left-circle"></i> Volver al Admin';
        a.style.cssText = 'position:fixed;top:12px;right:12px;z-index:99999;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:10px 18px;border-radius:12px;font-family:Montserrat,sans-serif;font-size:12px;font-weight:700;text-decoration:none;display:flex;align-items:center;gap:8px;box-shadow:0 4px 15px rgba(245,158,11,0.4);transition:all .2s;';
        a.onmouseover = function(){ this.style.transform='translateY(-2px)'; };
        a.onmouseout = function(){ this.style.transform=''; };
        document.body.appendChild(a);
    }
})();
