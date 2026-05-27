const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar base de datos
require('./db/database').getDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy para obtener IP real detrás de nginx/reverse proxy
app.set('trust proxy', 1);

// Archivos estáticos (dashboard)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/track', require('./api/track'));
app.use('/api/stats', require('./api/stats'));
app.use('/api/projects', require('./api/projects'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 API-Visitas corriendo en http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`📍 Track endpoint: http://localhost:${PORT}/track?project=test`);
  console.log(`📈 Stats API: http://localhost:${PORT}/api/stats/overview?project=test`);
});
