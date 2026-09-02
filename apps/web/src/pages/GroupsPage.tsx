import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

import { useGroups } from '@/hooks/useGroups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import GroupMembersPanel from '@/components/GroupMembersPanel'
import { Sheet, SheetContent } from '@/components/ui/sheet'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, 'Nhập tên nhóm'),
  description: z.string().optional(),
  role_id:     z.string().min(1, 'Chọn vai trò'),
})
type GroupForm = z.infer<typeof schema>

// ── Component ────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { data, isLoading, roles, createMutation, updateMutation, deleteMutation } = useGroups()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const form = useForm<GroupForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', role_id: '' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', role_id: '' })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      name:        record.name ?? '',
      description: record.description ?? '',
      role_id:     record.role_id ?? '',
    })
    setDialogOpen(true)
  }

  function onSubmit(values: GroupForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...values }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const groups: any[] = data ?? []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Nhóm người dùng</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý nhóm — mỗi nhóm gắn 1 vai trò, user thuộc nhóm nào thì có quyền của vai trò đó
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo nhóm
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="w-12 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tên nhóm</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mô tả</th>
              <th className="w-48 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Vai trò</th>
              <th className="w-16 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Chưa có nhóm nào.
                </td>
              </tr>
            ) : (
              groups.map((g, i) => (
                <tr
                  key={g.id}
                  onClick={() => openEdit(g)}
                  className="group/row cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{g.name}</td>
                  <td className="px-4 py-2 text-foreground">{g.description ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-foreground">{g.role_name}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(g) }}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(g) }}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {groups.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{groups.length} nhóm</span>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="w-[480px] flex flex-col gap-0" showCloseButton={false}>
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? `Sửa nhóm "${editing.name}"` : 'Tạo nhóm mới'}
          </h2>
          <button
            onClick={() => setDialogOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* scrollable body + footer */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên nhóm <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Kho HCM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Input placeholder="Mô tả ngắn về nhóm này" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="role_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(roles ?? []).map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Members panel — only when editing */}
                {editing && <GroupMembersPanel groupId={editing.id} />}

              </div>
            </div>

            {/* footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Lưu thay đổi' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Nhóm <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Các thành viên sẽ mất quyền theo vai trò của nhóm này.
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
