/**
 * SINCRONIZACIÓN AUTOMÁTICA: Google Sheets → MySQL
 * =================================================
 * Este script sincroniza los datos de la hoja "Planificacion" 
 * en Google Sheets con la base de datos MySQL local.
 * 
 * USO MANUAL:
 *   node database/sync.js
 * 
 * SINCRONIZACIÓN AUTOMÁTICA (cada 5 minutos):
 *   node database/sync_auto.js
 * 
 * Para detener la sincronización automática:
 *   Ctrl + C
 * 
 * REQUISITOS:
 *   npm install mysql2 dotenv node-fetch
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    apiUrl: process.env.GAS_API_URL || '',
    apiKey: process.env.GAS_API_KEY || 'CenturiaApi2024!',
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'centuria_asistencia',
        port: parseInt(process.env.DB_PORT || '3306')
    },
    // Archivo para guardar timestamp de última sincronización
    lastSyncFile: path.join(__dirname, 'data', '.lastsync')
};

class SyncManager {
    constructor() {
        this.connection = null;
        this.stats = {
            insertados: 0,
            actualizados: 0,
            eliminados: 0,
            sinCambios: 0,
            errores: 0
        };
    }

    async conectar() {
        this.connection = await mysql.createConnection(CONFIG.db);
        console.log('✅ Conectado a MySQL');
    }

    async desconectar() {
        if (this.connection) {
            await this.connection.end();
            console.log('🔌 Desconectado de MySQL');
        }
    }

    async obtenerDesdeSheets() {
        console.log('📡 Conectando a Google Sheets...');
        
        const url = CONFIG.apiUrl + '?modo=planificaciones&apiKey=' + encodeURIComponent(CONFIG.apiKey);
        const resp = await fetch(url);
        
        if (!resp.ok) {
            throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
        }
        
        const data = await resp.json();
        
        if (data.error) {
            throw new Error('API Error: ' + data.error);
        }
        
        return data.planificaciones || [];
    }

    async obtenerDesdeMySQL() {
        const [rows] = await this.connection.execute(
            'SELECT * FROM planificaciones'
        );
        return rows;
    }

    async sincronizar() {
        console.log('\n' + '='.repeat(60));
        console.log('🔄 INICIANDO SINCRONIZACIÓN');
        console.log('📅 Fecha:', new Date().toLocaleString('es-PY'));
        console.log('='.repeat(60));

        try {
            // 1. Conectar a MySQL
            await this.conectar();

            // 2. Obtener datos desde Sheets
            const datosSheets = await this.obtenerDesdeSheets();
            console.log('📥 Datos en Sheets:', datosSheets.length);

            if (datosSheets.length === 0) {
                console.log('⚠️ No hay datos para sincronizar');
                return;
            }

            // 3. Obtener datos desde MySQL
            const datosMySQL = await this.obtenerDesdeMySQL();
            console.log('💾 Datos en MySQL:', datosMySQL.length);

            // 4. Crear mapa de códigos en MySQL
            const mapaMySQL = new Map();
            datosMySQL.forEach(row => {
                mapaMySQL.set(row.codigo, row);
            });

            // 5. Procesar cada planificación de Sheets
            const codigosProcesados = new Set();

            for (const p of datosSheets) {
                try {
                    const codigo = p.CODIGO || p.codigo;
                    if (!codigo) continue;

                    codigosProcesados.add(codigo);

                    const datos = {
                        codigo: codigo,
                        cedula: String(p.Cedula || p.cedula || '').replace(/\./g, ''),
                        nombre: p['Nombre y Apellido'] || p.nombre || '',
                        asignatura: p.COD_ASIGNATURA || p.codAsignatura || '',
                        seccion: p.COD_SECCION || p.codSeccion || '',
                        carrera: p.COD_CARRERA || p.codCarrera || '',
                        fechaInicio: this.formatearFecha(p['Fecha de Inicio'] || p.fechaInicio),
                        fechaCierre: this.formatearFecha(p['Fecha de Cierre'] || p.fechaCierre),
                        sala: p.SALA || p.sala || '',
                        sede: p.SEDE || p.sede || '',
                        modalidad: p.Modalidad || p.modalidad || '',
                        observaciones: p.Observaciones || p.observaciones || ''
                    };

                    const existente = mapaMySQL.get(codigo);

                    if (existente) {
                        // Verificar si hay cambios
                        const hayCambios = this.verificarCambios(existente, datos);
                        
                        if (hayCambios) {
                            await this.actualizar(datos);
                            this.stats.actualizados++;
                        } else {
                            this.stats.sinCambios++;
                        }
                    } else {
                        // Nuevo registro
                        await this.insertar(datos);
                        this.stats.insertados++;
                    }
                } catch (err) {
                    console.error('❌ Error procesando:', p.CODIGO || p.codigo, err.message);
                    this.stats.errores++;
                }
            }

            // 6. Marcar como eliminados los que no están en Sheets
            for (const [codigo, row] of mapaMySQL) {
                if (!codigosProcesados.has(codigo)) {
                    await this.marcarEliminado(codigo);
                    this.stats.eliminados++;
                }
            }

            // 7. Guardar timestamp
            this.guardarTimestamp();

            // 8. Mostrar resumen
            this.mostrarResumen();

        } catch (error) {
            console.error('❌ Error en sincronización:', error.message);
            throw error;
        } finally {
            await this.desconectar();
        }
    }

    verificarCambios(existente, nuevo) {
        return (
            existente.cedula !== nuevo.cedula ||
            existente.nombre_apellido !== nuevo.nombre ||
            existente.cod_asignatura !== nuevo.asignatura ||
            existente.cod_seccion !== nuevo.seccion ||
            existente.cod_carrera !== nuevo.carrera ||
            this.formatearFecha(existente.fecha_inicio) !== nuevo.fechaInicio ||
            this.formatearFecha(existente.fecha_cierre) !== nuevo.fechaCierre ||
            existente.sala !== nuevo.sala ||
            existente.sede !== nuevo.sede ||
            existente.modalidad !== nuevo.modalidad ||
            existente.observaciones !== nuevo.observaciones
        );
    }

    async insertar(datos) {
        await this.connection.execute(
            `INSERT INTO planificaciones 
            (codigo, cedula, nombre_apellido, cod_asignatura, cod_seccion, 
             cod_carrera, fecha_inicio, fecha_cierre, sala, sede, 
             modalidad, observaciones, fuente, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sheets', TRUE)`,
            [datos.codigo, datos.cedula, datos.nombre, datos.asignatura, 
             datos.seccion, datos.carrera, datos.fechaInicio, datos.fechaCierre,
             datos.sala, datos.sede, datos.modalidad, datos.observaciones]
        );
    }

    async actualizar(datos) {
        await this.connection.execute(
            `UPDATE planificaciones SET 
                cedula = ?, nombre_apellido = ?, cod_asignatura = ?, 
                cod_seccion = ?, cod_carrera = ?, fecha_inicio = ?, 
                fecha_cierre = ?, sala = ?, sede = ?, modalidad = ?, 
                observaciones = ?, fuente = 'sheets', activo = TRUE,
                fecha_actualizacion = NOW()
            WHERE codigo = ?`,
            [datos.cedula, datos.nombre, datos.asignatura, datos.seccion, 
             datos.carrera, datos.fechaInicio, datos.fechaCierre,
             datos.sala, datos.sede, datos.modalidad, datos.observaciones,
             datos.codigo]
        );
    }

    async marcarEliminado(codigo) {
        await this.connection.execute(
            'UPDATE planificaciones SET activo = FALSE WHERE codigo = ?',
            [codigo]
        );
    }

    formatearFecha(fechaStr) {
        if (!fechaStr) return null;
        
        if (fechaStr.includes('T')) {
            return fechaStr.split('T')[0];
        }
        
        if (fechaStr.includes('/')) {
            const partes = fechaStr.split('/');
            if (partes.length === 3) {
                return partes[2] + '-' + partes[1] + '-' + partes[0];
            }
        }
        
        return fechaStr;
    }

    guardarTimestamp() {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.lastSyncFile, new Date().toISOString());
    }

    obtenerUltimaSync() {
        if (fs.existsSync(CONFIG.lastSyncFile)) {
            return fs.readFileSync(CONFIG.lastSyncFile, 'utf8');
        }
        return null;
    }

    mostrarResumen() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE SINCRONIZACIÓN');
        console.log('='.repeat(60));
        console.log('✅ Insertados:', this.stats.insertados);
        console.log('🔄 Actualizados:', this.stats.actualizados);
        console.log('🗑️  Marcados como eliminados:', this.stats.eliminados);
        console.log('➡️  Sin cambios:', this.stats.sinCambios);
        console.log('❌ Errores:', this.stats.errores);
        console.log('='.repeat(60));
        
        const ultima = this.obtenerUltimaSync();
        if (ultima) {
            console.log('🕐 Última sincronización:', new Date(ultima).toLocaleString('es-PY'));
        }
    }
}

// Ejecutar sincronización
const sync = new SyncManager();
sync.sincronizar().catch(err => {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
});
