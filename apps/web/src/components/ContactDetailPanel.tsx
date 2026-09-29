import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

// Panel chi tiết người liên hệ — nửa phải của layout master-detail (roster trái + panel
// phải), thay cho ContactSheet cũ (đã xoá). Nhận thẳng object contact từ danh sách bên
// trái thay vì tự fetch, vì roster đã có đủ dữ liệu — tránh round-trip network thừa.
interface Props { contact: any | null }

export default function ContactDetailPanel({ contact }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', position: '', phone: '', email: '', is_primary: false })

  // Đổi contact (chọn dòng khác) → thoát chế độ sửa, nạp lại form theo contact mới.
  useEffect(() => {
    setEditing(false)
    if (contact) {
      setForm({
        full_name:  contact.full_name  ?? '',
        position:   contact.position   ?? '',
        phone:      contact.phone      ?? '',
        email:      contact.email      ?? '',
        is_primary: contact.is_primary ?? false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id])

  const updateMutation = useApiMutation(
    (values: typeof form) => api.patch(`/companies/${contact?.company_id}/contacts/${contact?.id}`, values),
    { successMessage: 'Đã cập nhật người liên hệ', invalidateKey: ['contacts'], onSuccess: () => setEditing(false) },
  )

  if (!contact) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 người liên hệ bên trái để xem chi tiết.</p>
      </div>
    )
  }

  return (
    <>
      {/* Header — port .kv-md-head (WarehousesPage/CompanyDetailPanel) */}
      <div className="kv-md-head">
        <div>
          <h2 className="kv-md-title">
            {contact.full_name}
            {contact.is_primary && <span className="kv-tag kv-tag--default">Chính</span>}
          </h2>
          {contact.position && <div className="kv-cell-sub">{contact.position}</div>}
        </div>
        <div className="kv-actions">
          {!editing ? (
            <button type="button" className="kv-btn" onClick={() => setEditing(true)}>Sửa</button>
          ) : (
            <>
              <button type="button" className="kv-btn" onClick={() => setEditing(false)}>Huỷ</button>
              <button
                type="button"
                className="kv-btn kv-btn--primary"
                disabled={updateMutation.isPending || !form.full_name.trim()}
                onClick={() => updateMutation.mutate(form)}
              >
                Lưu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Company badge */}
      {contact.company_name && (
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 6,
        }}>
          <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
          <div style={{ minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }} title={contact.company_name}>{contact.company_name}</div>
            {contact.company_code && <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{contact.company_code}</div>}
          </div>
        </div>
      )}

      <div className="kv-md-block">
        <div className="kv-md-block-head">
          <h3 className="kv-section-title">Thông tin</h3>
        </div>
        {!editing ? (
          <dl className="kv-dl">
            <div><dt>Chức vụ</dt><dd>{contact.position || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{contact.phone || <span className="kv-empty">Chưa nhập</span>}</dd></div>
            <div><dt>Email</dt><dd>{contact.email || <span className="kv-empty">Chưa nhập</span>}</dd></div>
          </dl>
        ) : (
          <div className="flex flex-col gap-3" style={{ marginTop: 12 }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Họ tên <span className="text-red-500">*</span></Label>
                <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Chức vụ</Label>
                <Input placeholder="Giám đốc" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>SĐT</Label>
                <Input placeholder="0901234567" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label className="cursor-pointer text-sm font-normal">Đặt làm liên hệ chính</Label>
              <Switch checked={form.is_primary} onCheckedChange={(v) => setForm((f) => ({ ...f, is_primary: v }))} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
