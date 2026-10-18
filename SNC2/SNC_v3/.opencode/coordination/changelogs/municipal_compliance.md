# Changelog - Municipal Compliance

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

**Status:** pending