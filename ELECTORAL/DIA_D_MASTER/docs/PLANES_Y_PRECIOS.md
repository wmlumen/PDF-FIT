# Planes y precios — DIA D MASTER

> ⚠️ Los montos de esta guía son una **propuesta de referencia para discutir**, no precios de mercado investigados.
> Ajustalos según lo que cobra la competencia (consultoras electorales, software de campaña) y tu costo real
> de infraestructura (servidor, SMS/WhatsApp, SMTP). Está en Guaraníes (₲) con una referencia en USD.

## Servicios identificados en el sistema

| # | Servicio | Dónde vive en el código |
|---|----------|--------------------------|
| 1 | Gestión interna de campaña (dirigentes, voto seguro, seguimiento, transporte, asistencia) | `panel_cliente.html`, `dirigente.html`, `app.py` |
| 2 | Autorregistro de votantes por QR | `registro_qr.html` |
| 3 | Branding en la página pública "Dónde Votás" (dominio propio, logo, colores, mensaje) | `consulta_mesa.html` + `branding_activo` |
| 4 | Estadísticas de alcance (consultas recibidas, por depto/distrito/seccional) | `estadisticas_candidato`, `campana_resumen` |
| 5 | Notificaciones de bienvenida/acceso por email y SMS/WhatsApp | `enviar_bienvenida_cliente` |
| 6 | Promoción de un candidato por parte de un dirigente independiente (cualquier partido/lista) | **Pendiente de definir el mecanismo exacto** — ver nota al final |
| 7 | Soporte / administración (reseteo de claves, alta de cuentas, etc.) | `admin_usuarios.html` |

---

## Plan Básico (incluido / gratuito)

Para cualquier cliente (candidato/PC) que se registra en el sistema.

- Login y panel propio (`panel_cliente.html`).
- Alta y gestión de dirigentes y sub-dirigentes.
- Seguimiento de "voto seguro" / posibles votos.
- Autorregistro de simpatizantes por QR (sin publicidad).
- Página pública "Dónde Votás" genérica (sin marca de ningún candidato).
- Módulo de transporte y solicitudes de recogida.
- **Costo sugerido: ₲0** (es el "anzuelo" para que usen el sistema; se monetiza con los add-ons de abajo).

---

## Add-on 1: Branding de campaña ("Dónde Votás" con tu marca)

Lo que ya implementamos con `branding_activo`, `dominio`, `logo_url`, `mensaje_publicitario`.

- El candidato compra/apunta su propio dominio.
- La página pública de consulta de mesa se ve con su logo, colores y mensaje.
- Incluye el conteo de "personas que vieron tu nombre" (estadísticas por departamento/distrito).

| Plan | Incluye | Precio sugerido/mes | Precio sugerido/ciclo electoral (~4 meses) |
|------|---------|----------------------|----------------------------------------------|
| **Branding Seccional** | 1 dominio, branding básico (logo + color) | ₲150.000 (~US$ 20) | ₲500.000 (~US$ 68) |
| **Branding Distrital/Municipal** | + mensaje publicitario personalizable, estadísticas detalladas | ₲300.000 (~US$ 41) | ₲1.000.000 (~US$ 135) |
| **Branding Departamental/Nacional** | + soporte prioritario, múltiples mensajes rotativos | ₲600.000 (~US$ 81) | ₲2.000.000 (~US$ 270) |

El precio sube con el nivel/alcance porque más gente va a ver esa página (más tráfico = más valor).

---

## Add-on 2: Notificaciones (email + SMS/WhatsApp)

Cubre el costo real de los proveedores (Twilio, SMTP) más un margen.

| Plan | Incluye | Precio sugerido |
|------|---------|------------------|
| **Pack 500 mensajes** | 500 SMS/WhatsApp + emails ilimitados (el email es casi gratis) | ₲100.000 (~US$ 14) |
| **Pack 2.000 mensajes** | 2.000 SMS/WhatsApp + emails ilimitados | ₲350.000 (~US$ 47) |
| **Ilimitado (campaña completa)** | Mensajería sin límite preestablecido, con alerta si hay uso anómalo | ₲800.000/mes (~US$ 108) |

Nota técnica: hoy el sistema usa **un solo número/cuenta de Twilio y una sola casilla SMTP para todos los clientes**, no un número propio verificado por candidato (eso lo aclaramos en su momento). Si en el futuro se quiere número propio por candidato, es un plan aparte y más caro (requiere verificación del número ante Twilio/Meta).

---

## Add-on 3: Promoción de candidato por un dirigente independiente

Basado en lo que describiste: un dirigente puede operar con contactos de varios partidos y "apoyar" a un candidato que no es necesariamente el de su cliente actual. Para que ese candidato aparezca en el sistema que el dirigente administra, debería pagar.

**Esto todavía no está implementado** — falta definir el mecanismo técnico exacto (¿el dirigente tiene su propia mini-página? ¿aparece como una opción extra en su panel de carga por cédula? ¿es el candidato o el dirigente quien paga?). Una vez lo definamos armamos el plan real; como referencia de modelo de negocio:

| Plan | Incluye | Precio sugerido |
|------|---------|------------------|
| **Promoción por candidato** | 1 candidato visible en el panel de ese dirigente | ₲50.000–100.000/mes por candidato (~US$ 7–14) |
| **Pack multi-candidato** | Hasta 5 candidatos simultáneos | ₲300.000/mes (~US$ 41) |

---

## Resumen de paquetes combinados (sugerido para vender más fácil)

| Paquete | Qué incluye | Precio sugerido/ciclo electoral |
|---------|-------------|-----------------------------------|
| **Arranque** | Plan Básico solamente | ₲0 |
| **Campaña Local** | Básico + Branding Seccional + Pack 500 mensajes | ₲600.000 (~US$ 81) |
| **Campaña Competitiva** | Básico + Branding Distrital + Pack 2.000 mensajes | ₲1.350.000 (~US$ 182) |
| **Campaña Full** | Básico + Branding Departamental + Mensajería ilimitada + 1 promoción de candidato externo | ₲2.800.000 (~US$ 378) |

---

## Próximos pasos sugeridos

1. Confirmar/ajustar estos montos con lo que cobran competidores o consultoras políticas en Paraguay.
2. Decidir el mecanismo técnico del Add-on 3 (promoción de candidato por dirigente) para poder cobrarlo de verdad.
3. Si se van a cobrar estos planes, hay que construir: una pantalla de facturación/pagos (hoy no existe — los toggles de `branding_activo` los activa un admin manualmente), y decidir el medio de cobro (transferencia, tarjeta, etc.) — **nada de esto está implementado todavía**.
