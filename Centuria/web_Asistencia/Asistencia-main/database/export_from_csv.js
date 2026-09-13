/**
 * EXPORTAR DESDE CSV A MYSQL
 * ==========================
 * Este script lee un archivo CSV exportado desde Google Sheets
 * y lo importa a MySQL.
 * 
 * USO:
 * 1. Exportar CSV desde Google Sheets
 * 2. Guardar en: database/data/planificaciones.csv
 * 3. node database/export_from_csv.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'centuria_asistencia',
        port: parseInt(process.env.DB_PORT || '3306')
    }
};

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] || '';
        });
        return obj;
    });
}

async function exportarDesdeCSV() {
    console.log('🚀 Iniciando exportación desde CSV...');
    
    const dataDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(dataDir)) {
        console.log('❌ Creando directorio database/data/');
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const archivos = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    
    if (archivos.length === 0) {
        console.log('❌ No hay archivos CSV en database/data/');
        console.log('💡 Exportar CSV desde Google Sheets y guardar en database/data/');
        return;
    }
    
    let connection;
    
    try {
        console.log('🔌 Conectando a MySQL...');
        connection = await mysql.createConnection(CONFIG.db);
        console.log('✅ Conectado');
        
        for (const archivo of archivos) {
            console.log('\n📄 Procesando:', archivo);
            
            const ruta = path.join(dataDir, archivo);
            const contenido = fs.readFileSync(ruta, 'utf8');
            const planificaciones = parseCSV(contenido);
            
            console.log('   📊 Filas encontradas:', planificaciones.length);
            
            let insertados = 0;
            let actualizados = 0;
            
            for (const p of planificaciones) {
                const codigo = p.CODIGO || p.codigo;
                if (!codigo) continue;
                
                const cedula = String(p.Cedula || p.cedula || '').replace(/\./g, '');
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
                
                const [existente] = await connection.execute(
                    'SELECT id FROM planificaciones WHERE codigo = ?',
                    [codigo]
                );
                
                if (existente.length > 0) {
                    await connection.execute(
                        `UPDATE planificaciones SET 
                            cedula = ?, nombre_apellido = ?, cod_asignatura = ?, 
                            cod_seccion = ?, cod_carrera = ?, fecha_inicio = ?, 
                            fecha_cierre = ?, sala = ?, sede = ?, modalidad = ?, 
                            observaciones = ?, fuente = 'csv'
                        WHERE codigo = ?`,
                        [cedula, nombre, asignatura, seccion, carrera, 
                         fechaInicio, fechaCierre, sala, sede, modalidad, 
                         observaciones, codigo]
                    );
                    actualizados++;
                } else {
                    await connection.execute(
                        `INSERT INTO planificaciones 
                        (codigo, cedula, nombre_apellido, cod_asignatura, cod_seccion, 
                         cod_carrera, fecha_inicio, fecha_cierre, sala, sede, 
                         modalidad, observaciones, fuente)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv')`,
                        [codigo, cedula, nombre, asignatura, seccion, carrera,
                         fechaInicio, fechaCierre, sala, sede, modalidad, observaciones]
                    );
                    insertados++;
                }
            }
            
            console.log('   ✅ Insertados:', insertados);
            console.log('   ✅ Actualizados:', actualizados);
        }
        
        console.log('\n🎉 Exportación completada');
        
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
    
    if (fechaStr.includes('T')) {
        return fechaStr.split('T')[0];
    }
    
    if (fechaStr.includes('/')) {
        const partes = fechaStr.split('/');
        if (partes.length === 3) {
            // DD/MM/YYYY -> YYYY-MM-DD
            if (partes[0].length === 2 && partes[2].length === 4) {
                return partes[2] + '-' + partes[1] + '-' + partes[0];
            }
            return partes[2] + '-' + partes[1] + '-' + partes[0];
        }
    }
    
    return fechaStr;
}

exportarDesdeCSV();
