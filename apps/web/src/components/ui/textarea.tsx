import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "w-full min-h-[80px] min-w-0 rounded-3xl border border-border bg-background px-3 py-2 text-sm transition-[color,box-shadow,background-color,border-color] outline-none resize-y placeholder:text-muted-foreground hover:border-primary hover:shadow-[0_0_0_3px_rgba(41,171,226,0.12)] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(41,171,226,0.28)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

export { Textarea }
