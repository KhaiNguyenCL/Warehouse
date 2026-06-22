import { Form, Input, Button, Card, Typography, message } from 'antd'
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
      navigate('/companies')
    } catch (err: any) {
      message.error(err.response?.data?.error ?? 'Đăng nhập thất bại')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={4}>WMS — Đăng nhập</Typography.Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
