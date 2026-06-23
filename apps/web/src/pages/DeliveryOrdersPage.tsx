import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, Button } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import DeliveryLineItem from '../components/DeliveryLineItem'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending_approval: 'gold',
  approved: 'blue',
  completed: 'green',
  cancelled: 'red',
}

export default function DeliveryOrdersPage() {
  const [searchParams] = useSearchParams()
  const quotationIdFromQuery = searchParams.get('quotation_id') ?? undefined
  const { open, form, openCreate, close } = useEntityModal()
  const [quotationId, setQuotationId] = useState<string | undefined>(quotationIdFromQuery)
  const navigate = useNavigate()

  function closeAll() {
    close()
    setQuotationId(undefined)
  }

  useEffect(() => {
    if (quotationIdFromQuery) {
      setQuotationId(quotationIdFromQuery)
      openCreate()
      // openCreate() gọi resetFields() bên trong — phải set sau, không phải trước.
      form.setFieldValue('export_type', 'sale')
    }
  }, [quotationIdFromQuery])

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => (await api.get('/deliveries')).data,
  })

  const { data: exportTypes } = useQuery({
    queryKey: ['export-types'],
    queryFn: async () => (await api.get('/settings/export-types')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const exportType: string | undefined = Form.useWatch('export_type', form)
  const activeExportType = exportTypes?.find((t: any) => t.key === exportType)
  const requiresCompanyType = activeExportType?.requires_company // 'customer' | 'supplier' | 'none'
  const requiresQuotation = !!activeExportType?.requires_quotation
  const isAdjustment = exportType === 'adjustment'

  const { data: companies } = useQuery({
    queryKey: ['companies', requiresCompanyType],
    queryFn: async () => (await api.get('/companies', { params: { type: requiresCompanyType, limit: 100 } })).data,
    enabled: requiresCompanyType === 'customer' || requiresCompanyType === 'supplier',
  })

  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  // Quotation Confirmed để chọn (xuất theo báo giá) — chỉ cần khi export_type yêu cầu (sale).
  const { data: confirmedQuotations } = useQuery({
    queryKey: ['quotations', 'confirmed'],
    queryFn: async () => (await api.get('/quotations', { params: { status: 'confirmed', limit: 100 } })).data,
    enabled: requiresQuotation,
  })

  const { data: quotationDetail } = useQuery({
    queryKey: ['quotations', quotationId],
    queryFn: async () => (await api.get(`/quotations/${quotationId}`)).data,
    enabled: !!quotationId,
  })

  useEffect(() => {
    if (quotationDetail) {
      const lines = quotationDetail.sections
        .flatMap((s: any) => s.line_items)
        .filter((l: any) => l.variant_id && l.remaining_qty > 0)
        .map((l: any) => ({
          variant_id: l.variant_id,
          variant_label: `${l.variant_sku} — ${l.variant_name}`,
          quotation_line_item_id: l.id,
          quantity: l.remaining_qty,
        }))
      form.setFieldsValue({
        quotation_id: quotationDetail.id,
        company_id: quotationDetail.company_id,
        warehouse_id: quotationDetail.warehouse_id,
        lines,
      })
    }
  }, [quotationDetail])

  const createMutation = useApiMutation(
    (values: any) => {
      const lines = values.lines.map((l: any) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        quotation_line_item_id: l.quotation_line_item_id,
        note: l.note,
      }))
      const body: any = { ...values, lines }
      if (isAdjustment) {
        body.ref_document_type = 'stocktake_result'
        body.ref_document_id = values.ref_document_id
      }
      return api.post('/deliveries', body)
    },
    { successMessage: 'Tạo Delivery Order thành công (Draft)', invalidateKey: ['deliveries'], onSuccess: closeAll },
  )

  return (
    <div>
      <PageHeader title="Phiếu xuất kho (Delivery Order)" actionLabel="+ Tạo Delivery Order" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/deliveries/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Loại xuất', dataIndex: 'export_type' },
          { title: 'Khách hàng/NCC', dataIndex: 'company_name' },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
        ]}
      />

      <EntityFormModal
        title="Tạo phiếu xuất kho"
        open={open}
        onCancel={closeAll}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
        width={1000}
        initialValues={{ lines: [{}] }}
      >
        <Form.Item name="code" label="Mã phiếu" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="export_type" label="Loại xuất" rules={[{ required: true }]}>
          <Select
            options={exportTypes?.filter((t: any) => t.is_active).map((t: any) => ({ value: t.key, label: t.label }))}
            onChange={() => {
              form.setFieldValue('company_id', undefined)
              setQuotationId(undefined)
              form.setFieldsValue({ quotation_id: undefined, lines: [{}] })
            }}
          />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho xuất" rules={[{ required: true }]}>
          <Select options={warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>

        {requiresCompanyType && requiresCompanyType !== 'none' && (
          <Form.Item
            name="company_id"
            label={requiresCompanyType === 'customer' ? 'Khách hàng' : 'NCC'}
            rules={[{ required: true }]}
          >
            <Select
              options={companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
              onChange={() => form.setFieldValue('contact_id', undefined)}
            />
          </Form.Item>
        )}
        {requiresCompanyType && requiresCompanyType !== 'none' && (
          <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)">
            <Select
              allowClear
              disabled={!companyId}
              placeholder={companyId ? undefined : 'Chọn đối tác trước'}
              options={companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
            />
          </Form.Item>
        )}

        {requiresQuotation && (
          <Form.Item label="Xuất theo Quotation (bắt buộc)" required>
            <Select
              value={quotationId}
              placeholder="Chọn báo giá đã Confirmed"
              options={confirmedQuotations?.data.map((q: any) => ({ value: q.id, label: `${q.code} — ${q.company_name}` }))}
              onChange={(v) => {
                setQuotationId(v)
                if (!v) form.setFieldsValue({ quotation_id: undefined, lines: [{}] })
              }}
            />
          </Form.Item>
        )}
        <Form.Item name="quotation_id" hidden>
          <Input />
        </Form.Item>

        {isAdjustment && (
          <Form.Item
            name="ref_document_id"
            label="Stocktake Result ID"
            rules={[{ required: true }]}
            extra="Chưa có trang Stocktake — dán UUID của stocktake_results tương ứng"
          >
            <Input />
          </Form.Item>
        )}

        <Form.Item name="reason" label="Lý do">
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>

        {requiresQuotation ? (
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
                    title: 'Số lượng xuất',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                        <Input type="number" />
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
                        <Form.Item name={[f.name, 'quotation_line_item_id']} hidden>
                          <Input />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
            )}
          </Form.List>
        ) : (
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <div className="form-row-full">
                {fields.map(({ key, name }) => (
                  <DeliveryLineItem key={key} name={name} remove={() => remove(name)} />
                ))}
                <Button onClick={() => add()}>+ Thêm dòng</Button>
              </div>
            )}
          </Form.List>
        )}
      </EntityFormModal>
    </div>
  )
}
