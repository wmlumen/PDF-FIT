
## 2026-11-02 - imp_1793578328347_axfy82o8
**Agent:** Claude
**Type:** task_passed
**Description:** A pedido del usuario ('organizar de una forma mas simple el cluster'): crearMarcadorClusterJerarquico() ya no muestra el badge-tag de nivel ni el nombre del distrito/departamento en la pastilla; ahora es solo icono + numero (clase nueva cluster-pin-simple, css/panel-clima.css: padding 4px 6px, border-radius 999px). El nombre y nivel completos quedan en el tooltip/title nativo al pasar el mouse. Pastillas bajaron de hasta 364px a ~70px de ancho fijo. Verificado en vivo (zoom 10, Asuncion/Central, 71 pastillas): el solape severo (>35% de area cubierta) bajo de 43 a 16 pares solo por el cambio de tamano, sin tocar el solape entre capas distintas (eso sigue pendiente, ver nota para Antigravity). npm run lint:encoding OK, node --check OK, sin errores nuevos en consola.

```diff

```
