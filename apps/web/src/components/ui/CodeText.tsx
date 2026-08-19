interface Props {
  children: string
  size?: 'sm' | 'md'
}

export function CodeText({ children, size = 'md' }: Props) {
  return (
    <span
      className="inline-flex items-center rounded-md border border-border bg-muted/60 font-mono font-semibold text-foreground"
      style={{ fontSize: size === 'sm' ? 13 : 14, padding: '2px 7px' }}
    >
      {children}
    </span>
  )
}
