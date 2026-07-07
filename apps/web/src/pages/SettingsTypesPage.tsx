// Quản lý import_types/export_types (Settings) — ReceiptsPage/DeliveryOrdersPage chỉ ĐỌC
// bảng này để hiện Select; trang này là nơi duy nhất tạo loại mới hoặc sửa requires_*.
import { Table, Form, Input, Select, Switch, Button, Popconfirm } from 'antd'
import { useImportTypes, useExportTypes } from '../hooks/useSettingsTypes'
import { PageHeader } from '../components/PageHeader'
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
    <div>
      <PageHeader title="Loại nhập / xuất kho" />
      <ImportTypesSection />
      <div style={{ marginTop: 40 }}>
        <ExportTypesSection />
      </div>
    </div>
  )
}

function ImportTypesSection() {
  const hook = useImportTypes()

  return (
    <div>
      <PageHeader title="Loại nhập kho (import_types)" level={4} actionLabel="+ Tạo loại nhập" onAction={hook.openCreate} />
      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Key', dataIndex: 'key' },
          { title: 'Label', dataIndex: 'label' },
          { title: 'Cần đối tác', dataIndex: 'requires_company' },
          { title: 'Cần tham chiếu', dataIndex: 'requires_ref_document' },
          { title: 'Active', dataIndex: 'is_active', render: (v: boolean) => (v ? 'Có' : 'Không') },
          { title: 'Hệ thống', dataIndex: 'is_system', render: (v: boolean) => (v ? 'Có' : '') },
          {
            title: '',
            render: (_: any, r: any) =>
              !r.is_system && (
                <Popconfirm
                  title="Xoá loại nhập này?"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    hook.deleteMutation.mutate(r.id)
                  }}
                >
                  <Button size="small" danger onClick={(e) => e.stopPropagation()}>
                    Xoá
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />

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
        <Form.Item
          name="parent_key"
          label="Parent key (tuỳ chọn)"
          extra="1 trong 3 key hệ thống: purchase/return_in/adjustment — để service xử lý đúng hành vi"
        >
          <Input />
        </Form.Item>
        <Form.Item name="requires_company" label="Cần đối tác" initialValue="none">
          <Select options={REQUIRES_COMPANY} />
        </Form.Item>
        <Form.Item name="requires_ref_document" label="Cần tham chiếu" initialValue="none">
          <Select options={REQUIRES_REF_DOCUMENT} />
        </Form.Item>
        {hook.editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
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
    <div>
      <PageHeader title="Loại xuất kho (export_types)" level={4} actionLabel="+ Tạo loại xuất" onAction={hook.openCreate} />
      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Key', dataIndex: 'key' },
          { title: 'Label', dataIndex: 'label' },
          { title: 'Cần đối tác', dataIndex: 'requires_company' },
          { title: 'Cần Quotation', dataIndex: 'requires_quotation', render: (v: boolean) => (v ? 'Có' : '') },
          { title: 'Active', dataIndex: 'is_active', render: (v: boolean) => (v ? 'Có' : 'Không') },
          { title: 'Hệ thống', dataIndex: 'is_system', render: (v: boolean) => (v ? 'Có' : '') },
          {
            title: '',
            render: (_: any, r: any) =>
              !r.is_system && (
                <Popconfirm
                  title="Xoá loại xuất này?"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    hook.deleteMutation.mutate(r.id)
                  }}
                >
                  <Button size="small" danger onClick={(e) => e.stopPropagation()}>
                    Xoá
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />

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
        <Form.Item
          name="parent_key"
          label="Parent key (tuỳ chọn)"
          extra="1 trong 7 key hệ thống (sale/internal/demo_out/warranty_out/return_out/dispose/adjustment)"
        >
          <Input />
        </Form.Item>
        <Form.Item name="requires_company" label="Cần đối tác" initialValue="none">
          <Select options={REQUIRES_COMPANY} />
        </Form.Item>
        <Form.Item name="requires_quotation" label="Cần Quotation" valuePropName="checked" initialValue={false}>
          <Switch />
        </Form.Item>
        {hook.editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}
