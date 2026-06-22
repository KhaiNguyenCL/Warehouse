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
          { path: '/settings/custom-fields', element: <CustomFieldsSettingsPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
