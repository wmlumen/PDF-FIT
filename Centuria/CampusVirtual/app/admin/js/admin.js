/**
 * admin.js — Lógica del Panel Administrativo Centuria v2
 * Módulos: Usuarios (pendientes, perfil, multi-roles), Catálogos, Reportes, Config
 * Carga secciones HTML dinámicamente via fetch + Alpine.initTree()
 */

document.addEventListener('alpine:init', () => {
    Alpine.data('adminPanel', () => ({

        // ═══════════════════════════════════════
        // ESTADO GLOBAL
        // ═══════════════════════════════════════
        userRole: '',
        userName: '',
        activeTab: 'usuarios',
        loading: false,
        loadingText: 'Cargando...',
        sectionHtml: '',

        // ═══ USUARIOS ═══
        usuariosTab: 'pendientes',
        pendientes: [],
        usuarios: [],
        selectedUser: null,
        userSearch: '',
        userFilterRol: '',
        userFilterEstado: '',
        stats: { totalCedulas: 0, alumnos: 0, docentes: 0 },
        rolesConfig: [],
        permisosDisponibles: [
            { id: 'ver_cursos', label: 'Ver cursos' },
            { id: 'editar_cursos', label: 'Editar cursos' },
            { id: 'ver_notas', label: 'Ver notas' },
            { id: 'editar_notas', label: 'Editar notas' },
            { id: 'ver_asistencia', label: 'Ver asistencia' },
            { id: 'editar_asistencia', label: 'Editar asistencia' },
            { id: 'ver_calendario', label: 'Ver calendario' },
            { id: 'editar_calendario', label: 'Editar calendario' },
            { id: 'ver_documentos', label: 'Ver documentos' },
            { id: 'editar_documentos', label: 'Editar documentos' },
            { id: 'gestionar_usuarios', label: 'Gestionar usuarios' },
            { id: 'gestionar_roles', label: 'Gestionar roles' },
            { id: 'ver_reportes', label: 'Ver reportes' },
            { id: 'ver_config', label: 'Ver configuración' },
        ],
        formPendiente: { cedula: '', nombre: '', apellido: '', email: '', telefono: '', grado: '', carrera: '', seccion: '', rol: 'alumno' },
        formUsuario: { firstname: '', lastname: '', email: '', telefono: '', grado: '', carrera: '', seccion: '', estado: 'activo' },
        nuevoRol: { rol: 'alumno', carrera: '', seccion: '', asignatura: '' },
        formRol: { nombre: '', descripcion: '', permisos: [], color: '#64748b', icono: 'bi-person' },
        editRol: null,

        // ═══ VISTA PREVIA POR ROL ═══
        viewMode: false,
        viewRol: '',
        viewRolLabel: '',
        viewRolIcon: '',
        viewRolColor: '',
        viewRolUrl: '',
        vistasDisponibles: [
            { id: 'alumno',    label: 'Alumno',      icon: 'bi-mortarboard-fill', color: '#10b981', url: '../index.html',         desc: 'Portal principal, login, registro, cursos del estudiante' },
            { id: 'docente',   label: 'Docente',     icon: 'bi-person-badge-fill', color: '#3b82f6', url: '../sociologia/teacher_panel.html', desc: 'Panel docente: asistencia, notas, calificaciones, actas' },
            { id: 'academico', label: 'Acceso Academico', icon: 'bi-building', color: '#8b5cf6', url: '../academic/', desc: 'Vista academica: indicadores, examenes, criterios, glosario' },
        ],

        // ═══ CATÁLOGOS ═══
        catalogTabs: [
            { id: 'secciones',   label: 'Secciones',   icon: 'bi-collection-fill' },
            { id: 'carreras',    label: 'Carreras',    icon: 'bi-book-fill' },
            { id: 'grados',      label: 'Grados',      icon: 'bi-diagram-3-fill' },
            { id: 'programas',   label: 'Programas',   icon: 'bi-calendar-event-fill' },
            { id: 'modalidades', label: 'Modalidades',  icon: 'bi-layers-fill' }
        ],
        catalogTab: 'secciones',
        catalogData: { secciones: [], carreras: [], grados: [], programas: [], modalidades: [] },
        catalogSearch: '',
        editItem: null,
        form: { codigo: '', nombre: '', carrera: '', grado: '', capacidad: 40, tipo_prog: '' },

        // ═══ REPORTES ═══
        rolesPorTipo: [],
        carrerasTop: [],
        accesosRecientes: [],
        catalogStats: { totalSecciones: 0, totalCarreras: 0, totalGrados: 0, totalProgramas: 0, totalModalidades: 0 },

        // ═══════════════════════════════════════
        // INICIALIZACIÓN
        // ═══════════════════════════════════════
        async initPanel() {
            this.userRole = sessionStorage.getItem('rol');
            if (this.userRole !== 'admin' && this.userRole !== 'academico') {
                alert('Acceso denegado.');
                window.location.href = '../index.html';
                return;
            }
            this.userName = sessionStorage.getItem('current_nombre') || 'Usuario';
            await this.loadSection('usuarios');
        },

        cerrarSesion() {
            sessionStorage.clear();
            window.location.href = '../index.html';
        },

        // ═══════════════════════════════════════
        // CARGA DINÁMICA DE SECCIONES
        // ═══════════════════════════════════════
        async loadSection(tab) {
            const container = document.getElementById('section-container');
            if (!container) return;
            const urls = {
                usuarios:  'sections/usuarios.html',
                cursos:    'sections/catalogos.html',
                reportes:  'sections/reportes.html',
                config:    'sections/config.html',
                vistas:    'sections/vistas.html'
            };
            const url = urls[tab];
            if (!url) return;
            this.loading = true;
            this.loadingText = 'Cargando modulo...';
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                container.innerHTML = await resp.text();
                Alpine.initTree(container);
                if (tab === 'usuarios') await this.initUsuarios();
                if (tab === 'cursos') await this.loadCatalogData();
                if (tab === 'reportes') await this.loadReportData();
            } catch (err) {
                console.error('Error cargando seccion:', err);
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-slate-400">
                    <i class="bi bi-exclamation-triangle text-4xl text-amber-300 mb-3"></i>
                    <p class="text-sm font-bold">Error al cargar</p>
                    <p class="text-xs mt-1">${err.message}</p></div>`;
            } finally { this.loading = false; }
        },

        async switchTab(tab) {
            if (this.activeTab === tab) return;
            this.activeTab = tab;
            await this.loadSection(tab);
        },

        // ═══════════════════════════════════════
        // MÓDULO 1: USUARIOS
        // ═══════════════════════════════════════
        async initUsuarios() {
            await Promise.all([
                this.cargarPendientes(),
                this.cargarUsuarios(),
                this.cargarRolesConfig()
            ]);
        },

        // --- PENDIENTES ---
        async cargarPendientes() {
            try {
                const r = await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=pendientes', {
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() }
                });
                const data = await r.json();
                this.pendientes = (data.pendientes || []).map(p => ({ ...p, _rolAsignar: 'alumno' }));
            } catch (e) { console.error('Error cargando pendientes:', e); }
        },

        async registrarPendiente() {
            const f = this.formPendiente;
            if (!f.cedula || !f.nombre || !f.apellido) { alert('Cedula, nombre y apellido requeridos'); return; }
            this.loading = true;
            this.loadingText = 'Registrando...';
            try {
                const fd = new FormData();
                fd.append('cedula', f.cedula);
                fd.append('nombre', f.nombre.toUpperCase());
                fd.append('apellido', f.apellido.toUpperCase());
                fd.append('email', f.email);
                fd.append('telefono', f.telefono);
                fd.append('grado', f.grado);
                fd.append('carrera', f.carrera.toUpperCase());
                fd.append('seccion', f.seccion);
                fd.append('rol', f.rol);
                const r = await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=registrar_directo', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                const data = await r.json();
                if (data.status === 'Exito' || data.status === 'Éxito') {
                    this.formPendiente = { cedula: '', nombre: '', apellido: '', email: '', telefono: '', grado: '', carrera: '', seccion: '', rol: 'alumno' };
                    await this.cargarPendientes();
                    await this.cargarUsuarios();
                } else {
                    alert('Error: ' + (data.error || data.mensaje || 'No se pudo registrar'));
                }
            } catch (e) { console.error(e); alert('Error al registrar.'); }
            finally { this.loading = false; }
        },

        async aprobarPendiente(p) {
            this.loading = true;
            this.loadingText = 'Aprobando usuario...';
            try {
                const fd = new FormData();
                fd.append('id', p.id);
                fd.append('rol', p._rolAsignar || 'alumno');
                const r = await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=aprobar', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                const data = await r.json();
                if (data.status === 'Exito' || data.status === 'Éxito') {
                    alert('Aprobado. Pass: ' + (data.password_generado || 'ver consola'));
                    await Promise.all([this.cargarPendientes(), this.cargarUsuarios()]);
                } else {
                    alert('Error: ' + (data.error || data.mensaje));
                }
            } catch (e) { console.error(e); alert('Error al aprobar.'); }
            finally { this.loading = false; }
        },

        async rechazarPendiente(p) {
            if (!confirm('¿Rechazar registro de ' + p.nombre + '?')) return;
            this.loading = true;
            try {
                const fd = new FormData();
                fd.append('id', p.id);
                await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=rechazar', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                await this.cargarPendientes();
            } catch (e) { console.error(e); }
            finally { this.loading = false; }
        },

        // --- USUARIOS ---
        async cargarUsuarios() {
            try {
                const r = await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=list', {
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() }
                });
                const data = await r.json();
                this.usuarios = data.usuarios || [];
                // Recalcular stats para reportes
                const unicas = new Set(this.usuarios.map(u => u.cedula));
                const rolesFlat = [];
                this.usuarios.forEach(u => (u.roles || []).forEach(r => rolesFlat.push(r)));
                this.stats = {
                    totalCedulas: unicas.size,
                    alumnos: rolesFlat.filter(r => r.rol === 'alumno').length,
                    docentes: rolesFlat.filter(r => r.rol === 'docente').length
                };
            } catch (e) { console.error('Error cargando usuarios:', e); }
        },

        get filteredUsuarios() {
            let result = this.usuarios;
            if (this.userSearch.trim()) {
                const q = this.userSearch.toLowerCase();
                result = result.filter(u =>
                    (u.cedula || '').includes(q) ||
                    (u.nombre_completo || '').toLowerCase().includes(q)
                );
            }
            if (this.userFilterRol) {
                result = result.filter(u => (u.roles || []).some(r => r.rol === this.userFilterRol));
            }
            if (this.userFilterEstado) {
                result = result.filter(u => u.estado === this.userFilterEstado);
            }
            return result;
        },

        seleccionarUsuario(u) {
            this.selectedUser = u;
            this.formUsuario = {
                firstname: u.firstname || '',
                lastname: u.lastname || '',
                email: u.email || '',
                telefono: u.telefono || '',
                grado: u.grado || '',
                carrera: u.carrera || '',
                seccion: u.seccion || '',
                estado: u.estado || 'activo'
            };
        },

        async guardarUsuario() {
            if (!this.selectedUser) return;
            this.loading = true;
            this.loadingText = 'Guardando...';
            try {
                const fd = new FormData();
                fd.append('id', this.selectedUser.id);
                fd.append('firstname', this.formUsuario.firstname.toUpperCase());
                fd.append('lastname', this.formUsuario.lastname.toUpperCase());
                fd.append('email', this.formUsuario.email);
                fd.append('telefono', this.formUsuario.telefono);
                fd.append('grado', this.formUsuario.grado);
                fd.append('carrera', this.formUsuario.carrera.toUpperCase());
                fd.append('seccion', this.formUsuario.seccion);
                fd.append('estado', this.formUsuario.estado);
                const r = await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=update', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                const data = await r.json();
                if (data.status === 'Exito' || data.status === 'Éxito') {
                    await this.cargarUsuarios();
                    // Re-seleccionar usuario actualizado
                    const updated = this.usuarios.find(u => u.id === this.selectedUser.id);
                    if (updated) this.seleccionarUsuario(updated);
                } else {
                    alert('Error: ' + (data.error || data.mensaje));
                }
            } catch (e) { console.error(e); alert('Error al guardar.'); }
            finally { this.loading = false; }
        },

        // --- MULTI-ROLES ---
        async agregarRol() {
            if (!this.selectedUser) return;
            this.loading = true;
            this.loadingText = 'Asignando rol...';
            try {
                const fd = new FormData();
                fd.append('user_id', this.selectedUser.id);
                fd.append('rol', this.nuevoRol.rol);
                fd.append('carrera', this.nuevoRol.carrera.toUpperCase());
                fd.append('seccion', this.nuevoRol.seccion);
                fd.append('asignatura', this.nuevoRol.asignatura);
                const r = await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=add_role', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                const data = await r.json();
                if (data.status === 'Exito' || data.status === 'Éxito') {
                    this.nuevoRol = { rol: 'alumno', carrera: '', seccion: '', asignatura: '' };
                    await this.cargarUsuarios();
                    const updated = this.usuarios.find(u => u.id === this.selectedUser.id);
                    if (updated) this.seleccionarUsuario(updated);
                } else {
                    alert('Error: ' + (data.error || data.mensaje));
                }
            } catch (e) { console.error(e); alert('Error al asignar rol.'); }
            finally { this.loading = false; }
        },

        async quitarRol(r) {
            if (!confirm('¿Quitar rol ' + r.rol.toUpperCase() + '?')) return;
            this.loading = true;
            try {
                const fd = new FormData();
                fd.append('role_id', r.id);
                await fetch(CenturiaAPI.baseUrl + 'usuarios.php?action=remove_role', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                await this.cargarUsuarios();
                const updated = this.usuarios.find(u => u.id === this.selectedUser?.id);
                if (updated) this.seleccionarUsuario(updated);
            } catch (e) { console.error(e); }
            finally { this.loading = false; }
        },

        // --- ROLES CONFIG ---
        async cargarRolesConfig() {
            try {
                const r = await fetch(CenturiaAPI.baseUrl + 'roles.php?action=list', {
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() }
                });
                const data = await r.json();
                this.rolesConfig = data.roles || [];
            } catch (e) { console.error('Error cargando roles config:', e); }
        },

        async guardarRol() {
            const isEdit = !!this.editRol;
            this.loading = true;
            this.loadingText = isEdit ? 'Actualizando rol...' : 'Creando rol...';
            try {
                const fd = new FormData();
                fd.append('nombre', this.formRol.nombre);
                fd.append('descripcion', this.formRol.descripcion);
                fd.append('permisos', JSON.stringify(this.formRol.permisos));
                fd.append('color', this.formRol.color);
                fd.append('icono', this.formRol.icono);
                const action = isEdit ? 'update' : 'create';
                if (isEdit) fd.append('id', this.editRol.id);
                const r = await fetch(CenturiaAPI.baseUrl + 'roles.php?action=' + action, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                const data = await r.json();
                if (data.status === 'Exito' || data.status === 'Éxito') {
                    this.cancelarEditRol();
                    await this.cargarRolesConfig();
                } else {
                    alert('Error: ' + (data.error || data.mensaje));
                }
            } catch (e) { console.error(e); alert('Error al guardar rol.'); }
            finally { this.loading = false; }
        },

        editarRol(r) {
            this.editRol = r;
            this.formRol = {
                nombre: r.nombre,
                descripcion: r.descripcion || '',
                permisos: [...(r.permisos || [])],
                color: r.color || '#64748b',
                icono: r.icono || 'bi-person'
            };
        },

        cancelarEditRol() {
            this.editRol = null;
            this.formRol = { nombre: '', descripcion: '', permisos: [], color: '#64748b', icono: 'bi-person' };
        },

        async eliminarRol(r) {
            if (!confirm('¿Desactivar el rol "' + r.nombre + '"?')) return;
            this.loading = true;
            try {
                const fd = new FormData();
                fd.append('id', r.id);
                await fetch(CenturiaAPI.baseUrl + 'roles.php?action=delete', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + CenturiaAPI.getToken() },
                    body: fd
                });
                await this.cargarRolesConfig();
            } catch (e) { console.error(e); }
            finally { this.loading = false; }
        },

        // ═══════════════════════════════════════
        // MÓDULO: VISTA PREVIA POR ROL
        // ═══════════════════════════════════════
        abrirVistaPrevia(v) {
            this.viewMode = true;
            this.viewRol = v.id;
            this.viewRolLabel = v.label;
            this.viewRolIcon = v.icon;
            this.viewRolColor = v.color;
            // Construir URL con token de admin para que la pagina objetivo sepa que es una vista previa
            const token = CenturiaAPI.getToken();
            const user = CenturiaAPI.getCurrentUser() || {};
            const sep = v.url.includes('?') ? '&' : '?';
            this.viewRolUrl = v.url + sep + 'view_as=admin&admin_token=' + encodeURIComponent(token) + '&admin_user=' + encodeURIComponent(user.firstname || this.userName);
            this.activeTab = 'vistas';
            this.loadSection('vistas');
        },

        cerrarVistaPrevia() {
            this.viewMode = false;
            this.viewRol = '';
            this.viewRolUrl = '';
        },

        abrirEnNuevaTab(v) {
            const token = CenturiaAPI.getToken();
            const user = CenturiaAPI.getCurrentUser() || {};
            const sep = v.url.includes('?') ? '&' : '?';
            const url = v.url + sep + 'view_as=admin&admin_token=' + encodeURIComponent(token) + '&admin_user=' + encodeURIComponent(user.firstname || this.userName);
            window.open(url, '_blank');
        },

        // ═══════════════════════════════════════
        // MÓDULO 2: CATÁLOGOS CRUD
        // ═══════════════════════════════════════
        get catalogItems() {
            let items = this.catalogData[this.catalogTab] || [];
            if (this.catalogSearch.trim()) {
                const q = this.catalogSearch.toLowerCase();
                items = items.filter(i =>
                    (i.nombre && i.nombre.toLowerCase().includes(q)) ||
                    (i.codigo && i.codigo.toLowerCase().includes(q))
                );
            }
            return items;
        },

        async loadCatalogData() {
            this.loading = true;
            this.loadingText = 'Cargando catalogos...';
            try {
                const r = await fetch(CenturiaAPI.baseUrl + 'catalogos.php?action=list');
                const data = await r.json();
                this.catalogData = {
                    secciones:   data.secciones   || [],
                    carreras:    data.carreras    || [],
                    grados:      data.grados      || [],
                    programas:   data.programas   || [],
                    modalidades: data.modalidades || []
                };
                this.catalogStats.totalSecciones   = this.catalogData.secciones.length;
                this.catalogStats.totalCarreras    = this.catalogData.carreras.length;
                this.catalogStats.totalGrados      = this.catalogData.grados.length;
                this.catalogStats.totalProgramas   = this.catalogData.programas.length;
                this.catalogStats.totalModalidades = this.catalogData.modalidades.length;
            } catch (e) { console.error('Error cargando catalogos:', e); }
            finally { this.loading = false; }
        },

        switchCatalogTab(tab) {
            this.catalogTab = tab;
            this.editItem = null;
            this.catalogSearch = '';
            this.form = { codigo: '', nombre: '', carrera: '', grado: '', capacidad: 40, tipo_prog: '' };
        },

        editarItem(item) {
            this.editItem = { ...item, _tipo: this.catalogTab };
            this.form = {
                codigo: item.codigo || '', nombre: item.nombre || '',
                carrera: item.carrera || '', grado: item.grado || '',
                capacidad: item.capacidad || 40, tipo_prog: item.tipo || ''
            };
        },

        cancelarEdicion() {
            this.editItem = null;
            this.form = { codigo: '', nombre: '', carrera: '', grado: '', capacidad: 40, tipo_prog: '' };
        },

        async guardarCatalogo(tipo) {
            const isEdit = this.editItem && this.editItem._tipo === tipo;
            this.loading = true;
            this.loadingText = isEdit ? 'Actualizando...' : 'Creando...';
            const fd = new FormData();
            fd.append('tipo', tipo);
            if (tipo === 'secciones') {
                fd.append('codigo', this.form.codigo.toUpperCase());
                fd.append('nombre', this.form.nombre);
                fd.append('carrera', this.form.carrera);
                fd.append('grado', this.form.grado);
                fd.append('capacidad', this.form.capacidad || 40);
                if (!this.form.codigo) { alert('Codigo requerido'); this.loading = false; return; }
            } else if (tipo === 'carreras') {
                fd.append('nombre', this.form.nombre);
                fd.append('codigo', this.form.codigo.toUpperCase());
                fd.append('grado', this.form.grado);
                if (!this.form.nombre) { alert('Nombre requerido'); this.loading = false; return; }
            } else if (tipo === 'grados') {
                fd.append('nombre', this.form.nombre);
                if (!this.form.nombre) { alert('Nombre requerido'); this.loading = false; return; }
            } else if (tipo === 'programas') {
                fd.append('nombre', this.form.nombre);
                fd.append('tipo_prog', this.form.tipo_prog);
                if (!this.form.nombre) { alert('Nombre requerido'); this.loading = false; return; }
            } else if (tipo === 'modalidades') {
                fd.append('nombre', this.form.nombre);
                if (!this.form.nombre) { alert('Nombre requerido'); this.loading = false; return; }
            }
            const action = isEdit ? 'update' : 'create';
            if (isEdit) fd.append('id', this.editItem.id);
            try {
                const token = CenturiaAPI.getToken();
                const r = await fetch(CenturiaAPI.baseUrl + 'catalogos.php?action=' + action, {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd
                });
                const data = await r.json();
                if (data.status === 'Éxito') {
                    this.cancelarEdicion();
                    await this.loadCatalogData();
                } else { alert('Error: ' + (data.error || data.mensaje)); }
            } catch (e) { console.error(e); alert('Error al guardar.'); }
            finally { this.loading = false; }
        },

        async eliminarCatalogo(item) {
            const tipo = this.catalogTab;
            if (!confirm('¿Eliminar "' + item.nombre + '" de ' + tipo + '?')) return;
            this.loading = true;
            try {
                const fd = new FormData();
                fd.append('tipo', tipo);
                fd.append('id', item.id);
                const token = CenturiaAPI.getToken();
                const r = await fetch(CenturiaAPI.baseUrl + 'catalogos.php?action=delete', {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd
                });
                const data = await r.json();
                if (data.status === 'Éxito') {
                    if (this.editItem && this.editItem.id === item.id) this.cancelarEdicion();
                    await this.loadCatalogData();
                } else { alert('Error: ' + (data.error || data.mensaje)); }
            } catch (e) { console.error(e); alert('Error al eliminar.'); }
            finally { this.loading = false; }
        },

        // ═══════════════════════════════════════
        // MÓDULO 3: REPORTES
        // ═══════════════════════════════════════
        async loadReportData() {
            this.calcularRolesPorTipo();
            this.calcularCarrerasTop();
            this.calcularAccesosRecientes();
        },

        calcularRolesPorTipo() {
            const conteo = {};
            this.usuarios.forEach(u => (u.roles || []).forEach(r => {
                conteo[r.rol] = (conteo[r.rol] || 0) + 1;
            }));
            const total = Object.values(conteo).reduce((a, b) => a + b, 0) || 1;
            const colores = { alumno: '#10b981', docente: '#3b82f6', academico: '#8b5cf6', admin: '#f43f5e' };
            this.rolesPorTipo = Object.entries(conteo).map(([tipo, cantidad]) => ({
                tipo, cantidad, porcentaje: Math.round((cantidad / total) * 100),
                color: colores[tipo] || '#94a3b8'
            })).sort((a, b) => b.cantidad - a.cantidad);
        },

        calcularCarrerasTop() {
            const conteo = {};
            this.usuarios.forEach(u => {
                const c = u.carrera || 'Sin carrera';
                conteo[c] = (conteo[c] || 0) + 1;
            });
            const colores = ['#00B140', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
            this.carrerasTop = Object.entries(conteo).map(([nombre, cantidad], i) => ({
                nombre, cantidad, color: colores[i % colores.length]
            })).sort((a, b) => b.cantidad - a.cantidad);
        },

        calcularAccesosRecientes() {
            this.accesosRecientes = this.usuarios.slice(0, 5).map(u => ({
                username: u.cedula,
                firstname: u.firstname || '',
                lastname: u.lastname || ''
            }));
        },

        // ═══════════════════════════════════════
        // MÓDULO 4: CONFIGURACIÓN
        // ═══════════════════════════════════════
    }));
});
