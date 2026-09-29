import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SectionCard } from '@/components/ui/SectionCard'
import { CodeText } from '@/components/ui/CodeText'
import { usePageHeader } from '@/layout/PageHeaderSlot'

const QUOTATION_FIELD_OPTIONS = [
  { value: 'company_id',        label: 'Khách hàng' },
  { value: 'contact_id',        label: 'Người liên hệ' },
  { value: 'quote_number',      label: 'Số báo giá' },
  { value: 'quote_date',        label: 'Ngày báo giá' },
  { value: 'project_name',      label: 'Tên dự án' },
  { value: 'delivery_location', label: 'Địa điểm giao hàng' },
  { value: 'warehouse_id',      label: 'Kho xuất' },
  { value: 'valid_days',        label: 'Hiệu lực (ngày)' },
  { value: 'discount',          label: 'Giảm giá' },
  { value: 'terms',             label: 'Điều khoản' },
  { value: 'note',              label: 'Ghi chú' },
  { value: 'bitrix_deal_id',    label: 'Bitrix Deal ID' },
]

const BITRIX_OBJECT_OPTIONS = [
  { value: 'deal',    label: 'Deal' },
  { value: 'company', label: 'Company' },
  { value: 'contact', label: 'Contact' },
]

// Chuyển raw deal object thành list rows để hiển thị + làm options cho Select
function dealToRows(obj: Record<string, unknown>, prefix = ''): { key: string; value: string; label: string }[] {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== '' && !Array.isArray(v) && typeof v !== 'object')
    .map(([k, v]) => ({ key: prefix ? `${prefix}.${k}` : k, value: String(v), label: '' }))
}

function PreviewSyncTable({ dealId }: { dealId: string }) {
  const { data, isFetching, error } = useQuery({
    queryKey: ['bitrix-preview-sync', dealId],
    queryFn: async () => (await api.get(`/bitrix/deals/${dealId}/preview-sync`)).data,
    retry: false,
  })
  if (isFetching) return <p className="text-sm text-muted-foreground">Đang tính toán...</p>
  if (error) {
    return (
      <div className="rounded-md border border-[var(--s-cancelled-bg)] bg-[var(--s-cancelled-bg)] px-3 py-2 text-sm text-[var(--s-cancelled-color)]">
        {(error as any)?.response?.data?.message ?? 'Lỗi preview'}
      </div>
    )
  }
  if (!data) return null
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">
        Deal: <strong className="text-foreground">{data.deal_title || data.deal_id}</strong>
      </p>
      <div className="overflow-hidden rounded-lg border border-border-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Field báo giá</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bitrix Field</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Giá trị thô (Bitrix)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Giá trị sau resolve</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data.rows as any[]).map((row) => (
              <tr key={row.quotation_field}>
                <td className="px-3 py-2"><CodeText>{row.quotation_field}</CodeText></td>
                <td className="px-3 py-2"><CodeText>{row.bitrix_field}</CodeText></td>
                <td className="px-3 py-2 text-xs">
                  {row.raw_value == null
                    ? <span className="text-muted-foreground">null — field trống hoặc không tồn tại trong deal này</span>
                    : <span className="break-all text-foreground">{String(row.raw_value)} <span className="ml-1 rounded bg-muted px-1 text-[10px]">{typeof row.raw_value}</span></span>}
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-foreground">{row.resolved_value == null ? '—' : String(row.resolved_value)}</td>
                <td className="px-3 py-2 text-xs">
                  {row.skipped ? (
                    <span className="inline-flex items-center gap-1 text-[var(--s-cancelled-color)]"><XCircle className="h-3.5 w-3.5" />{row.reason}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--s-completed-color)]"><CheckCircle2 className="h-3.5 w-3.5" />Sẽ được điền</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

interface MappingRow { quotation_field: string; bitrix_object: string; bitrix_field: string }
interface MappingForm { mappings: MappingRow[] }

export default function SettingsBitrixPage() {
  // ── Preview Deal state ──────────────────────────────────────────────────
  const [previewDealId, setPreviewDealId] = useState('')
  const [fetchDealId, setFetchDealId] = useState<string | undefined>()

  const { data: dealFields } = useQuery({
    queryKey: ['bitrix-deal-fields'],
    queryFn: async () => (await api.get('/bitrix/deal-fields')).data as Record<string, { title: string; type: string }>,
    retry: false,
  })

  const { data: dealPreview, isFetching: dealLoading, error: dealError } = useQuery({
    queryKey: ['bitrix-deal-preview', fetchDealId],
    queryFn: async () => (await api.get(`/bitrix/deals/${fetchDealId}`)).data,
    enabled: !!fetchDealId,
    retry: false,
  })

  const dealRows = dealPreview
    ? dealToRows(dealPreview).map((r) => ({
        ...r,
        label: dealFields?.[r.key]?.title ?? '',
      }))
    : []

  const dealFieldOptions = dealRows.map((r) => ({
    value: r.key,
    label: r.label ? `${r.label} (${r.key})` : r.key,
  }))

  // ── Mappings ────────────────────────────────────────────────────────────
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['bitrix', 'mappings'],
    queryFn: async () => (await api.get('/bitrix/mappings')).data,
  })

  const form = useForm<MappingForm>({ defaultValues: { mappings: [] } })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'mappings' })

  useEffect(() => {
    if (mappings) form.reset({ mappings })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings])

  const saveMutation = useApiMutation(
    (rows: MappingRow[]) => api.put('/bitrix/mappings', { mappings: rows }),
    { successMessage: 'Lưu mapping thành công', invalidateKey: ['bitrix', 'mappings'] },
  )

  usePageHeader(
    <h1 className="truncate text-sm font-semibold tracking-tight">Đồng bộ Bitrix</h1>,
  )

  if (isLoading) return null

  return (
    <div className="flex flex-col gap-4">
      {/* ── Preview Deal Fields ── */}
      <SectionCard title="Xem fields của Deal Bitrix">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Nhập bất kỳ Deal ID nào để xem danh sách field + giá trị thật — dùng làm tham chiếu khi cấu hình mapping bên dưới.
          </p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nhập Bitrix Deal ID"
              className="w-56"
              value={previewDealId}
              onChange={(e) => setPreviewDealId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setFetchDealId(previewDealId) }}
            />
            <Button variant="outline" disabled={!previewDealId || dealLoading} onClick={() => setFetchDealId(previewDealId)}>
              {dealLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Fetch fields
            </Button>
          </div>

          {dealError && (
            <div className="rounded-md border border-[var(--s-cancelled-bg)] bg-[var(--s-cancelled-bg)] px-3 py-2 text-sm text-[var(--s-cancelled-color)]">
              {(dealError as any)?.response?.data?.message ?? 'Không fetch được Deal'}
            </div>
          )}

          {dealRows.length > 0 && (
            <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-lg border border-border-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Label</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Field Key</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Giá trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dealRows.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2 text-foreground">{r.label || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2"><CodeText>{r.key}</CodeText></td>
                      <td className="px-3 py-2 break-all text-foreground">{r.value.length > 120 ? r.value.slice(0, 120) + '…' : r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Preview Sync ── */}
      {fetchDealId && (
        <SectionCard title="Kiểm tra sync — giá trị sẽ được điền">
          <PreviewSyncTable dealId={fetchDealId} />
        </SectionCard>
      )}

      {/* ── Field Mapping ── */}
      <SectionCard title="Cấu hình mapping">
        <p className="mb-3 text-sm text-muted-foreground">
          Chọn field báo giá sẽ được tự động điền khi sync từ Bitrix Deal.
          {dealFieldOptions.length > 0
            ? ' Dropdown Bitrix Field đã được điền từ Deal vừa fetch.'
            : ' Fetch 1 Deal mẫu ở trên để chọn từ dropdown, hoặc nhập tay tên field.'}
          {' '}Lưu ý: <strong className="text-foreground">Khách hàng</strong> và <strong className="text-foreground">Người liên hệ</strong> được resolve tự động từ
          COMPANY_ID / CONTACT_ID của Deal — chỉ cần chọn đúng field đó là đủ.
          Field dạng list/enum (UF_CRM_*) sẽ tự tra ID → label khi sync.
        </p>

        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v.mappings))} className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2">
              <Select
                value={form.watch(`mappings.${index}.quotation_field`)}
                onValueChange={(v) => form.setValue(`mappings.${index}.quotation_field`, v)}
              >
                <SelectTrigger className="w-64"><SelectValue placeholder="Field báo giá" /></SelectTrigger>
                <SelectContent>
                  {QUOTATION_FIELD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <span className="px-1 text-muted-foreground">←</span>

              <Select
                value={form.watch(`mappings.${index}.bitrix_object`)}
                onValueChange={(v) => form.setValue(`mappings.${index}.bitrix_object`, v)}
              >
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BITRIX_OBJECT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {dealFieldOptions.length > 0 ? (
                <Select
                  value={form.watch(`mappings.${index}.bitrix_field`)}
                  onValueChange={(v) => form.setValue(`mappings.${index}.bitrix_field`, v)}
                >
                  <SelectTrigger className="w-72"><SelectValue placeholder="Chọn Bitrix field" /></SelectTrigger>
                  <SelectContent>
                    {dealFieldOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="VD: TITLE, UF_CRM_..."
                  className="w-56"
                  value={form.watch(`mappings.${index}.bitrix_field`) ?? ''}
                  onChange={(e) => form.setValue(`mappings.${index}.bitrix_field`, e.target.value)}
                />
              )}

              <button
                type="button"
                onClick={() => remove(index)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => append({ quotation_field: '', bitrix_object: 'deal', bitrix_field: '' })}
          >
            Thêm mapping
          </Button>

          <div className="mt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Lưu mapping
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}
