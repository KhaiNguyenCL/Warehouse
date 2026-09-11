import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { api } from '../lib/api'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  link?: string
  read_at: string | null
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data as { data: Notification[]; unread_count: number },
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = data?.unread_count ?? 0
  const items = data?.data ?? []

  function handleClick(n: Notification) {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors outline-none">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" style={{ maxHeight: 420, overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Thông báo</span>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => markAllRead.mutate()}
            >
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Không có thông báo</div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={[
                'w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors',
                n.read_at ? 'hover:bg-accent/50' : 'bg-primary/5 hover:bg-primary/10',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <div className={n.read_at ? 'ml-4' : ''}>
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
