/**
 * runFormsDb.js — Catálogo Estructurado y Base de Datos de Formularios Registrales y Catastrales del RUN
 * Basado en:
 * - Portal Oficial: https://run.gov.py/edgrp_apk/formularios_registrales_run.php
 * - Acordada CSJ N° 1823/2025: Reglamento Técnico Catastro Registral del RUN
 * - Ley N° 7.424/2025: Sistema Nacional Unificado Registral y Catastral (RUN) - Art. 77
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'catastro_cache.db');
const db = new sqlite3.Database(dbPath);

export const RUN_FORMULARIOS_CATALOG = [
  // ── GERENCIA SUPERIOR RUN ──
  {
    codigo: 'RUN-F01',
    direccion: 'Gerencia Superior - RUN',
    titulo: 'Formulario Archivo Índice de Titulares',
    archivoPdf: 'RUN-F01 Formulario Archivo Indice de Titulares.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/RUN-F01%20Formulario%20Archivo%20Indice%20de%20Titulares.pdf',
    plazoMaximoDias: 8,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Art. 39',
    informacionSolicitada: 'Identificación del titular (persona física o jurídica, C.I./RUC), acreditación de interés legítimo, detalle de búsquedas de asientos patrimoniales en todas las dependencias del RUN.',
    camposRequeridos: ['TIPO_PERSONA', 'DOCUMENTO_IDENTIDAD', 'NOMBRE_RAZON_SOCIAL', 'MOTIVO_CONSULTA', 'INTERES_LEGITIMO']
  },

  // ── DIRECCIÓN GENERAL DE CATASTRO Y REGISTRO DE INMUEBLES (DGCRI) ──
  {
    codigo: 'DGCRI-F01',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Solicitud de Certificado Catastral Registral Inmobiliario',
    archivoPdf: 'DGCRI-F01-Solicitud de Certificado Catastral Registral Inmobiliario.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F01-Solicitud%20de%20Certificado%20Catastral%20Registral%20Inmobiliario.pdf',
    plazoMaximoDias: 15,
    diasHabiles: true,
    baseLegal: 'Ley N° 7424/2025 Art. 77; Acordada CSJ N° 1823/2025 Art. 104',
    informacionSolicitada: 'Identificación precisa del inmueble (Finca, Matrícula, CUICR), Padrón/Cta. Cte. Catastral, constancia de pago impuesto inmobiliario, cotejo de plano georreferenciado (WGS84/UTM 21S), liquidación de tasas.',
    camposRequeridos: ['MATRICULA_FINCA', 'PADRON_CTA_CTE', 'CUICR', 'DISTRITO', 'TITULAR', 'PLANO_GEORREFERENCIADO', 'BOLETA_IMPUESTO']
  },
  {
    codigo: 'DGCRI-F02',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Solicitud de Informe Catastral Registral Inmobiliario',
    archivoPdf: 'DGCRI-F02-Solicitud de Informe Catastral Registral Inmobiliario.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F02-Solicitud%20de%20Informe%20Catastral%20Registral%20Inmobiliario.pdf',
    plazoMaximoDias: 15,
    diasHabiles: true,
    baseLegal: 'Ley N° 7424/2025 Art. 77; Acordada CSJ N° 1823/2025 Art. 105',
    informacionSolicitada: 'Información técnico-física y jurídica requerida en origen judicial o administrativo, acreditación de vínculo o legitimación procesal, oficio judicial o resolución administrativa adjunta.',
    camposRequeridos: ['EXPEDIENTE_JUDICIAL_ADMIN', 'JUZGADO_INSTITUCION', 'FINCA_MATRICULA', 'OBJETO_PERICIA', 'INTERES_LEGITIMO']
  },
  {
    codigo: 'DGCRI-F03',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Solicitud de Informe Registral Inmobiliario (Condiciones de Dominio)',
    archivoPdf: 'DGCRI-F03-Solicitud de Informe Registral Inmobiliario.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F03-Solicitud%20de%20Informe%20Registral%20Inmobiliario.pdf',
    plazoMaximoDias: 15,
    diasHabiles: true,
    baseLegal: 'Ley N° 7424/2025 Art. 77; Acordada CSJ N° 1823/2025 Art. 106',
    informacionSolicitada: 'Titularidad registral vigente, gravámenes (hipotecas, usufructos), medidas cautelares (embargos, litis, prohibición de innovar o contratar), restricciones registrales y anotaciones preventivas.',
    camposRequeridos: ['MATRICULA_FINCA', 'DISTRITO', 'SOLICITANTE', 'TIPO_INFORME', 'PAGO_TASA']
  },
  {
    codigo: 'DGCRI-F04',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Formulario Solicitud de Servicios Catastrales',
    archivoPdf: 'DGCRI-F04-Formulario Solicitud de Servicios Catastrales.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F04-Formulario%20Solicitud%20de%20Servicios%20Catastrales.pdf',
    plazoMaximoDias: 15,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Arts. 107 y 108',
    informacionSolicitada: 'Tipo de servicio (valuación/avalúo fiscal, cotejo y registro de planos, rectificación técnica, asignación de nomenclatura, fiscalización técnica de campo), archivo shapefile (SHP, SHX, DBF, PRJ), coordenadas UTM.',
    camposRequeridos: ['TIPO_SERVICIO', 'NOMENCLATURA_CATASTRAL', 'DISPOSITIVO_SHAPEFILE', 'INFORME_PERICIAL', 'PROFESIONAL_MATRICULA']
  },
  {
    codigo: 'DGCRI-F05',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Anexo - Medidas y Linderos Exclusivo para Informes y Certificados',
    archivoPdf: 'DGCRI-F05-Anexo - Medidas y Linderos Exclusivo para Informes y Certificados.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F05-Anexo%20-%20Medidas%20y%20Linderos%20Exclusivo%20para%20Informes%20y%20Certificados.pdf',
    plazoMaximoDias: 15,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Art. 104 y Art. 105',
    informacionSolicitada: 'Linderos perimétricos detallados (Norte, Sur, Este, Oeste), medidas lineales de cada rumbo en metros, colindantes oficiales (Padrón/Finca de linderos), superficie legal y geométrica.',
    camposRequeridos: ['RUMBOS_DISTANCIAS', 'LINDERO_NORTE', 'LINDERO_SUR', 'LINDERO_ESTE', 'LINDERO_OESTE', 'SUPERFICIE_M2']
  },
  {
    codigo: 'DGCRI-F06',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Solicitud de Anotaciones Inmobiliarias',
    archivoPdf: 'DGCRI-F06-Solicitud de Anotaciones Inmobiliarias.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F06-Solicitud%20de%20Anotaciones%20Inmobiliarias.pdf',
    plazoMaximoDias: 20,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo IV',
    informacionSolicitada: 'Rogatoria de medidas cautelares, embargos ejecutivos, inhibiciones, anotación de litis, providencias de no innovar, declaratoria de herederos o servidumbres administrativas.',
    camposRequeridos: ['AUTO_INTERLOCUTORIO_OFICIO', 'JUZGADO_SECRETARIA', 'CARATULA_JUICIO', 'MONTO_EMBARGO', 'INMUEBLES_AFECTADOS']
  },
  {
    codigo: 'DGCRI-F07',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Formulario de Presentación',
    archivoPdf: 'DGCRI-F07-Formulario de Presentación.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F07-Formulario%20de%20Presentaci%C3%B3n.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo II',
    informacionSolicitada: 'Carátula de ingreso formal por mesa de entrada única del RUN: datos del profesional escribano/abogado, número de hojas, escrituras matrices adjuntas, liquidación de tasa judicial.',
    camposRequeridos: ['NUMERO_ENTRADA', 'PROFESIONAL_REGISTRO', 'ESCRITURA_NUMERO_FECHA', 'CANTIDAD_FOJAS', 'RECIBO_TASAS']
  },
  {
    codigo: 'DGCRI-F08',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Minuta de Inscripción',
    archivoPdf: 'DGCRI-F08-Minuta de Inscripción.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F08-Minuta%20de%20Inscripci%C3%B3n.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo II y IV',
    informacionSolicitada: 'Extracto tabular del título: otorgante/transmitente, adquirente/beneficiario, naturaleza del acto (compraventa, donación, adjudicación), precio/monto fiscal, constancia notarial.',
    camposRequeridos: ['TRANSMITENTE_CI_RUC', 'ADQUIRENTE_CI_RUC', 'NATURALEZA_ACTO', 'PRECIO_VALOR_FISCAL', 'NOTARIO_AUTORIZANTE']
  },
  {
    codigo: 'DGCRI-F09',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Minuta de Descripción del Inmueble Urbana - Rural',
    archivoPdf: 'DGCRI-F09-Minuta de Descripción del Inmueble Urbana - Rural.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F09-Minuta%20de%20Descripci%C3%B3n%20del%20Inmueble%20Urbana%20-%20Rural.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Art. 104 y Anexos Técnicos',
    informacionSolicitada: 'Clasificación de zona (urbana o rural), departamento, distrito, paraje/barrio, número de manzana, lote, cuenta corriente o padrón, coordenadas georreferenciadas de vértices.',
    camposRequeridos: ['ZONA_URB_RUR', 'DEPARTAMENTO', 'DISTRITO', 'MANZANA_LOTE', 'PADRON_CTA_CTE', 'SUPERFICIE_TITULO']
  },
  {
    codigo: 'DGCRI-F10',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Minuta de Descripción del Inmueble Por Pisos y Departamentos',
    archivoPdf: 'DGCRI-F10-Minuta de Descripción del Inmueble Por Pisos y Departamentos.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F10-Minuta%20de%20Descripci%C3%B3n%20del%20Inmueble%20Por%20Pisos%20y%20Departamentos.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Régimen de Propiedad Horizontal',
    informacionSolicitada: 'Inmueble matriz, reglamento de copropiedad, unidad funcional/departamento, piso, cochera/baulera, porcentaje de copropiedad en áreas comunes, superficie propia.',
    camposRequeridos: ['INMUEBLE_MATRIZ', 'NUM_UNIDAD_FUNCIONAL', 'PISO_NIVEL', 'PORCENTAJE_INDIVISO', 'SUPERFICIE_PROPIA_M2']
  },
  {
    codigo: 'DGCRI-F11',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Anexo - Adquirente - Transmitente - Condómino',
    archivoPdf: 'DGCRI-F11-Anexo - Adquiriente - Transmitente - Condómino.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F11-Anexo%20-%20Adquiriente%20-%20Transmitente%20-%20Cond%C3%B3mino.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo II',
    informacionSolicitada: 'Detalle ampliado de múltiples titulares: nombre completo, estado civil, cónyuge, régimen patrimonial de bienes, porcentaje indiviso atribuido a cada condómino.',
    camposRequeridos: ['LISTA_CONDOMINOS', 'PORCENTAJE_CUOTA_PARTE', 'ESTADO_CIVIL_REGIMEN', 'DATOS_CONYUGE']
  },
  {
    codigo: 'DGCRI-F12',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Anexo - Medidas y Linderos - Enmiendas - Observaciones - Cláusulas Notariales',
    archivoPdf: 'DGCRI-F12-Anexo - Medidas y Linderos - Enmiendas - Observaciones.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F12-Anexo%20-%20Medidas%20y%20Linderos%20-%20Enmiendas%20-%20Observaciones.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulos II y IV',
    informacionSolicitada: 'Cláusulas resolutorias, pactos comisorios, servidumbres de paso, reservas de usufructo vitalicio, constancias registrales previas y enmiendas notariales autorizadas.',
    camposRequeridos: ['CLAUSULAS_ESPECIALES', 'GRAVAMENES_ASUMIDOS', 'ENMIENDAS_SALVADAS', 'OBSERVACIONES_NOTARIALES']
  },
  {
    codigo: 'DGCRI-F13',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Minuta de Inscripción - Hipotecas - Cesión - Cancelación',
    archivoPdf: 'DGCRI-F13-Minuta de Inscripción - Hipotecas.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F13-Minuta%20de%20Inscripci%C3%B3n%20-%20Hipotecas.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo V (Inscripción y Modificación de Hipotecas)',
    informacionSolicitada: 'Acreedor hipotecario, deudor/constituyente, monto del gravamen (moneda y valor), grado de hipoteca (1°, 2° rango), plazo de la obligación, condiciones de cesión o carta de pago/cancelación.',
    camposRequeridos: ['ACREEDOR_HIPOTECARIO', 'MONTO_GRAVAMEN', 'GRADO_HIPOTECA', 'PLAZO_VENCIMIENTO', 'ACTO_CONSTITUCION_CANCELACION']
  },
  {
    codigo: 'DGCRI-F14',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Inscripción de Bien de Familia',
    archivoPdf: 'DGCRI-F14-Inscripción de Bien de Familia.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F14-Inscripci%C3%B3n%20de%20Bien%20de%20Familia.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Código Civil Paraguayo Art. 2072 y Acordada CSJ N° 1823/2025',
    informacionSolicitada: 'Constituyentes (propietarios cónyuges o convivientes), beneficiarios familiares directos, declaración jurada de afectación exclusiva a vivienda o sustento, avaluó que no sobrepase tope legal.',
    camposRequeridos: ['CONSTITUYENTE', 'BENEFICIARIOS', 'AVALUO_FISCAL_TOPE', 'DECLARACION_AFECTACION_VIVIENDA']
  },
  {
    codigo: 'DGCRI-F15',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Formulario de Documentos Adjuntos',
    archivoPdf: 'DGCRI-F15-Formulario de Documentos Adjuntos.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F15-Formulario%20de%20Documentos%20Adjuntos.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Art. 79 y concordantes',
    informacionSolicitada: 'Índice de recaudos documentales anexados: certificados catastrales, constancias municipales, boletas de pago tributario, personerías jurídicas, poderes y copias autenticadas.',
    camposRequeridos: ['DETALLE_ANEXOS', 'CANTIDAD_ORIGINALES', 'CANTIDAD_COPIAS_AUTENTICADAS', 'FIRMA_RESPONSABLE']
  },
  {
    codigo: 'DGCRI-F16',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Provisión de Copia de Documentos Conexos',
    archivoPdf: 'DGCRI-F16-Provisión de Copia de Documentos Conexos.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F16-Provisi%C3%B3n%20de%20Copia%20de%20Documentos%20Conexos.pdf',
    plazoMaximoDias: 15,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo VII',
    informacionSolicitada: 'Solicitud de copias de planos archivados, informes periciales antecedentes, resoluciones de mensura o títulos matriculados vinculados.',
    camposRequeridos: ['NUMERO_PLANO_ANTECEDENTE', 'EXPEDIENTE_ORIGEN', 'INTERES_LEGITIMO_COPIA']
  },
  {
    codigo: 'DGCRI-F17',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Planilla de Loteo Toma de Razón',
    archivoPdf: 'DGCRI-F17- Planilla de Loteo Toma de Razón.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/DGCRI-F17-%20Planilla%20de%20Loteo%20Toma%20de%20Raz%C3%B3n.pdf',
    plazoMaximoDias: 30,
    diasHabiles: true,
    baseLegal: 'Ley Orgánica Municipal N° 3966/2010 (Art. 235) y Acordada CSJ N° 1823/2025 Art. 107',
    informacionSolicitada: 'Cuadro general de fraccionamiento: cantidad de manzanas y lotes, cesión vial 16%, cesión para plazas y edificios públicos 5%-7%, resolución de homologación de la Junta Municipal, padrones asignados.',
    camposRequeridos: ['RESOLUCION_MUNICIPAL_NUM_FECHA', 'TOTAL_LOTES', 'SUPERFICIE_CESION_VIAL_16', 'SUPERFICIE_CESION_PLAZAS_7', 'PADRONES_INDIVIDUALES']
  },

  // ── MATRICULACIÓN PROFESIONAL ──
  {
    codigo: 'REG-PROF-01',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Registro de Arquitectos e Ingenieros Civiles',
    archivoPdf: 'Registro_de_ arquitectos_e_ingenieros_civiles.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/Registro_de_%20arquitectos_e_ingenieros_civiles.pdf',
    plazoMaximoDias: 10,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Habilitación de Auxiliares de Justicia',
    informacionSolicitada: 'Matriculación profesional para firma de planos de propiedad horizontal y obras: Título universitario registrado ante MEC, registro profesional del MOPC, cédula y domicilio.',
    camposRequeridos: ['TITULO_UNIVERSITARIO', 'REGISTRO_MOPC', 'CEDULA_IDENTIDAD', 'DOMICILIO_LEGAL']
  },
  {
    codigo: 'REG-PROF-02',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Registro de Agrimensores y Topógrafos',
    archivoPdf: 'Registro_de_agrimensores_y_topografos.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/Registro_de_agrimensores_y_topografos.pdf',
    plazoMaximoDias: 10,
    diasHabiles: true,
    baseLegal: 'Ley N° 7424/2025 y Acordada CSJ N° 1823/2025',
    informacionSolicitada: 'Habilitación de peritos agrimensores para levantamiento pericial georreferenciado WGS84/UTM 21S: Título de Agrimensor/Ingeniero Geógrafo, matrícula de la Corte Suprema, firma digital.',
    camposRequeridos: ['MATRICULA_CSJ_AGRIMENSOR', 'REGISTRO_MEC', 'EQUIPOS_GNSS_CALIBRADOS', 'FIRMA_DIGITAL_HABILITADA']
  },

  // ── SOLICITUD DE EXHIBICIÓN REGISTRAL ──
  {
    codigo: 'EXHIB-01',
    direccion: 'Dirección General de Catastro y Registro de Inmuebles',
    titulo: 'Solicitud de Exhibición de Asientos Registrales',
    archivoPdf: 'Solicitud de Exhibicion de Asientos Registrales.pdf',
    urlOficial: 'https://run.gov.py/edgrp_apk/formularios/Solicitud%20de%20Exhibicion%20de%20Asientos%20Registrales.pdf',
    plazoMaximoDias: 5,
    diasHabiles: true,
    baseLegal: 'Acordada CSJ N° 1823/2025, Capítulo V (Publicidad Registral)',
    informacionSolicitada: 'Acceso directo a la vista de tomos y folios físicos registrales o matrices digitalizadas: profesional solicitante, acreditación de interés, número de finca/matrícula.',
    camposRequeridos: ['TOMO_FOLIO_FINCA', 'PROFESIONAL_SOLICITANTE', 'MOTIVO_EXHIBICION']
  }
];

export function initRunFormsDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS run_formularios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        direccion TEXT NOT NULL,
        titulo TEXT NOT NULL,
        archivo_pdf TEXT NOT NULL,
        url_oficial TEXT NOT NULL,
        plazo_maximo_dias INTEGER NOT NULL,
        dias_habiles INTEGER NOT NULL DEFAULT 1,
        base_legal TEXT NOT NULL,
        informacion_solicitada TEXT NOT NULL,
        campos_requeridos TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) return reject(err);

        const stmt = db.prepare(`INSERT OR REPLACE INTO run_formularios 
          (codigo, direccion, titulo, archivo_pdf, url_oficial, plazo_maximo_dias, dias_habiles, base_legal, informacion_solicitada, campos_requeridos)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        for (const f of RUN_FORMULARIOS_CATALOG) {
          stmt.run(
            f.codigo,
            f.direccion,
            f.titulo,
            f.archivoPdf,
            f.urlOficial,
            f.plazoMaximoDias,
            f.diasHabiles ? 1 : 0,
            f.baseLegal,
            f.informacionSolicitada,
            JSON.stringify(f.camposRequeridos)
          );
        }

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) return reject(finalizeErr);
          resolve(RUN_FORMULARIOS_CATALOG.length);
        });
      });
    });
  });
}

export function getRunFormulario(codigo) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM run_formularios WHERE codigo = ?', [codigo], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve({
        ...row,
        campos_requeridos: JSON.parse(row.campos_requeridos || '[]')
      });
    });
  });
}

export function getAllRunFormularios() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM run_formularios ORDER BY id ASC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => ({
        ...r,
        campos_requeridos: JSON.parse(r.campos_requeridos || '[]')
      })));
    });
  });
}
