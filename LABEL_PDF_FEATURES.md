# Funcionalidades de Impresión PDF de Etiquetas

## Resumen de Cambios

Se han implementado las siguientes mejoras al sistema de etiquetas:

### 1. Generación de PDFs
- **Antes**: Las etiquetas se imprimían usando `window.print()` con HTML básico
- **Ahora**: Todas las etiquetas se generan en formato PDF usando `jspdf` y `html2canvas`
- **Beneficios**: Mayor consistencia en la impresión, mejor calidad, y capacidad de guardar/archivar

### 2. Previsualizador de Impresión en el Diseñador Visual
- Nueva pestaña "Previsualización PDF" en el diseñador de etiquetas
- Permite seleccionar productos y configurar cantidades para pruebas
- Muestra vista previa en tiempo real de cómo se verán las etiquetas en PDF
- Opciones para descargar PDF o imprimir directamente

### 3. Vista Previa en Página de Impresión por Lote
- Nuevo botón "Vista Previa PDF" en la página de impresión de etiquetas
- Abre un diálogo con el mismo previsualizador del diseñador
- Permite verificar el diseño antes de generar el PDF final

## Componentes Nuevos

### `labelPdfGenerator.ts`
- Servicio principal para generar PDFs de etiquetas
- Convierte el diseño visual a HTML y luego a PDF
- Maneja códigos de barras y códigos QR
- Soporta múltiples etiquetas por producto

### `PrintPreview.tsx`
- Componente de previsualización de impresión
- Selector de productos con búsqueda
- Configuración de cantidades
- Vista previa en iframe
- Botones para descargar/imprimir PDF

## Uso

### En el Diseñador Visual
1. Ve a **Admin > Settings > Label Designer**
2. Diseña tu etiqueta usando el editor visual
3. Haz clic en la pestaña **"Previsualización PDF"**
4. Agrega productos y configura cantidades
5. Revisa la vista previa en tiempo real
6. Descarga o imprime el PDF

### En Impresión por Lote
1. Ve a **Admin > Labels**
2. Busca y agrega productos a la lista
3. Configura las cantidades deseadas
4. Haz clic en **"Vista Previa PDF"** para revisar
5. Usa **"Generar e Imprimir PDF"** para el resultado final

## Características Técnicas

### Generación de PDF
- Usa `jspdf` para crear el documento PDF
- Usa `html2canvas` para convertir HTML a imagen
- Preserva todas las fuentes (incluyendo Gilroy)
- Mantiene la calidad de códigos de barras y QR

### Previsualización
- Renderizado en iframe sandbox para seguridad
- Actualización en tiempo real con debounce
- Límite de etiquetas para rendimiento (máx 2 por producto en preview)
- Soporte para todos los elementos visuales

### Compatibilidad
- Funciona con navegadores modernos
- Fallback para ventanas emergentes bloqueadas
- Descarga automática si la impresión directa falla

## Mejoras de UX

1. **Consistencia**: Todos los PDFs tienen el mismo formato y calidad
2. **Previsualización**: Los usuarios pueden verificar antes de imprimir
3. **Flexibilidad**: Opción de descargar o imprimir directamente
4. **Rendimiento**: Previsualización limitada para mantener velocidad
5. **Errores**: Manejo robusto de errores con mensajes claros

## Configuración

No se requiere configuración adicional. Las funcionalidades están integradas directamente en el flujo existente de etiquetas.

## Notas

- Las etiquetas se generan usando el diseño visual guardado
- Es necesario tener un diseño visual guardado para generar PDFs
- Los productos se cargan automáticamente en el previsualizador
- Los PDFs incluyen fecha y hora de generación en el nombre del archivo