/**
 * Gestión de Estado Global (Patrón Observer)
 * Almacena y notifica cambios en geojson, excelData y validaciones
 */

import { calcularMetricasPlanasUTM, sanitizeString } from './utils.js';
import { logger } from './logger.js';

// Cada subsistema (Catastro PY Pro, Municipal, Ciudadano) corre en el mismo
// origen (localhost:5556) pero NO debe compartir el proyecto activo entre si:
// un geojson de demostracion cargado en el Portal Ciudadano publico no puede
// reaparecer como "expediente activo" en el validador profesional. Se
// namespacea la clave de localStorage por path para evitar esa fuga de datos.
function resolveExpedienteStorageKey() {
    const path = (typeof window !== 'undefined' && window.location?.pathname) || '';
    if (path.startsWith('/ciudadano')) return 'snc_v3_expediente_activo_ciudadano';
    if (path.startsWith('/municipal')) return 'snc_v3_expediente_activo_municipal';
    return 'snc_v3_expediente_activo';
}
const EXPEDIENTE_STORAGE_KEY = resolveExpedienteStorageKey();

// Polyfill localStorage para entorno Node.js (tests)
const isNode = typeof window === 'undefined' || typeof window?.location?.origin === 'undefined';
let localStoragePolyfill = {};
if (isNode) {
    global.localStorage = {
        getItem: (key) => localStoragePolyfill[key] || null,
        setItem: (key, value) => { localStoragePolyfill[key] = value; },
        removeItem: (key) => { delete localStoragePolyfill[key]; },
        get length() { return Object.keys(localStoragePolyfill).length; },
        key: (index) => Object.keys(localStoragePolyfill)[index] || null,
        clear: () => { localStoragePolyfill = {}; }
    };
}

function loadPersistedExpediente() {
    try {
        // Limpieza de la clave compartida legacy: si este subsistema NO es
        // el validador profesional, descartar (sin migrar) cualquier
        // expediente guardado bajo la clave antigua sin namespace, para
        // cortar la fuga de datos entre Ciudadano/Municipal y Catastro Pro.
        if (EXPEDIENTE_STORAGE_KEY !== 'snc_v3_expediente_activo') {
            localStorage.removeItem('snc_v3_expediente_activo');
        }
        const saved = localStorage.getItem(EXPEDIENTE_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        logger.warn('No se pudo recuperar el expediente local:', error);
        return {};
    }
}

/**
 * @typedef {Object} BackendMeta
 * @property {string} baseUrl
 * @property {string} token
 * @property {Object|null} user
 * @property {string} currentProjectId
 * @property {string} currentExpedienteId
 */

class StateManager {
    /**
     * @param {Object} [options]
     * @param {string} [options.storageKey]
     */
    constructor() {
        const saved = loadPersistedExpediente();
        
        // Detectar entorno de test (Node.js sin window o sin window.location.origin)
        const isNode = typeof window === 'undefined' || typeof window?.location?.origin === 'undefined';
        const baseUrl = isNode ? 'http://localhost:5556' : window.location.origin;
        
        this._state = {
            projection: saved.projection || 'EPSG:32721',
            currentDisplayProjection: saved.currentDisplayProjection || 'EPSG:32721',
            lastMouseCoords: [0, 0],
            geojson: saved.geojson || null,
            excelData: Array.isArray(saved.excelData) ? saved.excelData : [],
            validationResults: null,
            sourceGeoFileName: saved.sourceGeoFileName || '',
            sourceDataFileName: saved.sourceDataFileName || '',
            parcelLineage: Array.isArray(saved.parcelLineage) ? saved.parcelLineage : [],
            projectVersions: Array.isArray(saved.projectVersions) ? saved.projectVersions : [],
            pendingCallback: null,
            measureMode: false,
            splitModeActive: false,
            // Módulo 10: Arquitectura, Seguridad y Base de Datos
            rbac: {
                rol: null, // 'admin', 'tecnico', 'revisor', 'municipal', 'consultor'
                permisos: {}, // Mapa de permisos por recurso
                departamental: null, // Departamento asignado
                jurisdiccional: null // Distrito/jurisdicción
            },
            mfa: {
                habilitado: false,
                metodo: null, // 'totp', 'sms', 'authenticator_app'
                ultimoVerificacion: null
            },
            storage: {
                tipo: 'local', // 'local', 's3', 'cloudinary'
                bucket: null,
                region: null,
                endpoint: null
            },
            api: {
                baseUrl: isNode ? 'http://localhost:5556' : window.location.origin,
                token: (isNode ? '' : localStorage.getItem('snc_api_token') || ''),
                user: (isNode ? null : JSON.parse(localStorage.getItem('snc_api_user') || 'null')),
                currentProjectId: (isNode ? '' : localStorage.getItem('snc_project_id') || ''),
                currentExpedienteId: (isNode ? '' : localStorage.getItem('snc_expediente_id') || ''),
                ultimasConsultas: []
            }
        };
        
        this._subscribers = new Map();
        this.backend = {
            baseUrl: baseUrl,
            token: (isNode ? '' : localStorage.getItem('snc_api_token') || ''),
            user: (isNode ? null : JSON.parse(localStorage.getItem('snc_api_user') || 'null')),
            currentProjectId: (isNode ? '' : localStorage.getItem('snc_project_id') || ''),
            currentExpedienteId: (isNode ? '' : localStorage.getItem('snc_expediente_id') || '')
        };
    }

    _persist() {
        try {
            const { geojson, excelData, projection, currentDisplayProjection, sourceGeoFileName, sourceDataFileName, parcelLineage, projectVersions } = this._state;
            localStorage.setItem(EXPEDIENTE_STORAGE_KEY, JSON.stringify({ geojson, excelData, projection, currentDisplayProjection, sourceGeoFileName, sourceDataFileName, parcelLineage, projectVersions }));
        } catch (error) {
            logger.warn('No se pudo guardar el expediente local:', error);
        }
    }

    _persistBackendMeta() {
        try {
            localStorage.setItem('snc_api_token', this.backend.token || '');
            localStorage.setItem('snc_api_user', JSON.stringify(this.backend.user || null));
            localStorage.setItem('snc_project_id', this.backend.currentProjectId || '');
            localStorage.setItem('snc_expediente_id', this.backend.currentExpedienteId || '');
        } catch (error) {
            logger.warn('No se pudo guardar sesión backend:', error);
        }
    }

    /**
     * Obtiene una propiedad.
     * @param {string} key Clave del estado.
     * @returns {*} Valor almacenado.
     */
    get(key) {
        return this._state[key];
    }
    
    /**
     * Actualiza una propiedad y notifica cambios.
     * @param {string} key Clave del estado.
     * @param {*} value Nuevo valor.
     */
    set(key, value) {
        const oldValue = this._state[key];
        this._state[key] = value;
        if (['geojson', 'excelData', 'projection', 'currentDisplayProjection', 'sourceGeoFileName', 'sourceDataFileName', 'parcelLineage', 'projectVersions'].includes(key)) this._persist();
        this._notify(key, value, oldValue);
    }
    
    /**
     * Suscribe un callback a un evento.
     * @param {string} event Nombre del evento.
     * @param {Function} callback Función a invocar.
     * @returns {Function} Función de desuscripción.
     */
    subscribe(event, callback) {
        if (!this._subscribers.has(event)) {
            this._subscribers.set(event, new Set());
        }
        this._subscribers.get(event).add(callback);
        
        // Retorna función para desuscribir
        return () => {
            this._subscribers.get(event)?.delete(callback);
        };
    }
    
    /**
     * Notifica a los suscriptores
     */
    _notify(event, newValue, oldValue) {
        const callbacks = this._subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(newValue, oldValue);
                } catch (e) {
                    logger.error(`Error en callback de ${event}:`, e);
                }
            });
        }
        
        // También notificar eventos genéricos
        const genericCallbacks = this._subscribers.get('*');
        if (genericCallbacks) {
            genericCallbacks.forEach(cb => {
                try {
                    cb(event, newValue, oldValue);
                } catch (e) {
                    logger.error(`Error en callback genérico:`, e);
                }
            });
        }
    }
    
    /**
     * Retorna un Map para joins rápidos (código -> fila de datos)
     */
    getJoinTable() {
        const joinMap = new Map();
        if (!this._state.excelData || !Array.isArray(this._state.excelData)) {
            return joinMap;
        }
        
        for (const row of this._state.excelData) {
            const codigo = row.CODIGO ? sanitizeString(row.CODIGO.toString()) : '';
            if (codigo) {
                joinMap.set(codigo, row);
            }
        }
        return joinMap;
    }
    
    /**
     * Vincula los atributos del Excel a los features del GeoJSON
     * Retorna true si hubo cambios
     */
    joinDataToGeoJSON() {
        if (!this._state.geojson || !this._state.excelData || !Array.isArray(this._state.excelData)) {
            return { modified: false, matched: 0, orphans: 0 };
        }

        const rows = this._state.excelData;
        const rowsByPadron = new Map(rows
            .filter(row => row.PADRON !== undefined && String(row.PADRON).trim() !== '')
            .map(row => [String(row.PADRON).trim(), row]));
        const joinMap = this.getJoinTable();
        let modified = false;
        let matched = 0;
        const usedPadrons = new Set();
        const featureIds = [];

        for (const [index, feature] of this._state.geojson.features.entries()) {
            feature.properties ||= {};
            const padron = feature.properties.PADRON;
            let dataRow = (padron !== undefined && String(padron).trim() !== '' && rowsByPadron.get(String(padron).trim()))
                || null;

            if (!dataRow) {
                const codigo = feature.properties.CODIGO || feature.properties.ID || feature.properties.codigo;
                if (codigo) {
                    const key = String(codigo).trim();
                    dataRow = joinMap.get(key);
                    if (dataRow) {
                        feature.properties.PADRON = dataRow.PADRON !== undefined && dataRow.PADRON !== null && String(dataRow.PADRON).trim() !== ''
                            ? String(dataRow.PADRON).trim()
                            : feature.properties.PADRON;
                    }
                }
            }

            if (!dataRow) dataRow = rows.length === this._state.geojson.features.length ? rows[index] : null;
            if (dataRow) {
                matched++;
                if (dataRow.PADRON !== undefined && dataRow.PADRON !== null && String(dataRow.PADRON).trim() !== '') {
                    usedPadrons.add(String(dataRow.PADRON).trim());
                }
                for (const [key, value] of Object.entries(dataRow)) {
                    // La superficie SIG es exclusivamente derivada de la geometría.
                    if (key === 'SUP_SIG_M2') continue;
                    if (value !== undefined && value !== null && value !== '' && feature.properties[key] !== value) {
                        feature.properties[key] = value;
                        modified = true;
                    }
                }
                feature._matched = true;
            } else {
                feature._matched = false;
            }
            featureIds.push(feature.properties.CODIGO || feature.properties.ID || feature.properties.codigo || `feature-${index}`);
        }

        const orphans = rows.filter(row => {
            const p = row.PADRON !== undefined && String(row.PADRON).trim() !== '' ? String(row.PADRON).trim() : null;
            return p ? !usedPadrons.has(p) : true;
        }).length;

        if (modified) {
            this._persist();
            this._notify('geojson:joined', this._state.geojson, null);
        }

        logger.debug(`joinDataToGeoJSON: ${matched}/${this._state.geojson.features.length} features matched, ${orphans} orphan rows`);
        this.syncGeometryToParcelRows({ createMissing: true });
        return { modified, matched, orphans };
    }

    /**
     * Mantiene una fila por polígono y traslada SUP_SIG_M2 desde la geometría.
     * Solo crea metadatos técnicos; nunca inventa valores catastrales declarativos.
     */
    syncGeometryToParcelRows({ createMissing = true } = {}) {
        const features = (this._state.geojson?.features || []).filter(feature =>
            ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)
        );
        if (!features.length) return { modified: false, polygons: 0, rows: this._state.excelData?.length || 0 };

        const rows = Array.isArray(this._state.excelData) ? this._state.excelData : [];
        this._state.excelData = rows;
        const projection = this._state.currentDisplayProjection || this._state.projection || 'EPSG:32721';
        let modified = false;

        const findRow = (feature, index, featureId) => {
            const props = feature.properties || {};
            let row = rows.find(item => item.__featureId === featureId);
            if (!row && props.PADRON !== undefined && String(props.PADRON).trim() !== '') {
                row = rows.find(item => item.PADRON !== undefined && String(item.PADRON).trim() === String(props.PADRON).trim());
            }
            const code = props.CODIGO || props.ID || props.codigo;
            if (!row && code) row = rows.find(item => String(item.CODIGO || '').trim() === String(code).trim());
            if (!row && rows.length === features.length) row = rows[index];
            return row || null;
        };

        features.forEach((feature, index) => {
            feature.properties ||= {};
            const props = feature.properties;
            const featureId = props.SNC_PARCELA_ID || `parcela-${index + 1}`;
            const number = Number.isInteger(Number(props.PARCELA_NUMERO)) && Number(props.PARCELA_NUMERO) > 0
                ? Number(props.PARCELA_NUMERO)
                : index + 1;
            if (props.SNC_PARCELA_ID !== featureId) { props.SNC_PARCELA_ID = featureId; modified = true; }
            if (props.PARCELA_NUMERO !== number) { props.PARCELA_NUMERO = number; modified = true; }

            const area = Number(calcularMetricasPlanasUTM(feature, projection).areaM2.toFixed(4));
            if (props.SUP_SIG_M2 !== area) { props.SUP_SIG_M2 = area; modified = true; }
            if (props.SUP_SIG_M !== area) { props.SUP_SIG_M = area; modified = true; }

            let row = findRow(feature, index, featureId);
            if (!row && createMissing) {
                row = {};
                row.CODIGO = String(props.CODIGO || props.ID || featureId);
                rows.push(row);
                modified = true;
            }
            if (!row) return;
            if (row.__featureId !== featureId) { row.__featureId = featureId; modified = true; }
            if (row.PARCELA_NUMERO !== number) { row.PARCELA_NUMERO = number; modified = true; }
            if (row.SUP_SIG_M2 !== area) { row.SUP_SIG_M2 = area; modified = true; }
            if (row.SUP_SIG_M !== area) { row.SUP_SIG_M = area; modified = true; }
        });

        if (modified) {
            this._persist();
            this._notify('excelData', rows, rows);
            this._notify('geojson:parcel-sync', this._state.geojson, null);
        }
        return { modified, polygons: features.length, rows: rows.length };
    }

    assignParcelNumber(featureId, number) {
        const features = (this._state.geojson?.features || []).filter(feature =>
            ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)
        );
        const selected = features.find(feature => feature.properties?.SNC_PARCELA_ID === featureId);
        const targetNumber = Number(number);
        if (!selected || !Number.isInteger(targetNumber) || targetNumber < 1 || targetNumber > features.length) return false;

        const previousNumber = Number(selected.properties.PARCELA_NUMERO);
        const occupied = features.find(feature => feature !== selected && Number(feature.properties?.PARCELA_NUMERO) === targetNumber);
        selected.properties.PARCELA_NUMERO = targetNumber;
        if (occupied) occupied.properties.PARCELA_NUMERO = previousNumber;
        this.syncGeometryToParcelRows({ createMissing: true });
        this._persist();
        this._notify('geojson:parcel-number', this._state.geojson, null);
        return true;
    }
    
    /**
     * Limpia todo el estado
     */
    clear() {
        this._state.geojson = null;
        this._state.excelData = [];
        this._state.validationResults = null;
        this._state.pendingCallback = null;
        this._state.sourceGeoFileName = '';
        this._state.sourceDataFileName = '';
        this._state.parcelLineage = [];
        this._state.projectVersions = [];
        localStorage.removeItem(EXPEDIENTE_STORAGE_KEY);
        
        this._notify('clear', null, null);
    }

    setBackendToken(token) {
        this.backend.token = token || '';
        this._persistBackendMeta();
    }

    getBackendToken() {
        return this.backend.token;
    }

    setBackendUser(user) {
        this.backend.user = user || null;
        this._persistBackendMeta();
    }

    getBackendUser() {
        return this.backend.user;
    }

    setBackendProject(projectId) {
        this.backend.currentProjectId = projectId || '';
        this._persistBackendMeta();
    }

    getBackendProject() {
        return this.backend.currentProjectId;
    }

    setBackendTempProject(isTemp) {
        this.backend.tempProject = isTemp ? '1' : '';
        this._persistBackendMeta();
    }

    isBackendTempProject() {
        return this.backend.tempProject === '1';
    }

    setBackendExpediente(expedienteId) {
        this.backend.currentExpedienteId = expedienteId || '';
        this._persistBackendMeta();
    }

    getBackendExpediente() {
        return this.backend.currentExpedienteId;
    }

    async syncToBackend() {
        const token = this.getBackendToken();
        if (!token) return false;
        const expedienteId = this.getBackendExpediente();
        if (!expedienteId) return false;
        try {
            const baseUrl = this.backend.baseUrl.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/api/expedientes/${expedienteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    state_json: {
                        geojson: this._state.geojson,
                        excelData: this._state.excelData,
                        projection: this._state.projection,
                        currentDisplayProjection: this._state.currentDisplayProjection,
                        parcelLineage: this._state.parcelLineage,
                        projectVersions: this._state.projectVersions
                    }
                })
            });
            return response.ok;
        } catch (e) {
            logger.warn('No se pudo sincronizar con el backend:', e.message);
            return false;
        }
    }

    async loadFromBackend(expedienteId) {
        const token = this.getBackendToken();
        if (!token || !expedienteId) return null;
        try {
            const baseUrl = this.backend.baseUrl.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/api/expedientes/${expedienteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (data.state) {
                this._state.geojson = data.state.geojson || null;
                this._state.excelData = Array.isArray(data.state.excelData) ? data.state.excelData : [];
                this._state.projection = data.state.projection || 'EPSG:32721';
                this._state.currentDisplayProjection = data.state.currentDisplayProjection || 'EPSG:32721';
                this._state.parcelLineage = Array.isArray(data.state.parcelLineage) ? data.state.parcelLineage : [];
                this._state.projectVersions = Array.isArray(data.state.projectVersions) ? data.state.projectVersions : [];
                this._state.validationResults = data.validation_results || null;
                this._persist();
                this._notify('geojson', this._state.geojson, null);
                this._notify('excelData', this._state.excelData, null);
                this._notify('validationResults', this._state.validationResults, null);
                this.setBackendExpediente(expedienteId);
                this.setBackendProject(data.project_id || '');
                return data;
            }
            return null;
        } catch (e) {
            logger.warn('No se pudo cargar desde el backend:', e.message);
            return null;
        }
    }
}

// Exportar instancia única (Singleton)
export const State = new StateManager();
window.State = State;
