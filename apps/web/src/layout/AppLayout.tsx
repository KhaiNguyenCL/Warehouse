import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Tags, ShoppingBag, Boxes, ClipboardList, Warehouse,
  PackageSearch, PackagePlus, PackageMinus, ClipboardCheck, Building2,
  FileText, ArrowLeftRight,
  BarChart3, Shield, UserCog, UsersRound, Settings, Layers,
  GitBranch, FormInput, LogOut, KeyRound, ChevronDown, Menu,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ChangePasswordDialog from '@/components/ChangePasswordDialog'
import NotificationBell from '@/components/NotificationBell'
import AssistantChat from '@/components/AssistantChat'
import CalculatorChat from '@/components/CalculatorChat'
import GlobalSearch from '@/components/GlobalSearch'
import { PageHeaderProvider, PageNoPaddingProvider } from './PageHeaderSlot'
import { useAuthStore } from '../store/auth'
import { cn } from '@/lib/utils'

// permission: undefined → hiện với mọi user đã login
// permission: 'key'     → chỉ hiện khi user có quyền đó
//
// Thanh nav ngang (thay sidebar trái) — PRIMARY = mục dùng thường xuyên nhất/không thuộc
// nhóm nghiệp vụ nào rõ ràng, hiện phẳng; phần còn lại gom vào dropdown CÓ TÊN theo đúng
// nhóm nghiệp vụ (không phải nhóm kỹ thuật) — phản hồi thực tế: bản trước để quá nhiều mục
// nổi (Tồn kho/Kho hàng/Nhập-Xuất kho/Kiểm kê/Nhà cung cấp) làm thanh nav rối, trong khi
// chúng đều thuộc đúng 1 trong 2 nhóm nghiệp vụ lớn: "Quản lý kho" (vận hành kho vật lý) và
// "Kinh doanh" (chứng từ mua/bán — NCC lẫn khách hàng).
const PRIMARY_NAV = [
  { to: '/actions',    label: 'Tổng quan' },
  { to: '/products',   label: 'Sản phẩm',     permission: 'settings.products' },
  { to: '/reports',    label: 'Báo cáo',      permission: 'report.view' },
]

// Nhóm dropdown có tên — thay cho 1 "Khác" gộp hết.
const NAV_GROUPS = [
  {
    label: 'Danh mục',
    items: [
      { to: '/categories', icon: Tags,        label: 'Danh mục SP', permission: 'settings.products' },
      { to: '/brands',     icon: ShoppingBag, label: 'Thương hiệu', permission: 'settings.products' },
    ],
  },
  {
    // Toàn bộ nghiệp vụ VẬN HÀNH kho vật lý — không phải chứng từ mua/bán.
    label: 'Quản lý kho',
    items: [
      { to: '/inventory',  icon: Boxes,       label: 'Tồn kho',      permission: 'report.inventory' },
      { to: '/warehouses', icon: Warehouse,   label: 'Kho hàng',     permission: 'settings.warehouse' },
      { to: '/receipts',   icon: PackagePlus, label: 'Nhập kho',     permission: 'receipt.view' },
      { to: '/deliveries', icon: PackageMinus, label: 'Xuất kho',    permission: 'delivery.view' },
      { to: '/transfers',  icon: ArrowLeftRight, label: 'Chuyển kho', permission: 'transfer.view' },
      { to: '/stocktakes', icon: ClipboardCheck, label: 'Kiểm kê',   permission: 'stocktake.view' },
    ],
  },
  {
    // Chứng từ mua (NCC) lẫn bán (khách hàng) — cả 2 đều là "kinh doanh", khác nhóm "Quản lý
    // kho" ở chỗ đây là giấy tờ giao dịch, không phải thao tác trên kho vật lý.
    label: 'Kinh doanh',
    items: [
      { to: '/quotations',      icon: FileText,      label: 'Báo giá',         permission: 'quotation.view' },
      { to: '/purchase-orders', icon: ClipboardList, label: 'Phiếu mua hàng',  permission: 'purchase_order.view' },
      { to: '/shipments',       icon: PackageSearch, label: 'Phiếu nhận hàng', permission: 'receipt.view' },
      { to: '/companies',       icon: Building2,      label: 'Nhà cung cấp' },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const initials = (user?.full_name ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  const primaryItems = PRIMARY_NAV.filter((item) => !item.permission || hasPermission(item.permission))
  const navGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((item) => !item.permission || hasPermission(item.permission)) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full flex-col">
      {/* ── Thanh nav ngang (thay sidebar trái) — logo + nhóm điều hướng + user, theo
          mockup "KHO VIỆT". Nhóm chỉ có 1 mục ("Tổng quan") render thẳng thành link,
          nhóm nhiều mục render thành dropdown để không mất chỗ chứa các mục còn lại. */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-card px-4">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Wordmark chữ — giống bố cục mockup ("KHO VIỆT" serif hoa) nhưng vẫn giữ logo thật
            của DNS Technology thay vì đổi tên thương hiệu giả — không thể thay bằng chữ
            "KHO VIỆT" vì đó không phải tên công ty thật. */}
        <img src="/logodns3.png" alt="DNS Technology" className="h-8 w-auto object-contain" />

        {/* Thanh nav dạng gạch chân (khớp export/purchase-new.html::.kv-nav-links) — mục active
            chữ đậm + gạch chân accent 2px dưới đáy (box-shadow inset, không đẩy layout), mục
            thường chữ xám nhạt hơn, hover chỉ đổi màu chữ sang đen, không nền/không nâng nữa
            (đổi từ kiểu pill+lift trước đây theo đúng mockup mới nhất). */}
        <nav className="ml-4 hidden items-center gap-4 md:flex">
          {primaryItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                'px-0.5 pb-2.5 text-sm transition-colors',
                isActive(item.to)
                  ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_0_var(--accent)]'
                  : 'font-medium text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}

          {/* 3 nhóm CÓ TÊN thay cho 1 "Khác" gộp hết — mỗi nhóm vẫn nhỏ (3-7 mục), dễ tìm
              hơn hẳn 1 danh sách 16 dòng không phân loại. */}
          {navGroups.map((group) => (
            <DropdownMenu key={group.label}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'group flex items-center gap-1 px-0.5 pb-2.5 text-sm transition-colors',
                    group.items.some((i) => isActive(i.to))
                      ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_0_var(--accent)]'
                      : 'font-medium text-muted-foreground hover:text-foreground',
                  )}
                >
                  {group.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              {/* Style phẳng theo kv-* (bo góc nhỏ, viền mảnh thay vì shadow-lg, hover dùng
                  đúng cặp accent-bg/accent-text như mục đang active) — chỉ override tại đây
                  (không sửa component dùng chung ui/dropdown-menu.tsx vì file đó dùng cho mọi
                  dropdown khác trong app, VD menu "···" ở PageActions, không chỉ nav). */}
              <DropdownMenuContent align="start" className="w-52 rounded-md border-border shadow-sm p-1">
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.to}
                    className={cn(
                      'cursor-pointer rounded-sm text-sm transition-colors focus:bg-[var(--accent-bg)] focus:text-[var(--accent-text)]',
                      isActive(item.to) && 'bg-[var(--accent-bg)] text-[var(--accent-text)]',
                    )}
                    onClick={() => navigate(item.to)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <CalculatorChat />
          <AssistantChat />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden font-medium text-foreground md:inline">{user?.full_name}</span>
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

      {/* ── Drawer nav cho mobile (< md) — thanh ngang không đủ chỗ nhét 5 nhóm, gộp
          lại thành 1 sheet trượt từ trái, giữ nguyên cấu trúc nhóm như bản desktop. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-14 items-center border-b border-border px-4">
            <img src="/logodns3.png" alt="DNS Technology" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-3">
            <div>
              {primaryItems.map((item) => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setMobileNavOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive(item.to) ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'text-foreground hover:bg-accent',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => { navigate(item.to); setMobileNavOpen(false) }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      isActive(item.to) ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'text-foreground hover:bg-accent',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeaderProvider>
          {(pageHeader) => (
            <PageNoPaddingProvider>
              {(noPadding) => (
                <>
                  {pageHeader && (
                    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-6 py-2">
                      {pageHeader}
                    </div>
                  )}
                  <div className={cn('flex flex-1 flex-col overflow-y-auto', noPadding ? 'p-0' : 'p-6')}>
                    <Outlet />
                  </div>
                </>
              )}
            </PageNoPaddingProvider>
          )}
        </PageHeaderProvider>
      </div>
    </div>
  )
}
