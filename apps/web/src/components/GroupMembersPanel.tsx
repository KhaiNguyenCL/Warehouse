// Quản lý thành viên của 1 Group — render bên trong Sheet sửa Group (GroupsPage), chỉ khi
// đang edit. Add/remove gọi thẳng POST/DELETE /settings/groups/:id/members, không qua form
// chính (giống RolePermissionsPanel: sub-panel có mutation riêng).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiMutation } from '@/hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  groupId: string
}

export default function GroupMembersPanel({ groupId }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data: group, isLoading } = useQuery({
    queryKey: ['settings', 'groups', groupId],
    queryFn: async () => (await api.get(`/settings/groups/${groupId}`)).data,
  })

  const { data: usersData } = useQuery({
    queryKey: ['settings', 'users', 'all'],
    queryFn: async () => (await api.get('/settings/users', { params: { limit: 100 } })).data,
  })

  const members: any[] = group?.members ?? []
  const memberIds = new Set(members.map((m) => m.id))
  const candidates = (usersData?.data ?? []).filter((u: any) => !memberIds.has(u.id))

  const addMutation = useApiMutation(
    (userId: string) => api.post(`/settings/groups/${groupId}/members`, { user_id: userId }),
    {
      successMessage: 'Đã thêm thành viên',
      invalidateKey: ['settings', 'groups'],
      onSuccess: () => setSelectedUserId(''),
    },
  )

  const removeMutation = useApiMutation(
    (userId: string) => api.delete(`/settings/groups/${groupId}/members/${userId}`),
    { successMessage: 'Đã xoá thành viên', invalidateKey: ['settings', 'groups'] },
  )

  if (isLoading) return null

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Thành viên ({members.length})</p>

      {members.length > 0 ? (
        <div className="mb-3 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border-md">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground" title={m.full_name}>{m.full_name}</div>
                <div className="truncate text-xs text-muted-foreground" title={m.email}>{m.email}</div>
              </div>
              <button
                type="button"
                onClick={() => removeMutation.mutate(m.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs italic text-muted-foreground">Chưa có thành viên nào.</p>
      )}

      <div className="flex items-center gap-2">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Chọn user để thêm…" /></SelectTrigger>
          <SelectContent>
            {candidates.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          type="button"
          disabled={!selectedUserId || addMutation.isPending}
          onClick={() => addMutation.mutate(selectedUserId)}
        >
          Thêm
        </Button>
      </div>
    </div>
  )
}
