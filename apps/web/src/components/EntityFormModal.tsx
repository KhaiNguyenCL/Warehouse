// Bọc Modal + Form lặp lại ở mọi trang CRUD đơn giản (Category/Brand/Warehouse/
// Company/Custom Field...): title, open/onCancel, onOk = form.submit(), confirmLoading,
// Form layout="vertical" onFinish. Truyền Form.Item làm children — mỗi trang tự quyết
// field nào, không ép khuôn field.
import { Modal, Form, FormInstance } from 'antd'
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
}: {
  title: string
  open: boolean
  onCancel: () => void
  onFinish: (values: any) => void
  confirmLoading: boolean
  form: FormInstance
  children: ReactNode
  width?: number
  // Nội dung hiện SAU form nhưng vẫn NẰM TRONG Modal — KHÔNG lồng vào trong <Form> ở
  // trên, vì 1 số nội dung (vd CustomFieldsPanel) có <Form> riêng của nó, lồng 2 thẻ
  // <form> HTML vào nhau là invalid và antd sẽ submit sai form.
  extra?: ReactNode
  // Dùng cho Form.List (vd PurchaseOrdersPage cần lines: [{}] để hiện sẵn 1 dòng trống) —
  // useEntityModal.openCreate() chỉ resetFields(), không tự set lại initialValues này.
  initialValues?: Record<string, unknown>
  okText?: string
}) {
  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={() => form.submit()} confirmLoading={confirmLoading} width={width ?? 760} okText={okText ?? 'Lưu'}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
        {/* entity-form-grid (index.css): form dài tự chia 2-3 cột theo độ rộng modal, field
            dạng textarea hoặc đánh dấu .form-row-full (Form.List...) chiếm nguyên 1 hàng. */}
        <div className="entity-form-grid">{children}</div>
      </Form>
      {extra}
    </Modal>
  )
}
