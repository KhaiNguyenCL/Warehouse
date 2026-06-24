import { Navigate, Outlet, createBrowserRouter, RouteObject } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/LoginPage'
import CompaniesPage from './pages/CompaniesPage'
import CategoriesPage from './pages/CategoriesPage'
import BrandsPage from './pages/BrandsPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import WarehousesPage from './pages/WarehousesPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptDetailPage from './pages/ReceiptDetailPage'
import InventoryPage from './pages/InventoryPage'
import CustomFieldsSettingsPage from './pages/CustomFieldsSettingsPage'
import QuotationsPage from './pages/QuotationsPage'
import QuotationDetailPage from './pages/QuotationDetailPage'
import DeliveryOrdersPage from './pages/DeliveryOrdersPage'
import DeliveryOrderDetailPage from './pages/DeliveryOrderDetailPage'
import TransferOrdersPage from './pages/TransferOrdersPage'
import TransferOrderDetailPage from './pages/TransferOrderDetailPage'
import StocktakesPage from './pages/StocktakesPage'
import StocktakeDetailPage from './pages/StocktakeDetailPage'
import SettingsTypesPage from './pages/SettingsTypesPage'
import RolesPage from './pages/RolesPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import TemplatesPage from './pages/TemplatesPage'
import SettingsBitrixPage from './pages/SettingsBitrixPage'

function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/companies" replace /> },
          { path: '/companies', element: <CompaniesPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/brands', element: <BrandsPage /> },
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/warehouses', element: <WarehousesPage /> },
          { path: '/purchase-orders', element: <PurchaseOrdersPage /> },
          { path: '/purchase-orders/:id', element: <PurchaseOrderDetailPage /> },
          { path: '/receipts', element: <ReceiptsPage /> },
          { path: '/receipts/:id', element: <ReceiptDetailPage /> },
          { path: '/inventory', element: <InventoryPage /> },
          { path: '/quotations', element: <QuotationsPage /> },
          { path: '/quotations/:id', element: <QuotationDetailPage /> },
          { path: '/deliveries', element: <DeliveryOrdersPage /> },
          { path: '/deliveries/:id', element: <DeliveryOrderDetailPage /> },
          { path: '/transfers', element: <TransferOrdersPage /> },
          { path: '/transfers/:id', element: <TransferOrderDetailPage /> },
          { path: '/stocktakes', element: <StocktakesPage /> },
          { path: '/stocktakes/:id', element: <StocktakeDetailPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/settings/templates', element: <TemplatesPage /> },
          { path: '/settings/bitrix', element: <SettingsBitrixPage /> },
          { path: '/settings/custom-fields', element: <CustomFieldsSettingsPage /> },
          { path: '/settings/types', element: <SettingsTypesPage /> },
          { path: '/settings/roles', element: <RolesPage /> },
          { path: '/settings/users', element: <UsersPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
