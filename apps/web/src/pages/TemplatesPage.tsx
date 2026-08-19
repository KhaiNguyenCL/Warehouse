import { useEffect, useRef, useState } from 'react'
import { Upload, Pencil, Trash2, X } from 'lucide-react'

import { useTemplates } from '../hooks/useTemplates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import TemplateMappingsPanel from '../components/TemplateMappingsPanel'

const OBJECT_TYPE_LABEL: Record<string, string> = {
  quotation:      'Báo giá',
  receipt:        'Phiếu nhập kho',
  delivery_order: 'Phiếu xuất kho',
}

export default function TemplatesPage() {
  const hook = useTemplates()

  // Edit sheet state — bypass hook.form (Ant Design), manage locally
  const [editName, setEditName]           = useState('')
  const [deleteTarget, setDeleteTarget]   = useState<any | null>(null)

  useEffect(() => {
    if (hook.editing) setEditName(hook.editing.name ?? '')
  }, [hook.editing])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const rows: any[] = hook.data?.data ?? hook.data ?? []

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mẫu báo giá / phiếu</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quản lý template HTML dùng để xuất phiếu</p>
        </div>
        <Button onClick={() => hook.setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Tải lên template
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại đối tượng</th>
              <th className="w-28 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Đang dùng</th>
              <th className="w-32 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mặc định</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngày tạo</th>
              <th className="w-16 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">Chưa có template nào.</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => { hook.setDetectedVariables(undefined); hook.openEdit(r) }}
                className="group/row cursor-pointer transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-2.5 text-foreground">{OBJECT_TYPE_LABEL[r.object_type] ?? r.object_type}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(checked) =>
                        hook.toggleMutation.mutate({ id: r.id, field: 'is_active', value: checked })
                      }
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    {r.is_default ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-300">
                        Mặc định
                      </span>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => hook.toggleMutation.mutate({ id: r.id, field: 'is_default', value: true })}
                      >
                        Đặt mặc định
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm text-foreground">
                  {new Date(r.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); hook.setDetectedVariables(undefined); hook.openEdit(r) }}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{rows.length} template</span>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {hook.uploadOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => hook.setUploadOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Tải lên template mới</h2>
              <button onClick={() => hook.setUploadOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Tên template <span className="text-red-500">*</span></label>
                <Input
                  placeholder="VD: Báo giá VN"
                  value={hook.uploadName}
                  onChange={(e) => hook.setUploadName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Loại đối tượng <span className="text-red-500">*</span></label>
                <Select value={hook.uploadObjectType} onValueChange={hook.setUploadObjectType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(OBJECT_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">File HTML (.html) <span className="text-red-500">*</span></label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.xlsx"
                  className="hidden"
                  onChange={(e) => hook.setUploadFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    Chọn file
                  </Button>
                  {hook.uploadFile && (
                    <span className="text-sm text-foreground">{hook.uploadFile.name}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tải file mẫu:{' '}
                  <a
                    href="/api/templates/sample/import_1"
                    download="import_1.html"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    import_1.html
                  </a>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" onClick={() => hook.setUploadOpen(false)}>Huỷ</Button>
              <Button
                disabled={!hook.uploadName || !hook.uploadFile || hook.uploadMutation.isPending}
                onClick={() => hook.uploadMutation.mutate()}
              >
                {hook.uploadMutation.isPending ? 'Đang tải…' : 'Tải lên'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Sheet */}
      <div className={cn('fixed inset-0 z-40 bg-black/30 transition-opacity duration-200', hook.open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={hook.close} />
      <div className={cn('fixed right-0 top-0 z-50 flex h-full w-[680px] flex-col bg-background shadow-xl transition-transform duration-200', hook.open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">
            {hook.editing ? `Sửa template "${hook.editing.name}"` : 'Template'}
          </h2>
          <button onClick={hook.close} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tên template <span className="text-red-500">*</span></label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Tên template" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Loại đối tượng</label>
              <p className="text-sm text-foreground">
                {hook.editing ? (OBJECT_TYPE_LABEL[hook.editing.object_type] ?? hook.editing.object_type) : '—'}
              </p>
            </div>

            {hook.editing && (
              <div className="mt-2">
                <TemplateMappingsPanel
                  templateId={hook.editing.id}
                  detectedVariables={hook.detectedVariables}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={hook.close}>Huỷ</Button>
          <Button
            disabled={!editName.trim() || hook.updateMutation.isPending}
            onClick={() => hook.updateMutation.mutate({ name: editName })}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { hook.deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
