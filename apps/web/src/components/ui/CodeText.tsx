interface Props {
  children: string
  size?: 'sm' | 'md'
}

export function CodeText({ children, size = 'md' }: Props) {
  return (
    <span
      className="font-mono text-muted-foreground"
      style={{ fontSize: size === 'sm' ? 12.5 : 13.5 }}
    >
      {children}
    </span>
  )
}
