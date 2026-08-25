"use client"

import { useSyncExternalStore } from "react"
import { MoonIcon, SunIcon } from "@/components/icons"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"

import { Button } from "@/components/align/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/align/tooltip"

export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const { resolvedTheme, setTheme } = useTheme()
  const reduceMotion = useReducedMotion()

  if (!mounted) {
    return (
      <Button aria-label="Change color theme" size="icon" variant="ghost" disabled>
        <SunIcon aria-hidden="true" />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  const iconMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { scale: 0.25, opacity: 0, filter: "blur(4px)" },
        animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
        exit: { scale: 0.25, opacity: 0, filter: "blur(4px)" },
        transition: { type: "spring" as const, duration: 0.3, bounce: 0 },
      }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={`Use ${isDark ? "light" : "dark"} theme`}
          size="icon"
          variant="ghost"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          <span className="relative grid size-4 place-items-center">
            <AnimatePresence initial={false}>
              <motion.span
                key={isDark ? "sun" : "moon"}
                className="absolute inset-0 grid place-items-center"
                {...iconMotion}
              >
                {isDark ? (
                  <SunIcon aria-hidden="true" />
                ) : (
                  <MoonIcon aria-hidden="true" />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Use {isDark ? "light" : "dark"} theme</TooltipContent>
    </Tooltip>
  )
}
