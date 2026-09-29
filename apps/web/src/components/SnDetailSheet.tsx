import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import { fmt, fmtReceipt, REF_DOCUMENT_PATH, REF_DOCUMENT_LABEL } from '../lib/snFormat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SectionCard, InfoRow } from '@/components/ui/SectionCard'

const editSnSchema = z.object({
  serial_no:   z.string().min(1, 'Nhập serial number'),
  mac_address: z.string().optional(),
  note:        z.string().optional(),
})
type EditSnForm = z.infer<typeof editSnSchema>

// Sheet chi tiết 1 Serial Number — dùng chung cho InventoryPage (tab "Theo SKU"/"Hàng đã
// bán") và InventorySerialsPage, để mọi nơi bấm vào 1 SN đều ra đúng 1 UI, không lệch nhau.
export function SnDetailSheet({ sn, onClose, listQueryKey }: { sn: any | null; onClose: () => void; listQueryKey: unknown[] }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ['inventory', 'serials', sn?.id, 'movements'],
    queryFn: async () => (await api.get(`/inventory/serials/${sn!.id}/movements`)).data,
    enabled: !!sn,
  })

  const form = useForm<EditSnForm>({
    resolver: zodResolver(editSnSchema),
    defaultValues: { serial_no: '', mac_address: '', note: '' },
  })

  function openEdit() {
    form.reset({ serial_no: sn.serial_no ?? '', mac_address: sn.mac_address ?? '', note: sn.note ?? '' })
    setEditOpen(true)
  }

  async function onSave(values: EditSnForm) {
    try {
      await api.patch(`/inventory/serials/${sn!.id}`, {
        serial_no: values.serial_no, mac_address: values.mac_address || null, note: values.note || null,
      })
      toast.success('Đã cập nhật')
      qc.invalidateQueries({ queryKey: listQueryKey })
      setEditOpen(false)
      onClose()
    } catch {
      toast.error('Lưu thất bại')
    }
  }

  return (
    <Sheet open={!!sn} onOpenChange={(o) => { if (!o) { setEditOpen(false); onClose() } }}>
      <SheetContent side="right" className="theme-2a w-[480px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-mono text-sm font-semibold text-foreground">{sn?.serial_no ?? ''}</h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => (editOpen ? setEditOpen(false) : openEdit())}>
              {editOpen ? 'Huỷ sửa' : 'Sửa'}
            </Button>
            <button
              onClick={() => { setEditOpen(false); onClose() }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sn && (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-4">
              <SectionCard title="Thông tin">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">Trạng thái</div>
                    <div className="mt-1"><StatusBadge status={sn.status} /></div>
                  </div>
                  <InfoRow label="Kho" value={sn.warehouse_name} />
                  <InfoRow label="MAC" value={sn.mac_address} />
                  <InfoRow label="Phiếu nhập · Ngày" value={fmtReceipt(sn.receipt_code, sn.completed_at)} />
                  <InfoRow label="Hết BH hãng" value={fmt(sn.manufacturer_warranty_end)} />
                  <InfoRow label="Hết BH cty" value={fmt(sn.customer_warranty_end)} />
                </div>
              </SectionCard>

              {editOpen && (
                <SectionCard title="Sửa thông tin">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col gap-3">
                      <FormField control={form.control} name="serial_no" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial No <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="mac_address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>MAC Address</FormLabel>
                          <FormControl><Input placeholder="AA:BB:CC:DD:EE:FF" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="note" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ghi chú</FormLabel>
                          <FormControl><Textarea rows={2} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" size="sm" className="self-end" disabled={form.formState.isSubmitting}>
                        Lưu
                      </Button>
                    </form>
                  </Form>
                </SectionCard>
              )}

              <SectionCard title="Lịch sử di chuyển">
                {movLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Đang tải…</div>
                ) : !movements?.length ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Chưa có lịch sử</div>
                ) : (
                  <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border-md">
                    {movements.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            'flex-shrink-0 text-sm font-semibold',
                            m.movement_type === 'in' ? 'text-[var(--s-completed-color)]' : 'text-[var(--s-cancelled-color)]',
                          )}>
                            {m.movement_type === 'in' ? 'Nhập' : 'Xuất'}
                          </span>
                          <span className="truncate text-foreground">{m.warehouse_name}</span>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleString('vi-VN')}</span>
                          {REF_DOCUMENT_PATH[m.ref_document_type] ? (
                            <button
                              onClick={() => navigate(`${REF_DOCUMENT_PATH[m.ref_document_type]}/${m.ref_document_id}`)}
                              className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                            >
                              {REF_DOCUMENT_LABEL[m.ref_document_type]}
                            </button>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
