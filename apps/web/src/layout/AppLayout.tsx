import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Tags, ShoppingBag, Boxes, Warehouse, ClipboardList,
  PackageCheck, PackageSearch, FileText, PackageOpen, ArrowLeftRight, Database,
  ClipboardCheck, BarChart3, Shield, UserCog, UsersRound, Settings, Layers,
  GitBranch, FormInput, LogOut, Bell, KeyRound,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ChangePasswordDialog from '@/components/ChangePasswordDialog'
import { useAuthStore } from '../store/auth'

// permission: undefined → hiện với mọi user đã login
// permission: 'key'     → chỉ hiện khi user có quyền đó
const NAV = [
  {
    label: 'Tổng quan',
    items: [
      { to: '/actions', icon: Bell, label: 'Hành động' },
    ],
  },
  {
    label: 'Danh mục',
    items: [
      { to: '/companies',  icon: Users,      label: 'Đối tác' },
      { to: '/categories', icon: Tags,       label: 'Danh mục SP',  permission: 'settings.products' },
      { to: '/brands',     icon: ShoppingBag, label: 'Thương hiệu', permission: 'settings.products' },
      { to: '/products',   icon: Boxes,      label: 'Sản phẩm',     permission: 'settings.products' },
      { to: '/warehouses', icon: Warehouse,  label: 'Kho hàng',     permission: 'settings.warehouse' },
    ],
  },
  {
    label: 'Giao dịch',
    items: [
      { to: '/purchase-orders', icon: ClipboardList,  label: 'Phiếu mua hàng', permission: 'purchase_order.view' },
      { to: '/shipments',       icon: PackageSearch,  label: 'Phiếu nhận hàng', permission: 'receipt.view' },
      { to: '/receipts',        icon: PackageCheck,   label: 'Phiếu nhập kho',  permission: 'receipt.view' },
      { to: '/quotations',      icon: FileText,       label: 'Báo giá',          permission: 'quotation.view' },
      { to: '/deliveries',      icon: PackageOpen,    label: 'Phiếu xuất kho',   permission: 'delivery.view' },
      { to: '/transfers',       icon: ArrowLeftRight, label: 'Chuyển kho',       permission: 'transfer.view' },
    ],
  },
  {
    label: 'Kho vận',
    items: [
      { to: '/inventory',  icon: Database,       label: 'Tồn kho',  permission: 'report.inventory' },
      { to: '/stocktakes', icon: ClipboardCheck, label: 'Kiểm kê',  permission: 'stocktake.view' },
      { to: '/reports',    icon: BarChart3,      label: 'Báo cáo',  permission: 'report.view' },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { to: '/settings/roles',         icon: Shield,     label: 'Vai trò & Quyền',   permission: 'settings.roles' },
      { to: '/settings/groups',        icon: UsersRound, label: 'Nhóm người dùng',   permission: 'settings.roles' },
      { to: '/settings/users',         icon: UserCog,    label: 'Người dùng',         permission: 'settings.users' },
      { to: '/settings/types',         icon: Settings,   label: 'Loại nhập/xuất',    permission: 'settings.roles' },
      { to: '/settings/templates',     icon: Layers,     label: 'Cài đặt báo giá',  permission: 'settings.roles' },
      { to: '/settings/bitrix',        icon: GitBranch,  label: 'Đồng bộ Bitrix',   permission: 'settings.roles' },
      { to: '/settings/custom-fields', icon: FormInput,  label: 'Trường tùy chỉnh', permission: 'settings.roles' },
    ],
  },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const initials = (user?.full_name ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <SidebarProvider className="h-full">
      <Sidebar variant="inset">
        {/* ── Logo ── */}
        <SidebarHeader>
          <div className="flex h-12 items-center justify-center border-b border-sidebar-border px-4">
            <img src="/logodns3.png" alt="DNS Technology" className="h-9 w-auto object-contain" />
          </div>
        </SidebarHeader>

        {/* ── Nav ── */}
        <SidebarContent>
          {NAV.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission),
            )
            if (visibleItems.length === 0) return null
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={isActive(item.to)}
                        onClick={() => navigate(item.to)}
                        tooltip={item.label}
                        className="data-[active=true]:bg-[var(--accent-bg)] data-[active=true]:text-[var(--accent-text)] data-[active=true]:font-medium transition-colors"
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            )
          })}
        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      {/* ── Main content ── */}
      <SidebarInset>
        {/* Topbar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm text-muted-foreground">
            {NAV.flatMap(s => s.items).find(i => isActive(i.to))?.label ?? 'WMS'}
          </span>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{user?.full_name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.groups?.map(g => g.name).join(', ') || 'Không có nhóm'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setChangePasswordOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Đổi mật khẩu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => { logout(); navigate('/login') }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
