import { useState } from 'react'
import { Layout, Avatar, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  TeamOutlined, TagsOutlined, AppstoreOutlined, HomeOutlined,
  FileTextOutlined, InboxOutlined, DatabaseOutlined, BarChartOutlined,
  SettingOutlined, LogoutOutlined, UserOutlined, ShopOutlined,
  SwapOutlined, AuditOutlined, UpOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const { Sider, Content } = Layout

// ── Nav structure ──────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'catalog',
    label: 'Danh mục',
    items: [
      { key: '/companies',  icon: <TeamOutlined />,     label: 'Đối tác' },
      { key: '/categories', icon: <TagsOutlined />,     label: 'Danh mục SP' },
      { key: '/brands',     icon: <ShopOutlined />,     label: 'Thương hiệu' },
      { key: '/products',   icon: <AppstoreOutlined />, label: 'Sản phẩm' },
      { key: '/warehouses', icon: <HomeOutlined />,     label: 'Kho hàng' },
    ],
  },
  {
    key: 'transactions',
    label: 'Giao dịch',
    items: [
      { key: '/purchase-orders', icon: <AuditOutlined />,    label: 'Phiếu mua hàng' },
      { key: '/receipts',        icon: <InboxOutlined />,    label: 'Phiếu nhập kho' },
      { key: '/quotations',      icon: <FileTextOutlined />, label: 'Báo giá' },
      { key: '/deliveries',      icon: <InboxOutlined />,    label: 'Phiếu xuất kho' },
      { key: '/transfers',       icon: <SwapOutlined />,     label: 'Chuyển kho' },
    ],
  },
  {
    key: 'warehouse',
    label: 'Kho vận',
    items: [
      { key: '/inventory',  icon: <DatabaseOutlined />, label: 'Tồn kho' },
      { key: '/stocktakes', icon: <AuditOutlined />,    label: 'Kiểm kê' },
      { key: '/reports',    icon: <BarChartOutlined />, label: 'Báo cáo' },
    ],
  },
  {
    key: 'settings',
    label: 'Cài đặt',
    items: [
      { key: '/settings/roles',         icon: <SettingOutlined />, label: 'Vai trò & Quyền' },
      { key: '/settings/users',         icon: <UserOutlined />,    label: 'Người dùng' },
      { key: '/settings/types',         icon: <SettingOutlined />, label: 'Loại nhập/xuất' },
      { key: '/settings/templates',     icon: <FileTextOutlined />,label: 'Mẫu báo giá' },
      { key: '/settings/bitrix',        icon: <SettingOutlined />, label: 'Đồng bộ Bitrix' },
      { key: '/settings/custom-fields', icon: <SettingOutlined />, label: 'Trường tùy chỉnh' },
    ],
  },
]

// ── NavItem ────────────────────────────────────────────────────────────────
function NavItem({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: 34,
        padding: '0 12px 0 14px',
        margin: '1px 8px',
        borderRadius: 7,
        cursor: 'pointer',
        fontSize: 'var(--font-md)',
        fontWeight: active ? 600 : 400,
        color: active ? '#29ABE2' : hovered ? 'var(--text-1)' : 'var(--text-2)',
        background: active
          ? 'rgba(41,171,226,0.1)'
          : hovered
          ? 'var(--bg-hover)'
          : 'transparent',
        borderLeft: active ? '2px solid #29ABE2' : '2px solid transparent',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      <span style={{
        fontSize: 'var(--font-base)',
        color: active ? '#29ABE2' : hovered ? 'var(--text-1)' : 'var(--text-3)',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}

// ── NavSection ─────────────────────────────────────────────────────────────
function NavSection({
  label, items, activePath, onNavigate,
}: {
  label: string
  items: typeof SECTIONS[0]['items']
  activePath: string
  onNavigate: (key: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Section header */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px 4px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 'var(--font-2xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--text-2)',
        }}>
          {label}
        </span>
        <UpOutlined style={{
          fontSize: 'var(--font-2xs)',
          color: 'var(--text-3)',
          transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s',
        }} />
      </div>

      {/* Items */}
      {open && items.map((item) => (
        <NavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          active={activePath === item.key || activePath.startsWith(item.key + '/')}
          onClick={() => onNavigate(item.key)}
        />
      ))}
    </div>
  )
}

// ── AppLayout ──────────────────────────────────────────────────────────────
export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'name',
      label: user?.full_name ?? 'Tài khoản',
      disabled: true,
      style: { cursor: 'default', color: 'var(--text-1)', fontWeight: 600 },
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: () => { logout(); navigate('/login') },
    },
  ]

  const initials = (user?.full_name ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <Sider
        width={216}
        style={{
          background: '#fff',
          borderRight: '1px solid var(--border)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo — căn giữa */}
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          padding: '0 16px',
        }}>
          <img
            src="/logodns3.png"
            alt="DNS Technology"
            style={{ height: 44, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Nav — scrollable, thin scrollbar */}
        <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '10px 0 16px' }}>
          {SECTIONS.map((section) => (
            <NavSection
              key={section.key}
              label={section.label}
              items={section.items}
              activePath={location.pathname}
              onNavigate={navigate}
            />
          ))}
        </div>
      </Sider>

      <Layout style={{ background: 'var(--bg-page)' }}>
        {/* Header — user info góc phải */}
        <div style={{
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: '#94a3b8', lineHeight: 1.3 }}>{user?.role}</div>
              </div>
              <Avatar size={32} style={{ background: '#29ABE2', fontSize: 'var(--font-sm)', fontWeight: 600, flexShrink: 0 }}>
                {initials}
              </Avatar>
            </div>
          </Dropdown>
        </div>

        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
