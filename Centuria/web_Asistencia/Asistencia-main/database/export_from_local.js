/**
 * EXPORTAR DESDE LOCALSTORAGE (JSON) A MYSQL
 * ===========================================
 * Este script lee un archivo JSON exportado desde localStorage
 * y lo guarda en MySQL.
 * 
 * USO:
 * 1. Exportar localStorage desde el navegador:
 *    - Abrir Consola (F12)
 *    - Copiar: copy(JSON.stringify(localStorage.getItem('planificaciones_centuria')))
 *    - Pegar en archivo: database/data/local_planificaciones.json
 * 2. node database/export_from_local.js
 * 
 * REQUISITOS:
 * - Node.js instalado
 * - npm install mysql2 dotenv
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuración MySQL
const CONFIG = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'centuria_asistencia',
        port: parseInt(process.env.DB_PORT || '3306')
    }
};

async function exportarDesdeLocal() {
    console.log('🚀 Iniciando exportación desde localStorage...');
    
    // Buscar archivos JSON en database/data/
    const dataDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(dataDir)) {
        console.log('⚠️ Creando directorio database/data/');
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const archivos = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    
    if (archivos.length === 0) {
        console.log('❌ No hay archivos JSON en database/data/');
        console.log('💡 Instrucciones:');
        console.log('   1. Abrir planificacion.html en el navegador');
        console.log('   2. Abrir Consola (F12)');
        console.log('   3. Ejecutar: copy(localStorage.getItem("planificaciones_centuria"))');
        console.log('   4. Pegar el contenido en: database/data/planificaciones.json');
        return;
    }
    
    console.log('📁 Archivos encontrados:', archivos.join(', '));
    
    let connection;
    
    try {
        // Conectar a MySQL
        console.log('🔌 Conectando a MySQL...');
        connection = await mysql.createConnection(CONFIG.db);
        console.log('✅ Conectado a MySQL');
        
        for (const archivo of archivos) {
            console.log('\n📄 Procesando:', archivo);
            
            const ruta = path.join(dataDir, archivo);
            const contenido = fs.readFileSync(ruta, 'utf8');
            
            let planificaciones;
            try {
                planificaciones = JSON.parse(contenido);
            } catch (e) {
                console.log('   ❌ Error parseando JSON:', e.message);
                continue;
            }
            
            if (!Array.isArray(planificaciones)) {
                console.log('   ❌ El archivo no contiene un array');
                continue;
            }
            
            console.log('   📊 Planificaciones:', planificaciones.length);
            
            let insertados = 0;
            let actualizados = 0;
            
            for (const p of planificaciones) {
                const codigo = p.codigo || p.CODIGO;
                if (!codigo) continue;
                
                const cedula = String(p.cedula || p.Cedula || '');
                const nombre = p.nombre || p['Nombre y Apellido'] || '';
                const asignatura = p.codAsignatura || p.COD_ASIGNATURA || '';
                const seccion = p.codSeccion || p.COD_SECCION || '';
                const carrera = p.codCarrera || p.COD_CARRERA || '';
                const fechaInicio = formatearFechaSQL(p.fechaInicio || p['Fecha de Inicio']);
                const fechaCierre = formatearFechaSQL(p.fechaCierre || p['Fecha de Cierre']);
                const sala = p.sala || p.SALA || '';
                const sede = p.sede || p.SEDE || '';
                const modalidad = p.modalidad || p.Modalidad || '';
                const observaciones = p.observaciones || p.Observaciones || '';
                
                // Verificar si ya existe
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
                            observaciones = ?, fuente = 'local'
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
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local')`,
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
            return partes[2] + '-' + partes[1] + '-' + partes[0];
        }
    }
    
    return fechaStr;
}

// Ejecutar
exportarDesdeLocal();
