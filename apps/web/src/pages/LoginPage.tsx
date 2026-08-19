import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', values)
      const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.token}` } })
      setAuth(data.token, me.data)
      navigate('/')
    } catch (err: any) {
      message.error(err.response?.data?.error ?? 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f1f5f9',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>
        {/* Logo */}
        <img src="/logodns3.png" alt="DNS Technology" style={{ width: 180 }} />

        {/* Card */}
        <div style={{
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          padding: '36px 40px',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', textAlign: 'center' }}>
            Đăng nhập
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', textAlign: 'center' }}>
            Warehouse Management System
          </p>

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                placeholder="admin@wms.local"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Nhập mật khẩu' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Button
              htmlType="submit"
              type="primary"
              block
              size="large"
              loading={loading}
              style={{ borderRadius: 8, height: 44, fontWeight: 600, fontSize: 15 }}
            >
              Đăng nhập
            </Button>
          </Form>
        </div>

        <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
          © 2025 DNS Technology Invest Co., Ltd
        </p>
      </div>
    </div>
  )
}
