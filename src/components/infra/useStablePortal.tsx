'use client'
import { useLayoutEffect, useRef, useState } from 'react'

function isIosSafari() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isWebkit = /WebKit/.test(ua)
  const isCriOS = /CriOS/.test(ua)
  return isIOS && isWebkit && !isCriOS
}

function makeUUID() {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID()
    }
  } catch {}
  return `uid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function useStablePortal(idHint: string) {
  const idRef = useRef<string>(makeUUID())
  const elRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [inline, setInline] = useState(false)

  useLayoutEffect(() => {
    // Sólo en cliente
    if (typeof document === 'undefined') return

    // En iOS Safari preferimos inline (sin portal) para máxima estabilidad
    const inlineMode = isIosSafari()
    setInline(inlineMode)

    // Si vamos inline, no crear/adjuntar portal en <body>
    if (inlineMode) {
      setMounted(true)
      return
    }

    // Reutiliza si ya existe uno con este instance-id
    const selector = `div[data-portal="${CSS.escape(idHint)}"][data-instance="${CSS.escape(idRef.current)}"]`
    let existing = document.querySelector<HTMLDivElement>(selector)

    if (existing) {
      elRef.current = existing
    } else {
      const el = document.createElement('div')
      // ⚠️ No usar Object.assign con dataset (Safari falla)
      el.setAttribute('data-portal', idHint)
      el.setAttribute('data-instance', idRef.current)
      document.body.appendChild(el)
      elRef.current = el
    }

    setMounted(true)

    return () => {
      const el = elRef.current
      // Cleanup seguro (solo si aún está en el DOM y no estamos en inline)
      if (!inlineMode && el && el.parentNode && (el.parentNode as Node).contains(el)) {
        try {
          el.parentNode.removeChild(el)
        } catch {
          /* noop */
        }
      }
      elRef.current = null
    }
  }, [idHint])

  return { container: elRef.current, mounted, isInline: inline }
}
