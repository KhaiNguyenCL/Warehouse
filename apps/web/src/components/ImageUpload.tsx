import { useState } from 'react'
import { Upload, message } from 'antd'
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons'
import { api } from '../lib/api'

interface Props {
  value?: string
  onChange?: (url: string | undefined) => void
}

// ImageUpload — dùng trong Form.Item, trả về URL ảnh sau khi upload thành công.
// Hiển thị preview ảnh khi đã có URL; click vào để đổi ảnh khác.
export function ImageUpload({ value, onChange }: Props) {
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
    <Upload
      listType="picture-card"
      showUploadList={false}
      accept="image/jpeg,image/png,image/webp,image/gif"
      beforeUpload={handleUpload}
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
          <LoadingOutlined style={{ fontSize: 20 }} />
          <span style={{ fontSize: 'var(--font-xs)' }}>Đang tải...</span>
        </div>
      ) : imgSrc ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src={imgSrc}
            alt="product"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
          />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 6,
            background: 'rgba(0,0,0,0)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            fontSize: 'var(--font-xs)', color: '#fff', fontWeight: 600,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
          >
            Đổi ảnh
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
          <PlusOutlined style={{ fontSize: 20 }} />
          <span style={{ fontSize: 'var(--font-xs)' }}>Tải ảnh lên</span>
        </div>
      )}
    </Upload>
  )
}
