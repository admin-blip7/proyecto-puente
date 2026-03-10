import { HelpArticle, HelpCategory, HelpTour, HelpVideo } from '@/types/help';

export const helpCategories: HelpCategory[] = [
  {
    id: 'inventario',
    slug: 'inventario-productos',
    title: 'Inventario y Productos',
    icon: '📦',
    description: 'Control de productos, stock, entradas y kardex',
    articleSlugs: ['inventario-agregar-producto', 'inventario-editar-producto', 'inventario-entrada-mercancia', 'inventario-kardex', 'inventario-ajustes', 'inventario-consignacion'],
  },
  {
    id: 'pos',
    slug: 'punto-de-venta-pos',
    title: 'Punto de Venta (POS)',
    icon: '🛒',
    description: 'Ventas, pagos, devoluciones y caja',
    articleSlugs: ['pos-inicio-rapido', 'pos-procesar-venta', 'pos-metodos-pago', 'pos-cambios-devoluciones', 'pos-escaner', 'pos-apertura-cierre-caja'],
  },
  {
    id: 'finanzas',
    slug: 'finanzas-y-cajas',
    title: 'Finanzas y Cajas',
    icon: '💰',
    description: 'Cuentas, gastos, ingresos y reportes',
    articleSlugs: ['finanzas-cuentas', 'finanzas-gastos', 'finanzas-registrar-gasto-flujo', 'finanzas-ingresos', 'finanzas-cierre-caja'],
  },
  {
    id: 'reparaciones',
    slug: 'reparaciones-y-garantias',
    title: 'Reparaciones y Garantías',
    icon: '🔧',
    description: 'Órdenes técnicas, costos y garantías',
    articleSlugs: ['reparaciones-crear-orden', 'reparaciones-seguimiento', 'reparaciones-refacciones', 'garantias-registrar'],
  },
  {
    id: 'rutas',
    slug: 'rutas-y-entregas',
    title: 'Rutas y Entregas',
    icon: '🚚',
    description: 'Planeación logística y confirmaciones',
    articleSlugs: ['rutas-crear-ruta', 'rutas-asignar-repartidor', 'rutas-confirmar-entrega'],
  },
  {
    id: 'crm',
    slug: 'crm-y-clientes',
    title: 'CRM y Clientes',
    icon: '👥',
    description: 'Clientes, historial y tareas',
    articleSlugs: ['crm-agregar-cliente', 'crm-interacciones', 'crm-tareas-etiquetas'],
  },
  {
    id: 'configuracion',
    slug: 'configuracion',
    title: 'Configuración',
    icon: '⚙️',
    description: 'Impresoras, tickets, etiquetas y roles',
    articleSlugs: ['configuracion-impresoras', 'configuracion-tickets', 'configuracion-usuarios-roles'],
  },
  {
    id: 'tienda',
    slug: 'tienda-online',
    title: 'Tienda Online',
    icon: '🏪',
    description: 'Flujo de compra y seguimiento en /tienda',
    articleSlugs: ['tienda-guia-comprador', 'tienda-checkout', 'tienda-seguimiento'],
  },
];

const article = (data: HelpArticle): HelpArticle => data;

export const helpArticles: Record<string, HelpArticle> = {
  'pos-inicio-rapido': article({
    slug: 'pos-inicio-rapido', title: 'Guía de inicio rápido en POS', category: 'pos', module: 'POS', description: 'Prepara caja y realiza tu primera venta en minutos.',
    tags: ['pos', 'primera venta', 'caja'], roleHints: ['Admin', 'Cajero', 'Socio'], intro: 'Esta guía cubre la apertura básica para operar sin fricción.',
    steps: ['Abre el módulo POS desde el menú lateral.', 'Verifica sucursal activa y sesión de caja.', 'Escanea o busca un producto.', 'Agrega cliente si aplica.', 'Confirma pago y emite ticket.'],
    tips: ['Usa el buscador con SKU para mayor velocidad.'], warnings: ['No abras una segunda caja simultánea en la misma sucursal.'], related: ['pos-procesar-venta', 'pos-apertura-cierre-caja'],
    views: 2301, helpfulCount: 1810, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura POS - pantalla principal', 'Captura POS - carrito activo'], videoId: 'video-pos-01'
  }),
  'pos-procesar-venta': article({ slug: 'pos-procesar-venta', title: 'Cómo procesar una venta', category: 'pos', module: 'POS', description: 'Flujo completo de cobro en mostrador.', tags: ['venta', 'ticket'], roleHints: ['Admin', 'Cajero', 'Socio'], intro: 'Aprende el flujo estándar con validaciones clave.', steps: ['Selecciona productos.', 'Aplica descuentos autorizados.', 'Elige método de pago.', 'Confirma y guarda venta.'], tips: ['Confirma cantidad antes de cobrar.'], warnings: ['Evita cerrar la ventana durante el guardado.'], related: ['pos-metodos-pago', 'pos-cambios-devoluciones'], views: 1540, helpfulCount: 1209, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura POS - checkout'] }),
  'pos-metodos-pago': article({ slug: 'pos-metodos-pago', title: 'Métodos de pago disponibles', category: 'pos', module: 'POS', description: 'Efectivo, transferencia, tarjeta y pagos mixtos.', tags: ['pagos'], roleHints: ['Admin', 'Cajero', 'Socio'], intro: 'Configura y selecciona método correcto por transacción.', steps: ['Abre sección de pago.', 'Selecciona método.', 'Registra referencia si aplica.', 'Confirma total.'], tips: ['Guarda referencia para conciliación financiera.'], warnings: ['No marques pago confirmado sin evidencia.'], related: ['finanzas-cuentas'], views: 981, helpfulCount: 802, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura POS - métodos de pago'] }),
  'pos-cambios-devoluciones': article({ slug: 'pos-cambios-devoluciones', title: 'Cómo manejar devoluciones y cambios', category: 'pos', module: 'POS', description: 'Procedimiento seguro para devoluciones parciales o totales.', tags: ['devoluciones', 'cambios'], roleHints: ['Admin', 'Cajero'], intro: 'Evita inconsistencias de caja y stock con este flujo.', steps: ['Busca venta original.', 'Selecciona productos a devolver.', 'Define método de reembolso.', 'Confirma movimiento.'], tips: ['Adjunta motivo para auditoría.'], warnings: ['No proceses devolución sin ticket o referencia válida.'], related: ['inventario-kardex', 'finanzas-cierre-caja'], views: 777, helpfulCount: 588, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura POS - historial ventas'] }),
  'pos-escaner': article({ slug: 'pos-escaner', title: 'Uso de escáner de códigos de barras', category: 'pos', module: 'POS', description: 'Configuración rápida y buenas prácticas de escaneo.', tags: ['scanner', 'barcode'], roleHints: ['Admin', 'Cajero'], intro: 'Reduce errores de captura manual en caja.', steps: ['Conecta escáner USB.', 'Posiciona cursor en búsqueda.', 'Escanea código.', 'Verifica coincidencia de producto.'], tips: ['Configura modo teclado del escáner.'], warnings: ['No uses códigos incompletos o dañados.'], related: ['pos-procesar-venta'], views: 503, helpfulCount: 410, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura POS - lector'] }),
  'pos-apertura-cierre-caja': article({ slug: 'pos-apertura-cierre-caja', title: 'Apertura y cierre de caja', category: 'pos', module: 'POS', description: 'Control de sesión diaria de caja.', tags: ['caja', 'sesion'], roleHints: ['Admin', 'Cajero', 'Socio'], intro: 'Establece disciplina operativa para auditoría correcta.', steps: ['Abre caja con fondo inicial.', 'Registra gastos rápidos durante turno.', 'Haz corte al final del turno.', 'Confirma diferencia y cierre.'], tips: ['Incluye observaciones de incidencias.'], warnings: ['No cierres sesión sin arqueo físico.'], related: ['finanzas-cierre-caja'], views: 1288, helpfulCount: 1020, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura POS - apertura de caja', 'Captura POS - cierre de caja'] }),

  'inventario-agregar-producto': article({ slug: 'inventario-agregar-producto', title: 'Agregar nuevo producto', category: 'inventario', module: 'Inventario', description: 'Crea productos con precio, costo y stock inicial.', tags: ['inventario', 'producto'], roleHints: ['Admin', 'Socio'], intro: 'Define estructura limpia desde el inicio para evitar retrabajo.', steps: ['Ir a Inventario > Nuevo producto.', 'Completar datos clave.', 'Asignar categoría y atributos.', 'Guardar y validar en listado.'], tips: ['Usa SKU único y consistente por familia.'], warnings: ['No dupliques productos existentes.'], related: ['inventario-editar-producto', 'inventario-entrada-mercancia'], views: 1645, helpfulCount: 1390, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Inventario - formulario alta'], videoId: 'video-inv-01' }),
  'inventario-editar-producto': article({ slug: 'inventario-editar-producto', title: 'Editar productos existentes', category: 'inventario', module: 'Inventario', description: 'Actualiza precios, descripción y atributos.', tags: ['editar', 'precio'], roleHints: ['Admin', 'Socio'], intro: 'Mantén catálogo actualizado para POS y tienda online.', steps: ['Busca el producto.', 'Abre edición.', 'Actualiza campos.', 'Guarda y verifica cambios.'], tips: ['Registra motivo en ajustes de costo relevantes.'], warnings: ['Revisa impacto de cambios en margen.'], related: ['inventario-agregar-producto'], views: 840, helpfulCount: 660, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Inventario - edición'] }),
  'inventario-entrada-mercancia': article({ slug: 'inventario-entrada-mercancia', title: 'Entrada de mercancía (Stock Entry)', category: 'inventario', module: 'Inventario', description: 'Registra compras y aumenta stock con trazabilidad.', tags: ['stock entry', 'kardex'], roleHints: ['Admin', 'Socio'], intro: 'Flujo recomendado para ingresos de mercancía.', steps: ['Abre módulo Entrada de mercancía.', 'Selecciona proveedor y referencia.', 'Agrega productos y cantidades.', 'Confirma entrada.'], tips: ['Adjunta fotos/factura cuando sea posible.'], warnings: ['No uses este flujo para correcciones manuales de inventario.'], related: ['inventario-kardex', 'inventario-ajustes'], views: 1422, helpfulCount: 1155, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Stock Entry - detalle'], videoId: 'video-inv-02' }),
  'inventario-kardex': article({ slug: 'inventario-kardex', title: 'Sistema de kardex', category: 'inventario', module: 'Inventario', description: 'Audita entradas y salidas de productos.', tags: ['kardex', 'auditoria'], roleHints: ['Admin', 'Socio'], intro: 'Kardex es la base de trazabilidad de movimiento de inventario.', steps: ['Filtra producto.', 'Revisa movimientos por fecha.', 'Valida origen del movimiento.', 'Exporta reporte si necesitas auditoría.'], tips: ['Cruza movimientos con ventas y entradas.'], warnings: ['Diferencias repetidas sugieren proceso incorrecto.'], related: ['inventario-ajustes', 'pos-cambios-devoluciones'], views: 1011, helpfulCount: 823, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Kardex - historial'] }),
  'inventario-ajustes': article({ slug: 'inventario-ajustes', title: 'Ajustes de inventario', category: 'inventario', module: 'Inventario', description: 'Corrige stock por mermas, daño o conteo físico.', tags: ['ajuste', 'stock'], roleHints: ['Admin', 'Socio'], intro: 'Usa ajustes solo para corrección controlada.', steps: ['Abre pantalla de ajuste.', 'Selecciona producto y motivo.', 'Ingresa cantidad.', 'Confirma con evidencia.'], tips: ['Adjunta observaciones claras.'], warnings: ['No uses ajustes para entradas de compra.'], related: ['inventario-entrada-mercancia'], views: 690, helpfulCount: 554, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Inventario - ajuste'] }),
  'inventario-consignacion': article({ slug: 'inventario-consignacion', title: 'Productos en consigna', category: 'inventario', module: 'Consignaciones', description: 'Registra y liquida productos de terceros en consigna.', tags: ['consigna'], roleHints: ['Admin', 'Socio'], intro: 'Permite vender inventario no propio con control financiero.', steps: ['Registrar consignador.', 'Asociar productos.', 'Vender desde POS.', 'Liquidar pagos al consignador.'], tips: ['Define porcentaje y plazo desde el inicio.'], warnings: ['Evita ventas sin consignador asociado.'], related: ['finanzas-cuentas'], views: 402, helpfulCount: 315, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Consignaciones - resumen'] }),

  'finanzas-cuentas': article({ slug: 'finanzas-cuentas', title: 'Gestión de cuentas bancarias', category: 'finanzas', module: 'Finanzas', description: 'Crea y administra cuentas para conciliación.', tags: ['finanzas', 'cuentas'], roleHints: ['Admin', 'Socio'], intro: 'Base de control financiero por sucursal y empresa.', steps: ['Ir a Finanzas > Cuentas.', 'Crear cuenta con saldo inicial.', 'Asignar tipo.', 'Guardar.'], tips: ['Separa cuentas operativas de ahorro.'], warnings: ['No mezcles flujos personales y empresariales.'], related: ['finanzas-gastos', 'finanzas-ingresos'], views: 550, helpfulCount: 441, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Finanzas - cuentas'] }),
  'finanzas-gastos': article({ slug: 'finanzas-gastos', title: 'Registro de gastos', category: 'finanzas', module: 'Finanzas', description: 'Captura gastos con categoría y evidencia.', tags: ['gastos'], roleHints: ['Admin', 'Socio'], intro: 'Asegura reportes precisos y cierres correctos.', steps: ['Abrir Gastos.', 'Seleccionar categoría.', 'Ingresar monto y fecha.', 'Guardar con nota.'], tips: ['Usa categorías consistentes para mejores reportes.'], warnings: ['No dejes gastos sin categoría.'], related: ['finanzas-registrar-gasto-flujo', 'finanzas-cierre-caja'], views: 703, helpfulCount: 569, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Finanzas - gastos'] }),
  'finanzas-registrar-gasto-flujo': article({
    slug: 'finanzas-registrar-gasto-flujo',
    title: 'Flujo completo para registrar un gasto',
    category: 'finanzas',
    module: 'Finanzas',
    description: 'Paso a paso para registrar gastos correctamente con cuenta, categoría y comprobante.',
    tags: ['gastos', 'flujo', 'egresos', 'caja'],
    roleHints: ['Admin', 'Socio'],
    intro: 'Sigue este flujo operativo para evitar errores en reportes, cierres de caja y conciliación.',
    steps: [
      'Ir a Finanzas > Gastos y presionar "Nuevo gasto".',
      'Seleccionar sucursal y cuenta de salida (caja, banco o cuenta operativa).',
      'Elegir la categoría del gasto (renta, nómina, servicios, insumos, logística, etc.).',
      'Capturar monto, fecha real del gasto y método de pago.',
      'Agregar concepto claro y referencia (folio, proveedor o ticket).',
      'Adjuntar comprobante/foto de factura o recibo.',
      'Guardar y verificar que el movimiento aparezca en historial y reportes.',
    ],
    tips: [
      'Usa siempre la misma categoría para gastos recurrentes.',
      'Si es gasto de caja chica, regístralo el mismo día para evitar descuadres.',
      'Incluye referencia de proveedor para facilitar auditoría.',
    ],
    warnings: [
      'No registres un gasto en una cuenta incorrecta: impacta cierres y conciliación.',
      'No dejes movimientos sin comprobante cuando la política interna lo exige.',
      'Evita editar gastos cerrados sin autorización administrativa.',
    ],
    related: ['finanzas-gastos', 'finanzas-cierre-caja', 'finanzas-cuentas'],
    views: 318,
    helpfulCount: 247,
    lastUpdated: '2026-02-22',
    screenshotPlaceholders: [
      'Captura Finanzas - botón nuevo gasto',
      'Captura Finanzas - formulario registrar gasto',
      'Captura Finanzas - historial de egresos',
    ],
  }),
  'finanzas-ingresos': article({ slug: 'finanzas-ingresos', title: 'Registro de ingresos', category: 'finanzas', module: 'Finanzas', description: 'Registra ingresos extra fuera de venta directa.', tags: ['ingresos'], roleHints: ['Admin', 'Socio'], intro: 'Útil para depósitos, servicios o ajustes positivos.', steps: ['Abrir Ingresos.', 'Seleccionar cuenta destino.', 'Capturar monto y concepto.', 'Confirmar.'], tips: ['Diferencia ingresos operativos y extraordinarios.'], warnings: ['No dupliques ingresos ya registrados por venta.'], related: ['finanzas-cuentas', 'finanzas-gastos'], views: 512, helpfulCount: 399, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Finanzas - ingresos'] }),
  'finanzas-cierre-caja': article({ slug: 'finanzas-cierre-caja', title: 'Cierre de caja y reportes', category: 'finanzas', module: 'Finanzas', description: 'Consolida corte diario y detecta diferencias.', tags: ['cierre', 'arqueo'], roleHints: ['Admin', 'Cajero', 'Socio'], intro: 'Cierra con evidencia para evitar inconsistencias.', steps: ['Genera corte del turno.', 'Compara efectivo esperado vs real.', 'Registra diferencias.', 'Cierra sesión.'], tips: ['Conserva comprobantes del día.'], warnings: ['No postergues cierres de caja.'], related: ['pos-apertura-cierre-caja'], views: 1199, helpfulCount: 978, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Finanzas - cierre'] }),

  'reparaciones-crear-orden': article({ slug: 'reparaciones-crear-orden', title: 'Crear orden de reparación', category: 'reparaciones', module: 'Reparaciones', description: 'Recepción técnica con diagnóstico inicial y depósito.', tags: ['reparacion'], roleHints: ['Admin', 'Socio'], intro: 'Registra correctamente equipo y condiciones de ingreso.', steps: ['Abrir módulo Reparaciones.', 'Capturar datos del equipo.', 'Agregar falla reportada.', 'Guardar orden.'], tips: ['Incluye IMEI/serial y fotos del estado físico.'], warnings: ['No recibas equipo sin hoja de recepción.'], related: ['reparaciones-seguimiento'], views: 880, helpfulCount: 721, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Reparaciones - nueva orden'] }),
  'reparaciones-seguimiento': article({ slug: 'reparaciones-seguimiento', title: 'Seguimiento de estatus de reparación', category: 'reparaciones', module: 'Reparaciones', description: 'Actualiza avance y comunica estatus al cliente.', tags: ['estatus'], roleHints: ['Admin', 'Socio'], intro: 'Mantén transparencia del proceso técnico.', steps: ['Busca orden.', 'Actualiza estatus.', 'Agrega notas internas.', 'Notifica cliente.'], tips: ['Define SLA por tipo de reparación.'], warnings: ['No cierres orden sin validar pruebas finales.'], related: ['reparaciones-refacciones'], views: 664, helpfulCount: 530, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Reparaciones - tracking'] }),
  'reparaciones-refacciones': article({ slug: 'reparaciones-refacciones', title: 'Agregar refacciones y calcular costos', category: 'reparaciones', module: 'Reparaciones', description: 'Registra piezas usadas para costo final real.', tags: ['costos', 'refacciones'], roleHints: ['Admin', 'Socio'], intro: 'Controla rentabilidad y exactitud de presupuestos.', steps: ['Abre detalle de orden.', 'Agrega refacciones.', 'Define mano de obra.', 'Recalcula total.'], tips: ['Usa costos actualizados del inventario.'], warnings: ['Evita precios manuales sin autorización.'], related: ['reparaciones-crear-orden'], views: 477, helpfulCount: 362, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Reparaciones - costos'] }),
  'garantias-registrar': article({ slug: 'garantias-registrar', title: 'Registrar y gestionar garantías', category: 'reparaciones', module: 'Garantías', description: 'Alta de garantías y revisión de cobertura.', tags: ['garantia'], roleHints: ['Admin', 'Socio'], intro: 'Reduce fricción en postventa y reclamos.', steps: ['Ir a Garantías.', 'Registrar venta/producto.', 'Definir vigencia.', 'Guardar documento.'], tips: ['Asocia ticket original para validación rápida.'], warnings: ['No apruebes garantía fuera de política.'], related: ['pos-cambios-devoluciones'], views: 590, helpfulCount: 460, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Garantías - formulario'] }),

  'rutas-crear-ruta': article({ slug: 'rutas-crear-ruta', title: 'Crear primera ruta de entrega', category: 'rutas', module: 'Rutas', description: 'Planifica ruta con paradas y horario.', tags: ['ruta', 'entrega'], roleHints: ['Admin', 'Socio'], intro: 'Construye una ruta eficiente y asignable.', steps: ['Abrir Rutas > Nueva ruta.', 'Seleccionar fecha y sucursal.', 'Agregar paradas.', 'Guardar manifiesto.'], tips: ['Agrupa por zona para reducir tiempos.'], warnings: ['No mezcles rutas de diferentes sucursales sin control.'], related: ['rutas-asignar-repartidor'], views: 715, helpfulCount: 560, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Rutas - crear ruta'], videoId: 'video-ruta-01' }),
  'rutas-asignar-repartidor': article({ slug: 'rutas-asignar-repartidor', title: 'Asignar repartidor y salida de ruta', category: 'rutas', module: 'Rutas', description: 'Asigna operador y activa estado en tránsito.', tags: ['repartidor'], roleHints: ['Admin', 'Socio'], intro: 'Asegura trazabilidad desde el despacho.', steps: ['Abrir detalle de ruta.', 'Asignar repartidor.', 'Verificar orden de paradas.', 'Iniciar ruta.'], tips: ['Comparte manifiesto por WhatsApp antes de salida.'], warnings: ['No inicies ruta sin confirmar items cargados.'], related: ['rutas-confirmar-entrega'], views: 403, helpfulCount: 321, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Rutas - asignación'] }),
  'rutas-confirmar-entrega': article({ slug: 'rutas-confirmar-entrega', title: 'Confirmación de entrega con foto y firma', category: 'rutas', module: 'Rutas', description: 'Cierra paradas con evidencia digital.', tags: ['firma', 'foto'], roleHints: ['Admin', 'Socio'], intro: 'Reduce disputas y mejora calidad de cierre.', steps: ['Abrir vista móvil de ruta.', 'Seleccionar parada.', 'Tomar foto y capturar firma.', 'Confirmar entrega.'], tips: ['Haz foto de paquete entregado visible.'], warnings: ['No cerrar parada sin evidencia cuando sea obligatoria.'], related: ['rutas-crear-ruta'], views: 389, helpfulCount: 290, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Mobile - confirmación entrega'] }),

  'crm-agregar-cliente': article({ slug: 'crm-agregar-cliente', title: 'Agregar nuevo cliente en CRM', category: 'crm', module: 'CRM', description: 'Alta rápida de cliente con datos útiles.', tags: ['crm', 'cliente'], roleHints: ['Admin', 'Cajero', 'Socio'], intro: 'Un CRM limpio mejora seguimiento y recompra.', steps: ['Abrir CRM > Nuevo cliente.', 'Capturar datos de contacto.', 'Guardar y etiquetar.', 'Registrar primera nota.'], tips: ['Pide consentimiento para mensajes promocionales.'], warnings: ['No duplicar clientes con mismo teléfono.'], related: ['crm-interacciones'], views: 620, helpfulCount: 500, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura CRM - nuevo cliente'] }),
  'crm-interacciones': article({ slug: 'crm-interacciones', title: 'Historial de interacciones', category: 'crm', module: 'CRM', description: 'Registra llamadas, notas y seguimiento comercial.', tags: ['interacciones'], roleHints: ['Admin', 'Socio'], intro: 'Centraliza el contexto de cada cliente.', steps: ['Entrar al perfil del cliente.', 'Agregar interacción.', 'Definir resultado.', 'Programar siguiente contacto.'], tips: ['Usa notas cortas y accionables.'], warnings: ['No dejar tareas sin fecha de seguimiento.'], related: ['crm-tareas-etiquetas'], views: 428, helpfulCount: 347, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura CRM - historial'] }),
  'crm-tareas-etiquetas': article({ slug: 'crm-tareas-etiquetas', title: 'Tareas, etiquetas y segmentación', category: 'crm', module: 'CRM', description: 'Segmenta clientes para campañas y seguimiento.', tags: ['etiquetas', 'segmentos'], roleHints: ['Admin', 'Socio'], intro: 'Convierte tu CRM en una agenda comercial útil.', steps: ['Crea etiquetas por interés.', 'Asigna tareas por responsable.', 'Filtra cartera por segmento.', 'Ejecuta seguimiento.'], tips: ['Mantén nomenclatura estable de etiquetas.'], warnings: ['No crear etiquetas redundantes.'], related: ['crm-agregar-cliente'], views: 351, helpfulCount: 272, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura CRM - etiquetas'] }),

  'configuracion-impresoras': article({ slug: 'configuracion-impresoras', title: 'Configuración de impresoras', category: 'configuracion', module: 'Configuración', description: 'Conecta y valida impresoras térmicas y etiquetas.', tags: ['impresoras'], roleHints: ['Admin', 'Socio'], intro: 'Configura hardware antes de operación diaria.', steps: ['Abrir Ajustes > Impresoras.', 'Seleccionar dispositivo.', 'Probar impresión.', 'Guardar configuración.'], tips: ['Usa un test de ticket al inicio de turno.'], warnings: ['No cambiar drivers durante horario operativo.'], related: ['configuracion-tickets'], views: 498, helpfulCount: 401, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Configuración - impresoras'] }),
  'configuracion-tickets': article({ slug: 'configuracion-tickets', title: 'Diseño de tickets y etiquetas', category: 'configuracion', module: 'Configuración', description: 'Personaliza plantilla de ticket y etiqueta.', tags: ['tickets', 'etiquetas'], roleHints: ['Admin', 'Socio'], intro: 'Alinea impresión con identidad y necesidades operativas.', steps: ['Abrir diseñador.', 'Ajustar encabezado y campos.', 'Guardar plantilla.', 'Probar impresión.'], tips: ['Incluye datos fiscales requeridos.'], warnings: ['No eliminar campos críticos del ticket.'], related: ['configuracion-impresoras'], views: 532, helpfulCount: 440, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Configuración - diseñador'] }),
  'configuracion-usuarios-roles': article({ slug: 'configuracion-usuarios-roles', title: 'Gestión de usuarios y roles', category: 'configuracion', module: 'Configuración', description: 'Administra permisos de Admin, Socio y Cajero.', tags: ['roles', 'permisos'], roleHints: ['Admin'], intro: 'Protege operaciones sensibles con RBAC.', steps: ['Ir a Usuarios.', 'Crear/editar usuario.', 'Asignar rol y permisos.', 'Guardar y validar acceso.'], tips: ['Aplica principio de mínimo privilegio.'], warnings: ['No otorgar permisos financieros sin aprobación.'], related: ['pos-inicio-rapido'], views: 840, helpfulCount: 711, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Configuración - usuarios'] }),

  'tienda-guia-comprador': article({ slug: 'tienda-guia-comprador', title: 'Guía para compradores en tienda online', category: 'tienda', module: 'Tienda Online', description: 'Cómo buscar productos y comprar en /tienda.', tags: ['tienda', 'cliente'], roleHints: ['Cliente'], intro: 'Recorrido de compra simple para clientes finales.', steps: ['Entrar a /tienda.', 'Buscar producto.', 'Agregar al carrito.', 'Ir a checkout.'], tips: ['Revisa políticas de envío/devolución antes de pagar.'], warnings: ['No cerrar navegador antes de confirmar pago.'], related: ['tienda-checkout'], views: 1430, helpfulCount: 1177, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Tienda - home'] }),
  'tienda-checkout': article({ slug: 'tienda-checkout', title: 'Proceso de checkout', category: 'tienda', module: 'Tienda Online', description: 'Datos de envío, método de pago y confirmación.', tags: ['checkout', 'pago'], roleHints: ['Cliente'], intro: 'Finaliza compra con datos correctos para evitar incidencias.', steps: ['Verifica carrito.', 'Completa dirección de envío.', 'Selecciona método de pago.', 'Confirma pedido.'], tips: ['Usa teléfono activo para notificaciones.'], warnings: ['Verifica dirección antes de enviar.'], related: ['tienda-seguimiento'], views: 1205, helpfulCount: 990, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Tienda - checkout'] }),
  'tienda-seguimiento': article({ slug: 'tienda-seguimiento', title: 'Seguimiento de pedidos', category: 'tienda', module: 'Tienda Online', description: 'Consulta estado y fecha estimada de entrega.', tags: ['pedido', 'tracking'], roleHints: ['Cliente'], intro: 'Mantén visibilidad del pedido desde compra hasta entrega.', steps: ['Abre tu cuenta.', 'Ve a pedidos.', 'Selecciona pedido.', 'Consulta estatus y guía.'], tips: ['Habilita notificaciones para cambios de estatus.'], warnings: ['Contacta soporte si el estatus no cambia en 48h hábiles.'], related: ['rutas-confirmar-entrega'], views: 890, helpfulCount: 739, lastUpdated: '2026-02-22', screenshotPlaceholders: ['Captura Tienda - pedidos'] }),
};

export const helpTours: HelpTour[] = [
  { id: 'tour-pos-venta', title: 'Primera venta en POS', module: 'POS', steps: [
    { target: '#pos-search', title: 'Buscar producto', description: 'Usa SKU o nombre para ubicar producto.' },
    { target: '#pos-cart', title: 'Agregar al carrito', description: 'Confirma cantidad y precio.' },
    { target: '#pos-customer', title: 'Asignar cliente', description: 'Opcional para historial y CRM.' },
    { target: '#pos-payment', title: 'Seleccionar pago', description: 'Elige método y referencia.' },
    { target: '#pos-complete', title: 'Completar venta', description: 'Genera ticket y confirma guardado.' },
  ]},
  { id: 'tour-stock-entry', title: 'Primera entrada de mercancía', module: 'Inventario', steps: [
    { target: '#stock-supplier', title: 'Proveedor', description: 'Selecciona o crea proveedor.' },
    { target: '#stock-items', title: 'Productos', description: 'Agrega líneas de productos y cantidades.' },
    { target: '#stock-costs', title: 'Costos', description: 'Captura costo real por producto.' },
    { target: '#stock-save', title: 'Confirmar entrada', description: 'Guarda para impactar kardex y stock.' },
  ]},
  { id: 'tour-ruta', title: 'Crear primera ruta de entrega', module: 'Rutas', steps: [
    { target: '#route-new', title: 'Nueva ruta', description: 'Define fecha y sucursal operativa.' },
    { target: '#route-stops', title: 'Agregar paradas', description: 'Carga direcciones de entrega.' },
    { target: '#route-order', title: 'Ordenar paradas', description: 'Optimiza recorrido.' },
    { target: '#route-driver', title: 'Asignar repartidor', description: 'Selecciona responsable de ruta.' },
    { target: '#route-manifest', title: 'Generar manifiesto', description: 'Prepara salida con resumen.' },
    { target: '#route-start', title: 'Iniciar ruta', description: 'Cambia estado a en tránsito.' },
  ]},
  { id: 'tour-new-product', title: 'Agregar un producto nuevo', module: 'Inventario', steps: [
    { target: '#product-name', title: 'Nombre y SKU', description: 'Define identificadores únicos.' },
    { target: '#product-category', title: 'Categoría', description: 'Asigna categoría correcta.' },
    { target: '#product-price', title: 'Precio y costo', description: 'Configura margen objetivo.' },
    { target: '#product-stock', title: 'Stock inicial', description: 'Registra existencia inicial.' },
    { target: '#product-save', title: 'Guardar', description: 'Publica producto en inventario.' },
  ]},
];

export const helpVideos: HelpVideo[] = [
  { id: 'video-pos-01', title: 'POS: primera venta', module: 'POS', duration: '08:24', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', transcript: 'Resumen guiado de la venta inicial en POS.', downloadableLabel: 'Checklist de caja', downloadableUrl: '/docs/checklist-caja.pdf' },
  { id: 'video-inv-01', title: 'Inventario: alta de productos', module: 'Inventario', duration: '07:10', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', transcript: 'Alta de producto y validaciones recomendadas.' },
  { id: 'video-inv-02', title: 'Inventario: entrada de mercancía', module: 'Inventario', duration: '10:05', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', transcript: 'Flujo de stock entry con evidencia.' },
  { id: 'video-ruta-01', title: 'Rutas: creación y despacho', module: 'Rutas', duration: '11:42', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', transcript: 'Planificación y salida de ruta paso a paso.' },
];

export const getHelpArticle = (slug: string) => helpArticles[slug];
export const getHelpCategoryBySlug = (slug: string) => helpCategories.find((item) => item.slug === slug);
export const getArticlesByCategory = (categoryId: string) => Object.values(helpArticles).filter((item) => item.category === categoryId);
export const getMostViewedArticles = (limit = 6) => Object.values(helpArticles).sort((a, b) => b.views - a.views).slice(0, limit);
export const getHelpVideo = (id?: string) => (id ? helpVideos.find((video) => video.id === id) : undefined);
