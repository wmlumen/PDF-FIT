# 📘 Manual del Sistema de Examen Virtual – Instituto Superior Centuria

## Descripción General

Sistema de examen virtual interactivo para cursos del **INSTITUTO SUPERIOR EN CIENCIAS EMPRESARIALES Y ADMINISTRATIVAS "CENTURIA"**. Totalmente adaptable a cualquier institución educativa.

El examen se administra completamente en línea mediante un archivo HTML que funciona en cualquier navegador moderno sin necesidad de instalar software adicional.

---

## Características del Sistema

| Característica | Descripción |
|----------------|-------------|
| **Tiempo** | Definido por el docente desde el panel (10-180 minutos) |
| **Puntaje total** | Configurable (ejemplo: 20 puntos) |
| **Intentos máximos** | 3 por alumn@ |
| **Aleatorización** | Preguntas en orden aleatorio en cada intento |
| **Matriz de resultados** | Muestra aciertos/errores por sección |
| **Acta de calificación** | Descargable en PNG con código QR |
| **Panel del docente** | Control en tiempo real |
| **Mejor nota** | El mejor de 3 intentos queda como nota final |
cuando genere el acta, para bajar, que tambien le de la opcion de imprimir y si baja o imprime se cierra automaticamente. 

---

## Estructura del Examen (Editable)

| Sección | Tipo | Puntos |
|---------|------|--------|
| I | Selección Múltiple | 5 puntos (1 cada) |
| II | Verdadero/Falso | 5 puntos (1 cada) |
| III | Definiciones | 5 puntos (1 cada) |
| IV | Estudio de Caso | 5 puntos |

> **Nota:** El docente puede modificar las secciones y puntajes directamente en el archivo HTML según la materia.

---

## Accessos Especiales

| Cédula | Función |
|--------|---------|
| 99 | Modo prueba (no se guarda) |
| 20262026 | Panel del docente |

---

## Cómo Usar el Sistema

### 1. Preparación del Examen

1. Descargue el archivo `EXAMEN_SOCIOLOGIA_V5.html`
2. Ábralo en un navegador (Chrome, Edge, Firefox, Safari)
3. El sistema funciona sin internet después de cargar las librerías

### 2. Ingreso del Alumn@

El alumn@ debe completar:
- **Cédula de Identidad** (número sin puntos ni guiones)
- **Nombre y Apellido completos**

Al presionar "COMENZAR EXAMEN":
- Inicia automáticamente el temporizador
- Los datos del alumn@ desaparecen de la pantalla para mayor privacidad

### 3. Durante el Examen

- Las preguntas están numeradas
- Las respuestas de selección y verdadero/falso tienen casillas de selección
- Las definiciones y casos requieren respuesta escrita
- El temporizador aparece en la esquina superior derecha
- Se muestra en ROJO cuando quedan menos de 5 minutos

### 4. Finalización del Examen

Al presionar "FINALIZAR EXAMEN":
- Se muestra el **puntaje obtenido**
- Se muestra el **porcentaje**
- Se muestra la **matriz de respuestas** (aciertos por sección)
- Se muestran botones para:
  - **Descargar Acta** (como imagen PNG)
  - **Imprimir** (para registro manual)
  - **Salir**

### 5. Recuperar Acta

Si el alumn@ cerró la página sin descargar el acta:
1. Reingrese con la misma cédula
2. El sistema mostrará el resultado guardado

---

## Panel del Docente

### Acceso

Ingrese con la cédula **20262026**. El sistema le pedira:
- Su nombre completo
- Su número de cédula

### Funciones del Panel

| Función | Descripción |
|---------|-------------|
| **Configurar tiempo** | Cambiar duración del examen (10-180 min) |
| **Exportar Planilla PDF** | Genera PDF con todos los resultados |
| **Ver lista de alumn@s** | Muestra entregas en tiempo real |
| **Ver detalle** | Consulta todos los intentos y matriz |
| **Eliminar resultados** | Con justificación obligatoria |
| **Limpiar todo** | Borra todos los datos |

### Información del Panel

- Total de alumn@s únicos
- Promedio general de notas
- Mejor puntaje de cada alumn@
- **Todos los intentos** (1/3, 2/3, 3/3)
- **Matriz de respuestas** del mejor intento
- **Historial de eliminaciones** con justificaciones
- Dispositivo y navegador usados

### Exportar Planilla PDF

Al presionar el botón **"Exportar Planilla PDF"**:
- Se genera un documento con:
  - Encabezado institucional
  - Fecha de exportación
  - Nombre del docente
  - Tabla con todos los alumn@s:
    - Número
    - Cédula
    - Nombre y Apellido
    - Fecha
    - Hora
    - Mejor Nota
    - Porcentaje
    - Intentos realizados
    - Dispositivo usado
  - Promedio general de la clase
- Examen Individual de cada alumno y donde fallo.

---

## Estilos Institucionales (CSS)

El sistema utiliza los siguientes colores y fuentes institucionales:

```css
:root {
    --color-primario: #2c5d3d;       /* Verde Centuria */
    --color-acento: #c5a059;         /* Dorado */
    --color-fondo: #ffffff;          /* Blanco */
    --color-texto: #333333;          /* Gris oscuro */
    --fuente-principal: 'Montserrat', sans-serif;
    --fuente-secundaria: 'Roboto', sans-serif;
}

.btn-centuria {
    background-color: var(--color-primario);
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
}

.btn-centuria:hover {
    background-color: var(--color-acento);
    cursor: pointer;
}
```

---

## Datos Técnicos

### Almacenamiento

- **localStorage:** Los datos se guardan en el navegador del alumn@
- **Persistencia:** Los datos permanecen aunque se cierre el navegador
- **Navegador específico:** Cada navegador tiene sus propios datos

### Claves de almacenamiento

| Clave | Descripción |
|-------|-------------|
| `examResults` | Resultados de exámenes |
| `deletedResults` | Historial de eliminaciones |
| `examTime` | Tiempo configurado del examen |
| `teacherName` | Nombre del docente |

---

## Requisitos del Sistema

- Navegador moderno (Chrome, Edge, Firefox, Safari)
- JavaScript habilitado
- Acceso a internet la primera vez (para cargar librerías)

---

## Solución de Problemas

### El examen no carga
- Verificar que JavaScript esté habilitado
- Actualizar el navegador a la última versión
- Verificar conexión a internet (primera vez)

### No puedo descargar el acta
- Verificar que no tenga bloqueo de ventanas emergentes
- Permitir descargas del navegador
- Si no baja, usar el botón **"Imprimir"** para registrar manualmente

### Los datos no aparecen en el panel del docente
- Usar el mismo navegador que usaron los alumn@s
- Verificar que localStorage no esté bloqueado

### Error al guardar configuración
- Recargar la página e intentar nuevamente

---

## Notas para el Docente

### copias de seguridad
Los datos están en el navegador. Se recomienda **NO** limpiar la cache durante el examen.

### Integridad académica
Cada intento se registra con:
- Dispositivo usado
- Navegador utilizado
- La matriz de respuestas ayuda a identificar patrones de estudio

### Eliminaciones
Cuando elimina un resultado, debe ingresar una justificación. Esta justificación queda registrada y visible en el historial del alumn@.

### Cálculo de promedio
Se calcula solo el **mejor puntaje** de cada alumn@ (no todos los intentos).

### Compatibilidad offline
El sistema puede funcionar sin internet después de cargar las librerías una vez.

---

## Archivos del Paquete

| Archivo | Descripción |
|---------|--------------|
| `EXAMEN_SOCIOLOGIA_V5.html` | Examen principal (20 puntos) |
| `RETRO_U1_SOCIOLOGIA.html` | Retroalimentación Unidad 1 (15 puntos) |
| `PAQUETE_EXAMEN_SOCIOLOGIA.html` | Paquete completo con anexos |
| `INSTRUCTIONS_SOCIO_V5.md` | Este manual |

---

## Personalización del Examen

### Para cambiar las preguntas

Abra el archivo HTML en un editor de texto y busque la sección `examData`:

```javascript
const examData = {
    section1: [
        { q: 'Pregunta 1...', options: ['a) Opción A', 'b) Opción B', 'c) Opción C'], answer: 'a' },
        // Agregue más preguntas...
    ],
    // Continue con las otras secciones...
};
```

### Para cambiar secciones

1. Modify `examData` con las nuevas preguntas
2. Ajuste el puntaje en la función `calcularPuntaje()`
3. Actualice los estilos CSS si es necesario
cuando genere el acta, para bajar, que tambien le de la opcion de imprimir y si baja o imprime se cierra automaticamente. 

---

## Contacto y Soporte

**INSTITUTO SUPERIOR CENTURIA**

*Excelencia Académica*

---

*Documento actualizado: Mayo 2026*
*Versión del sistema: 5.0*