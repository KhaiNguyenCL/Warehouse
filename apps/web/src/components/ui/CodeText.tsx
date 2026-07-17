// CodeText — hiển thị mã hàng, mã phiếu, serial number với font mono + màu accent.
// Dùng trong cột "Mã hàng" / "Mã phiếu" của mọi bảng để nhất quán.

interface Props {
  children: string
  size?: 'sm' | 'md'
}

export function CodeText({ children, size = 'md' }: Props) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: size === 'sm' ? 12.5 : 13.5,
        fontWeight: 600,
        color: 'var(--accent)',
        letterSpacing: '-0.2px',
      }}
    >
      {children}
    </span>
  )
}
