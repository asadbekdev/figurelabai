import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/align/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap outline-none motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-150 focus-visible:shadow-button-important-focus has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-darker",
        secondary: "bg-muted text-muted-foreground [a]:hover:text-foreground",
        destructive: "bg-accent text-destructive [a]:hover:bg-background",
        outline:
          "bg-background text-foreground ring-1 ring-inset ring-border [a]:hover:bg-muted",
        ghost: "text-muted-foreground [a]:hover:bg-muted [a]:hover:text-foreground",
        link: "text-primary underline-offset-4 [a]:hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

const Tag = Badge

export { Badge, Tag, badgeVariants }
export type { BadgeProps }
