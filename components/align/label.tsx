"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/align/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-sm leading-5 font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-hollow peer-disabled:cursor-not-allowed peer-disabled:text-hollow",
        className
      )}
      {...props}
    />
  )
}

export { Label }
