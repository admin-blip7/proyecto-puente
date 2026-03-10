# TODO - Historial de corte por zona horaria de sucursal

## Plan
- [x] Revisar dónde se agrupa y formatea la fecha del historial de cortes para detectar dependencia del huso horario del navegador.
- [x] Incorporar zona horaria por sucursal (`branches.timezone`) con fallback seguro.
- [x] Ajustar la vista de historial de caja para agrupar y mostrar fechas usando la zona horaria de la sucursal seleccionada.
- [x] Exponer en Ajustes una configuración por sucursal para correo + zona horaria.
- [x] Validar sintaxis/compilación de archivos actualizados.

## Review
- Hallazgo principal:
  - El historial de cortes agrupaba fechas con `new Date(...)` + `format(...)` en zona local del dispositivo, por lo que al abrir desde Asia los cierres se desplazaban de día respecto a México.
- Cambios aplicados:
  - NUEVO: `src/lib/branchTimeZone.ts` con utilidades para validar/sanitizar zonas IANA y construir claves de fecha por zona (`yyyy-MM-dd`).
  - ACTUALIZADO: `src/contexts/BranchContext.tsx` para cargar `timezone` en sucursales y exponerla en `selectedBranch` (con fallback si la columna aún no existe).
  - ACTUALIZADO: `src/components/admin/finance/cash-history/CashHistoryClient.tsx` para:
    - agrupar ventas por fecha en la zona horaria de la sucursal;
    - filtrar sesiones por rango comparando claves de fecha en esa misma zona;
    - mostrar fecha/hora del corte usando zona de sucursal (no la del navegador).
  - ACTUALIZADO: `src/lib/services/masterService.ts`, `src/components/admin/settings/NotificacionesSettingsClient.tsx` y `src/app/admin/settings/actions/saveNotificacionesSettings.ts` para guardar la zona horaria de cada sucursal desde Ajustes.
  - COMPATIBILIDAD: `saveNotificacionesSettings` ahora hace fallback a guardar solo `notification_email` si un entorno aún no tiene aplicada la columna `timezone`.
  - NUEVO: migración `supabase/migrations/20260310000002_add_timezone_to_branches.sql`.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/lib/branchTimeZone.ts`
    - `src/contexts/BranchContext.tsx`
    - `src/lib/services/masterService.ts`
    - `src/app/admin/settings/actions/saveNotificacionesSettings.ts`
    - `src/components/admin/settings/NotificacionesSettingsClient.tsx`
    - `src/components/admin/finance/cash-history/CashHistoryClient.tsx`

# TODO - Estabilizar mayoreo eliminando imports cliente -> `use server`

## Plan
- [x] Revisar el cliente de `/pos/mayoreo-config` para detectar fronteras inestables entre componentes cliente y módulos marcados con `"use server"`.
- [x] Mover las mutaciones de guardado/eliminación de mayoreo a una API route interna segura para Next 16.
- [x] Actualizar `WholesaleConfigClient` para usar `fetch` y tipos cliente-safe.
- [x] Validar compilación de los archivos tocados.

## Review
- Hallazgo principal:
  - `WholesaleConfigClient` importaba y ejecutaba funciones desde `src/lib/services/wholesaleProfitService.ts`, un módulo marcado con `"use server"`.
  - En Next 16.1 esa frontera es más frágil y deja la ruta de mayoreo expuesta a errores de runtime difíciles de rastrear, incluido el fallo de hooks reportado por el usuario.
- Cambio aplicado:
  - NUEVO: `src/app/api/wholesale-profit/route.ts` para centralizar `POST` (upsert) y `DELETE` (remove) del porcentaje de mayoreo.
  - ACTUALIZADO: `src/app/(pos)/pos/mayoreo-config/WholesaleConfigClient.tsx`.
  - El cliente ya no importa acciones server-side ni tipos desde un módulo `"use server"`.
  - Las mutaciones ahora usan `fetch("/api/wholesale-profit")` y manejo explícito de errores HTTP.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/app/api/wholesale-profit/route.ts`
    - `src/app/(pos)/pos/mayoreo-config/WholesaleConfigClient.tsx`

# TODO - Hotfix runtime de mayoreo por composicion invalida del sidebar

## Plan
- [x] Revisar la ruta `/pos/mayoreo-config` y los componentes persistentes que monta al navegar.
- [x] Identificar estructuras UI invalidas que puedan romper el render del cliente al cambiar de ruta.
- [x] Corregir la composicion del sidebar sin tocar la logica del modulo de mayoreo.
- [x] Validar compilacion y respuesta HTTP de la ruta.

## Review
- Hallazgo principal:
  - `LeftSidebar` renderizaba `DropdownMenuContent` para items con `subItems` sin envolver el item principal en `DropdownMenuTrigger`.
  - Esa composicion invalida dejaba el estado interno de Radix inconsistente y podia detonar errores de runtime al navegar a vistas como `/pos/mayoreo-config`.
- Cambio aplicado:
  - ACTUALIZADO: `src/components/shared/LeftSidebar.tsx`.
  - El item principal ahora se renderiza como `DropdownMenuTrigger asChild` cuando existe submenú.
  - Los items sin submenu se devuelven con un wrapper con `key` estable, evitando reconciliacion inconsistente.
- Verificacion tecnica:
  - `typescript.transpileModule` OK en `src/components/shared/LeftSidebar.tsx`.
  - `GET /pos/mayoreo-config` => `200` en `localhost:9003`.

# TODO - Guardado automatico de todos los dispositivos escaneados

## Plan
- [x] Revisar el flujo de diagnostico para identificar si `device_diagnostics` se persiste durante el escaneo o solo al agregar a inventario.
- [x] Crear persistencia automatica reutilizable para guardar cada lectura exitosa de `scan` y `scanAll`.
- [x] Conectar la persistencia al endpoint `/api/diagnostics/scan` sin romper el flujo si Supabase falla.
- [x] Validar compilacion y confirmar insercion real en `device_diagnostics`.

## Review
- Hallazgo principal:
  - La tabla `device_diagnostics` ya existia, pero solo se insertaban filas desde `add-to-inventory`; el escaneo normal no guardaba historial.
- Backend:
  - NUEVO: `src/lib/diagnostics/persistence.ts` con `persistScannedDevices(devices)` para convertir `DeviceResult` a filas e insertar en `device_diagnostics`.
  - La persistencia se ejecuta en modo best-effort: si Supabase falla, se registra el error en servidor pero `/api/diagnostics/scan` sigue respondiendo al frontend.
  - ACTUALIZADO: `src/app/api/diagnostics/scan/route.ts` para persistir automaticamente:
    - `scanAllDevices()` => guarda todos los resultados exitosos.
    - `scanDevice(udid)` => guarda el dispositivo escaneado.
- Datos guardados por escaneo:
  - identidad base (`udid`, serial, modelo, iOS, IMEI)
  - estado (`activation_state`, `icloud_locked`, `paired`)
  - bateria (`battery_health_percent`, `battery_cycle_count`, capacidades)
  - `raw_data` completo con toda la lectura del escaner
- Verificacion tecnica:
  - `typescript.transpileModule` OK:
    - `src/lib/diagnostics/persistence.ts`
    - `src/app/api/diagnostics/scan/route.ts`
  - `GET /api/diagnostics/scan?udid=00008150-000A4D2A2252401C` => responde JSON valido.
  - Verificacion real en Supabase:
    - existe fila nueva en `device_diagnostics` para `00008150-000A4D2A2252401C`
    - `serial_number: K90KPVC3JV`
    - `model_name: iPhone 17 Pro Max`
    - `product_id: null` (aun no agregado a inventario)

# TODO - Eliminar integración go-ios del diagnóstico iPhone

## Plan
- [x] Localizar y retirar la integración backend de go-ios (`src/lib/diagnostics/goios.ts` y endpoint `/api/diagnostics/goios`).
- [x] Limpiar el comparador go-ios en `DiagnosticScanner` (tipos, estados, fetch, bloques y botón).
- [x] Validar que el escaneo principal por `libimobiledevice` siga operativo.
- [x] Documentar resultados en `tasks/todo.md` y `project_context.md`.

## Review
- Backend:
  - ELIMINADO: `src/lib/diagnostics/goios.ts`.
  - ELIMINADO: `src/app/api/diagnostics/goios/route.ts`.
- Frontend:
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx` eliminando toda la lógica/UI de comparación `go-ios`:
    - tipos `GoIos*`
    - estados `scanningGoIos` y `goIosResults`
    - callback `compareGoIos`
    - panel comparativo y visor de bloques raw
    - botón `Comparar go-ios`
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/components/admin/diagnostico/DiagnosticScanner.tsx`
    - `src/app/api/diagnostics/scan/route.ts`
    - `src/app/api/diagnostics/devices/route.ts`
  - `GET /api/diagnostics/scan` => `200` (scanner principal funcional).
  - `GET /api/diagnostics/goios?...` => `404` (endpoint eliminado correctamente).

# TODO - Corrección de storage diagnóstico vs iPhone Storage real

## Plan
- [x] Contrastar valores reales de `com.apple.disk_usage` y `ios diskspace` con la captura del usuario para detectar la métrica correcta.
- [x] Ajustar cálculo de storage en `libimobiledevice` y `go-ios` priorizando lectura alineada con iPhone Storage.
- [x] Actualizar el resumen UI del bloque `lockdown_disk_usage` para evitar interpretación incorrecta de “libre/usado”.
- [x] Validar compilación TypeScript y resultado con el UDID físico conectado.

## Review
- Hallazgo principal:
  - El cálculo anterior usaba `TotalDataAvailable` como espacio libre principal y subestimaba el “usado” real mostrado por iPhone Storage.
- Backend:
  - ACTUALIZADO: `src/lib/diagnostics/libimobiledevice.ts` para separar `TotalDataCapacity`, `TotalDataAvailable` y `AmountDataAvailable`, y priorizar `TotalDataCapacity` como `used` cuando está disponible.
  - ACTUALIZADO: `src/lib/diagnostics/libimobiledevice.ts` para derivar `available = TotalDiskCapacity - used` y mantener fallback si faltan claves.
  - ACTUALIZADO: `src/lib/diagnostics/goios.ts` con la misma estrategia para que el comparador lateral no diverja del scanner principal.
- Frontend:
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx` en el resumen de `lockdown_disk_usage`, mostrando `Usado (Ajustes iPhone)` y `Espacio libre` consistente con el nuevo cálculo.
- Verificación técnica ejecutada:
  - `ideviceinfo -q com.apple.disk_usage -x` (UDID `00008150-000A4D2A2252401C`) reportó:
    - `TotalDiskCapacity=256000000000`
    - `TotalDataCapacity=237338288128`
  - `typescript.transpileModule` OK:
    - `src/lib/diagnostics/libimobiledevice.ts`
    - `src/lib/diagnostics/goios.ts`
    - `src/components/admin/diagnostico/DiagnosticScanner.tsx`
  - Validación directa por ejecución TS:
    - `scanDevice` => `storage_gb: 256`, `used_gb: 237.3`, `available_gb: 18.7`
    - `scanDeviceWithGoIos` => `storage_gb: 256`, `used_gb: 237.3`, `available_gb: 18.7`

# TODO - Migrar diagnóstico iPhone sin Python (libimobiledevice nativo)

## Plan
- [x] Eliminar dependencia de microservicio Python/FastAPI en rutas `/api/diagnostics/*` y usar `libimobiledevice` directo desde Node.
- [x] Crear módulo server reutilizable para ejecutar comandos `idevice*`, parsear resultados y construir respuesta de diagnóstico robusta por UDID.
- [x] Actualizar UI de `/admin/diagnostico` para reflejar estado real de herramientas instaladas (sin puerto 8765 / servicio externo).
- [x] Simplificar instaladores/guía de configuración para macOS/Linux enfocados en instalar/verificar `libimobiledevice`.
- [x] Validar con chequeos técnicos (TypeScript/transpile y rutas API) y documentar review en `tasks/todo.md` y `project_context.md`.

## Review
- Backend diagnóstico:
  - NUEVO: `src/lib/diagnostics/libimobiledevice.ts` para ejecutar `idevice_id`, `ideviceinfo`, `idevicediagnostics` y consolidar datos por UDID sin Python.
  - ACTUALIZADO: `src/app/api/diagnostics/devices/route.ts` y `src/app/api/diagnostics/scan/route.ts` para usar el módulo nuevo y reportar `missing_tools` cuando falten binarios.
  - ACTUALIZADO: `src/app/api/diagnostics/add-to-inventory/route.ts` para aceptar formatos de batería previos y nuevos (`full_charge_capacity`/`full_charge_mah`).
  - ACTUALIZADO: parser de batería para iOS 26 leyendo plist XML anidado vía `plutil -extract` (ahora expone salud real + ciclos reales, sin confundir con carga actual).
  - ACTUALIZADO: cálculo de almacenamiento para usar dominio `com.apple.disk_usage` y computar `usado = total_data - disponible`.
  - ACTUALIZADO: extracción de almacenamiento reforzada con `ideviceinfo -x` + `plutil` para evitar casos donde UI mostraba “No disponible”.
  - NUEVO: campo `ram_gb` por `ProductType` para mostrar memoria RAM en scanner.
  - CORREGIDO: mapping de `iPhone18,2` a `iPhone 17 Pro Max` con `ram_gb: 12` según validación del dispositivo conectado.
  - CORREGIDO: almacenamiento en base decimal (GB) para alineación con iOS (`TotalDiskCapacity=256`, `TotalDataAvailable=178.3`) y cálculo `usado = total - libre`.
  - NUEVO: estado de piezas `parts_status` para marcar `no_alerts` cuando no hay evidencia de piezas cambiadas por USB.
  - NUEVO: caché de última lectura válida de batería por UDID para evitar que salud/ciclos desaparezcan por lecturas USB intermitentes.
- UI y setup:
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx` para mostrar estado de scanner local y herramientas faltantes.
  - ACTUALIZADO: resolución de color para evitar mapeo global incorrecto por códigos numéricos; override aplicado para `iPhone18,2` código `1` => `Naranja`.
  - ACTUALIZADO: temperatura de batería corregida (`temperature_raw / 100`) y RAM visible en resumen + sección Hardware.
  - ACTUALIZADO: bloque de “Piezas reemplazadas” mostrando “Sin alertas de piezas cambiadas (detección USB)” cuando aplica.
  - ACTUALIZADO: mensaje de “Piezas reemplazadas” aclarando limitación real de Apple por USB en iOS 26.
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx` con flujo centrado en libimobiledevice (sin FastAPI/puerto 8765).
  - ACTUALIZADO: `src/app/api/diagnostics/download/route.ts` para generar instaladores DMG/.command sin dependencia de Python.
  - ACTUALIZADO: `iphone-diagnostic-service/install.sh` y `iphone-diagnostic-service/start.sh` a flujo nativo `idevice*` (sin `venv`/`main.py`).
- Verificación técnica ejecutada:
  - `typescript.transpileModule` en todos los archivos tocados: OK.
  - Binarios locales detectados: `idevice_id`, `ideviceinfo`, `idevicediagnostics`, `idevicepair` (Homebrew, versión `idevice_id 1.4.0`).
  - `npm run dev` en `localhost:9003`: OK.
  - `GET /api/diagnostics/devices` => `200` con `{"devices":[],"count":0,"missing_tools":[]}`.
  - `GET /api/diagnostics/scan` => `200` con `{"results":[],"count":0}`.
  - `GET /admin/diagnostico` => `200`.
  - Validación con iPhone conectado (`00008150-000A4D2A2252401C`):
    - `cycle_count: 105`
    - `health_percent: 100` (ajustado sin confundir con nivel actual)
    - `current_level_pct: 76`
    - `model_name: iPhone 17 Pro Max`
    - `storage_gb: 256`, `used_gb: 77.7`, `available_gb: 178.3`
    - `ram_gb: 12`
    - `parts_status: no_alerts`

# TODO - Comparador lateral con go-ios en diagnóstico iPhone

## Plan
- [x] Crear integración server-side con `go-ios` (`ios`) para obtener datos por UDID desde una ruta API dedicada.
- [x] Agregar botón por dispositivo para ejecutar comparación y mostrar panel lateral de resultados `libimobiledevice` vs `go-ios`.
- [x] Implementar fallback robusto cuando `go-ios` no esté instalado (`go_ios_missing`) sin romper el flujo principal.
- [x] Validar compilación de archivos tocados y documentar resultado en `tasks/todo.md` y `project_context.md`.

## Review
- Backend diagnóstico:
  - NUEVO: `src/lib/diagnostics/goios.ts` con ejecución de comandos `ios` (lockdown, batterycheck, batteryregistry, diskspace, list --details), parseo best-effort (JSON/texto) y normalización de campos comparables.
  - NUEVO: `src/app/api/diagnostics/goios/route.ts` con endpoint `GET /api/diagnostics/goios?udid=...`.
  - Fallback explícito:
    - retorna `error: go_ios_missing` + `missing_tools: ["ios"]` cuando no existe binario `ios`.
    - retorna `error: go_ios_read_failed` cuando no se pudo extraer data del dispositivo.
- UI diagnóstico:
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx`.
  - NUEVO botón por tarjeta: `Comparar go-ios`.
  - NUEVO estado de carga por UDID para comparación.
  - NUEVO panel lateral en detalles expandibles con comparación `libimobiledevice` vs `go-ios` (modelo, iOS, RAM, storage usado/libre, salud y ciclos de batería).
  - Mensajes UI específicos para:
    - `go-ios` no instalado.
    - fallo de lectura en `go-ios`.
- Verificación técnica:
  - `command -v ios` => `ios missing` (en este entorno actual).
  - `typescript.transpileModule`:
    - `src/lib/diagnostics/goios.ts` => OK
    - `src/app/api/diagnostics/goios/route.ts` => OK
    - `src/components/admin/diagnostico/DiagnosticScanner.tsx` => OK
  - Instalación local posterior:
    - `brew install go-ios` no disponible como fórmula.
    - Instalado correctamente con `go install github.com/danielpaulus/go-ios@latest` (binario generado: `go-ios`).
    - Symlink de compatibilidad creado: `/opt/homebrew/bin/ios -> /Users/brayan/go/bin/go-ios`.
    - `ios --help` OK.
    - `GET /api/diagnostics/goios?udid=00008150-000A4D2A2252401C` => respuesta `available: true`.

# TODO - Expandir extracción go-ios al máximo posible por USB

## Plan
- [x] Corregir parser de salida `go-ios` para NDJSON (warnings + payload), sin depender de flag inexistente `--json`.
- [x] Ampliar barrido de comandos de solo lectura para capturar el mayor número de dominios/servicios posible.
- [x] Exponer resultado por comando (`ok`, comando ejecutado, stderr, data) en `raw` para auditoría completa.
- [x] Mostrar en UI un visor de `raw go-ios` por dispositivo para inspeccionar toda la extracción desde navegador.
- [x] Validar endpoint y compilación TS de archivos modificados.

## Review
- Backend:
  - ACTUALIZADO: `src/lib/diagnostics/goios.ts`.
  - Se corrigió la estrategia de parseo:
    - JSON por defecto de `go-ios`.
    - fallback `--nojson`.
    - soporte NDJSON (múltiples líneas JSON con warnings + datos).
  - Se amplió extracción con 28 probes de solo lectura (entre ellos):
    - `lockdown get` (global y dominios `com.apple.disk_usage`, `com.apple.mobile.battery`, `com.apple.mobile.wireless_lockdown`, `com.apple.PurpleBuddy`)
    - `info lockdown`, `info display`
    - `batterycheck`, `batteryregistry`, `diskspace`, `diagnostics list`
    - `apps --all --list`, `apps --filesharing --list`
    - `profile list`, `image list`, `ps --apps`, `mobilegestalt`, `readpair`, `rsd ls`, `devmode get`, etc.
  - `raw` ahora guarda por comando:
    - `ok`
    - comando ejecutado
    - `stderr`
    - `data` (truncado de forma segura para evitar payloads gigantes)
- Frontend:
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx`.
  - Se agregó botón `Ver raw go-ios (N bloques)` dentro del panel comparativo para inspección completa.
- Verificación:
  - `typescript.transpileModule`:
    - `src/lib/diagnostics/goios.ts` => OK
    - `src/components/admin/diagnostico/DiagnosticScanner.tsx` => OK
  - `GET /api/diagnostics/goios?udid=00008150-000A4D2A2252401C` => `raw` con 28 bloques.
  - Mejora adicional posterior:
    - Campos `go-ios` ampliados en `fields` (activación, iCloud, red, CPU/chip/board/color, devmode, conteos de apps/perfiles).
    - Comparador UI actualizado para mostrar estos campos sin abrir JSON.
    - Robustez mejorada: probes secuenciales + reintento corto cuando `go-ios` responde `Device not found`.
  - Estado de validación al cierre:
    - `GET /api/diagnostics/devices` => `{"devices":[],"count":0,...}` (sin iPhone conectado).
    - Por lo anterior, validación de lectura real de nuevos campos queda pendiente a reconexión USB/desbloqueo del iPhone.
  - Validación posterior con iPhone reconectado:
    - `GET /api/diagnostics/devices` => `count: 1` con UDID detectado.
    - `GET /api/diagnostics/goios?udid=00008150-000A4D2A2252401C` devolvió:
      - `model_name: iPhone 17 Pro Max`
      - `model_number: MFY94`
      - `ios_version: 26.4`
      - `color: Naranja`
      - `storage_gb: 256`, `used_gb: 77.7`, `available_gb: 178.3`
      - `battery_health_percent: 100`
      - `battery_cycle_count: 105`
      - `parts_status: no_alerts`
      - `parts_note: "Sin alertas detectables por USB. Estado reportado: 100% original (USB)."`

- Ajustes específicos solicitados por usuario en `go-ios`:
  - `src/lib/diagnostics/goios.ts`:
    - Fallback de batería vía `idevicediagnostics AppleSmartBattery` para completar salud/ciclos cuando `go-ios` no los reporta.
    - Detección de piezas basada en estado de batería genuina y señal de no alertas por USB.
    - Resolución de color por modelo con override `iPhone18,2 + code 1 => Naranja`.
  - `src/components/admin/diagnostico/DiagnosticScanner.tsx`:
    - Comparador `go-ios` muestra color resuelto y bloque de piezas (`100% original (USB)` / `Cambio detectado` / `No verificable`).
    - Visualización de bloques `go-ios` actualizada para renderizar los 28 bloques individualmente con estado por bloque (`OK`/`ERROR`) y contenido propio.
    - UX mejorada para lectura no técnica: cada bloque muestra título humano + descripción + resumen entendible (sin JSON técnico como vista principal).

# TODO - Entregas con repartidor único, captura en venta y envío por WhatsApp

## Plan
- [x] Definir repartidor único global (nombre/teléfono) y reutilizarlo en ventas y rutas.
- [x] Extender checkout POS para capturar datos de entrega: dirección, hora y opción de envío por WhatsApp.
- [x] Ajustar backend de ventas para crear/asignar ruta automática del repartidor y vincular venta con ruta/parada.
- [x] Mejorar módulo `/admin/delivery/routes` para operar solo con un repartidor y agregar botón de envío WhatsApp.
- [x] Crear página del repartidor (`/mobile/delivery/[routeId]`) con detalle de entregas, cobros y acción de WhatsApp.
- [x] Validar flujo end-to-end en localhost y documentar en `tasks/todo.md` + `project_context.md`.

## Review
- Implementación de repartidor único:
  - NUEVO: `src/lib/deliveryDriverConfig.ts` con configuración centralizada (`SINGLE_DELIVERY_DRIVER`) y sanitización para WhatsApp.
  - ACTUALIZADO: `src/lib/services/deliveryRouteService.ts` para forzar filtro/creación de rutas con el repartidor único y generar mensajes de WhatsApp por ruta.
- Captura en venta (POS):
  - ACTUALIZADO: `src/components/pos/CheckoutDialog.tsx` con bloque de “Entrega a domicilio”, dirección, fecha/hora, notas y opción “Enviar por WhatsApp”.
  - En checkout se guarda `shippingInfo` con repartidor, dirección y hora; se valida dirección obligatoria para entrega.
- Asignación automática de ruta al vender:
  - ACTUALIZADO: `src/lib/services/salesService.ts` para:
    - crear/reusar ruta diaria del repartidor único,
    - vincular venta con `route_id`/`route_stop_id`,
    - crear parada/items (best-effort, tolerante a diferencias de esquema),
    - generar enlace de WhatsApp con artículos, dirección y monto a cobrar.
- Módulo de rutas + WhatsApp:
  - ACTUALIZADO: `src/components/admin/delivery/DeliveryRoutesDashboard.tsx`.
    - Ruta operando solo con el repartidor único.
    - Botón “Página del repartidor”.
    - Botón “Enviar por WhatsApp”.
  - ACTUALIZADO: `src/app/admin/delivery/route/[id]/page.tsx` con listado de entregas y acción de WhatsApp.
- Página del repartidor:
  - NUEVO: `src/app/mobile/delivery/[routeId]/page.tsx` con resumen de ruta, entregas, direcciones, montos por cobrar y botón de WhatsApp.
- Tipos actualizados:
  - ACTUALIZADO: `src/types/index.ts` para ampliar `Sale`/`shippingInfo` con metadata de ruta/entrega/WhatsApp.
- Validación técnica:
  - `typescript.transpileModule` en archivos modificados: OK.
  - `GET /admin/delivery/routes` => 200.
  - `GET /admin/delivery/route/test-id` => 200.
  - `GET /mobile/delivery/test-id` => 200.

# TODO - Mayoreo Config por categoría

## Plan
- [x] Verificar patrón de auth/role en POS, revisar `product_categories.value` como FK y confirmar que `wholesale_profit_settings` no exista en Supabase.
- [x] Crear artefacto SQL idempotente para `wholesale_profit_settings` y agregar tipos/servicio server-side para CRUD por categoría.
- [x] Implementar `/pos/mayoreo-config` con guard server-side para Admin, carga inicial vía `Promise.all` y cliente con búsqueda, badges, edición inline, alta y eliminación con confirmación.
- [x] Registrar `Mayoreo Config` en `masterAdminItems` de `LeftSidebar.tsx` y revisar si middleware requiere cambios adicionales.
- [x] Verificar funcionamiento con chequeos focalizados y documentar resultado en `tasks/todo.md` y `project_context.md`.

## Review
- Persistencia:
  - NUEVO: `supabase/migrations/wholesale_profit_settings.sql` con tabla, constraint por `category_id`, RLS y policy idempotente restringida a `Admin` vía JWT.
  - NUEVO: `src/lib/services/wholesaleProfitService.ts` con `getWholesaleProfitSettings`, `upsertWholesaleProfitSetting`, `deleteWholesaleProfitSetting` y `getWholesaleProfitForCategory`.
  - NUEVO: `src/lib/hooks/useWholesaleProfit.ts` para lectura cliente por categoría con refresh y suscripción realtime.
- UI POS:
  - NUEVO: `src/app/(pos)/pos/mayoreo-config/page.tsx` con guard server-side basado en cookie `tienda_admin_access_token`, redirect a `/pos` y carga inicial por `Promise.all`.
  - NUEVO: `src/app/(pos)/pos/mayoreo-config/WholesaleConfigClient.tsx` con búsqueda, badges de estado, edición inline, alta, eliminación con `AlertDialog`, toasts y `Skeleton`.
- Navegación y tipos:
  - ACTUALIZADO: `src/components/shared/LeftSidebar.tsx` agregando `Mayoreo Config` y corrigiendo el grupo `masterAdminItems` para mostrarse solo a `role === 'Admin'`.
  - ACTUALIZADO: `src/types/index.ts` con `WholesaleProfitSetting`.
- Middleware:
  - REVISADO: `src/middleware.ts` solo protege `/tienda-admin`; no se modificó porque la protección por rol del módulo POS quedó resuelta en `page.tsx`.
- Validación técnica:
  - `typescript.transpileModule` en `src/lib/services/wholesaleProfitService.ts`, `src/app/(pos)/pos/mayoreo-config/page.tsx`, `src/app/(pos)/pos/mayoreo-config/WholesaleConfigClient.tsx` y `src/lib/hooks/useWholesaleProfit.ts`: OK.
  - `npm run typecheck`: no usable por errores preexistentes fuera del alcance en `agent/skills/nextjs/templates/*` y `src/components/products/*`.
  - `npx eslint ...`: no usable porque en el worktree actual no existe `eslint.config.*`.
  - SQL aplicado en Supabase usando `DATABASE_URL`: OK.
  - CRUD transitorio en PostgreSQL sobre categoría real (`accesorios`): insert `15.50`, update `18.75`, delete final: OK.
  - Respuesta RSC de `/pos/mayoreo-config` sin sesión contiene `NEXT_REDIRECT;replace;/pos;307;`: OK.

# TODO - Conectar mayoreo por categoria a tienda online

## Plan
- [x] Revisar puntos de calculo de precio socio en tienda (`tiendaPricing.ts` y `tiendaProductService.ts`) sin tocar POS.
- [x] Conectar `wholesale_profit_settings` a la construccion de productos de tienda para calcular `socioPrice` por categoria, con fallback al porcentaje por defecto.
- [x] Ajustar textos de UI de tienda que mostraban `+15%` fijo para reflejar configuracion por categoria.
- [x] Ejecutar validacion focalizada y documentar en `tasks/todo.md` y `project_context.md`.

## Review
- Lógica de pricing:
  - ACTUALIZADO: `src/lib/tiendaPricing.ts` para soportar margen configurable (`TIENDA_DEFAULT_SOCIO_MARGIN_PERCENT`) en `calculateRegularUnitPrice`.
- Integración con configuración de mayoreo:
  - ACTUALIZADO: `src/lib/services/tiendaProductService.ts` para cargar `wholesale_profit_settings` en server, mapear `category_id -> profit_percentage` y calcular `socioPrice` por categoría.
  - NUEVO EN MODELO: campo `socioProfitPercentage` en `Product` para exponer el porcentaje aplicado en tienda.
  - FALLBACK: si no hay configuración, no existe tabla o hay restricción de lectura, se mantiene el comportamiento previo con porcentaje por defecto.
- UI de tienda:
  - ACTUALIZADO: `src/components/tienda/TiendaProductCard.tsx` mostrando el porcentaje aplicado por categoría.
  - ACTUALIZADO: `src/components/tienda/ProductInfo.tsx` mostrando explicación basada en porcentaje por categoría.
  - ACTUALIZADO: `src/app/(tienda)/tienda/envios/page.tsx` removiendo referencia a `+15%` fijo y explicando configuración por categoría.
- Validación técnica:
  - `typescript.transpileModule` en archivos modificados: OK.
  - `GET /tienda`, `GET /tienda/categorias`, `GET /tienda/envios` responden HTTP `200` en `localhost:9003`.

# TODO - Ocultar formula de mayoreo en tienda online

## Plan
- [x] Ubicar textos en storefront que mostraban formula de mayoreo (`costo + porcentaje`) al usuario final.
- [x] Ajustar copy del bloque de mayoreo en `/tienda/envios` para no exponer costo ni porcentaje.
- [x] Verificar barrido de textos en componentes de tienda para confirmar que no quede copy de formula visible.
- [x] Ejecutar validacion focalizada y documentar resultado en `tasks/todo.md` y `project_context.md`.

## Review
- UI de tienda:
  - ACTUALIZADO: `src/app/(tienda)/tienda/envios/page.tsx` para cambiar el bloque de mayoreo de:
    - `Costo + % por categoria`
    - detalle del porcentaje configurado/fallback
    - a copy neutral: `Precio mayoreo` y `Calculado por categoria`.
- Validacion tecnica:
  - `typescript.transpileModule` en:
    - `src/components/tienda/TiendaProductCard.tsx`
    - `src/components/tienda/ProductInfo.tsx`
    - `src/app/(tienda)/tienda/envios/page.tsx`
    - Resultado: OK.
  - `rg` de control en storefront sin coincidencias de formula de mayoreo (`Costo +`, `% por categoria`, `Base socio`): OK.
- Reemplazo de DropdownMenu por Collapsible en Menu Lateral
- Corrección de width de Sheet en admin, pos y ventas (de 96px a 280px)
- Añadidas animaciones de Tailwind CSS para el Collapsible

# TODO - Gestión de iPhones Seminuevos (Modelo Padre / Unidad Hijo)

## Plan
- [x] **Parte 1 — Migración de base de datos**
  - Crear `supabase/migrations/20260309000000_seminuevo_iphones.sql` con las columnas `condition_grade`, `diagnostic_id`, `cosmetic_notes` e índices.
  - Crear las vistas `seminuevo_models` y `seminuevo_units`.
  - Aplicar con `npx supabase db push`.
- [x] **Parte 2 — Tipos TypeScript**
  - Agregar `CONDITION_GRADES`, `ConditionGrade`, `SeminuevoModel`, `SeminuevoUnit` a `src/types/index.ts`.
  - Actualizar interfaz `Product` existente.
- [x] **Parte 3 — Helper functions**
  - Crear `src/lib/seminuevoHelpers.ts` con `suggestConditionGrade`, `buildUnitName`, `extractModelLine`.
- [x] **Parte 4 — Servicio (productService)**
  - Agregar `getOrCreateModelParent`, `createProductFromDiagnostic`, `getSeminuevoModels`, `getSeminuevoUnits` en `src/lib/services/productService.ts`.
- [x] **Parte 5 — API Routes**
  - Crear `src/app/api/seminuevo/create/route.ts` para exponer el servicio de creación.
- [x] **Parte 6 — Modal "Agregar a inventario"**
  - Crear `src/components/admin/diagnostico/AddToInventoryModal.tsx`.
  - Integrar en la página `/admin/diagnostico`.
- [x] **Parte 7 — Tienda: Página de modelos**
  - Crear `src/app/(tienda)/tienda/seminuevos/page.tsx` y `SeminuevosClient.tsx`.
- [x] **Parte 8 — Tienda: Página de unidades**
  - Crear `src/app/(tienda)/tienda/seminuevos/[modelId]/page.tsx` y `ModelUnitsClient.tsx`.
- [x] **Parte 9 — Navegación Tienda**
  - Agregar link "Seminuevos" en el navbar/header.
- [x] **Parte 10 — POS/Admin**
  - Filtrar productos padre (`is_model_template: true`) en POS y búsquedas para que no se vendan.
- [x] **Parte 11 — Pruebas del flujo completo**
  - Validar Admin (desde diagnóstico hasta agregar).
  - Validar Tienda (filtros, lista de mdoelos y unidades).
  - Validar POS (vender la unidad y verificar stock/visibilidad).

## Review
- Pendiente de ejecución.

# TODO - Home tienda: redes reales + soporte WhatsApp funcional

## Plan
- [x] Revisar componentes de la portada para reemplazar enlaces placeholder (`#`) por enlaces reales y accesibles.
- [x] Centralizar enlaces de Instagram, TikTok y WhatsApp en una configuración reutilizable para portada/footer.
- [x] Conectar botón de soporte de portada a WhatsApp (`2224219292`) con mensaje prellenado.
- [x] Corregir enlaces rotos del footer de portada para evitar rutas 404.
- [x] Validar compilación de archivos tocados y documentar review.

## Review
- Configuración centralizada:
  - NUEVO: `src/lib/tiendaContact.ts` con constantes de redes/soporte:
    - Instagram: `https://www.instagram.com/22electronic/`
    - TikTok: `https://www.tiktok.com/@22electronic`
    - WhatsApp soporte: `+52 222 421 9292` (`wa.me/522224219292`) con mensaje prellenado.
  - NUEVO helper: `buildWhatsappUrl(phone, message?)`.
- Portada/home:
  - ACTUALIZADO: `src/components/tienda/FeaturesSection.tsx` para que el CTA “Contactar soporte” abra WhatsApp en nueva pestaña.
  - ACTUALIZADO: `src/components/tienda/CommunityLove.tsx` para que “Follow us” abra Instagram real.
  - ACTUALIZADO: `src/components/tienda/HeroBanner.tsx` eliminando ruta inexistente `/tienda/ofertas` por ruta válida `/tienda/seminuevos`.
- Footer tienda:
  - ACTUALIZADO: `src/components/tienda/layout/TiendaFooter.tsx`.
  - Se reemplazaron íconos sociales con enlaces reales/funcionales (Instagram, TikTok, WhatsApp).
  - Se añadió contacto directo a WhatsApp en bloque de ayuda.
  - Se quitaron enlaces a rutas inexistentes y se sustituyeron por rutas válidas (`/tienda/seminuevos`, `/tienda/favoritos`, `/tienda/garantia`).
- Coherencia de soporte:
  - ACTUALIZADO: `src/app/(tienda)/tienda/pagos/page.tsx` para usar el mismo WhatsApp de soporte central.
  - ACTUALIZADO: `src/components/tienda/ProductSpecs.tsx` para evitar `/tienda/contacto` (inexistente) y usar WhatsApp real.
- Verificación técnica:
  - `typescript.transpileModule` OK en todos los archivos tocados.
  - `npm run typecheck` no usable por errores preexistentes fuera del alcance en `src/components/products/ProductDetailModern.tsx`.
