import { Table, Form, Input, Select, Switch, Button, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useImportTypes, useExportTypes } from '../hooks/useSettingsTypes'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'

const REQUIRES_COMPANY = [
  { value: 'none', label: 'Không cần' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'supplier', label: 'NCC' },
]
const REQUIRES_REF_DOCUMENT = [
  { value: 'none', label: 'Không cần' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'stocktake_result', label: 'Stocktake Result' },
]

export default function SettingsTypesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ImportTypesSection />
      <ExportTypesSection />
    </div>
  )
}

function ImportTypesSection() {
  const hook = useImportTypes()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Loại nhập kho"
        meta="import_types"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>
            Tạo loại nhập
          </Button>
        }
      />
      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          onRow={(record: any) => ({ onClick: () => hook.openEdit(record), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã', dataIndex: 'key', width: 140 },
            { title: 'Tên hiển thị', dataIndex: 'label' },
            { title: 'Cần đối tác', dataIndex: 'requires_company', width: 120 },
            { title: 'Cần tham chiếu', dataIndex: 'requires_ref_document', width: 140 },
            { title: 'Hoạt động', dataIndex: 'is_active', width: 90, render: (v: boolean) => (v ? 'Có' : 'Không') },
            { title: 'Hệ thống', dataIndex: 'is_system', width: 90, render: (v: boolean) => (v ? 'Có' : '') },
            {
              title: '',
              width: 70,
              render: (_: any, r: any) =>
                !r.is_system && (
                  <Popconfirm
                    title="Xoá loại nhập này?"
                    onConfirm={(e) => { e?.stopPropagation(); hook.deleteMutation.mutate(r.id) }}
                  >
                    <Button size="small" danger onClick={(e) => e.stopPropagation()}>Xoá</Button>
                  </Popconfirm>
                ),
            },
          ]}
        />
      </TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa loại nhập "${hook.editing.label}"` : 'Tạo loại nhập mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        {!hook.editing && (
          <Form.Item name="key" label="Key" rules={[{ required: true }]} extra="Không sửa được sau khi tạo">
            <Input />
          </Form.Item>
        )}
        <Form.Item name="label" label="Label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="parent_key" label="Parent key (tuỳ chọn)" extra="purchase/return_in/adjustment">
          <Input />
        </Form.Item>
        <Form.Item name="requires_company" label="Cần đối tác" initialValue="none">
          <Select options={REQUIRES_COMPANY} />
        </Form.Item>
        <Form.Item name="requires_ref_document" label="Cần tham chiếu" initialValue="none">
          <Select options={REQUIRES_REF_DOCUMENT} />
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

function ExportTypesSection() {
  const hook = useExportTypes()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Loại xuất kho"
        meta="export_types"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>
            Tạo loại xuất
          </Button>
        }
      />
      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          onRow={(record: any) => ({ onClick: () => hook.openEdit(record), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Key', dataIndex: 'key', width: 140 },
            { title: 'Label', dataIndex: 'label' },
            { title: 'Cần đối tác', dataIndex: 'requires_company', width: 120 },
            { title: 'Cần báo giá', dataIndex: 'requires_quotation', width: 110, render: (v: boolean) => (v ? 'Có' : '') },
            { title: 'Hoạt động', dataIndex: 'is_active', width: 90, render: (v: boolean) => (v ? 'Có' : 'Không') },
            { title: 'Hệ thống', dataIndex: 'is_system', width: 90, render: (v: boolean) => (v ? 'Có' : '') },
            {
              title: '',
              width: 70,
              render: (_: any, r: any) =>
                !r.is_system && (
                  <Popconfirm
                    title="Xoá loại xuất này?"
                    onConfirm={(e) => { e?.stopPropagation(); hook.deleteMutation.mutate(r.id) }}
                  >
                    <Button size="small" danger onClick={(e) => e.stopPropagation()}>Xoá</Button>
                  </Popconfirm>
                ),
            },
          ]}
        />
      </TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa loại xuất "${hook.editing.label}"` : 'Tạo loại xuất mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        {!hook.editing && (
          <Form.Item name="key" label="Key" rules={[{ required: true }]} extra="Không sửa được sau khi tạo">
            <Input />
          </Form.Item>
        )}
        <Form.Item name="label" label="Label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="parent_key" label="Parent key (tuỳ chọn)" extra="sale/internal/demo_out/warranty_out/return_out/dispose/adjustment">
          <Input />
        </Form.Item>
        <Form.Item name="requires_company" label="Cần đối tác" initialValue="none">
          <Select options={REQUIRES_COMPANY} />
        </Form.Item>
        <Form.Item name="requires_quotation" label="Cần báo giá" valuePropName="checked" initialValue={false}>
          <Switch />
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
