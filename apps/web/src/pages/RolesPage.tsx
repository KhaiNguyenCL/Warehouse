import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Shield } from 'lucide-react'

import { useRoles } from '@/hooks/useRoles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import RolePermissionsPanel from '@/components/RolePermissionsPanel'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, 'Nhập tên role'),
  description: z.string().optional(),
})
type RoleForm = z.infer<typeof schema>

// ── Component ────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { data, isLoading, createMutation, updateMutation, deleteMutation } = useRoles()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const form = useForm<RoleForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '' })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({ name: record.name ?? '', description: record.description ?? '' })
    setDialogOpen(true)
  }

  function onSubmit(values: RoleForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...values }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const roles: any[] = data ?? []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vai trò & Phân quyền</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý vai trò và phân quyền cho từng nhóm người dùng
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo role
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mô tả</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hệ thống</th>
              <th className="w-16 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có vai trò nào.
                </td>
              </tr>
            ) : (
              roles.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className="group/row cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.is_system ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        <Shield className="h-3 w-3" />
                        Hệ thống
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!r.is_system && (
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {roles.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{roles.length} vai trò</span>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn(editing ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Sửa role "${editing.name}"` : 'Tạo role mới'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên role <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: Kế toán"
                      disabled={editing?.is_system === true}
                      {...field}
                    />
                  </FormControl>
                  {editing?.is_system && (
                    <FormDescription className="text-amber-600">
                      Role hệ thống — không đổi tên được
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Input placeholder="Mô tả ngắn về vai trò này" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Huỷ
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </DialogFooter>
            </form>
          </Form>

          {/* Permissions panel — outside the form, only when editing */}
          {editing && <RolePermissionsPanel roleId={editing.id} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá role?</AlertDialogTitle>
            <AlertDialogDescription>
              Role <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Chỉ xoá được nếu không có user nào đang dùng role này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
