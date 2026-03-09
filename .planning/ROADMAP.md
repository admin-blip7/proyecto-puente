# Roadmap — 22 Electronic Supabase Migration

## Milestone 1: Funcionalidades Tienda & Socios

### Phase 1: Registro de Socios en Tienda Web
**Goal:** Socios pueden registrarse desde la tienda online y acceder al sistema instantáneamente sin aprobación manual.

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Registration form component and page at /socio/registro
- [x] 01-02-PLAN.md — AuthProvider public path + TiendaHeader Socio link

#### Requirements
- REQ-001: Página pública de registro en /socio/registro
- REQ-002: Formulario con nombre, email, contraseña, teléfono y datos del negocio
- REQ-003: API route que crea usuario en Supabase Auth con role=Socio en user_metadata
- REQ-004: Redirección automática al dashboard /socio/dashboard tras registro exitoso
- REQ-005: Link de acceso a registro de socios desde la tienda visible para usuarios no autenticados
- REQ-006: Validación de campos en el frontend (email válido, contraseña segura, campos requeridos)
- REQ-007: Manejo de errores (email duplicado, contraseña débil, etc.)

### Phase 2: Notificaciones WhatsApp al Corte de Caja
**Goal:** Al realizar el corte de caja, el sistema envía automáticamente un resumen de ventas vía WhatsApp al número configurado por el socio de cada sucursal.

**Plans:** 6 plans

Plans:
- [x] 02-01-PLAN.md — DB migrations: whatsapp_number + whatsapp_apikey on branches, whatsapp_notification_log table
- [ ] 02-02-PLAN.md — Service layer: buildCorteMessage() pure function + unit tests
- [ ] 02-03-PLAN.md — API route POST /api/whatsapp/corte (Callmebot GET fetch, log result)
- [ ] 02-04-PLAN.md — Settings UI: Notificaciones tab with per-branch WhatsApp config + server action
- [ ] 02-05-PLAN.md — POSClient fire-and-forget trigger after printCashCloseTicket
- [ ] 02-06-PLAN.md — Socio dashboard: Notificaciones recientes card (REQ-014)

#### Requirements
- REQ-008: Campo de número WhatsApp configurable en el perfil/settings de cada socio por sucursal
- REQ-009: Integración con la API de WhatsApp (WhatsApp Business API o Twilio/Twilio Sandbox) para envío de mensajes
- REQ-010: Al cerrar una sesión de caja (corte), disparar envío automático al número del socio
- REQ-011: Mensaje de WhatsApp incluye: fecha/hora del corte, cajero, ventas en efectivo, ventas con tarjeta, total del día y detalle de productos vendidos
- REQ-012: UI en configuraciones de socio para guardar y verificar número WhatsApp (con formato internacional)
- REQ-013: Manejo de errores si el envío falla (no bloquea el flujo del corte, solo notifica en toast)
- REQ-014: Historial/log de notificaciones enviadas (opcional, visible en dashboard del socio)
