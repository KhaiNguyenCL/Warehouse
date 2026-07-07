import { useParams } from 'react-router-dom'
import { Table, Button, Typography, Space, Popconfirm, Select, Tag, Input, Form, InputNumber } from 'antd'
import { useQuotationDetail } from '../hooks/useQuotationDetail'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', expired: 'gold', cancelled: 'red' }

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useQuotationDetail(id!)

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <Typography.Title level={3}>
        Báo giá {hook.data.code} <StatusTag status={hook.data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Khách hàng: <strong>{hook.data.company_name}</strong>
        {hook.data.contact_name && <> — Người liên hệ: <strong>{hook.data.contact_name}</strong></>}
        {hook.data.project_name && <> — Dự án: <strong>{hook.data.project_name}</strong></>}
      </p>
      {hook.data.delivery_location && <p>Địa điểm giao hàng: {hook.data.delivery_location}</p>}
      {hook.data.warehouse_name && <p>Kho xuất: {hook.data.warehouse_name}</p>}
      {hook.data.expired_at && <p>Hết hạn: {new Date(hook.data.expired_at).toLocaleDateString('vi-VN')}</p>}
      {hook.data.terms && <p>Điều khoản: {hook.data.terms}</p>}

      <Space style={{ marginBottom: 16 }}>
        {hook.data.status === 'draft' && (
          <Button onClick={() => hook.editModal.openEdit(hook.data, { note: hook.data.note, valid_days: hook.data.valid_days, discount: hook.data.discount })}>
            Sửa
          </Button>
        )}
        {hook.data.status === 'draft' && (
          <Button type="primary" onClick={() => hook.confirmMutation.mutate()}>
            Confirm
          </Button>
        )}
        {hook.data.status === 'confirmed' && (
          <>
            <Button onClick={() => hook.unconfirmMutation.mutate()}>Unconfirm (về Draft)</Button>
            <Popconfirm title="Đánh dấu hết hạn báo giá này?" onConfirm={() => hook.expireMutation.mutate()}>
              <Button>Đánh dấu hết hạn</Button>
            </Popconfirm>
          </>
        )}
        {!['cancelled', 'expired'].includes(hook.data.status) && (
          <Popconfirm title="Huỷ báo giá này?" onConfirm={() => hook.cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
        {hook.data.status === 'confirmed' && (
          <Button onClick={() => hook.navigate(`/deliveries?quotation_id=${hook.data.id}`)}>Tạo Delivery Order từ báo giá này</Button>
        )}
      </Space>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Chọn template để xuất"
          style={{ width: 260 }}
          options={hook.templates?.data.map((t: any) => ({ value: t.id, label: t.name }))}
          onChange={hook.setTemplateId}
          notFoundContent="Chưa có template — tạo ở Settings > Template"
        />
        <Button loading={hook.exporting} disabled={!hook.templateId} onClick={() => hook.handleExport('xlsx')}>
          Xuất Excel
        </Button>
        <Button loading={hook.exporting} disabled={!hook.templateId} onClick={() => hook.handleExport('pdf')}>
          Xuất PDF
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }}>
        {hook.data.bitrix_deal_id ? (
          <Typography.Text>
            Đã đồng bộ Bitrix Deal{' '}
            {hook.data.bitrix_deal_url ? (
              <a href={hook.data.bitrix_deal_url} target="_blank" rel="noreferrer">#{hook.data.bitrix_deal_id}</a>
            ) : (
              <>#{hook.data.bitrix_deal_id}</>
            )}
            {hook.data.bitrix_synced_at && <> — lúc {new Date(hook.data.bitrix_synced_at).toLocaleString('vi-VN')}</>}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">Chưa đồng bộ Bitrix</Typography.Text>
        )}
        {hook.data.status === 'draft' && (
          <>
            <Input
              placeholder={hook.data.bitrix_deal_id ? 'Để trống = sync lại deal cũ' : 'Nhập Bitrix Deal ID'}
              style={{ width: 220 }}
              value={hook.dealId}
              onChange={(e) => hook.setDealId(e.target.value)}
            />
            <Button
              loading={hook.syncMutation.isPending}
              disabled={!hook.dealId && !hook.data.bitrix_deal_id}
              onClick={() => hook.syncMutation.mutate()}
            >
              {hook.data.bitrix_deal_id ? 'Sync lại' : 'Đồng bộ'}
            </Button>
          </>
        )}
      </Space>

      {hook.data.sections.map((section: any) => (
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
        <p>Tạm tính: {hook.data.subtotal}</p>
        <p>Tiền VAT: {hook.data.vat_total}</p>
        <p>Giảm giá: {hook.data.discount}</p>
        <Typography.Title level={4}>Tổng cộng: {hook.data.grand_total}</Typography.Title>
      </div>

      <EntityFormModal
        title="Sửa Báo giá"
        open={hook.editModal.open}
        onCancel={hook.editModal.close}
        onFinish={(v) => hook.updateMutation.mutate(v)}
        confirmLoading={hook.updateMutation.isPending}
        form={hook.editModal.form}
      >
        <Form.Item name="valid_days" label="Hiệu lực (ngày)">
          <InputNumber style={{ width: '100%' }} min={1} />
        </Form.Item>
        <Form.Item name="discount" label="Giảm giá">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={3} />
        </Form.Item>
      </EntityFormModal>

      <CustomFieldsPanel objectType="quotation" objectId={id!} />
    </div>
  )
}
