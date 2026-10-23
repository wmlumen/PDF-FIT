const Database = require('better-sqlite3');
const db = new Database('/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/data/catastro_cache.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', JSON.stringify(tables.map(t => t.name)));

const count = db.prepare('SELECT COUNT(*) as n FROM parcelas').get();
console.log('Parcela count:', count.n);

const rtree = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='idx_parcelas_geometria'").get();
console.log('R-Tree index exists:', !!rtree);

db.close();
