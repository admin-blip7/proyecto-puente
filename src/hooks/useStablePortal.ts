
'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * A React hook to create a stable, persistent portal container in the document body.
 * This is crucial for avoiding issues in React 18 with Strict Mode and in browsers like Safari,
 * where re-appending portal containers on every render can cause errors.
 *
 * @param idHint - A descriptive hint for the portal's purpose (e.g., 'combobox-portal').
 * @returns An object containing the DOM element container and a `mounted` boolean.
 */
export function useStablePortal(idHint: string): { container: HTMLDivElement | null; mounted: boolean } {
  // `useRef` is used to generate a unique ID for each instance of this hook.
  // This ensures that even if multiple components use this hook, they each get their own portal container.
  // The ID persists across re-renders without causing them.
  const idRef = useRef<string>(crypto.randomUUID());
  
  // This ref holds the actual DOM element of the portal container.
  const elRef = useRef<HTMLDivElement | null>(null);

  // `useState` tracks whether the portal has been successfully mounted to the DOM.
  // We don't render the portal's content until `mounted` is true.
  const [mounted, setMounted] = useState(false);

  // `useLayoutEffect` runs synchronously after the DOM has been updated but before the browser paints.
  // This is preferred over `useEffect` for DOM mutations to avoid visual flicker.
  useLayoutEffect(() => {
    // On the server, `document` is not available, so we do nothing.
    if (typeof document === 'undefined') return;

    if (!elRef.current) {
      // Look for an existing portal container that matches our unique instance ID.
      // This is important for React 18's Strict Mode, which double-invokes effects in development.
      const existing = document.querySelector<HTMLDivElement>(
        `div[data-portal="${idHint}"][data-instance="${idRef.current}"]`
      );

      // If we find an existing container, we reuse it. Otherwise, we create a new one.
      elRef.current = existing ?? Object.assign(document.createElement('div'), {
        dataset: { portal: idHint, instance: idRef.current },
      });

      // If we created a new element, append it to the body.
      if (!existing) {
        document.body.appendChild(elRef.current);
      }
    }

    // Once the element is secured, we mark the portal as mounted.
    setMounted(true);

    // The cleanup function for the effect.
    return () => {
      const el = elRef.current;
      // This is a safety check. Before removing the element, we ensure it still exists
      // and is actually a child of its parent. This prevents "Node not found" errors in Safari
      // and during fast navigations.
      if (el?.parentNode && (el.parentNode as Node).contains(el)) {
        try {
          el.parentNode.removeChild(el);
        } catch (e) {
          // Catch potential errors during cleanup, although the guards should prevent them.
          console.error('Failed to cleanup portal:', e);
        }
      }
      elRef.current = null;
    };
  }, [idHint]); // The effect re-runs only if the idHint changes, which should be rare.

  return { container: elRef.current, mounted };
}
