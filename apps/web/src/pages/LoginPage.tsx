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
      message.error(err.response?.data?.message ?? 'Đăng nhập thất bại')
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
      background: 'var(--bg-subtle)',
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
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          padding: '36px 40px',
        }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px', textAlign: 'center' }}>
            Đăng nhập
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', textAlign: 'center' }}>
            Warehouse Management System
          </p>

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--text-3)' }} />}
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
                prefix={<LockOutlined style={{ color: 'var(--text-3)' }} />}
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

        <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>
          © 2025 DNS Technology Invest Co., Ltd
        </p>
      </div>
    </div>
  )
}
