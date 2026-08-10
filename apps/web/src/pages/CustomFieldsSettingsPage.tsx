import {
  Tabs, Table, Input, Select, InputNumber, Switch, Tag, Space,
  Popconfirm, Button, Form, Modal, Tooltip,
} from 'antd'
import { ImeInput } from '../components/ImeInput'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useVariantAttributesTab, useCustomFieldsTab } from '../hooks/useCustomFieldsSettings'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'

const OBJECT_TYPES = [
  { value: 'quotation', label: 'Quotation' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'transfer_order', label: 'Transfer Order' },
  { value: 'stocktake', label: 'Stocktake' },
  { value: 'product', label: 'Product' },
  { value: 'company', label: 'Company' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'boolean', label: 'Boolean' },
]

function VariantAttributesTab() {
  const hook = useVariantAttributesTab()

  const columns = [
    { title: '#', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Tên thuộc tính', dataIndex: 'name' },
    {
      title: 'Loại',
      dataIndex: 'field_type',
      width: 90,
      render: (v: string) => {
        const labels: Record<string, string> = { text: 'Nhập tự do', select: 'Danh sách', boolean: 'Có/Không', date: 'Ngày' }
        return <Tag>{labels[v] ?? v}</Tag>
      },
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      width: 80,
      render: (v: string | null) => v ?? <span style={{ color: '#aaa' }}>—</span>,
    },
    {
      title: 'Các giá trị',
      dataIndex: 'options',
      render: (opts: string[], r: any) =>
        r.field_type === 'text' ? <span style={{ color: '#aaa' }}>Nhập tự do</span>
          : r.field_type === 'boolean' ? <span style={{ color: '#aaa' }}>Có / Không</span>
          : r.field_type === 'date' ? <span style={{ color: '#aaa' }}>Ngày tháng</span>
          : opts.length ? opts.map((o: string) => <Tag key={o}>{o}</Tag>) : <span style={{ color: '#aaa' }}>Chưa có</span>,
    },
    {
      title: 'Áp dụng',
      dataIndex: 'applies_to',
      width: 140,
      render: (v: string, r: any) =>
        v === 'all' ? <Tag color="blue">Tất cả</Tag> : <span>{r.products.map((p: any) => p.product_name).join(', ') || <Tag>Chưa chọn SP</Tag>}</span>,
    },
    {
      title: 'Hoạt động',
      dataIndex: 'is_active',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">Có</Tag> : <Tag>Tắt</Tag>),
    },
    {
      title: '',
      width: 60,
      render: (_: any, r: any) => (
        <div className="row-actions">
          <Tooltip title="Sửa">
            <Button type="text" size="small" icon={<EditOutlined />}
              style={{ color: 'var(--text-3)' }}
              onClick={() => hook.openEdit(r)} />
          </Tooltip>
          <Tooltip title="Xoá">
            <Popconfirm title="Xoá thuộc tính này?" okText="Xoá" okButtonProps={{ danger: true }} cancelText="Huỷ"
              onConfirm={() => hook.handleDelete(r.id)}>
              <Button type="text" size="small" icon={<DeleteOutlined />}
                style={{ color: 'var(--text-3)' }} danger
                onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <>
      <TableCard
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>Thêm thuộc tính</Button>
        }
      >
        <Table rowKey="id" dataSource={hook.data} columns={columns} loading={hook.isLoading} pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }} size="small" tableLayout="fixed" />
      </TableCard>

      <Modal
        open={hook.modalOpen}
        title={hook.editing ? 'Sửa thuộc tính' : 'Thêm thuộc tính SKU'}
        onOk={hook.handleSave}
        onCancel={() => hook.setModalOpen(false)}
        width={560}
        okText={hook.editing ? 'Lưu' : 'Tạo'}
      >
        <Form form={hook.form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên thuộc tính" rules={[{ required: true }]} validateTrigger="onBlur">
            <ImeInput placeholder="Ví dụ: Số port, RAM, Dung lượng" />
          </Form.Item>

          <Form.Item name="field_type" label="Loại" initialValue="select">
            <Select options={[
              { value: 'select', label: 'Danh sách (chọn từ giá trị có sẵn)' },
              { value: 'text', label: 'Nhập tự do' },
              { value: 'boolean', label: 'Có / Không' },
              { value: 'date', label: 'Ngày' },
            ]} />
          </Form.Item>

          <Form.Item name="unit" label="Ký hiệu đơn vị (gắn vào tên SKU)">
            <Input placeholder="Ví dụ: P, G, TB — để trống nếu không cần" style={{ width: 200 }} />
          </Form.Item>

          {hook.fieldType === 'select' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>
                Các giá trị <span style={{ fontWeight: 400, color: '#888' }}>(nhấn Enter hoặc +)</span>
              </div>
              <Space wrap>
                {hook.options.map((o) => (
                  <Tag key={o} closable onClose={() => hook.setOptions(hook.options.filter((x) => x !== o))}>{o}</Tag>
                ))}
              </Space>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Input
                  value={hook.optionInput}
                  onChange={(e) => hook.setOptionInput(e.target.value)}
                  onPressEnter={hook.addOption}
                  placeholder="Nhập giá trị rồi Enter"
                  style={{ width: 200 }}
                />
                <Button onClick={hook.addOption} icon={<PlusOutlined />}>Thêm</Button>
              </div>
            </div>
          )}

          <Form.Item name="applies_to" label="Áp dụng cho" initialValue="all">
            <Select
              options={[
                { value: 'all', label: 'Tất cả sản phẩm' },
                { value: 'product', label: 'Chỉ một số sản phẩm' },
              ]}
              onChange={(v) => hook.setAppliesTo(v)}
            />
          </Form.Item>

          {hook.appliesTo === 'product' && (
            <Form.Item name="product_ids" label="Chọn sản phẩm áp dụng">
              <Select
                mode="multiple"
                placeholder="Chọn sản phẩm"
                loading={hook.productsLoading}
                options={(hook.products?.data ?? []).map((p: any) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                showSearch
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          )}

          {hook.editing && (
            <Form.Item name="is_active" label="Hoạt động" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  )
}

function CustomFieldsTab() {
  const hook = useCustomFieldsTab()

  return (
    <>
      <TableCard
        toolbar={
          <Select style={{ width: 200 }} value={hook.objectType} onChange={hook.setObjectType} options={OBJECT_TYPES} />
        }
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>Tạo field</Button>
        }
      >
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          size="small"
          tableLayout="fixed"
          columns={[
            { title: '#', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Tên trường', dataIndex: 'field_name' },
            { title: 'Nhãn hiển thị', dataIndex: 'field_label' },
            { title: 'Loại', dataIndex: 'field_type', width: 100 },
            {
              title: 'Options',
              dataIndex: 'options',
              render: (opts: string[] | null) => opts?.map((o) => <Tag key={o}>{o}</Tag>),
            },
            { title: 'Thứ tự', dataIndex: 'sort_order', width: 80 },
            {
              title: 'Hoạt động',
              dataIndex: 'is_active',
              width: 80,
              render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
            },
            {
              title: '',
              width: 60,
              render: (_: any, record: any) => (
                <div className="row-actions">
                  <Tooltip title="Sửa">
                    <Button type="text" size="small" icon={<EditOutlined />}
                      style={{ color: 'var(--text-3)' }}
                      onClick={() => hook.openEditField(record)} />
                  </Tooltip>
                  <Tooltip title="Xoá">
                    <Popconfirm title="Xoá field này?" okText="Xoá" okButtonProps={{ danger: true }} cancelText="Huỷ"
                      onConfirm={() => hook.deleteMutation.mutate(record.id)}>
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

      <EntityFormModal
        title={hook.editing ? `Sửa trường "${hook.editing.field_name}"` : 'Tạo trường mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={hook.submit}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        {!hook.editing && (
          <>
            <Form.Item
              name="field_name"
              label="Tên trường (machine key)"
              rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: 'snake_case, bắt đầu bằng chữ thường' }]}
              extra="Không thể sửa sau khi tạo"
            >
              <Input placeholder="vd: warranty_note" />
            </Form.Item>
            <Form.Item name="field_type" label="Loại trường" rules={[{ required: true }]} extra="Không thể sửa sau khi tạo">
              <Select options={FIELD_TYPES} />
            </Form.Item>
          </>
        )}
        <Form.Item name="field_label" label="Tên hiển thị" rules={[{ required: true }]}>
          <Input placeholder="vd: Ghi chú bảo hành" />
        </Form.Item>
        {(hook.editing ? hook.editing.field_type : hook.fieldType) === 'select' && (
          <Form.Item
            name="options"
            label="Options (mỗi giá trị 1 dòng)"
            rules={[{ required: true, message: 'field_type select bắt buộc phải có options' }]}
          >
            <Select mode="tags" open={false} tokenSeparators={['\n']} placeholder="Nhập giá trị rồi Enter" />
          </Form.Item>
        )}
        <Form.Item name="sort_order" label="Thứ tự hiển thị" initialValue={0}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        {hook.editing && (
          <Form.Item name="is_active" label="Hoạt động" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </>
  )
}

export default function CustomFieldsSettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Trường tùy chỉnh" />
      <Tabs
        defaultActiveKey="attr"
        items={[
          { key: 'attr', label: 'Thuộc tính SKU', children: <VariantAttributesTab /> },
          { key: 'custom', label: 'Trường tùy chỉnh (phiếu/đơn)', children: <CustomFieldsTab /> },
        ]}
      />
    </div>
  )
}
