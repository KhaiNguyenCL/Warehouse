// Checkbox ma trận permission cho 1 Role — group theo permissions.group.
// Controlled: selected + onChange đến từ parent (RolesPage), không có state riêng.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Props {
  roleId: string
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

export default function RolePermissionsPanel({ roleId, selected, onChange }: Props) {
  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ['settings', 'permissions'],
    queryFn: async () => (await api.get('/settings/permissions')).data,
  })

  function toggle(key: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(key)
    else next.delete(key)
    onChange(next)
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
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
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
    </div>
  )
}
