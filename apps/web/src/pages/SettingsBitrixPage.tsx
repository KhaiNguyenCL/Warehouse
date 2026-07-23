import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, Button, Typography, Space, Input, Table, Tag, Alert } from 'antd'
import { MinusCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { PageHeader } from '../components/ui/PageHeader'

const QUOTATION_FIELD_OPTIONS = [
  { value: 'company_id',        label: 'Khách hàng (company_id)' },
  { value: 'contact_id',        label: 'Người liên hệ (contact_id)' },
  { value: 'project_name',      label: 'Tên dự án (project_name)' },
  { value: 'delivery_location', label: 'Địa điểm giao hàng (delivery_location)' },
  { value: 'terms',             label: 'Điều khoản (terms)' },
]

const BITRIX_OBJECT_OPTIONS = [
  { value: 'deal',    label: 'Deal' },
  { value: 'company', label: 'Company' },
  { value: 'contact', label: 'Contact' },
]

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

// Chuyển raw deal object thành list rows để hiển thị + làm options cho Select
function dealToRows(obj: Record<string, unknown>, prefix = ''): { key: string; value: string; label: string }[] {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== '' && !Array.isArray(v) && typeof v !== 'object')
    .map(([k, v]) => ({ key: prefix ? `${prefix}.${k}` : k, value: String(v), label: '' }))
}

export default function SettingsBitrixPage() {
  const [form] = Form.useForm()

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

  useEffect(() => {
    if (mappings) form.setFieldsValue({ mappings })
  }, [mappings])

  const saveMutation = useApiMutation(
    (rows: any[]) => api.put('/bitrix/mappings', { mappings: rows }),
    { successMessage: 'Lưu mapping thành công', invalidateKey: ['bitrix', 'mappings'] },
  )

  if (isLoading) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Đồng bộ Bitrix" />

      {/* ── Preview Deal Fields ── */}
      <SectionCard title="Xem fields của Deal Bitrix">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Nhập bất kỳ Deal ID nào để xem danh sách field + giá trị thật — dùng làm tham chiếu khi cấu hình mapping bên dưới.
        </Typography.Text>
        <Space style={{ marginBottom: 12 }}>
          <Input
            placeholder="Nhập Bitrix Deal ID"
            style={{ width: 220 }}
            value={previewDealId}
            onChange={(e) => setPreviewDealId(e.target.value)}
            onPressEnter={() => setFetchDealId(previewDealId)}
          />
          <Button
            icon={<SearchOutlined />}
            loading={dealLoading}
            onClick={() => setFetchDealId(previewDealId)}
            disabled={!previewDealId}
          >
            Fetch fields
          </Button>
        </Space>

        {dealError && (
          <Alert type="error" message={(dealError as any)?.response?.data?.message ?? 'Không fetch được Deal'} style={{ marginBottom: 12 }} />
        )}

        {dealRows.length > 0 && (
          <Table
            rowKey="key"
            dataSource={dealRows}
            pagination={false}
            size="small"
            scroll={{ y: 320 }}
            columns={[
              {
                title: 'Label',
                dataIndex: 'label',
                width: 220,
                render: (l: string) => <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{l || <span style={{ color: 'var(--text-3)' }}>—</span>}</span>,
              },
              {
                title: 'Field Key',
                dataIndex: 'key',
                width: 240,
                render: (k: string) => <Tag style={{ fontFamily: 'monospace', fontSize: 12 }}>{k}</Tag>,
              },
              {
                title: 'Giá trị',
                dataIndex: 'value',
                render: (v: string) => (
                  <span style={{ fontSize: 13, color: 'var(--text-1)', wordBreak: 'break-all' }}>
                    {v.length > 120 ? v.slice(0, 120) + '…' : v}
                  </span>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      {/* ── Field Mapping ── */}
      <SectionCard title="Cấu hình mapping">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Chọn field báo giá sẽ được tự động điền khi sync từ Bitrix Deal.
          {dealFieldOptions.length > 0
            ? ' Dropdown Bitrix Field đã được điền từ Deal vừa fetch.'
            : ' Fetch 1 Deal mẫu ở trên để chọn từ dropdown, hoặc nhập tay tên field.'}
          {' '}Lưu ý: <b>Khách hàng</b> và <b>Người liên hệ</b> được resolve tự động từ
          COMPANY_ID / CONTACT_ID của Deal — chỉ cần chọn đúng field đó là đủ.
          Field dạng list/enum (UF_CRM_*) sẽ tự tra ID → label khi sync.
        </Typography.Text>

        <Form form={form} onFinish={(v) => saveMutation.mutate(v.mappings ?? [])}>
          <Form.List name="mappings">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}>
                    <Form.Item
                      {...restField}
                      name={[name, 'quotation_field']}
                      rules={[{ required: true, message: 'Bắt buộc' }]}
                    >
                      <Select
                        placeholder="Field báo giá"
                        style={{ width: 280 }}
                        options={QUOTATION_FIELD_OPTIONS}
                      />
                    </Form.Item>

                    <span style={{ color: 'var(--text-2)', padding: '0 4px' }}>←</span>

                    <Form.Item
                      {...restField}
                      name={[name, 'bitrix_object']}
                      rules={[{ required: true, message: 'Bắt buộc' }]}
                      initialValue="deal"
                    >
                      <Select style={{ width: 110 }} options={BITRIX_OBJECT_OPTIONS} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'bitrix_field']}
                      rules={[{ required: true, message: 'Bắt buộc' }]}
                    >
                      {dealFieldOptions.length > 0 ? (
                        <Select
                          showSearch
                          placeholder="Chọn Bitrix field"
                          style={{ width: 340 }}
                          options={dealFieldOptions}
                          optionFilterProp="label"
                          allowClear
                        />
                      ) : (
                        <Input
                          placeholder="VD: TITLE, UF_CRM_..."
                          style={{ width: 260 }}
                        />
                      )}
                    </Form.Item>

                    <MinusCircleOutlined
                      style={{ color: 'var(--text-3)', cursor: 'pointer' }}
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({ bitrix_object: 'deal' })}
                  style={{ marginBottom: 16 }}
                >
                  Thêm mapping
                </Button>
              </>
            )}
          </Form.List>

          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            Lưu mapping
          </Button>
        </Form>
      </SectionCard>
    </div>
  )
}
