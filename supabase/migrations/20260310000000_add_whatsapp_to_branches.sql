-- Migration: add WhatsApp Callmebot fields to branches table
-- REQ-008: Campo de número WhatsApp configurable por sucursal
-- REQ-009: API key for Callmebot (stored per-branch, server-side only)

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_apikey TEXT;

COMMENT ON COLUMN public.branches.whatsapp_number IS 'E.164 phone number for Callmebot WhatsApp notifications, e.g. +5215512345678';
COMMENT ON COLUMN public.branches.whatsapp_apikey IS 'Callmebot personal API key for this branch WhatsApp number';
