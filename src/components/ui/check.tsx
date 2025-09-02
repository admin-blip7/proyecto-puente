"use client"

import * as React from "react"
import { Check as CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Check = React.forwardRef<
  React.ElementRef<typeof CheckIcon>,
  React.ComponentPropsWithoutRef<typeof CheckIcon>
>(({ className, ...props }, ref) => {
  return <CheckIcon ref={ref} className={cn("h-4 w-4", className)} {...props} />
})
Check.displayName = "Check"

export { Check }
