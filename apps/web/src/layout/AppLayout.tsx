// Layout chuẩn admin dashboard: sidebar trái (collapsible, menu nhóm theo nghiệp vụ) +
// top header (logo + user + logout). Thay cho layout top-nav ngang cũ — 9 mục nav ngang
// đã bắt đầu chật, và sẽ còn thêm Quotation/Delivery Order/Settings sau này.
import { useState } from 'react'
import { Layout, Menu, Button, Typography } from 'antd'
import {
  TeamOutlined,
  TagsOutlined,
  TrademarkOutlined,
  AppstoreOutlined,
  HomeOutlined,
  FileTextOutlined,
  InboxOutlined,
  DatabaseOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const { Header, Sider, Content } = Layout

const NAV_ITEMS = [
  {
    key: 'catalog',
    label: 'Danh mục',
    type: 'group' as const,
    children: [
      { key: '/companies', icon: <TeamOutlined />, label: 'Đối tác (KH/NCC)' },
      { key: '/categories', icon: <TagsOutlined />, label: 'Category' },
      { key: '/brands', icon: <TrademarkOutlined />, label: 'Hãng' },
      { key: '/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
      { key: '/warehouses', icon: <HomeOutlined />, label: 'Kho' },
    ],
  },
  {
    key: 'transactions',
    label: 'Giao dịch',
    type: 'group' as const,
    children: [
      { key: '/purchase-orders', icon: <FileTextOutlined />, label: 'Purchase Order' },
      { key: '/receipts', icon: <InboxOutlined />, label: 'Phiếu nhập kho' },
    ],
  },
  {
    key: 'warehousing',
    label: 'Kho vận',
    type: 'group' as const,
    children: [{ key: '/inventory', icon: <DatabaseOutlined />, label: 'Tồn kho' }],
  },
  {
    key: 'settings',
    label: 'Cài đặt',
    type: 'group' as const,
    children: [{ key: '/settings/custom-fields', icon: <SettingOutlined />, label: 'Custom Field' }],
  },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null} theme="dark">
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography.Text strong style={{ color: '#fff', fontSize: collapsed ? 16 : 20 }}>
            {collapsed ? 'W' : 'WMS'}
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', padding: '0 16px' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ flex: 1 }} />
          <Typography.Text>{user?.full_name}</Typography.Text>
          <Button
            size="small"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Đăng xuất
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
