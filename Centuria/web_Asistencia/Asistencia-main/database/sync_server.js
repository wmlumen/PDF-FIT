/**
 * SINCRONIZACIÓN MANUAL DESDE LA WEB
 * ==================================
 * Este script crea un pequeño servidor web para ejecutar
 * la sincronización desde el navegador.
 * 
 * USO:
 *   node database/sync_server.js
 * 
 * Luego abrir: http://localhost:3000
 * 
 * BOTONES:
 *   - "Sincronizar Ahora" → Ejecuta sync.js
 *   - "Ver Estado" → Muestra última sincronización
 *   - "Iniciar Auto" → Inicia sync_auto.js
 *   - "Detener Auto" → Detiene sync_auto.js
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
let autoSyncProcess = null;

function getLastSync() {
    const file = path.join(__dirname, 'data', '.lastsync');
    if (fs.existsSync(file)) {
        return fs.readFileSync(file, 'utf8');
    }
    return null;
}

function getStatus() {
    const lastSync = getLastSync();
    const autoRunning = autoSyncProcess !== null;
    
    return {
        lastSync: lastSync ? new Date(lastSync).toLocaleString('es-PY') : 'Nunca',
        autoRunning: autoRunning,
        timestamp: lastSync
    };
}

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    if (req.url === '/') {
        const status = getStatus();
        
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Sincronización Centuria</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #0a4d2a; }
        .card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        button { padding: 15px 30px; margin: 10px; font-size: 16px; cursor: pointer; border: none; border-radius: 5px; }
        .sync { background: #0a4d2a; color: white; }
        .auto { background: #2196F3; color: white; }
        .stop { background: #f44336; color: white; }
        .status { background: #4CAF50; color: white; }
        #output { background: #1e1e1e; color: #00ff00; padding: 20px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; min-height: 200px; max-height: 400px; overflow-y: auto; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🔄 Sincronización Centuria</h1>
    
    <div class="card">
        <h3>📊 Estado Actual</h3>
        <p><strong>Última sincronización:</strong> ${status.lastSync}</p>
        <p><strong>Auto-sync:</strong> ${status.autoRunning ? '🟢 Activo' : '🔴 Detenido'}</p>
    </div>
    
    <div class="card">
        <h3>🎛️ Controles</h3>
        <button class="sync" onclick="syncNow()">🔄 Sincronizar Ahora</button>
        <button class="status" onclick="checkStatus()">📊 Ver Estado</button>
        <button class="auto" onclick="startAuto()">▶️ Iniciar Auto (5min)</button>
        <button class="stop" onclick="stopAuto()">⏹️ Detener Auto</button>
    </div>
    
    <div class="info">
        <strong>💡 Tip:</strong> Puedes ejecutar manualmente desde la terminal:<br>
        <code>node database/sync.js</code>
    </div>
    
    <div class="card">
        <h3>📋 Log</h3>
        <div id="output">Esperando acción...</div>
    </div>
    
    <script>
        function log(msg) {
            const output = document.getElementById('output');
            output.textContent += msg + '\n';
            output.scrollTop = output.scrollHeight;
        }
        
        function syncNow() {
            log('🚀 Iniciando sincronización...');
            fetch('/sync').then(r => r.text()).then(t => log(t));
        }
        
        function checkStatus() {
            fetch('/status').then(r => r.json()).then(s => {
                log('📊 Estado: ' + JSON.stringify(s, null, 2));
            });
        }
        
        function startAuto() {
            log('▶️ Iniciando sincronización automática...');
            fetch('/start-auto').then(r => r.text()).then(t => log(t));
        }
        
        function stopAuto() {
            log('⏹️ Deteniendo sincronización automática...');
            fetch('/stop-auto').then(r => r.text()).then(t => log(t));
        }
    </script>
</body>
</html>
        `);
        
    } else if (req.url === '/sync') {
        const syncPath = path.join(__dirname, 'sync.js');
        exec('node "' + syncPath + '"', { timeout: 120000 }, (error, stdout, stderr) => {
            res.end(stdout + '\n' + stderr + (error ? '\nError: ' + error.message : '\n✅ Completado'));
        });
        
    } else if (req.url === '/status') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(getStatus(), null, 2));
        
    } else if (req.url === '/start-auto') {
        if (autoSyncProcess) {
            res.end('⚠️ La sincronización automática ya está activa');
            return;
        }
        
        const autoPath = path.join(__dirname, 'sync_auto.js');
        autoSyncProcess = spawn('node', [autoPath], { 
            detached: true,
            stdio: 'ignore'
        });
        autoSyncProcess.unref();
        
        res.end('✅ Sincronización automática iniciada (cada 5 minutos)');
        
    } else if (req.url === '/stop-auto') {
        if (autoSyncProcess) {
            autoSyncProcess.kill();
            autoSyncProcess = null;
            res.end('✅ Sincronización automática detenida');
        } else {
            res.end('⚠️ No hay sincronización automática activa');
        }
        
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log('🌐 Servidor de sincronización iniciado');
    console.log('📍 http://localhost:' + PORT);
    console.log('');
    console.log('💡 Abre esa URL en tu navegador para controlar la sincronización');
    console.log('⚠️  Para detener: Ctrl + C');
});
