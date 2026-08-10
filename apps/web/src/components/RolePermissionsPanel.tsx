// Checkbox ma trận permission cho 1 Role — group theo permissions.group.
// Render bên trong DialogContent khi sửa Role (ngoài <Form> chính, state riêng).
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useApiMutation } from '@/hooks/useApiMutation'
import { Button } from '@/components/ui/button'

interface Props {
  roleId: string
}

export default function RolePermissionsPanel({ roleId }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: role, isLoading } = useQuery({
    queryKey: ['settings', 'roles', roleId],
    queryFn: async () => (await api.get(`/settings/roles/${roleId}`)).data,
  })

  const { data: allPermissions } = useQuery({
    queryKey: ['settings', 'permissions'],
    queryFn: async () => (await api.get('/settings/permissions')).data,
  })

  useEffect(() => {
    if (role) setSelected(new Set(role.permissions.map((p: any) => p.key)))
  }, [role])

  const saveMutation = useApiMutation(
    () => api.put(`/settings/roles/${roleId}/permissions`, { permission_keys: [...selected] }),
    { successMessage: 'Cập nhật quyền thành công', invalidateKey: ['settings', 'roles', roleId] },
  )

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const grouped: Record<string, any[]> = {}
  for (const p of allPermissions ?? []) {
    grouped[p.group] = grouped[p.group] ?? []
    grouped[p.group].push(p)
  }

  if (isLoading) return null

  const groups = Object.entries(grouped)

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Phân quyền</p>

      <div className="space-y-0">
        {groups.map(([group, perms], idx) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 pb-4">
              {perms.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary"
                    checked={selected.has(p.key)}
                    onChange={(e) => toggle(p.key, e.target.checked)}
                  />
                  <span className="text-foreground">{p.description ?? p.key}</span>
                </label>
              ))}
            </div>
            {idx < groups.length - 1 && <div className="my-1 border-t border-border" />}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button
          size="sm"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Đang lưu…' : 'Lưu quyền'}
        </Button>
      </div>
    </div>
  )
}
