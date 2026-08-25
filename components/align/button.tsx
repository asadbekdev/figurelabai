import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/align/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium outline-none select-none motion-safe:transition-[background-color,color,box-shadow,transform] motion-safe:duration-150 motion-safe:ease-out active:not-disabled:not-aria-[haspopup]:scale-[0.96] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-hollow disabled:shadow-none disabled:ring-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-darker focus-visible:shadow-button-primary-focus",
        outline:
          "bg-background text-muted-foreground shadow-regular-xs ring-1 ring-inset ring-border hover:bg-muted hover:text-foreground hover:shadow-none hover:ring-transparent focus-visible:text-foreground focus-visible:shadow-button-important-focus focus-visible:ring-foreground",
        secondary:
          "bg-muted text-muted-foreground ring-1 ring-inset ring-transparent hover:bg-background hover:text-foreground hover:shadow-regular-xs hover:ring-border focus-visible:bg-background focus-visible:text-foreground focus-visible:shadow-button-important-focus focus-visible:ring-foreground",
        ghost:
          "bg-transparent text-muted-foreground ring-1 ring-inset ring-transparent hover:bg-muted hover:text-foreground focus-visible:bg-background focus-visible:text-foreground focus-visible:shadow-button-important-focus focus-visible:ring-foreground",
        lighter:
          "bg-accent text-primary ring-1 ring-inset ring-transparent hover:bg-background hover:ring-primary focus-visible:bg-background focus-visible:shadow-button-primary-focus focus-visible:ring-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:shadow-button-error-focus",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
        account:
          "bg-background text-muted-foreground shadow-regular-xs ring-1 ring-inset ring-border hover:bg-muted hover:text-foreground hover:shadow-none hover:ring-transparent focus-visible:text-foreground focus-visible:shadow-button-important-focus focus-visible:ring-foreground",
      },
      size: {
        default: "h-10 gap-1 px-3.5 [font-size:0.875rem] leading-5 tracking-[-0.006em]",
        xs: "h-8 gap-1 px-2.5 [font-size:0.875rem] leading-5 tracking-[-0.006em] [&_svg:not([class*='size-'])]:size-4",
        sm: "h-9 gap-1 px-3 [font-size:0.875rem] leading-5 tracking-[-0.006em]",
        lg: "h-11 gap-1 px-4 [font-size:1rem] leading-6 tracking-[-0.011em]",
        icon: "size-10",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  )
}

type CompactButtonProps = Omit<ButtonProps, "size"> & {
  size?: "xs" | "sm"
}

function CompactButton({ size = "xs", ...props }: CompactButtonProps) {
  return <Button size={size} {...props} />
}

export { Button, CompactButton, buttonVariants }
export type { ButtonProps, CompactButtonProps }
