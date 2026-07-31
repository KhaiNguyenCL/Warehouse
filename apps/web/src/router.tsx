import { Navigate, Outlet, createBrowserRouter, RouteObject } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/LoginPage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import CategoriesPage from './pages/CategoriesPage'
import BrandsPage from './pages/BrandsPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import VariantDetailPage from './pages/VariantDetailPage'
import VariantCreatePage from './pages/VariantCreatePage'
import WarehousesPage from './pages/WarehousesPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import PurchaseOrderCreatePage from './pages/PurchaseOrderCreatePage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptFormPage from './pages/ReceiptFormPage'
import InventoryPage from './pages/InventoryPage'
import InventorySerialsPage from './pages/InventorySerialsPage'
import CustomFieldsSettingsPage from './pages/CustomFieldsSettingsPage'
import QuotationsPage from './pages/QuotationsPage'
import QuotationDetailPage from './pages/QuotationDetailPage'
import DeliveryOrdersPage from './pages/DeliveryOrdersPage'
import DeliveryOrderCreatePage from './pages/DeliveryOrderCreatePage'
import DeliveryOrderDetailPage from './pages/DeliveryOrderDetailPage'
import TransferOrdersPage from './pages/TransferOrdersPage'
import TransferOrderCreatePage from './pages/TransferOrderCreatePage'
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
          { path: '/', element: <Navigate to="/reports" replace /> },
          { path: '/companies', element: <CompaniesPage /> },
          { path: '/companies/:id', element: <CompanyDetailPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/brands', element: <BrandsPage /> },
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/products/:productId/variants/new', element: <VariantCreatePage /> },
          { path: '/products/:productId/variants/:variantId', element: <VariantDetailPage /> },
          { path: '/warehouses', element: <WarehousesPage /> },
          { path: '/purchase-orders', element: <PurchaseOrdersPage /> },
          { path: '/purchase-orders/new', element: <PurchaseOrderCreatePage /> },
          { path: '/purchase-orders/:id', element: <PurchaseOrderCreatePage /> },
          { path: '/receipts', element: <ReceiptsPage /> },
          { path: '/receipts/new', element: <ReceiptFormPage /> },
          { path: '/receipts/:id', element: <ReceiptFormPage /> },
          { path: '/inventory', element: <InventoryPage /> },
          { path: '/inventory/serials/:variantId', element: <InventorySerialsPage /> },
          { path: '/quotations', element: <QuotationsPage /> },
          { path: '/quotations/:id', element: <QuotationDetailPage /> },
          { path: '/deliveries', element: <DeliveryOrdersPage /> },
          { path: '/deliveries/new', element: <DeliveryOrderCreatePage /> },
          { path: '/deliveries/:id', element: <DeliveryOrderDetailPage /> },
          { path: '/transfers', element: <TransferOrdersPage /> },
          { path: '/transfers/new', element: <TransferOrderCreatePage /> },
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
