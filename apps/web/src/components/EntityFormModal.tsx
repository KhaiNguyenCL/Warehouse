// Bọc Modal + Form lặp lại ở mọi trang CRUD đơn giản (Category/Brand/Warehouse/
// Company/Custom Field...): title, open/onCancel, onOk = form.submit(), confirmLoading,
// Form layout="vertical" onFinish. Truyền Form.Item làm children — mỗi trang tự quyết
// field nào, không ép khuôn field.
import { Modal, Form, FormInstance, Button, Space } from 'antd'
import { ReactNode } from 'react'

export function EntityFormModal({
  title,
  open,
  onCancel,
  onFinish,
  confirmLoading,
  form,
  children,
  width,
  extra,
  initialValues,
  okText,
  footerExtra,
  formLayout = 'compact',
}: {
  title: string
  open: boolean
  onCancel: () => void
  onFinish: (values: any) => void
  confirmLoading: boolean
  form: FormInstance
  children: ReactNode
  width?: number
  extra?: ReactNode
  initialValues?: Record<string, unknown>
  okText?: string
  footerExtra?: ReactNode
  formLayout?: 'grid' | 'compact'
}) {
  const footer = footerExtra ? (
    <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
      <Button onClick={onCancel}>Huỷ</Button>
      {footerExtra}
      <Button type="primary" loading={confirmLoading} onClick={() => form.submit()}>
        {okText ?? 'Lưu'}
      </Button>
    </Space>
  ) : undefined

  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={() => form.submit()} confirmLoading={confirmLoading} width={width ?? 760} okText={okText ?? 'Lưu'} footer={footer}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
        <div className={formLayout === 'compact' ? 'entity-form-compact' : 'entity-form-grid'}>{children}</div>
      </Form>
      {extra}
    </Modal>
  )
}
