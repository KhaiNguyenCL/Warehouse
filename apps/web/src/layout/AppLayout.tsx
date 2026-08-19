import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Tags, ShoppingBag, Boxes, Warehouse, ClipboardList,
  PackageCheck, FileText, PackageOpen, ArrowLeftRight, Database,
  ClipboardCheck, BarChart3, Shield, UserCog, Settings, Layers,
  GitBranch, FormInput, LogOut,
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
import { useAuthStore } from '../store/auth'

const NAV = [
  {
    label: 'Danh mục',
    items: [
      { to: '/companies',  icon: Users,         label: 'Đối tác' },
      { to: '/categories', icon: Tags,           label: 'Danh mục SP' },
      { to: '/brands',     icon: ShoppingBag,    label: 'Thương hiệu' },
      { to: '/products',   icon: Boxes,          label: 'Sản phẩm' },
      { to: '/warehouses', icon: Warehouse,      label: 'Kho hàng' },
    ],
  },
  {
    label: 'Giao dịch',
    items: [
      { to: '/purchase-orders', icon: ClipboardList,  label: 'Phiếu mua hàng' },
      { to: '/receipts',        icon: PackageCheck,   label: 'Phiếu nhập kho' },
      { to: '/quotations',      icon: FileText,       label: 'Báo giá' },
      { to: '/deliveries',      icon: PackageOpen,    label: 'Phiếu xuất kho' },
      { to: '/transfers',       icon: ArrowLeftRight, label: 'Chuyển kho' },
    ],
  },
  {
    label: 'Kho vận',
    items: [
      { to: '/inventory',  icon: Database,       label: 'Tồn kho' },
      { to: '/stocktakes', icon: ClipboardCheck, label: 'Kiểm kê' },
      { to: '/reports',    icon: BarChart3,      label: 'Báo cáo' },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { to: '/settings/roles',         icon: Shield,     label: 'Vai trò & Quyền' },
      { to: '/settings/users',         icon: UserCog,    label: 'Người dùng' },
      { to: '/settings/types',         icon: Settings,   label: 'Loại nhập/xuất' },
      { to: '/settings/templates',     icon: Layers,     label: 'Cài đặt báo giá' },
      { to: '/settings/bitrix',        icon: GitBranch,  label: 'Đồng bộ Bitrix' },
      { to: '/settings/custom-fields', icon: FormInput,  label: 'Trường tùy chỉnh' },
    ],
  },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

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
          {NAV.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isActive(item.to)}
                      onClick={() => navigate(item.to)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
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
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
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
