
"use client";

import { useCallback, useRef, useState } from 'react';

/**
 * Hook to manage a controlled input, especially for handling IME composition events
 * which are common for languages like Chinese, Japanese, and Korean.
 * It prevents triggering frequent updates (like searches) while the user is composing a character.
 * @param initial - The initial value of the input.
 * @returns An object containing the current value, binding props for the input, and a function to check composition status.
 */
export function useControlledInput(initial = '') {
  const [value, setValue] = useState(initial);
  const composing = useRef(false);

  // This `onChange` handler is bound to the input element.
  // It updates the visual state of the input immediately for a responsive user experience.
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  // When the user starts composing a character (e.g., using a Pinyin IME),
  // we set a flag to true to indicate that the input is in an intermediate state.
  const onCompositionStart = useCallback(() => {
    composing.current = true;
  }, []);

  // When the user finalizes their composition (e.g., selects a character),
  // this event fires. We then set the flag to false and update the state with the final,
  // composed value from the input field.
  const onCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    // We update the value one last time to ensure we have the final composed character.
    setValue(e.currentTarget.value);
  }, []);

  // The `bind` object provides a convenient way to spread all necessary props onto an <input> element.
  const bind = { value, onChange, onCompositionStart, onCompositionEnd };

  return {
    value,
    bind,
    // A function to check the composition status imperatively if needed.
    isComposing: () => composing.current,
  };
}
