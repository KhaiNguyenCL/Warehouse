import { useState } from 'react'
import { Upload, Button, Image, message } from 'antd'
import { UploadOutlined, PictureOutlined, LoadingOutlined } from '@ant-design/icons'
import { api } from '../lib/api'

interface Props {
  value?: string
  onChange?: (url: string | undefined) => void
  disabled?: boolean
}

// ImageUpload — dùng trong Form.Item, trả về URL ảnh sau khi upload thành công.
// Click vào ảnh để phóng to xem (antd Image preview) — KHÔNG đổi ảnh khi click nữa.
// Đổi/tải ảnh qua nút "Upload ảnh" riêng bên dưới (chỉ hiện khi không disabled).
export function ImageUpload({ value, onChange, disabled }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleUpload(file: File) {
    const form = new FormData()
    form.append('file', file)
    setLoading(true)
    try {
      const res = await api.post('/uploads/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange?.(res.data.url)
    } catch {
      message.error('Upload thất bại')
    } finally {
      setLoading(false)
    }
    return false // ngăn antd tự upload
  }

  // Ảnh lưu local — path dạng /uploads/images/xxx.jpg, serve qua Vite proxy → backend
  const imgSrc = value ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{
        aspectRatio: '1 / 1', width: '100%', borderRadius: 6, overflow: 'hidden',
        border: '1px solid var(--border, #d9d9d9)', background: 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
            <LoadingOutlined style={{ fontSize: 20 }} />
            <span style={{ fontSize: 'var(--font-xs)' }}>Đang tải...</span>
          </div>
        ) : imgSrc ? (
          <Image
            src={imgSrc}
            alt="product"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            wrapperStyle={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
            <PictureOutlined style={{ fontSize: 20 }} />
            <span style={{ fontSize: 'var(--font-xs)' }}>Chưa có ảnh</span>
          </div>
        )}
      </div>

      {!disabled && (
        <Upload
          showUploadList={false}
          accept="image/jpeg,image/png,image/webp,image/gif"
          beforeUpload={handleUpload}
          disabled={loading}
        >
          <Button icon={<UploadOutlined />} size="small" block loading={loading}>
            {imgSrc ? 'Đổi ảnh' : 'Upload ảnh'}
          </Button>
        </Upload>
      )}
    </div>
  )
}
