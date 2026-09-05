import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// useActions — dữ liệu cho trang "Hành động" (trang chủ): health signals, alert list,
// SKU cần bổ sung hàng. Tách khỏi useReports.ts vì đây là "việc cần làm" chứ không phải
// "số liệu tổng hợp" — 2 mối quan tâm khác nhau dù cùng đọc endpoint /reports/*.
export function useActions() {
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
    refetchInterval: 60_000,
  })

  // Chỉ cần fulfillment_rate cho 1 signal chip — breakdown pipeline đầy đủ nằm ở ReportsPage.
  const { data: pipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ['reports', 'pipeline'],
    queryFn: async () => (await api.get('/reports/pipeline')).data,
    refetchInterval: 60_000,
  })

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ['reports', 'low-stock-items'],
    queryFn: async () => (await api.get('/reports/low-stock-items', { params: { limit: 20 } })).data,
  })

  // Phiếu pending_approval/approved quá 2 ngày — bổ sung cho signal "Phê duyệt" vốn chỉ
  // đếm tổng số đang chờ, không nêu được phiếu nào đang bị "ngâm" lâu.
  const { data: overdueDocuments, isLoading: overdueDocumentsLoading } = useQuery({
    queryKey: ['reports', 'overdue-documents'],
    queryFn: async () => (await api.get('/reports/overdue-documents', { params: { limit: 20 } })).data,
    refetchInterval: 60_000,
  })

  return {
    dashboard, dashboardLoading,
    pipeline, pipelineLoading,
    lowStockItems, lowStockLoading,
    overdueDocuments, overdueDocumentsLoading,
  }
}
