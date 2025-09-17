
'use client'

import { useLayoutEffect, useRef, useState } from 'react'

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isWebkit = /WebKit/.test(ua)
  const isCriOS = /CriOS/.test(ua)
  return isIOS && isWebkit && !isCriOS
}

export function useStablePortal(idHint: string) {
  // Use a ref to generate a unique ID once per hook instance. This is stable across re-renders.
  const idRef = useRef<string>(globalThis.crypto?.randomUUID?.() ?? String(Math.random()))
  const elRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [inline, setInline] = useState(false)

  useLayoutEffect(() => {
    // Detect iOS Safari and set the rendering mode to inline.
    setInline(isIosSafari())

    // Guard against running on the server.
    if (typeof document === 'undefined') return

    // This logic runs only once after the initial client-side render.
    if (!elRef.current) {
      // Check if a portal for this specific instance already exists in the DOM.
      // This is a defensive measure for React 18's Strict Mode, which double-mounts components in development.
      const existing = document.querySelector<HTMLDivElement>(
        `div[data-portal="${idHint}"][data-instance="${idRef.current}"]`
      )
      
      // If an existing portal is found, reuse it. Otherwise, create a new div.
      elRef.current = existing ?? Object.assign(document.createElement('div'), {
        dataset: { portal: idHint, instance: idRef.current },
      })
      
      // If we created a new element, append it to the body.
      if (!existing) {
        document.body.appendChild(elRef.current)
      }
    }

    // Signal that the portal container is ready.
    setMounted(true)

    // The cleanup function.
    return () => {
      const el = elRef.current
      // Only remove the portal if it was not rendered inline and it's still a child of its parent.
      // This is a crucial guard against "Node not found" errors in Safari and during fast navigations.
      if (!inline && el?.parentNode && (el.parentNode as Node).contains(el)) {
        try {
          el.parentNode.removeChild(el)
        } catch (e) {
            // Log errors during cleanup, though the guards should prevent them.
            console.error('Failed to cleanup portal node:', e);
        }
      }
      elRef.current = null
    }
  }, [idHint, inline]) // Rerun effect if idHint or inline mode changes.

  return { container: elRef.current, mounted, isInline: inline }
}
