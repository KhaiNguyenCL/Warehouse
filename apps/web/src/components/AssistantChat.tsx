// Trợ lý tra cứu nhanh (Gemini) — hỏi đáp ngôn ngữ tự nhiên cho các câu hỏi đơn giản như
// kiểm tra tồn kho. Chỉ đọc dữ liệu, không có hành động ghi/sửa nào ở đây.
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

// Gemini trả lời kèm markdown nhẹ (**bold**, `code`, xuống dòng) — convert thủ công thay vì
// thêm thư viện markdown cho 1 chat bubble nhỏ. Escape HTML TRƯỚC khi chèn thẻ của mình, vì
// text đến từ LLM (không tin tưởng tuyệt đối) — tránh lỡ chèn được thẻ HTML/script thật.
function renderAssistantText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/10 px-1 py-0.5 text-[11px]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\n/g, '<br />')
}

export default function AssistantChat() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, loading])

  async function handleSend() {
    const q = question.trim()
    if (!q || loading) return
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setLoading(true)
    try {
      const res = await api.post('/assistant/ask', { question: q })
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.answer }])
    } catch (err: any) {
      const message = err.response?.data?.error ?? 'Có lỗi xảy ra, thử lại sau.'
      setMessages((prev) => [...prev, { role: 'assistant', text: message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Trợ lý tra cứu">
          <Sparkles className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="flex w-80 flex-col gap-0 p-0">
        <PopoverHeader className="border-b border-border px-3 py-2.5">
          <PopoverTitle className="text-sm">Trợ lý tra cứu</PopoverTitle>
          <PopoverDescription className="text-xs">Hỏi nhanh tồn kho bằng ngôn ngữ tự nhiên</PopoverDescription>
        </PopoverHeader>

        <div ref={scrollRef} className="flex max-h-80 min-h-40 flex-col gap-2 overflow-y-auto p-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              VD: "Switch Cisco SG350 còn bao nhiêu ở kho HCM?"
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed',
                m.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}
            >
              <span dangerouslySetInnerHTML={{ __html: renderAssistantText(m.text) }} />
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Đang tra cứu…
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-border p-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder="Nhập câu hỏi…"
            className="h-8 text-xs"
            disabled={loading}
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={loading || !question.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
