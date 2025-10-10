"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Flex grow para ocupar el espacio disponible
      "flex-1 min-h-0",
      // Scroll interno
      "overflow-y-auto overflow-x-hidden",
      // Padding interno
      "px-6 py-4",
      // Scroll suave en iOS
      "overscroll-behavior-y-contain",
      // Webkit scroll
      "-webkit-overflow-scrolling: touch",
      // Permitir interacción con formularios
      "touch-action: auto",
      // Asegurar que los inputs sean accesibles
      "position: relative",
      className
    )}
    style={{
      // Asegurar que el contenido sea scrolleable y los inputs funcionen
      WebkitOverflowScrolling: 'touch',
      touchAction: 'auto'
    }}
    {...props}
  />
))
DialogBody.displayName = "DialogBody"

export { DialogBody }