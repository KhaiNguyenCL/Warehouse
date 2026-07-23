import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Form, Input, Select, Switch, Button,
  Tag, Skeleton, Table, TreeSelect,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useProductDetail } from '../hooks/useProductDetail'
import { PageHeader } from '../components/ui/PageHeader'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const PRODUCT_TYPES = [
  { value: 'storable', label: 'Lưu kho (có serial)' },
  { value: 'consumable', label: 'Vật tư tiêu hao' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'bundle', label: 'Gói sản phẩm' },
]

function buildCategoryTree(flat: any[]): any[] {
  const map: Record<string, any> = {}
  flat.forEach((c) => (map[c.id] = { value: c.id, title: c.name }))
  const roots: any[] = []
  flat.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children = [...(map[c.parent_id].children ?? []), map[c.id]]
    } else {
      roots.push(map[c.id])
    }
  })
  return roots
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-2)',
  fontWeight: 600,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
}

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-1)',
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{children}</div>
    </div>
  )
}

function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const hook = useProductDetail(id!)
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (hook.attrDefs !== undefined && hook.data) {
      hook.buildAttrValuesForModal(hook.data?.attribute_values ?? [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.data?.id, hook.attrDefs])

  useEffect(() => {
    if (hook.data && searchParams.get('edit') === '1') {
      startEdit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.data?.id])

  function startEdit() {
    if (!hook.data) return
    const p = hook.data
    form.setFieldsValue({
      category_id:  p.category_id,
      brand_id:     p.brand_id,
      model_number: p.model_number,
      code:         p.code,
      name:         p.name,
      name_en:      p.name_en,
      product_type: p.product_type,
      description:  p.description,
      is_active:    p.is_active ?? true,
    })
    setIsEditing(true)
  }

  async function saveEdit() {
    const values = await form.validateFields()
    hook.updateProduct.mutate(values, { onSuccess: () => setIsEditing(false) })
  }

  if (hook.isLoading) return <Skeleton active style={{ padding: '20px' }} />
  if (!hook.data) return <div style={{ padding: 20 }}>Không tìm thấy sản phẩm</div>

  const p = hook.data
  const categoryTree = buildCategoryTree(hook.categories ?? [])

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')} style={{ padding: '0 4px' }} />
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Sản phẩm</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14 }}>{p.name}</span>
          </span>
        }
        actions={
          isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)}>Huỷ</Button>
              <Button type="primary" loading={hook.updateProduct.isPending} onClick={saveEdit}>Lưu</Button>
            </>
          ) : (
            <Button icon={<EditOutlined />} onClick={startEdit}>Sửa</Button>
          )
        }
      />

      {/* ── Thông tin sản phẩm ── */}
      <SectionCard title="Thông tin sản phẩm">
        <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>

            <Field label="Category">
              {isEditing
                ? <Form.Item name="category_id" noStyle rules={[{ required: true }]}>
                    <TreeSelect
                      treeData={categoryTree}
                      showSearch
                      treeNodeFilterProp="title"
                      treeDefaultExpandAll
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Form.Item>
                : <Val v={p.category_name} />
              }
            </Field>

            <Field label="Hãng">
              {isEditing
                ? <Form.Item name="brand_id" noStyle>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={hook.brands?.map((b: any) => ({ value: b.id, label: b.name }))}
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                : <Val v={p.brand_name} />
              }
            </Field>

            <Field label="Loại">
              {isEditing
                ? <Form.Item name="product_type" noStyle rules={[{ required: true }]}>
                    <Select options={PRODUCT_TYPES} style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={p.product_type} />
              }
            </Field>

            <Field label="Mã dòng sản phẩm">
              {isEditing
                ? <Form.Item name="model_number" noStyle>
                    <Input placeholder="VD: SG110" style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={p.model_number} />
              }
            </Field>

            <Field label="Mã sản phẩm">
              {isEditing
                ? <Form.Item name="code" noStyle rules={[{ required: true }]}>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                : <span style={{ fontFamily: 'monospace', fontSize: 13 }}><Val v={p.code} /></span>
              }
            </Field>

            <Field label="Trạng thái">
              {isEditing
                ? <Form.Item name="is_active" noStyle valuePropName="checked">
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                  </Form.Item>
                : <Tag color={p.is_active !== false ? 'green' : 'default'}>{p.is_active !== false ? 'Active' : 'Inactive'}</Tag>
              }
            </Field>

            <Field label="Tên">
              {isEditing
                ? <Form.Item name="name" noStyle rules={[{ required: true }]}>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={p.name} />
              }
            </Field>

            <Field label="Tên (English)">
              {isEditing
                ? <Form.Item name="name_en" noStyle>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={p.name_en} />
              }
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Mô tả">
                {isEditing
                  ? <Form.Item name="description" noStyle>
                      <Input.TextArea rows={2} style={{ width: '100%' }} />
                    </Form.Item>
                  : <Val v={p.description} />
                }
              </Field>
            </div>


          </div>
        </Form>
        <CustomFieldsPanel objectType="product" objectId={id!} inline />
      </SectionCard>

      {/* ── Danh sách SKU ── */}
      <SectionCard
        title="Variants (SKU)"
        extra={
          p.product_type !== 'service' ? (
            <Button size="small" icon={<PlusOutlined />} onClick={() => navigate(`/products/${id}/variants/new`)}>
              Thêm SKU
            </Button>
          ) : undefined
        }
      >
        <Table
          rowKey="id"
          dataSource={p.variants}
          pagination={false}
          size="small"
          columns={[
            { title: 'Mã hàng', dataIndex: 'item_code', width: 140 },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Model', dataIndex: 'model', width: 120 },
            { title: 'Đơn vị', dataIndex: 'unit', width: 80 },
            { title: 'Giá nhập gợi ý', dataIndex: 'cost_price', align: 'right' as const, width: 130, render: (v: number) => v != null ? Number(v).toLocaleString('en-US') : '—' },
            { title: 'Giá bán gợi ý', dataIndex: 'sale_price', align: 'right' as const, width: 130, render: (v: number) => v != null ? Number(v).toLocaleString('en-US') : '—' },
            { title: 'BH (tháng)', dataIndex: 'warranty_months', width: 100 },
            {
              title: 'Active',
              dataIndex: 'is_active',
              width: 80,
              render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
            },
            {
              title: '',
              width: 90,
              render: (_: any, record: any) => (
                <Button size="small" onClick={() => navigate(`/products/${id}/variants/${record.id}`)}>
                  Chi tiết
                </Button>
              ),
            },
          ]}
        />
      </SectionCard>

    </div>
  )
}
