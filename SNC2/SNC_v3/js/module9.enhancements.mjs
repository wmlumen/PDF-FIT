// MÓDULO 9: Notificaciones automáticas e interoperabilidad DGRP/Municipal (R171-R190)
// Requerimientos herranuebras.txt: 171-190

// Extender window.MesaEntrada con notificaciones y funcionalidades adicionales
if (typeof window.MesaEntrada === 'undefined') window.MesaEntrada = {};

/** 
 * Notificar nuevo expediente por correo electrónico al profesional solicitante 
 * @param {Object} expediente - Objeto del expediente
 * @param {Object} configuracion - Configuración de correo { smtpHost, smtpPort, usuario, password }
 */
MesaEntrada.notificarPorCorreo = function(expediente, configuracion) {
    const asunto = 'Nuevo Expediente Catastral Entrado - SNC 551/2023';
    const cuerpo = [
        '<h3>Nuevo Expediente Catastral Entrado</h3>',
        '<p><strong>Número de Entrada:</strong> ' + expediente.id + '</p>',
        '<p><strong>Tipo:</strong> ' + (expediente.tipo || 'Sin tipo') + '</p>',
        '<p><strong>Profesional:</strong> ' + (expediente.nombreProfesional || 'No especificado') + '</p>',
        '<p><strong>Fecha de Entrada:</strong> ' + new Date(expediente.fechaEntrada).toLocaleDateString() + '</p>',
        '<p><strong>Estado Actual:</strong> ' + expediente.estado + '</p>',
        '<hr />',
        '<p>Este es un mensaje automático del Sistema de Catastro Nacional (SNC).</p>'
    ].join('');
    
    // En entorno de desarrollo, mostrar en consola
    if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email simulado para:', expediente.nombreProfesional);
        console.log('Asunto:', asunto);
        console.log('Cuerpo:', cuerpo);
        showToast('Notificación de correo simulada (modo desarrollo)', 'info');
        return true;
    }
    
    // En producción, integrar con servicio de correo real
    // window.EmailService.enviar(asunto, cuerpo, configuracion);
    showToast('Servicio de correo en configuración, consulte al administrador', 'warning');
    return false;
};

/** 
 * Generar CCC (Certificado Catastral Comercial) para interoperabilidad con DGRP
 * @param {Object} expediente - Objeto del expediente
 * @returns {Object} Datos del CCC formateados
 */
MesaEntrada.generarCCC = function(expediente) {
    const propiedades = expediente.geojson && expediente.geojson.features
        ? expediente.geojson.features.map(f => f.properties).filter(p => p)
        : [];
    
    const ccc = {
        id: expediente.id,
        fechaEmision: new Date().toISOString(),
        profesional: expediente.nombreProfesional,
        registroMOPC: expediente.profesionalId,
        tipoExpediente: expediente.tipo || 'Mensura',
        numeroParcales: propiedades.length,
        superficieTotal: propiedades.reduce((sum, p) => sum + (p.SUP_SIG_M || 0), 0),
        descripcion: 'Certificado Catastral Generado por SNC 551/2023',
        validoHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    showToast('CCC generado para interoperabilidad DGRP', 'success');
    return ccc;
};

/** 
 * Generar Resolución Catastral para municipalidad
 * @param {Object} expediente - Objeto del expediente
 * @param {Object} datosMunicipal - Datos municipales { nombreMunicipal, codigoPostal, localidad }
 * @returns {Object} Datos de la resolución formateados
 */
MesaEntrada.generarResolucionMunicipal = function(expediente, datosMunicipal) {
    const resolucion = {
        numero: 'RES-' + expediente.id.substring(4, 13),
        fecha: new Date().toLocaleDateString(),
        profesional: expediente.nombreProfesional,
        registro: expediente.profesionalId,
        expediente: expediente.id,
        municipio: datosMunicipal?.nombreMunicipal || 'Por definir',
        localidad: datosMunicipal?.localidad || 'Por definir',
        tipo: expediente.tipo || 'Mensura',
        estatus: 'PENDIENTE_FIRMA',
        firmas: []
    };
    
    showToast('Resolución municipal generada para ' + (datosMunicipal?.nombreMunicipal || 'municipio'), 'info');
    return resolucion;
};

/** 
 * Buscar expedientes por múltiples criterios
 * @param {Object} filtro - Criterios de búsqueda { tipo, estado, profesional, fechaInicio, fechaFin }
 * @returns {Array} Array de expedientes que coinciden
 */
MesaEntrada.buscarExpedientesAvanzado = function(filtro) {
    const resultados = [];
    const expedientes = Array.from(this.expedientes.values());
    
    return expedientes.filter(expediente => {
        // Filtrar por tipo
        if (filtro.tipo && expediente.tipo !== filtro.tipo) return false;
        
        // Filtrar por estado
        if (filtro.estado && expediente.estado !== filtro.estado) return false;
        
        // Filtrar por rango de fechas
        if (filtro.fechaInicio) {
            const fechaEntrada = new Date(expediente.fechaEntrada);
            if (fechaEntrada < new Date(filtro.fechaInicio)) return false;
        }
        if (filtro.fechaFin) {
            const fechaEntrada = new Date(expediente.fechaEntrada);
            if (fechaEntrada > new Date(filtro.fechaFin)) return false;
        }
        
        // Filtrar por profesional
        if (filtro.profesional && expediente.nombreProfesional 
            && !expediente.nombreProfesional.toLowerCase().includes(filtro.profesional.toLowerCase())) {
            return false;
        }
        
        return true;
    });
};

/** 
 * Dashboard de métricas del Mesa de Entrada
 * @returns {Object} Métricas resumidas
 */
MesaEntrada.obtenerMetricas = function() {
    const expedientes = Array.from(this.expedientes.values());
    
    const total = expedientes.length;
    const porEstado = {
        BORRADOR: 0,
        CON_OBSERVACIONES: 0,
        EN_VISADO: 0,
        FIRMADO: 0,
        ARCHIVADO: 0
    };
    const porTipo = {};
    
    expedientes.forEach(exp => {
        if (porEstado[exp.estado] !== undefined) porEstado[exp.estado]++;
        porTipo[exp.tipo] = (porTipo[exp.tipo] || 0) + 1;
    });
    
    return {
        totalExpedientes: total,
        porEstado,
        porTipo,
        tiempoPromedio: total > 0 ? 
            (expedientes.reduce((sum, e) => {
                return sum + ((new Date() - new Date(e.fechaEntrada)) / (24 * 60 * 60 * 1000));
            }, 0) / total).toFixed(1) + ' días' : '0 días'
    };
};

// Integrar con window.EmailService y window.Portal si están disponibles
if (typeof window.EmailService === 'undefined') {
    window.EmailService = {
        enviar: function(asunto, cuerpo, config) {
            console.log('EmailService.enviar llamado - configurar en producción');
        }
    };
}

if (typeof window.Portal === 'undefined') {
    window.Portal = {
        notificar: function(tipo, datos) {
            console.log('Portal.notificar llamado -', tipo, datos);
        }
    };
}