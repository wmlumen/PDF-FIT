const express = require('express');
const router = express.Router();
const { getDb, getProjectId } = require('../db/database');

/**
 * GET /api/stats/overview?project=nombre
 * Estadísticas generales: total, únicos, hoy, esta semana, top páginas
 */
router.get('/overview', (req, res) => {
  const project = req.query.project || 'default';
  const projectId = getProjectId(project);
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0').get(projectId);
  const today = db.prepare("SELECT COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND date(created_at) = date('now')").get(projectId);
  const week = db.prepare("SELECT COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND created_at >= datetime('now', '-7 days')").get(projectId);
  const unique = db.prepare('SELECT COUNT(DISTINCT visitor_hash) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND visitor_hash IS NOT NULL').get(projectId);
  const uniqueToday = db.prepare("SELECT COUNT(DISTINCT visitor_hash) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND date(created_at) = date('now') AND visitor_hash IS NOT NULL").get(projectId);

  // Top páginas
  const topPages = db.prepare('SELECT page, COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND page != "" GROUP BY page ORDER BY count DESC LIMIT 10').all(projectId);

  res.json({
    total: total.count,
    unique_visitors: unique.count,
    today: today.count,
    unique_today: uniqueToday.count,
    this_week: week.count,
    top_pages: topPages
  });
});

/**
 * GET /api/stats/timeline?project=nombre&days=30
 * Visitas por día (últimos N días)
 */
router.get('/timeline', (req, res) => {
  const project = req.query.project || 'default';
  const days = parseInt(req.query.days) || 30;
  const projectId = getProjectId(project);
  const db = getDb();

  const timeline = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count,
           COUNT(DISTINCT visitor_hash) as unique_count
    FROM visits
    WHERE project_id = ? AND is_bot = 0
      AND created_at >= datetime('now', ? || ' days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(projectId, -days);

  res.json({ project, days, timeline });
});

/**
 * GET /api/stats/devices?project=nombre
 * Desglose por navegador, SO, tipo de dispositivo
 */
router.get('/devices', (req, res) => {
  const project = req.query.project || 'default';
  const projectId = getProjectId(project);
  const db = getDb();

  const browsers = db.prepare('SELECT browser, COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND browser != "Unknown" GROUP BY browser ORDER BY count DESC').all(projectId);
  const os = db.prepare('SELECT os, COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0 AND os != "Unknown" GROUP BY os ORDER BY count DESC').all(projectId);
  const devices = db.prepare('SELECT device, COUNT(*) as count FROM visits WHERE project_id = ? AND is_bot = 0 GROUP BY device ORDER BY count DESC').all(projectId);

  res.json({ browsers, os, devices });
});

/**
 * GET /api/stats/locations?project=nombre
 * Datos geográficos para el mapa (país + ciudad con coordenadas)
 */
router.get('/locations', (req, res) => {
  const project = req.query.project || 'default';
  const projectId = getProjectId(project);
  const db = getDb();

  // Por país
  const countries = db.prepare(`
    SELECT country, COUNT(*) as count,
           AVG(lat) as lat, AVG(lon) as lon
    FROM visits
    WHERE project_id = ? AND is_bot = 0 AND country != '' AND lat IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
  `).all(projectId);

  // Por ciudad (para puntos en el mapa)
  const cities = db.prepare(`
    SELECT country, city, region, lat, lon, COUNT(*) as count
    FROM visits
    WHERE project_id = ? AND is_bot = 0 AND city != '' AND lat IS NOT NULL AND lon IS NOT NULL
    GROUP BY country, city
    ORDER BY count DESC
    LIMIT 500
  `).all(projectId);

  res.json({ countries, cities });
});

/**
 * GET /api/stats/recent?project=nombre&limit=20
 * Últimas visitas (tabla)
 */
router.get('/recent', (req, res) => {
  const project = req.query.project || 'default';
  const limit = parseInt(req.query.limit) || 20;
  const projectId = getProjectId(project);
  const db = getDb();

  const recent = db.prepare(`
    SELECT country, city, browser, os, device, page, created_at
    FROM visits
    WHERE project_id = ? AND is_bot = 0
    ORDER BY created_at DESC
    LIMIT ?
  `).all(projectId, limit);

  res.json(recent);
});

module.exports = router;
