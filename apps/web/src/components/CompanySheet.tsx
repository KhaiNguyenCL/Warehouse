import { useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Input as AntInput, Select, Switch as AntSwitch, InputNumber, DatePicker, Popconfirm } from 'antd'
import { X, Plus, Trash2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import ContactsPanel, { type ContactsPanelRef } from './ContactsPanel'
import SupplierProductsPanel from './SupplierProductsPanel'
import { COUNTRIES } from '../constants/countries'

// ── helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ types }: { types: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types?.map((t) => (
        <span key={t} className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          t === 'customer'
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
        )}>
          {t === 'customer' ? 'Khách hàng' : 'NCC'}
        </span>
      ))}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value || '—'}</div>
    </div>
  )
}

function SectionBlock({
  title, children, action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

async function saveCustomFieldValues(objectId: string, custom: Record<string, any>) {
  const values = Object.entries(custom)
    .filter(([, v]) => v != null && v !== '')
    .map(([field_id, value]) => ({ field_id, value: String(value) }))
  if (values.length > 0) {
    await api.put('/custom-fields/values', { values }, { params: { object_type: 'company', object_id: objectId } })
  }
}

function CustomFieldInput({ cf, value, onChange }: { cf: any; value?: any; onChange?: (v: any) => void }) {
  if (cf.field_type === 'boolean') return <AntSwitch checked={!!value} onChange={onChange} />
  if (cf.field_type === 'number')  return <InputNumber value={value} onChange={onChange} style={{ width: '100%' }} />
  if (cf.field_type === 'date')    return <DatePicker value={value} onChange={onChange} style={{ width: '100%' }} />
  if (cf.field_type === 'select')  return (
    <Select value={value} onChange={onChange}
      options={(cf.options ?? []).map((o: string) => ({ value: o, label: o }))} />
  )
  return <AntInput value={value} onChange={(e) => onChange?.(e.target.value)} />
}

// ── main component ────────────────────────────────────────────────────────────

export type SheetMode = 'create' | 'view' | null

interface Props {
  mode: SheetMode
  companyId: string | null
  customFieldDefs: any[]
  onClose: () => void
  onCreated: () => void
}

export default function CompanySheet({ mode, companyId, customFieldDefs, onClose, onCreated }: Props) {
  const open = mode !== null
  const qc = useQueryClient()
  const contactsRef = useRef<ContactsPanelRef>(null!)
  const [form] = Form.useForm()

  // fetch company for view mode
  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId && mode === 'view',
  })

  // reset form when switching to create
  useEffect(() => {
    if (mode === 'create') form.resetFields()
  }, [mode, form])

  const createMutation = useApiMutation(
    async (values: any) => {
      const { custom, ...rest } = values
      const res = await api.post('/companies', rest)
      if (custom) await saveCustomFieldValues(res.data.id, custom)
      return res
    },
    {
      successMessage: 'Tạo công ty thành công',
      invalidateKey: ['companies'],
      onSuccess: () => { form.resetFields(); onCreated(); onClose() },
    },
  )

  const deleteMutation = useApiMutation(
    () => api.delete(`/companies/${companyId}`),
    {
      successMessage: 'Đã xoá công ty',
      invalidateKey: ['companies'],
      onSuccess: () => onClose(),
    },
  )

  const isSupplier = company?.types?.includes('supplier')

  function handleClose() {
    form.resetFields()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-[580px] w-[580px]"
      >
        {/* ── header ── */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          {mode === 'create' ? (
            <div>
              <h2 className="text-base font-semibold text-foreground">Tạo công ty mới</h2>
            </div>
          ) : isLoading ? (
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <div className="flex flex-col gap-1.5 min-w-0">
              <h2 className="text-base font-semibold text-foreground leading-snug">{company?.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {company?.code && (
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                    {company.code}
                  </span>
                )}
                <TypeBadge types={company?.types ?? []} />
              </div>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1">
            {mode === 'view' && (
              <Popconfirm
                title="Xoá công ty này?"
                description="Không thể khôi phục sau khi xoá."
                onConfirm={() => deleteMutation.mutate(undefined)}
                okText="Xoá"
                okButtonProps={{ danger: true }}
                cancelText="Huỷ"
                placement="bottomRight"
              >
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Popconfirm>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'create' ? (
            <CreateBody
              form={form}
              customFieldDefs={customFieldDefs}
              createMutation={createMutation}
              onClose={handleClose}
            />
          ) : (
            <ViewBody
              company={company}
              isLoading={isLoading}
              isSupplier={isSupplier}
              companyId={companyId}
              contactsRef={contactsRef}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── create body ───────────────────────────────────────────────────────────────

function CreateBody({
  form, customFieldDefs, createMutation, onClose,
}: {
  form: any
  customFieldDefs: any[]
  createMutation: any
  onClose: () => void
}) {
  function handleFinish(values: any) {
    createMutation.mutate(values)
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      className="flex flex-col h-full"
      initialValues={{ country: 'VN' }}
    >
      <div className="flex flex-col gap-0 px-5 py-4">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="name" label="Tên công ty" rules={[{ required: true }]} className="col-span-2">
            <AntInput placeholder="Công ty TNHH ABC" />
          </Form.Item>
          <Form.Item name="code" label="Mã" extra="Để trống → tự sinh CTY-XXXX">
            <AntInput placeholder="CTY-0001" />
          </Form.Item>
          <Form.Item name="types" label="Loại" rules={[{ required: true }]}>
            <Select mode="multiple" options={[
              { value: 'customer', label: 'Khách hàng' },
              { value: 'supplier', label: 'NCC' },
            ]} />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <AntInput placeholder="0901234567" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <AntInput placeholder="contact@company.com" />
          </Form.Item>
          <Form.Item name="tax_code" label="Mã số thuế">
            <AntInput placeholder="0123456789" />
          </Form.Item>
          <Form.Item name="country" label="Quốc gia">
            <Select showSearch optionFilterProp="label" options={COUNTRIES} />
          </Form.Item>
          <Form.Item name="bank_account" label="Số tài khoản">
            <AntInput />
          </Form.Item>
          <Form.Item name="bank_name" label="Ngân hàng">
            <AntInput />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" className="col-span-2">
            <AntInput />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú" className="col-span-2">
            <AntInput.TextArea rows={2} />
          </Form.Item>
          {customFieldDefs.map((cf: any) => (
            <Form.Item key={cf.id} name={['custom', cf.id]} label={cf.field_label} className="col-span-2">
              <CustomFieldInput cf={cf} />
            </Form.Item>
          ))}
        </div>
      </div>

      {/* sticky footer */}
      <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
          Huỷ
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Đang tạo…' : 'Tạo công ty'}
        </Button>
      </div>
    </Form>
  )
}

// ── view body ─────────────────────────────────────────────────────────────────

function ViewBody({
  company, isLoading, isSupplier, companyId, contactsRef,
}: {
  company: any
  isLoading: boolean
  isSupplier?: boolean
  companyId: string | null
  contactsRef: React.RefObject<ContactsPanelRef>
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-5 py-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      {/* Info */}
      <SectionBlock title="Thông tin">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label="Số điện thoại" value={company?.phone} />
          <InfoRow label="Email"          value={company?.email} />
          <InfoRow label="Mã số thuế"     value={company?.tax_code} />
          <InfoRow label="Quốc gia"       value={company?.country} />
          {(company?.bank_account || company?.bank_name) && (
            <>
              <InfoRow label="Số tài khoản" value={company?.bank_account} />
              <InfoRow label="Ngân hàng"    value={company?.bank_name} />
            </>
          )}
          {company?.address && (
            <div className="col-span-2">
              <InfoRow label="Địa chỉ" value={company.address} />
            </div>
          )}
          {company?.note && (
            <div className="col-span-2">
              <InfoRow label="Ghi chú" value={company.note} />
            </div>
          )}
        </div>
      </SectionBlock>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Contacts */}
      <SectionBlock
        title="Người liên hệ"
        action={
          <Button
            size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
            onClick={() => contactsRef.current?.openCreate()}
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </Button>
        }
      >
        {companyId && <ContactsPanel ref={contactsRef} companyId={companyId} />}
      </SectionBlock>

      {/* Supplier products */}
      {isSupplier && companyId && (
        <>
          <div className="border-t border-border" />
          <SectionBlock title="Hàng hóa cung cấp">
            <SupplierProductsPanel companyId={companyId} />
          </SectionBlock>
        </>
      )}
    </div>
  )
}
