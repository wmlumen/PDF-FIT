# Changelog - Security

## 2026-10-18 - imp_20261018_security_secrets
**Agent:** audit-agent  
**Type:** error_resolved  
**Description:** Rotar secrets críticos y prevenir exposición en repo

```diff
# .gitignore additions
.env
serviceAccountKey.json
*.pem
*.key

# .env.example template (commit this instead)
JWT_SECRET=your_secure_random_string_here
SMTP_PASS=your_smtp_password
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Generate new secrets:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Lesson:** NUNCA committear secrets reales. Usar .env.example como template. Rotar inmediatamente si se filtra.

---

## 2026-10-18 - imp_20261018_repo_hygiene
**Agent:** audit-agent  
**Type:** error_resolved  
**Description:** Eliminar artefactos y archivos temporales del repo

```diff
# .gitignore additions
backup/
temp_*.cjs
temp_*.mjs
temp_*.js
*.log
server.stdout.log
server.stderr.log
graph.html
fluxograma.html
node_modules/
.env
*.sqlite
*.sqlite-*

# Remover del historial si ya committeado:
# git rm -r --cached backup/
# git rm --cached temp_*.cjs graph.html
```

**Lesson:** NUNCA committear build artifacts, temp files, logs, o archivos generados. Configurar .gitignore ANTES del primer commit.

---

## 2026-10-18 - imp_20261018_municipal_postgis
**Agent:** audit-agent  
**Type:** error_resolved  
**Description:** Integrar PostGIS real para validación municipal completa

```diff
# docker-compose.yml para PostGIS
services:
  postgis:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: snc_municipal
      POSTGRES_USER: snc
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgis_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

# sql/init/01_schema.sql
CREATE EXTENSION postgis;
CREATE TABLE parcelas_oficiales (
  id UUID PRIMARY KEY,
  padron VARCHAR(20),
  geom GEOMETRY(Polygon, 32721),
  INDEX idx_geom USING GIST (geom)
);
CREATE TABLE hidrografia_mades (
  id UUID PRIMARY KEY,
  nombre VARCHAR(100),
  tipo VARCHAR(20),
  geom GEOMETRY(MultiLineString, 32721),
  INDEX idx_geom USING GIST (geom)
);

# server-api.js - habilitar PostGIS
const { Pool } = require('pg');
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
export const postgis = { query: (sql, params) => pgPool.query(sql, params) };
```

**Lesson:** Stubs no sustituyen motor espacial real. PostGIS = índices GiST, ST_Intersects, ST_DWithin, ST_Buffer nativos. Es requisito legal para validación municipal.