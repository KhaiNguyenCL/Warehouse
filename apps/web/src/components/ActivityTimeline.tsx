import { useQuery } from '@tanstack/react-query'
import { Timeline } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'

interface ActivityLog {
  id: string
  object_type: string
  object_id: string
  object_code: string | null
  action: string
  actor_id: string
  actor_name: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  created:     { label: 'Tạo phiếu',       color: 'blue' },
  completed:   { label: 'Hoàn thành',       color: 'green' },
  confirmed:   { label: 'Xác nhận',         color: 'green' },
  unconfirmed: { label: 'Huỷ xác nhận',     color: 'orange' },
  cancelled:   { label: 'Huỷ phiếu',        color: 'red' },
  expired:     { label: 'Hết hạn',          color: 'gray' },
  updated:     { label: 'Cập nhật',         color: 'blue' },
}

function actionLabel(action: string) {
  return ACTION_LABEL[action] ?? { label: action, color: 'blue' }
}

interface Props {
  objectType: string
  objectId: string
}

export default function ActivityTimeline({ objectType, objectId }: Props) {
  const { data, isLoading } = useQuery<{ data: ActivityLog[] }>({
    queryKey: ['activity-logs', objectType, objectId],
    queryFn: async () =>
      (await api.get('/activity-logs', { params: { object_type: objectType, object_id: objectId, limit: 100 } })).data,
    enabled: !!objectId,
  })

  const logs = data?.data ?? []

  if (isLoading) return <div style={{ padding: '8px 0', color: 'var(--text-3)', fontSize: 13 }}>Đang tải lịch sử...</div>
  if (!logs.length) return <div style={{ padding: '8px 0', color: 'var(--text-3)', fontSize: 13 }}>Chưa có hoạt động nào.</div>

  return (
    <Timeline
      style={{ marginTop: 4 }}
      items={logs.map((log) => {
        const { label, color } = actionLabel(log.action)
        const reason = (log.payload as any)?.reason
        return {
          color,
          children: (
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 500 }}>{label}</span>
              {log.actor_name && (
                <span style={{ color: 'var(--text-2)' }}> — {log.actor_name}</span>
              )}
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                {dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
              </div>
              {reason && (
                <div style={{ marginTop: 2, color: 'var(--text-2)', fontSize: 12, fontStyle: 'italic' }}>
                  Lý do: {reason}
                </div>
              )}
            </div>
          ),
        }
      })}
    />
  )
}
