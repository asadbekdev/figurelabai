import * as React from "react"

import { cn } from "@/lib/align/utils"

function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-28 w-full rounded-xl bg-background px-3 py-2.5 text-base font-normal text-foreground shadow-regular-xs outline-none ring-1 ring-inset ring-border",
        "placeholder:text-hollow motion-safe:transition-[background-color,box-shadow,color] motion-safe:duration-150 motion-safe:ease-out",
        "hover:bg-muted hover:shadow-none hover:ring-transparent",
        "focus-visible:bg-background focus-visible:shadow-button-important-focus focus-visible:ring-foreground",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-hollow disabled:shadow-none disabled:ring-transparent",
        "aria-invalid:ring-destructive aria-invalid:focus-visible:shadow-button-error-focus",
        "sm:text-sm",
        className
      )}
      {...props}
    />
  )
}

const Textarea = TextArea

export { TextArea, Textarea }
