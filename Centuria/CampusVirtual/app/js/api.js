// api.js - Centuria Portal API Client
// Wrapper fetch() para todos los endpoints del backend PHP/SQLite + Google Sheets (dual storage)
// Usado por: index.html, admin_roles.html, admin/index.html, admin/upload_alumnos.html,
//            sociologia/teacher_panel.html, Materiales_Clases/, academic/

const ROLE_ES = {student:'alumno',teacher:'docente',admin:'admin',academic:'academico',inactive:'inactivo'};
const ROLE_EN = {alumno:'student',docente:'teacher',admin:'admin',academico:'academic',inactivo:'inactive',student:'student',teacher:'teacher',academic:'academic',inactive:'inactive'};

// Google Apps Script URL (base de datos Sheets como backup/sync)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyhfPTAVGGFsry6ueNVGQGZD0dGVbPu8zwJWnQkg6iOBcHx0FVUiAk5y8RJ1ggkIvTC2g/exec';

// Helper: verificar alumno en Google Sheets (GET) con timeout de 2s
function gasCheckStudent(cedula) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    return fetch(GAS_URL + '?action=verificar_alumno&cedula=' + encodeURIComponent(cedula), { signal: controller.signal })
        .then(r => { clearTimeout(timeout); return r.json(); })
        .catch(() => { clearTimeout(timeout); return { existe: false }; });
}

// Helper: registrar alumno en Google Sheets (POST)
function gasRegisterStudent(cedula, nombre, email, carrera, seccion) {
    const payload = {
        action: 'registrar_alumno',
        cedula: cedula,
        nombre: nombre,
        email: email || '',
        carrera: carrera || '',
        seccion: seccion || ''
    };
    return fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }).then(r => r.json()).catch(() => ({ ok: false }));
}

// Normaliza un usuario del API al formato que esperan las pantallas (nombre/apellido/rol en español)
function mapUser(u) {
    u = u || {};
    const role = u.role || u.rol || 'student';
    return {
        id: u.id,
        username: u.username,
        nombre: u.firstname || u.nombre || '',
        apellido: u.lastname || u.apellido || '',
        rol: ROLE_ES[role] || 'alumno',
        firstname: u.firstname,
        lastname: u.lastname,
        role: role,
        email: u.email
    };
}

const API = {
    // Base URL según origen: si la página sale del servidor PHP (8080) usa
    // ruta relativa; si sale de otro servidor (ej. Live Server 5500), apunta
    // directo a la API PHP (config.php ya envía CORS abierto).
    baseUrl: (typeof window !== 'undefined' && window.location && window.location.port === '8080')
        ? '/api/'
        : 'http://127.0.0.1:8080/api/',

    // --- Authentication ---

    // Login con cédula + contraseña institucional. Solo PHP API (rápido).
    // Formato pass: PrimeraLetraNombre(Mayús) + primeraLetraApellido(minús) + cédula(sin puntos) + *
    login(cedula, password) {
        return fetch(`${this.baseUrl}auth.php?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(cedula)}&password=${encodeURIComponent(password)}`
        })
        .then(async response => {
            let data = {};
            try { data = await response.json(); } catch (e) { data = {}; }

            if (response.ok && data.success !== false) {
                const p = (data.token !== undefined || data.user !== undefined) ? data : (data.data || {});
                const user = mapUser(p.user || {});
                if (p.token) {
                    localStorage.setItem('centuria_auth_token', p.token);
                    localStorage.setItem('centuria_user', JSON.stringify(user));
                }
                // Sync silenciosa con Google Sheets (fire-and-forget, no bloquea)
                gasCheckStudent(cedula).then(gas => {
                    if (!gas.existe) {
                        gasRegisterStudent(cedula, (user.firstname || '') + ' ' + (user.lastname || ''), user.email || '');
                    }
                }).catch(() => {});
                return { ok: true, user: user, token: p.token };
            }

            return { ok: false, message: (data && (data.error || data.message)) || 'Cédula o contraseña incorrecta.' };
        })
        .catch(err => {
            console.error('Login fetch error:', err);
            return { ok: false, message: 'Error de conexión con el servidor.' };
        });
    },

    // Register nuevo usuario. Dual storage: PHP API + Google Sheets. Nunca lanza: {ok,user,token,message}
    register(username, password, firstname, lastname, email, courseId = null, role = 'student') {
        return fetch(`${this.baseUrl}auth.php?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&firstname=${encodeURIComponent(firstname)}&lastname=${encodeURIComponent(lastname)}&email=${encodeURIComponent(email || '')}&course_id=${courseId || ''}&role=${encodeURIComponent(role || 'student')}`
        })
        .then(async response => {
            let data = {};
            try { data = await response.json(); } catch (e) { data = {}; }
            if (!response.ok || data.success === false) {
                let msg = (data && (data.error || data.message)) || 'No se pudo registrar.';
                if (/already exists/i.test(msg)) msg = 'Esta cédula ya está registrada.';
                return { ok: false, message: msg };
            }
            const p = (data.token !== undefined || data.user !== undefined) ? data : (data.data || {});
            const user = mapUser(p.user || {});
            if (p.token) {
                localStorage.setItem('centuria_auth_token', p.token);
                localStorage.setItem('centuria_user', JSON.stringify(user));
            }
            // Sync: registrar también en Google Sheets
            const fullName = ((firstname || '') + ' ' + (lastname || '')).trim();
            gasRegisterStudent(username, fullName, email || '').catch(() => {});
            return { ok: true, user: user, token: p.token };
        })
        .catch(() => ({ ok: false, message: 'Error de conexión con el servidor.' }));
    },

    // Validar sesión actual (comprobar token)
    validateSession() {
        const token = localStorage.getItem('centuria_auth_token');
        if (!token) return Promise.resolve({ valid: false, user: null });

        return fetch(`${this.baseUrl}auth.php?action=validate`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(async response => {
            let data = {};
            try { data = await response.json(); } catch (e) { data = {}; }
            if (!response.ok || !data.valid) {
                // Token inválido o expirado - limpiar
                this.logout();
                return { valid: false, user: null };
            }
            return { valid: true, user: data.user };
        })
        .catch(() => ({ valid: false, user: null }));
    },

    // Obtener datos de usuario actual
    getCurrentUser() {
        const userStr = localStorage.getItem('centuria_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Logout - destruir token
    logout() {
        const token = localStorage.getItem('centuria_auth_token');
        if (token) {
            fetch(`${this.baseUrl}auth.php?action=logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .catch(() => {}); // Ignorar errores en logout
        }
        localStorage.removeItem('centuria_auth_token');
        localStorage.removeItem('centuria_user');
    },

    // Obtener token actual (para usar en otros endpoints)
    getToken() {
        return localStorage.getItem('centuria_auth_token');
    },

    // --- Courses ---

    // Listar todos los cursos
    listCourses() {
        return fetch(`${this.baseUrl}courses.php?action=list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load courses');
            return data.courses || [];
        });
    },

    // Obtener un curso por ID
    getCourse(courseId) {
        return fetch(`${this.baseUrl}courses.php?action=get&id=${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Course not found');
            return data.course;
        });
    },

    // Inscribirse en un curso
    enrollCourse(courseId) {
        return fetch(`${this.baseUrl}courses.php?action=enroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `course_id=${courseId}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Enrollment failed');
            return data;
        });
    },

    // Obtener cursos (formato {ok, courses} para index.html; nunca lanza)
    getCourses() {
        return this.listCourses()
            .then(c => ({ ok: true, courses: c }))
            .catch(() => ({ ok: false, courses: [] }));
    },

    // --- Grades ---

    // Listar calificaciones de un curso
    listGrades(courseId) {
        return fetch(`${this.baseUrl}grades.php?action=list&course_id=${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load grades');
            return data.grades || [];
        });
    },

    // Registrar una calificación
    recordGrade(userId, courseId, component, score, maxScore = 100) {
        return fetch(`${this.baseUrl}grades.php?action=record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `user_id=${userId}&course_id=${courseId}&component=${encodeURIComponent(component)}&score=${score}&max_score=${maxScore}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to record grade');
            return data;
        });
    },

    // Calcular nota final de un curso
    getFinalGrades(courseId) {
        return fetch(`${this.baseUrl}grades.php?action=final&course_id=${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get final grades');
            return data.final_grades || {};
        });
    },

    // --- Attendance ---

    // Marcar asistencia
    markAttendance(courseId, date, status = 'present', studentId = null) {
        return fetch(`${this.baseUrl}attendance.php?action=mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `course_id=${courseId}&date=${date}&status=${status}&student_id=${studentId || ''}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to mark attendance');
            return data;
        });
    },

    // Listar asistencia de un curso
    listAttendance(courseId) {
        return fetch(`${this.baseUrl}attendance.php?action=list&course_id=${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load attendance');
            return data.attendance || [];
        });
    },

    // Resumen de asistencia
    getAttendanceSummary(courseId) {
        return fetch(`${this.baseUrl}attendance.php?action=summary&course_id=${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get attendance summary');
            return data;
        });
    },

    // --- Calendar ---

    // Crear evento de calendario
    createEvent(title, description, startDate, endDate = null, allDay = false) {
        return fetch(`${this.baseUrl}calendar.php?action=create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || '')}&start_date=${startDate}&end_date=${endDate || ''}&all_day=${allDay}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create event');
            return data.event;
        });
    },

    // Listar eventos de un curso
    listEvents(courseId = null, start = null, end = null) {
        let url = `${this.baseUrl}calendar.php?action=list`;
        const params = [];
        if (courseId) params.push(`course_id=${courseId}`);
        if (start) params.push(`start=${start}`);
        if (end) params.push(`end=${end}`);
        if (params.length > 0) url += `&${params.join('&')}`;

        return fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load events');
            return data.events || [];
        });
    },

    // Obtener un evento
    getEvent(eventId) {
        return fetch(`${this.baseUrl}calendar.php?action=get&id=${eventId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Event not found');
            return data.event;
        });
    },

    // Actualizar evento
    updateEvent(id, title, description, startDate, endDate = null, allDay = false) {
        return fetch(`${this.baseUrl}calendar.php?action=update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `id=${id}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || '')}&start_date=${startDate}&end_date=${endDate || ''}&all_day=${allDay}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update event');
            return data;
        });
    },

    // Eliminar evento
    deleteEvent(id) {
        return fetch(`${this.baseUrl}calendar.php?action=delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `id=${id}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete event');
            return data;
        });
    },

    // --- Admin ---

    // Listar todos los usuarios
    listUsers() {
        return fetch(`${this.baseUrl}admin.php?action=list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load users');
            return data.users || [];
        });
    },

    // Listar usuarios en formato {ok, users[]} con roles en español (admin_roles.html). Nunca lanza.
    adminGetUsers() {
        return this.listUsers()
            .then(users => ({
                ok: true,
                users: (users || []).map(x => ({
                    id: x.id,
                    cedula: x.username,
                    username: x.username,
                    nombre: ((x.firstname || '') + ' ' + (x.lastname || '')).trim(),
                    rol: ROLE_ES[x.role] || 'alumno',
                    estado: x.role === 'inactive' ? 'inactivo' : 'activo',
                    carrera: x.course_name || '',
                    asignatura: x.course_name || '',
                    seccion: '',
                    email: x.email
                }))
            }))
            .catch(() => ({ ok: false, users: [], message: 'Error de conexión.' }));
    },

    // Obtener usuario por ID
    getUser(userId) {
        return fetch(`${this.baseUrl}admin.php?action=get&id=${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'User not found');
            return data.user;
        });
    },

    // Asignar rol por user_id numérico
    setUserRole(userId, role) {
        return fetch(`${this.baseUrl}admin.php?action=set_role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `user_id=${userId}&role=${encodeURIComponent(role)}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to set role');
            return data;
        });
    },

    // Eliminar usuario por user_id numérico
    deleteUser(userId) {
        return fetch(`${this.baseUrl}admin.php?action=delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: `user_id=${userId}`
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete user');
            return data;
        });
    },

    // Asignar rol por cédula (admin_roles.html). Nunca lanza: {ok, message}.
    adminUpdateRole(cedula, nombre, rol, carrera, seccion, estado) {
        return this.listUsers()
            .then(async users => {
                const f = (users || []).find(x => String(x.username) === String(cedula));
                if (!f) return { ok: false, message: 'Cédula no encontrada.' };
                await this.setUserRole(f.id, ROLE_EN[String(rol || '').toLowerCase()] || 'student');
                return { ok: true };
            })
            .catch(() => ({ ok: false, message: 'Error de conexión.' }));
    },

    // Eliminar/desactivar por cédula (admin_roles.html). Nunca lanza: {ok, message}.
    adminDeleteRole(cedula, rol, carrera) {
        return this.listUsers()
            .then(async users => {
                const f = (users || []).find(x => String(x.username) === String(cedula));
                if (!f) return { ok: false, message: 'Cédula no encontrada.' };
                await this.deleteUser(f.id);
                return { ok: true };
            })
            .catch(() => ({ ok: false, message: 'Error de conexión.' }));
    },

    // Obtener roles de una cédula. Nunca lanza: {ok, roles[]}.
    // Si hay token y es el usuario logueado, usa la sesión; si no, busca en la BD.
    getRoles(cedula) {
        const shape = (roleEn) => ({ ok: true, roles: [{ rol: ROLE_ES[roleEn] || 'alumno', estado: 'activo', carrera: '', seccion: '', asignatura: '' }] });
        const empty = { ok: true, roles: [] };
        try {
            const token = this.getToken();
            if (token) {
                return this.validateSession().then(v => {
                    const u = ((v && v.user) || this.getCurrentUser() || {});
                    if (u.username && String(u.username) === String(cedula)) {
                        return shape(u.role || u.rol || 'student');
                    }
                    return this._findRoleByCedula(cedula).then(r => r ? shape(r) : empty).catch(() => empty);
                }).catch(() => empty);
            }
            return this._findRoleByCedula(cedula).then(r => r ? shape(r) : empty).catch(() => empty);
        } catch (e) {
            return Promise.resolve(empty);
        }
    },

    // Buscar rol (inglés) de una cédula en la BD. Nunca lanza.
    _findRoleByCedula(cedula) {
        return this.listUsers()
            .then(users => {
                const f = (users || []).find(x => String(x.username) === String(cedula));
                return f ? (f.role || 'student') : null;
            })
            .catch(() => null);
    },

    // Importar usuarios desde CSV
    importUsersFromCSV(csvFile, maxRows = 100) {
        const formData = new FormData();
        formData.append('csv', csvFile);
        formData.append('max_rows', maxRows);

        return fetch(`${this.baseUrl}upload.php?action=import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to import CSV');
            return data;
        });
    },

    // Health check
    healthCheck() {
        return fetch(`${this.baseUrl}upload.php?action=health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Health check failed');
            return data;
        });
    },

    // --- Auth estilo objeto (index.html: window.CenturiaAPI.auth.register/login) ---

    // Register con objeto {cedula,nombre,apellido,email,telefono,password,rol,grado,carrera,seccion}. Dual storage. Nunca lanza.
    authRegister(userData) {
        userData = userData || {};
        const body = `username=${encodeURIComponent(userData.cedula || '')}`
            + `&password=${encodeURIComponent(userData.password || '')}`
            + `&firstname=${encodeURIComponent(userData.nombre || '')}`
            + `&lastname=${encodeURIComponent(userData.apellido || '')}`
            + `&email=${encodeURIComponent(userData.email || '')}`
            + `&role=${encodeURIComponent(userData.rol || userData.role || 'alumno')}`
            + `&grado=${encodeURIComponent(userData.grado || '')}`
            + `&carrera=${encodeURIComponent(userData.carrera || '')}`
            + `&seccion=${encodeURIComponent(userData.seccion || '')}`
            + `&foto=${encodeURIComponent(userData.foto || '')}`;
        return fetch(`${this.baseUrl}auth.php?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        })
        .then(async response => {
            let data = {};
            try { data = await response.json(); } catch (e) { data = {}; }
            if (!response.ok || data.success === false) {
                let msg = (data && (data.error || data.message)) || 'No se pudo registrar.';
                if (/already exists/i.test(msg)) msg = 'Esta cédula ya está registrada.';
                return { ok: false, message: msg };
            }
            const p = (data.token !== undefined || data.user !== undefined) ? data : (data.data || {});
            const user = mapUser(p.user || {});
            if (p.token) {
                localStorage.setItem('centuria_auth_token', p.token);
                localStorage.setItem('centuria_user', JSON.stringify(user));
            }
            // Sync: registrar también en Google Sheets
            const fullName = ((userData.nombre || '') + ' ' + (userData.apellido || '')).trim();
            gasRegisterStudent(userData.cedula || '', fullName, userData.email || '').catch(() => {});
            return { ok: true, user: user, token: p.token };
        })
        .catch(() => ({ ok: false, message: 'Error de conexión con el servidor.' }));
    },

    // Login estilo objeto. Nunca lanza: {ok, token, user, message}.
    authLogin(cedula, password) {
        return API.login(cedula, password);
    },

    // --- Adaptadores de espacios de nombres (teacher_panel, admin/index, upload) ---

    // Todos los roles en formato {roles[]} con cédula/nombre/rol/estado/carrera
    _adminRolesAll() {
        return this.listUsers()
            .then(users => ({
                roles: (users || []).map(x => ({
                    cedula: x.username,
                    nombre: ((x.firstname || '') + ' ' + (x.lastname || '')).trim(),
                    rol: ROLE_ES[x.role] || 'alumno',
                    estado: x.role === 'inactive' ? 'inactivo' : 'activo',
                    carrera: x.course_name || '',
                    seccion: '',
                    asignatura: x.course_name || ''
                }))
            }))
            .catch(() => ({ roles: [] }));
    },

    // Asignar rol desde objeto {cedula,nombre,rol,carrera,estado}. Crea el usuario si no existe.
    _adminAssign(o) {
        o = o || {};
        const ced = String(o.cedula || '').trim().replace(/\./g, '');
        if (!ced) return Promise.resolve({ status: 'Error', mensaje: 'Cédula requerida.' });
        const enRole = ROLE_EN[String(o.rol || 'alumno').toLowerCase()] || 'student';
        return this.listUsers()
            .then(async users => {
                const f = (users || []).find(x => String(x.username) === ced);
                if (f) {
                    await this.setUserRole(f.id, enRole);
                    return { status: 'Éxito', mensaje: 'Rol actualizado.' };
                }
                const parts = String(o.nombre || '').trim().split(/\s+/).filter(Boolean);
                const first = parts[0] || 'Usuario';
                const last = parts.slice(1).join(' ') || 'Sin apellido';
                const pass = first.charAt(0).toUpperCase() + ((last.charAt(0) || 'x').toLowerCase()) + ced + '*';
                const body = `username=${encodeURIComponent(ced)}&password=${encodeURIComponent(pass)}`
                    + `&firstname=${encodeURIComponent(first)}&lastname=${encodeURIComponent(last)}&email=&role=${enRole}`;
                const res = await fetch(`${this.baseUrl}auth.php?action=register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${this.getToken()}`
                    },
                    body: body
                });
                const d = await res.json().catch(() => ({}));
                if (!res.ok) return { status: 'Error', mensaje: d.error || 'No se pudo crear.' };
                return { status: 'Éxito', mensaje: 'Usuario creado. Contraseña: ' + pass };
            })
            .catch(() => ({ status: 'Error', mensaje: 'Error de conexión.' }));
    },

    // Revocar acceso: marca el rol como inactivo (no borra el historial)
    _adminRevoke(cedula) {
        return this.listUsers()
            .then(async users => {
                const f = (users || []).find(x => String(x.username) === String(cedula));
                if (!f) return { status: 'Error', mensaje: 'Cédula no encontrada.' };
                await this.setUserRole(f.id, 'inactive');
                return { status: 'Éxito', mensaje: 'Acceso revocado.' };
            })
            .catch(() => ({ status: 'Error', mensaje: 'Error de conexión.' }));
    },

    // Asistencia por curso y fecha. Si el curso no es numérico (nombre), devuelve vacío sin romper.
    _attByDate(courseId, fecha) {
        if (!/^\d+$/.test(String(courseId || ''))) return Promise.resolve({ attendance: [] });
        return this.listAttendance(courseId)
            .then(a => ({ attendance: (a || []).filter(x => !fecha || x.date === fecha) }))
            .catch(() => ({ attendance: [] }));
    },

    // Marcar asistencia: acepta objeto {user_id,course_id,date,status} o posicional.
    // Con curso no numérico guarda en localStorage como respaldo.
    _attMark(a, b, c, d) {
        let p = {};
        if (a && typeof a === 'object') {
            p = { user_id: a.user_id, course_id: a.course_id, date: a.date, status: a.status || 'presente' };
        } else {
            p = { course_id: a, date: b, status: c || 'presente', user_id: d };
        }
        const st = { presente: 'present', ausente: 'absent', tardanza: 'late', present: 'present', absent: 'absent', late: 'late', excused: 'excused' }[String(p.status)] || 'present';
        if (!/^\d+$/.test(String(p.course_id || ''))) {
            try {
                const k = 'att_local_' + (p.date || 'sin_fecha');
                const arr = JSON.parse(localStorage.getItem(k) || '[]');
                arr.push(p);
                localStorage.setItem(k, JSON.stringify(arr));
            } catch (e) {}
            return Promise.resolve({ ok: true, local: true });
        }
        return this.markAttendance(p.course_id, p.date, st, p.user_id)
            .then(x => ({ ok: true, data: x }))
            .catch(() => ({ ok: false, message: 'Error al guardar asistencia.' }));
    },

    // Subida CSV: acepta FormData ya armado o (archivo, maxRows)
    _uploadCSV(a, b) {
        let fd = null;
        if (typeof FormData !== 'undefined' && a instanceof FormData) {
            fd = a;
            let has = false;
            try { for (const k of fd.keys()) { if (k === 'action') { has = true; break; } } } catch (e) {}
            if (!has) { try { fd.append('action', 'import'); } catch (e) {} }
        } else {
            fd = new FormData();
            fd.append('action', 'import');
            fd.append('csv', a);
            fd.append('max_rows', b || 100);
        }
        return fetch(`${this.baseUrl}upload.php?action=import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.getToken()}` },
            body: fd
        })
        .then(async r => {
            const d = await r.json().catch(() => ({}));
            return { success: r.ok && d.success !== false, message: d.message || d.error || '', data: d.data || d };
        })
        .catch(() => ({ success: false, message: 'Error de conexión.' }));
    },

    // --- Documentos del sistema (actas, planillas, registros, planes) ---

    // Obtener un documento guardado por tipo/curso/periodo. Nunca lanza.
    documentosGet(tipo, curso = '', periodo = '') {
        const q = `tipo=${encodeURIComponent(tipo)}&curso=${encodeURIComponent(curso)}&periodo=${encodeURIComponent(periodo)}`;
        return fetch(`${this.baseUrl}documentos.php?action=get&${q}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        })
        .then(async response => {
            let data = {};
            try { data = await response.json(); } catch (e) { data = {}; }
            if (!response.ok) return { found: false };
            if (!data.found) return { found: false };
            const doc = data.documento || {};
            try { doc.datosObj = JSON.parse(doc.datos || '{}'); } catch (e) { doc.datosObj = {}; }
            return { found: true, documento: doc };
        })
        .catch(() => ({ found: false }));
    },

    // Guardar un documento (solo docente/admin/académico). Nunca lanza: {ok, message}.
    documentosSave(obj) {
        obj = obj || {};
        const datos = (typeof obj.datos === 'string') ? obj.datos : JSON.stringify(obj.datos || {});
        const body = `tipo=${encodeURIComponent(obj.tipo || '')}&curso=${encodeURIComponent(obj.curso || '')}`
            + `&periodo=${encodeURIComponent(obj.periodo || '')}&docente=${encodeURIComponent(obj.docente || '')}`
            + `&datos=${encodeURIComponent(datos)}`;
        return fetch(`${this.baseUrl}documentos.php?action=save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: body
        })
        .then(async response => {
            let data = {};
            try { data = await response.json(); } catch (e) { data = {}; }
            if (!response.ok) return { ok: false, message: (data && data.error) || 'No se pudo guardar.' };
            return { ok: true, message: (data && data.message) || 'Guardado.' };
        })
        .catch(() => ({ ok: false, message: 'Error de conexión.' }));
    },

    // Nómina de un curso desde la BD (acepta nombre 'TIC' o id numérico). Nunca lanza.
    roster(curso) {
        return this.listUsers()
            .then(users => {
                const esNum = /^\d+$/.test(String(curso || ''));
                const list = (users || []).filter(u => {
                    if ((u.role || 'student') === 'inactive') return false;
                    if (esNum) return String(u.course_id) === String(curso);
                    if (!curso) return true;
                    return (u.course_name || '') === curso;
                });
                return list.map(u => ({
                    id: u.id,
                    cedula: u.username,
                    nombre: ((u.firstname || '') + ' ' + (u.lastname || '')).trim(),
                    apellido: '',
                    email: u.email || ''
                }));
            })
            .catch(() => []);
    },

    // Notas finales de un curso (requiere id numérico). Nunca lanza: {}.
    notasFinales(courseId) {
        if (!/^\d+$/.test(String(courseId || ''))) return Promise.resolve({});
        return this.getFinalGrades(courseId).catch(() => ({}));
    }
};

// Espacios de nombres usados por los paneles (teacher_panel, admin/index, upload)
API.auth = {
    register: (d) => API.authRegister(d),
    login: (c, p) => API.authLogin(c, p)
};
API.admin = {
    getRoles: () => API._adminRolesAll(),
    assignRole: (o) => API._adminAssign(o),
    revokeRole: (c, r, ca) => API._adminRevoke(c, r, ca)
};
API.attendance = {
    getByCourseAndDate: (c, f) => API._attByDate(c, f),
    markAttendance: (a, b, c, d) => API._attMark(a, b, c, d)
};
API.upload = {
    importUsersFromCSV: (a, b) => API._uploadCSV(a, b)
};

// Exportar para uso en módulos o navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

// Helper: Verificar si el usuario está autenticado (token presente y no vacío)
function isAuthenticated() {
    const token = localStorage.getItem('centuria_auth_token');
    return !!token;
}

// Helper: Obtener iniciales del nombre para mostrar
function getInitials(name) {
    if (!name) return 'US';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : 'US';
}

// Helper: usuario actual guardado en sesión
function getCurrentUser() {
    return API.getCurrentUser();
}

// Objeto global usado por todas las pantallas (index, admin, teacher_panel, upload)
window.CenturiaAPI = API;
var CenturiaAPI = window.CenturiaAPI;
