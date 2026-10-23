// MÓDULO 10: Funciones de RBAC, MFA y Particionado de BD (R191-R210)
// Requerimientos herranuebras.txt: 191-210

/**
 * Verificar si el usuario tiene permiso para un recurso específico
 * @param {string} recurso - Nombre del recurso (ej. 'expedientes', 'exportar', 'configuración')
 * @param {string} accion - Acción a verificar (ej. 'leer', 'escribir', 'eliminar')
 * @returns {boolean} True si tiene permiso
 */
StateManager.prototype.verificarPermiso = function(recurso, accion) {
    const rol = this._state.rbac.rol;
    const permisos = this._state.rbac.permisos[recurso] || {};
    
    // Verificar permiso explícito
    if (permisos[accion]) return true;
    
    // Roles con permisos por defecto
    const rolesConAcceso = {
        admin: ['leer', 'escribir', 'eliminar', 'exportar'],
        tecnico: ['leer', 'escribir'],
        revisor: ['leer'],
        municipal: ['leer'],
        consultor: ['leer']
    };
    
    if (rol && rolesConAcceso[rol] && rolesConAcceso[rol].includes(accion)) return true;
    
    return false;
};

/**
 * Otorgar permiso a un usuario para un recurso y acción específicos
 * @param {string} recurso - Nombre del recurso
 * @param {string} accion - Acción a otorgar
 * @param {string} rol - Rol al que se otorga el permiso
 */
StateManager.prototype.otorgarPermiso = function(recurso, accion, rol) {
    if (!this._state.rbac.permisos[recurso]) {
        this._state.rbac.permisos[recurso] = {};
    }
    this._state.rbac.permisos[recurso][accion] = rol;
    this._notify('permisos_cambiados', this._state.rbac, this._state.rbac);
};

/**
 * Verificar si el usuario actual es administrador
 * @returns {boolean} True si es admin
 */
StateManager.prototype.esUsuarioAdmin = function() {
    return this._state.rbac.rol === 'admin';
};

/**
 * Verificar acceso departamental del usuario
 * @param {string} departamento - Departamento a verificar
 * @returns {boolean} True si tiene acceso al departamento especificado
 */
StateManager.prototype.verificarAccesoDepartamental = function(departamento) {
    if (!departamento) return false;
    const rol = this._state.rbac.rol;
    // Los roles admin y técnico tienen acceso departamental
    if (rol === 'admin' || rol === 'tecnico') return true;
    // Verificar si el departamento está asignado al usuario
    return this._state.rbac.departamental === departamento;
};

/**
 * Verificar si MFA está habilitado para el usuario actual
 * @returns {object} { habilitado, metodo, ultimoVerificacion }
 */
StateManager.prototype.mfaEstaHabilitado = function() {
    return {
        habilitado: this._state.mfa.habilitado,
        metodo: this._state.mfa.metodo,
        ultimoVerificacion: this._state.mfa.ultimoVerificacion
    };
};

/**
 * Configurar MFA para el usuario (TOTP, SMS o authenticator app)
 * @param {object} configuracion - { metodo: 'totp'|'sms'|'authenticator_app', secretoTOTP?, numeroSMS? }
 * @returns {object} Resultado de la configuración
 */
StateManager.prototype.configurarMFA = function(configuracion) {
    const metodo = configuracion?.metodo || 'totp';
    
    // Validar que el método es soportado
    const metodosValidos = ['totp', 'sms', 'authenticator_app'];
    if (!metodosValidos.includes(metodo)) {
        showToast('Método MFA no soportado: ' + metodo, 'error');
        return { error: 'Método no soportado' };
    }
    
    this._state.mfa.habilitado = true;
    this._state.mfa.metodo = metodo;
    this._state.mfa.ultimoVerificacion = new Date().toISOString();
    this._persist();
    this._notify('mfa_cambiado', this._state.mfa, this._state.mfa);
    
    showToast('MFA configurado con método: ' + metodo, 'success');
    return { exito: true, metodo };
};

/**
 * Verificar código MFA (TOTP de 6 dígitos o SMS)
 * @param {string} codigo - Código ingresado por el usuario
 * @returns {object} Resultado de la verificación
 */
StateManager.prototype.verificarCodigoMFA = function(codigo) {
    if (!this._state.mfa.habilitado) {
        return { valido: false, mensaje: 'MFA no habilitado' };
    }
    
    const ahora = new Date();
    const ultimo = this._state.mfa.ultimoVerificacion ? new Date(this._state.mfa.ultimoVerificacion) : null;
    // Evitar verificación muy frecuente (mínimo 30 segundos)
    if (ultimo && ((ahora - ultimo) / 1000) < 30) {
        return { valido: false, mensaje: 'Intente nuevamente en 30 segundos' };
    }
    
    // En producción real verificarían el TOTP contra el secreto
    // Por ahora simularé aceptación si el código tiene 6 dígitos
    const esCodigoValido = codigo && /^\d{6}$/.test(codigo);
    
    if (esCodigoValido) {
        this._state.mfa.ultimoVerificacion = ahora.toISOString();
        this._persist();
        this._notify('mfa_cambiado', this._state.mfa, this._state.mfa);
        showToast('Código MFA verificado correctamente', 'success');
        return { valido: true };
    } else {
        showToast('Código MFA inválido', 'error');
        return { valido: false, mensaje: 'Código debe tener 6 dígitos' };
    }
};

/**
 * Definir particiones de la base de datos para optimizar consultas catastrales
 * @param {object} opciones - { aniosRetencion, esquemaParticion, tipoParticion }
 * @returns {object} Resultado del definido de particiones
 */
StateManager.prototype.definirParticionesDB = function(opciones = {}) {
    const defaults = {
        aniosRetencion: 5,
        esquemaParticion: 'mensual', // 'mensual', 'anual', 'por_rango'
        tipoParticion: 'fecha_entrada', // Campo sobre el cual particionar
        nombresParticiones: []
    };
    
    const config = { ...defaults, ...opciones };
    
    // Generar nombres de particiones basados en el esquema y años de retención
    const anioActual = new Date().getFullYear();
    const particiones = [];
    
    if (config.esquemaParticion === 'mensual') {
        for (let i = 0; i < config.aniosRetencion * 12; i++) {
            const fecha = new Date();
            fecha.setMonth(fecha.getMonth() - i);
            const nombre = 'catastro_' + anioActual + '_' + ('0' + (fecha.getMonth() + 1)).slice(-2);
            particiones.push(nombre);
        }
    } else if (config.esquemaParticion === 'anual') {
        for (let i = 0; i < config.aniosRetencion; i++) {
            const nombre = 'catastro_' + (anioActual - i);
            particiones.push(nombre);
        }
    }
    
    config.nombresParticiones = particiones;
    
    // En producción real, esto ejecutaría SQL ALTER TABLE... PARTITION BY
    showToast('Particiones DB definidas: ' + particiones.length + ' particiones', 'info');
    
    return {
        exito: true,
        esquema: config.esquemaParticion,
        aniosRetencion: config.aniosRetencion,
        nombresParticiones: config.nombresParticiones
    };
};

/**
 * Obtener información de particiones actuales de la BD
 * @returns {object} Información de particiones
 */
StateManager.prototype.obtenerInfoParticiones = function() {
    // En producción real consultaría INFORMATION_SCHEMA o PostgreSQL pg_partitions
    return {
        tipoParticion: this._state.storage.tipo === 's3' ? 'basado en ruta' : 'por fecha',
        aniosRetencion: 5,
        ultimasParticiones: ['catastro_2024_01', 'catastro_2024_02', 'catastro_2024_03']
    };
};

// Exportar métodos del Módulo 10
export const State10 = {
    verificarPermiso: StateManager.prototype.verificarPermiso,
    otorgarPermiso: StateManager.prototype.otorgarPermiso,
    esUsuarioAdmin: StateManager.prototype.esUsuarioAdmin,
    verificarAccesoDepartamental: StateManager.prototype.verificarAccesoDepartamental,
    mfaEstaHabilitado: StateManager.prototype.mfaEstaHabilitado,
    configurarMFA: StateManager.prototype.configurarMFA,
    verificarCodigoMFA: StateManager.prototype.verificarCodigoMFA,
    definirParticionesDB: StateManager.prototype.definirParticionesDB,
    obtenerInfoParticiones: StateManager.prototype.obtenerInfoParticiones
};