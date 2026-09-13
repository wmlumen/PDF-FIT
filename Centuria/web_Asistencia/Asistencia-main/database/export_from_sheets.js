/**
 * EXPORTAR DESDE GOOGLE SHEETS A MYSQL
 * =====================================
 * Este script descarga los datos de la hoja "Planificacion" 
 * desde Google Sheets y los guarda en MySQL.
 * 
 * USO:
 * 1. Configurar variables de entorno en .env
 * 2. node database/export_from_sheets.js
 * 
 * REQUISITOS:
 * - Node.js instalado
 * - npm install mysql2 dotenv node-fetch
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');

// Configuración desde variables de entorno
const CONFIG = {
    // Google Apps Script
    apiUrl: process.env.GAS_API_URL || '',
    apiKey: process.env.GAS_API_KEY || 'CenturiaApi2024!',
    
    // MySQL
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'centuria_asistencia',
        port: parseInt(process.env.DB_PORT || '3306')
    }
};

async function exportarDesdeSheets() {
    console.log('🚀 Iniciando exportación desde Google Sheets...');
    console.log('📡 API URL:', CONFIG.apiUrl);
    
    let connection;
    
    try {
        // 1. Conectar a MySQL
        console.log('🔌 Conectando a MySQL...');
        connection = await mysql.createConnection(CONFIG.db);
        console.log('✅ Conectado a MySQL');
        
        // 2. Obtener datos desde Google Sheets
        console.log('📥 Descargando datos desde Google Sheets...');
        const url = CONFIG.apiUrl + '?modo=planificaciones&apiKey=' + encodeURIComponent(CONFIG.apiKey);
        
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
        }
        
        const data = await resp.json();
        
        if (!data.planificaciones || data.planificaciones.length === 0) {
            console.log('⚠️ No hay planificaciones para exportar');
            return;
        }
        
        console.log('📊 Planificaciones encontradas:', data.planificaciones.length);
        
        // 3. Insertar/Actualizar en MySQL
        let insertados = 0;
        let actualizados = 0;
        
        for (const p of data.planificaciones) {
            const codigo = p.CODIGO || p.codigo;
            const cedula = String(p.Cedula || p.cedula || '');
            const nombre = p['Nombre y Apellido'] || p.nombre || '';
            const asignatura = p.COD_ASIGNATURA || p.codAsignatura || '';
            const seccion = p.COD_SECCION || p.codSeccion || '';
            const carrera = p.COD_CARRERA || p.codCarrera || '';
            const fechaInicio = formatearFechaSQL(p['Fecha de Inicio'] || p.fechaInicio);
            const fechaCierre = formatearFechaSQL(p['Fecha de Cierre'] || p.fechaCierre);
            const sala = p.SALA || p.sala || '';
            const sede = p.SEDE || p.sede || '';
            const modalidad = p.Modalidad || p.modalidad || '';
            const observaciones = p.Observaciones || p.observaciones || '';
            
            // Verificar si ya existe
            const [existente] = await connection.execute(
                'SELECT id FROM planificaciones WHERE codigo = ?',
                [codigo]
            );
            
            if (existente.length > 0) {
                // Actualizar
                await connection.execute(
                    `UPDATE planificaciones SET 
                        cedula = ?, nombre_apellido = ?, cod_asignatura = ?, 
                        cod_seccion = ?, cod_carrera = ?, fecha_inicio = ?, 
                        fecha_cierre = ?, sala = ?, sede = ?, modalidad = ?, 
                        observaciones = ?, fuente = 'sheets'
                    WHERE codigo = ?`,
                    [cedula, nombre, asignatura, seccion, carrera, 
                     fechaInicio, fechaCierre, sala, sede, modalidad, 
                     observaciones, codigo]
                );
                actualizados++;
            } else {
                // Insertar
                await connection.execute(
                    `INSERT INTO planificaciones 
                    (codigo, cedula, nombre_apellido, cod_asignatura, cod_seccion, 
                     cod_carrera, fecha_inicio, fecha_cierre, sala, sede, 
                     modalidad, observaciones, fuente)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sheets')`,
                    [codigo, cedula, nombre, asignatura, seccion, carrera,
                     fechaInicio, fechaCierre, sala, sede, modalidad, observaciones]
                );
                insertados++;
            }
        }
        
        console.log('✅ Exportación completada');
        console.log('   Insertados:', insertados);
        console.log('   Actualizados:', actualizados);
        console.log('   Total:', insertados + actualizados);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

function formatearFechaSQL(fechaStr) {
    if (!fechaStr) return null;
    
    // Formato ISO: 2026-06-01T03:00:00.000Z
    if (fechaStr.includes('T')) {
        return fechaStr.split('T')[0];
    }
    
    // Formato DD/MM/YYYY
    if (fechaStr.includes('/')) {
        const partes = fechaStr.split('/');
        if (partes.length === 3) {
            return partes[2] + '-' + partes[1] + '-' + partes[0];
        }
    }
    
    // Ya está en formato YYYY-MM-DD
    return fechaStr;
}

// Ejecutar
exportarDesdeSheets();
