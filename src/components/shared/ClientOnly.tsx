"use client";

import { useState, useEffect, ReactNode } from "react";

// Este componente renderiza a sus hijos SOLO después de que el cliente se haya montado.
export function ClientOnly({ children }: { children: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
