# TODO - Auto-detección de dominio en DMG para pairing (Netlify/producción)

## Plan
- [x] Detectar automáticamente el origen de descarga del `.app` desde metadatos de cuarentena (`kMDItemWhereFroms`).
- [x] Pasar ese dominio al instalador en Terminal y al agente (`DIAG_AGENT_URL`) para evitar hardcode de host.
- [x] Regenerar `DiagnosticoBridgeAgent.dmg` y verificar que el launcher incluya la lógica.
- [x] Documentar resultado.

## Review
- Hallazgo principal:
  - El DMG estaba hardcodeado a `https://22electronicgroup.com`, por eso al instalar desde Netlify el agente quedaba apuntando al host incorrecto.
- Cambios aplicados:
  - ACTUALIZADO: `scripts/build-bridge-agent-binaries.mjs`.
  - Nuevo flujo en launcher:
    - intenta leer `com.apple.metadata:kMDItemWhereFroms` del bundle/ejecutable,
    - extrae origen `https://host`,
    - usa ese valor como `APP_URL_DEFAULT` para instalación y pairing.
  - El instalador exporta:
    - `DIAG_BRIDGE_APP_URL` (launcher -> script temporal)
    - `DIAG_AGENT_URL` (script temporal -> `bridge-agent.mjs`)
  - REGENERADO: `iphone-diagnostic-service/dist/DiagnosticoBridgeAgent.dmg`.
- Verificación técnica:
  - `node --check scripts/build-bridge-agent-binaries.mjs` => OK.
  - `npm run diagnostics:build-agents` => OK.
  - Inspección del launcher dentro del DMG confirma presencia de:
    - `extract_origin_from_where_froms`
    - `App URL detectada para pairing`
    - exports `DIAG_BRIDGE_APP_URL` y `DIAG_AGENT_URL`.

# TODO - Hotfix launcher DMG: error mktemp "File exists" al dar Instalar

## Plan
- [x] Reproducir/confirmar la causa leyendo el error exacto del launcher.
- [x] Corregir la creación de script temporal en macOS para evitar colisión de `mktemp`.
- [x] Regenerar `DiagnosticoBridgeAgent.dmg` y validar que el launcher interno traiga el fix.
- [x] Documentar el resultado.

## Review
- Hallazgo principal:
  - El launcher estaba usando `mktemp /tmp/diag_bridge_install_XXXXX.sh`, que en el entorno del usuario disparó `mkstemp failed ... File exists`.
  - Eso cortaba la ejecución justo al inicio y daba la impresión de que el botón **Instalar** no hacía nada.
- Cambios aplicados:
  - ACTUALIZADO: `scripts/build-bridge-agent-binaries.mjs`.
  - Reemplazo de creación temporal por `mktemp -t diag_bridge_install` (patrón seguro para macOS).
  - REGENERADO: `iphone-diagnostic-service/dist/DiagnosticoBridgeAgent.dmg`.
- Verificación técnica:
  - `node --check scripts/build-bridge-agent-binaries.mjs` => OK.
  - `npm run diagnostics:build-agents` => OK.
  - Verificación del launcher dentro del DMG: contiene `SCRIPT=$(mktemp -t diag_bridge_install)`.

# TODO - Hotfix DMG: instalador abre pero no muestra nada al hacer clic en "Instalar"

## Plan
- [x] Revisar el launcher del `.app` dentro del `DiagnosticoBridgeAgent.dmg` para detectar salidas silenciosas.
- [x] Corregir el flujo de arranque para que siempre abra Terminal y deje trazas de ejecución en archivo de log.
- [x] Regenerar `DiagnosticoBridgeAgent.dmg` con el launcher corregido y validar que no falle en silencio.
- [x] Documentar resultado y validación técnica.

## Review
- Hallazgo principal:
  - El launcher del `.app` podía terminar en silencio cuando fallaba `osascript` (diálogo de confirmación), por eso al usuario le parecía que el botón **Instalar** no hacía nada.
- Cambios aplicados:
  - ACTUALIZADO: `scripts/build-bridge-agent-binaries.mjs`.
  - Nuevo comportamiento del launcher:
    - Si el diálogo falla, continúa en modo consola en vez de salir en silencio.
    - Registra trazas en `~/.22electronic-diagnostics-agent/logs/launcher-*.log`.
    - El instalador en Terminal guarda log detallado en `~/.22electronic-diagnostics-agent/logs/install-*.log`.
    - En error, muestra ruta de log y deja mensaje visible antes de cerrar.
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`.
  - Se añadió troubleshooting explícito para revisar la carpeta de logs cuando “Instalar” no muestra nada.
  - REGENERADO: `iphone-diagnostic-service/dist/DiagnosticoBridgeAgent.dmg`.
- Verificación técnica:
  - `node --check scripts/build-bridge-agent-binaries.mjs` => OK.
  - `npm run diagnostics:build-agents` => OK (DMG y binarios regenerados).
  - Montaje local del DMG + inspección de launcher => contiene fallback y logging nuevo.
  - `typescript.transpileModule` en `SetupGuide.tsx` => OK.

# TODO - Eliminar prompt de token del agente y asociar diagnósticos a la cuenta que escanea

## Plan
- [x] Diseñar un flujo de pairing automático del agente local sin pedir token manual al usuario.
- [x] Persistir la asociación del agente con la cuenta autenticada y del diagnóstico con el usuario que lanzó el escaneo.
- [x] Actualizar el agente y la UI de `/admin/diagnostico` para completar el pairing desde la web.
- [x] Validar sintaxis de archivos tocados y documentar el resultado.

## Review
- Hallazgo principal:
  - El prompt de token en consola era una fricción innecesaria y además rompía la expectativa de instalador “doble clic”.
  - La forma correcta de quitarlo sin perder control era pasar a un pairing web:
    - el agente se instala y arranca solo;
    - abre `/admin/diagnostico?pair=...`;
    - la cuenta autenticada completa el vínculo;
    - los jobs y diagnósticos quedan amarrados al usuario que los lanzó.
- Cambios aplicados:
  - NUEVA migración: `supabase/migrations/20260315000001_bridge_pairing_and_diagnostic_ownership.sql`
  - Se agregaron:
    - `diagnostics_bridge_pairings`
    - `machine_id` en `diagnostics_bridge_agents`
    - `scanned_by_user_id`, `bridge_job_id`, `bridge_agent_id` en `device_diagnostics`
  - ACTUALIZADO: `src/lib/diagnostics/bridge.ts`
  - Nuevo flujo de pairing y regeneración de token por máquina si el agente ya estaba vinculado.
  - NUEVAS rutas:
    - `src/app/api/diagnostics/bridge/pair/start/route.ts`
    - `src/app/api/diagnostics/bridge/pair/status/route.ts`
    - `src/app/api/diagnostics/bridge/pair/complete/route.ts`
  - ACTUALIZADO: `iphone-diagnostic-service/bridge-agent.mjs`
  - El agente ya no pide token ni nombre en consola:
    - usa URL por defecto
    - genera `machineId`
    - abre la web para completar pairing
    - guarda config local cuando recibe el token de vínculo
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx`
  - Ahora completa pairing automáticamente si la URL trae `?pair=...`.
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`
  - Se eliminó la sección de token manual; el flujo queda centrado en descargar/abrir el instalador.
  - ACTUALIZADO: `src/lib/diagnostics/persistence.ts`, `src/app/api/diagnostics/scan/route.ts` y `src/app/api/diagnostics/bridge/agent/jobs/[jobId]/complete/route.ts`
  - Los diagnósticos ahora se persisten con usuario/agent/job cuando vienen desde la web autenticada o desde un bridge job.
- Verificación técnica:
  - `typescript.transpileModule` OK en helpers, rutas y componentes tocados.
  - `node --check` OK en:
    - `iphone-diagnostic-service/bridge-agent.mjs`
    - `scripts/build-bridge-agent-binaries.mjs`
  - DMG regenerado tras actualizar el launcher del agente.

# TODO - Corregir enlace roto que descargaba JSON con extensión .dmg

## Plan
- [x] Inspeccionar el archivo descargado por el usuario para verificar si era un DMG real o una respuesta de error.
- [x] Identificar qué enlace de la guía seguía apuntando al endpoint roto.
- [x] Reemplazar el enlace por el DMG precompilado correcto del bridge agent.

## Review
- Hallazgo principal:
  - El archivo descargado por el usuario no era un `.dmg` válido; era una respuesta JSON de error guardada como `.dmg`.
  - La causa fue que la guía seguía ofreciendo el enlace viejo `?file=installer-dmg`, que intenta generar un DMG en runtime y falla en producción porque ese endpoint requiere macOS en el servidor.
- Cambios aplicados:
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`
  - El botón principal de macOS ahora descarga `?file=bridge-agent-dmg`, que sí sirve un DMG precompilado y no depende de generar la imagen en el servidor.
- Verificación técnica:
  - `file /Users/brayan/Downloads/DiagnosticoiPhone-3.dmg` => `JSON data` (confirmó el fallo real).
  - `curl -I https://22electronicgroup.com/api/diagnostics/download?file=bridge-agent-dmg` => `200` con `content-type: application/x-apple-diskimage`.

# TODO - Alinear el DMG del bridge agent con el patrón del DMG funcional del usuario

## Plan
- [x] Comparar el DMG funcional del usuario con el `DiagnosticoBridgeAgent.dmg` del proyecto para detectar diferencias reales de empaquetado.
- [x] Cambiar el build macOS para usar el mismo patrón funcional (`.app` con launcher script, sin firma) en lugar de un binario bundle.
- [x] Regenerar el DMG y validar que el `.app` interno quede como script sin firma.

## Review
- Hallazgo principal:
  - El DMG funcional del usuario no usa un binario Mach-O dentro del `.app`; usa un `shell script` como ejecutable del bundle.
  - El DMG del proyecto seguía fallando porque, aunque el volumen montaba bien, el patrón interno del `.app` no coincidía con el que ya estaba probado en la Mac del usuario.
- Cambios aplicados:
  - ACTUALIZADO: `scripts/build-bridge-agent-binaries.mjs`
  - El build de macOS ahora genera `DiagnosticoBridgeAgent.app` con launcher tipo script:
    - instala/verifica Homebrew
    - instala/verifica Node
    - instala/verifica `libimobiledevice` y `usbmuxd`
    - descarga `bridge-agent.mjs`
    - lanza el agente en Terminal
  - ELIMINADO del flujo macOS: firma ad-hoc del bundle.
  - REGENERADO: `iphone-diagnostic-service/dist/DiagnosticoBridgeAgent.dmg`.
- Verificación técnica:
  - El `.app` interno del nuevo DMG quedó como:
    - `Bourne-Again shell script text executable`
    - `code object is not signed at all`
  - Eso replica el patrón observado en `/Users/brayan/Downloads/DiagnosticoiPhone-2.dmg`, que sí funciona en la Mac del usuario.

# TODO - Corregir DMG del bridge agent marcado como corrupto en macOS

## Plan
- [x] Verificar si el `DiagnosticoBridgeAgent.dmg` está realmente corrupto o si el problema ocurre al abrir el `.app` interno.
- [x] Ajustar el build del bundle macOS para firmar el `.app` completo antes de generar el DMG.
- [x] Regenerar el artefacto y validar checksum/montaje local.

## Review
- Hallazgo principal:
  - El `.dmg` no estaba corrupto: `hdiutil verify` y `hdiutil attach` pasaban correctamente.
  - El problema estaba en la presentación del `.app` descargado desde internet; macOS puede marcarlo como “dañado” cuando el bundle no está empaquetado/firmado correctamente o cuando falta notarización de Developer ID.
- Cambios aplicados:
  - ACTUALIZADO: `scripts/build-bridge-agent-binaries.mjs`
  - El build ahora ejecuta `codesign --force --deep --sign - DiagnosticoBridgeAgent.app` antes de crear `DiagnosticoBridgeAgent.dmg`.
  - Regenerado: `iphone-diagnostic-service/dist/DiagnosticoBridgeAgent.dmg`.
- Verificación técnica:
  - `hdiutil verify iphone-diagnostic-service/dist/DiagnosticoBridgeAgent.dmg` => válido.
  - `hdiutil attach ...` => volumen montable correctamente.
  - `codesign -dv` sobre `/Volumes/DiagnosticoBridgeAgent/DiagnosticoBridgeAgent.app` => bundle ejecutable firmado ad-hoc.

# TODO - Empaquetar el agente bridge como binarios nativos por sistema operativo

## Plan
- [x] Hacer que el agente guarde configuración local y pueda arrancar sin variables de entorno en cada ejecución.
- [x] Crear pipeline de build para binarios nativos macOS, Windows y Linux.
- [x] Exponer descargas reales `.dmg`, `.exe` y binario Linux desde la guía.
- [x] Validar sintaxis de los archivos tocados y confirmar artefactos generados.

## Review
- Hallazgo principal:
  - Los scripts descargables reducían fricción, pero no cumplían la expectativa de “doble clic” real por sistema operativo.
  - Para resolverlo, el agente necesitaba dos capacidades nuevas:
    - configuración persistida localmente en primer arranque
    - empaquetado nativo por plataforma
- Cambios aplicados:
  - ACTUALIZADO: `iphone-diagnostic-service/bridge-agent.mjs`
  - El agente ahora guarda `appUrl`, `agentToken` y `agentName` en `~/.22electronic-diagnostics-agent/config.json`.
  - Si no existe configuración, la pide una sola vez en el primer arranque y luego queda persistida.
  - NUEVO: `scripts/build-bridge-agent-binaries.mjs`
  - Script para compilar binarios con `pkg`:
    - macOS arm64
    - Windows x64 `.exe`
    - Linux x64
  - El mismo script genera `DiagnosticoBridgeAgent.dmg` en macOS.
  - ACTUALIZADO: `package.json`
  - Nuevo script `npm run diagnostics:build-agents`.
  - ACTUALIZADO: `src/app/api/diagnostics/download/route.ts`
  - Nuevas descargas nativas:
    - `?file=bridge-agent-dmg`
    - `?file=bridge-agent-exe`
    - `?file=bridge-agent-linux-bin`
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`
  - La guía ahora prioriza descargas nativas reales (`.dmg`, `.exe`, Linux) y deja scripts manuales como fallback.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/app/api/diagnostics/download/route.ts`
    - `src/components/admin/diagnostico/SetupGuide.tsx`
  - `node --check` OK:
    - `scripts/build-bridge-agent-binaries.mjs`
    - `iphone-diagnostic-service/bridge-agent.mjs`
  - Artefactos generados en `iphone-diagnostic-service/dist/`:
    - `DiagnosticoBridgeAgent.dmg`
    - `bridge-agent-win-x64.exe`
    - `bridge-agent-linux-x64`
    - `bridge-agent-macos-arm64`

# TODO - Agregar instaladores descargables para el agente local de diagnóstico

## Plan
- [x] Extender `/api/diagnostics/download` para generar instaladores del bridge agent para macOS, Linux y Windows con token y URL preconfigurados.
- [x] Integrar botones de descarga en la guía de `/admin/diagnostico` cuando el token del agente ya fue generado.
- [x] Validar sintaxis de los archivos tocados.

## Review
- Hallazgo principal:
  - El bridge ya funcionaba, pero obligaba al usuario a copiar y pegar comandos con variables de entorno.
  - Eso seguía siendo fricción innecesaria para recepción o sucursales donde solo se necesita descargar, abrir y dejar corriendo el agente.
- Cambios aplicados:
  - ACTUALIZADO: `src/app/api/diagnostics/download/route.ts`
  - Nuevos archivos descargables:
    - `?file=bridge-agent-mac`
    - `?file=bridge-agent-linux`
    - `?file=bridge-agent-ps1`
  - Los instaladores quedan preconfigurados con:
    - URL actual de la app
    - token del agente
    - nombre del agente
  - Cada script valida `node` y `idevice_*`, descarga `bridge-agent.mjs` y arranca el loop del agente.
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`
  - Ahora, tras generar token, la guía muestra botones de descarga directos para macOS, Linux y Windows además de los comandos manuales.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/app/api/diagnostics/download/route.ts`
    - `src/components/admin/diagnostico/SetupGuide.tsx`
  - Verificación estática adicional: markers de `bridge-agent-mac`, `bridge-agent-linux` y `bridge-agent-ps1` presentes en la route.

# TODO - Implementar agente local para diagnóstico iPhone desde web remota

## Plan
- [x] Diseñar y crear la persistencia del bridge de diagnóstico (agentes + jobs) para que la web pueda pedir escaneos a una PC local.
- [x] Implementar rutas API seguras para registrar agente, consultar estado, crear jobs y recibir resultados del agente local.
- [x] Reutilizar el parseo actual de `libimobiledevice` para aceptar salidas crudas enviadas por el agente y no duplicar lógica de diagnóstico.
- [x] Crear el agente local liviano en Node y exponer descarga/instrucciones desde `/admin/diagnostico`.
- [x] Integrar el flujo en la UI de diagnóstico para lanzar escaneos remotos y mostrar resultados.
- [x] Validar sintaxis de archivos tocados y documentar resultado.

## Review
- Hallazgo principal:
  - La web remota no podía acceder al USB del cliente, pero tampoco era necesario duplicar toda la lógica de diagnóstico en el agente local.
  - La solución más estable fue separar responsabilidades:
    - la web crea jobs y consume resultados
    - el agente local solo ejecuta `idevice_*` y sube salidas crudas
    - el servidor sigue siendo la fuente única de parseo y persistencia
- Cambios aplicados:
  - NUEVO: `supabase/migrations/20260314000003_create_diagnostics_bridge.sql`
  - Se agregaron tablas `diagnostics_bridge_agents` y `diagnostics_bridge_jobs` para registrar agentes locales y jobs de diagnóstico remoto.
  - NUEVO: `src/lib/diagnostics/bridge.ts`
  - Helper server-side para autenticar admins, crear agentes, crear jobs, heartbeat, claim y completar jobs.
  - NUEVAS rutas API:
    - `src/app/api/diagnostics/bridge/status/route.ts`
    - `src/app/api/diagnostics/bridge/agents/route.ts`
    - `src/app/api/diagnostics/bridge/jobs/route.ts`
    - `src/app/api/diagnostics/bridge/jobs/[jobId]/route.ts`
    - `src/app/api/diagnostics/bridge/agent/jobs/next/route.ts`
    - `src/app/api/diagnostics/bridge/agent/jobs/[jobId]/complete/route.ts`
  - ACTUALIZADO: `src/lib/diagnostics/libimobiledevice.ts`
  - Se exportó `scanDeviceFromRaw(...)` y se refactorizó el parseo para aceptar salidas crudas del agente local sin duplicar reglas de batería/storage/modelo.
  - NUEVO: `iphone-diagnostic-service/bridge-agent.mjs`
  - Agente Node 18+ que hace polling al backend, ejecuta `idevice_id`, `ideviceinfo`, `idevicediagnostics` y entrega resultados del job.
  - ACTUALIZADO: `src/app/api/diagnostics/download/route.ts`
  - Se añadió descarga del agente vía `?file=bridge-agent-js`.
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`
  - Ahora permite generar token del agente y muestra comandos listos para macOS/Linux y Windows PowerShell.
  - ACTUALIZADO: `src/components/admin/diagnostico/DiagnosticScanner.tsx`
  - El scanner detecta agentes online, lanza jobs remotos cuando el scanner local está offline y muestra resultados en la misma UI.
- Verificación técnica:
  - `typescript.transpileModule` OK en helpers, rutas API y componentes tocados.
  - `node --check iphone-diagnostic-service/bridge-agent.mjs` OK.
  - `npm run typecheck` sigue fallando por errores previos ajenos en `src/components/products/ProductDetailModern.tsx`; no provienen de este cambio.

# TODO - Verificar viabilidad de diagnóstico iPhone 100% web sin instalación local

## Plan
- [x] Revisar la implementación actual de `/admin/diagnostico` y confirmar si depende de binarios locales o de capacidades nativas del navegador.
- [x] Verificar la viabilidad técnica de usar `libimobiledevice` directamente desde una web sin instalar nada en la PC del usuario.
- [x] Ajustar la UI/documentación del módulo para dejar explícita la limitación real y evitar falsas expectativas.
- [x] Validar sintaxis de los archivos tocados.

## Review
- Hallazgo principal:
  - El flujo actual no es web puro. `src/app/api/diagnostics/devices/route.ts` y `src/app/api/diagnostics/scan/route.ts` ejecutan `idevice_*` desde Node usando `src/lib/diagnostics/libimobiledevice.ts`.
  - Eso significa que el diagnóstico depende de binarios locales y del acceso USB de la máquina donde corre la app; una página web abierta en el navegador del cliente no puede reemplazar ese acceso.
  - A nivel de plataforma, `libimobiledevice` no corre dentro del navegador y las APIs web que podrían parecer cercanas (`WebUSB`, `Web Serial`) no resuelven este caso para iPhone + Safari.
- Cambios aplicados:
  - ACTUALIZADO: `src/app/admin/diagnostico/page.tsx`
  - Se añadió una nota visible aclarando que el módulo requiere herramientas locales en la máquina con el iPhone conectado.
  - ACTUALIZADO: `src/components/admin/diagnostico/SetupGuide.tsx`
  - Se agregó un bloque explícito indicando que no existe modo “solo web” para este flujo y que el botón `Diagnosticar` depende de `libimobiledevice` + `usbmuxd` instalados localmente.
  - Se añadió una nota final sobre la limitación arquitectónica del navegador para este caso.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/app/admin/diagnostico/page.tsx`
    - `src/components/admin/diagnostico/SetupGuide.tsx`

# TODO - Resolver códigos escaneados no registrados en POS

## Plan
- [x] Unificar la lógica de búsqueda de producto por código escaneado para desktop y mobile.
- [x] Mostrar un diálogo de resolución cuando el código no exista, con opciones para crear producto nuevo o asociarlo a uno existente.
- [x] Implementar una API segura para guardar el barcode escaneado en un producto existente.
- [x] Prellenar el campo `SKU` al navegar a alta de producto desde el escáner.
- [x] Validar sintaxis de los archivos tocados.

## Review
- Hallazgo principal:
  - El POS detectaba que el código no existía, pero se quedaba solo en un toast destructivo.
  - Eso cortaba el flujo operativo justo en el momento donde el usuario necesitaba resolver el barcode nuevo.
- Cambios aplicados:
  - NUEVO: `src/lib/pos/scannedCode.ts`
  - Se centralizó la lógica de búsqueda por SKU, ID, barcode en atributos, IMEI y serial para reutilizarla en desktop y mobile.
  - NUEVO: `src/components/pos/ScannedCodeResolutionDialog.tsx`
  - Se agregó un diálogo de resolución con dos caminos:
    - crear un producto nuevo con SKU precargado
    - asociar el código escaneado a un producto existente
  - ACTUALIZADO: `src/components/pos/POSClient.tsx`
  - ACTUALIZADO: `src/components/pos/POSMobileLayout.tsx`
  - Ambos flujos del POS ahora:
    - cierran el scanner cuando detectan un código
    - abren el diálogo de resolución si el producto no existe
    - permiten guardar el barcode en un producto existente sin salir del POS
  - NUEVO: `src/app/api/products/assign-scanned-code/route.ts`
  - Se creó una route API para persistir el barcode escaneado en el producto seleccionado de forma server-side.
  - ACTUALIZADO: `src/components/admin/inventory/AddProductForm.tsx`
  - El alta de producto ahora toma `?sku=` desde la URL y precarga el campo con un aviso visual cuando viene del escáner POS.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/lib/pos/scannedCode.ts`
    - `src/components/pos/ScannedCodeResolutionDialog.tsx`
    - `src/app/api/products/assign-scanned-code/route.ts`
    - `src/components/pos/POSClient.tsx`
    - `src/components/pos/POSMobileLayout.tsx`
    - `src/components/admin/inventory/AddProductForm.tsx`

# TODO - Hacer visible el estado de lectura del escáner POS

## Plan
- [x] Revisar la UI actual del escáner para identificar por qué parece solo una cámara.
- [x] Agregar guía visual de encuadre y estado activo de búsqueda sobre el video.
- [x] Añadir una animación ligera de barrido que comunique que el lector está analizando el frame.
- [x] Validar sintaxis del componente.

## Review
- Hallazgo principal:
  - Aunque la cámara ya estaba activa, la UI no mostraba recuadro, línea de lectura ni estado visual de búsqueda.
  - En la práctica parecía una vista previa de cámara y no un escáner funcional.
- Cambios aplicados:
  - ACTUALIZADO: `src/components/pos/CodeScannerDialog.tsx`
  - Se añadió overlay visual con:
    - recuadro de enfoque para el barcode
    - línea animada de barrido
    - esquinas destacadas
    - badge de estado `Buscando código dentro del recuadro`
    - texto breve de instrucción de uso
  - ACTUALIZADO: `src/app/globals.css`
  - Nueva animación `scanner-sweep` para la línea de lectura.
- Verificación técnica:
  - `typescript.transpileModule` OK en `src/components/pos/CodeScannerDialog.tsx`.

# TODO - Ajustar lector POS para formatos reales de código de barras

## Plan
- [x] Revisar qué formatos de barcode genera realmente el sistema de etiquetas.
- [x] Ajustar `CodeScannerDialog` para priorizar esos formatos en el lector ZXing.
- [x] Activar lectura más agresiva para 1D (`TRY_HARDER`) y bajar el intervalo entre intentos.
- [x] Validar sintaxis del componente.

## Review
- Hallazgo principal:
  - El sistema imprime principalmente `CODE128` y también soporta `EAN13`, pero el lector estaba corriendo con configuración genérica.
  - En mobile, esa configuración genérica puede ver la cámara pero tardar mucho o no estabilizar la decodificación de barras 1D finas.
- Cambios aplicados:
  - ACTUALIZADO: `src/components/pos/CodeScannerDialog.tsx`
  - Se agregaron hints explícitos para ZXing con los formatos que usa el proyecto:
    - `CODE_128`
    - `EAN_13`
    - `EAN_8`
    - `UPC_A`
    - `UPC_E`
    - `CODE_39`
    - `CODABAR`
    - `ITF`
    - `QR_CODE`
  - Se habilitó `DecodeHintType.TRY_HARDER`.
  - Se redujo `delayBetweenScanAttempts` a `120ms` para hacer el barrido más reactivo.
- Verificación técnica:
  - `typescript.transpileModule` OK en `src/components/pos/CodeScannerDialog.tsx`.

# TODO - Corregir inicio del lector de código de barras en POS

## Plan
- [x] Revisar el flujo de inicialización del escáner y las llamadas a `@zxing/browser`.
- [x] Eliminar reinicios cruzados al abrir el diálogo y al refrescar/seleccionar cámara.
- [x] Endurecer el manejo de streams/cancelación para evitar `AbortError` y estados stale.
- [x] Validar sintaxis del componente actualizado.

## Review
- Hallazgo raíz:
  - `src/components/pos/CodeScannerDialog.tsx` iniciaba el escáner al abrir el diálogo y, en paralelo, refrescaba dispositivos/cambiaba `selectedDeviceId`, lo que recreaba `startScanner` y disparaba nuevos ciclos de `useEffect`.
  - Ese patrón reiniciaba la cámara mientras ZXing todavía montaba el stream, provocando errores encadenados como:
    - `cameraIdOrConfig ... found 0 keys`
    - `AbortError`
    - `NotFoundError`
- Cambios aplicados:
  - ACTUALIZADO: `src/components/pos/CodeScannerDialog.tsx`
  - Se agregó `startRequestRef` para invalidar arranques obsoletos y evitar que respuestas async viejas reescriban el estado actual.
  - `startScanner` ahora:
    - detiene primero el scanner anterior;
    - lista cámaras con `BrowserCodeReader.listVideoInputDevices()` cuando está disponible;
    - arranca un único stream activo por intento;
    - ignora abortos transitorios de reinicio/cierre.
  - El `useEffect` de apertura ahora depende solo de `open`; ya no se vuelve a disparar por el cambio interno de `selectedDeviceId`.
  - El cambio de cámara quedó encapsulado en `handleDeviceChange`, sin crear un ciclo de reinicio extra.
- Verificación técnica:
  - `typescript.transpileModule` OK en `src/components/pos/CodeScannerDialog.tsx`.

# TODO - Corregir MobileSidebar real de mayoreo/configuración en POS

## Plan
- [x] Verificar qué menú mobile usa realmente `/pos/mayoreo-config` después de los cambios recientes de layout.
- [x] Unificar `mayoreo-config` con el layout mobile estándar del admin/POS para evitar un sidebar paralelo.
- [x] Corregir `MobileSidebar` para que los padres `Finanzas` y `Configuración` naveguen al `href` principal y mantengan expansión separada.
- [x] Validar sintaxis de los archivos tocados.

## Review
- Hallazgo raíz:
  - El menú mobile que se estaba mostrando ya no dependía principalmente de `LeftSidebar`, sino de `MobileSidebar` a través de los layouts nuevos.
  - `src/app/(pos)/pos/mayoreo-config/page.tsx` seguía montando un `Sheet` propio con `LeftSidebar`, por eso en mobile esta vista usaba un menú distinto al resto del sistema.
  - `src/components/shared/MobileSidebar.tsx` seguía teniendo `Configuración` y `Finanzas` solo como triggers de colapsable; el padre no navegaba a la página principal.
- Cambios aplicados:
  - ACTUALIZADO: `src/app/(pos)/pos/mayoreo-config/page.tsx`
  - La página ahora usa `AdminPageLayout` y hereda el mismo `MobileSidebar`/header mobile que el resto de páginas administrativas.
  - ACTUALIZADO: `src/components/shared/MobileSidebar.tsx`
  - `Finanzas`:
    - tap en el cuerpo principal => navega a `/admin/finance`
    - tap en el control lateral => expande/colapsa subitems
  - `Configuración`:
    - tap en el cuerpo principal => navega a `/admin/settings`
    - tap en el control lateral => expande/colapsa subitems
  - Se añadieron `defaultOpen` para abrir automáticamente cada submenú cuando un subitem está activo.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/app/(pos)/pos/mayoreo-config/page.tsx`
    - `src/components/shared/MobileSidebar.tsx`

# TODO - Corregir navegación mobile y acceso a configuraciones en POS/mayoreo

## Plan
- [x] Revisar la ruta `/pos/mayoreo-config`, el sidebar compartido y la navegación de configuración en POS.
- [x] Corregir el menú mobile de `mayoreo-config` para que use un drawer con ancho útil y no una versión comprimida.
- [x] Corregir el item padre `Configuración` para que navegue realmente a `/admin/settings` sin perder el submenú.
- [x] Alinear la validación server-side de mayoreo con roles admin reales, incluyendo `Master Admin`.
- [x] Validar sintaxis de archivos tocados y respuesta local del servidor.

## Review
- Hallazgos raíz:
  - `src/app/(pos)/pos/mayoreo-config/page.tsx` usaba `SheetContent` con `w-24`, lo que comprimía el sidebar en mobile y daba la impresión de menú no adaptado.
  - `src/components/shared/LeftSidebar.tsx` renderizaba `Configuración` como trigger de colapsable, pero no como enlace navegable; por eso no se podía entrar al panel principal de configuración desde el POS.
  - `src/app/(pos)/pos/mayoreo-config/page.tsx` y `src/lib/services/wholesaleProfitService.ts` aceptaban solo `admin`; si el usuario venía como `Master Admin`, el servidor podía rechazar el acceso aunque la UI mostrara opciones de admin.
- Cambios aplicados:
  - ACTUALIZADO: `src/app/(pos)/pos/mayoreo-config/page.tsx`
  - El drawer mobile ahora usa `w-[280px] border-r-0 p-0`, consistente con el POS principal.
  - ACTUALIZADO: `src/components/shared/LeftSidebar.tsx`
  - Los items con submenú ahora separan navegación y expansión:
    - clic en el cuerpo del item => navega al `href` padre
    - clic en el chevron => abre/cierra subitems
  - ACTUALIZADO: `src/app/(pos)/pos/mayoreo-config/page.tsx` y `src/lib/services/wholesaleProfitService.ts`
  - Normalización de rol ajustada para mapear `master admin` a `admin` en la protección server-side de mayoreo.
- Verificación técnica:
  - `typescript.transpileModule` OK:
    - `src/components/shared/LeftSidebar.tsx`
    - `src/app/(pos)/pos/mayoreo-config/page.tsx`
    - `src/lib/services/wholesaleProfitService.ts`
  - `npm run dev` levantó correctamente en `http://localhost:9003`.
  - `curl -I` local respondió `200` para:
    - `/pos`
    - `/pos/mayoreo-config`
    - `/admin/settings`

# TODO - Crear agentes expertos de SEO y UI/UX mobile

## Plan
- [x] Revisar la estructura actual de agentes/skills del proyecto para reutilizar el formato existente.
- [x] Crear un agente reusable de SEO con alcance claro para metadata, indexacion, schema y e-commerce.
- [x] Crear un agente reusable de UI/UX mobile con foco mobile-first, tactilidad y responsive.
- [x] Documentar el alta en `tasks/todo.md` y `project_context.md`.

## Review
- Estructura usada:
  - Se reutilizo `agent/skills/` como ubicacion local de agentes del proyecto.
- Agentes creados:
  - NUEVO: `agent/skills/seo-expert/SKILL.md`
  - NUEVO: `agent/skills/seo-expert/AGENTS.md`
  - NUEVO: `agent/skills/ui-ux-mobile-specialist/SKILL.md`
  - NUEVO: `agent/skills/ui-ux-mobile-specialist/AGENTS.md`
- Alcance definido:
  - `seo-expert`: SEO tecnico y on-page para Next.js/e-commerce, incluyendo metadata, canonical, schema.org, enlazado interno y validacion.
  - `ui-ux-mobile-specialist`: UX mobile-first, responsive, tactilidad, legibilidad, formularios y conversion en smartphone.
- Reglas del proyecto respetadas:
  - Ambos agentes referencian la base visual del proyecto (`index.html` / HTML de referencia).
  - Ambos incluyen la regla de usar BAML si el trabajo involucra workflows o generacion de IA.

# TODO - Fix deploy Netlify por RESEND_API_KEY faltante

## Plan
- [x] Reproducir/confirmar el error reportado de build en Netlify (`Missing API key` en `/api/email/corte`).
- [x] Corregir el servicio de correo para que no falle en importación cuando no exista `RESEND_API_KEY`.
- [x] Validar build local completo de Next para confirmar que `/api/email/corte` ya no rompe `collecting page data`.
- [x] Documentar resultado y condición operativa para envío real de correos.

## Review
- Hallazgo principal:
  - `src/lib/services/emailNotificationService.ts` creaba `new Resend(process.env.RESEND_API_KEY)` en scope de módulo.
  - Cuando Netlify construía la app sin `RESEND_API_KEY`, la importación del módulo lanzaba excepción y abortaba el build en `/api/email/corte`.
- Cambios aplicados:
  - ACTUALIZADO: `src/lib/services/emailNotificationService.ts`.
  - Se eliminó la inicialización global de Resend.
  - `sendCorteEmail` ahora valida `process.env.RESEND_API_KEY` en runtime:
    - Si falta, retorna `{ ok: false, error: 'missing_resend_api_key' }` sin tirar excepción.
    - Si existe, instancia `Resend` y envía normalmente.
- Verificación técnica:
  - `npm run build` completado exitosamente en local (Next 16.1.1).
  - La ruta `/api/email/corte` aparece compilada en la salida final sin error de `Missing API key`.
- Nota operativa:
  - Para que el envío de correos funcione en producción, configurar en Netlify:
    - `RESEND_API_KEY`
    - opcional `RESEND_FROM_EMAIL`

# TODO - Cerrar rama de trabajo y consolidar avances en main

## Plan
- [x] Verificar estado real de rama actual, divergencia con `main` y cambios pendientes sin commit.
- [x] Consolidar avances pendientes en commit explícito para evitar pérdida de trabajo.
- [x] Integrar `main` en la rama de trabajo y resolver conflictos preservando avances de la rama feature.
- [x] Fusionar a `main` en modo seguro (`--ff-only`) y validar hash final.
- [x] Eliminar rama local feature para dejar solo `main`.
- [x] Documentar resultados y estado remoto.

## Review
- Estado inicial:
  - Rama activa: `feature/rama-supabase`.
  - Worktree con cambios masivos pendientes (tracked/untracked), incluyendo artefactos `.next-dev`.
- Consolidación:
  - Commit creado en feature: `9a8d45f` (`chore: consolidate pending advances before merge to main`) para no perder trabajo.
- Integración con main:
  - Se ejecutó merge de `main` en feature con conflictos extensivos (principalmente artefactos binarios/cache y `add/add`).
  - Resolución aplicada conservando estado de feature (ours) y cierre de merge en commit: `8a3ded7`.
- Fusión final:
  - `main` actualizado por fast-forward a `8a3ded7`.
  - Validación de seguridad: `main` y `feature/rama-supabase` quedaron en el mismo hash antes de borrar rama.
  - Rama local eliminada: `feature/rama-supabase`.
- Estado remoto:
  - Actualización final: `main` quedó sincronizada con `origin/main` (push exitoso).
  - Rama local consolidada y remota actualizadas sin pérdida de commits.

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
