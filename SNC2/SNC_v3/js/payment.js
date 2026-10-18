const { logger } = require('./logger.js');
const express = require('express');
const router = express.Router();

// --- SIMULACIÓN DE BASE DE DATOS DE USUARIOS ---
// En un entorno real, esto sería una base de datos (PostgreSQL, MongoDB, etc.)
// y tendrías un modelo de usuario con un campo 'plan'.
// Por ahora, usamos un objeto en memoria para demostrar la lógica.
const users = {
    'usuario_ejemplo@dominio.com': { id: 'user123', email: 'usuario_ejemplo@dominio.com', plan: 'FREE' },
    // Agrega más usuarios de prueba si es necesario
};
// --- FIN SIMULACIÓN ---

/**
 * Endpoint para recibir webhooks de Red Tiket Paraguay.
 * Red Tiket enviará una notificación POST a esta URL cuando una transacción cambie de estado.
 *
 * URL de ejemplo: POST /api/webhook/redtiket
 */
router.post('/redtiket', (req, res) => {
    logger.debug('Webhook de Red Tiket recibido:', req.body);

    const {
        transaction_id,
        status, // 'completed', 'pending', 'failed', 'cancelled'
        amount,
        currency,
        customer_email,
        product_id, // ID del producto/plan que configuraste en Red Tiket (ej: 'catastro_pro_plan')
        // Otros campos que Red Tiket pueda enviar, como una firma de seguridad
    } = req.body;

    // 1. **Validación de seguridad (CRÍTICO)**
    // Red Tiket DEBE proporcionar un mecanismo para verificar la autenticidad del webhook.
    // Esto podría ser una clave secreta compartida, una firma HMAC en los headers, etc.
    // ¡NO USAR EN PRODUCCIÓN SIN ESTA VALIDACIÓN!
    // Ejemplo (si Red Tiket envía una clave en un header 'x-redtiket-secret'):
    const REDTIKET_WEBHOOK_SECRET = process.env.REDTIKET_WEBHOOK_SECRET || 'tu_clave_secreta_de_redtiket';
    if (req.headers['x-redtiket-secret'] !== REDTIKET_WEBHOOK_SECRET) {
        logger.warn('Webhook de Red Tiket: Clave secreta no coincide o falta. Posible intento no autorizado.');
        return res.status(403).json({ message: 'Unauthorized webhook request' });
    }

    // 2. **Procesar el estado de la transacción**
    if (status === 'completed' || status === 'success') {
        const targetPlan = product_id === 'catastro_pro_plan' ? 'PRO' : 'FREE'; // Ajusta 'catastro_pro_plan' al ID real de tu producto en Red Tiket

        if (!customer_email) {
            logger.error('Webhook de Red Tiket: Email del cliente no proporcionado en el payload.');
            return res.status(400).json({ message: 'Customer email missing' });
        }

        // 3. **Actualizar el plan del usuario en tu base de datos**
        const user = users[customer_email]; // Simulación: buscar usuario por email
        if (user) {
            user.plan = targetPlan; // Actualizar el plan del usuario
            logger.debug(`✅ Plan de usuario ${customer_email} actualizado a ${targetPlan} (Transacción: ${transaction_id}).`);
            // En un sistema real, aquí guardarías el cambio en la base de datos.
            // También podrías enviar un email de confirmación al usuario.
            return res.status(200).json({ message: 'Payment processed successfully, user plan updated.' });
        } else {
            logger.warn(`Webhook de Red Tiket: Usuario con email ${customer_email} no encontrado en la base de datos.`);
            // Podrías crear un nuevo usuario aquí si el pago es para un nuevo registro.
            return res.status(404).json({ message: 'User not found in system' });
        }
    } else {
        logger.debug(`Webhook de Red Tiket: Transacción ${transaction_id} con estado "${status}". No se requiere acción de activación.`);
        return res.status(200).json({ message: `Payment status ${status}, no plan change.` });
    }
});

module.exports = router;