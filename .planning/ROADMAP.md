# Roadmap — 22 Electronic Supabase Migration

## Milestone 1: Funcionalidades Tienda & Socios

### Phase 1: Registro de Socios en Tienda Web
**Goal:** Socios pueden registrarse desde la tienda online y acceder al sistema instantáneamente sin aprobación manual.

**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Registration form component and page at /socio/registro
- [ ] 01-02-PLAN.md — AuthProvider public path + TiendaHeader Socio link

#### Requirements
- REQ-001: Página pública de registro en /socio/registro
- REQ-002: Formulario con nombre, email, contraseña, teléfono y datos del negocio
- REQ-003: API route que crea usuario en Supabase Auth con role=Socio en user_metadata
- REQ-004: Redirección automática al dashboard /socio/dashboard tras registro exitoso
- REQ-005: Link de acceso a registro de socios desde la tienda visible para usuarios no autenticados
- REQ-006: Validación de campos en el frontend (email válido, contraseña segura, campos requeridos)
- REQ-007: Manejo de errores (email duplicado, contraseña débil, etc.)
