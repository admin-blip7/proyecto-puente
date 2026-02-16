# TODO - Precio socio por paquete de 5 y envío gratis > 15,000 (tienda online)

## Plan
- [x] Crear utilidades de pricing para tienda: conservar precio regular, calcular base socio desde costo + 15%, validar paquete exacto de 5 y umbral de envío gratis.
- [x] Aplicar la lógica en catálogo y detalle de producto para mostrar claramente precio regular y precio de socio por producto.
- [x] Actualizar carrito y checkout para calcular subtotal con descuento socio solo cuando la cantidad por producto sea exactamente 5.
- [x] Configurar envío gratis únicamente cuando el total del pedido supere $15,000 MXN (tienda online).
- [x] Ajustar textos informativos de tienda para reflejar las nuevas reglas y validar compilación.

## Review
- Se creó `src/lib/tiendaPricing.ts` para centralizar reglas de tienda online: base socio desde costo + 15%, activación solo con cantidad exacta de 5 y umbral de envío gratis mayor a $15,000.
- Corrección aplicada por indicación del usuario: el precio regular no se toca; `tiendaProductService` conserva `product.price` y solo expone `socioPrice` calculado a partir de base `costo + 15%`.
- Se actualizaron vistas de producto (`TiendaProductCard`, `ProductInfo`) para mostrar ambos precios de forma explícita en cada producto.
- Se actualizó carrito/checkout (`CartProvider`, `CartDrawer`, `AddToCartButton`, `CheckoutForm`) para aplicar precio socio solo en líneas con cantidad exacta de 5 sin modificar precio regular, y calcular envío gratis solo si el subtotal final supera $15,000.
- Se alinearon textos informativos (`FeaturesSection`, `/tienda/envios`) con las nuevas reglas.
- Corrección adicional: se eliminó el descuento extra en `calculateSocioUnitPrice` para que el precio socio sea exactamente `costo + 15%` (ejemplo validado: costo 20 => socio 23.00).
- Validación:
  - `node` + `typescript.transpileModule` en archivos modificados de tienda: OK (sin errores de sintaxis).
  - `npm run build` y `npm run typecheck` no son señal confiable del cambio porque el repositorio ya tiene errores preexistentes fuera de tienda (`src/components/products/*` y `agent/skills/nextjs/templates/*`).
