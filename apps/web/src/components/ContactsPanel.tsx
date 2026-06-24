// Quản lý Contact của 1 Company — render trong slot `extra` của EntityFormModal (ngoài
// <Form> chính, có Form riêng). Backend chỉ có POST (tạo) + PATCH (sửa), không có DELETE
// — click 1 dòng để load vào form sửa, không có nút xoá.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Form, Input, Switch, Button, Typography, Space, message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'

interface Props {
  companyId: string
}

export default function ContactsPanel({ companyId }: Props) {
  const { editing, form, openCreate, openEdit, close } = useEntityModal()
  const qc = useQueryClient()
  const [bitrixContactId, setBitrixContactId] = useState('')

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
  })

  const invalidate = { invalidateKey: ['companies', companyId] }

  // CLAUDE.md mục 12: import Contact từ Bitrix, gắn vào company hiện tại (company_id
  // override — không cần dựa vào deal.COMPANY_ID resolve).
  const importMutation = useMutation({
    mutationFn: () => api.post(`/bitrix/contacts/${bitrixContactId}/import`, { company_id: companyId }),
    onSuccess: () => {
      message.success('Import contact từ Bitrix thành công')
      qc.invalidateQueries({ queryKey: ['companies', companyId] })
      setBitrixContactId('')
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Import thất bại'),
  })

  const createMutation = useApiMutation((values: any) => api.post(`/companies/${companyId}/contacts`, values), {
    successMessage: 'Thêm người liên hệ thành công',
    ...invalidate,
    onSuccess: close,
  })

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/companies/${companyId}/contacts/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', ...invalidate, onSuccess: close },
  )

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>Người liên hệ</Typography.Title>
        <Space>
          <Input
            placeholder="Bitrix Contact ID"
            style={{ width: 160 }}
            value={bitrixContactId}
            onChange={(e) => setBitrixContactId(e.target.value)}
          />
          <Button
            disabled={!bitrixContactId}
            loading={importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            Import từ Bitrix
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={company?.contacts}
        pagination={false}
        size="small"
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Họ tên', dataIndex: 'full_name' },
          { title: 'Chức vụ', dataIndex: 'position' },
          { title: 'SĐT', dataIndex: 'phone' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Chính', dataIndex: 'is_primary', render: (v: boolean) => (v ? 'Có' : '') },
        ]}
      />

      <Form
        form={form}
        layout="inline"
        style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
      >
        <Form.Item name="full_name" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input placeholder="Họ tên" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="position">
          <Input placeholder="Chức vụ" style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="phone">
          <Input placeholder="SĐT" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
          <Input placeholder="Email" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="is_primary" valuePropName="checked">
          <Switch checkedChildren="Chính" unCheckedChildren="Phụ" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {editing ? 'Lưu' : '+ Thêm'}
          </Button>
        </Form.Item>
        {editing && (
          <Form.Item>
            <Button onClick={() => openCreate()}>Huỷ sửa</Button>
          </Form.Item>
        )}
      </Form>
    </div>
  )
}
