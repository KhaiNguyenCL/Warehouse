/** Resize handle gắn vào góc phải của <th> — drag để điều chỉnh độ rộng cột. */
export function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-3 cursor-col-resize group/resize"
    >
      <div className="absolute right-1 top-1/4 h-1/2 w-px bg-border group-hover/resize:bg-primary/60 group-active/resize:bg-primary transition-colors" />
    </div>
  )
}
