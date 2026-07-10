import { useRef, useLayoutEffect } from 'react'
import { Input } from 'antd'
import type { InputProps, InputRef } from 'antd'

// Fix Vietnamese IME (Unikey Telex/VNI) + React controlled input conflict.
// Root cause: Form.Item syncs value prop → domInput.value on every re-render,
// interrupting Unikey's backspace+insert mid-composition → "Soố" instead of "Số".
// Fix: don't pass value prop to <Input> (uncontrolled), sync DOM manually via ref
// only when NOT composing so Unikey can process freely.
export function ImeInput({ value, onChange, ...props }: InputProps) {
  const ref = useRef<InputRef>(null)
  const composing = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current?.input
    if (el && !composing.current) {
      el.value = (value as string) ?? ''
    }
  }, [value])

  return (
    <Input
      ref={ref}
      {...props}
      // value intentionally omitted → uncontrolled, React won't touch domInput.value
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={(e) => {
        composing.current = false
        onChange?.({ target: e.currentTarget, nativeEvent: e.nativeEvent } as any)
      }}
      onChange={(e) => {
        if (!composing.current) onChange?.(e)
      }}
    />
  )
}
