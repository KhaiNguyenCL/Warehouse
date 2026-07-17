import { Form, Input, Button, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form] = Form.useForm()

  async function onFinish(values: { email: string; password: string }) {
    try {
      const { data } = await api.post('/auth/login', values)
      const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.token}` } })
      setAuth(data.token, me.data)
      navigate('/')
    } catch (err: any) {
      message.error(err.response?.data?.error ?? 'Đăng nhập thất bại')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left panel — branding, nền trắng */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        background: '#fff',
      }}>
        <div style={{ maxWidth: 420 }}>
          <img
            src="/logodns3.png"
            alt="DNS Technology"
            style={{ width: 220, marginBottom: 40 }}
          />

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.25 }}>
            Warehouse<br />Management System
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 48px', lineHeight: 1.6 }}>
            Quản lý kho hàng tập trung, real-time.<br />
            Theo dõi tồn kho, serial number và báo giá.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '📦', text: 'Nhập / xuất kho tự động' },
              { icon: '🔍', text: 'Theo dõi serial number xuyên suốt' },
              { icon: '📊', text: 'Báo cáo tồn kho real-time' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#e8f7fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}>
                  {icon}
                </div>
                <span style={{ color: '#374151', fontSize: 15 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ marginTop: 'auto', paddingTop: 48, color: '#94a3b8', fontSize: 13 }}>
          © 2025 DNS Technology Invest Co., Ltd
        </p>
      </div>

      {/* Right panel — form, nền xanh gradient */}
      <div style={{
        width: 480,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        background: 'linear-gradient(160deg, #0d6e96 0%, #29ABE2 60%, #5cc8ef 100%)',
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          Đăng nhập
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, margin: '0 0 36px' }}>
          Vui lòng đăng nhập để tiếp tục
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label={<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Email</span>}
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
            label={<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Mật khẩu</span>}
            rules={[{ required: true, message: 'Nhập mật khẩu' }]}
            style={{ marginBottom: 28 }}
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
            block
            size="large"
            style={{
              borderRadius: 8,
              height: 44,
              fontWeight: 600,
              fontSize: 15,
              background: '#fff',
              color: '#29ABE2',
              border: 'none',
            }}
          >
            Đăng nhập
          </Button>
        </Form>
      </div>
    </div>
  )
}
