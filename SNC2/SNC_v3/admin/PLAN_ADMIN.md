# Plan de desarrollo — Administración SNC v3

## A. Super Admin (admin/index.html + js/app-admin.js)

1. Consola Master (dashboard) — KPIs 4 pilares, mapa territorial, accesos a portales. ✔ existente
2. Pilar Profesional (agrimensores) — ✔ UI, ⚠ sin endpoint /api/admin/profesionales (mostrar vacío, no datos inventados)
3. Pilar Municipal (Ley 3966) — ✔ UI parámetros urbanos + dependencias + fiscalización. ⚠ agregar alta/edición de comuna
4. Pilar Notarial (RUN 7.424/25) — ✔ UI, ⚠ sin endpoint /api/admin/notarios
5. Expedientes B2B2G — ✔ UI filtro, ⚠ sin endpoint agregado (usar /api/projects/:id/expedientes)
6. Usuarios globales — ✔ tabla + filtros rol/estado, alta
7. Planes & Finanzas — ✔ tabla + alta/edición de plan y módulos
8. Auditoría & Seguridad — ✔ logs + IPs. ⚠ conectar a logs reales del backend
9. Disposición de mapas/widgets — ✔ editor visual por portal
10. Indicadores VEP/MEF — ✔ 4 vistas (resumen/datos/análisis/admin)

## B. Admin de clientes

- admin/plataforma.html + js/plataformaAdmin.js: alta de clientes (Municipalidad/Gobernación/Institución/Profesional), plan, módulos por ajuste, dependencias, usuarios, pagos, verificación de pagos. ✔ completo
- municipal/admin.html + js/municipioAdmin.js: admin del cliente municipal: plan, módulos, usuarios técnicos/consulta, informar pago. ✔ completo

## C. Gaps a cerrar (prioridad)

1. Endpoints faltantes: /api/admin/profesionales, /api/admin/notarios, /api/admin/expedientes (agregado).
2. Conectar auditoría a logs reales (Node) y control de IP.
3. Alta/edición de comuna en pilar municipal (no solo Piribebuy).
4. Roles admin_cliente para Gobernación e Institución (hoy solo municipal).
5. Verificación de pago automática por Red Ticket (webhook).
6. RLS por tenant (PostgreSQL/PostGIS) — hoy SQLite.

## D. Orden sugerido

1 → 3 → 2 → 5 → 4 → 6