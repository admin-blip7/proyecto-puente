
"use client";

import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce a value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const id = setTimeout(() => setDebounced(value), delay);

    // Clean up the timer if the value changes before the delay has passed
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
