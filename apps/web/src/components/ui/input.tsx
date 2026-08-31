import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-3xl border border-border-md bg-background px-3 py-1 text-base transition-[color,box-shadow,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-primary hover:shadow-[0_0_0_3px_rgba(41,171,226,0.12)] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(41,171,226,0.28)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 md:text-sm dark:aria-invalid:border-destructive/60 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
