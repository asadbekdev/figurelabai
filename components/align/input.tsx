import * as React from "react"

import { cn } from "@/lib/align/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg bg-background px-3 text-base font-normal text-foreground shadow-regular-xs outline-none ring-1 ring-inset ring-border",
        "placeholder:text-hollow motion-safe:transition-[background-color,box-shadow,color] motion-safe:duration-150 motion-safe:ease-out",
        "hover:bg-muted hover:shadow-none hover:ring-transparent",
        "focus-visible:bg-background focus-visible:shadow-button-important-focus focus-visible:ring-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-hollow disabled:shadow-none disabled:ring-transparent",
        "aria-invalid:ring-destructive aria-invalid:focus-visible:shadow-button-error-focus",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "sm:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
