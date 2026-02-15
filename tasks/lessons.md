# Lessons

## 2026-02-13 - Next 16 app router pitfalls
- No renderizar `<html>` ni `<body>` en layouts anidados; solo en `src/app/layout.tsx`.
- En rutas dinamicas de Next 16, tratar `params` como async (`Promise`) y resolver con `await` antes de usar `slug/id`.
- En Next 16, `searchParams` tambien puede llegar como `Promise`; resolverlo con `await` antes de leer `page`, `sort` u otros query params.
- Evitar SVG inline de fuentes no verificadas para iconos criticos; preferir iconos de libreria (`lucide-react`) para prevenir errores de `path d`.

## 2026-02-13 - Dependencias peer en integraciones de escaner
- Cuando se agrega `@zxing/browser`, validar de inmediato su peer dependency `@zxing/library` con `npm view`/`npm ls`.
- Ante errores `Module not found` en `node_modules`, confirmar primero faltantes de peer deps antes de tocar codigo de componentes.

## 2026-02-13 - Estabilidad de dev server (Next 16)
- Mantener consistencia entre scripts `dev*`: si se desactiva Turbopack por estabilidad, actualizar tambien `dev:clean` para no reintroducir panics SST.
- Evitar compartir `.next` entre procesos dev/build concurrentes; usar `distDir` separado en desarrollo cuando hay limpiezas automatizadas.

## 2026-02-13 - Cambios visuales guiados por referencia
- Cuando el usuario pida igualar tema/colores a un archivo de referencia (`22desing.html`), usar esa fuente como verdad y actualizar tokens globales antes que estilos ad-hoc por componente.
- Si el usuario pide "identidad visual", no basta con paleta global: aplicar tambien tipografia, espaciado, jerarquia y componentes clave (header, hero, cards, footer).
- Cuando el usuario pida un ajuste puntual de branding (ej. "haz en 2 lineas"), modificar el componente de marca reutilizable primero para propagar el cambio sin tocar cada vista manualmente.
- Si el usuario especifica una separacion exacta de lineas en el logo, respetar literalmente esa composicion de texto y no inferir variantes.
- Cuando el usuario pida "acento" visual en branding, aplicarlo en el elemento principal de marca (ej. palabra clave) sin alterar la legibilidad del lockup.
- Si el usuario pide quitar acento de color, remover TODAS las clases de color del lockup (incluyendo punto final) y dejar solo tipografia/composicion.
- Si el usuario pide "haz más pequeño", priorizar ajuste en el componente reutilizable de logo (escala tipografica), no en cada instancia.
- Si la referencia visual apunta al header, ajustar primero la instancia del header para cambios finos sin desbalancear otras zonas como footer.
- Cuando el usuario señale elementos visuales en captura (ej. "cuadros chicos con icono"), mapear primero al componente exacto antes de tocar estilos globales.
- Verificar coincidencia exacta entre clases utilitarias usadas y definidas (`hide-scrollbar` vs `no-scrollbar`) para no perder comportamiento en mobile.
- Para UX de carrusel móvil, combinar `overflow-x-auto` con `snap-x snap-mandatory` + `snap-start` por item y `touch-pan-x`.

## 2026-02-13 - Limpieza de warnings con restricciones de rutas
- Para reducir ruido en logs, priorizar primero ajustes globales seguros (scripts y config) antes de tocar feature code.
- Si el origen del warning esta en rutas marcadas como "NO MODIFICAR" (`(web)`/`(pos)`), dejar constancia explicita del bloqueo en `tasks/todo.md` y no aplicar cambios ahi sin confirmacion.
- Si un carrusel mobile no desplaza, validar que los items no puedan encogerse (`flex-none`) y usar un track interno `w-max` para forzar overflow horizontal real.
- Si en mobile el swipe de un carrusel mueve la pagina en lugar del track, agregar deteccion de pan horizontal con listeners `touchmove` no pasivos y aplicar `preventDefault` solo cuando `|deltaX| > |deltaY|`.
