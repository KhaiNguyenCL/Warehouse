import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Search, X, ChevronLeft } from 'lucide-react'

import { useWarehouses } from '@/hooks/useWarehouses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePageNoPadding } from '@/layout/PageHeaderSlot'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  code:        z.string().min(1, 'Nhập mã kho'),
  name:        z.string().min(1, 'Nhập tên kho'),
  type:        z.enum(['physical', 'virtual']),
  address:     z.string().optional(),
  description: z.string().optional(),
  manager_id:  z.string().optional(),
  is_default:  z.boolean(),
  is_active:   z.boolean(),
})
type WarehouseForm = z.infer<typeof schema>

const DEFAULT_VALUES: WarehouseForm = {
  code: '', name: '', type: 'physical', address: '', description: '', manager_id: '', is_default: false, is_active: true,
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WarehousesPage() {
  usePageNoPadding()
  const { data, isLoading, users, createMutation, updateMutation, deleteMutation } = useWarehouses()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  const form = useForm<WarehouseForm>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  function openCreate() {
    setEditing(null)
    form.reset(DEFAULT_VALUES)
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      code:        record.code        ?? '',
      name:        record.name        ?? '',
      type:        record.type        ?? 'physical',
      address:     record.address     ?? '',
      description: record.description ?? '',
      manager_id:  record.manager_id  ?? '',
      is_default:  record.is_default  ?? false,
      is_active:   record.is_active   ?? true,
    })
    setDialogOpen(true)
  }

  function onSubmit(values: WarehouseForm) {
    const payload: any = { ...values }
    if (!payload.address)     delete payload.address
    if (!payload.description) delete payload.description
    if (!payload.manager_id)  delete payload.manager_id

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const warehouses: any[] = data ?? []
  const filtered = warehouses.filter((r) => {
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.code?.toLowerCase().includes(search.toLowerCase())) return false
    if (activeFilter === 'active' && !r.is_active) return false
    if (activeFilter === 'inactive' && r.is_active) return false
    return true
  })

  const userList: any[] = users?.data ?? []
  const selected = filtered.find((r) => r.id === selectedId) ?? null

  // Giữ lựa chọn hiện tại nếu vẫn còn trong danh sách sau khi lọc/tìm kiếm; nếu không thì
  // tự chọn dòng đầu tiên để panel bên phải luôn có nội dung — cùng pattern với CompaniesPage.
  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return }
    if (!selectedId || !filtered.some((r) => r.id === selectedId)) setSelectedId(filtered[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // ── Render ───────────────────────────────────────────────────────────────

  const physicalCount = warehouses.filter((w) => w.type === 'physical').length
  const virtualCount = warehouses.length - physicalCount

  return (
    <div className="theme-2a flex h-full min-h-0 flex-col bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Kho hàng</h1>
          <p className="kv-sub">{warehouses.length} kho · {physicalCount} kho vật lý, {virtualCount} kho ảo</p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn kv-btn--primary" onClick={openCreate}>Tạo kho</button>
        </div>
      </div>

      <div className={cn('kv-md', mobileDetail && 'kv-md--detail-open')}>

        {/* Roster */}
        <div className="kv-md-list">
          <div className="kv-md-tools">
            <div className="kv-search">
              <Search className="h-4 w-4" />
              <input className="kv-input" placeholder="Tìm tên, mã kho…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="kv-seg" role="tablist" aria-label="Lọc trạng thái">
              <button type="button" aria-current={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>Tất cả</button>
              <button type="button" aria-current={activeFilter === 'active'} onClick={() => setActiveFilter('active')}>Hoạt động</button>
              <button type="button" aria-current={activeFilter === 'inactive'} onClick={() => setActiveFilter('inactive')}>Ngừng</button>
            </div>
          </div>

          <ul className="kv-md-items">
            {isLoading ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>Đang tải…</li>
            ) : filtered.length === 0 ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>
                {search ? 'Không tìm thấy kết quả.' : 'Chưa có kho nào.'}
              </li>
            ) : (
              filtered.map((r) => (
                <li key={r.id}>
                  <a
                    className="kv-md-item"
                    aria-current={r.id === selectedId}
                    onClick={() => { setSelectedId(r.id); setMobileDetail(true) }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="kv-cell-title" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={cn('kv-dot', r.is_active ? 'kv-dot--on' : 'kv-dot--off')} />
                        <span className="truncate">{r.name}</span>
                      </div>
                      <div className="kv-cell-sub mono">{r.code}</div>
                    </div>
                    <div className="kv-tags">
                      {r.is_default && <span className="kv-tag kv-tag--default">Mặc định</span>}
                      {r.type === 'virtual' && <span className="kv-tag kv-tag--virtual">Ảo</span>}
                    </div>
                  </a>
                </li>
              ))
            )}
          </ul>

          {filtered.length > 0 && <div className="kv-md-foot">{filtered.length} kho</div>}
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="kv-md-detail flex items-center justify-center">
            <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 kho bên trái để xem chi tiết.</p>
          </div>
        ) : (
          <div className="kv-md-detail">

            <button
              onClick={() => setMobileDetail(false)}
              className="mb-2.5 flex items-center gap-1.5 border-none bg-transparent text-sm font-medium md:hidden"
              style={{ color: 'var(--text-2)', cursor: 'pointer' }}
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại danh sách
            </button>

            <div className="kv-md-head">
              <div>
                <h2 className="kv-md-title">
                  {selected.name}
                  {selected.is_default && <span className="kv-tag kv-tag--default">Mặc định</span>}
                </h2>
                <div className="kv-cell-sub"><span className="mono">{selected.code}</span> · {selected.type === 'physical' ? 'Kho vật lý' : 'Kho ảo'}</div>
              </div>
              <div className="kv-actions">
                <button type="button" className="kv-btn kv-btn--danger" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 className="h-3.5 w-3.5" />Xoá
                </button>
                <button type="button" className="kv-btn" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5" />Sửa
                </button>
              </div>
            </div>

            <div className="kv-md-block">
              <div className="kv-md-block-head">
                <h3 className="kv-section-title">Thông tin</h3>
              </div>
              <dl className="kv-dl">
                <div><dt>Mã kho</dt><dd className="mono">{selected.code}</dd></div>
                <div><dt>Loại kho</dt><dd>{selected.type === 'physical' ? 'Vật lý' : 'Ảo'}</dd></div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <StatusToggle
                      active={selected.is_active}
                      onChange={(v) => updateMutation.mutate({ id: selected.id, is_active: v })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Người quản lý</dt>
                  <dd>{userList.find((u) => u.id === selected.manager_id)?.full_name || <span className="kv-empty">Chưa chỉ định</span>}</dd>
                </div>
                <div className="kv-span-2"><dt>Địa chỉ</dt><dd>{selected.address || <span className="kv-empty">Chưa nhập</span>}</dd></div>
                <div className="kv-span-3"><dt>Mô tả</dt><dd>{selected.description || <span className="kv-empty">Chưa nhập</span>}</dd></div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="theme-2a w-96 flex flex-col gap-0" showCloseButton={false}>
          {/* header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              {editing ? editing.name : 'Tạo kho mới'}
            </h2>
            <button
              onClick={() => setDialogOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex flex-col gap-4">

                  {/* Code */}
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã kho</FormLabel>
                      <FormControl>
                        <Input placeholder="VD: WH-01" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Name */}
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên kho</FormLabel>
                      <FormControl>
                        <Input placeholder="VD: Kho chính Hà Nội" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Type */}
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại kho</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại kho" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="theme-2a">
                          <SelectItem value="physical">Vật lý</SelectItem>
                          <SelectItem value="virtual">Ảo (Demo / Bảo hành / Chờ QC…)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Address */}
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Địa chỉ</FormLabel>
                      <FormControl>
                        <Input placeholder="Địa chỉ kho" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Description */}
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Mô tả thêm về kho…" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Manager */}
                  <FormField control={form.control} name="manager_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Người quản lý</FormLabel>
                      <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Không chỉ định" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="theme-2a">
                          <SelectItem value="__none__">Không chỉ định</SelectItem>
                          {userList.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* is_default */}
                  <FormField control={form.control} name="is_default" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <FormLabel className="cursor-pointer text-sm font-normal">
                          Kho mặc định
                        </FormLabel>
                        <FormDescription className="mt-0.5 text-xs">
                          Tự động chọn khi tạo phiếu
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />

                  {/* is_active — only when editing */}
                  {editing && (
                    <FormField control={form.control} name="is_active" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                        <FormLabel className="cursor-pointer text-sm font-normal">
                          Hoạt động
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                  )}

                </div>
              </div>

              {/* footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Huỷ
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Lưu thay đổi' : 'Tạo kho'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá kho?</AlertDialogTitle>
            <AlertDialogDescription>
              Kho <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Không thể xoá nếu kho đang có hàng hoặc được tham chiếu bởi phiếu nhập/xuất/chuyển.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
