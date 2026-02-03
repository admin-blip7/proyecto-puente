# Plan de Corte (Switch-over) ✅ COMPLETADO

Este documento detalla los pasos realizados para el cambio de Firestore a Supabase.

## 1. Fase de Preparación ✅
- [x] Ejecutar migración completa en ambiente de Staging.
- [x] Validar conteo de registros y sumas de control.
- [x] Verificar estructura de tablas (snake_case, timestamps, UUIDs).
- [x] Servicios actualizados para usar Supabase.

## 2. Ventana de Mantenimiento ✅
- [x] **Datos migrados**: 1,032 ventas, 1,238 items, 148 sesiones de caja.
- [x] **Servicios funcionando**: `salesService.ts`, `cashSessionService.ts` usan Supabase.
- [x] **Tablas legacy eliminadas**: `*_old_v1` y `*_firestore_backup` removidas.

## 3. Estado Actual

| Componente | Estado |
|:-----------|:-------|
| Base de datos | ✅ Supabase operativo |
| Servicios App | ✅ Usando Supabase |
| RLS | ⏸️ Pendiente (deshabilitado temporalmente) |
| Firestore | ⚠️ Sin uso activo |

## 4. Fecha de Completado
**2026-02-03**
