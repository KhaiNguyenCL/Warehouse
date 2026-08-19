import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Table, Form, Input, Select, Button, Popconfirm, Tag, Modal, message, Space, Switch, Tooltip
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { ImeInput } from '../components/ImeInput'

interface AttrDef {
  id: string
  name: string
  unit: string | null
  options: string[]
  applies_to: 'all' | 'product'
  is_active: boolean
  products: Array<{ product_id: string; product_name: string }>
}

export default function SettingsVariantAttributesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AttrDef | null>(null)
  const [form] = Form.useForm()
  const [optionInput, setOptionInput] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [appliesTo, setAppliesTo] = useState<'all' | 'product'>('all')

  const { data, isLoading } = useQuery<AttrDef[]>({
    queryKey: ['variant-attribute-defs'],
    queryFn: async () => (await api.get('/settings/variant-attribute-defs')).data,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'all-for-attr-settings'],
    queryFn: async () => (await api.get('/products', { params: { limit: 100 } })).data,
    staleTime: 60_000,
  })

  function openCreate() {
    setEditing(null)
    setOptions([])
    setAppliesTo('all')
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(record: AttrDef) {
    setEditing(record)
    setOptions(record.options)
    setAppliesTo(record.applies_to)
    form.setFieldsValue({
      name: record.name,
      unit: record.unit,
      applies_to: record.applies_to,
      product_ids: record.products.map((p) => p.product_id),
      is_active: record.is_active,
    })
    setModalOpen(true)
  }

  function addOption() {
    const val = optionInput.trim()
    if (!val || options.includes(val)) return
    setOptions([...options, val])
    setOptionInput('')
  }

  async function handleSave() {
    try {
      const values = await form.validateFields()
      const body = { ...values, options }
      if (editing) {
        await api.patch(`/settings/variant-attribute-defs/${editing.id}`, body)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/settings/variant-attribute-defs', body)
        message.success('Tạo thuộc tính thành công')
      }
      qc.invalidateQueries({ queryKey: ['variant-attribute-defs'] })
      setModalOpen(false)
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.message ?? 'Lỗi')
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/settings/variant-attribute-defs/${id}`)
      message.success('Đã xoá')
      qc.invalidateQueries({ queryKey: ['variant-attribute-defs'] })
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Không thể xoá')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Thuộc tính SKU"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm thuộc tính
          </Button>
        }
      />

      <TableCard>
        <Table
          rowKey="id"
          dataSource={data}
          loading={isLoading}
          pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true }}
          size="small"
          tableLayout="fixed"
          columns={[
            { title: 'Tên thuộc tính', dataIndex: 'name' },
            {
              title: 'Đơn vị',
              dataIndex: 'unit',
              width: 80,
              render: (v: string | null) => v ?? <span style={{ color: '#aaa' }}>—</span>,
            },
            {
              title: 'Các giá trị',
              dataIndex: 'options',
              render: (opts: string[]) =>
                opts.length ? opts.map((o) => <Tag key={o}>{o}</Tag>) : <span style={{ color: '#aaa' }}>Chưa có</span>,
            },
            {
              title: 'Áp dụng',
              dataIndex: 'applies_to',
              width: 120,
              render: (v: string, r: AttrDef) =>
                v === 'all' ? (
                  <Tag color="blue">Tất cả</Tag>
                ) : (
                  <span>{r.products.map((p) => p.product_name).join(', ') || <Tag>Chưa chọn SP</Tag>}</span>
                ),
            },
            {
              title: 'Hoạt động',
              dataIndex: 'is_active',
              width: 100,
              render: (v: boolean) => (v ? <Tag color="green">Có</Tag> : <Tag>Tắt</Tag>),
            },
            {
              title: '',
              width: 60,
              render: (_: any, r: AttrDef) => (
                <div className="row-actions">
                  <Tooltip title="Sửa">
                    <Button type="text" size="small" icon={<EditOutlined />}
                      style={{ color: 'var(--text-3)' }}
                      onClick={(e) => { e.stopPropagation(); openEdit(r) }} />
                  </Tooltip>
                  <Tooltip title="Xoá">
                    <Popconfirm title="Xoá thuộc tính này?" okText="Xoá" okButtonProps={{ danger: true }} cancelText="Huỷ"
                      onConfirm={() => handleDelete(r.id)}>
                      <Button type="text" size="small" icon={<DeleteOutlined />}
                        style={{ color: 'var(--text-3)' }} danger
                        onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </Tooltip>
                </div>
              ),
            },
          ]}
        />
      </TableCard>

      <Modal
        open={modalOpen}
        title={editing ? 'Sửa thuộc tính' : 'Thêm thuộc tính SKU'}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={560}
        okText={editing ? 'Lưu' : 'Tạo'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên thuộc tính" rules={[{ required: true }]} validateTrigger="onBlur">
            <ImeInput placeholder="Ví dụ: Số port, RAM, Dung lượng" />
          </Form.Item>

          <Form.Item name="unit" label="Ký hiệu đơn vị (gắn vào tên SKU)">
            <Input placeholder="Ví dụ: P, G, TB — để trống nếu không cần" style={{ width: 200 }} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>
              Các giá trị <span style={{ fontWeight: 400, color: '#888' }}>(nhấn Enter hoặc +)</span>
            </div>
            <Space wrap>
              {options.map((o) => (
                <Tag key={o} closable onClose={() => setOptions(options.filter((x) => x !== o))}>
                  {o}
                </Tag>
              ))}
            </Space>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Input
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onPressEnter={addOption}
                placeholder="Nhập giá trị rồi Enter"
                style={{ width: 200 }}
              />
              <Button onClick={addOption} icon={<PlusOutlined />}>Thêm</Button>
            </div>
          </div>

          <Form.Item name="applies_to" label="Áp dụng cho" initialValue="all">
            <Select
              options={[
                { value: 'all', label: 'Tất cả sản phẩm' },
                { value: 'product', label: 'Chỉ một số sản phẩm' },
              ]}
              onChange={(v) => setAppliesTo(v)}
            />
          </Form.Item>

          {appliesTo === 'product' && (
            <Form.Item name="product_ids" label="Chọn sản phẩm áp dụng">
              <Select
                mode="multiple"
                placeholder="Chọn sản phẩm"
                loading={productsLoading}
                options={(products?.data ?? []).map((p: any) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          {editing && (
            <Form.Item name="is_active" label="Hoạt động" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
