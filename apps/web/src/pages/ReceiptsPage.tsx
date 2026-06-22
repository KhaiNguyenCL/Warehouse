import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, InputNumber } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending_approval: 'gold',
  approved: 'blue',
  completed: 'green',
  cancelled: 'red',
}

export default function ReceiptsPage() {
  const [searchParams] = useSearchParams()
  const poIdFromQuery = searchParams.get('po_id') ?? undefined
  const { open, form, openCreate, close } = useEntityModal()
  const [poId, setPoId] = useState<string | undefined>(poIdFromQuery)
  const navigate = useNavigate()

  function closeAll() {
    close()
    setPoId(undefined)
  }

  useEffect(() => {
    if (poIdFromQuery) {
      setPoId(poIdFromQuery)
      openCreate()
    }
  }, [poIdFromQuery])

  const { data, isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => (await api.get('/receipts')).data,
  })

  const { data: importTypes } = useQuery({
    queryKey: ['import-types'],
    queryFn: async () => (await api.get('/settings/import-types')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  // PO Confirmed để chọn (nhận hàng theo PO) — chỉ cần khi import_type = purchase.
  const { data: confirmedPOs } = useQuery({
    queryKey: ['purchase-orders', 'confirmed'],
    queryFn: async () => (await api.get('/purchase-orders', { params: { status: 'confirmed', limit: 100 } })).data,
  })

  // Chi tiết PO đang chọn — lấy danh sách po_line + remaining_qty để tự điền dòng hàng.
  const { data: poDetail } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: async () => (await api.get(`/purchase-orders/${poId}`)).data,
    enabled: !!poId,
  })

  useEffect(() => {
    if (poDetail) {
      form.setFieldsValue({
        po_id: poDetail.id,
        company_id: poDetail.company_id,
        lines: poDetail.lines
          .filter((l: any) => l.remaining_qty > 0)
          .map((l: any) => ({
            variant_id: l.variant_id,
            variant_label: `${l.variant_sku} — ${l.variant_name}`,
            po_line_id: l.id,
            quantity: l.remaining_qty,
            cost_price: l.unit_price,
            warranty_months: l.warranty_months,
          })),
      })
    }
  }, [poDetail])

  const createMutation = useApiMutation(
    (values: any) => {
      const lines = values.lines.map((l: any) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        cost_price: l.cost_price,
        po_line_id: l.po_line_id,
        warranty_months: l.warranty_months,
      }))
      return api.post('/receipts', { ...values, lines })
    },
    { successMessage: 'Tạo Receipt thành công (Draft)', invalidateKey: ['receipts'], onSuccess: closeAll },
  )

  return (
    <div>
      <PageHeader title="Phiếu nhập kho (Receipt)" actionLabel="+ Tạo Receipt" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/receipts/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Loại nhập', dataIndex: 'import_type' },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
        ]}
      />

      <EntityFormModal
        title="Tạo phiếu nhập kho"
        open={open}
        onCancel={closeAll}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
        width={800}
        initialValues={{ import_type: 'purchase', lines: [] }}
      >
        <Form.Item name="code" label="Mã phiếu" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="import_type" label="Loại nhập" rules={[{ required: true }]}>
          <Select options={importTypes?.map((t: any) => ({ value: t.key, label: t.label }))} />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho nhập" rules={[{ required: true }]}>
          <Select options={warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>
        <Form.Item label="Nhận hàng theo Purchase Order (tuỳ chọn)">
          <Select
            allowClear
            value={poId}
            placeholder="Chọn PO đã Confirmed để tự điền dòng hàng"
            options={confirmedPOs?.data.map((p: any) => ({ value: p.id, label: `${p.code} — ${p.company_name}` }))}
            onChange={(v) => {
              setPoId(v)
              if (!v) form.setFieldsValue({ po_id: undefined, lines: [] })
            }}
          />
        </Form.Item>
        <Form.Item name="po_id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="company_id" hidden>
          <Input />
        </Form.Item>

        <Form.List name="lines">
          {(fields) => (
            <Table
              className="form-row-full"
              size="small"
              pagination={false}
              dataSource={fields.map((f) => ({ ...f, key: f.key }))}
              columns={[
                {
                  title: 'SKU',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'variant_label']} noStyle>
                      <Input disabled />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Số lượng nhận',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={1} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Giá nhập thực tế',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={0} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Bảo hành thực tế (tháng)',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'warranty_months']} noStyle>
                      <InputNumber min={0} />
                    </Form.Item>
                  ),
                },
                {
                  title: '',
                  render: (_: any, f: any) => (
                    <>
                      <Form.Item name={[f.name, 'variant_id']} hidden>
                        <Input />
                      </Form.Item>
                      <Form.Item name={[f.name, 'po_line_id']} hidden>
                        <Input />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          )}
        </Form.List>
        {!poId && (
          <p className="form-row-full" style={{ color: '#999', marginTop: 8 }}>
            Chưa hỗ trợ thêm dòng tự do trong UI test này — chọn 1 PO Confirmed ở trên để tự điền dòng hàng.
          </p>
        )}
      </EntityFormModal>
    </div>
  )
}
