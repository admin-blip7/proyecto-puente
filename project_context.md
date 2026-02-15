# Project Context

## Fecha de Inicio
2025-02-12

## Objetivo Principal
Implementar tienda online 22 Electronic con integración a Supabase existente.

## Estado General
**En Progreso**

---

## Tienda Online (22 Electronic)
### Completados

1. **Estructura de rutas (tienda)** - Crear route group dedicado
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: Layout dedicado en `src/app/(tienda)/` con header, footer y provider de carrito

2. **Servicios de productos** - Integración con Supabase existente
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: `tiendaProductService.ts` con funciones para fetch productos, categorías y filtrado

3. **Sistema de Carrito** - Server-side con localStorage fallback
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: CartProvider con hooks y CartDrawer para UI

4. **Componentes Visuales** - Estilo 22 Electronic
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: Header, Footer, ProductCard, HeroBanner con diseño basado en index.html

5. **Páginas Principales** - Home y detalle de producto
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: `/tienda/page.tsx` y `/tienda/producto/[id]/page.tsx`

6. **Sistema de Categorías** - Navegación y filtrado
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: Páginas de categorías con filtros de precio, ordenamiento y paginación

7. **Checkout** - Formulario de pago
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: `/tienda/checkout/page.tsx` con formulario de envío y pago

8. **Páginas informativas** - Envíos, Devoluciones, Garantía
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: `/tienda/envios`, `/tienda/devoluciones`, `/tienda/garantia`

9. **Página de Cuenta** - Dashboard de usuario
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: `/tienda/cuenta` con tabs para pedidos, datos, direcciones, deseos

10. **Búsqueda** - Página de resultados de búsqueda
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: `/tienda/buscar` con query parameter support

11. **Fix de Server Actions** - Separación de código
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Claude
   - Descripción: Separar server actions de CartProvider a `cartServerActions.ts`

12. **Eliminación de Payload CMS** - Limpieza de integración no requerida
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Eliminadas rutas `src/app/(cms)`, `payload.config.ts`, wrapper `withPayload` en `next.config.ts` y dependencias `@payloadcms/*`/`payload` en `package.json`

13. **Auditoría de implementación (Shopco + HiyoRi)** - Revisión de brechas
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Validado estado actual contra el plan maestro; identificadas brechas en Drizzle, Stripe real, auth middleware, CMS admin HiyoRi y carrito server-side sin localStorage

14. **CMS estilo HiyoRi (base funcional)** - Nuevo panel separado
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Creado `/tienda-admin` con dashboard, productos, ordenes y ajustes; conectado a Supabase via `tiendaCmsService` y guardado de contenido en tabla `settings` (`tienda_content`)

15. **Seguridad y contenido dinámico de tienda** - Middleware + CMS público
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Protección de `/tienda-admin` con middleware validando token/rol admin en Supabase; login con redirect `next`; Hero/Footer de tienda conectados a `tienda_content` en tabla `settings`

16. **Fix runtime tienda (Next 16)** - Hidratación, params async e iconos
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Corregido layout anidado en `(tienda)`; actualizadas rutas dinámicas para `await params`; reemplazados SVG inválidos del footer y ajuste de `data-scroll-behavior` en root layout

17. **Fix scanner POS (ZXing)** - Resolución de dependencia faltante
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Instalada peer dependency `@zxing/library` requerida por `@zxing/browser` para eliminar errores `Module not found` en `CodeScannerDialog`

18. **Fix runtime tienda/garantia** - Error "unexpected response"
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Corregido `ReferenceError: X is not defined` agregando import faltante del icono `X` en `/tienda/garantia`; build de Next exitoso

19. **Hardening dev server Next (POS)** - ENOENT/SST panic con Turbopack
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Aislado `distDir` de desarrollo en `.next-dev`; scripts `dev/dev:stable/dev:clean` migrados a `webpack`; agregado `dev:turbo` opcional y limpieza de `.next-dev` para evitar errores ENOENT y panics SST

20. **Fix Next 16 query params en tienda** - `searchParams` async
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Corregido acceso de `searchParams` como `Promise` en `/tienda/categorias`, `/tienda/categoria/[slug]` y `/tienda/buscar` para eliminar errores runtime de sync dynamic APIs

21. **Alineacion de tema 22 Design** - Paleta global desde `22desing.html`
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Actualizados tokens globales de color (`globals.css`) y paleta utilitaria (`tailwind.config.ts`) para coincidir con 22 Design (`#FFD600`, `#3B82F6`, `#050505`, `#F5F5F5`)

22. **Identidad visual tienda (22 Design completo)** - Aplicacion de estilo en UI
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Aplicado estilo 22 Design en layout y componentes de tienda (header, hero, cards, categorias, features y footer) con fondo de reticula, paneles y CTAs consistentes

23. **Limpieza de warnings de desarrollo** - Ajustes de scripts y config
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Eliminado `NODE_TLS_REJECT_UNAUTHORIZED=0` del script `dev` (movido a `dev:insecure`) y removido override de `devtool` en `next.config.ts` para reducir warnings de inicio en desarrollo

24. **Logo Tienda 22 Design** - Lockup "Twenty / Two / Electronic."
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Implementado componente `TiendaLogo` basado en `22desing.html` y aplicado en header/footer de la tienda para un branding consistente

25. **Ajuste de lockup de logo** - Version en 2 lineas
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Actualizado `TiendaLogo` a 2 lineas (`Twenty Two` + `Electronic.`) segun correccion de branding; heredado en header y footer

26. **Ajuste final de composicion del logo** - "Twenty" / "Two Electronic."
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Refinado `TiendaLogo` para separar exactamente en dos filas: primera `Twenty`, segunda `Two Electronic.` con `Two` en italic

27. **Refinado de branding de logo** - Version en 3 lineas con acento
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Ajustado `TiendaLogo` a tres lineas (`Twenty` / `Two` / `Electronic.`) y aplicado acento visual en `Two` con italic + color `accent`

28. **Ajuste final de color de logo** - Lockup en negro
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Removido acento de color en `TiendaLogo` para dejar todo el lockup (`Twenty / Two / Electronic.`) en negro, manteniendo la composicion en 3 lineas

29. **Ajuste de escala de logo** - Version mas pequena
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Reducido tamaño tipografico del componente `TiendaLogo` para header/footer (`text-lg lg:text-xl`) manteniendo composicion y estilo

30. **Ajuste fino de tamaño de logo en header** - Escala reducida
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Reducida la instancia del logo en `TiendaHeader` a `text-base lg:text-lg` para mejor balance visual en navegación

31. **Ajuste visual de tarjetas de beneficios** - Iconos sobre fondo blanco
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Cambiado fondo de los mini-cuadros de icono a blanco en `FeaturesSection` para coincidir con referencia visual

32. **Verificacion de carrusel mobile en categorias** - Ajuste de clase de scrollbar
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Validado que `CategoriesSlider` funciona como carrusel en mobile (`overflow-x-auto` + cards `min-w`); corregida clase `hide-scrollbar` a `no-scrollbar`

33. **Refuerzo UX de carrusel mobile** - Snap y gesto horizontal
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Mejorado `CategoriesSlider` en mobile con `snap-x/snap-mandatory`, `snap-start`, `touch-pan-x` y `overscroll-x-contain` para slide más consistente

34. **Fix de desplazamiento en categorias mobile** - Overflow horizontal garantizado
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Ajustado `CategoriesSlider` con track interno `w-max min-w-full` y tarjetas `flex-none` con ancho `vw` para asegurar scroll horizontal hacia la derecha en móvil

35. **Fix de gesto touch en carrusel mobile** - Swipe horizontal prioritario
   - Estado: Completado
   - Fecha: 2026-02-13
   - Agente: Codex
   - Descripción: Implementado manejo táctil horizontal en `CategoriesSlider` para evitar que el gesto desplace la página; se aplicó `preventDefault` condicional en pan horizontal, layout mobile en columna y flechas ocultas en móvil

35. **Imágenes de productos desde Supabase** - Fetch de Storage
    - Estado: Completado
    - Fecha: 2026-02-13
    - Agente: Kilo
    - Descripción: Actualizado `tiendaProductService.ts` con `getProductImageUrl` y campo `image_urls`; modificado `TiendaProductCard` y `ProductImageGallery` para mostrar imágenes de productos desde Supabase Storage

36. **Navegación del header de tienda** - Links funcionales
    - Estado: Completado
    - Fecha: 2026-02-13
    - Agente: Kilo
    - Descripción: Corregido `cartItemCount` a `itemCount` en TiendaHeader; creada página `/tienda/favoritos` con funcionalidad de wishlist

37. **Categorías con subcategorías en header** - Menú jerárquico
    - Estado: Completado
    - Fecha: 2026-02-14
    - Agente: Kilo
    - Descripción: Creada tabla `product_categories` en Supabase con jerarquía (parent/type); actualizadas 18 categorías incluyendo Accesorios (Audífonos, Cargadores, Cables, Fundas) y Celulares (Nuevos, Seminuevos); implementado dropdown con subcategorías en header

38. **Página de envíos completa** - Cobertura nacional y programa mayorista
     - Estado: Completado
     - Fecha: 2026-02-14
     - Agente: Kilo
     - Descripción: Actualizada página `/tienda/envios` con envíos al día siguiente en toda la República Mexicana, programa "Socio 22+" para mayoristas con descuentos por volumen, y opción de seguro de mercancía (3% del valor del pedido)

39. **Página de pagos seguros** - Métodos de pago PayPal, Stripe y OXXO
     - Estado: Completado
     - Fecha: 2026-02-14
     - Agente: OpenCode
     - Descripción: Creada página `/tienda/pagos` con información detallada de los 3 métodos de pago (Stripe/tarjetas, PayPal, OXXO/efectivo), sección de seguridad garantizada, y pasos para pago en OXXO

40. **Actualización de política de devoluciones** - 1 mes y 20% deducción
     - Estado: Completado
     - Fecha: 2026-02-14
     - Agente: OpenCode
     - Descripción: Actualizada página `/tienda/devoluciones` con plazo de 30 días (1 mes) para devoluciones y deducción del 20% por gastos operativos

41. **Páginas legales** - Privacidad y Términos
     - Estado: Completado
     - Fecha: 2026-02-14
     - Agente: OpenCode
     - Descripción: Creadas páginas `/tienda/privacidad` (aviso de privacidad con datos recopilados, derechos ARCO) y `/tienda/terminos` (términos y condiciones de compra, uso prohibido, limitación de responsabilidad)

42. **Actualización de categorías de header** - Renombrado y ordenamiento
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Antigravity
     - Descripción: Se cambió "Audio" por "Equipos de Sonido" y se ordenaron las categorías alfabéticamente en `TiendaHeader.tsx`

43. **Normalización de etiquetas de categorías** - Eliminación de guiones
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Antigravity
     - Descripción: Se implementó `formatCategoryLabel` en `utils.ts` y se aplicó en toda la tienda para mostrar nombres de categorías sin guiones y en formato Capitalizado (ej: "Equipos De Sonido")

44. **Acceso al POS desde la tienda** - Link en header
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Antigravity
     - Descripción: Se agregó un botón con icono `Monitor` en el header desktop y un link directo en el menú móvil para acceder rápidamente al sistema POS (`/pos`)

45. **Costo Histórico y Ganancia Neta Real**
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Antigravity
     - Descripción: Se implementó seguimiento de costos histórico agregando `cost_at_sale` a `sale_items`. Se actualizaron `salesService` y `financeService` para capturar y usar este costo, garantizando reportes de ganancia neta exactos.

46. **Corrección Flujo Nueva Reparación**
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Antigravity
     - Descripción: Se corrigió `createRepairOrder` en `actions.ts` para capturar correctamente los campos `deposit` y `devicePassword` que se estaban perdiendo al guardar la orden.

47. **Corrección Búsqueda de Etiquetas**
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Antigravity
     - Descripción: Se eliminó el límite artificial de 50 productos en la búsqueda de etiquetas (`LabelPrinterClient.tsx`) para permitir visualizar todo el inventario (~340 productos).

48. **Corrección Registro de Kardex en Ventas**
     - Estado: Completado
     - Fecha: 2026-02-15
     - Agente: Kilo
     - Descripción: Se agregó el registro de movimientos de tipo "SALIDA" en el kardex cuando se realiza una venta (salesService.ts) y "INGRESO" cuando se cancela una venta (api/sales/cancel/route.ts). Anteriormente el kardex solo registraba ingresos por entrada de stock.


---

## Payload CMS
### Estado
- Desactivado por decisión de arquitectura
- La tienda y panel deben operar sobre Supabase sin Payload

---

## Estructura del Proyecto

### Rutas Actuales
- `/app/(pos)/` - Sistema POS existente (NO MODIFICAR)
- `/app/(web)/` - Tienda web anterior (NO MODIFICAR)
- `/app/(tienda)/` - **NUEVA Tienda Online**

### Base de Datos (Supabase)
- Tablas existentes: `products`, `product_categories`, `sales`, `clients`
- Conexión vía `src/lib/supabaseClient.ts`

---

## Recursos de Diseño
- `index.html` - Design System v2.4 (22 Electronic)
- Colores primarios: #FFD600 (amarillo), #3B82F6 (azul), #050505 (negro)
- Tipografía: Editor's Note + Inter
- Estilos: Tailwind CSS + custom animations

---

## Próximos Pasos (Pendientes)
1. Integrar Stripe para procesar pagos reales
2. Migrar carrito a server-side cookies sin localStorage fallback
3. Implementar autenticación de usuarios (Supabase Auth)
4. Sistema de reseñas/calificaciones de productos
5. Añadir productos reales con imágenes desde Supabase Storage

---

## Notas Importantes
- La tienda usa datos DIRECTAMENTE de Supabase (no duplicar)
- El carrito es client-side con localStorage
- No usar Payload CMS en esta arquitectura
- No modificar rutas `(pos)` ni `(web)`
- El branding debe mantener consistencia con 22 Electronic
