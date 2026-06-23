import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Typography, Space, Popconfirm, Select, Tag, message } from 'antd'
import { useState } from 'react'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { StatusTag } from '../components/StatusTag'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', expired: 'gold', cancelled: 'red' }

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [templateId, setTemplateId] = useState<string | undefined>()
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', id],
    queryFn: async () => (await api.get(`/quotations/${id}`)).data,
  })

  const { data: templates } = useQuery({
    queryKey: ['templates', 'quotation'],
    queryFn: async () => (await api.get('/templates', { params: { object_type: 'quotation', limit: 50 } })).data,
  })

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['quotations', id], ['quotations']] }
  const confirmMutation = useApiMutation(() => api.patch(`/quotations/${id}/confirm`), actionOptions)
  const unconfirmMutation = useApiMutation(() => api.patch(`/quotations/${id}/unconfirm`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/quotations/${id}/cancel`), actionOptions)
  const expireMutation = useApiMutation(() => api.patch(`/quotations/${id}/expire`), actionOptions)

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (!templateId) {
      message.error('Chọn 1 template trước')
      return
    }
    setExporting(true)
    try {
      const res = await api.post(
        `/templates/${templateId}/export`,
        { object_id: id, format },
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${data?.code ?? 'quotation'}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Xuất file thất bại')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading || !data) return null

  return (
    <div>
      <Typography.Title level={3}>
        Báo giá {data.code} <StatusTag status={data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Khách hàng: <strong>{data.company_name}</strong>
        {data.contact_name && <> — Người liên hệ: <strong>{data.contact_name}</strong></>}
        {data.project_name && <> — Dự án: <strong>{data.project_name}</strong></>}
      </p>
      {data.delivery_location && <p>Địa điểm giao hàng: {data.delivery_location}</p>}
      {data.warehouse_name && <p>Kho xuất: {data.warehouse_name}</p>}
      {data.expired_at && <p>Hết hạn: {new Date(data.expired_at).toLocaleDateString('vi-VN')}</p>}
      {data.terms && <p>Điều khoản: {data.terms}</p>}

      <Space style={{ marginBottom: 16 }}>
        {data.status === 'draft' && (
          <Button type="primary" onClick={() => confirmMutation.mutate()}>
            Confirm
          </Button>
        )}
        {data.status === 'confirmed' && (
          <>
            <Button onClick={() => unconfirmMutation.mutate()}>Unconfirm (về Draft)</Button>
            <Popconfirm title="Đánh dấu hết hạn báo giá này?" onConfirm={() => expireMutation.mutate()}>
              <Button>Đánh dấu hết hạn</Button>
            </Popconfirm>
          </>
        )}
        {!['cancelled', 'expired'].includes(data.status) && (
          <Popconfirm title="Huỷ báo giá này?" onConfirm={() => cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
        {data.status === 'confirmed' && (
          <Button onClick={() => navigate(`/deliveries?quotation_id=${data.id}`)}>Tạo Delivery Order từ báo giá này</Button>
        )}
      </Space>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Chọn template để xuất"
          style={{ width: 260 }}
          options={templates?.data.map((t: any) => ({ value: t.id, label: t.name }))}
          onChange={setTemplateId}
          notFoundContent="Chưa có template — tạo ở Settings > Template"
        />
        <Button loading={exporting} disabled={!templateId} onClick={() => handleExport('xlsx')}>
          Xuất Excel
        </Button>
        <Button loading={exporting} disabled={!templateId} onClick={() => handleExport('pdf')}>
          Xuất PDF
        </Button>
      </Space>

      {data.sections.map((section: any) => (
        <div key={section.id} style={{ marginBottom: 24 }}>
          <Typography.Title level={5}>{section.name}</Typography.Title>
          <Table
            rowKey="id"
            dataSource={section.line_items}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Sản phẩm',
                render: (_: any, l: any) => l.bundle_name ?? l.variant_name ?? l.description ?? '—',
              },
              { title: 'SKU', render: (_: any, l: any) => l.bundle_sku ?? l.variant_sku ?? '—' },
              { title: 'SL', dataIndex: 'quantity' },
              { title: 'Đơn giá', dataIndex: 'unit_price' },
              { title: 'VAT (%)', dataIndex: 'vat_percent' },
              { title: 'Thành tiền', dataIndex: 'line_total' },
              { title: 'Tiền VAT', dataIndex: 'vat_amount' },
              { title: 'Bảo hành', dataIndex: 'warranty' },
              {
                title: 'Giữ chỗ',
                dataIndex: 'is_reserved',
                render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
              },
              { title: 'Đã xuất', dataIndex: 'exported_qty' },
              { title: 'Đang chờ', dataIndex: 'pending_qty' },
              { title: 'Còn lại', dataIndex: 'remaining_qty' },
              { title: 'Ghi chú', dataIndex: 'note' },
            ]}
          />
          <p style={{ textAlign: 'right', marginTop: 4 }}>
            Tổng section: <strong>{section.subtotal}</strong>
          </p>
        </div>
      ))}

      <div style={{ textAlign: 'right' }}>
        <p>Tạm tính: {data.subtotal}</p>
        <p>Tiền VAT: {data.vat_total}</p>
        <p>Giảm giá: {data.discount}</p>
        <Typography.Title level={4}>Tổng cộng: {data.grand_total}</Typography.Title>
      </div>
    </div>
  )
}
