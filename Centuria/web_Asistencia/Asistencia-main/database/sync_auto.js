/**
 * SINCRONIZACIÓN AUTOMÁTICA PERIÓDICA
 * ===================================
 * Este script ejecuta la sincronización cada X minutos.
 * Ideal para mantener la base de datos local actualizada automáticamente.
 * 
 * USO:
 *   node database/sync_auto.js [intervalo_minutos]
 * 
 * EJEMPLOS:
 *   node database/sync_auto.js        # Cada 5 minutos (default)
 *   node database/sync_auto.js 10     # Cada 10 minutos
 *   node database/sync_auto.js 1      # Cada 1 minuto (para pruebas)
 * 
 * PARAR:
 *   Ctrl + C
 */

const { exec } = require('child_process');
const path = require('path');

const INTERVALO_MINUTOS = parseInt(process.argv[2]) || 5;
const INTERVALO_MS = INTERVALO_MINUTOS * 60 * 1000;

console.log('🔄 SINCRONIZACIÓN AUTOMÁTICA');
console.log('⏱️  Intervalo:', INTERVALO_MINUTOS, 'minutos');
console.log('📁 Script:', path.join(__dirname, 'sync.js'));
console.log('');
console.log('⚠️  Para detener: Ctrl + C');
console.log('');

function ejecutarSync() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Ejecutando sincronización...');
    console.log('🕐', new Date().toLocaleString('es-PY'));
    console.log('='.repeat(60));
    
    const syncPath = path.join(__dirname, 'sync.js');
    
    exec('node "' + syncPath + '"', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }
        
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        
        console.log('\n✅ Sincronización completada');
        console.log('⏳ Próxima ejecución en', INTERVALO_MINUTOS, 'minutos...');
        console.log('🕐', new Date(Date.now() + INTERVALO_MS).toLocaleString('es-PY'));
    });
}

// Ejecutar inmediatamente
ejecutarSync();

// Programar próximas ejecuciones
const intervalId = setInterval(ejecutarSync, INTERVALO_MS);

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n\n👋 Deteniendo sincronización automática...');
    clearInterval(intervalId);
    process.exit(0);
});

process.on('SIGTERM', () => {
    clearInterval(intervalId);
    process.exit(0);
});
