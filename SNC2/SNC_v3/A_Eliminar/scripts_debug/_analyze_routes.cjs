// Analiza server-api.js para identificar endpoints que devuelven JSON.
const fs = require('fs');
const code = fs.readFileSync('server-api.js', 'utf8');

// Encuentra todos los app.get/post/put/patch/del con su callback
const routePattern = /app\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,/g;
let m;
const routes = [];
while ((m = routePattern.exec(code)) !== null) {
  routes.push({ method: m[1], path: m[2], pos: m.index });
}

// Para cada route, buscar su handler y ver si retorna JSON con campos JSON
for (const r of routes) {
  const segment = code.slice(r.pos, r.pos + 5000);
  const endSegment = code.slice(r.pos, r.pos + 10000);
  // Buscar expresiones res.json
  const jsonReturn = endSegment.match(/res\.json\s*\(\s*([^)]+(?:\([^)]*\)[^)]*)*)\s*\)/g);
  if (jsonReturn) {
    r.returns = jsonReturn.map(j => j.slice(9, -1).trim());
  }
}

// Filtrar los que envuelven expediente o planes u otros objetos
console.log(JSON.stringify(routes.filter(r => r.returns), null, 2));