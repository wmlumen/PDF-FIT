import fs from 'node:fs';
import path from 'node:path';

const GRAFO_PATH = path.resolve('graphify-out/grafo_dominio.json');
const grafo = JSON.parse(fs.readFileSync(GRAFO_PATH, 'utf8'));

const existingNodeIds = new Set(grafo.nodos.map(n => n.id));
const existingEdgeKeys = new Set(grafo.aristas.map(a => `${a.source}|${a.target}|${a.tipo}`));

const nuevosNodos = [
  // Tablas Catastro Territorio
  {
    id: "tabla:catastro_territorio:departamentos",
    tipo: "tabla",
    nombre: "departamentos",
    archivo: "data/catastro_territorio.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "nombre", "cod_dpto", "capital", "region", "created_at"],
      filas: 18
    }
  },
  {
    id: "tabla:catastro_territorio:distritos_snc",
    tipo: "tabla",
    nombre: "distritos_snc",
    archivo: "data/catastro_territorio.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "cod_dpto", "cod_distrito", "dpto_nombre", "distrito_nombre", "dpto_dist_key", "superficie_oficial_km2", "cdm_padron_tipo", "created_at"],
      filas: 268
    }
  },
  {
    id: "tabla:catastro_territorio:cascos_urbanos",
    tipo: "tabla",
    nombre: "cascos_urbanos",
    archivo: "data/catastro_territorio.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "dpto_cod", "dist_cod", "dpto_nombre", "dist_nombre", "tipo_area", "sub_tipo", "superficie_ha", "fecha_creacion_snc", "geometry_wkt", "created_at"],
      filas: 482
    }
  },
  {
    id: "tabla:catastro_territorio:pout_mades_documentos",
    tipo: "tabla",
    nombre: "pout_mades_documentos",
    archivo: "data/catastro_territorio.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "id_portal", "municipio", "departamento", "anho", "numero_resolucion", "url_portal", "url_pdf", "fecha_descarga", "estado_documento"],
      filas: 36
    }
  },
  {
    id: "tabla:catastro_territorio:barrios_localidades",
    tipo: "tabla",
    nombre: "barrios_localidades",
    archivo: "data/catastro_territorio.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "dpto_cod", "dist_cod", "dpto_nombre", "dist_nombre", "barrio_nombre", "tipo_asentamiento", "geometry_wkt", "created_at"],
      filas: 742
    }
  },
  {
    id: "tabla:catastro_territorio:manzanas_asuncion",
    tipo: "tabla",
    nombre: "manzanas_asuncion",
    archivo: "data/catastro_territorio.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "zona", "manzana", "dpto_cod", "dist_cod", "geometry_wkt", "created_at"],
      filas: 5851
    }
  },
  // Tablas Patentes y Fiscalización
  {
    id: "tabla:patentes_comerciales:locales_comerciales",
    tipo: "tabla",
    nombre: "locales_comerciales",
    archivo: "data/municipal/patentes_comerciales.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "cta_cte", "ruc", "razon_social", "nombre_fantasia", "estado_patente", "rubro", "actividad_especifica", "superficie_comercial_m2", "direccion", "dpto_cod", "dist_cod", "creado_en", "actualizado_en"],
      filas: 6
    }
  },
  {
    id: "tabla:patentes_comerciales:actas_inspeccion",
    tipo: "tabla",
    nombre: "actas_inspeccion",
    archivo: "data/municipal/patentes_comerciales.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "local_id", "cta_cte", "inspector_usuario", "inspector_nombre", "numero_acta", "fecha_inspeccion", "estado_comprobado", "superficie_constatada_m2", "observaciones", "descargo_titular", "resultado", "creado_en"],
      filas: 0
    }
  },
  // Tablas Ciudadano y Notificaciones
  {
    id: "tabla:ciudadano_notificaciones:vinculaciones_cta_cte",
    tipo: "tabla",
    nombre: "vinculaciones_cta_cte",
    archivo: "data/ciudadano_notificaciones.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "usuario_id", "email", "cta_cte", "dpto_cod", "dist_cod", "padron", "telefono_movil", "telefono_normalizado", "notif_whatsapp", "notif_sms", "notif_email", "verificado", "creado_en"],
      filas: 0
    }
  },
  {
    id: "tabla:ciudadano_notificaciones:notificaciones_ciudadano",
    tipo: "tabla",
    nombre: "notificaciones_ciudadano",
    archivo: "data/ciudadano_notificaciones.sqlite",
    linea: 0,
    datos: {
      columnas: ["id", "usuario_id", "cta_cte", "tipo", "titulo", "mensaje", "datos_json", "leida", "enviada_ws", "enviada_sms", "creado_en"],
      filas: 0
    }
  },
  // Endpoints Patentes
  {
    id: "api:GET:/api/v3/municipal/patentes",
    tipo: "endpoint",
    nombre: "GET /api/v3/municipal/patentes",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "GET",
      ruta: "/api/v3/municipal/patentes",
      auth: true,
      admin: false,
      tablas: ["locales_comerciales"],
      pagina: "/municipal/index.html"
    }
  },
  {
    id: "api:GET:/api/v3/municipal/patentes/resumen",
    tipo: "endpoint",
    nombre: "GET /api/v3/municipal/patentes/resumen",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "GET",
      ruta: "/api/v3/municipal/patentes/resumen",
      auth: true,
      admin: false,
      tablas: ["locales_comerciales"],
      pagina: "/municipal/index.html"
    }
  },
  {
    id: "api:GET:/api/v3/municipal/patentes/:id",
    tipo: "endpoint",
    nombre: "GET /api/v3/municipal/patentes/:id",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "GET",
      ruta: "/api/v3/municipal/patentes/:id",
      auth: true,
      admin: false,
      tablas: ["locales_comerciales", "actas_inspeccion"],
      pagina: "/municipal/index.html"
    }
  },
  {
    id: "api:POST:/api/v3/municipal/patentes/inspeccionar",
    tipo: "endpoint",
    nombre: "POST /api/v3/municipal/patentes/inspeccionar",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "POST",
      ruta: "/api/v3/municipal/patentes/inspeccionar",
      auth: true,
      admin: false,
      tablas: ["actas_inspeccion", "locales_comerciales"],
      pagina: "/municipal/index.html"
    }
  },
  // Endpoints Ciudadano
  {
    id: "api:GET:/api/v3/ciudadano/situacion-cta-cte",
    tipo: "endpoint",
    nombre: "GET /api/v3/ciudadano/situacion-cta-cte",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "GET",
      ruta: "/api/v3/ciudadano/situacion-cta-cte",
      auth: false,
      admin: false,
      tablas: ["dnit_cuentas", "locales_comerciales"],
      pagina: "/ciudadano/index.html"
    }
  },
  {
    id: "api:POST:/api/v3/ciudadano/vincular-cta-cte",
    tipo: "endpoint",
    nombre: "POST /api/v3/ciudadano/vincular-cta-cte",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "POST",
      ruta: "/api/v3/ciudadano/vincular-cta-cte",
      auth: true,
      admin: false,
      tablas: ["vinculaciones_cta_cte", "notificaciones_ciudadano"],
      pagina: "/ciudadano/index.html"
    }
  },
  {
    id: "api:GET:/api/v3/ciudadano/mis-parcelas",
    tipo: "endpoint",
    nombre: "GET /api/v3/ciudadano/mis-parcelas",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "GET",
      ruta: "/api/v3/ciudadano/mis-parcelas",
      auth: true,
      admin: false,
      tablas: ["vinculaciones_cta_cte"],
      pagina: "/ciudadano/index.html"
    }
  },
  {
    id: "api:DELETE:/api/v3/ciudadano/desvincular-cta-cte",
    tipo: "endpoint",
    nombre: "DELETE /api/v3/ciudadano/desvincular-cta-cte",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "DELETE",
      ruta: "/api/v3/ciudadano/desvincular-cta-cte",
      auth: true,
      admin: false,
      tablas: ["vinculaciones_cta_cte"],
      pagina: "/ciudadano/index.html"
    }
  },
  {
    id: "api:GET:/api/v3/ciudadano/notificaciones",
    tipo: "endpoint",
    nombre: "GET /api/v3/ciudadano/notificaciones",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "GET",
      ruta: "/api/v3/ciudadano/notificaciones",
      auth: true,
      admin: false,
      tablas: ["notificaciones_ciudadano"],
      pagina: "/ciudadano/index.html"
    }
  },
  {
    id: "api:POST:/api/v3/ciudadano/notificaciones/:id/leida",
    tipo: "endpoint",
    nombre: "POST /api/v3/ciudadano/notificaciones/:id/leida",
    archivo: "server-api.js",
    linea: 0,
    datos: {
      metodo: "POST",
      ruta: "/api/v3/ciudadano/notificaciones/:id/leida",
      auth: true,
      admin: false,
      tablas: ["notificaciones_ciudadano"],
      pagina: "/ciudadano/index.html"
    }
  }
];

let nodosAgregados = 0;
for (const nodo of nuevosNodos) {
  if (!existingNodeIds.has(nodo.id)) {
    grafo.nodos.push(nodo);
    existingNodeIds.add(nodo.id);
    nodosAgregados++;
  }
}

const nuevasAristas = [
  {
    source: "pagina:/municipal/index.html",
    target: "api:GET:/api/v3/municipal/patentes",
    tipo: "consumo",
    descripcion: "js/patentesMunicipalUI.js",
    origen: "grafo-dominio-patentes"
  },
  {
    source: "pagina:/municipal/index.html",
    target: "api:POST:/api/v3/municipal/patentes/inspeccionar",
    tipo: "consumo",
    descripcion: "js/patentesMunicipalUI.js",
    origen: "grafo-dominio-patentes"
  },
  {
    source: "pagina:/ciudadano/index.html",
    target: "api:GET:/api/v3/ciudadano/situacion-cta-cte",
    tipo: "consumo",
    descripcion: "js/ciudadanoNotifUI.js",
    origen: "grafo-dominio-ciudadano"
  },
  {
    source: "pagina:/ciudadano/index.html",
    target: "api:POST:/api/v3/ciudadano/vincular-cta-cte",
    tipo: "consumo",
    descripcion: "js/ciudadanoNotifUI.js",
    origen: "grafo-dominio-ciudadano"
  },
  {
    source: "pagina:/ciudadano/index.html",
    target: "api:GET:/api/v3/ciudadano/notificaciones",
    tipo: "consumo",
    descripcion: "js/ciudadanoNotifUI.js",
    origen: "grafo-dominio-ciudadano"
  },
  {
    source: "api:GET:/api/v3/municipal/patentes",
    target: "tabla:patentes_comerciales:locales_comerciales",
    tipo: "usa",
    descripcion: "Consulta locales comerciales con 5 estados de patente",
    origen: "grafo-dominio-patentes"
  },
  {
    source: "api:POST:/api/v3/municipal/patentes/inspeccionar",
    target: "tabla:patentes_comerciales:actas_inspeccion",
    tipo: "usa",
    descripcion: "Registra acta de fiscalización en terreno",
    origen: "grafo-dominio-patentes"
  },
  {
    source: "api:GET:/api/v3/ciudadano/situacion-cta-cte",
    target: "tabla:patentes_comerciales:locales_comerciales",
    tipo: "usa",
    descripcion: "Informa locales comerciales vinculados a la Cta. Cte.",
    origen: "grafo-dominio-ciudadano"
  },
  {
    source: "api:POST:/api/v3/ciudadano/vincular-cta-cte",
    target: "tabla:ciudadano_notificaciones:vinculaciones_cta_cte",
    tipo: "usa",
    descripcion: "Asocia teléfono y Cta Cte del ciudadano para avisos",
    origen: "grafo-dominio-ciudadano"
  },
  {
    source: "api:GET:/api/v3/ciudadano/notificaciones",
    target: "tabla:ciudadano_notificaciones:notificaciones_ciudadano",
    tipo: "usa",
    descripcion: "Obtiene avisos de vencimientos, fiscalizaciones y catastro",
    origen: "grafo-dominio-ciudadano"
  }
];

let aristasAgregadas = 0;
for (const arista of nuevasAristas) {
  const key = `${arista.source}|${arista.target}|${arista.tipo}`;
  if (!existingEdgeKeys.has(key)) {
    grafo.aristas.push(arista);
    existingEdgeKeys.add(key);
    aristasAgregadas++;
  }
}

fs.writeFileSync(GRAFO_PATH, JSON.stringify(grafo, null, 2), 'utf8');
console.log(`[grafo_dominio] Nodos agregados: ${nodosAgregados}, Aristas agregadas: ${aristasAgregadas}. Total nodos: ${grafo.nodos.length}, Total aristas: ${grafo.aristas.length}`);
