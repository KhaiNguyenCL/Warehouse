import { useRef, useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Popconfirm } from 'antd'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import ContactsPanel, { type ContactsPanelRef } from './ContactsPanel'
import SupplierProductsPanel from './SupplierProductsPanel'

function TypeBadge({ types }: { types: string[] }) {
  return (
    <>
      {types?.map((t) => (
        <span key={t} className={`kv-tag ${t === 'customer' ? 'kv-tag--default' : 'kv-tag--bundle'}`}>
          {t === 'customer' ? 'Khách hàng' : 'NCC'}
        </span>
      ))}
    </>
  )
}

// ── inline editable Mã field ──────────────────────────────────────────────────

function EditableCode({ companyId, initialCode }: { companyId: string; initialCode: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialCode)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(initialCode) }, [initialCode])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const saveMutation = useApiMutation(
    (code: string) => api.patch(`/companies/${companyId}`, { code }),
    {
      successMessage: 'Đã cập nhật mã',
      invalidateKey: ['companies'],
      onSuccess: () => setEditing(false),
    },
  )

  function handleCancel() {
    setValue(initialCode)
    setEditing(false)
  }

  function handleSave() {
    if (value.trim() && value.trim() !== initialCode) {
      saveMutation.mutate(value.trim())
    } else {
      setValue(initialCode)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className="h-7 w-32 px-1.5 py-0 font-mono text-xs"
          disabled={saveMutation.isPending}
        />
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex h-5 w-5 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1.5">
      <span className="mono">{initialCode}</span>
      <button
        onClick={() => setEditing(true)}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
        title="Sửa mã"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface Props { companyId: string | null }

export default function CompanyDetailPanel({ companyId }: Props) {
  const contactsRef = useRef<ContactsPanelRef>(null!)

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
    // Giữ dữ liệu công ty trước đó khi đổi companyId — tránh panel "chớp" về skeleton
    // giữa 2 lần chọn dòng (chỉ mất mượt khi companyId đó chưa từng được cache).
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation(
    () => api.delete(`/companies/${companyId}`),
    { successMessage: 'Đã xoá công ty', invalidateKey: ['companies'] },
  )

  if (!companyId) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 đối tác bên trái để xem chi tiết.</p>
      </div>
    )
  }

  const isSupplier = company?.types?.includes('supplier')

  return (
    <>
      {/* Header — port .kv-md-head */}
      {isLoading ? (
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      ) : (
        <div className="kv-md-head">
          <div>
            <h2 className="kv-md-title">{company?.name}</h2>
            <div className="kv-cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {company?.code && <EditableCode companyId={companyId} initialCode={company.code} />}
              <TypeBadge types={company?.types ?? []} />
            </div>
          </div>

          <Popconfirm
            title="Xoá công ty này?"
            description="Không thể khôi phục sau khi xoá."
            onConfirm={() => deleteMutation.mutate(undefined)}
            okText="Xoá"
            okButtonProps={{ danger: true }}
            cancelText="Huỷ"
            placement="bottomRight"
          >
            <button type="button" className="kv-btn kv-btn--danger" disabled={deleteMutation.isPending}>
              <Trash2 className="h-3.5 w-3.5" />Xoá
            </button>
          </Popconfirm>
        </div>
      )}

      <div className="kv-md-block">
        <div className="kv-md-block-head">
          <h3 className="kv-section-title">Thông tin</h3>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4" style={{ marginTop: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <dl className="kv-dl">
            <div><dt>Số điện thoại</dt><dd>{company?.phone || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Email</dt><dd>{company?.email || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Mã số thuế</dt><dd>{company?.tax_code || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Quốc gia</dt><dd>{company?.country || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Số tài khoản</dt><dd>{company?.bank_account || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Ngân hàng</dt><dd>{company?.bank_name || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div className="kv-span-2"><dt>Địa chỉ</dt><dd>{company?.address || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div className="kv-span-3"><dt>Ghi chú</dt><dd>{company?.note || <span className="kv-empty">Chưa nhập</span>}</dd></div>
          </dl>
        )}
      </div>

      <div className="kv-md-block">
        <div className="kv-md-block-head">
          <h3 className="kv-section-title">Người liên hệ</h3>
          <button type="button" className="kv-btn kv-btn--sm" onClick={() => contactsRef.current?.openCreate()}>Thêm</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {!isLoading && <ContactsPanel ref={contactsRef} companyId={companyId} />}
        </div>
      </div>

      {isSupplier && (
        <div className="kv-md-block">
          <div className="kv-md-block-head">
            <h3 className="kv-section-title">Hàng hóa cung cấp</h3>
          </div>
          <div style={{ marginTop: 12 }}>
            <SupplierProductsPanel companyId={companyId} />
          </div>
        </div>
      )}
    </>
  )
}
