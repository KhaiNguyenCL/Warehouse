// Máy tính bỏ túi kiểu Windows Calculator, dạng popup ở topbar (giống AssistantChat) —
// 4 phép tính cơ bản, không lưu lịch sử. State machine chuẩn của calculator: previousValue +
// operator + display, KHÔNG parse chuỗi biểu thức tự do — đúng hành vi bấm số/phép tính
// tuần tự như máy tính thật.
import { useEffect, useRef, useState } from 'react'
import { Calculator as CalculatorIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Operator = '+' | '-' | '×' | '÷'

function calculate(a: number, b: number, op: Operator): number | null {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? null : a / b
  }
}

// Format hiển thị: thêm dấu phân cách nghìn cho phần nguyên, giữ nguyên phần thập phân
// đang gõ dở (VD "1234." hoặc "1234.5") thay vì format lại làm mất dấu chấm cuối.
function formatDisplay(raw: string): string {
  if (raw === 'Lỗi') return raw
  const negative = raw.startsWith('-')
  const unsigned = negative ? raw.slice(1) : raw
  const [intPart, ...rest] = unsigned.split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const result = rest.length > 0 ? `${formattedInt},${rest.join('')}` : formattedInt
  return (negative ? '-' : '') + result
}

const MAX_DIGITS = 15

export default function CalculatorChat() {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [expression, setExpression] = useState('')

  function inputDigit(d: string) {
    if (display === 'Lỗi') return reset(d)
    if (waitingForOperand) {
      setDisplay(d)
      setWaitingForOperand(false)
    } else {
      if (display.replace('-', '').replace('.', '').length >= MAX_DIGITS) return
      setDisplay(display === '0' ? d : display + d)
    }
  }

  function inputDecimal() {
    if (display === 'Lỗi') return
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  function toggleSign() {
    if (display === 'Lỗi' || display === '0') return
    setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display)
  }

  function inputPercent() {
    if (display === 'Lỗi') return
    setDisplay(String(parseFloat(display) / 100))
  }

  function backspace() {
    if (display === 'Lỗi') return reset()
    if (waitingForOperand) return
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0')
  }

  function reset(nextDisplay = '0') {
    setDisplay(nextDisplay)
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
    setExpression('')
  }

  function clearEntry() {
    setDisplay('0')
  }

  function applyOperator(nextOperator: Operator | null) {
    if (display === 'Lỗi') return
    const inputValue = parseFloat(display)
    let resultValue = inputValue // dùng biến local thay vì đọc lại state (closure cũ, chưa
    // kịp cập nhật) — nếu không, dòng biểu thức preview sẽ hiện sai giá trị khi bấm nối
    // tiếp nhiều phép tính liên tiếp (VD "2 + 3 +" thay vì đúng ra phải là "5 +").
    let historyLine = '' // "3 + 5 =" — giữ lại SAU khi bấm = thay vì xoá trắng, để còn thấy
    // vừa tính phép gì (trước đây bị xoá luôn nên bấm = xong chỉ thấy mỗi kết quả trơ trọi).

    if (previousValue !== null && operator && !waitingForOperand) {
      const result = calculate(previousValue, inputValue, operator)
      if (result === null) {
        setDisplay('Lỗi')
        setPreviousValue(null)
        setOperator(null)
        setWaitingForOperand(true)
        setExpression('')
        return
      }
      historyLine = `${formatDisplay(String(previousValue))} ${operator} ${formatDisplay(String(inputValue))} =`
      resultValue = result
      setDisplay(String(result))
    }

    setPreviousValue(nextOperator ? resultValue : null)
    setExpression(nextOperator ? `${formatDisplay(String(resultValue))} ${nextOperator}` : historyLine)
    setOperator(nextOperator)
    setWaitingForOperand(true)
  }

  function handleEquals() {
    applyOperator(null)
  }

  // Bàn phím vật lý — gắn onKeyDown TRỰC TIẾP vào vùng nội dung popup (React synthetic
  // event, bubble từ bất kỳ nút con nào đang giữ focus) thay vì window.addEventListener.
  // Global listener trên window không đáng tin cậy cho popup: Radix Popover tự quản lý
  // focus riêng trong nội dung của nó, nên gắn ngay tại DOM node của popup chắc chắn nhận
  // được sự kiện, mà vẫn tự động KHÔNG ảnh hưởng gì tới các ô nhập liệu khác trong app khi
  // popup đóng (không có DOM node nào tồn tại để bubble lên nữa).
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) contentRef.current?.focus()
  }, [open])

  const HANDLED_KEYS = new Set(['.', ',', '+', '-', '*', '/', 'Enter', '=', 'Backspace', 'Escape', '%'])

  // Numpad khi NumLock TẮT gửi e.key là phím điều hướng (Home, End, ArrowDown...) chứ không
  // phải ký tự số/dấu — e.code thì luôn cố định "Numpad7", "NumpadAdd"... bất kể NumLock bật
  // hay tắt, nên map qua e.code để nhận diện đúng, không phụ thuộc trạng thái NumLock của máy.
  const NUMPAD_CODE_MAP: Record<string, string> = {
    Numpad0: '0', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
    Numpad5: '5', Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9',
    NumpadDecimal: '.', NumpadAdd: '+', NumpadSubtract: '-',
    NumpadMultiply: '*', NumpadDivide: '/', NumpadEnter: 'Enter',
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const key = NUMPAD_CODE_MAP[e.code] ?? e.key
    const isDigit = key >= '0' && key <= '9'
    if (!isDigit && !HANDLED_KEYS.has(key)) return

    // BẮT BUỘC preventDefault: nút đang có focus (VD nút "C" do Radix tự focus lúc mở popup)
    // sẽ tự kích hoạt native click khi bấm Enter/Space — không chặn thì bấm Enter để tính "="
    // xong bị chính nút "C" xoá sạch ngay lập tức (đã tái hiện đúng bug này qua Playwright).
    e.preventDefault()

    if (isDigit) return inputDigit(key)
    if (key === '.' || key === ',') return inputDecimal()
    if (key === '+') return applyOperator('+')
    if (key === '-') return applyOperator('-')
    if (key === '*') return applyOperator('×')
    if (key === '/') return applyOperator('÷')
    if (key === 'Enter' || key === '=') return handleEquals()
    if (key === 'Backspace') return backspace()
    if (key === 'Escape') return reset()
    if (key === '%') return inputPercent()
  }

  const buttonBase = 'h-12 rounded-lg text-base font-medium transition-colors active:scale-[0.97]'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Máy tính">
          <CalculatorIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-72 gap-0 p-0">
        <div ref={contentRef} tabIndex={-1} onKeyDown={handleKeyDown} className="outline-none">
        <PopoverHeader className="border-b border-border px-3 py-2.5">
          <PopoverTitle className="text-sm">Máy tính</PopoverTitle>
        </PopoverHeader>

        {/* Màn hình */}
        <div className="flex flex-col items-end gap-1 px-4 py-4">
          <span className="h-4 text-xs text-muted-foreground">{expression || ' '}</span>
          <span
            className={cn(
              'w-full truncate text-right text-3xl font-semibold tabular-nums',
              display === 'Lỗi' ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatDisplay(display)}
          </span>
        </div>

        {/* Bàn phím */}
        <div className="grid grid-cols-4 gap-1.5 p-3 pt-0">
          <button className={cn(buttonBase, 'bg-muted text-foreground hover:bg-muted/70')} onClick={() => reset()}>C</button>
          <button className={cn(buttonBase, 'bg-muted text-foreground hover:bg-muted/70')} onClick={clearEntry}>CE</button>
          <button className={cn(buttonBase, 'bg-muted text-foreground hover:bg-muted/70')} onClick={backspace}>⌫</button>
          <button className={cn(buttonBase, 'bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-80')} onClick={() => applyOperator('÷')}>÷</button>

          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('7')}>7</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('8')}>8</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('9')}>9</button>
          <button className={cn(buttonBase, 'bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-80')} onClick={() => applyOperator('×')}>×</button>

          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('4')}>4</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('5')}>5</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('6')}>6</button>
          <button className={cn(buttonBase, 'bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-80')} onClick={() => applyOperator('-')}>−</button>

          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('1')}>1</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('2')}>2</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('3')}>3</button>
          <button className={cn(buttonBase, 'bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-80')} onClick={() => applyOperator('+')}>+</button>

          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={toggleSign}>±</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={() => inputDigit('0')}>0</button>
          <button className={cn(buttonBase, 'bg-background text-foreground hover:bg-muted')} onClick={inputDecimal}>,</button>
          <button className={cn(buttonBase, 'bg-[var(--accent)] text-white hover:opacity-90')} onClick={handleEquals}>=</button>

          <button className={cn(buttonBase, 'col-span-4 bg-background text-foreground hover:bg-muted')} onClick={inputPercent}>%</button>
        </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
