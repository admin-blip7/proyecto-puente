# Lessons

## 2026-03-15 - App macOS en DMG marcada como dañada
- No asumir que un `.dmg` válido implica que el `.app` interno abrirá bien en macOS.
- Cuando empaquete un `.app` manualmente, firmar el bundle completo con `codesign --force --deep --sign - <App.app>` antes de crear el DMG.
- Verificar siempre 3 niveles en macOS: `hdiutil verify`, `hdiutil attach` y `codesign/spctl` sobre el `.app` dentro del volumen montado.

## 2026-03-14 - Escaneo POS con código inexistente
- Si el lector encuentra un barcode que no existe en inventario, no cerrar el flujo con un toast destructivo como único resultado.
- En POS, un código nuevo debe ofrecer una salida operativa inmediata: crear producto con SKU precargado o asociar el barcode a un producto existente.
- Desktop y mobile deben compartir la misma lógica de matching de códigos para evitar que un barcode funcione distinto según el layout.

## 2026-03-14 - Navegación POS mobile y parents con submenú
- Si una vista del POS crea su propio `Sheet` móvil, no usar anchos mínimos tipo `w-24` para un sidebar completo; debe reutilizar el ancho funcional del menú principal para no romper la experiencia mobile.
- En sidebars con items que tienen `subItems`, no convertir el item padre en un trigger no navegable si también tiene `href`; separar explícitamente acción de navegar y acción de expandir.
- Si la UI expone privilegios de admin, la validación server-side debe normalizar también variantes reales del rol como `Master Admin` para evitar permisos aparentes que luego fallan al entrar.

## 2026-03-14 - Identificar la fuente real del menú mobile
- Antes de corregir navegación mobile, verificar qué componente controla realmente esa vista (`LeftSidebar`, `MobileSidebar`, `AdminPageLayout`, etc.); en este proyecto varias pantallas ya migraron a layouts nuevos y una corrección en el sidebar equivocado no arregla el comportamiento visible.
- Si una página especial del POS/admin todavía monta su propio menú móvil, conviene integrarla al layout compartido en vez de mantener un sidebar paralelo.

## 2026-03-14 - Escáner ZXing en diálogos React
- No mezclar en el mismo ciclo de apertura `startScanner()` y cambios de estado que reconfiguren la cámara (`selectedDeviceId`, refresh de devices), porque eso puede abortar el stream mientras ZXing todavía monta el video.
- Para escáneres de cámara en React, usar un token/counter de solicitud activa ayuda a ignorar respuestas async obsoletas y evita que un arranque viejo vuelva a tocar el estado después de un stop/restart.
- Cuando `@zxing/browser` ya expone `BrowserCodeReader.listVideoInputDevices()`, preferirlo sobre flujos manuales inconsistentes para listar cámaras del escáner.

## 2026-03-14 - Lectura de etiquetas 1D en POS
- Si el sistema imprime etiquetas `CODE128`/`EAN13`, no confiar solo en autodetección genérica del lector; configurar `POSSIBLE_FORMATS` explícitos mejora mucho la lectura real.
- Para barcodes 1D finos en cámara móvil, `TRY_HARDER` y un intervalo de reintento más corto suelen ser necesarios aunque la cámara ya esté funcionando.

## 2026-03-14 - UX de escáner: cámara activa no basta
- Si el usuario ve solo el video, interpreta que el lector no está trabajando aunque sí esté decodificando en background.
- Un escáner mobile debe mostrar recuadro, barrido visual y copy corto de alineación para comunicar claramente dónde poner el código.

## 2026-03-10 - Evitar fallos de build por secretos faltantes (Resend/SDKs)
- No instanciar clientes de terceros que requieren API key (ej. `new Resend(...)`) en scope de módulo dentro de rutas o servicios importados en build.
- Mover la inicialización al flujo de ejecución (`handler`/función) y devolver error controlado cuando falte la variable de entorno.
- En APIs opcionales (notificaciones), la ausencia de credenciales debe degradar a `ok: false` sin romper `next build`.

## 2026-03-10 - Fechas de negocio por sucursal (no por dispositivo)
- Si el usuario reporta desfases de día por ubicación (ej. Asia vs México), no usar la zona local del navegador para historiales operativos.
- En módulos multi-sucursal, la fecha de negocio debe derivarse de la zona horaria de la sucursal activa (`branches.timezone`) con fallback explícito.
- Evitar hardcodear una sola zona global cuando el usuario pide comportamiento por ubicación de sucursal.

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

## 2026-02-15 - Regla de precio base en tienda online
- Cuando el usuario especifique fórmula de pricing, no inferir porcentajes adicionales: usar exactamente la fórmula indicada (en este caso, precio base = costo + 15%).
- Si existe "precio socio", aplicar cualquier descuento socio sobre ese precio base explícito y condicionar su activación exactamente como lo pida el usuario (aquí: cantidad exacta de 5 piezas).
- Mantener reglas de envío y pricing en una utilidad central para evitar divergencias entre catálogo, carrito, checkout y páginas informativas.

## 2026-02-15 - Corrección sobre precio regular
- Si el usuario indica explícitamente "no tocar precio regular", nunca sobrescribir `product.price` en servicios ni usar una fórmula para reemplazarlo.
- Separar claramente conceptos: `precio regular` (fuente original) y `precio socio` (calculado con reglas adicionales).
- Al corregir una suposición, ajustar también textos/UI y documentación operativa (`tasks/todo.md`, `project_context.md`) para evitar contradicciones.

## 2026-02-15 - Corrección de fórmula de precio socio
- No aplicar un descuento adicional automático al precio socio si el usuario no lo pidió explícitamente.
- Si la regla declarada es `precio socio = costo + 15%`, el resultado debe ser exacto (ejemplo: costo 20 => socio 23.00), sin multiplicadores extra.

## 2026-03-07 - Validación de módulos de ruta antes de cerrar
- Si el sidebar apunta a una ruta crítica (ej. `/admin/delivery/routes`), validar con HTTP local (`curl`) que responde `200` antes de dar por terminada la tarea.
- Cuando el usuario reporta 404 en producción local, comprobar primero existencia física del árbol `src/app/...` y luego dependencias de servicio/UI.
- En flujos POS->Delivery, no asumir que los campos de envío se capturan; verificar explícitamente el checkout y persistencia en `sales.shipping_info`.

## 2026-03-08 - Diagnóstico iPhone sin dependencia Python
- Si el usuario pide migrar de Python a `libimobiledevice`, no mantener proxy a microservicio externo: ejecutar `idevice*` directamente desde rutas Node/Next.
- Para cerrar correctamente el módulo de diagnóstico, validar siempre 3 niveles: binarios locales (`idevice_id --version`), comandos USB (`idevice_id -l` / `ideviceinfo`), y endpoints de la app (`/api/diagnostics/devices`, `/api/diagnostics/scan`).
- Si no hay iPhone conectado durante la validación, dejarlo explícito y entregar checklist concreto para que el usuario confirme lectura real de UDID desde navegador.

## 2026-03-08 - Salud de batería vs carga actual (iOS 26)
- No usar `BatteryCurrentCapacity` como salud de batería: ese campo representa carga actual (%), no vida útil.
- En iOS recientes, `idevicediagnostics ioregentry AppleSmartBattery` devuelve plist XML anidado; extraer claves con `plutil -extract` para obtener datos reales (`CycleCount`, `DesignCapacity`, `AppleRawMaxCapacity`, etc.).
- Si el usuario valida contra `iPhone Storage` real y hay discrepancia, no confiar por defecto en `TotalDataAvailable`; en este flujo USB el valor que alineó con Ajustes fue `used = TotalDataCapacity` y `free = TotalDiskCapacity - TotalDataCapacity` (con fallback cuando falte la clave).
- Si el código de color es numérico y ambiguo por modelo, evitar un mapeo global incorrecto y usar overrides por `model_id` cuando haya evidencia real del dispositivo.

## 2026-03-08 - Ajustes UI de diagnóstico tras feedback real de dispositivo
- Cuando el usuario reporte que un bloque aparece “No disponible” en UI, validar primero el JSON del endpoint (`/api/diagnostics/scan`) para distinguir si el fallo está en extracción backend o en render frontend.
- En iOS, `Temperature` de `AppleSmartBattery` viene en centésimas de °C (ej. `3259` => `32.59°C`); no aplicar conversión Kelvin.
- Si el hardware (RAM) no está expuesto por USB de forma estable, usar mapeo explícito por `ProductType` y marcarlo como dato de catálogo, no telemetría en vivo.

## 2026-03-08 - Precisión de modelo y capacidad reportada al usuario
- Para almacenamiento mostrado al usuario final, usar base decimal (`GB = 10^9`) para alinear con cómo lo reporta iOS Ajustes; evitar GiB (`1024^3`) en UI comercial.
- Cuando el usuario confirma un modelo real conectado y contradice el mapping interno, priorizar el dato validado en campo y actualizar el mapping (`ProductType -> marketing name` y RAM asociada).
- En piezas, si no hay llaves OEM concluyentes por USB pero tampoco alertas explícitas, mostrar estado “sin alertas detectables por USB” en vez de bloquear toda la sección como desconocida.

## 2026-03-08 - Comparativa multi-herramienta (libimobiledevice vs go-ios)
- Cuando el usuario pida comparar fuentes, agregar un flujo paralelo explícito en UI (botón + panel lado a lado) sin sustituir la fuente principal que ya funciona.
- En integraciones CLI opcionales (`go-ios`), implementar detección de binario y error controlado (`missing tool`) en API/UI en vez de fallar silenciosamente.
- Para comandos de terceros con formato inestable, parsear con estrategia dual (primero JSON, luego texto clave/valor) y exponer salida raw truncada para depuración.

## 2026-03-08 - Extracción completa en go-ios
- En `go-ios`, no usar `--json`: la salida ya es JSON por defecto; agregar esa bandera degrada compatibilidad en algunas versiones.
- Muchos comandos devuelven NDJSON (warnings y luego payload), así que el parser debe aceptar múltiples objetos JSON por línea para no perder datos reales.
- Para “todos los datos posibles”, ejecutar una batería de comandos de lectura y registrar resultado por comando (`ok`, `stderr`, `data`) en vez de depender de una sola fuente.

## 2026-03-08 - Completar batería/piezas en panel go-ios
- En iOS recientes, `ios batteryregistry` puede devolver ceros aunque el dispositivo esté bien; no confiar solo en go-ios para salud/ciclos.
- Si el usuario exige salud/ciclos en comparador go-ios, complementar con lectura USB nativa (`idevicediagnostics AppleSmartBattery`) y publicar esos campos en `go-ios fields`.
- Para color comercial correcto, no mostrar código numérico bruto cuando ya existe mapping confirmado por modelo (ej. `iPhone18,2` + `1` => `Naranja`).

## 2026-03-08 - Cuando pidan “mostrar bloques” de telemetría
- No mostrar solo un JSON gigante; renderizar cada bloque como unidad independiente (nombre + estado + contenido) mejora trazabilidad y revisión rápida.
- Incluir badge de estado por bloque (`OK`/`ERROR`) para distinguir de inmediato qué comandos sí devolvieron datos.

## 2026-03-08 - UX para usuarios no técnicos en diagnóstico
- Si el usuario pide claridad para “cualquiera”, priorizar títulos en lenguaje natural, descripción corta y resumen de valor por bloque.
- Evitar JSON como salida principal de lectura; usarlo solo como soporte opcional cuando sea necesario depurar.

## 2026-03-08 - Desinstalación funcional de integraciones opcionales
- Si el usuario pide “eliminar” una integración opcional (ej. `go-ios`), retirar backend + UI + endpoint completo; no basta con ocultar el botón.
- Después de eliminar una ruta API, validar explícitamente dos cosas: la ruta eliminada devuelve `404` y el flujo principal aún responde `200`.

## 2026-03-08 - DropdownMenu en navegacion persistente
- En Radix, un `DropdownMenu` con subitems debe incluir siempre `DropdownMenuTrigger`; renderizar `DropdownMenuContent` solo no es una composicion valida.
- Cuando un sidebar persistente cambia de ruta, una composicion invalida de `DropdownMenu` puede aparecer como error de hooks/reconciliacion en otra vista, aunque el modulo destino no tenga hooks condicionales.

## 2026-03-08 - Hotfixes de runtime en Next 16
- No dar por resuelto un error de hooks solo porque la ruta responde `200`; para cierres de runtime en cliente hay que aislar o eliminar tambien fronteras cliente/servidor frágiles en la vista afectada.
- En componentes `"use client"`, evitar importar mutaciones o tipos desde módulos marcados con `"use server"` cuando existe una ruta API clara; en Next 16 esto añade complejidad innecesaria y vuelve más opaco el diagnóstico.
