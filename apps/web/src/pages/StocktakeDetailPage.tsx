import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Table, InputNumber, Input } from 'antd'
import { ArrowLeft } from 'lucide-react'
import { useStocktakeDetail } from '../hooks/useStocktakeDetail'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePageHeader } from '@/layout/PageHeaderSlot'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

export default function StocktakeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hook = useStocktakeDetail(id!)
  const [cancelOpen, setCancelOpen] = useState(false)

  // usePageHeader là hook — PHẢI gọi vô điều kiện trước early return bên dưới (xem CLAUDE.md
  // mục 22). Trang này trước đây không có nút quay lại danh sách/breadcrumb nào cả — thêm
  // luôn cho đồng bộ với các trang Detail khác.
  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/stocktakes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <button
            onClick={() => navigate('/stocktakes')}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Kiểm kê
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">{hook.data?.code}</span>
        </h1>
        {hook.data?.status && <StatusBadge status={hook.data.status} />}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {hook.data?.status === 'in_progress' && (
          <Button size="sm" variant="success" onClick={hook.submitComplete} disabled={hook.completeMutation.isPending}>
            Complete
          </Button>
        )}
        {hook.data?.status === 'in_progress' && (
          <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>Cancel</Button>
        )}
      </div>
    </div>,
  )

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ kiểm kê này?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.cancelMutation.mutate(); setCancelOpen(false) }}
            >
              Huỷ kiểm kê
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p>
        Kho: <strong>{hook.data.warehouse_name}</strong> — Phạm vi: <strong>{hook.data.scope_type}</strong>
      </p>
      {hook.data.note && <p>Ghi chú: {hook.data.note}</p>}

      {hook.data.result && (
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--s-completed-bg)', border: '1px solid var(--s-completed-color)' }}>
          <p>
            Kết quả: {hook.data.result.total_sku} SKU — Khớp: {hook.data.result.matched} — Thiếu: {hook.data.result.shortage} — Dư:{' '}
            {hook.data.result.surplus}
          </p>
          <p>
            <strong>stocktake_result.id</strong> (dùng làm <code>ref_document_id</code> khi tạo Receipt/Delivery loại
            "adjustment"): <code>{hook.data.result.id}</code>
          </p>
        </div>
      )}

      <Table
        rowKey="id"
        size="small"
        dataSource={hook.data.lines}
        pagination={false}
        columns={[
          { title: 'Mã hàng', dataIndex: 'item_code' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Product type', dataIndex: 'product_type' },
          { title: 'Tồn hệ thống (qty_system)', dataIndex: 'qty_system' },
          {
            title: 'Tồn thực tế (qty_actual)',
            render: (_: any, l: any) =>
              hook.data.status === 'in_progress' ? (
                <InputNumber
                  min={0}
                  value={hook.qtyActual[l.id] ?? l.qty_actual}
                  onChange={(v) => hook.setQtyActual((prev) => ({ ...prev, [l.id]: v ?? 0 }))}
                />
              ) : (
                l.qty_actual
              ),
          },
          { title: 'Chênh lệch', dataIndex: 'difference' },
        ]}
        expandable={
          hook.data.status === 'in_progress'
            ? {
                rowExpandable: (l: any) => l.product_type === 'storable',
                expandedRowRender: (l: any) => (
                  <div>
                    <p>Serial quét được thực tế (mỗi dòng 1 serial, để trống nếu không quét):</p>
                    <Input.TextArea
                      rows={3}
                      value={hook.serialsText[l.id] ?? ''}
                      onChange={(e) => hook.setSerialsText((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      placeholder={`SN-001\nSN-002\n...`}
                    />
                  </div>
                ),
              }
            : undefined
        }
      />

      <CustomFieldsPanel objectType="stocktake" objectId={id!} />
    </div>
  )
}
