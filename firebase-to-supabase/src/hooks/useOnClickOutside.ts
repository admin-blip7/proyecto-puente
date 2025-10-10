"use client";

import { useEffect, RefObject } from 'react';

type Event = MouseEvent | TouchEvent;

// Lista de elementos interactivos que no deberían cerrar menús
const INTERACTIVE_ELEMENTS = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="menuitem"]'
];

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: Event) => void
) {
  useEffect(() => {
    const listener = (event: Event) => {
      const target = event.target as Node;
      
      // No hacer nada si el clic es dentro del ref o sus descendientes
      if (!ref.current || ref.current.contains(target)) {
        return;
      }

      // No cerrar si el clic es en un elemento interactivo
      if (target instanceof Element) {
        const isInteractive = INTERACTIVE_ELEMENTS.some(selector => {
          try {
            return target.matches(selector) || target.closest(selector);
          } catch {
            return false;
          }
        });
        
        if (isInteractive) {
          return;
        }
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    // Limpieza al desmontar el componente
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
