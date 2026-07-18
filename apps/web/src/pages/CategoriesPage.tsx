import { useEffect } from 'react'
import { Table, Input, TreeSelect, Switch, Tag, Form, Button, Space, Popconfirm } from 'antd'
import type { FormInstance } from 'antd'
import { PlusOutlined, CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons'
import { useCategories } from '../hooks/useCategories'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'

const VOWELS = new Set(['a','e','i','o','u'])

function generateShortCode(name: string): string {
  const tokens = name.trim().split(/\s+/)
  if (tokens.length > 1) {
    // Multi-word: first char of each token (letters → uppercase, numbers → keep), max 4
    return tokens
      .map((t) => (/^\d/.test(t) ? t.replace(/\D/g, '').slice(0, 2) : t[0].toUpperCase()))
      .join('')
      .slice(0, 4)
  }
  // Single word: first letter + first non-vowel after it (max 3 chars)
  const word = name.trim().toUpperCase()
  const rest = word.slice(1).split('').filter((c) => !VOWELS.has(c.toLowerCase()))
  return (word[0] + rest.slice(0, 2).join('')).slice(0, 3)
}

function ShortCodeAutoFill({ form }: { form: FormInstance }) {
  const name = Form.useWatch('name', form)
  const shortCode = Form.useWatch('short_code', form)
  useEffect(() => {
    if (name && !shortCode) {
      form.setFieldValue('short_code', generateShortCode(name))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])
  return null
}

function buildTree(flat: any[]): any[] {
  const map: Record<string, any> = {}
  flat.forEach((c) => (map[c.id] = { ...c }))
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

export default function CategoriesPage() {
  const hook = useCategories()
  const treeData = hook.data ? buildTree(hook.data) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Danh mục sản phẩm"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>Tạo mới</Button>}
      />

      <TableCard><Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={treeData}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        expandable={{
          defaultExpandAllRows: true,
          expandIcon: ({ expanded, onExpand, record }) =>
            record.children?.length ? (
              <button
                onClick={(e) => onExpand(record, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-3)' }}
              >
                {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </button>
            ) : <span style={{ display: 'inline-block', width: 24 }} />,
        }}
        columns={[
          { title: 'Tên', dataIndex: 'name', width: 260 },
          { title: 'Mã viết tắt', dataIndex: 'short_code', width: 120, align: 'center' as const },
          {
            title: 'Hoạt động',
            dataIndex: 'is_active',
            width: 100,
            align: 'center' as const,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
          {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            width: 110,
            align: 'center' as const,
            render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
          },
          {
            title: 'Người tạo',
            dataIndex: 'created_by_name',
            width: 130,
            render: (v: string) => <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{v ?? '—'}</span>,
          },
          {
            title: 'Hành động',
            width: 140,
            align: 'center' as const,
            render: (_: any, record: any) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => hook.openEdit(record)}>Sửa</Button>
                <Popconfirm title="Xoá danh mục này?" onConfirm={() => hook.deleteMutation.mutate(record.id)} okText="Xoá" cancelText="Không">
                  <Button size="small" danger loading={hook.deleteMutation.isPending}>Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      /></TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa danh mục "${hook.editing.name}"` : 'Tạo danh mục mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => {
          const payload = { ...v, parent_id: v.parent_id || null }
          hook.editing ? hook.updateMutation.mutate(payload) : hook.createMutation.mutate(payload)
        }}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <ShortCodeAutoFill form={hook.form} />
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[{ required: true }]}
          className="form-row-full"
          getValueFromEvent={(e) => {
            const v = e.target.value
            return v.charAt(0).toUpperCase() + v.slice(1)
          }}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="short_code"
          label="Mã viết tắt"
          extra="Tự sinh từ tên, có thể sửa. Dùng để gợi ý mã sản phẩm."
          rules={[{ required: true }]}
          getValueFromEvent={(e) => e.target.value.toUpperCase()}
        >
          <Input style={{ textTransform: 'uppercase' }} />
        </Form.Item>
        <Form.Item name="parent_id" label="Danh mục cha (tuỳ chọn)">
          <TreeSelect
            treeData={hook.parentTreeData}
            allowClear
            showSearch
            treeNodeFilterProp="title"
            placeholder="Không có (danh mục gốc)"
            treeDefaultExpandAll
          />
        </Form.Item>
        {hook.editing && (
          <Form.Item name="is_active" label="Hoạt động" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}
