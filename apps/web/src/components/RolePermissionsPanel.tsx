// Ma trận permission cho 1 Role — group theo permissions.group, mỗi group là 1 section
// card riêng (icon + nhãn tiếng Việt + đếm đã chọn + chọn nhanh cả nhóm) thay vì 1 list
// phẳng chung. Controlled: selected + onChange đến từ parent (RolesPage), không có state riêng.
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, FileText, PackageCheck, PackageX, ArrowLeftRight,
  ClipboardList, BarChart3, Settings2, KeyRound,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  roleId: string
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

const GROUP_META: Record<string, { label: string; icon: typeof ShoppingCart }> = {
  purchase_order: { label: 'Đơn mua hàng (PO)', icon: ShoppingCart },
  quotation:      { label: 'Báo giá',            icon: FileText },
  receipt:        { label: 'Phiếu nhập kho',     icon: PackageCheck },
  delivery:       { label: 'Phiếu xuất kho',     icon: PackageX },
  transfer:       { label: 'Chuyển kho',         icon: ArrowLeftRight },
  stocktake:      { label: 'Kiểm kê',            icon: ClipboardList },
  report:         { label: 'Báo cáo',            icon: BarChart3 },
  settings:       { label: 'Cài đặt hệ thống',   icon: Settings2 },
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

  function toggleGroup(perms: any[], checked: boolean) {
    const next = new Set(selected)
    for (const p of perms) {
      if (checked) next.add(p.key)
      else next.delete(p.key)
    }
    onChange(next)
  }

  const grouped: Record<string, any[]> = {}
  for (const p of allPermissions ?? []) {
    grouped[p.group] = grouped[p.group] ?? []
    grouped[p.group].push(p)
  }

  if (isLoading) return null

  const groups = Object.entries(grouped)
  const total = allPermissions?.length ?? 0
  const totalSelected = groups.reduce((sum, [, perms]) => sum + perms.filter((p) => selected.has(p.key)).length, 0)

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Phân quyền</p>
        <span className="flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground">
          <KeyRound className="h-3 w-3" />
          {totalSelected}/{total} quyền
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups.map(([group, perms]) => {
          const meta = GROUP_META[group] ?? { label: group, icon: KeyRound }
          const Icon = meta.icon
          const selectedInGroup = perms.filter((p) => selected.has(p.key)).length
          const allSelected = selectedInGroup === perms.length
          return (
            <div key={group} className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-semibold text-foreground">{meta.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground">{selectedInGroup}/{perms.length}</span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(perms, !allSelected)}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 p-3">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-muted/40',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                      checked={selected.has(p.key)}
                      onChange={(e) => toggle(p.key, e.target.checked)}
                    />
                    <span className="text-foreground">{p.description ?? p.key}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
